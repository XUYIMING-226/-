const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { createOssPostPolicy } = require('./oss-upload-policy');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 3000);
const maxUploadBytes = Number(process.env.OSS_MAX_UPLOAD_BYTES || 26214400);
const types = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 100000) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON body.')); } });
    req.on('error', reject);
  });
}

function safeName(name) {
  const extension = path.extname(name || '').toLowerCase();
  const stem = path.basename(name || 'upload', extension).replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80) || 'upload';
  return `${stem}${extension}`;
}

function serveStatic(res, requestPath) {
  const pathname = requestPath === '/' ? '/index.html' : requestPath;
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return sendJson(res, 404, { error: 'Not found' });
  res.writeHead(200, { 'content-type': mimeTypes[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, ossConfigured: Boolean(process.env.OSS_ACCESS_KEY_ID && process.env.OSS_ACCESS_KEY_SECRET) });
  }
  if (req.method === 'POST' && url.pathname === '/api/upload-policy') {
    try {
      const { fileName, contentType } = await readJson(req);
      if (!types.has(contentType)) return sendJson(res, 400, { error: 'Only PDF, JPG, PNG, and WebP files are accepted.' });
      const date = new Date().toISOString().slice(0, 10);
      const key = `private/uploads/default/${date}/${crypto.randomUUID()}-${safeName(fileName)}`;
      const policy = createOssPostPolicy({
        bucket: process.env.OSS_BUCKET,
        region: process.env.OSS_REGION,
        accessKeyId: process.env.OSS_ACCESS_KEY_ID,
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
        key,
        contentType,
        maxBytes: maxUploadBytes
      });
      return sendJson(res, 200, policy);
    } catch (error) {
      return sendJson(res, 503, { error: error.message });
    }
  }
  if (req.method === 'GET') return serveStatic(res, decodeURIComponent(url.pathname));
  return sendJson(res, 405, { error: 'Method not allowed' });
});

server.listen(port, () => console.log(`Xingce Study is running at http://localhost:${port}`));
