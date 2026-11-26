import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { pipeline } from 'node:stream/promises';

const ASSETS = new Map([
  ['index.html', 'text/html; charset=utf-8'],
  ['style.css', 'text/css; charset=utf-8'],
  ['version.json', 'application/json'],
  ['manifest.webmanifest', 'application/manifest+json'],
  ['trailer.mp4', 'video/mp4'],
]);
const API_PATH = '/api/social/';
const PAGE_SIZE = 20;
const STATS = ['trophies', 'played', 'wins', 'goals', 'supers', 'cups', 'bestStreak'];

class RequestError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
  }
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > 2048) throw new RequestError(413, 'body_too_large');
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  } catch (error) {
    // Neplatný JSON ohlásíme stejně jako jiné neplatné tělo.
  }
  throw new RequestError(400, 'invalid_body');
}

function nickname(value) {
  const name = typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/g, ' ') : '';
  if (name.length < 2 || name.length > 12 || !/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(name)) {
    throw new RequestError(400, 'invalid_name');
  }
  return name;
}

function authHash(req) {
  const token = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
  if (!token) throw new RequestError(401, 'unauthorized');
  return createHash('sha256').update(token[1]).digest('hex');
}

async function serveAsset(req, res, pathname) {
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  const type = ASSETS.get(file)
    || (/^js\/(?:vendor\/)?[\w.-]+\.js$/.test(file) && 'text/javascript; charset=utf-8')
    || (/^icons\/[\w.-]+\.png$/.test(file) && 'image/png');
  if (!type || !['GET', 'HEAD'].includes(req.method)) throw new RequestError(404, 'not_found');
  const path = join(import.meta.dirname, file);
  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) throw new RequestError(404, 'not_found');

  let start = 0, end = info.size - 1;
  const headers = { 'Content-Type': type, 'Cache-Control': 'no-cache' };
  const range = file === 'trailer.mp4' && req.headers.range;
  if (file === 'trailer.mp4') headers['Accept-Ranges'] = 'bytes';
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match && (match[1] || match[2])) {
      start = match[1] ? Number(match[1]) : Math.max(0, info.size - Number(match[2]));
      if (match[1] && match[2]) end = Math.min(end, Number(match[2]));
    } else {
      start = info.size;
    }
    if (start > end) {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${info.size}` });
      res.end();
      return;
    }
    headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
  }
  res.writeHead(range ? 206 : 200, { ...headers, 'Content-Length': end - start + 1 });
  if (req.method === 'HEAD' || !info.size) res.end();
  else await pipeline(createReadStream(path, { start, end }), res);
}

export async function createGameServer({ dataDir = '.fifa67', webOrigin = '' } = {}) {
  await mkdir(dataDir, { recursive: true });
  const db = new DatabaseSync(join(dataDir, 'players.sqlite'), { timeout: 5000 });
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      auth_hash TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      name_key TEXT NOT NULL UNIQUE,
      trophies INTEGER NOT NULL,
      played INTEGER NOT NULL,
      stats TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS player_order ON players (trophies DESC, name_key);
    CREATE TABLE IF NOT EXISTS friends (
      owner TEXT NOT NULL REFERENCES players(id),
      friend TEXT NOT NULL REFERENCES players(id),
      PRIMARY KEY (owner, friend),
      CHECK (owner <> friend)
    ) STRICT;
  `);
  const place = '1 + (SELECT count(*) FROM players WHERE trophies > p.trophies) AS place';
  const summary = `p.id, p.name, p.trophies, ${place}`;
  const order = 'ORDER BY p.trophies DESC, p.name_key';
  const list = db.prepare(`SELECT ${summary} FROM players p WHERE instr(p.name_key, ?) > 0 ${order} LIMIT ? OFFSET ?`);
  const friends = db.prepare(`SELECT ${summary} FROM friends f JOIN players p ON f.friend = p.id
    WHERE f.owner = ? ${order} LIMIT ? OFFSET ?`);
  const account = db.prepare('SELECT id FROM players WHERE auth_hash = ?');
  const player = db.prepare(`SELECT ${summary}, p.stats FROM players p WHERE p.id = ?`);
  const friend = db.prepare('SELECT 1 FROM friends WHERE owner = ? AND friend = ?');
  const addFriend = db.prepare('INSERT OR IGNORE INTO friends (owner, friend) VALUES (?, ?)');
  const removeFriend = db.prepare('DELETE FROM friends WHERE owner = ? AND friend = ?');
  const saveProfile = db.prepare(`
    INSERT INTO players (id, auth_hash, name, name_key, trophies, played, stats) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(auth_hash) DO UPDATE SET
      name = excluded.name, name_key = excluded.name_key,
      trophies = CASE WHEN excluded.played > players.played THEN excluded.trophies ELSE players.trophies END,
      stats = CASE WHEN excluded.played > players.played THEN excluded.stats ELSE players.stats END,
      played = max(players.played, excluded.played)
  `);
  const saveStats = db.prepare('UPDATE players SET trophies = ?, played = ?, stats = ? WHERE auth_hash = ? AND played < ?');

  function profile(id) {
    const row = player.get(id);
    if (!row) throw new RequestError(404, 'player_missing');
    const { stats, ...details } = row;
    return { ...details, ...JSON.parse(stats) };
  }

  function requireAccount(hash) {
    const owner = account.get(hash);
    if (!owner) throw new RequestError(404, 'profile_required');
    return owner.id;
  }

  async function social(req, res, url) {
    if (webOrigin && req.headers.origin === webOrigin) {
      res.setHeader('Access-Control-Allow-Origin', webOrigin);
      res.setHeader('Vary', 'Origin');
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Methods': 'GET, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        });
        res.end();
        return;
      }
    }
    const route = url.pathname.slice(API_PATH.length);
    if (req.method === 'GET' && (route === 'leaderboard' || route === 'friends')) {
      const offset = Number(url.searchParams.get('offset') ?? 0);
      if (!Number.isSafeInteger(offset) || offset < 0) throw new RequestError(400, 'invalid_offset');
      const search = (url.searchParams.get('search') || '').trim().normalize('NFC').toLowerCase().slice(0, 12);
      const rows = route === 'leaderboard'
        ? list.all(search, PAGE_SIZE + 1, offset)
        : friends.all(requireAccount(authHash(req)), PAGE_SIZE + 1, offset);
      return json(res, 200, {
        players: rows.slice(0, PAGE_SIZE),
        previous: offset > 0 ? Math.max(0, offset - PAGE_SIZE) : null,
        next: rows.length > PAGE_SIZE ? offset + PAGE_SIZE : null,
      });
    }

    if (req.method === 'PUT' && route === 'me') {
      const hash = authHash(req);
      const body = await readJson(req);
      const stats = {};
      for (const key of STATS) {
        const value = body.stats?.[key];
        if (!Number.isSafeInteger(value) || value < 0) throw new RequestError(400, 'invalid_stats');
        stats[key] = value;
      }
      if (stats.wins > stats.played || stats.bestStreak > stats.wins || stats.cups > stats.wins) {
        throw new RequestError(400, 'invalid_stats');
      }
      const { trophies, played } = stats;
      const record = JSON.stringify(stats);
      if (body.name !== undefined) {
        const name = nickname(body.name);
        try {
          saveProfile.run(randomUUID(), hash, name, name.toLowerCase(), trophies, played, record);
        } catch (error) {
          if (error.errcode === 2067 && error.message.includes('players.name_key')) {
            throw new RequestError(409, 'name_taken');
          }
          throw error;
        }
      } else {
        requireAccount(hash);
        saveStats.run(trophies, played, record, hash, played);
      }
      return json(res, 200, profile(requireAccount(hash)));
    }

    const target = /^(players|friends)\/([a-f0-9-]{36})$/.exec(route);
    if (target?.[1] === 'players' && req.method === 'GET') {
      const details = profile(target[2]);
      const owner = req.headers.authorization ? account.get(authHash(req)) : null;
      return json(res, 200, { ...details, isFriend: !!owner && !!friend.get(owner.id, details.id) });
    }
    if (target?.[1] === 'friends' && ['PUT', 'DELETE'].includes(req.method)) {
      const owner = requireAccount(authHash(req));
      const id = target[2];
      if (owner === id) throw new RequestError(400, 'self_friend');
      if (req.method === 'PUT') {
        if (!player.get(id)) throw new RequestError(404, 'player_missing');
        addFriend.run(owner, id);
      } else {
        removeFriend.run(owner, id);
      }
      return json(res, 200, { isFriend: req.method === 'PUT' });
    }
    throw new RequestError(404, 'not_found');
  }

  const server = createServer({ requestTimeout: 10_000 }, async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith(API_PATH)) await social(req, res, url);
      else await serveAsset(req, res, url.pathname);
    } catch (error) {
      if (res.headersSent || res.destroyed) return;
      if (error instanceof RequestError) {
        if (error.status === 413) res.setHeader('Connection', 'close');
        json(res, error.status, { error: error.message });
      } else {
        console.error(error);
        json(res, 500, { error: 'server_error' });
      }
    }
  });
  server.once('close', () => db.close());
  return server;
}

if (import.meta.main) {
  const server = await createGameServer({
    dataDir: process.env.FIFA67_DATA_DIR,
    webOrigin: process.env.FIFA67_WEB_ORIGIN,
  });
  server.listen(Number(process.env.PORT ?? 8000), process.env.HOST ?? '0.0.0.0', () => {
    const { address, port } = server.address();
    console.log(`FIFA67 běží na http://${address}:${port}`);
  });
}
