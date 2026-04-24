import { getDb } from './_lib/db.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGES = 40;
const WINDOW_DAYS = 30;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = (req.query?.session_id || '').toString().trim();
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid session_id' });
  }

  try {
    const db = getDb();
    const windowStart = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await db.from('messages')
      .select('role, content, cited_source_ids, refuse_flag, created_at')
      .eq('session_id', sessionId)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: true })
      .limit(MAX_MESSAGES);

    if (error) throw error;
    if (!rows || rows.length === 0) return res.json({ messages: [] });

    const allCited = new Set();
    rows.forEach(r => (r.cited_source_ids || []).forEach(id => allCited.add(id)));

    const sourceMap = {};
    if (allCited.size > 0) {
      const { data: docs } = await db.from('documents')
        .select('id, source_path, section_heading')
        .in('id', Array.from(allCited));
      if (docs) docs.forEach(d => { sourceMap[d.id] = d; });
    }

    const messages = rows.map(r => {
      const msg = { role: r.role, content: r.content };
      if (r.role === 'assistant') {
        msg.refused = !!r.refuse_flag;
        msg.sources = (r.cited_source_ids || [])
          .map(id => sourceMap[id])
          .filter(Boolean)
          .map(d => ({ id: d.id, path: d.source_path, heading: d.section_heading }));
      }
      return msg;
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.json({ messages });
  } catch (err) {
    console.error('history handler error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
