'use strict';

/*
 * Shirley's English Games — classroom server (shark, caterpillar, ...).
 * Zero dependencies: Node 22.13+ (built-in node:sqlite).
 *
 *   node server.js            → http://localhost:3000 (+ LAN addresses)
 *   TEACHER_NAME=Mrs.Smith    → change the teacher's magic name (default: Shirley)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT) || 3000;
const TEACHER_NAME = (process.env.TEACHER_NAME || 'Shirley').trim().toLowerCase();
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

fs.mkdirSync(DATA_DIR, { recursive: true });

/* ---------------- database ---------------- */
const db = new DatabaseSync(path.join(DATA_DIR, 'game.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS sessions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'playing',   -- playing | won | eaten
    words_done   INTEGER NOT NULL DEFAULT 0,
    duration_sec INTEGER,
    started_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    finished_at  TEXT
  );
  CREATE TABLE IF NOT EXISTS mistakes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    word       TEXT    NOT NULL,
    chosen     TEXT    NOT NULL,
    correct    TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_mistakes_session ON mistakes(session_id);
  CREATE INDEX IF NOT EXISTS idx_mistakes_word ON mistakes(word);
  CREATE TABLE IF NOT EXISTS questions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    tag        TEXT    NOT NULL,
    question   TEXT    NOT NULL,
    options    TEXT    NOT NULL,           -- JSON array of strings
    correct    INTEGER NOT NULL,
    fact       TEXT    NOT NULL DEFAULT '',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS game_configs (
    game       TEXT PRIMARY KEY,
    config     TEXT NOT NULL,                -- JSON, формат определяет сама игра
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// миграция: старые сессии принадлежат акуле
const sessionCols = db.prepare('PRAGMA table_info(sessions)').all().map((c) => c.name);
if (!sessionCols.includes('game')) db.exec(`ALTER TABLE sessions ADD COLUMN game TEXT NOT NULL DEFAULT 'shark'`);
if (!sessionCols.includes('detail')) db.exec(`ALTER TABLE sessions ADD COLUMN detail TEXT NOT NULL DEFAULT ''`);

const q = {
  insertSession: db.prepare(`INSERT INTO sessions (name, game, detail) VALUES (?, ?, ?)`),
  getSession: db.prepare(`SELECT * FROM sessions WHERE id = ?`),
  insertMistake: db.prepare(`INSERT INTO mistakes (session_id, word, chosen, correct) VALUES (?, ?, ?, ?)`),
  finishSession: db.prepare(`
    UPDATE sessions SET status = ?, words_done = ?, duration_sec = ?, finished_at = datetime('now')
    WHERE id = ? AND status = 'playing'`),
  // отчёт учителя строится только по завершённым играм; game = 'all' — без фильтра
  listSessions: db.prepare(`
    SELECT s.id, s.name, s.game, s.detail, s.status, s.words_done, s.duration_sec, s.started_at, s.finished_at,
           (SELECT COUNT(*) FROM mistakes m WHERE m.session_id = s.id) AS mistakes
    FROM sessions s WHERE s.status != 'playing' AND (? = 'all' OR s.game = ?)
    ORDER BY s.started_at DESC, s.id DESC LIMIT 500`),
  totals: db.prepare(`
    SELECT COUNT(*) AS games,
           COUNT(DISTINCT lower(name)) AS players,
           COALESCE(SUM(status = 'won'), 0) AS won,
           COALESCE(SUM(status = 'eaten'), 0) AS eaten,
           COALESCE(SUM(status = 'done'), 0) AS done,
           (SELECT COUNT(*) FROM mistakes m JOIN sessions f ON f.id = m.session_id AND f.status != 'playing'
             WHERE (? = 'all' OR f.game = ?)) AS mistakes
    FROM sessions WHERE status != 'playing' AND (? = 'all' OR game = ?)`),
  topWords: db.prepare(`
    SELECT m.word, m.correct, f.game, COUNT(*) AS count, COUNT(DISTINCT m.session_id) AS players
    FROM mistakes m JOIN sessions f ON f.id = m.session_id AND f.status != 'playing'
    WHERE (? = 'all' OR f.game = ?)
    GROUP BY m.word, f.game ORDER BY count DESC, m.word ASC LIMIT 5`),
  topChoice: db.prepare(`
    SELECT m.chosen, COUNT(*) AS count
    FROM mistakes m JOIN sessions f ON f.id = m.session_id AND f.status != 'playing'
    WHERE m.word = ? AND f.game = ? GROUP BY m.chosen ORDER BY count DESC LIMIT 1`),
  clearMistakes: db.prepare(`DELETE FROM mistakes`),
  clearSessions: db.prepare(`DELETE FROM sessions`),
  listQuestions: db.prepare(`SELECT * FROM questions ORDER BY id`),
  insertQuestion: db.prepare(`INSERT INTO questions (tag, question, options, correct, fact) VALUES (?, ?, ?, ?, ?)`),
  updateQuestion: db.prepare(`UPDATE questions SET tag = ?, question = ?, options = ?, correct = ?, fact = ? WHERE id = ?`),
  deleteQuestion: db.prepare(`DELETE FROM questions WHERE id = ?`),
  clearQuestions: db.prepare(`DELETE FROM questions`),
  allSettings: db.prepare(`SELECT key, value FROM settings`),
  setSetting: db.prepare(`REPLACE INTO settings (key, value) VALUES (?, ?)`),
  getConfig: db.prepare(`SELECT config, updated_at FROM game_configs WHERE game = ?`),
  setConfig: db.prepare(`REPLACE INTO game_configs (game, config, updated_at) VALUES (?, ?, datetime('now'))`),
  deleteConfig: db.prepare(`DELETE FROM game_configs WHERE game = ?`),
};

/* ---------------- helpers ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2',
};

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': Buffer.isBuffer(body) ? 'application/octet-stream' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(payload);
}
const ok = (res, data) => send(res, 200, data);
const fail = (res, status, error) => send(res, status, { error });

function readJson(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('Body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function cleanName(raw) {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (name.length < 1 || name.length > 30) return null;
  return name;
}
const isTeacher = (name) => !!name && name.trim().toLowerCase() === TEACHER_NAME;
const cleanWord = (v) => String(v ?? '').trim().slice(0, 60);
const cleanGame = (v) => (/^[a-z0-9_-]{1,30}$/.test(String(v ?? '')) ? String(v) : null);

// имя приходит в заголовке URL-энкоженным (кириллица не проходит в raw-заголовках)
function headerName(req) {
  const raw = req.headers['x-player-name'] || '';
  try { return decodeURIComponent(raw); } catch { return raw; }
}
function teacherFrom(req, url) {
  return url.searchParams.get('name') || headerName(req);
}

function questionRows() {
  return q.listQuestions.all().map((r) => ({
    id: r.id, tag: r.tag, question: r.question,
    options: JSON.parse(r.options), correct: r.correct, fact: r.fact,
  }));
}
function gameSettings() {
  const s = {};
  for (const row of q.allSettings.all()) s[row.key] = row.value;
  return {
    startGap: Math.min(8, Math.max(2, Number(s.startGap) || 6)),
    idleEnabled: s.idleEnabled !== '0',
  };
}
function validateQuestion(b) {
  const tag = String(b.tag ?? '').trim().slice(0, 30) || 'QUESTION';
  const question = String(b.question ?? '').trim().slice(0, 300);
  const fact = String(b.fact ?? '').trim().slice(0, 300);
  const options = Array.isArray(b.options)
    ? b.options.map((o) => String(o ?? '').trim().slice(0, 120)).filter(Boolean).slice(0, 4)
    : [];
  const correct = Number(b.correct);
  if (!question || options.length < 2 || !Number.isInteger(correct) || correct < 0 || correct >= options.length) return null;
  return { tag, question, options: JSON.stringify(options), correct, fact };
}

function serveStatic(req, res, urlPath) {
  let rel;
  try { rel = decodeURIComponent(urlPath); } catch { return fail(res, 400, 'Bad path'); }
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) return fail(res, 403, 'Forbidden');
  fs.stat(file, (e, st) => {
    if (!e && st.isDirectory()) {
      // /shark -> /shark/ (иначе относительные пути страницы ломаются), каталог -> index.html
      if (!urlPath.endsWith('/')) { res.writeHead(301, { Location: urlPath + '/' }); return res.end(); }
      return sendFile(res, path.join(file, 'index.html'));
    }
    sendFile(res, file);
  });
}
function sendFile(res, file) {
  fs.readFile(file, (err, data) => {
    if (err) return fail(res, 404, 'Not found');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

function teacherReport(game) {
  const totals = q.totals.get(game, game, game, game);
  const top = q.topWords.all(game, game).map((row) => ({
    ...row,
    typicalWrong: q.topChoice.get(row.word, row.game)?.chosen ?? null,
  }));
  return { totals, topMistakes: top, sessions: q.listSessions.all(game, game), teacherName: TEACHER_NAME, game };
}

/* ---------------- routes ---------------- */
async function handleApi(req, res, url) {
  const { pathname } = url;
  const method = req.method;

  // GET /api/ping → backend discovery for the frontend
  if (pathname === '/api/ping') return ok(res, { ok: true, backend: 'node' });

  // POST /api/sessions  { name }  → register a player and start a game
  if (pathname === '/api/sessions' && method === 'POST') {
    const body = await readJson(req);
    const name = cleanName(body.name);
    if (!name) return fail(res, 400, 'Name must be 1–30 characters');
    if (isTeacher(name)) return ok(res, { role: 'teacher', name, sessionId: null });
    const game = cleanGame(body.game) || 'shark';
    const detail = String(body.detail ?? '').trim().slice(0, 80);
    const { lastInsertRowid } = q.insertSession.run(name, game, detail);
    return ok(res, { role: 'student', name, sessionId: Number(lastInsertRowid) });
  }

  // POST /api/sessions/:id/mistake  { word, chosen, correct }
  let m = pathname.match(/^\/api\/sessions\/(\d+)\/mistake$/);
  if (m && method === 'POST') {
    const id = Number(m[1]);
    if (!q.getSession.get(id)) return fail(res, 404, 'Session not found');
    const body = await readJson(req);
    const word = cleanWord(body.word), chosen = cleanWord(body.chosen), correct = cleanWord(body.correct);
    if (!word || !chosen || !correct) return fail(res, 400, 'word, chosen, correct are required');
    q.insertMistake.run(id, word, chosen, correct);
    return ok(res, { saved: true });
  }

  // POST /api/sessions/:id/finish  { status, wordsDone, durationSec }
  m = pathname.match(/^\/api\/sessions\/(\d+)\/finish$/);
  if (m && method === 'POST') {
    const id = Number(m[1]);
    if (!q.getSession.get(id)) return fail(res, 404, 'Session not found');
    const body = await readJson(req);
    const status = ['won', 'eaten', 'done'].includes(body.status) ? body.status : null;
    if (!status) return fail(res, 400, 'status must be won, eaten or done');
    const wordsDone = Math.max(0, Math.min(99, Number(body.wordsDone) || 0));
    const durationSec = Math.max(0, Math.min(86400, Math.round(Number(body.durationSec) || 0)));
    q.finishSession.run(status, wordsDone, durationSec, id);
    return ok(res, { saved: true });
  }

  // GET /api/questions → active custom bank + game rules (public: students need it to play)
  if (pathname === '/api/questions' && method === 'GET') {
    return ok(res, { questions: questionRows(), settings: gameSettings() });
  }

  // Teacher: manage custom questions
  m = pathname.match(/^\/api\/teacher\/questions(?:\/(\d+))?$/);
  if (m) {
    if (!isTeacher(teacherFrom(req, url))) return fail(res, 403, 'Teacher access only');
    const qid = m[1] ? Number(m[1]) : null;
    if (method === 'POST' && !qid) {
      const v = validateQuestion(await readJson(req));
      if (!v) return fail(res, 400, 'Need question text, 2\u20134 options and a valid correct index');
      const { lastInsertRowid } = q.insertQuestion.run(v.tag, v.question, v.options, v.correct, v.fact);
      return ok(res, { saved: true, id: Number(lastInsertRowid) });
    }
    if (method === 'PUT' && qid) {
      const v = validateQuestion(await readJson(req));
      if (!v) return fail(res, 400, 'Need question text, 2\u20134 options and a valid correct index');
      q.updateQuestion.run(v.tag, v.question, v.options, v.correct, v.fact, qid);
      return ok(res, { saved: true });
    }
    if (method === 'DELETE' && qid) { q.deleteQuestion.run(qid); return ok(res, { deleted: true }); }
    if (method === 'DELETE') { q.clearQuestions.run(); return ok(res, { cleared: true }); }
  }

  // GET /api/games/:game/config → настройки игры, сохранённые учителем (public: игре они нужны для старта)
  m = pathname.match(/^\/api\/games\/([a-z0-9_-]{1,30})\/config$/);
  if (m && method === 'GET') {
    const row = q.getConfig.get(m[1]);
    return ok(res, { config: row ? JSON.parse(row.config) : null, updatedAt: row ? row.updated_at : null });
  }

  // Teacher: save / reset a game's config
  m = pathname.match(/^\/api\/teacher\/games\/([a-z0-9_-]{1,30})\/config$/);
  if (m) {
    if (!isTeacher(teacherFrom(req, url))) return fail(res, 403, 'Teacher access only');
    if (method === 'PUT') {
      const body = await readJson(req, 128 * 1024);
      if (!body || typeof body.config !== 'object' || body.config === null || Array.isArray(body.config)) {
        return fail(res, 400, 'config must be an object');
      }
      q.setConfig.run(m[1], JSON.stringify(body.config));
      return ok(res, { saved: true });
    }
    if (method === 'DELETE') { q.deleteConfig.run(m[1]); return ok(res, { cleared: true }); }
  }

  // Teacher: game rules
  if (pathname === '/api/teacher/settings' && method === 'POST') {
    if (!isTeacher(teacherFrom(req, url))) return fail(res, 403, 'Teacher access only');
    const body = await readJson(req);
    q.setSetting.run('startGap', String(Math.min(8, Math.max(2, Number(body.startGap) || 6))));
    q.setSetting.run('idleEnabled', body.idleEnabled === false ? '0' : '1');
    return ok(res, { saved: true });
  }

  // Teacher endpoints — identified by the teacher's name
  if (pathname === '/api/teacher/results') {
    const name = teacherFrom(req, url);
    if (!isTeacher(name)) return fail(res, 403, 'Teacher access only');
    if (method === 'GET') return ok(res, teacherReport(cleanGame(url.searchParams.get('game')) || 'shark'));
    if (method === 'DELETE') {
      db.exec('BEGIN');
      try { q.clearMistakes.run(); q.clearSessions.run(); db.exec('COMMIT'); }
      catch (e) { db.exec('ROLLBACK'); throw e; }
      return ok(res, { cleared: true });
    }
  }

  return fail(res, 404, 'Unknown API route');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'OPTIONS') return send(res, 204, '');
      await handleApi(req, res, url);
    } else if (req.method === 'GET' || req.method === 'HEAD') {
      serveStatic(req, res, url.pathname);
    } else {
      fail(res, 405, 'Method not allowed');
    }
  } catch (err) {
    console.error(err);
    fail(res, 500, err.message || 'Server error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const lan = Object.values(os.networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log(`🎮 Shirley's English Games is running:`);
  console.log(`   local:   http://localhost:${PORT}`);
  lan.forEach((ip) => console.log(`   network: http://${ip}:${PORT}`));
  console.log(`   teacher name: "${process.env.TEACHER_NAME || 'Shirley'}"  •  db: data/game.db`);
});
