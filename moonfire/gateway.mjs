import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const host = process.env.MOONFIRE_HOST || '127.0.0.1';
const port = Number(process.env.MOONFIRE_PORT || 8787);
const token = process.env.MOONFIRE_TOKEN;
if (!token || token.length < 32) {
  console.error('Set MOONFIRE_TOKEN to a strong random secret (at least 32 characters).');
  process.exit(1);
}
function authorized(req) {
  const provided = req.headers.authorization?.replace(/^Bearer /i, '') || '';
  const a = Buffer.from(provided);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
const server = createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  if (!authorized(req)) {
    res.writeHead(401);
    return res.end(JSON.stringify({ error: 'unauthorized' }));
  }
  if (req.method !== 'GET' || req.url !== '/status') {
    res.writeHead(404);
    return res.end(JSON.stringify({ error: 'not_found' }));
  }
  res.writeHead(200);
  res.end(JSON.stringify({ service: 'moonfire', status: 'online', openclaw: 'not_connected', device: 'gateway_only', time: new Date().toISOString() }));
});
server.listen(port, host, () => console.log('MOONFIRE gateway listening on ' + host + ':' + port));
