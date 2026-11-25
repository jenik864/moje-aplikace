'use strict';
/*
 * Online hra: každý hráč na svém telefonu.
 *
 * Hostitel (kdo hru založí) počítá celý zápas a rozesílá jeho stav,
 * ostatní posílají jen své ovládání. Komunikace stojí na „presence“:
 * každý účastník má jeden objekt se svým stavem, který vidí ostatní.
 *
 * Přenos podle toho, kde hra běží:
 *  - na claude.ai: schopnost artifactu `room` (kamarádi musí být přihlášení
 *    a mít k artifactu přístup),
 *  - jinde (např. GitHub Pages): PeerJS (WebRTC) přes veřejný server PeerJS,
 *  - testy: BroadcastChannel mezi panely jednoho prohlížeče.
 */

const NET_V = 2;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PEERJS_SRC = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';

function makeCode() {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}
function cleanCode(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
}
function cleanName(s) {
  // bez řídicích a neviditelných znaků
  return String(s || '').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f]/g, '').trim().slice(0, 12);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('script'));
    document.head.appendChild(s);
  });
}

/* ---------- přenos přes schopnost artifactu `room` ---------- */

async function openRoomTransport(room, code) {
  const r = await room.join('hlv-' + code.toLowerCase());
  const subs = new Set();
  const list = () => r.peers().map((p) => ({ peer: p.peer, presence: p.presence || {}, isMe: !!(p.isMe && p.sameTab) }));
  const unsub = r.onPeers(() => {
    const l = list();
    subs.forEach((fn) => fn(l));
  }, () => {});
  return {
    kind: 'room',
    peers: list,
    onPeers(fn) { subs.add(fn); return () => subs.delete(fn); },
    setPresence(patch) { r.presence(patch).catch(() => {}); },
    connected: () => r.connected(),
    close() {
      unsub();
      r.leave().catch(() => {});
    },
  };
}

/* ---------- přenos přes PeerJS (WebRTC) ---------- */

async function openPeerTransport(code, asHost) {
  if (!window.Peer) await loadScript(PEERJS_SRC);
  const hostId = 'hlavouni-' + code.toLowerCase();
  const peer = asHost ? new window.Peer(hostId) : new window.Peer();
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 12000);
    peer.on('open', () => { clearTimeout(t); resolve(); });
    peer.on('error', (e) => { clearTimeout(t); reject(e); });
  });
  const mine = {};
  const others = new Map();
  const conns = new Map();
  const subs = new Set();
  const list = () => [{ peer: peer.id, presence: mine, isMe: true }]
    .concat([...others].map(([id, presence]) => ({ peer: id, presence, isMe: false })));
  const notify = () => {
    const l = list();
    subs.forEach((fn) => fn(l));
  };
  let timer = 0;
  const flush = () => {
    timer = 0;
    const msg = { t: 'p', p: mine };
    for (const c of conns.values()) {
      if (c.open) {
        try { c.send(msg); } catch (e) { /* spojení se zavírá */ }
      }
    }
  };
  const attach = (c) => {
    conns.set(c.peer, c);
    c.on('open', () => {
      try { c.send({ t: 'p', p: mine }); } catch (e) { /* nevadí */ }
    });
    c.on('data', (d) => {
      if (d && d.t === 'p' && d.p && typeof d.p === 'object') {
        others.set(c.peer, d.p);
        notify();
      }
    });
    const gone = () => {
      conns.delete(c.peer);
      if (others.delete(c.peer)) notify();
    };
    c.on('close', gone);
    c.on('error', gone);
  };
  if (asHost) {
    peer.on('connection', attach);
  } else {
    const c = peer.connect(hostId, { serialization: 'json' });
    attach(c);
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('notfound')), 10000);
      c.on('open', () => { clearTimeout(t); resolve(); });
      peer.on('error', (e) => { clearTimeout(t); reject(e); });
    });
  }
  return {
    kind: 'peer',
    peers: list,
    onPeers(fn) { subs.add(fn); return () => subs.delete(fn); },
    setPresence(patch) {
      for (const k in patch) {
        if (patch[k] === null) delete mine[k];
        else mine[k] = patch[k];
      }
      if (!timer) timer = setTimeout(flush, 33);
    },
    connected: () => !peer.disconnected,
    close() {
      for (const c of conns.values()) {
        try { c.close(); } catch (e) { /* nevadí */ }
      }
      peer.destroy();
    },
  };
}

/* ---------- přenos přes BroadcastChannel (testy v jednom prohlížeči) ---------- */

