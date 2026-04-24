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
  const offset = parseInt(req.query.offset || '0', 10);

  const { data, error } = await db
    .from('conversations')
    .select('session_id, started_at, last_active_at, optional_email, user_agent')
    .order('last_active_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });

  const sessionIds = data.map(c => c.session_id);
  let counts = {};
  if (sessionIds.length > 0) {
    const { data: msgs } = await db
      .from('messages')
      .select('session_id, role, refuse_flag')
      .in('session_id', sessionIds);
    if (msgs) {
      for (const m of msgs) {
        if (!counts[m.session_id]) counts[m.session_id] = { total: 0, refuses: 0 };
        counts[m.session_id].total++;
        if (m.refuse_flag) counts[m.session_id].refuses++;
      }
    }
  }

  const enriched = data.map(c => ({
    ...c,
    message_count: counts[c.session_id]?.total || 0,
    refuse_count: counts[c.session_id]?.refuses || 0
  }));

  return res.json({ conversations: enriched, limit, offset });
}
