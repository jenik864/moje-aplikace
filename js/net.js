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
 *  - jinde (např. GitHub Pages): přímé spojení PeerJS (WebRTC); když nejde
 *    (mobilní data, přísné NAT), záložní přenos přes veřejný MQTT server
 *    (WebSocket), který projde téměř každou sítí,
 *  - testy: BroadcastChannel mezi panely jednoho prohlížeče.
 */

const NET_V = 2;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PEERJS_SRC = 'js/vendor/peerjs.min.js'; // PeerJS 1.5.4 (MIT), přibalené ke hře
// Servery pro navázání přímého spojení (STUN) a přeposílání, když přímé nejde (TURN).
const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' },
  { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' },
];
// Záložní přenos: veřejné MQTT servery přes WebSocket (zkouší se postupně).
const RELAY_URLS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
const RELAY_NS = 'fifa67/v2/';

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
  // window.HLAVOUNI_PEER umožní testům použít vlastní server PeerJS
  const opts = Object.assign({ debug: 0, config: { iceServers: ICE_SERVERS } }, window.HLAVOUNI_PEER || {});
  const peer = asHost ? new window.Peer(hostId, opts) : new window.Peer(opts);
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      try { peer.destroy(); } catch (e) { /* nevadí */ }
      reject(new Error('timeout'));
    }, 9000);
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
    const c = peer.connect(hostId, { serialization: 'json', reliable: true });
    attach(c);
    try {
      await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('notfound')), 7000);
        c.on('open', () => { clearTimeout(t); resolve(); });
        peer.on('error', (e) => { clearTimeout(t); reject(e); });
      });
    } catch (e) {
      try { peer.destroy(); } catch (err) { /* nevadí */ }
      throw e;
    }
  }
  // Ozvat se každou sekundu, i když se nic nemění: hostitel podle toho pozná,
  // že kamarád je pořád připojený (jinak by ho po pár sekundách nahradil počítač).
  const beat = setInterval(() => {
    if (!timer) flush();
  }, 1000);
  return {
    kind: 'peer',
    peers: list,
    onPeers(fn) { subs.add(fn); return () => subs.delete(fn); },
    setPresence(patch) {
      for (const k in patch) {
        if (patch[k] === null) delete mine[k];
        else mine[k] = patch[k];
      }
      // ovládání odeslat hned, ostatní stav nejvýš 30× za sekundu
      if (patch.in !== undefined) {
        clearTimeout(timer);
        flush();
      } else if (!timer) {
        timer = setTimeout(flush, 25); // přímé spojení: 40 snímků za sekundu
      }
    },
    connected: () => !peer.disconnected,
    close() {
      clearInterval(beat);
      for (const c of conns.values()) {
        try { c.close(); } catch (e) { /* nevadí */ }
      }
      peer.destroy();
    },
  };
}

/* ---------- záložní přenos přes MQTT (WebSocket) ---------- */

