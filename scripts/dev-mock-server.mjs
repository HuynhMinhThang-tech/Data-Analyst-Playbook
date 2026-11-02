// Local smoke-test server only (not part of the deployed app): serves
// public/index.html as static, and fakes /api/catalog from the seed JSON so
// we can verify the frontend renders correctly without a real database.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/db.json'), 'utf8'));
const EXTRA = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/item_extra.json'), 'utf8'));

const server = http.createServer((req, res) => {
  if (req.url === '/api/catalog') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ DB, ITEM_EXTRA: EXTRA }));
    return;
  }
  if (req.url === '/api/ai-search' && req.method === 'POST') {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'not_configured', message: 'AI chưa cấu hình (mock).' }));
    return;
  }
  if (req.url === '/favicon.svg') {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.end(fs.readFileSync(path.join(__dirname, '../public/favicon.svg'), 'utf8'));
    return;
  }
  const filePath = path.join(__dirname, '../public/index.html');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(fs.readFileSync(filePath, 'utf8'));
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4174;
server.listen(PORT, () => console.log(`Mock server on http://localhost:${PORT}`));
