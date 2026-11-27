'use strict';

/*
 * Účet s heslem: přezdívka + heslo, postup se synchronizuje mezi zařízeními.
 *
 * Hra nemá vlastní server – uložená hra se šifruje heslem (PBKDF2 + AES-GCM přímo
 * v prohlížeči) a ukládá jako uložená zpráva na veřejných MQTT serverech
 * (stejných jako online hra a žebříček): fifa67/ucty/v1/<otisk přezdívky>.
 * Heslo ani uložená hra se nikam neposílají čitelně; špatné heslo nejde rozšifrovat.
 */

const ACC_TOPIC = 'fifa67/ucty/v1/';
const ACC_KEY = 'hlavouni.ucet';
const ACC_ITER = 150000;
const ACC_MIN_PASS = 8; // kratší heslo jde u zašifrované uložené hry uhodnout hrubou silou
// co se synchronizuje (všechen postup hráče)
const ACC_SYNC = ['hlavouni.profil', 'hlavouni.odemceno', 'hlavouni.pribeh', 'hlavouni.tocna', 'hlavouni.kampan', 'hlavouni.ukoly', 'hlavouni.vietnam', 'hlavouni.pratele', 'hlavouni.postavy', 'hlavouni.hracId'];

const b64 = (u8) => {
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s);
};
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const normNick = (n) => cleanName(n).normalize('NFC').toLowerCase();