// Minimální klient MQTT 3.1.1: připojení, odběr a zprávy bez potvrzování (QoS 0).
function mqttConnect(url, clientId, onMessage) {
  return new Promise((resolve, reject) => {
    let ws;
    try {
      ws = new WebSocket(url, 'mqtt');
    } catch (e) {
      reject(e);
      return;
    }
    ws.binaryType = 'arraybuffer';
    const enc = new TextEncoder(), dec = new TextDecoder();
    const str = (s) => {
      const b = enc.encode(s);
      return [b.length >> 8, b.length & 255, ...b];
    };
    const packet = (head, body) => {
      const len = [];
      let n = body.length;
      do {
        let d = n % 128;
        n = Math.floor(n / 128);
        if (n > 0) d |= 128;
        len.push(d);
      } while (n > 0);
      const out = new Uint8Array(1 + len.length + body.length);
      out[0] = head;
      out.set(len, 1);
      out.set(body, 1 + len.length);
      return out;
    };
    const send = (p) => {
      if (ws.readyState === 1) ws.send(p);
    };
    let buf = new Uint8Array(0), pid = 1, ping = 0, done = false;
    const fail = (e) => {
      if (done) return;
      done = true;
      clearTimeout(to);
      try { ws.close(); } catch (err) { /* nevadí */ }
      reject(e);
    };
    const to = setTimeout(() => fail(new Error('timeout')), 6000);
    const api = {
      publish(topic, text) {
        const t = str(topic), p = enc.encode(text);
        const body = new Uint8Array(t.length + p.length);
        body.set(t, 0);
        body.set(p, t.length);
        send(packet(0x30, body));
      },
      subscribe(topic) {
        const id = pid++;
        send(packet(0x82, Uint8Array.from([id >> 8, id & 255, ...str(topic), 0])));
      },
      close() {
        clearInterval(ping);
        send(Uint8Array.from([0xe0, 0]));
        try { ws.close(); } catch (e) { /* nevadí */ }
      },
      onClose: null,
    };
    ws.onopen = () => {
      const body = [...str('MQTT'), 4, 0x02, 0, 30, ...str(clientId)];
      send(packet(0x10, Uint8Array.from(body)));
    };
    ws.onerror = () => fail(new Error('network'));
    ws.onclose = () => {
      clearInterval(ping);
      if (!done) fail(new Error('network'));
      else if (api.onClose) api.onClose();
    };
    ws.onmessage = (ev) => {
      const chunk = new Uint8Array(ev.data);
      const all = new Uint8Array(buf.length + chunk.length);
      all.set(buf, 0);
      all.set(chunk, buf.length);
      buf = all;
      for (;;) {
        if (buf.length < 2) return;
        let len = 0, mul = 1, i = 1, d;
        do {
          if (i >= buf.length) return;
          d = buf[i++];
          len += (d & 127) * mul;
          mul *= 128;
        } while (d & 128);
        if (buf.length < i + len) return;
        const head = buf[0], type = head >> 4, body = buf.slice(i, i + len);
        buf = buf.slice(i + len);
        if (type === 2) {
          // CONNACK
          if (body[1] !== 0) {
            fail(new Error('refused'));
            return;
          }
          done = true;
          clearTimeout(to);
          ping = setInterval(() => send(Uint8Array.from([0xc0, 0])), 20000);
          resolve(api);
        } else if (type === 3) {
          // PUBLISH (QoS 0)
          const tl = (body[0] << 8) | body[1];
          const topic = dec.decode(body.subarray(2, 2 + tl));
          const qos = (head >> 1) & 3;
          const off = 2 + tl + (qos ? 2 : 0);
          onMessage(topic, dec.decode(body.subarray(off)));
        }
      }
    };
  });
}

