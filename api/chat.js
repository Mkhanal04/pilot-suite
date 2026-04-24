import { getDb, getConfigValue } from './_lib/db.js';
import { hashIp } from './_lib/auth.js';

const EMBEDDING_MODEL = 'gemini-embedding-001';
const DEFAULT_MODEL = 'claude-sonnet-4-5';
const MODEL_MAP = {
  'claude-sonnet-4-6': 'claude-sonnet-4-5',
  'claude-opus-4-7': 'claude-opus-4-5',
  'claude-haiku-4-5': 'claude-haiku-4-5-20251001'
};

const SYSTEM_PROMPT = `You are Milan Khanal's digital twin on his portfolio site. You answer visitors' questions about Milan in first person ("I", "my"), as if you are Milan.

VOICE RULES (strict, zero tolerance):
- Zero em-dashes. Use commas, colons, parentheses, or new sentences.
- Terse and direct. No "I have successfully..." or similar fluff.
- Specific numbers, not hedges. "$900M" not "nearly a billion."
- Plain language. Avoid MLOps jargon like "Semantic Routing," "Token Tsunamis," "Inference Compute Layers."
- Use "prototype" or "proof of concept" for TalentPilot and TradePilot. Never "live production."
- Use relative dates ("current engagement," "recent project"). Avoid hard year/month claims.
- Signature positioning: "I don't pitch AI products. I ship them."

CITATION RULES (strict):
- Every factual claim about me must cite a source from the RETRIEVED KNOWLEDGE block.
- Cite inline like [1], [2] matching the source index provided.
- If you cannot cite a claim from retrieved chunks, DO NOT make it. Say "I don't have that in my knowledge base yet."
- Do NOT invent, infer beyond the chunks, or speculate.

REFUSE PATTERNS (auto-refuse with provided template):
- Pricing, rates, availability, consulting fees
- Exact compensation, salary, equity
- Role title specifics at any current/past employer
- Counterfactuals ("why didn't you do X?")
- Personal contact preferences (redirect: "leave your email, I'll follow up")
- Anything not covered by retrieved chunks

When refusing, use the provided REFUSE_TEMPLATE exactly. Do not generate alternate refusal text.

OUTPUT:
- 1 to 4 short paragraphs. No headers, no bullets unless the question demands a list.
- Inline citations like [1] after each factual claim.
- End with a subtle invitation if relevant ("Want to see the TalentPilot prototype?").`;

function resolveModel(configValue) {
  return MODEL_MAP[configValue] || configValue || DEFAULT_MODEL;
}

