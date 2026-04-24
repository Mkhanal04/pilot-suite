import { getDb } from './_lib/db.js';

const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'GEMINI_API_KEY',
  'ANTHROPIC_API_KEY',
  'IP_HASH_SALT'
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const checks = { env: {}, supabase: null };
  const missing = [];
  REQUIRED_ENV.forEach(k => {
    const present = !!process.env[k];
    checks.env[k] = present;
    if (!present) missing.push(k);
  });

  let dbOk = false;
  let dbError = null;
  try {
    const db = getDb();
    const { error } = await db.from('config').select('key').limit(1);
    if (error) {
      dbError = error.message || String(error);
    } else {
      dbOk = true;
    }
  } catch (e) {
    dbError = e.message || String(e);
  }
  checks.supabase = dbOk ? { ok: true } : { ok: false, error: dbError };

  const ok = missing.length === 0 && dbOk;

  res.setHeader('Cache-Control', 'no-store');
  return res.status(ok ? 200 : 503).json({
    ok,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    env: checks.env,
    supabase: checks.supabase,
    missing_env: missing
  });
}
