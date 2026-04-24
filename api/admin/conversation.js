import { getDb } from '../_lib/db.js';
import { requireBasicAuth } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!requireBasicAuth(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = req.query.session_id;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  const db = getDb();

  const { data: conv, error: convErr } = await db
    .from('conversations')
    .select('*')
    .eq('session_id', sessionId)
    .single();
  if (convErr) return res.status(404).json({ error: 'Conversation not found' });

  const { data: messages, error: msgErr } = await db
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (msgErr) return res.status(500).json({ error: msgErr.message });

  const retrievedIds = new Set();
  for (const m of messages) {
    if (m.retrieved_source_ids) for (const id of m.retrieved_source_ids) retrievedIds.add(id);
  }
  let docsMap = {};
  if (retrievedIds.size > 0) {
    const { data: docs } = await db
      .from('documents')
      .select('id, source_path, section_heading')
      .in('id', Array.from(retrievedIds));
    if (docs) for (const d of docs) docsMap[d.id] = d;
  }

  return res.json({ conversation: conv, messages, documents: docsMap });
}
