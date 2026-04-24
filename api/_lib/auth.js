export function requireBasicAuth(req, res) {
  const user = process.env.ADMIN_BASIC_AUTH_USER;
  const pass = process.env.ADMIN_BASIC_AUTH_PASS;

  if (!user || !pass) {
    res.status(500).json({ error: 'Admin auth not configured' });
    return false;
  }

  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="admin"');
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const sep = decoded.indexOf(':');
  const provided = { user: decoded.slice(0, sep), pass: decoded.slice(sep + 1) };

  if (provided.user !== user || provided.pass !== pass) {
    res.setHeader('WWW-Authenticate', 'Basic realm="admin"');
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
}

export function hashIp(ip) {
  if (!ip) return null;
  const crypto = globalThis.crypto || require('crypto').webcrypto;
  const data = new TextEncoder().encode(ip + (process.env.IP_HASH_SALT || 'pilot-suite'));
  return crypto.subtle.digest('SHA-256', data).then(buf => {
    const arr = Array.from(new Uint8Array(buf));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  });
}
