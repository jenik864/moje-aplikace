'use strict';

/*
 * Žebříček hráčů podle pohárů, profily a přátelé.
 *
 * Hra nemá vlastní server, takže profily se ukládají jako „uložené zprávy“ (retained)
 * na veřejných MQTT serverech, které hra používá i pro online zápasy:
 *   fifa67/zebricek/v1/<id hráče>  →  {"v":1,"id":…,"nick":…,"tro":…,…}
 * Kdo otevře žebříček, přihlásí se k odběru všech těchto témat a server mu pošle
 * poslední profil každého hráče. Přátelé jsou jen v tomto zařízení.
 */

const LB_TOPIC = 'fifa67/zebricek/v1/';
const LB_ID_KEY = 'hlavouni.hracId';
const LB_FRIENDS_KEY = 'hlavouni.pratele';
const LB_CHARS_KEY = 'hlavouni.postavy';
const LB_MAX_AGE = 180 * 24 * 3600 * 1000; // starší profily (půl roku) se nezobrazují

const Board = {
  players: new Map(),
  loading: false,
  tab: 'all',
  lastPub: 0,

  /* ---------- moje údaje ---------- */

  myId() {
    let id = '';
    try { id = localStorage.getItem(LB_ID_KEY) || ''; } catch (e) { /* nevadí */ }
    if (!/^[a-z0-9]{10,16}$/.test(id)) {
      id = randomId(12).toLowerCase().replace(/[^a-z0-9]/g, 'x');
      try { localStorage.setItem(LB_ID_KEY, id); } catch (e) { /* nevadí */ }
    }
    return id;
  },
  // přezdívka = stejné jméno jako v online hře
  nick() {
    return cleanName(store.get(STORE_NAME, ''));
  },
  setNick(n) {
    n = cleanName(n);
    store.set(STORE_NAME, n);
    if (UI.el.nick) UI.el.nick.value = n;
    return n;
  },
  friends() {
    try {
      const a = JSON.parse(localStorage.getItem(LB_FRIENDS_KEY));
      return Array.isArray(a) ? a.filter((x) => typeof x === 'string').slice(0, 200) : [];
    } catch (e) {
      return [];
    }
  },
  isFriend(id) {
    return this.friends().includes(id);
  },
  toggleFriend(id) {
    const f = this.friends();
    const i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1);
    else f.push(id);
    try { localStorage.setItem(LB_FRIENDS_KEY, JSON.stringify(f)); } catch (e) { /* nevadí */ }
    return i < 0;
  },
  // nejhranější postava (obrázek v žebříčku)
  favChar() {
    let o = {};
    try { o = JSON.parse(localStorage.getItem(LB_CHARS_KEY)) || {}; } catch (e) { /* nevadí */ }
    let best = 'jenda', n = -1;
    for (const k in o) if (o[k] > n && ROSTER.some((c) => c.id === k)) { best = k; n = o[k]; }
    return best;
  },
  myProfile() {
    const p = Profile.get(), ch = this.favChar();
    return {
      v: 1, id: this.myId(), nick: this.nick(), tro: p.trophies, played: p.played, wins: p.wins, goals: p.goals,
      cups: p.cups, story: Story.doneOf('pav'), ch, sk: mySkinFor(ch), ts: Date.now(),
    };
  },

  // Po zápase: zapamatovat postavu a poslat nový profil (když má hráč přezdívku).
  afterMatch(charId) {
    try {
      const o = JSON.parse(localStorage.getItem(LB_CHARS_KEY)) || {};
      o[charId] = (Number(o[charId]) || 0) + 1;
      localStorage.setItem(LB_CHARS_KEY, JSON.stringify(o));
    } catch (e) { /* nevadí */ }
    if (this.nick() && Date.now() - this.lastPub > 20000) this.publish();
    if (Account.logged) setTimeout(() => Account.sync(), 1500);
  },

  /* ---------- servery ---------- */

  urls() {
    return window.HLAVOUNI_RELAY || RELAY_URLS;
  },

  // Uložit svůj profil na všechny servery (co se povede).
  publish() {
    const me = this.myProfile();
    if (!me.nick) return Promise.resolve(false);
    this.lastPub = Date.now();
    this.players.set(me.id, me);
    const text = JSON.stringify(me);
    return Promise.allSettled(this.urls().map((u) => mqttConnect(u, 'f67p' + randomId(8), () => {}).then((c) => {
      c.publish(LB_TOPIC + me.id, text, true);
      setTimeout(() => c.close(), 1200);
    }))).then((r) => r.some((x) => x.status === 'fulfilled'));
  },

  // Načíst profily všech hráčů (každý server pošle uložené zprávy, sloučí se podle času).
  fetch() {
    const got = new Map();
    const take = (topic, text) => {
      if (!topic.startsWith(LB_TOPIC)) return;
      const p = this.clean(text, topic.slice(LB_TOPIC.length));
      if (!p) return;
      const old = got.get(p.id);
      if (!old || p.ts > old.ts) got.set(p.id, p);
    };
    return Promise.allSettled(this.urls().map((u) => mqttConnect(u, 'f67l' + randomId(8), take).then((c) => {
      c.subscribe(LB_TOPIC + '+');
      return new Promise((res) => setTimeout(() => { c.close(); res(); }, 2600));
    }))).then((r) => {
      if (!r.some((x) => x.status === 'fulfilled')) throw new Error('offline');
      const now = Date.now();
      for (const [id, p] of got) if (now - p.ts < LB_MAX_AGE) this.players.set(id, p);
      return this.players;
    });
  },

  // Profil od cizího hráče: jen známá pole a rozumné hodnoty.
  clean(text, topicId) {
    let o;
    try { o = JSON.parse(text); } catch (e) { return null; }
    if (!o || typeof o !== 'object' || o.v !== 1 || o.id !== topicId || !/^[a-z0-9]{10,16}$/.test(o.id)) return null;
    const num = (x, max) => Math.max(0, Math.min(max, Math.floor(Number(x) || 0)));
    const nick = cleanName(o.nick);
    if (!nick) return null;
    const ch = ROSTER.some((c) => c.id === o.ch) ? o.ch : 'jenda';
    const sk = SKINS[o.sk] && SKINS[o.sk].char === ch ? o.sk : '';
    return {
      v: 1, id: o.id, nick, tro: num(o.tro, 1e6), played: num(o.played, 1e6), wins: num(o.wins, 1e6), goals: num(o.goals, 1e7),
      cups: num(o.cups, 1e5), story: num(o.story, CAMPAIGNS.pav.levels.length), ch, sk, ts: num(o.ts, 4e12),
    };
  },

  /* ---------- obrazovky ---------- */

  initUI() {
    const $ = (id) => document.getElementById(id);
    const click = (id, fn) => $(id).addEventListener('click', () => { Sound.init(); fn(); });
    click('btn-board', () => this.open());
    click('btn-board-close', () => UI.show('home'));
    click('btn-player-back', () => this.showBoard());
    click('btn-friend', () => {
      const id = this.shownId;
      if (!id) return;
      const added = this.toggleFriend(id);
      Sound.click();
      UI.toast(added ? 'Přidáno do přátel' : 'Odebráno z přátel');
      this.showPlayer(id);
    });
    click('btn-board-retry', () => this.refresh());
    document.querySelectorAll('#board .board-tabs button').forEach((b) => b.addEventListener('click', () => {
      Sound.click();
      this.tab = b.dataset.tab;
      this.renderList();
    }));
    $('nick-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Sound.init();
      const n = this.setNick($('nick-input').value);
      $('nick-input').value = n;
      $('nick-input').blur();
      if (!n) {
        UI.toast('Napiš přezdívku');
        return;
      }
      Sound.click();
      this.status('Ukládám…');
      this.publish().then((ok) => {
        this.status(ok ? '' : 'Nepodařilo se připojit, zkus to za chvíli.');
        if (ok) UI.toast(`Jsi v žebříčku jako ${n}`);
        this.renderList();
      });
    });
  },

  open() {
    UI.show('board');
    const $ = (id) => document.getElementById(id);
    $('nick-input').value = this.nick();
    // přihlášený hráč má přezdívku z účtu
    $('nick-input').readOnly = Account.logged;
    $('nick-form').classList.toggle('locked', Account.logged);
    this.renderList();
    this.refresh();
  },

  showBoard() {
    UI.show('board');
    this.renderList();
  },

  refresh() {
    if (this.loading) return;
    this.loading = true;
    this.status('Načítám žebříček…');
    document.getElementById('btn-board-retry').hidden = true;
    const pub = this.nick() ? this.publish() : Promise.resolve();
    pub.then(() => this.fetch()).then(() => {
      this.loading = false;
      this.status('');
      this.renderList();
    }).catch(() => {
      this.loading = false;
      this.status('Žebříček se nepodařilo načíst (bez internetu?).');
      document.getElementById('btn-board-retry').hidden = false;
      this.renderList();
    });
  },

  status(t) {
    const el = document.getElementById('board-status');
    el.textContent = t;
    el.hidden = !t;
  },

  // seznam hráčů seřazený podle pohárů
  sorted() {
    const me = this.myProfile();
    const all = new Map(this.players);
    if (me.nick) all.set(me.id, me);
    let list = [...all.values()];
    if (this.tab === 'friends') {
      const f = this.friends();
      list = list.filter((p) => f.includes(p.id) || p.id === me.id);
    }
    return list.sort((a, b) => b.tro - a.tro || b.wins - a.wins || a.nick.localeCompare(b.nick)).slice(0, 100);
  },

  renderList() {
    const $ = (id) => document.getElementById(id);
    document.querySelectorAll('#board .board-tabs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === this.tab)));
    const ul = $('board-list');
    ul.textContent = '';
    const meId = this.myId(), list = this.sorted();
    const empty = $('board-empty');
    empty.hidden = list.length > 0 || this.loading;
    empty.textContent = this.tab === 'friends' ? 'Zatím nemáš žádné přátele. Klepni na hráče v žebříčku a přidej si ho.' : this.nick() ? 'Zatím tu nikdo není.' : 'Napiš přezdívku a ulož ji – objevíš se v žebříčku.';
    const draws = [];
    list.forEach((p, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lb-row' + (p.id === meId ? ' me' : '') + (this.isFriend(p.id) ? ' friend' : '');
      const pos = document.createElement('span');
      pos.className = 'lb-pos';
      pos.textContent = i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1);
      const cv = document.createElement('canvas');
      cv.className = 'lb-pic';
      const r = rankOf(p.tro);
      const info = document.createElement('span');
      info.className = 'lb-info';
      const nm = document.createElement('b');
      nm.textContent = p.nick + (p.id === meId ? ' (ty)' : '');
      const lg = document.createElement('small');
      lg.textContent = r.rank.name + (this.isFriend(p.id) ? ' · přítel' : '');
      lg.style.color = r.rank.color;
      info.append(nm, lg);
      const tro = document.createElement('span');
      tro.className = 'lb-tro';
      tro.textContent = `🏆 ${p.tro}`;
      b.append(pos, cv, info, tro);
      b.addEventListener('click', () => {
        Sound.init();
        Sound.click();
        this.showPlayer(p.id);
      });
      li.appendChild(b);
      ul.appendChild(li);
      draws.push(() => Renderer.portrait(cv, p.ch, this.kit(p.ch, p.sk), 1, undefined, { head: true, skin: p.sk }));
    });
    requestAnimationFrame(() => draws.forEach((f) => f()));
  },

  kit(ch, sk) {
    if (SKINS[sk] && SKINS[sk].kit) return SKINS[sk].kit;
    const d = duoOf(ch);
    return d >= 0 ? DUO_TEAMS[d] : charById(ch).kit || SIDE_COLORS[0];
  },

  // profil jednoho hráče
  showPlayer(id) {
    const meId = this.myId();
    const p = id === meId ? this.myProfile() : this.players.get(id);
    if (!p) return;
    this.shownId = id;
    const $ = (x) => document.getElementById(x);
    const r = rankOf(p.tro);
    $('pl-nick').textContent = p.nick;
    $('pl-rank').textContent = r.rank.name;
    $('pl-rank').style.color = r.rank.color;
    UI.setEmblem($('pl-emblem'), r.rank);
    $('pl-tro').textContent = p.tro;
    const pos = this.sorted().findIndex((q) => q.id === id);
    $('pl-pos').textContent = pos >= 0 && this.tab === 'all' ? `${pos + 1}. místo v žebříčku` : '';
    const stats = [
      ['Zápasy', p.played], ['Výhry', p.wins], ['Úspěšnost', p.played ? `${Math.round((p.wins / p.played) * 100)} %` : '–'],
      ['Góly', p.goals], ['Turnaje', p.cups], ['Příběh', `${p.story} / ${CAMPAIGNS.pav.levels.length}`],
    ];
    const grid = $('pl-stats');
    grid.textContent = '';
    for (const [k, v] of stats) {
      const d = document.createElement('div');
      const b = document.createElement('b');
      b.textContent = v;
      const s = document.createElement('span');
      s.textContent = k;
      d.append(b, s);
      grid.appendChild(d);
    }
    const days = Math.floor((Date.now() - p.ts) / 86400000);
    $('pl-seen').textContent = id === meId ? 'Tohle jsi ty' : days <= 0 ? 'Hrál(a) dnes' : `Naposledy hrál(a) před ${days} ${days === 1 ? 'dnem' : 'dny'}`;
    $('pl-char').textContent = `Nejčastěji hraje za: ${charById(p.ch).name}${p.sk ? ` (${SKINS[p.sk].name})` : ''}`;
    const fb = $('btn-friend');
    fb.hidden = id === meId;
    const fr = this.isFriend(id);
    fb.textContent = fr ? 'Přítel ✓ · odebrat' : '+ Přidat do přátel';
    fb.classList.toggle('on', fr);
    UI.show('player');
    const cv = $('pl-pic');
    const t0 = performance.now();
    const anim = (now) => {
      if ($('player').hidden || this.shownId !== id) return;
      Renderer.portrait(cv, p.ch, this.kit(p.ch, p.sk), 1, (now - t0) / 1000, { skin: p.sk });
      requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  },
};