const Account = {
  state: null, // { nick, id, key (base64), salt (base64), last (čas poslední synchronizace), hash }
  busy: false,
  dirtyT: 0,

  load() {
    try {
      const o = JSON.parse(localStorage.getItem(ACC_KEY));
      this.state = o && o.nick && o.key && o.id ? o : null;
    } catch (e) {
      this.state = null;
    }
    return this.state;
  },
  saveState() {
    try {
      if (this.state) localStorage.setItem(ACC_KEY, JSON.stringify(this.state));
      else localStorage.removeItem(ACC_KEY);
    } catch (e) { /* nevadí */ }
  },
  get logged() {
    return !!this.state;
  },
  supported() {
    return !!(window.crypto && crypto.subtle && window.TextEncoder);
  },

  /* ---------- šifrování ---------- */

  async idOf(nick) {
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('fifa67:' + normNick(nick))));
    return Array.from(h.slice(0, 16), (x) => x.toString(16).padStart(2, '0')).join('');
  },
  async derive(pass, salt) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ACC_ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  },
  async keyFromState() {
    return crypto.subtle.importKey('raw', unb64(this.state.key), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  },
  async seal(key, salt, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj))));
    return JSON.stringify({ v: 1, salt: b64(salt), iter: ACC_ITER, iv: b64(iv), data: b64(data), ts: obj.ts });
  },
  async open(key, rec) {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(rec.iv) }, key, unb64(rec.data));
    return JSON.parse(new TextDecoder().decode(plain));
  },

  /* ---------- servery ---------- */

  urls() {
    return window.HLAVOUNI_RELAY || RELAY_URLS;
  },
  // Stáhnout uložený účet (nejnovější ze všech serverů, nebo null).
  fetch(id) {
    let best = null;
    const take = (topic, text) => {
      if (topic !== ACC_TOPIC + id) return;
      try {
        const r = JSON.parse(text);
        if (r && r.v === 1 && r.salt && r.iv && r.data && (!best || (r.ts || 0) > (best.ts || 0))) best = r;
      } catch (e) { /* nevadí */ }
    };
    return Promise.allSettled(this.urls().map((u) => mqttConnect(u, 'f67a' + randomId(8), take).then((c) => {
      c.subscribe(ACC_TOPIC + id);
      return new Promise((res) => setTimeout(() => { c.close(); res(); }, 2400));
    }))).then((r) => {
      if (!r.some((x) => x.status === 'fulfilled')) throw new Error('offline');
      return best;
    });
  },
  put(id, text) {
    return Promise.allSettled(this.urls().map((u) => mqttConnect(u, 'f67s' + randomId(8), () => {}).then((c) => {
      c.publish(ACC_TOPIC + id, text, true);
      setTimeout(() => c.close(), 1200);
    }))).then((r) => {
      if (!r.some((x) => x.status === 'fulfilled')) throw new Error('offline');
    });
  },

  /* ---------- uložená hra ---------- */

  snapshot() {
    const keys = {};
    for (const k of ACC_SYNC) {
      try {
        const v = localStorage.getItem(k);
        if (v !== null) keys[k] = v;
      } catch (e) { /* nevadí */ }
    }
    return keys;
  },
  hashOf(keys) {
    return codeHash(JSON.stringify(keys));
  },
  // Sloučit postup z jiného zařízení: odemčené věci a počty se sčítají (bere se lepší),
  // poháry a nastavení z novějšího uložení.
  merge(local, remote, remoteNewer) {
    const J = (s, d) => { try { const o = JSON.parse(s); return o === null || o === undefined ? d : o; } catch (e) { return d; } };
    const out = Object.assign({}, local);
    const newer = remoteNewer ? remote : local, older = remoteNewer ? local : remote;
    for (const k of ACC_SYNC) {
      if (!(k in remote)) continue;
      if (!(k in local)) {
        out[k] = remote[k];
        continue;
      }
      const a = J(newer[k], null), b = J(older[k], null);
      let v;
      if (k === 'hlavouni.profil') {
        v = Object.assign({}, b || {}, a || {});
        for (const f of ['played', 'wins', 'goals', 'supers', 'knocks', 'bestStreak', 'cups']) v[f] = Math.max(Number((a || {})[f]) || 0, Number((b || {})[f]) || 0);
      } else if (k === 'hlavouni.odemceno') {
        v = Object.assign({}, b || {});
        for (const f in v) if (f.startsWith('on.')) delete v[f]; // zapnuté skiny podle novějšího
        Object.assign(v, a || {});
      } else if (k === 'hlavouni.pribeh' || k === 'hlavouni.tocna') {
        v = Object.assign({}, b || {}, a || {});
        v.done = Math.max(Number((a || {}).done) || 0, Number((b || {}).done) || 0);
      } else if (k === 'hlavouni.ukoly' || k === 'hlavouni.postavy') {
        v = Object.assign({}, b || {});
        for (const f in a || {}) v[f] = Math.max(Number(a[f]) || 0, Number(v[f]) || 0);
      } else if (k === 'hlavouni.vietnam') {
        v = Math.max(Number(a) || 0, Number(b) || 0);
      } else if (k === 'hlavouni.pratele') {
        v = [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])])];
      } else if (k === 'hlavouni.hracId') {
        out[k] = remote[k]; // stejné id v žebříčku na všech zařízeních
        continue;
      } else {
        out[k] = newer[k];
        continue;
      }
      out[k] = JSON.stringify(v);
    }
    return out;
  },
  apply(keys) {
    for (const k of ACC_SYNC) {
      if (!(k in keys)) continue;
      try { localStorage.setItem(k, keys[k]); } catch (e) { /* nevadí */ }
    }
  },

  /* ---------- přihlášení ---------- */

  // Vytvořit účet: přezdívka nesmí být obsazená, nahraje se postup z tohoto zařízení.
  async register(nick, pass) {
    nick = cleanName(nick);
    if (!nick) throw new Error('nick');
    if (String(pass || '').length < ACC_MIN_PASS) throw new Error('short');
    const id = await this.idOf(nick);
    const old = await this.fetch(id);
    if (old) throw new Error('taken');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await this.derive(pass, salt);
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
    this.state = { nick, id, key: b64(raw), salt: b64(salt), last: 0, hash: '' };
    store.set(STORE_NAME, nick);
    await this.push(true);
    return nick;
  },

  // Přihlásit: stáhne a rozšifruje uložený postup a sloučí ho s tímto zařízením.
  async login(nick, pass) {
    nick = cleanName(nick);
    const id = await this.idOf(nick);
    const rec = await this.fetch(id);
    if (!rec) throw new Error('missing');
    const salt = unb64(rec.salt);
    const key = await this.derive(pass, salt);
    let save;
    try {
      save = await this.open(key, rec);
    } catch (e) {
      throw new Error('password');
    }
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
    this.state = { nick: save.nick || nick, id, key: b64(raw), salt: rec.salt, last: 0, hash: '' };
    const merged = this.merge(this.snapshot(), save.keys || {}, true);
    this.apply(merged);
    store.set(STORE_NAME, this.state.nick);
    this.state.last = save.ts || Date.now();
    await this.push(true);
    return this.state.nick;
  },

  logout() {
    this.state = null;
    this.saveState();
  },

  // Nahrát postup (jen když se od minula změnil, nebo force).
  async push(force) {
    if (!this.state) return false;
    const keys = this.snapshot(), hash = this.hashOf(keys);
    if (!force && hash === this.state.hash) return false;
    const key = await this.keyFromState();
    const ts = Date.now();
    const text = await this.seal(key, unb64(this.state.salt), { nick: this.state.nick, ts, keys });
    await this.put(this.state.id, text);
    this.state.hash = hash;
    this.state.last = ts;
    this.saveState();
    return true;
  },

  // Stáhnout novější postup z jiného zařízení a sloučit ho.
  async pull() {
    if (!this.state) return false;
    const rec = await this.fetch(this.state.id);
    if (!rec || (rec.ts || 0) <= (this.state.last || 0)) return false;
    let save;
    try {
      save = await this.open(await this.keyFromState(), rec);
    } catch (e) {
      // heslo se mezitím změnilo jinde: odhlásit
      this.logout();
      return false;
    }
    this.apply(this.merge(this.snapshot(), save.keys || {}, true));
    this.state.last = save.ts || Date.now();
    this.saveState();
    return true;
  },

  // Synchronizace na pozadí: po spuštění stáhnout, pak nahrávat změny.
  async sync() {
    if (!this.state || this.busy || !this.supported()) return;
    this.busy = true;
    try {
      const got = await this.pull();
      await this.push(false);
      if (got) this.refreshUI();
    } catch (e) { /* bez internetu – zkusí se příště */ }
    this.busy = false;
  },

  refreshUI() {
    try {
      UI.renderProfile();
      UI.updateLocks();
      if (Game.screen === 'home') UI.show('home');
    } catch (e) { /* nevadí */ }
  },

  init() {
    this.load();
    if (!this.state) return;
    this.sync();
    setInterval(() => { if (Game.screen !== 'match' || Game.state === 'over') this.sync(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.sync(); });
  },

  /* ---------- obrazovka ---------- */

  initUI() {
    const $ = (id) => document.getElementById(id);
    const click = (id, fn) => $(id).addEventListener('click', () => { Sound.init(); fn(); });
    click('btn-account', () => this.show());
    click('btn-acc-close', () => UI.show('home'));
    click('btn-acc-logout', () => {
      this.logout();
      UI.toast('Odhlášeno – postup zůstává v tomto zařízení');
      this.show();
    });
    click('btn-acc-sync', () => {
      this.status('Synchronizuji…');
      this.sync().then(() => { this.status(''); this.show(); UI.toast('Synchronizováno'); });
    });
    const run = (fn, okText) => {
      const nick = $('acc-nick').value, pass = $('acc-pass').value;
      if (!this.supported()) {
        this.status('Tenhle prohlížeč neumí šifrování – otevři hru na https adrese.', true);
        return;
      }
      this.status('Chvilku…');
      $('acc-form').classList.add('busy');
      fn.call(this, nick, pass).then((n) => {
        $('acc-form').classList.remove('busy');
        $('acc-pass').value = '';
        Sound.fanfare();
        UI.toast(okText.replace('%', n));
        this.refreshUI();
        this.show();
      }).catch((e) => {
        $('acc-form').classList.remove('busy');
        const m = { nick: 'Napiš přezdívku.', short: `Heslo musí mít aspoň ${ACC_MIN_PASS} znaků.`, taken: 'Tahle přezdívka už má účet – přihlas se.', missing: 'Účet s touhle přezdívkou neexistuje – vytvoř ho.', password: 'Špatné heslo.', offline: 'Nepodařilo se připojit, zkus to za chvíli.' }[e.message];
        this.status(m || 'Něco se pokazilo, zkus to znovu.', true);
      });
    };
    $('acc-form').addEventListener('submit', (e) => {
      e.preventDefault();
      run(this.login, 'Přihlášen jako %');
    });
    click('btn-acc-register', () => run(this.register, 'Účet % vytvořen'));
  },

  status(t, err) {
    const el = document.getElementById('acc-status');
    el.textContent = t;
    el.hidden = !t;
    el.classList.toggle('error', !!err);
  },

  show() {
    const $ = (id) => document.getElementById(id);
    const s = this.state;
    $('acc-in').hidden = !s;
    $('acc-form').hidden = !!s;
    this.status('');
    if (s) {
      $('acc-who').textContent = s.nick;
      const ago = s.last ? Math.max(0, Math.round((Date.now() - s.last) / 60000)) : -1;
      $('acc-last').textContent = ago < 0 ? 'Ještě nesynchronizováno' : ago === 0 ? 'Synchronizováno právě teď' : `Naposledy synchronizováno před ${ago} min`;
    } else {
      $('acc-nick').value = cleanName(store.get(STORE_NAME, ''));
      $('acc-pass').value = '';
    }
    UI.show('account');
  },
};
