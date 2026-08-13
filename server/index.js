require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { createOssPostPolicy } = require('./oss-upload-policy');
const database = require('./database');

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
    try {
      return sendJson(res, 200, { ok: true, ossConfigured: Boolean(process.env.OSS_ACCESS_KEY_ID && process.env.OSS_ACCESS_KEY_SECRET), database: await database.health() });
    } catch (error) {
      return sendJson(res, 503, { ok: false, ossConfigured: Boolean(process.env.OSS_ACCESS_KEY_ID && process.env.OSS_ACCESS_KEY_SECRET), database: { configured: true, connected: false }, error: error.message });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/material-groups') {
    try {
      const { subject = '资料分析', title, sourceName, ossObjectKey } = await readJson(req);
      if (!title || !ossObjectKey) return sendJson(res, 400, { error: 'title and ossObjectKey are required.' });
      const group = await database.createMaterialGroup({ id: crypto.randomUUID(), subject, title: String(title).slice(0, 255), sourceName: String(sourceName || '').slice(0, 255), ossObjectKey: String(ossObjectKey).slice(0, 512) });
      return sendJson(res, 201, { group });
    } catch (error) {
      return sendJson(res, 503, { error: error.message });
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/material-groups') {
    try { return sendJson(res, 200, { groups: await database.listMaterialGroups() }); }
    catch (error) { return sendJson(res, 503, { error: error.message }); }
  }
  if (req.method === 'POST' && /^\/api\/material-groups\/[^/]+\/questions$/.test(url.pathname)) {
    try {
      const materialGroupId = url.pathname.split('/')[3];
      const { questions } = await readJson(req);
      if (!Array.isArray(questions) || questions.length < 1 || questions.length > 10 || questions.some(question => !question?.stem)) return sendJson(res, 400, { error: 'questions must contain 1 to 10 items with a stem.' });
      await database.createQuestions(materialGroupId, questions.map(question => ({ stem: String(question.stem).slice(0, 10000), options: Array.isArray(question.options) ? question.options.slice(0, 8) : null, correctAnswer: question.correctAnswer }))); 
      return sendJson(res, 201, { ok: true });
    } catch (error) { return sendJson(res, 503, { error: error.message }); }
  }
  if (req.method === 'GET' && url.pathname === '/api/knowledge-nodes') {
    try { return sendJson(res, 200, { nodes: await database.listKnowledgeNodes(url.searchParams.get('subject') || '资料分析') }); }
    catch (error) { return sendJson(res, 503, { error: error.message }); }
  }
  if (req.method === 'POST' && url.pathname === '/api/knowledge-nodes') {
    try {
      const { subject = '资料分析', parentId, title, note } = await readJson(req);
      if (!title) return sendJson(res, 400, { error: 'title is required.' });
      const node = await database.createKnowledgeNode({ id: crypto.randomUUID(), subject: String(subject).slice(0, 40), parentId, title: String(title).slice(0, 120), note: String(note || '').slice(0, 10000) });
      return sendJson(res, 201, { node });
    } catch (error) { return sendJson(res, 503, { error: error.message }); }
  }
  if (req.method === 'POST' && /^\/api\/questions\/[^/]+\/attempts$/.test(url.pathname)) {
    try {
      const questionId = url.pathname.split('/')[3];
      const { selectedAnswer, isCorrect, durationSeconds } = await readJson(req);
      if (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 10800) return sendJson(res, 400, { error: 'durationSeconds must be between 0 and 10800.' });
      const attempt = await database.createAttempt({ id: crypto.randomUUID(), questionId, selectedAnswer: String(selectedAnswer || '').slice(0, 32), isCorrect: typeof isCorrect === 'boolean' ? isCorrect : null, durationSeconds });
      return sendJson(res, 201, { attempt });
    } catch (error) { return sendJson(res, 503, { error: error.message }); }
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