function openBroadcastTransport(code) {
  const ch = new BroadcastChannel('hlavouni-' + code);
  const me = 'bc-' + randomId(6);
  const mine = {};
  const others = new Map(); // id -> { p, seen }
  const subs = new Set();
  const list = () => [{ peer: me, presence: mine, isMe: true }]
    .concat([...others].map(([id, o]) => ({ peer: id, presence: o.p, isMe: false })));
  const notify = () => {
    const l = list();
    subs.forEach((fn) => fn(l));
  };
  let timer = 0;
  const send = () => {
    timer = 0;
    ch.postMessage({ id: me, p: mine });
  };
  ch.onmessage = (e) => {
    const d = e.data;
    if (!d || d.id === me) return;
    if (d.bye) {
      if (others.delete(d.id)) notify();
      return;
    }
    const known = others.has(d.id);
    others.set(d.id, { p: d.p, seen: Date.now() });
    if (!known) send();
    notify();
  };
  const beat = setInterval(() => {
    send();
    const now = Date.now();
    let changed = false;
    for (const [id, o] of others) {
      if (now - o.seen > 2500) {
        others.delete(id);
        changed = true;
      }
    }
    if (changed) notify();
  }, 500);
  send();
  return {
    kind: 'bc',
    peers: list,
    onPeers(fn) { subs.add(fn); return () => subs.delete(fn); },
    setPresence(patch) {
      for (const k in patch) {
        if (patch[k] === null) delete mine[k];
        else mine[k] = patch[k];
      }
      if (!timer) timer = setTimeout(send, 33);
    },
    connected: () => true,
    close() {
      clearInterval(beat);
      ch.postMessage({ id: me, bye: true });
      ch.close();
    },
  };
}

/* ---------- výběr přenosu ---------- */

const Net = {
  kind: undefined, // undefined = ještě nezjištěno, null = online nejde
  room: null,

  async detect() {
    if (this.kind !== undefined) return this.kind;
    if (window.HLAVOUNI_NET === 'bc' && 'BroadcastChannel' in window) {
      this.kind = 'bc';
    } else if (window.claude && typeof window.claude.use === 'function') {
      let room = null;
      try { room = await window.claude.use('room'); } catch (e) { room = null; }
      this.room = room;
      this.kind = room ? 'room' : null;
    } else {
      this.kind = 'RTCPeerConnection' in window ? 'peer' : null;
    }
    return this.kind;
  },

  async open(code, asHost) {
    const kind = await this.detect();
    if (kind === 'room') return openRoomTransport(this.room, code);
    if (kind === 'peer') return openPeerTransport(code, asHost);
    if (kind === 'bc') return openBroadcastTransport(code);
    throw new Error('unavailable');
  },
};

/*
 * Online relace. Hostitel drží lobby a během zápasu rozesílá stav,
 * hosté posílají své jméno, výběr hráče a ovládání.
 */
