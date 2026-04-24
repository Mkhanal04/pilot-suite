import { getDb } from '../_lib/db.js';
import { requireBasicAuth } from '../_lib/auth.js';

const ALLOWED_KEYS = new Set([
  'chatbot_enabled',
  'active_model',
  'refuse_template',
  'system_prompt_additions',
  'max_messages_per_hour',
  'similarity_threshold',
  'top_k'
]);

export default async function handler(req, res) {
  if (!requireBasicAuth(req, res)) return;

  const db = getDb();

  if (req.method === 'GET') {
    const { data, error } = await db.from('config').select('key, value, description, updated_at');
    if (error) return res.status(500).json({ error: error.message });
    const map = {};
    for (const row of data) map[row.key] = row;
    return res.json({ config: map });
  }

  if (req.method === 'PATCH') {
    const body = req.body || {};
    const { key, value } = body;
    if (!key || !ALLOWED_KEYS.has(key)) {
      return res.status(400).json({ error: 'Invalid or disallowed key' });
    }
    if (value === undefined) {
      return res.status(400).json({ error: 'Missing value' });
    }
    const { error } = await db
      .from('config')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, key, value });
  }

  res.setHeader('Allow', 'GET, PATCH');
  return res.status(405).json({ error: 'Method not allowed' });
}
