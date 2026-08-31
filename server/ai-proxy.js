#!/usr/bin/env node
// server/ai-proxy.js
//
// A tiny local server for Hero OS. It does two things:
//   1. Serves the Hero OS static files (the same job python3 -m http.server
//      was doing) so the whole app is reachable from one URL.
//   2. Exposes POST /api/chat, which holds your Anthropic API key on the
//      SERVER side and forwards JARVIS's messages to Claude. The key
//      never touches the browser — see js/services/ai.js for why that
//      matters.
//
// No npm install needed. This uses only Node's built-in modules, to
// keep Hero OS's "minimal dependencies" promise even for this piece.
//
// HOW TO RUN IT
//   export ANTHROPIC_API_KEY=sk-ant-...
//   node server/ai-proxy.js
//   -> open http://localhost:8787
//   -> in Hero OS Settings, set "AI Provider Endpoint" to
//      http://localhost:8787/api/chat and turn the toggle on.
//
// Optional environment variables:
//   PORT             - default 8787
//   HERO_OS_MODEL     - default "claude-opus-5" (see anthropic.com/pricing
//                       if you'd rather use a cheaper model, e.g.
//                       "claude-haiku-4-5")

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8787;
const MODEL = process.env.HERO_OS_MODEL || 'claude-opus-5';
const API_KEY = process.env.ANTHROPIC_API_KEY;
const ROOT = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const JARVIS_SYSTEM_PROMPT =
  'You are JARVIS, the AI assistant inside a student\'s personal "Hero OS" ' +
  'command center app. Be concise, direct, and genuinely useful — a few ' +
  'sentences unless asked for more. You can help with missions (tasks), ' +
  'studying, planning, or general questions.';

// ---- static file serving ----

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]);
  const filePath = path.join(ROOT, urlPath);

  // Guard against escaping the project folder (e.g. "/../../etc/passwd").
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---- Claude API call ----

function callClaude(message, history) {
  return new Promise((resolve, reject) => {
    if (!API_KEY) {
      return reject(new Error('ANTHROPIC_API_KEY is not set on the server.'));
    }

    const messages = (history || [])
      .map((m) => ({ role: m.role === 'jarvis' ? 'assistant' : 'user', content: m.text }))
      .concat([{ role: 'user', content: message }]);

    const payload = JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: JARVIS_SYSTEM_PROMPT,
      thinking: { type: 'adaptive' },
      // Automatically falls back to another model if a safety classifier
      // declines the request, instead of just failing the chat message.
      fallbacks: 'default',
      messages,
    });

    const request = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'server-side-fallback-2026-07-01',
          'content-length': Buffer.byteLength(payload),
        },
      },
      (apiRes) => {
        let body = '';
        apiRes.on('data', (chunk) => (body += chunk));
        apiRes.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (data.type === 'error') {
              return reject(new Error(data.error && data.error.message ? data.error.message : 'Claude API error'));
            }
            // Always check stop_reason before reading content — a safety
            // classifier can decline a request (HTTP 200, no error field).
            if (data.stop_reason === 'refusal') {
              return resolve("JARVIS can't help with that request.");
            }
            const textBlock = (data.content || []).find((b) => b.type === 'text');
            resolve(textBlock ? textBlock.text : '(No response text)');
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

// ---- HTTP server ----

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        if (!parsed.message || typeof parsed.message !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing "message" string.' }));
        }
        const reply = await callClaude(parsed.message, parsed.history);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Hero OS running at http://localhost:${PORT}`);
  console.log(
    API_KEY
      ? `AI proxy ready (model: ${MODEL})`
      : 'AI proxy: ANTHROPIC_API_KEY is not set — /api/chat will return an error until you set it.'
  );
});