const Online = {
  t: null,
  role: null,      // 'host' | 'guest'
  code: '',
  uid: '',         // vlastní id v této hře ('host' u hostitele)
  name: '',
  unsub: null,
  tick: 0,
  // hostitel
  guests: new Map(), // uid -> { uid, name, wantN, in, kick, seen }
  // host
  hostP: null,
  hostSeen: 0,
  wantN: 0,
  kickSeq: 0,
  lastIn: '',
  // zpětná volání do hry
  onLobby: null,      // (lobby) – hostitel i host
  onHost: null,       // (hostPresence) – host
  onGuestGone: null,  // (uid) – hostitel
  onGuestUpdate: null, // (guest, want) – hostitel
  onHostGone: null,   // () – host

  get active() {
    return !!this.t;
  },

  async create(name) {
    this.name = cleanName(name);
    let lastErr = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = makeCode();
      try {
        this.t = await Net.open(code, true);
        this.code = code;
        break;
      } catch (e) {
        lastErr = e;
        if (!(e && e.type === 'unavailable-id')) break;
      }
    }
    if (!this.t) throw lastErr || new Error('unavailable');
    this.role = 'host';
    this.uid = 'host';
    this.guests.clear();
    this.unsub = this.t.onPeers((l) => this.hostPeers(l));
    this.startTick();
  },

  async join(code, name) {
    this.name = cleanName(name);
    this.code = cleanCode(code);
    this.t = await Net.open(this.code, false);
    this.role = 'guest';
    this.uid = 'g' + randomId(7);
    this.hostP = null;
    this.wantN = 0;
    this.kickSeq = 0;
    this.lastIn = '';
    this.unsub = this.t.onPeers((l) => this.guestPeers(l));
    this.t.setPresence({ v: NET_V, role: 'guest', uid: this.uid, name: this.name, want: null, in: null });
    // počkat na hostitele
    const t0 = Date.now();
    while (!this.hostP) {
      if (Date.now() - t0 > 8000) {
        this.leave();
        throw new Error('notfound');
      }
      this.guestPeers(this.t.peers());
      await new Promise((r) => setTimeout(r, 150));
    }
    this.hostSeen = Date.now();
    this.startTick();
  },

  leave() {
    if (this.tick) clearInterval(this.tick);
    this.tick = 0;
    if (this.unsub) this.unsub();
    this.unsub = null;
    const t = this.t;
    if (t) {
      // hostitel dá ostatním vědět, že hra končí, a chvíli počká, než se to rozešle
      try {
        if (this.role === 'host') t.setPresence({ phase: 'closed', lobby: null, g: null, setup: null });
        else t.setPresence({ role: null, in: null, want: null });
      } catch (e) { /* nevadí */ }
      setTimeout(() => t.close(), 400);
    }
    this.t = null;
    this.role = null;
    this.hostP = null;
    this.guests.clear();
  },

  startTick() {
    if (this.tick) clearInterval(this.tick);
    this.tick = setInterval(() => {
      const now = Date.now();
      if (this.role === 'host') {
        for (const [uid, g] of this.guests) {
          if (now - g.seen > 4000) {
            this.guests.delete(uid);
            if (this.onGuestGone) this.onGuestGone(uid);
          }
        }
      } else if (this.role === 'guest') {
        if (this.t) this.guestPeers(this.t.peers());
        if (now - this.hostSeen > 5000 && this.onHostGone) this.onHostGone();
      }
    }, 1000);
  },

  /* ---- hostitel ---- */

  hostPeers(list) {
    const now = Date.now();
    for (const p of list) {
      if (p.isMe) continue;
      const pr = p.presence;
      if (!pr || pr.v !== NET_V || pr.role !== 'guest' || typeof pr.uid !== 'string') continue;
      const uid = pr.uid.slice(0, 16);
      let g = this.guests.get(uid);
      const isNew = !g;
      if (!g) {
        g = { uid, name: '', wantN: 0, in: null, kick: pr.in && Number(pr.in.k) || 0, seen: now };
        this.guests.set(uid, g);
      }
      g.seen = now;
      const name = cleanName(pr.name);
      const renamed = name !== g.name;
      g.name = name;
      g.in = pr.in && typeof pr.in === 'object' ? pr.in : null;
      let wanted = false;
      if (pr.want && typeof pr.want === 'object' && Number(pr.want.n) > g.wantN) {
        g.wantN = Number(pr.want.n);
        wanted = true;
      }
      if ((isNew || renamed || wanted) && this.onGuestUpdate) this.onGuestUpdate(g, wanted ? pr.want : null);
    }
  },

  // Ovládání kamaráda pro fyziku na hostiteli.
  remoteIntent(uid) {
    const o = this._intent || (this._intent = { left: false, right: false, jump: false, kick: false, move: 0 });
    const g = this.guests.get(uid);
    const i = g && g.in;
    o.move = i ? clamp(Number(i.m) || 0, -1, 1) : 0;
    o.left = o.move < 0;
    o.right = o.move > 0;
    o.jump = !!(i && i.j);
    const k = i ? Number(i.k) || 0 : 0;
    o.kick = !!g && k > g.kick;
    if (g && k > g.kick) g.kick = k;
    return o;
  },

  members() {
    const out = [{ uid: 'host', name: this.name }];
    for (const g of this.guests.values()) out.push({ uid: g.uid, name: g.name });
    return out;
  },

  publish(patch) {
    if (this.t) this.t.setPresence(Object.assign({ v: NET_V, role: this.role, uid: this.uid, name: this.name }, patch));
  },

  /* ---- host ---- */

  guestPeers(list) {
    const host = list.find((p) => !p.isMe && p.presence && p.presence.v === NET_V && p.presence.role === 'host');
    if (!host) return;
    this.hostSeen = Date.now();
    if (host.presence === this.hostP) return;
    this.hostP = host.presence;
    if (this.onHost) this.onHost(host.presence);
  },

  want(slot, char) {
    this.wantN++;
    this.publish({ want: { slot, char: char || null, n: this.wantN } });
  },

  // Poslat vlastní ovládání hostiteli (jen když se změní).
  sendInput(it) {
    if (it.kick) this.kickSeq++;
    const m = Math.round(clamp(it.move || 0, -1, 1) * 4) / 4;
    const j = it.jump ? 1 : 0;
    const key = m + ':' + j + ':' + this.kickSeq;
    if (key === this.lastIn) return;
    this.lastIn = key;
    this.publish({ in: { m, j, k: this.kickSeq } });
  },
};
