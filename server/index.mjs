import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { dispatchApiRequest } from './dispatcher.mjs';

const PORT = Number(process.env.PORT) || 3001;
const DIST_DIR = path.resolve(process.cwd(), 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.pbf': 'application/x-protobuf',
  '.woff2': 'font/woff2',
};

const server = http.createServer(async (req, res) => {
  // 1. Check API routes
  if (req.url && req.url.startsWith('/api/')) {
    try {
      const handled = await dispatchApiRequest(req, res);
      if (handled) return;
    } catch (err) {
      console.error('[API Error]', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
      return;
    }
  }

  // 2. Serve static files from dist/ if built
  if (fs.existsSync(DIST_DIR)) {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    let filePath = path.join(DIST_DIR, urlObj.pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(DIST_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // SPA fallback to index.html
    const indexHtml = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexHtml)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(indexHtml).pipe(res);
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`[Godseye Server] Running on http://localhost:${PORT}`);
  console.log(`[Godseye Server] API endpoints mounted at /api/*`);
});
