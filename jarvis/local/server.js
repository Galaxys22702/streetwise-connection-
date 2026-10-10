import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const assets = new Map([
  ['/', 'index.html'], ['/index.js', 'index.js'],
  ['/investigator.html', 'investigator.html'], ['/investigator.js', 'investigator.js'],
  ['/jarvis-money.html', 'jarvis-money.html'], ['/jarvis-money.js', 'jarvis-money.js']
]);

export function createLocalServer({ apiKey = process.env.OPENAI_API_KEY || '', model = process.env.OPENAI_MODEL || 'gpt-4.1-mini', fetchImpl = fetch } = {}) {
  let inFlight = false;
  return http.createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    const expectedHost = `127.0.0.1:${req.socket.localPort}`;
    if (req.headers.host !== expectedHost) return send(403, { error: 'Open JARVIS using its 127.0.0.1 address.' });
    if (req.headers.origin && req.headers.origin !== `http://${expectedHost}`) return send(403, { error: 'Cross-origin requests are blocked.' });
    try {
      if (req.method === 'GET' && req.url === '/health') return send(200, { ok: true, aiConfigured: Boolean(apiKey) });
      if (req.method === 'GET' && assets.has(req.url)) {
        const file = assets.get(req.url);
        const body = await readFile(new URL(file, import.meta.url));
        res.writeHead(200, { 'Content-Type': file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8' });
        return res.end(body);
      }
      if (req.url !== '/api/chat') return send(404, { error: 'Not found' });
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(405, { error: 'Method not allowed' }); }
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return send(415, { error: 'JSON required' });
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 20000) return send(413, { error: 'Request too large' });
        chunks.push(chunk);
      }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400, { error: 'Invalid JSON' }); }
      const message = typeof input?.message === 'string' ? input.message.trim() : '';
      if (!message || message.length > 4000) return send(400, { error: 'Message must be 1–4000 characters' });
      if (!apiKey) return send(503, { error: 'AI not configured. Restart with the Windows launcher.' });
      if (inFlight) return send(429, { error: 'Wait for the current response.' });
      inFlight = true;
      try {
        const upstream = await fetchImpl('https://api.openai.com/v1/responses', {
          method: 'POST', headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model, store: false, instructions: 'You are JARVIS, a practical creative and technical assistant for Rob the Producer. Address the user as sir. Provide useful answers and drafts. You have no execution tools: never claim to send, publish, purchase, deploy, or edit files. Do not request secrets.', input: message, max_output_tokens: 1000 }),
          signal: AbortSignal.timeout(30000)
        });
        if (!upstream.ok) return send(502, { error: `AI provider request failed (${upstream.status}). Check API billing and configuration.` });
        const data = await upstream.json();
        const answer = (data.output || []).flatMap(item => item.content || []).filter(part => part.type === 'output_text').map(part => part.text).join('\n');
        return send(200, { answer: answer || 'No text returned.' });
      } finally { inFlight = false; }
    } catch { if (!res.headersSent) send(502, { error: 'Request failed. Try again.' }); else res.end(); }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  const server = createLocalServer();
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Close the other JARVIS window.` : 'Could not start JARVIS.'); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`JARVIS ready: http://127.0.0.1:${port}`));
}
