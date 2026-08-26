<?php
/**
 * Shirley & the Shark — API for shared hosting (PHP 7.4+, pdo_sqlite).
 * Same routes and JSON responses as the Node server (server.js).
 *
 * Works in two modes:
 *   - with .htaccess rewrite:  POST /api/sessions            → api.php?p=api/sessions
 *   - without rewrite:         POST /api.php/api/sessions    (PATH_INFO)
 * The frontend detects the working mode automatically via api/ping.
 */

declare(strict_types=1);

const TEACHER_NAME = 'Shirley';          // the magic teacher name (case-insensitive)
const DB_DIR = __DIR__ . '/data';
const DB_FILE = DB_DIR . '/game.db';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out(int $status, $data): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function fail(int $status, string $error): void { out($status, ['error' => $error]); }

/* ---------- resolve route ---------- */
$path = '';
if (!empty($_GET['p'])) {
    $path = (string)$_GET['p'];
} elseif (!empty($_SERVER['PATH_INFO'])) {
    $path = (string)$_SERVER['PATH_INFO'];
}
$path = '/' . ltrim($path, '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($path === '/' || $path === '') fail(404, 'No route given');

/* ---------- database ---------- */
if (!is_dir(DB_DIR) && !@mkdir(DB_DIR, 0755, true)) {
    fail(500, 'Cannot create data/ directory — check hosting permissions');
}
// keep the DB private even if data/.htaccess was not uploaded
$guard = DB_DIR . '/.htaccess';
if (!file_exists($guard)) {
    @file_put_contents($guard, "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
}

try {
    $db = new PDO('sqlite:' . DB_FILE);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('PRAGMA journal_mode = WAL');
    $db->exec("
        CREATE TABLE IF NOT EXISTS sessions (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            name         TEXT    NOT NULL,
            status       TEXT    NOT NULL DEFAULT 'playing',
            words_done   INTEGER NOT NULL DEFAULT 0,
            duration_sec INTEGER,
            started_at   TEXT    NOT NULL DEFAULT (datetime('now')),
            finished_at  TEXT
        )");
    $db->exec("
        CREATE TABLE IF NOT EXISTS mistakes (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            word       TEXT    NOT NULL,
            chosen     TEXT    NOT NULL,
            correct    TEXT    NOT NULL,
            created_at TEXT    NOT NULL DEFAULT (datetime('now'))
        )");
    $db->exec('CREATE INDEX IF NOT EXISTS idx_mistakes_session ON mistakes(session_id)');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_mistakes_word ON mistakes(word)');
} catch (Throwable $e) {
    fail(500, 'SQLite unavailable: ' . $e->getMessage());
}

/* ---------- helpers ---------- */
function body(): array {
    $raw = file_get_contents('php://input', false, null, 0, 16384);
    if ($raw === '' || $raw === false) return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) fail(400, 'Invalid JSON');
    return $data;
}
function clean_name($raw): ?string {
    $name = trim(preg_replace('/\s+/u', ' ', (string)($raw ?? '')));
    $len = function_exists('mb_strlen') ? mb_strlen($name) : strlen($name);
    return ($len >= 1 && $len <= 30) ? $name : null;
}
function is_teacher(?string $name): bool {
    return $name !== null && function_exists('mb_strtolower')
        ? mb_strtolower(trim($name)) === mb_strtolower(TEACHER_NAME)
        : strtolower(trim((string)$name)) === strtolower(TEACHER_NAME);
}
function clean_word($v): string {
    $s = trim((string)($v ?? ''));
    return function_exists('mb_substr') ? mb_substr($s, 0, 60) : substr($s, 0, 60);
}

/* ---------- routes ---------- */

// GET api/ping
if ($path === '/api/ping') out(200, ['ok' => true, 'backend' => 'php']);

// POST api/sessions {name}
if ($path === '/api/sessions' && $method === 'POST') {
    $name = clean_name(body()['name'] ?? null);
    if ($name === null) fail(400, 'Name must be 1–30 characters');
    if (is_teacher($name)) out(200, ['role' => 'teacher', 'name' => $name, 'sessionId' => null]);
    $st = $db->prepare('INSERT INTO sessions (name) VALUES (?)');
    $st->execute([$name]);
    out(200, ['role' => 'student', 'name' => $name, 'sessionId' => (int)$db->lastInsertId()]);
}

// POST api/sessions/{id}/mistake {word, chosen, correct}
if (preg_match('#^/api/sessions/(\d+)/mistake$#', $path, $m) && $method === 'POST') {
    $id = (int)$m[1];
    $st = $db->prepare('SELECT id FROM sessions WHERE id = ?');
    $st->execute([$id]);
    if (!$st->fetch()) fail(404, 'Session not found');
    $b = body();
    $word = clean_word($b['word'] ?? '');
    $chosen = clean_word($b['chosen'] ?? '');
    $correct = clean_word($b['correct'] ?? '');
    if ($word === '' || $chosen === '' || $correct === '') fail(400, 'word, chosen, correct are required');
    $st = $db->prepare('INSERT INTO mistakes (session_id, word, chosen, correct) VALUES (?, ?, ?, ?)');
    $st->execute([$id, $word, $chosen, $correct]);
    out(200, ['saved' => true]);
}

// POST api/sessions/{id}/finish {status, wordsDone, durationSec}
if (preg_match('#^/api/sessions/(\d+)/finish$#', $path, $m) && $method === 'POST') {
    $id = (int)$m[1];
    $st = $db->prepare('SELECT id FROM sessions WHERE id = ?');
    $st->execute([$id]);
    if (!$st->fetch()) fail(404, 'Session not found');
    $b = body();
    $status = ($b['status'] ?? '') === 'won' ? 'won' : ((($b['status'] ?? '') === 'eaten') ? 'eaten' : null);
    if ($status === null) fail(400, 'status must be won or eaten');
    $wordsDone = max(0, min(99, (int)($b['wordsDone'] ?? 0)));
    $durationSec = max(0, min(86400, (int)round((float)($b['durationSec'] ?? 0))));
    $st = $db->prepare("UPDATE sessions SET status = ?, words_done = ?, duration_sec = ?, finished_at = datetime('now')
                        WHERE id = ? AND status = 'playing'");
    $st->execute([$status, $wordsDone, $durationSec, $id]);
    out(200, ['saved' => true]);
}

// GET / DELETE api/teacher/results?name=Shirley
if ($path === '/api/teacher/results') {
    $name = $_GET['name'] ?? ($_SERVER['HTTP_X_PLAYER_NAME'] ?? null);
    if (!is_teacher(is_string($name) ? $name : null)) fail(403, 'Teacher access only');

    if ($method === 'GET') {
        $totals = $db->query("
            SELECT COUNT(*) AS games,
                   COUNT(DISTINCT lower(name)) AS players,
                   COALESCE(SUM(status = 'won'), 0) AS won,
                   COALESCE(SUM(status = 'eaten'), 0) AS eaten,
                   (SELECT COUNT(*) FROM mistakes m JOIN sessions f ON f.id = m.session_id AND f.status != 'playing') AS mistakes
            FROM sessions WHERE status != 'playing'")->fetch(PDO::FETCH_ASSOC);
        foreach ($totals as $k => $v) $totals[$k] = (int)$v;

        $top = $db->query("
            SELECT m.word, m.correct, COUNT(*) AS count, COUNT(DISTINCT m.session_id) AS players
            FROM mistakes m JOIN sessions f ON f.id = m.session_id AND f.status != 'playing'
            GROUP BY m.word ORDER BY count DESC, m.word ASC LIMIT 2")->fetchAll(PDO::FETCH_ASSOC);
        $tc = $db->prepare("SELECT m.chosen FROM mistakes m JOIN sessions f ON f.id = m.session_id AND f.status != 'playing'
                            WHERE m.word = ? GROUP BY m.chosen ORDER BY COUNT(*) DESC LIMIT 1");
        foreach ($top as &$row) {
            $row['count'] = (int)$row['count'];
            $row['players'] = (int)$row['players'];
            $tc->execute([$row['word']]);
            $row['typicalWrong'] = $tc->fetchColumn() ?: null;
        }
        unset($row);

        $sessions = $db->query("
            SELECT s.id, s.name, s.status, s.words_done, s.duration_sec, s.started_at, s.finished_at,
                   (SELECT COUNT(*) FROM mistakes m WHERE m.session_id = s.id) AS mistakes
            FROM sessions s WHERE s.status != 'playing'
            ORDER BY s.started_at DESC, s.id DESC LIMIT 500")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($sessions as &$s) {
            $s['id'] = (int)$s['id'];
            $s['words_done'] = (int)$s['words_done'];
            $s['duration_sec'] = $s['duration_sec'] === null ? null : (int)$s['duration_sec'];
            $s['mistakes'] = (int)$s['mistakes'];
        }
        unset($s);

        out(200, ['totals' => $totals, 'topMistakes' => $top, 'sessions' => $sessions, 'teacherName' => TEACHER_NAME]);
    }

    if ($method === 'DELETE') {
        $db->beginTransaction();
        try {
            $db->exec('DELETE FROM mistakes');
            $db->exec('DELETE FROM sessions');
            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();
            fail(500, $e->getMessage());
        }
        out(200, ['cleared' => true]);
    }
}

fail(404, 'Unknown API route');