// Presence přes MQTT: každý účastník posílá svůj stav na vlastní téma, odebírá všechna.
// `lazy` (hostitel): plnou rychlostí posílá, jen když přes tenhle přenos někdo je.
async function openRelayTransport(code, asHost) {
  const me = (asHost ? 'h' : 'g') + randomId(10);
  const base = RELAY_NS + code.toLowerCase() + '/';
  const mine = {};
  const others = new Map(); // id -> { p, seen }
  const subs = new Set();
  const list = () => [{ peer: me, presence: mine, isMe: true }]
    .concat([...others].map(([id, o]) => ({ peer: id, presence: o.p, isMe: false })));
  const notify = () => {
    const l = list();
    subs.forEach((fn) => fn(l));
  };
  const onMsg = (topic, text) => {
    let d;
    try { d = JSON.parse(text); } catch (e) { return; }
    if (!d || typeof d.id !== 'string' || d.id === me) return;
    if (d.bye) {
      if (others.delete(d.id)) notify();
      return;
    }
    if (!d.p || typeof d.p !== 'object') return;
    const known = others.has(d.id);
    others.set(d.id, { p: d.p, seen: Date.now() });
    if (!known) send();
    notify();
  };
  const urls = window.HLAVOUNI_RELAY || RELAY_URLS;
  let client = null, lastErr = null;
  for (const url of urls) {
    try {
      client = await mqttConnect(url, 'f67' + randomId(12), onMsg);
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!client) throw lastErr || new Error('network');
  client.subscribe(base + '+');
  let alive = true;
  client.onClose = () => {
    alive = false;
  };
  const send = () => {
    timer = 0;
    if (alive) client.publish(base + me, JSON.stringify({ id: me, p: mine }));
  };
  let timer = 0;
  const beat = setInterval(() => {
    send();
    const now = Date.now();
    let changed = false;
    for (const [id, o] of others) {
      if (now - o.seen > 4500) {
        others.delete(id);
        changed = true;
      }
    }
    if (changed) notify();
  }, 1000);
  return {
    kind: 'relay',
    peers: list,
    count: () => others.size,
    onPeers(fn) { subs.add(fn); return () => subs.delete(fn); },
    setPresence(patch) {
      for (const k in patch) {
        if (patch[k] === null) delete mine[k];
        else mine[k] = patch[k];
      }
      // hostitel bez nikoho na záložním přenosu posílá jen jednou za sekundu
      if (asHost && !others.size) return;
      if (patch.in !== undefined) {
        clearTimeout(timer);
        send();
      } else if (!timer) {
        timer = setTimeout(send, 33);
      }
    },
    connected: () => alive,
    close() {
      clearInterval(beat);
      if (alive) client.publish(base + me, JSON.stringify({ id: me, bye: 1 }));
      setTimeout(() => client.close(), 150);
    },
  };
}

// Hostitel naslouchá na více přenosech zároveň (další se mohou přidat později).
function combineTransports(first) {
  const ts = [first];
  const subs = new Set();
  const state = {}; // celý vlastní stav, aby ho dostal i později přidaný přenos
  let closed = false;
  const list = () => {
    const out = [];
    let me = false;
    for (const t of ts) {
      for (const p of t.peers()) {
        if (p.isMe) {
          if (me) continue;
          me = true;
        }
        out.push(p);
      }
    }
    return out;
  };
  const notify = () => {
    const l = list();
    subs.forEach((fn) => fn(l));
  };
  first.onPeers(notify);
  return {
    get kind() {
      return ts.map((t) => t.kind).join('+');
    },
    peers: list,
    onPeers(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    setPresence(patch) {
      for (const k in patch) {
        if (patch[k] === null) delete state[k];
        else state[k] = patch[k];
      }
      ts.forEach((t) => t.setPresence(patch));
    },
    add(t) {
      if (closed) {
        t.close();
        return;
      }
      ts.push(t);
      t.setPresence(Object.assign({}, state));
      t.onPeers(notify);
    },
    connected: () => ts.some((t) => t.connected()),
    close() {
      closed = true;
      ts.forEach((t) => t.close());
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
  // window.HLAVOUNI_LAG: umělé zpoždění sítě pro testy (ms)
  const lag = Number(window.HLAVOUNI_LAG) || 0, jit = Number(window.HLAVOUNI_JITTER) || 0;
  ch.onmessage = (e) => (lag || jit ? setTimeout(() => recv(e), lag + Math.random() * jit) : recv(e));
  const recv = (e) => {
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
    if (kind === 'peer') {
      if (asHost) {
        // hostitel: přímé spojení (rezervuje kód hry) + záložní přenos
        const relayP = openRelayTransport(code, true).catch(() => null);
        let peerT = null;
        try {
          peerT = await openPeerTransport(code, true);
        } catch (e) {
          if (e && e.type === 'unavailable-id') {
            relayP.then((t) => t && t.close());
            throw e;
          }
        }
        if (peerT) {
          // záložní přenos se přidá, až bude připravený
          const hub = combineTransports(peerT);
          relayP.then((t) => t && hub.add(t));
          return hub;
        }
        const relayT = await relayP;
        if (!relayT) throw new Error('network');
        return combineTransports(relayT);
      }
      // kamarád: nejdřív přímé spojení, když nevyjde, záložní přenos
      try {
        return await openPeerTransport(code, false);
      } catch (e) {
        if (this.onFallback) this.onFallback();
        return openRelayTransport(code, false);
      }
    }
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
  ready: false,
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
    this.ready = false;
    this.kickSeq = 0;
    this.superSeq = 0;
    this.lastIn = '';
    this.unsub = this.t.onPeers((l) => this.guestPeers(l));
    this.t.setPresence({ v: NET_V, role: 'guest', uid: this.uid, name: this.name, want: null, in: null, ready: false, skins: mySkins() });
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
          if (now - g.seen > 6000) {
            this.guests.delete(uid);
            if (this.onGuestGone) this.onGuestGone(uid);
          }
        }
      } else if (this.role === 'guest') {
        if (this.t) this.guestPeers(this.t.peers());
        if (now - this.hostSeen > 8000 && this.onHostGone) this.onHostGone();
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
        g = { uid, name: '', wantN: 0, in: null, ready: false, kick: pr.in && Number(pr.in.k) || 0, sup: pr.in && Number(pr.in.s) || 0, seen: now };
        this.guests.set(uid, g);
      }
      g.seen = now;
      const name = cleanName(pr.name);
      const skins = cleanSkins(pr.skins);
      const renamed = name !== g.name || !!pr.ready !== g.ready || JSON.stringify(skins) !== JSON.stringify(g.skins || {});
      g.skins = skins;
      g.name = name;
      g.ready = !!pr.ready;
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
    const o = this._intent || (this._intent = { left: false, right: false, jump: false, kick: false, super: false, move: 0 });
    const g = this.guests.get(uid);
    const i = g && g.in;
    o.move = i ? clamp(Number(i.m) || 0, -1, 1) : 0;
    o.left = o.move < 0;
    o.right = o.move > 0;
    o.jump = !!(i && i.j);
    o.down = !!(i && i.d);
    const k = i ? Number(i.k) || 0 : 0;
    o.kick = !!g && k > g.kick;
    if (g && k > g.kick) g.kick = k;
    const sp = i ? Number(i.s) || 0 : 0;
    o.super = !!g && sp > g.sup;
    if (g && sp > g.sup) g.sup = sp;
    o.my = i ? clamp(Number(i.y) || 0, -1, 1) : 0;
    o.au = i && typeof i.a === 'number' ? clamp(i.a / 1000, -1.5, 1.5) : undefined;
    o.av = i && typeof i.b === 'number' ? clamp(i.b / 1000, -0.2, 1.5) : undefined;
    return o;
  },

  members() {
    const out = [{ uid: 'host', name: this.name, ready: true }];
    for (const g of this.guests.values()) out.push({ uid: g.uid, name: g.name, ready: g.ready, skins: g.skins || {} });
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

  setReady(v) {
    this.ready = !!v;
    this.publish({ ready: this.ready });
  },

  want(slot, char) {
    this.wantN++;
    this.publish({ want: { slot, char: char || null, n: this.wantN } });
  },

  // Poslat vlastní ovládání hostiteli (jen když se změní).
  sendInput(it, aim) {
    if (it.kick) this.kickSeq++;
    if (it.super) this.superSeq = (this.superSeq || 0) + 1;
    const m = Math.round(clamp(it.move || 0, -1, 1) * 4) / 4;
    const j = it.jump ? 1 : 0;
    const dn = it.down ? 1 : 0;
    const y = Math.round(clamp(it.my || 0, -1, 1) * 4) / 4;
    const sp = this.superSeq || 0;
    const key = m + ':' + j + ':' + dn + ':' + y + ':' + this.kickSeq + ':' + sp;
    if (key === this.lastIn) return;
    this.lastIn = key;
    const msg = { m, j, d: dn, y, k: this.kickSeq, s: sp };
    if (aim && typeof aim.u === 'number') {
      msg.a = Math.round(clamp(aim.u, -1.5, 1.5) * 1000);
      msg.b = Math.round(clamp(aim.v, -0.2, 1.5) * 1000);
    }
    this.publish({ in: msg });
  },
};
