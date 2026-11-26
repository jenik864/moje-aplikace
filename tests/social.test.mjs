import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createGameServer } from '../server.mjs';

const token = () => randomBytes(32).toString('hex');
const stats = (trophies, played = 8) => ({
  trophies, played, wins: 6, goals: 17, supers: 4, cups: 0, bestStreak: 3,
});

test('profil, pořadí a soukromí přátel přežijí přejmenování, opakované požadavky i restart', async (t) => {
  const dataDir = await mkdtemp(join(tmpdir(), 'fifa67-test-'));
  let server, base;
  t.after(async () => {
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
  });
  const webOrigin = 'https://jenik864.github.io';
  const start = async () => {
    server = await createGameServer({ dataDir, webOrigin });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = `http://127.0.0.1:${server.address().port}`;
  };
  await start();

  const request = async (path, { method = 'GET', key, body, status = 200 } = {}) => {
    const headers = body ? { 'Content-Type': 'application/json' } : {};
    if (key) headers.Authorization = 'Bearer ' + key;
    const response = await fetch(base + '/api/social/' + path, { method, headers, body: body && JSON.stringify(body) });
    assert.equal(response.status, status);
    return response.json();
  };
  const save = (key, name, score, status = 200) => request('me', { method: 'PUT', key, body: { name, stats: score }, status });
  const aliceKey = token(), bobKey = token(), claraKey = token();
  const alice = await save(aliceKey, 'Šimša67', stats(32));
  const bob = await save(bobKey, 'Peli23', stats(55));
  const clara = await save(claraKey, 'Jenda', stats(55));
  assert.equal((await save(aliceKey, 'Šimša67', stats(32))).id, alice.id);
  const duplicate = await save(token(), 'šimša67', stats(50), 409);
  assert.equal(duplicate.error, 'name_taken');
  assert.equal((await save(token(), '<b>ahoj</b>', stats(10), 400)).error, 'invalid_name');
  assert.equal((await save(token(), 'Platný', stats(-1), 400)).error, 'invalid_stats');
  await save(undefined, 'Bez přístupu', stats(4), 401);

  let leaderboard = await request('leaderboard');
  assert.deepEqual(leaderboard.players.map((p) => [p.id, p.place]), [[clara.id, 1], [bob.id, 1], [alice.id, 3]]);
  assert.deepEqual(Object.keys(leaderboard.players[0]), ['id', 'name', 'trophies', 'place']);
  const search = await request('leaderboard?search=' + encodeURIComponent('ŠIMŠ'));
  assert.equal(search.players[0].id, alice.id);
  assert.equal(search.players[0].place, 3);

  const bobFriend = 'friends/' + bob.id;
  await request('friends', { status: 401 });
  await request('friends/' + alice.id, { method: 'PUT', key: aliceKey, status: 400 });
  await request(bobFriend, { method: 'PUT', key: aliceKey });
  await request(bobFriend, { method: 'PUT', key: aliceKey });
  assert.deepEqual((await request('friends', { key: aliceKey })).players.map((p) => p.id), [bob.id]);
  assert.deepEqual((await request('friends', { key: bobKey })).players, []);
  const details = await request('players/' + bob.id, { key: aliceKey });
  assert.equal(details.goals, 17);
  assert.equal(details.isFriend, true);
  assert.equal((await request('players/' + bob.id)).isFriend, false);
  assert.equal((await save(bobKey, 'Peli', stats(55))).id, bob.id);

  await save(aliceKey, undefined, stats(64, 9));
  await save(aliceKey, undefined, stats(32, 8));
  assert.equal((await request('leaderboard')).players[0].name, 'Šimša67');
  // Prohra může počet pohárků snížit. Počet zápasů zůstává pořadovým číslem aktualizace.
  await save(aliceKey, undefined, stats(30, 10));
  assert.equal((await request('players/' + alice.id)).trophies, 30);

  await new Promise((resolve) => server.close(resolve));
  await start();
  assert.equal((await request('friends', { key: aliceKey })).players[0].name, 'Peli');
  await request(bobFriend, { method: 'DELETE', key: aliceKey });
  assert.deepEqual((await request('friends', { key: aliceKey })).players, []);

  for (let i = 0; i < 19; i++) await save(token(), 'Hráč' + i, stats(i));
  leaderboard = await request('leaderboard');
  assert.equal(leaderboard.players.length, 20);
  assert.equal(leaderboard.next, 20);
  const rest = await request('leaderboard?offset=' + leaderboard.next);
  assert.equal(rest.previous, 0);
  assert.equal(rest.next, null);
  assert.equal(rest.players.length, 2);

  const preflight = await fetch(base + '/api/social/me', {
    method: 'OPTIONS', headers: { Origin: webOrigin, 'Access-Control-Request-Method': 'PUT' },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), webOrigin);
  assert.equal((await fetch(base + '/.fifa67/players.sqlite')).status, 404);
});