async function embed(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${process.env.GEMINI_API_KEY}`;
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

async function generate(model, systemBlock, userBlock) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: [
        { type: 'text', text: systemBlock, cache_control: { type: 'ephemeral' } }
      ],
      messages: [{ role: 'user', content: userBlock }]
    })
  });
  if (!res.ok) throw new Error(`Generate failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function checkRateLimit(db, sessionId, maxPerHour) {
  const { data } = await db.from('rate_limits').select('*').eq('session_id', sessionId).single();
  const now = new Date();
  if (!data) {
    await db.from('rate_limits').insert({ session_id: sessionId, message_count: 1, window_start: now.toISOString() });
    return { ok: true };
  }
  const windowAge = (now - new Date(data.window_start)) / 1000;
  if (windowAge > 3600) {
    await db.from('rate_limits').update({ message_count: 1, window_start: now.toISOString() }).eq('session_id', sessionId);
    return { ok: true };
  }
  if (data.message_count >= maxPerHour) {
    return { ok: false, retryAfter: Math.ceil(3600 - windowAge) };
  }
  await db.from('rate_limits').update({ message_count: data.message_count + 1 }).eq('session_id', sessionId);
  return { ok: true };
}

function extractCitedIds(text, retrievedIds) {
  const found = new Set();
  const regex = /\[(\d+)\]/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const idx = parseInt(m[1], 10) - 1;
    if (idx >= 0 && idx < retrievedIds.length) found.add(retrievedIds[idx]);
  }
  return Array.from(found);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const start = Date.now();
  const body = req.body || {};
  const { session_id, message, optional_email } = body;

  if (!session_id || typeof session_id !== 'string' || session_id.length > 64) {
    return res.status(400).json({ error: 'Missing or invalid session_id' });
  }
  if (!message || typeof message !== 'string' || message.length > 2000) {
    return res.status(400).json({ error: 'Missing or invalid message (max 2000 chars)' });
  }

  try {
    const db = getDb();

    const enabled = await getConfigValue('chatbot_enabled', true);
    if (!enabled) {
      return res.status(503).json({ error: 'Chatbot is currently disabled', reply: 'The chatbot is temporarily offline.' });
    }

    const ipRaw = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '';
    const ipHashed = ipRaw ? await hashIp(ipRaw) : null;

    await db.from('conversations').upsert({
      session_id,
      last_active_at: new Date().toISOString(),
      user_agent: (req.headers['user-agent'] || '').slice(0, 256),
      ip_hash: ipHashed,
      ...(optional_email ? { optional_email: String(optional_email).slice(0, 256) } : {})
    }, { onConflict: 'session_id', ignoreDuplicates: false });

    const maxPerHour = await getConfigValue('max_messages_per_hour', 20);
    const rl = await checkRateLimit(db, session_id, maxPerHour);
    if (!rl.ok) {
      return res.status(429).json({ error: 'Rate limit exceeded', retryAfter: rl.retryAfter });
    }

    await db.from('messages').insert({ session_id, role: 'user', content: message });

    const threshold = await getConfigValue('similarity_threshold', 0.75);
    const topK = await getConfigValue('top_k', 5);
    const refuseTemplate = await getConfigValue('refuse_template',
      "I don't have that in Milan's knowledge base yet. Want me to pass your question along?");
    const promptAdditions = await getConfigValue('system_prompt_additions', '');
    const configuredModel = await getConfigValue('active_model', 'claude-sonnet-4-6');
    const model = resolveModel(configuredModel);

    let queryEmbedding;
    try {
      queryEmbedding = await embed(message);
    } catch (e) {
      await db.from('messages').insert({
        session_id, role: 'assistant',
        content: 'Embedding service error', refuse_flag: true,
        model, latency_ms: Date.now() - start
      });
      return res.status(500).json({ error: 'Embedding failed', reply: refuseTemplate });
    }

    const { data: matches, error: matchErr } = await db.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: topK
    });

    if (matchErr) throw matchErr;

    if (!matches || matches.length === 0) {
      await db.from('messages').insert({
        session_id, role: 'assistant', content: refuseTemplate,
        refuse_flag: true, retrieved_source_ids: [], cited_source_ids: [],
        model: 'none', tier: 'refuse-no-match', latency_ms: Date.now() - start
      });
      return res.json({ reply: refuseTemplate, sources: [], refused: true });
    }

    const retrievedIds = matches.map(m => m.id);
    const chunksBlock = matches.map((m, i) => {
      const heading = m.section_heading ? ` (${m.section_heading})` : '';
      return `[${i + 1}] Source: ${m.source_path}${heading}\nContent: ${m.content}`;
    }).join('\n\n');

    const refuseBlock = `\n\nREFUSE_TEMPLATE (use exactly when refusing): ${refuseTemplate}`;
    const additions = promptAdditions ? `\n\nADDITIONAL CONTEXT:\n${promptAdditions}` : '';
    const systemBlock = SYSTEM_PROMPT + refuseBlock + additions;

    const userBlock = `<retrieved_knowledge>\n${chunksBlock}\n</retrieved_knowledge>\n\n<question>\n${message}\n</question>`;

    let genResult;
    try {
      genResult = await generate(model, systemBlock, userBlock);
    } catch (e) {
      await db.from('messages').insert({
        session_id, role: 'assistant',
        content: 'Generation service error', refuse_flag: true,
        retrieved_source_ids: retrievedIds, cited_source_ids: [],
        model, latency_ms: Date.now() - start
      });
      return res.status(500).json({ error: 'Generation failed', reply: refuseTemplate });
    }

    const reply = (genResult.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();
    const citedIds = extractCitedIds(reply, retrievedIds);
    const refuseFlag = reply.includes(refuseTemplate) || citedIds.length === 0;

    const usage = genResult.usage || {};
    await db.from('messages').insert({
      session_id, role: 'assistant', content: reply,
      retrieved_source_ids: retrievedIds, cited_source_ids: citedIds,
      refuse_flag: refuseFlag,
      tokens_in: usage.input_tokens || null,
      tokens_out: usage.output_tokens || null,
      model, tier: 'mid', latency_ms: Date.now() - start
    });

    const sourcesOut = matches
      .filter(m => citedIds.includes(m.id))
      .map(m => ({ id: m.id, path: m.source_path, heading: m.section_heading }));

    return res.json({ reply, sources: sourcesOut, refused: refuseFlag });
  } catch (err) {
    console.error('chat handler error:', err);
    return res.status(500).json({ error: 'Internal error', reply: "Something broke. Try again in a moment." });
  }
}
