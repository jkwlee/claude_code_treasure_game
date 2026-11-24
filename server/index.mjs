// Small API server for sign up / sign in and saving scores.
// Uses Node's built-in SQLite (node:sqlite) and crypto (node:crypto).
import express from 'express';
import cookieParser from 'cookie-parser';
import { DatabaseSync } from 'node:sqlite';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PORT = 3001;
const SESSION_COOKIE = 'session';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// The only final scores this game can produce (see the game rules in src/App.tsx)
const VALID_SCORES = new Set([150, 100, 50]);

// ---------- Database ----------
const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'game.db'));

db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    salt          TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS scores (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score     INTEGER NOT NULL,
    result    TEXT NOT NULL CHECK (result IN ('win', 'tie', 'loss')),
    played_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const stmt = {
  findUserByName: db.prepare('SELECT id, username, password_hash, salt FROM users WHERE username = ?'),
  insertUser: db.prepare('INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)'),
  insertSession: db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token = ?'),
  findUserBySession: db.prepare(`
    SELECT users.id, users.username FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ? AND sessions.created_at > datetime('now', '-7 days')
  `),
  insertScore: db.prepare('INSERT INTO scores (user_id, score, result) VALUES (?, ?, ?)'),
  scoreStats: db.prepare('SELECT COUNT(*) AS gamesPlayed, MAX(score) AS bestScore FROM scores WHERE user_id = ?'),
  recentScores: db.prepare(`
    SELECT id, score, result, played_at AS playedAt FROM scores
    WHERE user_id = ? ORDER BY id DESC LIMIT 10
  `),
};

// ---------- Helpers ----------
function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString('hex');
}

function passwordMatches(password, user) {
  const expected = Buffer.from(user.password_hash, 'hex');
  const actual = Buffer.from(hashPassword(password, user.salt), 'hex');
  return timingSafeEqual(expected, actual);
}

function startSession(res, userId) {
  const token = randomBytes(32).toString('hex');
  stmt.insertSession.run(token, userId);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_MS,
  });
}

function currentUser(req) {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) return null;
  return stmt.findUserBySession.get(token) ?? null;
}

function getResult(score) {
  return score > 0 ? 'win' : score === 0 ? 'tie' : 'loss';
}

// Returns an error message, or null if the input is valid
function validateCredentials(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') {
    return 'Username and password are required.';
  }
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    return 'Username must be 3-20 letters, numbers or underscores.';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  return null;
}

// ---------- Routes ----------
const app = express();
app.use(express.json());
app.use(cookieParser());

app.post('/api/signup', (req, res) => {
  const { username, password } = req.body ?? {};
  const error = validateCredentials(username, password);
  if (error) return res.status(400).json({ error });

  if (stmt.findUserByName.get(username)) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  const salt = randomBytes(16).toString('hex');
  const { lastInsertRowid } = stmt.insertUser.run(username, hashPassword(password, salt), salt);
  const userId = Number(lastInsertRowid);
  startSession(res, userId);
  res.status(201).json({ user: { id: userId, username } });
});

app.post('/api/signin', (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = stmt.findUserByName.get(username);
  if (!user || !passwordMatches(password, user)) {
    return res.status(401).json({ error: 'Wrong username or password.' });
  }

  startSession(res, user.id);
  res.json({ user: { id: user.id, username: user.username } });
});

app.post('/api/signout', (req, res) => {
  const token = req.cookies[SESSION_COOKIE];
  if (token) stmt.deleteSession.run(token);
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  res.json({ user: currentUser(req) });
});

app.post('/api/scores', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in to save scores.' });

  const score = req.body?.score;
  if (!VALID_SCORES.has(score)) {
    return res.status(400).json({ error: 'Invalid score.' });
  }

  stmt.insertScore.run(user.id, score, getResult(score));
  res.status(201).json({ ok: true });
});

app.get('/api/scores', (req, res) => {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in to see your scores.' });

  const { gamesPlayed, bestScore } = stmt.scoreStats.get(user.id);
  res.json({ gamesPlayed, bestScore, recent: stmt.recentScores.all(user.id) });
});

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
