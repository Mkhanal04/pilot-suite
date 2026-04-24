import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// HARD ALLOWLIST. Ingest script refuses anything not in this list.
// Do NOT add handoff files, memory files, .claude/, lab/, or private drafts.
const ALLOWLIST = [
  { path: 'about/index.html',                         heading: 'About' },
  { path: 'content/work.json',                        heading: 'Work timeline' },
  { path: 'writing/ai-cost-crisis/index.html',        heading: 'AI Cost Crisis: 3-tier routing' },
  { path: 'talentpilot/index.html',                   heading: 'TalentPilot prototype' },
  { path: 'tradepilot/index.html',                    heading: 'TradePilot prototype' },
  { path: 'index.html',                               heading: 'Home / positioning' }
];

// Optional: resume if present
const OPTIONAL = [
  { path: 'content/resume.txt',                       heading: 'Resume' },
  { path: 'content/resume.md',                        heading: 'Resume' }
];

const HARD_DENY_PATTERNS = [/^\.claude\//, /^memory\//, /handoff/, /\.docx$/, /\.env/];

const EMBEDDING_MODEL = 'gemini-embedding-001';
const TARGET_TOKENS = 600;
const OVERLAP_TOKENS = 100;
const CHARS_PER_TOKEN = 4;

function assertSafe(path) {
  for (const re of HARD_DENY_PATTERNS) {
    if (re.test(path)) throw new Error(`Refused to ingest denied path: ${path}`);
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, ', ')
    .replace(/&ndash;/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function jsonToProse(obj, indent = 0) {
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => jsonToProse(item, indent)).join('\n');
  }
  if (obj && typeof obj === 'object') {
    return Object.entries(obj)
      .map(([k, v]) => {
        const val = jsonToProse(v, indent + 1);
        return `${k}: ${val}`;
      })
      .join('\n');
  }
  return '';
}

function loadContent(path) {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) return null;
  const raw = readFileSync(full, 'utf8');
  if (path.endsWith('.json')) {
    try {
      return jsonToProse(JSON.parse(raw));
    } catch {
      return raw;
    }
  }
  if (path.endsWith('.html')) return stripHtml(raw);
  return raw;
}

function chunkText(text, targetTokens = TARGET_TOKENS, overlapTokens = OVERLAP_TOKENS) {
  const targetChars = targetTokens * CHARS_PER_TOKEN;
  const overlapChars = overlapTokens * CHARS_PER_TOKEN;
  if (text.length <= targetChars) return [text];

  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + targetChars, text.length);
    if (end < text.length) {
      const nextBreak = text.lastIndexOf('. ', end);
      if (nextBreak > start + targetChars * 0.5) end = nextBreak + 1;
    }
    chunks.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start = end - overlapChars;
  }
  return chunks.filter(c => c.length > 0);
}

async function embed(text, geminiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${geminiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: 1536
    })
  });
  if (!res.ok) throw new Error(`Embed failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.embedding.values;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!supabaseUrl || !supabaseKey || !geminiKey) {
    console.error('Missing env vars. Required: SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY');
    process.exit(1);
  }

  const db = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log('Clearing existing documents...');
  const { error: delErr } = await db.from('documents').delete().neq('id', 0);
  if (delErr) {
    console.error('Delete failed:', delErr);
    process.exit(1);
  }

  const sources = [...ALLOWLIST];
  for (const opt of OPTIONAL) {
    if (existsSync(resolve(ROOT, opt.path))) sources.push(opt);
  }

  let totalChunks = 0;
  let totalTokens = 0;

  for (const { path, heading } of sources) {
    assertSafe(path);
    const text = loadContent(path);
    if (!text) {
      console.warn(`SKIP: ${path} (not found)`);
      continue;
    }
    const chunks = chunkText(text);
    console.log(`INGEST ${path}: ${chunks.length} chunks, ${text.length} chars`);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const tokens = Math.ceil(chunk.length / CHARS_PER_TOKEN);
      const embedding = await embed(chunk, geminiKey);
      const { error } = await db.from('documents').insert({
        source_path: path,
        section_heading: heading,
        content: chunk,
        embedding,
        chunk_index: i,
        token_count: tokens
      });
      if (error) {
        console.error(`Insert failed for ${path} chunk ${i}:`, error);
        process.exit(1);
      }
      totalChunks++;
      totalTokens += tokens;
    }
  }

  console.log(`\nDone. ${totalChunks} chunks, ~${totalTokens} tokens embedded.`);
}

main().catch(err => {
  console.error('Ingest failed:', err);
  process.exit(1);
});
