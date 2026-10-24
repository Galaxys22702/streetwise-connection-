// MOONFIRE mobile gateway proof of concept. No remote shell or device control.
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const host = process.env.MOONFIRE_HOST ?? '127.0.0.1';
const port = Number(process.env.MOONFIRE_PORT ?? '8787');
const token = process.env.MOONFIRE_TOKEN;
if (!token || Buffer.byteLength(token) < 32) {
  console.error('Set MOONFIRE_TOKEN to a random secret of at least 32 bytes.');
  process.exit(1);
}
function authorized(req) {
  const candidate = req.headers.authorization;
  const expected = 'Bearer ' + token;
  if (typeof candidate !== 'string') return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
const server = createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!authorized(req)) {
    res.writeHead(401);
    return res.end(JSON.stringify({ error: 'unauthorized' }));
  }
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200);
    return res.end(JSON.stringify({
      service: 'moonfire-mobile-gateway',
      status: 'online',
      openclawConnected: false,
      hpConnected: false,
      timestamp: new Date().toISOString()
    }));
  }
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not_found' }));
});
server.requestTimeout = 10000;
server.headersTimeout = 5000;
server.listen(port, host, () => console.log('MOONFIRE listening on ' + host + ':' + port));
