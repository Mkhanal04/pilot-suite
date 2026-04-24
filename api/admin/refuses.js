import { getDb } from '../_lib/db.js';
import { requireBasicAuth } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!requireBasicAuth(req, res)) return;
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const db = getDb();
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);

  const { data, error } = await db
    .from('messages')
    .select('id, session_id, content, tier, created_at, retrieved_source_ids')
    .eq('refuse_flag', true)
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });

  const sessionIds = [...new Set(data.map(m => m.session_id))];
  let userQuestions = {};
  if (sessionIds.length > 0) {
    const { data: userMsgs } = await db
      .from('messages')
      .select('session_id, content, created_at')
      .in('session_id', sessionIds)
      .eq('role', 'user')
      .order('created_at', { ascending: true });
    if (userMsgs) {
      for (const refuse of data) {
        const priorUser = userMsgs
          .filter(u => u.session_id === refuse.session_id && new Date(u.created_at) <= new Date(refuse.created_at))
          .pop();
        if (priorUser) userQuestions[refuse.id] = priorUser.content;
      }
    }
  }

  const enriched = data.map(m => ({
    ...m,
    user_question: userQuestions[m.id] || null
  }));

  return res.json({ refuses: enriched });
}
