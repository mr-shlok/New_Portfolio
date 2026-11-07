import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = parseInt(process.argv[2], 10) || 5173;
const SHOT_DIR = process.env.SHOT_DIR || path.join(ROOT, 'shots');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const relative = decoded.replace(/^\/+/, '');
  const target = path.resolve(ROOT, relative);
  if (!target.startsWith(ROOT)) return null;
  return target;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle POST /__shot for dev screenshots
  if (req.method === 'POST' && req.url.startsWith('/__shot')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const urlObj = new URL(req.url, `http://localhost:${PORT}`);
        let name = urlObj.searchParams.get('name') || 'shot';
        name = name.replace(/[^a-zA-Z0-9_\-.]/g, '') || 'shot';

        const b64Data = body.includes(',') ? body.split(',')[1] : body;
        const buffer = Buffer.from(b64Data, 'base64');

        if (!fs.existsSync(SHOT_DIR)) {
          fs.mkdirSync(SHOT_DIR, { recursive: true });
        }

        const outPath = path.join(SHOT_DIR, `${name}.png`);
        fs.writeFileSync(outPath, buffer);

        res.setHeader('Content-Type', 'text/plain');
        res.writeHead(200);
        res.end(outPath);
      } catch (err) {
        res.writeHead(500);
        res.end(`Error saving screenshot: ${err.message}`);
      }
    });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  let filePath = safePath(req.url);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      try {
        stats = fs.statSync(filePath);
      } catch {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const totalSize = stats.size;
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', mime);

    const rangeHeader = req.headers.range;
    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize || start > end) {
        res.setHeader('Content-Range', `bytes */${totalSize}`);
        res.writeHead(416, 'Range Not Satisfiable');
        res.end();
        return;
      }

      const chunkSize = end - start + 1;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      res.setHeader('Content-Length', chunkSize);
      res.writeHead(206, 'Partial Content');

      if (req.method === 'HEAD') {
        res.end();
      } else {
        const stream = fs.createReadStream(filePath, { start, end });
        stream.on('error', () => { if (!res.headersSent) res.writeHead(500); res.end(); });
        stream.pipe(res);
      }
    } else {
      res.setHeader('Content-Length', totalSize);
      res.writeHead(200, 'OK');

      if (req.method === 'HEAD') {
        res.end();
      } else {
        const stream = fs.createReadStream(filePath);
        stream.on('error', () => { if (!res.headersSent) res.writeHead(500); res.end(); });
        stream.pipe(res);
      }
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`serving on http://127.0.0.1:${PORT}`);
});
