'use strict';
/*
 * HOT PEPPERS – noční klub. Vybereš si kluka, vejdeš dovnitř a joystickem chodíš po klubu
 * (pohled shora jako v Brawl Stars). U baru, DJe, ve VIP a v šatně se utrácí poháry.
 */

const CLUB_KEY = 'hlavouni.klub';
const CLUB_W = 1500, CLUB_H = 980;
const CLUB_WALL = 150;    // zadní stěna (y 0..150)
const CLUB_FLOOR_B = 940; // spodní stěna
const CLUB_K = 0.5;       // velikost postav v klubu
const CLUB_R = 22;        // poloměr hráče (kolize)
const CLUB_SPEED = 320;
const CLUB_VIEW_H = 560;  // kolik klubu je vidět na výšku

// Co se dá koupit (cena v pohárech).
const CLUB_SHOP = {
  bar: {
    title: 'Bar', who: 'Co to bude?',
    items: [
      { id: 'shot', icon: '🌶️', name: 'Pepper shot', price: 5, t: 10, desc: 'Pálivý panák podniku – 10 s chrlíš oheň.' },
      { id: 'limo', icon: '🥤', name: 'Limo Hlavička', price: 3, t: 12, desc: 'Bublinky až do nosu – 12 s běháš rychleji.' },
      { id: 'neon', icon: '🍹', name: 'Neonový koktejl', price: 8, t: 15, desc: '15 s záříš ve všech barvách klubu.' },
    ],
  },
  dj: {
    title: 'DJ pult', who: 'Chceš bombu?',
    items: [{ id: 'hit', icon: '🎧', name: 'Pustit hit', price: 15, t: 20, desc: 'DJ pustí pecku: světla, konfety a celý klub 20 s šílí.' }],
  },
  vip: {
    title: 'VIP', who: 'Jen pro VIP!',
    items: [{ id: 'vip', icon: '💎', name: 'Vstup do VIP', price: 60, once: true, desc: 'Natrvalo. Zlatý gauč a VIP bar s deštěm pohárků.' }],
  },
  lounge: {
    title: 'VIP bar', who: 'Vítej ve VIP!',
    items: [{ id: 'rain', icon: '🏆', name: 'Déšť pohárků', price: 25, t: 8, desc: 'Vyhodíš poháry do vzduchu a 8 s na tebe prší zlato.' }],
  },
  wardrobe: {
    title: 'Šatna', who: 'Něco na sebe?',
    items: [
      { id: 'shades', icon: '🕶️', name: 'Černé brýle', price: 20, once: true, gear: true, desc: 'Natrvalo v klubu. Nasadíš a sundáš tady v šatně.' },
      { id: 'chain', icon: '📿', name: 'Zlatý řetěz', price: 35, once: true, gear: true, desc: 'Natrvalo v klubu. Pořádný drip na krk.' },
      { id: 'crown', icon: '👑', name: 'Koruna krále klubu', price: 120, once: true, gear: true, desc: 'Natrvalo v klubu. Ať všichni ví, kdo tu vládne.' },
    ],
  },
};

// Překážky (obdélníky x0, y0, x1, y1 a kruhy x, y, r).
const CLUB_RECTS = [
  { x0: 40, y0: 250, x1: 460, y1: 300, kind: 'bar' },
  { x0: 640, y0: 190, x1: 860, y1: 262, kind: 'dj' },
  { x0: 566, y0: 160, x1: 630, y1: 250, kind: 'speaker' },
  { x0: 870, y0: 160, x1: 934, y1: 250, kind: 'speaker' },
  { x0: 40, y0: 560, x1: 300, y1: 690, kind: 'wardrobe' },
  { x0: 1200, y0: 165, x1: 1440, y1: 228, kind: 'sofa' },
  { x0: 1104, y0: 150, x1: 1116, y1: 380, kind: 'rope' },
  { x0: 1104, y0: 470, x1: 1116, y1: 620, kind: 'rope' },
  { x0: 1104, y0: 612, x1: 1470, y1: 624, kind: 'rope' },
];
const CLUB_GATE = { x0: 1100, y0: 380, x1: 1120, y1: 470 };
const CLUB_TABLES = [{ x: 360, y: 520 }, { x: 390, y: 770 }, { x: 1190, y: 790 }, { x: 1370, y: 750 }, { x: 1300, y: 390, vip: true }];
const CLUB_DANCE = { x0: 520, y0: 330, x1: 980, y1: 640 };
const CLUB_ZONES = [
  { id: 'exit', label: 'Odejít', x: 750, y: 915, r: 70 },
  { id: 'bar', label: 'Bar', x: 250, y: 350, r: 120 },
  { id: 'dj', label: 'DJ', x: 750, y: 300, r: 80 },
  { id: 'vip', label: 'VIP', x: 1050, y: 425, r: 85 },
  { id: 'lounge', label: 'VIP bar', x: 1300, y: 470, r: 110 },
  { id: 'wardrobe', label: 'Šatna', x: 170, y: 760, r: 100 },
];

// Holky v klubu: nejsou ze hry, jen hosté klubu (dospělé, v šatech na večer).
const CLUB_GIRLS = [
  { id: 'g_bella', name: 'Bella', skin: '#f3cfb4', hair: 'longhair', fringe: 'side', wavy: true, hairColor: '#f6e3a8', hairDark: '#b99a52', hairLight: '#fffbe6', eyes: '#3d6f8f', brow: '#a8894f', lipstick: '#d81b4a', shadow: '#c2185b', hoops: '#ffd24a', dress: { color: '#e0204f', dark: '#8a0f2c', light: '#ff7a9a', style: 'sequin', shoe: '#1a0a12' } },
  { id: 'g_vanessa', name: 'Vanessa', skin: '#c98e62', hair: 'longhair', fringe: 'curtain', wavy: true, hairColor: '#1c1210', hairDark: '#060404', hairLight: '#4a342a', eyes: '#3a2416', brow: '#1c1210', lipstick: '#9e1f3a', shadow: '#c79a2a', hoops: '#ffd24a', necklace: '#ffd24a', dress: { color: '#ffcf3a', dark: '#a87412', light: '#fff3b0', style: 'slip' } },
  { id: 'g_lola', name: 'Lola', skin: '#f5d2b6', hair: 'longhair', fringe: 'bangs', hairColor: '#ff6fb5', hairDark: '#b8357a', hairLight: '#ffc2e0', eyes: '#5a4126', brow: '#7a4a3a', lipstick: '#ff2d7a', shadow: '#ff6fb5', hoops: '#e9edf3', dress: { color: '#1b1b24', dark: '#0a0a10', light: '#5a5a72', style: 'cut', shoe: '#ff2d7a' } },
  { id: 'g_nikki', name: 'Nikki', skin: '#f0c8a8', hair: 'longhair', fringe: 'side', hairColor: '#b8401c', hairDark: '#6e1e0a', hairLight: '#f08a52', eyes: '#3d8f6c', brow: '#8a3014', lipstick: '#c2102e', shadow: '#2e8a5a', dress: { color: '#16a36a', dark: '#0b5c3a', light: '#7dffc0', style: 'sequin', shoe: '#1a0a12' } },
  { id: 'g_jasmina', name: 'Jasmína', skin: '#8a5a3a', hair: 'longhair', fringe: 'curtain', wavy: true, hairColor: '#2a1810', hairDark: '#0c0604', hairLight: '#6a4a30', eyes: '#2a1a10', brow: '#1a0e08', lipstick: '#b0306a', shadow: '#d4a017', hoops: '#ffd24a', dress: { color: '#f7f8fa', dark: '#c9ced8', light: '#ffffff', style: 'slip', shoe: '#ffd24a' } },
  { id: 'g_sabrina', name: 'Sabrina', skin: '#f6d8c2', hair: 'longhair', fringe: 'bangs', hairColor: '#141214', hairDark: '#040304', hairLight: '#3a3640', eyes: '#3a5d7a', brow: '#141214', lipstick: '#8a0f2c', shadow: '#5a2a8a', necklace: '#e9edf3', dress: { color: '#7a2cff', dark: '#3e1294', light: '#c9a8ff', style: 'cut' } },
  { id: 'g_mia', name: 'Mia', skin: '#efc6a2', hair: 'longhair', fringe: 'side', wavy: true, hairColor: '#8a5a2c', hairDark: '#4a2c12', hairLight: '#d6a06a', eyes: '#5a6a3e', brow: '#5a3618', lipstick: '#e0405a', shadow: '#c47a3a', hoops: '#ffd24a', dress: { color: '#ff6a3d', dark: '#b83c18', light: '#ffc2a8', style: 'slip', shoe: '#1a0a12' } },
  { id: 'g_kristyna', name: 'Kristýna', skin: '#f3cfb4', hair: 'longhair', fringe: 'curtain', hairColor: '#e9e4dc', hairDark: '#a8a094', hairLight: '#ffffff', eyes: '#4a7aa8', brow: '#b0a890', lipstick: '#ff4d6d', shadow: '#4fc3ff', necklace: '#4fe0ff', dress: { color: '#2fb8ff', dark: '#1a6aa8', light: '#b8ecff', style: 'sequin', shoe: '#e9edf3' } },
].map((g) => Object.assign({ girl: true, num: 0, noBow: true, accent: '#ffd24a', lid: 0.22 }, g));
const CLUB_PODIUMS = [{ x: 455, y: 615 }, { x: 1045, y: 615 }];
const CLUB_GIRL_LINES = ['Ahoj fešáku', 'Zatančíš si?', 'Pěkně se hýbeš!', 'Koupíš mi drink?', 'Ty jsi tu poprvé?', 'Jsi fotbalista?'];

const Club = {
  on: false,
  phase: 'select', // 'select' výběr postavy, 'in' v klubu
  cv: null,
  ctx: null,
  t: 0,
  me: null,
  npcs: [],
  parts: [],
  fx: {},       // běžící efekty: shot, limo, neon, hit, rain (zbývající čas)
  pulse: 0,     // záblesk na dobu
  beatN: 0,
  dance: false,
  zone: null,
  shopOpen: '',
  stick: { id: null, ox: 0, oy: 0, x: 0, y: 0 },
  keys: new Set(),
  cam: { x: 750, y: 600 },
  pick: 'jenda',

  /* ---------- uložený stav ---------- */

  state() {
    try {
      const o = JSON.parse(localStorage.getItem(CLUB_KEY));
      if (o && typeof o === 'object') return { char: o.char || 'jenda', vip: !!o.vip, own: o.own || {}, wear: o.wear || {}, adult: !!o.adult };
    } catch (e) { /* nic */ }
    return { char: 'jenda', vip: false, own: {}, wear: {}, adult: false };
  },
  save(s) {
    try { localStorage.setItem(CLUB_KEY, JSON.stringify(s)); } catch (e) { /* nevadí */ }
  },

  // Do klubu jdou jen kluci ze hry (bez mazlíčků a schovaných postav).
  maleIds() {
    return this.males().map((c) => c.id);
  },
  // Do klubu jdou jen kluci (bez mazlíčků a schovaných postav).
  males() {
    return ROSTER.filter((c) => !c.girl && !c.hidden && !c.viet && !c.bunny);
  },
  kitOf(id, skin) {
    if (skin && SKINS[skin] && SKINS[skin].kit) return SKINS[skin].kit;
    const d = duoOf(id);
    return d >= 0 && !DUO_TEAMS[d].viet ? DUO_TEAMS[d] : charById(id).kit || SIDE_COLORS[0];
  },

  /* ---------- otevření a zavření ---------- */

  init() {
    this.el = (id) => document.getElementById(id);
    this.cv = this.el('club-cv');
    this.ctx = this.cv.getContext('2d');
    const click = (id, fn) => this.el(id).addEventListener('click', () => { Sound.init(); fn(); });
    click('club-back', () => this.close());
    click('club-enter', () => {
      if (!this.state().adult) {
        this.el('club-age').hidden = false;
        return;
      }
      this.enter();
    });
    click('club-exit', () => this.leave());
    click('club-act', () => this.act());
    click('club-shop-close', () => this.closeShop());
    click('club-age-yes', () => {
      const s = this.state();
      s.adult = true;
      this.save(s);
      this.el('club-age').hidden = true;
    });
    click('club-age-no', () => this.close());
    this.el('club-shop').addEventListener('click', (e) => { if (e.target.id === 'club-shop') this.closeShop(); });
    this.el('club-shop-items').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-item]');
      if (b) this.buy(b.dataset.item);
    });
    this.el('club-grid').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-char]');
      if (!b) return;
      if (b.classList.contains('locked')) {
        UI.toast('Tuhle postavu ještě nemáš odemčenou.');
        return;
      }
      this.pick = b.dataset.char;
      Sound.click();
      this.renderGrid();
    });
    // joystick: kdekoli na levé části obrazovky
    const cv = this.cv;
    cv.addEventListener('pointerdown', (e) => {
      if (this.phase !== 'in' || this.shopOpen) return;
      const r = cv.getBoundingClientRect();
      if (e.clientX - r.left > r.width * 0.62) return;
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* nevadí */ }
      Object.assign(this.stick, { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY });
    });
    cv.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stick.id) return;
      this.stick.x = e.clientX;
      this.stick.y = e.clientY;
    });
    const up = (e) => { if (e.pointerId === this.stick.id) this.stick.id = null; };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('lostpointercapture', up);
    window.addEventListener('keydown', (e) => {
      if (!this.on) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        if (this.shopOpen) this.closeShop();
        else if (this.phase === 'in') this.leave();
        else this.close();
        return;
      }
      if (this.phase !== 'in' || this.shopOpen) return;
      if (k === 'e' || k === ' ' || k === 'enter') {
        e.preventDefault();
        this.act();
        return;
      }
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
  },

  open() {
    if (!this.cv) this.init();
    const s = this.state();
    const ok = (id) => this.males().some((c) => c.id === id && charAvailable(c));
    this.pick = ok(s.char) ? s.char : 'jenda';
    this.on = true;
    this.quiet0 = Sound.quiet;
    Sound.quiet = false;
    this.phase = 'select';
    Game.screen = 'club';
    UI.show('club');
    this.el('club-select').hidden = false;
    this.el('club-hud').hidden = true;
    this.el('club-age').hidden = s.adult;
    this.closeShop();
    this.build('');
    this.renderGrid();
    this.renderTro();
    Sound.crowdLevel(0);
    this.startMusic(true);
  },

  close() {
    this.on = false;
    Sound.quiet = this.quiet0 !== undefined ? this.quiet0 : true;
    this.stopMusic();
    this.stick.id = null;
    this.keys.clear();
    Game.screen = 'home';
    UI.show('home');
    UI.renderProfile();
  },

  enter() {
    const s = this.state();
    s.char = this.pick;
    this.save(s);
    this.phase = 'in';
    this.el('club-select').hidden = true;
    this.el('club-hud').hidden = false;
    this.build(this.pick);
    this.applyGear();
    this.renderTro();
    this.startMusic(false);
    Sound.whoosh();
    UI.toast('Vítej v HOT PEPPERS! 🌶️');
  },

  leave() {
    this.closeShop();
    this.phase = 'select';
    this.el('club-select').hidden = false;
    this.el('club-hud').hidden = true;
    this.stick.id = null;
    this.build('');
    this.renderGrid();
    this.startMusic(true);
  },

  /* ---------- výběr postavy ---------- */

  renderGrid() {
    const grid = this.el('club-grid');
    const list = this.males();
    if (grid.childElementCount !== list.length) {
      grid.textContent = '';
      for (const c of list) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'club-card';
        b.dataset.char = c.id;
        b.innerHTML = `<canvas aria-hidden="true"></canvas><span class="club-name">${c.name}</span><span class="club-lock" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>`;
        grid.appendChild(b);
      }
    }
    for (const b of grid.children) {
      const c = charById(b.dataset.char);
      const lock = !charAvailable(c);
      b.classList.toggle('locked', lock);
      b.setAttribute('aria-pressed', String(b.dataset.char === this.pick));
      b.setAttribute('aria-label', c.name + (lock ? ' (zamčeno)' : ''));
    }
    this.el('club-enter').textContent = `Vstoupit · ${charById(this.pick).name}`;
    this.drawGrid(0);
  },

  drawGrid(t) {
    for (const b of this.el('club-grid').children) {
      const id = b.dataset.char, sel = id === this.pick;
      const sk = mySkinFor(id);
      Renderer.portrait(b.firstChild, id, this.kitOf(id, sk), 1, sel ? t : undefined, { skin: sk, happy: sel });
    }
  },

  renderTro() {
    const n = Profile.get().trophies;
    for (const id of ['club-tro1', 'club-tro2']) this.el(id).textContent = n;
  },

  /* ---------- postavy v klubu ---------- */

  mk(id, x, y, o = {}) {
    const look = o.look || lookFor(id, o.skin || '');
    const pl = new Player({ team: 0, x: 0, look, role: 'attacker', ctrl: 'cpu' });
    pl.skin = o.skin || '';
    pl.onGround = true;
    pl.mood = 0;
    const kit = o.look && o.look.dress ? { color: o.look.dress.color, dark: o.look.dress.dark, light: o.look.dress.light } : this.kitOf(id, o.skin);
    return Object.assign({ id, x, y, vx: 0, vy: 0, dir: 1, pl, kit, bob: 0, lift: 0, ph: Math.random() * 10 }, o);
  },

  build(meId) {
    this.parts = [];
    this.fx = {};
    this.dance = false;
    const s = this.state();
    // NPC ze hry jsou jen kluci; holky jsou hosté klubu (nejsou ze hry)
    const pool = shuffle(this.maleIds().filter((id) => id !== meId));
    const girls = shuffle(CLUB_GIRLS.slice());
    const girl = (x, y, o = {}) => {
      const g = girls.shift();
      if (g) this.npcs.push(this.mk(g.id, x, y, Object.assign({ look: g, lady: true, dir: Math.random() < 0.5 ? -1 : 1, hx: x, hy: y }, o)));
    };
    this.follower = null;
    const take = (pref) => {
      const i = pool.indexOf(pref);
      if (i >= 0 && pref !== meId) return pool.splice(i, 1)[0];
      return pool.shift();
    };
    this.npcs = [];
    // obsluha
    this.npcs.push(this.mk(take('peli'), 250, 238, { staff: 'bar', dir: 1, say: CLUB_SHOP.bar.who }));
    this.npcs.push(this.mk(take('durcado'), 750, 182, { staff: 'dj', dir: 1, dj: true, say: CLUB_SHOP.dj.who }));
    this.npcs.push(this.mk(take('ludan'), 1072, 352, { staff: 'vip', dir: -1, say: CLUB_SHOP.vip.who, gear: { shades: true } }));
    girl(170, 636, { staff: 'wardrobe', dir: 1, say: CLUB_SHOP.wardrobe.who });
    // holky na pódiích, na parketu, u baru a ve VIP
    for (const q of CLUB_PODIUMS) girl(q.x, q.y, { podium: true, dancer: true, lift: 34 });
    for (const [x, y] of [[680, 450], [860, 520], [600, 590]]) girl(x, y, { dancer: true });
    girl(120, 335, { atBar: true, dir: 1 });
    girl(1330, 300, { vipGirl: true, dancer: true });
    // tanečníci na parketu
    const spots = [[600, 400], [760, 380], [900, 420], [760, 560]];
    for (const [x, y] of spots) if (pool.length) this.npcs.push(this.mk(pool.shift(), x, y, { dancer: true, hx: x, hy: y, dir: Math.random() < 0.5 ? -1 : 1 }));
    // dva se procházejí po klubu
    for (let i = 0; i < 2 && pool.length; i++) this.npcs.push(this.mk(pool.shift(), 360 + i * 700, 640, { walker: true, tx: 0, ty: 0, wait: rand(0, 2) }));
    if (s.vip && pool.length) this.npcs.push(this.mk(pool.shift(), 1260, 260, { vipGuest: true, dancer: true, hx: 1260, hy: 260, dir: 1 }));
    if (meId) {
      const sk = mySkinFor(meId);
      this.me = this.mk(meId, 750, 800, { skin: sk, me: true, dir: 1 });
      this.cam.x = 750;
      this.cam.y = 700;
    } else {
      this.me = null;
      this.cam.x = 750;
      this.cam.y = 470;
    }
  },

  // Kolize s pevnými věcmi (kruh vs. obdélníky, stoly a stěny).
  solid(x, y, r) {
    const vip = this.state().vip;
    if (x - r < 30 || x + r > CLUB_W - 30 || y - r * 0.5 < CLUB_WALL + 6 || y + r * 0.5 > CLUB_FLOOR_B - 4) return true;
    const rects = vip ? CLUB_RECTS : CLUB_RECTS.concat([CLUB_GATE]);
    for (const q of rects) {
      const cx = clamp(x, q.x0, q.x1), cy = clamp(y, q.y0, q.y1);
      if ((x - cx) ** 2 + ((y - cy) * 1.6) ** 2 < r * r) return true;
    }
    for (const t of CLUB_TABLES) if ((x - t.x) ** 2 + ((y - t.y) * 1.6) ** 2 < (r + 26) ** 2) return true;
    for (const t of CLUB_PODIUMS) if ((x - t.x) ** 2 + ((y - t.y) * 1.6) ** 2 < (r + 40) ** 2) return true;
    return false;
  },

  moveEnt(e, dx, dy) {
    if (!this.solid(e.x + dx, e.y, CLUB_R)) e.x += dx;
    if (!this.solid(e.x, e.y + dy, CLUB_R)) e.y += dy;
  },

  /* ---------- herní smyčka ---------- */

  frame(dt, now) {
    this.t += dt;
    this.pump();
    if (this.phase === 'select') this.drawGrid(now / 1000);
    this.update(dt);
    this.draw(now);
  },

  input() {
    let mx = 0, my = 0;
    const k = this.keys;
    if (k.has('arrowleft') || k.has('a')) mx -= 1;
    if (k.has('arrowright') || k.has('d')) mx += 1;
    if (k.has('arrowup') || k.has('w')) my -= 1;
    if (k.has('arrowdown') || k.has('s')) my += 1;
    const st = this.stick;
    if (st.id !== null) {
      const max = 46;
      let dx = st.x - st.ox, dy = st.y - st.oy;
      const d = Math.hypot(dx, dy);
      if (d > max) {
        // joystick jede za prstem
        st.ox += (dx / d) * (d - max);
        st.oy += (dy / d) * (d - max);
        dx = st.x - st.ox;
        dy = st.y - st.oy;
      }
      const m = Math.min(1, Math.hypot(dx, dy) / max);
      if (m > 0.12) {
        mx = (dx / max);
        my = (dy / max);
      }
    }
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    return { mx, my };
  },

  update(dt) {
    for (const k in this.fx) {
      this.fx[k] -= dt;
      if (this.fx[k] <= 0) delete this.fx[k];
    }
    this.pulse = Math.max(0, this.pulse - dt * 3.2);
    const party = this.fx.hit > 0;
    const me = this.me;
    if (me && this.phase === 'in') {
      const { mx, my } = this.shopOpen ? { mx: 0, my: 0 } : this.input();
      const sp = CLUB_SPEED * (this.fx.limo > 0 ? 1.55 : 1);
      me.vx = approach(me.vx, mx * sp, 2600 * dt);
      me.vy = approach(me.vy, my * sp * 0.8, 2600 * dt);
      if (Math.abs(mx) + Math.abs(my) > 0.1) this.dance = false;
      this.moveEnt(me, me.vx * dt, me.vy * dt);
      // lidi se odstrčí
      for (const n of this.npcs) {
        const dx = me.x - n.x, dy = (me.y - n.y) * 1.6, d = Math.hypot(dx, dy), min = CLUB_R * 2;
        if (d > 0.01 && d < min) this.moveEnt(me, (dx / d) * (min - d) * 0.5, (dy / d) * (min - d) * 0.3);
      }
      if (Math.abs(me.vx) > 20) me.dir = me.vx > 0 ? 1 : -1;
      this.anim(me, dt, Math.hypot(me.vx, me.vy), this.dance || party);
      this.cam.x = lerp(this.cam.x, me.x, Math.min(1, dt * 6));
      this.cam.y = lerp(this.cam.y, me.y - 40, Math.min(1, dt * 6));
      this.findZone();
      // efekty hráče
      if (this.fx.shot > 0) this.spawnFire(me, dt);
      if (this.fx.limo > 0 && Math.random() < dt * 10) this.parts.push({ k: 'bub', x: me.x + rand(-18, 18), y: me.y - 70, vx: rand(-10, 10), vy: -rand(40, 80), t: 0, life: 1.2, s: rand(3, 6) });
      if (this.fx.rain > 0) for (let i = 0; i < 2; i++) if (Math.random() < dt * 22) this.parts.push({ k: 'cup', x: me.x + rand(-260, 260), y: me.y - rand(380, 460), vx: rand(-20, 20), vy: rand(220, 320), t: 0, life: 2.2, rot: rand(-1, 1), floor: me.y + rand(-40, 60) });
    } else {
      // výběr postavy: kamera se pomalu prochází klubem
      this.cam.x = 750 + Math.sin(this.t * 0.18) * 260;
      this.cam.y = 470 + Math.sin(this.t * 0.11) * 60;
    }
    if (party && Math.random() < dt * 40) {
      const vw = (this.cv.width / this.scale()) || 900;
      this.parts.push({ k: 'conf', x: this.cam.x + rand(-vw / 2, vw / 2), y: this.cam.y - CLUB_VIEW_H / 2 - 20, vx: rand(-40, 40), vy: rand(120, 220), t: 0, life: 3.4, rot: rand(0, 6), col: `hsl(${Math.floor(rand(0, 360))},95%,62%)` });
    }
    for (const n of this.npcs) this.updateNpc(n, dt, party);
    for (const q of this.parts) {
      q.t += dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.k === 'fire') {
        q.vx *= 1 - dt * 2.4;
        q.vy -= 60 * dt;
      } else if (q.k === 'cup' && q.y > q.floor) {
        q.y = q.floor;
        q.vx = q.vy = 0;
      } else if (q.k === 'conf') q.rot += dt * 6;
    }
    this.parts = this.parts.filter((q) => q.t < q.life);
  },

  anim(e, dt, speed, dancing) {
    const p = e.pl;
    p.dir = e.dir;
    p.vx = speed;
    p.onGround = true;
    p.runPhase += speed * dt * 0.05;
    p.mood = dancing ? 1 : 0;
    p.blinkT -= dt;
    if (p.blinkT <= 0) {
      p.blink = 0.12;
      p.blinkT = rand(2, 5);
    }
    p.blink = Math.max(0, (p.blink || 0) - dt);
    e.bob = dancing ? Math.abs(Math.sin(this.beatPhase() * Math.PI)) * (this.fx.hit > 0 ? 12 : 6) : 0;
  },

  // Holky v klubu: mluví, když přijdeš, posílají srdíčka, když tančíš, a jdou s tebou tančit.
  updateLady(n, dt, party) {
    const me = this.phase === 'in' ? this.me : null;
    n.lineT = Math.max(0, (n.lineT || 0) - dt);
    n.cool = Math.max(0, (n.cool || 0) - dt);
    const d = me ? Math.hypot(me.x - n.x, (me.y - n.y) * 1.4) : 1e9;
    if (me && d < 120 && n.cool <= 0 && this.follower !== n) {
      n.line = CLUB_GIRL_LINES[Math.floor(Math.random() * CLUB_GIRL_LINES.length)];
      if (me.gear && me.gear.chain && Math.random() < 0.4) n.line = 'Hezkej řetěz!';
      n.lineT = 2.4;
      n.cool = rand(7, 12);
    }
    if (me && d < 200 && (this.dance || party) && Math.random() < dt * 1.6) this.heart(n);
    if (this.follower === n) {
      n.followT -= dt;
      if (n.followT <= 0 || !me) {
        this.follower = null;
        n.back = true;
        return true;
      }
      const tx = me.x - me.dir * 58, ty = me.y + 4;
      const dx = tx - n.x, dy = ty - n.y, dd = Math.hypot(dx, dy);
      if (dd > 26) {
        const sp = Math.min(380, dd * 4);
        this.moveEnt(n, (dx / dd) * sp * dt, (dy / dd) * sp * dt);
        n.dir = dx >= 0 ? 1 : -1;
        this.anim(n, dt, sp, false);
      } else {
        n.dir = me.x >= n.x ? 1 : -1;
        this.anim(n, dt, 0, true);
        if (Math.random() < dt * (this.dance ? 2.4 : 0.8)) this.heart(n);
      }
      return true;
    }
    if (n.back) {
      const dx = n.hx - n.x, dy = n.hy - n.y, dd = Math.hypot(dx, dy);
      if (dd < 14) {
        n.back = false;
        n.tx = undefined;
        return false;
      }
      const ox = n.x, oy = n.y;
      this.moveEnt(n, (dx / dd) * 200 * dt, (dy / dd) * 200 * dt);
      if (Math.hypot(n.x - ox, n.y - oy) < 0.5) {
        n.x = n.hx; // zasekla se: vrátí se rovnou na místo
        n.y = n.hy;
      }
      n.dir = dx >= 0 ? 1 : -1;
      this.anim(n, dt, 200, false);
      return true;
    }
    if (me && d < 140 && !n.podium) n.dir = me.x >= n.x ? 1 : -1;
    return false;
  },

  heart(n) {
    this.parts.push({ k: 'heart', x: n.x + rand(-12, 12), y: n.y - n.lift - (n.pl.R * 2 + n.pl.F) * CLUB_K, vx: rand(-15, 15), vy: -rand(45, 70), t: 0, life: 1.5, s: rand(5, 8) });
  },

  invite(n) {
    if (this.follower && this.follower !== n) this.follower.back = true;
    this.follower = n;
    n.back = false;
    n.followT = 25;
    n.line = 'Jdeme na to!';
    n.lineT = 2;
    n.cool = 10;
    for (let i = 0; i < 4; i++) this.heart(n);
    Sound.click();
    UI.toast(`${n.look.name} s tebou jde tančit 💃`);
    this._zoneKey = '';
  },

  updateNpc(n, dt, party) {
    if (n.lady && !n.staff && this.updateLady(n, dt, party)) return;
    if (n.staff) {
      const near = this.me && this.phase === 'in' && Math.hypot(this.me.x - n.x, this.me.y - n.y) < 230;
      if (n.dj) {
        n.dir = this.beatN % 4 < 2 ? 1 : -1;
        this.anim(n, dt, 0, true);
      } else {
        if (near) n.dir = this.me.x >= n.x ? 1 : -1;
        this.anim(n, dt, 0, party);
      }
      n.talk = near && this.zone && this.zone.id === n.staff;
      return;
    }
    if (n.dancer) {
      // tanec: pohupování, otočky do rytmu, občas krok
      if (this.beatN !== n.lastBeat) {
        n.lastBeat = this.beatN;
        if (Math.random() < (party ? 0.6 : 0.3)) n.dir = -n.dir;
        if (Math.random() < 0.25 && !n.podium) {
          n.tx = n.hx + rand(-30, 30);
          n.ty = n.hy + rand(-20, 20);
        }
      }
      if (n.tx !== undefined) {
        n.x = approach(n.x, n.tx, 60 * dt);
        n.y = approach(n.y, n.ty, 40 * dt);
      }
      this.anim(n, dt, 0, true);
      return;
    }
    if (n.walker) {
      if (n.wait > 0) {
        n.wait -= dt;
        this.anim(n, dt, 0, party);
        return;
      }
      if (!n.tx || Math.hypot(n.tx - n.x, n.ty - n.y) < 12) {
        for (let i = 0; i < 20; i++) {
          const x = rand(220, 1060), y = rand(330, 900);
          if (!this.solid(x, y, CLUB_R) && !(x > CLUB_DANCE.x0 && x < CLUB_DANCE.x1 && y > CLUB_DANCE.y0 && y < CLUB_DANCE.y1)) {
            n.tx = x;
            n.ty = y;
            break;
          }
        }
        n.wait = rand(0.6, 2.5);
        return;
      }
      const dx = n.tx - n.x, dy = n.ty - n.y, d = Math.hypot(dx, dy), sp = 130;
      const ox = n.x, oy = n.y;
      this.moveEnt(n, (dx / d) * sp * dt, (dy / d) * sp * dt);
      if (Math.hypot(n.x - ox, n.y - oy) < sp * dt * 0.3) n.tx = 0; // zasekl se
      n.dir = dx >= 0 ? 1 : -1;
      this.anim(n, dt, sp, false);
      return;
    }
    this.anim(n, dt, 0, party); // stojí (třeba u baru)
  },

  spawnFire(e, dt) {
    const k = CLUB_K, head = e.y - (e.pl.R + e.pl.F) * k - e.bob;
    const mx = e.x + e.dir * 28 * PS * k, my = head + 14 * PS * k;
    for (let i = 0; i < 3; i++) {
      if (Math.random() > dt * 70) continue;
      this.parts.push({ k: 'fire', x: mx, y: my, vx: e.dir * rand(260, 380), vy: rand(-40, 30), t: 0, life: rand(0.35, 0.6), s: rand(5, 10) });
    }
  },

  findZone() {
    const me = this.me, vip = this.state().vip;
    let best = null, bd = Infinity;
    for (const z of CLUB_ZONES) {
      if (z.id === 'vip' && vip) continue;
      if (z.id === 'lounge' && !vip) continue;
      const d = Math.hypot(me.x - z.x, (me.y - z.y) * 1.3);
      if (d < z.r && d < bd) {
        best = z;
        bd = d;
      }
    }
    if (!best) {
      let gd = 80;
      for (const n of this.npcs) {
        if (!n.lady || n.staff || n.podium || n.back || n === this.follower) continue;
        const d = Math.hypot(me.x - n.x, (me.y - n.y) * 1.4);
        if (d < gd) {
          gd = d;
          best = { id: 'girl', label: 'Zatančit spolu', n };
        }
      }
    }
    const onFloor = me.x > CLUB_DANCE.x0 && me.x < CLUB_DANCE.x1 && me.y > CLUB_DANCE.y0 && me.y < CLUB_DANCE.y1;
    if (!best && onFloor) best = { id: 'dance', label: this.dance ? 'Dost' : 'Tančit' };
    const key = best ? best.id + best.label + (best.n ? best.n.id : '') : '';
    if (key !== this._zoneKey) {
      this._zoneKey = key;
      const btn = this.el('club-act');
      btn.hidden = !best;
      if (best) this.el('club-act-lbl').textContent = best.label;
    }
    this.zone = best;
  },

  act() {
    const z = this.zone;
    if (!z || this.phase !== 'in') return;
    if (z.id === 'exit') this.leave();
    else if (z.id === 'girl') this.invite(z.n);
    else if (z.id === 'dance') {
      this.dance = !this.dance;
      this._zoneKey = '';
    } else this.openShop(z.id);
  },

  /* ---------- obchod ---------- */

  openShop(id) {
    const S = CLUB_SHOP[id];
    if (!S) return;
    this.shopOpen = id;
    this.stick.id = null;
    this.el('club-shop-title').textContent = S.title;
    this.renderShop();
    this.el('club-shop').hidden = false;
    Sound.click();
  },
  closeShop() {
    this.shopOpen = '';
    const el = this.el && this.el('club-shop');
    if (el) el.hidden = true;
  },
  renderShop() {
    const S = CLUB_SHOP[this.shopOpen];
    if (!S) return;
    const s = this.state(), have = Profile.get().trophies;
    this.el('club-shop-items').innerHTML = S.items.map((it) => {
      const owned = it.once && (it.id === 'vip' ? s.vip : s.own[it.id]);
      let btn;
      if (owned && it.gear) btn = `<button type="button" class="club-buy ${s.wear[it.id] ? 'on' : ''}" data-item="${it.id}">${s.wear[it.id] ? 'Sundat' : 'Nasadit'}</button>`;
      else if (owned) btn = '<span class="club-owned">Máš ✓</span>';
      else btn = `<button type="button" class="club-buy" data-item="${it.id}" ${have < it.price ? 'data-poor="1"' : ''}><span aria-hidden="true">🏆</span> ${it.price}</button>`;
      const run = this.fx[it.id] > 0 ? ' running' : '';
      return `<div class="club-item${run}"><span class="club-ico" aria-hidden="true">${it.icon}</span><div class="club-it"><b>${it.name}</b><span>${it.desc}</span></div>${btn}</div>`;
    }).join('');
  },
  buy(itemId) {
    const S = CLUB_SHOP[this.shopOpen];
    const it = S && S.items.find((x) => x.id === itemId);
    if (!it) return;
    const s = this.state();
    if (it.once && it.gear && s.own[it.id]) {
      // nasadit / sundat
      s.wear[it.id] = !s.wear[it.id];
      this.save(s);
      this.applyGear();
      Sound.click();
      this.renderShop();
      return;
    }
    if (it.once && (it.id === 'vip' ? s.vip : s.own[it.id])) return;
    const prof = Profile.get();
    if (prof.trophies < it.price) {
      UI.toast(`Na ${it.name} potřebuješ ${it.price} pohárů. Máš ${prof.trophies}.`);
      Sound.beep(false);
      return;
    }
    prof.trophies -= it.price;
    Profile.save(prof);
    if (it.id === 'vip') {
      s.vip = true;
      this.save(s);
      UI.toast('Jsi VIP! Ochranka tě pustí dál. 💎');
      this.closeShop();
    } else if (it.gear) {
      s.own[it.id] = true;
      s.wear[it.id] = true;
      this.save(s);
      this.applyGear();
      UI.toast(`${it.name} – nasazeno!`);
    } else {
      this.fx[it.id] = it.t;
      if (it.id === 'hit') this.pulse = 1;
      UI.toast(`${it.icon} ${it.name}!`);
      this.closeShop();
    }
    Sound.fanfare();
    this.renderTro();
    if (this.shopOpen) this.renderShop();
    // poháry se hned propíšou do žebříčku a účtu
    if (Board.nick()) Board.publish();
    if (Account.logged) setTimeout(() => Account.sync(), 800);
  },
  applyGear() {
    if (!this.me) return;
    const w = this.state().wear;
    this.me.gear = { shades: !!w.shades, chain: !!w.chain, crown: !!w.crown };
  },

  /* ---------- hudba (skládaná ve Web Audio) ---------- */

  bpm() {
    return this.fx.hit > 0 ? 128 : 122;
  },
  beatPhase() {
    return this.beatPos % 1;
  },
  startMusic(muffled) {
    this.beatPos = this.beatPos || 0;
    const c = Sound.ctx;
    if (!c) return;
    if (!this.mg) {
      this.lp = c.createBiquadFilter();
      this.lp.type = 'lowpass';
      this.mg = c.createGain();
      this.mg.gain.value = 0;
      this.lp.connect(this.mg);
      this.mg.connect(Sound.master);
      this.next = c.currentTime + 0.08;
      this.step = 0;
    }
    // u vchodu (výběr postavy) hudba duní jen přes zeď
    this.lp.frequency.setTargetAtTime(muffled ? 420 : 16000, c.currentTime, 0.15);
    this.mg.gain.setTargetAtTime(muffled ? 0.5 : 0.42, c.currentTime, 0.15);
  },
  stopMusic() {
    if (!this.mg) return;
    const c = Sound.ctx, g = this.mg, lp = this.lp;
    g.gain.setTargetAtTime(0, c.currentTime, 0.08);
    setTimeout(() => { try { g.disconnect(); lp.disconnect(); } catch (e) { /* nevadí */ } }, 600);
    this.mg = null;
    this.lp = null;
  },
  pump() {
    const c = Sound.ctx;
    const spb = 60 / this.bpm() / 4;
    if (!c || !this.mg) {
      // bez zvuku: rytmus jen pro světla
      this.beatPos = (this.beatPos || 0) + (1 / 60) * (this.bpm() / 60);
      const n = Math.floor(this.beatPos);
      if (n !== this.beatN) {
        this.beatN = n;
        this.pulse = Math.max(this.pulse, this.fx.hit > 0 ? 1 : 0.55);
      }
      return;
    }
    if (this.next < c.currentTime - 0.2) this.next = c.currentTime + 0.05;
    while (this.next < c.currentTime + 0.14) {
      this.playStep(this.step, this.next);
      if (this.step % 4 === 0) (this.beats = this.beats || []).push({ t: this.next, n: this.step / 4 });
      this.next += spb;
      this.step = (this.step + 1) % 64;
    }
    // světla do rytmu podle toho, co právě hraje
    while (this.beats && this.beats.length && this.beats[0].t <= c.currentTime) {
      const b = this.beats.shift();
      this.beatN++;
      this.pulse = Math.max(this.pulse, this.fx.hit > 0 ? 1 : 0.55);
      this._beatAt = b.t;
    }
    this.beatPos = this.beatN + clamp((c.currentTime - (this._beatAt || 0)) / (spb * 4), 0, 0.999);
  },
  playStep(s, t) {
    const c = Sound.ctx, out = this.lp, party = this.fx.hit > 0;
    const env = (g, peak, a, d) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    };
    const osc = (type, f0, f1, dur, vol, dest = out) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      env(g, vol, 0.004, dur);
      o.connect(g);
      g.connect(dest);
      o.start(t);
      o.stop(t + dur + 0.05);
    };
    const noise = (type, freq, dur, vol) => {
      const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      n.buffer = Sound.noise;
      f.type = type;
      f.frequency.value = freq;
      env(g, vol, 0.002, dur);
      n.connect(f);
      f.connect(g);
      g.connect(out);
      n.start(t, Math.random());
      n.stop(t + dur + 0.05);
    };
    const q = s % 16;
    if (q % 4 === 0) osc('sine', 155, 44, 0.22, 0.95); // kopák
    if (q % 4 === 2) noise('highpass', 7500, party ? 0.14 : 0.09, 0.16); // hi-hat
    if (party && q % 2 === 1) noise('highpass', 9000, 0.03, 0.07);
    if (q === 4 || q === 12) noise('bandpass', 1600, 0.14, party ? 0.42 : 0.26); // tlesk
    // basa: Am – F – C – G
    const root = [55, 43.65, 65.41, 49][Math.floor(s / 16) % 4];
    if (q % 4 === 2 || q === 15) osc('sawtooth', root * 2, 0, 0.16, 0.16);
    if (q % 4 === 2) osc('triangle', root, 0, 0.18, 0.3);
    // akordy (víc, když jede hit)
    if ((party && q % 4 === 3) || q === 3 || q === 11) {
      const ch = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 261.6, 329.6], [196, 246.9, 293.7]][Math.floor(s / 16) % 4];
      for (const f of ch) osc('square', f * 2, 0, 0.1, 0.035);
    }
  },

  /* ---------- kreslení ---------- */

  scale() {
    return this.cv.height / CLUB_VIEW_H;
  },

  draw(now) {
    const cv = this.cv, ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round((cv.clientWidth || 800) * dpr), h = Math.round((cv.clientHeight || 400) * dpr);
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
    }
    const sc = this.scale();
    const vw = w / sc;
    const cx = vw >= CLUB_W ? CLUB_W / 2 : clamp(this.cam.x, vw / 2, CLUB_W - vw / 2);
    const cy = clamp(this.cam.y, CLUB_VIEW_H / 2 - 30, CLUB_H - CLUB_VIEW_H / 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#07040d';
    ctx.fillRect(0, 0, w, h);
    ctx.setTransform(sc, 0, 0, sc, w / 2 - cx * sc, h / 2 - cy * sc);
    this.view = { x0: cx - vw / 2, x1: cx + vw / 2, y0: cy - CLUB_VIEW_H / 2, y1: cy + CLUB_VIEW_H / 2 };
    this.drawRoom(ctx, now);
    // věci a lidi seřazené podle hloubky
    const list = [];
    for (const q of CLUB_RECTS) if (q.kind !== 'rope') list.push({ y: q.y1, f: () => this.drawProp(ctx, q, now) });
    if (!this.state().vip) list.push({ y: CLUB_GATE.y1, f: () => this.drawGate(ctx) });
    this.drawRopes(ctx);
    for (const t of CLUB_TABLES) list.push({ y: t.y + 8, f: () => this.drawTable(ctx, t, now) });
    for (const q of CLUB_PODIUMS) list.push({ y: q.y - 0.5, f: () => this.drawPodium(ctx, q, now) });
    for (const n of this.npcs) if (n.staff !== 'wardrobe') list.push({ y: n.y, f: () => this.drawChar(ctx, n, now) });
    if (this.me && this.phase === 'in') list.push({ y: this.me.y, f: () => this.drawChar(ctx, this.me, now) });
    for (const q of this.parts) if (q.k === 'cup' && q.vy === 0) list.push({ y: q.y, f: () => this.drawPart(ctx, q) });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.f();
    for (const q of this.parts) if (!(q.k === 'cup' && q.vy === 0)) this.drawPart(ctx, q);
    this.drawLights(ctx, now);
    // bubliny obsluhy
    for (const n of this.npcs) {
      const text = n.talk && n.say ? n.say : n.lineT > 0 ? n.line : '';
      if (text) drawSpeech(ctx, text, n.x, n.y - n.lift - (n.pl.R + n.pl.F) * CLUB_K - 34, n.lady ? '#ff4d9a' : '#ff3d5a', 15, 0);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // strobo při hitu
    if (this.fx.hit > 0 && this.pulse > 0.6) {
      ctx.fillStyle = `rgba(255,255,255,${(this.pulse - 0.6) * 0.35})`;
      ctx.fillRect(0, 0, w, h);
    }
    const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    if (this.phase === 'in') this.drawStick(ctx, dpr);
  },

  drawRoom(ctx, now) {
    const beat = this.pulse, party = this.fx.hit > 0, vip = this.state().vip;
    // podlaha
    const fg = ctx.createLinearGradient(0, CLUB_WALL, 0, CLUB_H);
    fg.addColorStop(0, '#1d1030');
    fg.addColorStop(1, '#0f0818');
    ctx.fillStyle = fg;
    ctx.fillRect(0, CLUB_WALL, CLUB_W, CLUB_H - CLUB_WALL);
    ctx.strokeStyle = 'rgba(255,255,255,.035)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= CLUB_W; x += 75) line(ctx, x, CLUB_WALL, x, CLUB_FLOOR_B);
    for (let y = CLUB_WALL; y <= CLUB_FLOOR_B; y += 50) line(ctx, 0, y, CLUB_W, y);
    // VIP koberec
    ctx.fillStyle = vip ? '#3a0f1c' : '#2a0c16';
    ctx.fillRect(1116, CLUB_WALL, 354, 462);
    ctx.strokeStyle = 'rgba(255,201,60,.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(1128, CLUB_WALL + 10, 330, 440);
    // taneční parket: LED dlaždice do rytmu
    const D = CLUB_DANCE, cols = 8, rows = 6, tw = (D.x1 - D.x0) / cols, th = (D.y1 - D.y0) / rows;
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(D.x0 - 8, D.y0 - 8, D.x1 - D.x0 + 16, D.y1 - D.y0 + 16);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const hue = (i * 37 + j * 53 + this.beatN * (party ? 90 : 45)) % 360;
        const lit = ((i + j + this.beatN) % 3 === 0 ? 0.55 : 0.18) + beat * 0.35;
        ctx.fillStyle = `hsla(${hue},95%,${party ? 58 : 50}%,${Math.min(1, lit)})`;
        rrect(ctx, D.x0 + i * tw + 3, D.y0 + j * th + 3, tw - 6, th - 6, 6);
        ctx.fill();
      }
    }
    // zadní stěna
    const wg = ctx.createLinearGradient(0, 0, 0, CLUB_WALL);
    wg.addColorStop(0, '#120a1d');
    wg.addColorStop(1, '#22123a');
    ctx.fillStyle = wg;
    ctx.fillRect(0, 0, CLUB_W, CLUB_WALL);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(0, CLUB_WALL - 10, CLUB_W, 10);
    // police s lahvemi nad barem
    for (const sy of [62, 112]) {
      ctx.fillStyle = '#3b2a1c';
      ctx.fillRect(60, sy, 380, 6);
      for (let i = 0; i < 13; i++) {
        const bx = 74 + i * 28, hue = (i * 67) % 360;
        ctx.fillStyle = `hsla(${hue},70%,55%,.85)`;
        rrect(ctx, bx, sy - 30, 14, 30, 4);
        ctx.fill();
        ctx.fillRect(bx + 4, sy - 40, 6, 12);
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.fillRect(bx + 3, sy - 26, 2.5, 18);
      }
    }
    // LED stěna za DJem s ekvalizérem
    ctx.fillStyle = '#05030a';
    rrect(ctx, 580, 14, 340, 118, 10);
    ctx.fill();
    for (let i = 0; i < 20; i++) {
      const hgt = 14 + Math.abs(Math.sin(i * 1.7 + this.beatPos * 3.1)) * 70 * (0.5 + beat * 0.6);
      ctx.fillStyle = `hsl(${(i * 14 + this.beatN * 30) % 360},95%,60%)`;
      ctx.fillRect(594 + i * 16.4, 124 - hgt, 11, hgt);
    }
    // neon HOT PEPPERS (bliká do rytmu)
    this.drawSign(ctx, 750, 0, beat, now);
    // VIP stěna se zlatými panely
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? '#2a1a08' : '#3a2408';
      ctx.fillRect(1130 + i * 66, 20, 60, 120);
      ctx.strokeStyle = 'rgba(255,201,60,.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(1136 + i * 66, 28, 48, 104);
    }
    this.neonText(ctx, 'VIP', 1290, 84, 44, '#ffc93c', beat);
    this.neonText(ctx, 'BAR', 250, 26, 26, '#4fe0ff', beat);
    // spodní stěna s východem
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, CLUB_FLOOR_B, CLUB_W, CLUB_H - CLUB_FLOOR_B);
    ctx.fillStyle = '#1b1028';
    ctx.fillRect(690, CLUB_FLOOR_B - 4, 120, 44);
    this.neonText(ctx, 'EXIT', 750, CLUB_FLOOR_B + 22, 20, '#3dff7a', 0.3);
    // boční stěny
    ctx.fillStyle = '#0d0716';
    ctx.fillRect(0, CLUB_WALL, 30, CLUB_FLOOR_B - CLUB_WALL);
    ctx.fillRect(CLUB_W - 30, CLUB_WALL, 30, CLUB_FLOOR_B - CLUB_WALL);
  },

  neonText(ctx, text, x, y, size, col, beat) {
    ctx.save();
    ctx.font = `${size}px ${FONT_D}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = hexA(col, 0.18 + beat * 0.15);
    ctx.lineWidth = size * 0.5;
    ctx.strokeText(text, x, y);
    ctx.strokeStyle = hexA(col, 0.35);
    ctx.lineWidth = size * 0.22;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);
    ctx.restore();
  },

  drawSign(ctx, x, y, beat, now) {
    const flick = Math.sin(now * 0.031) > 0.97 ? 0.4 : 1;
    // nápis vlevo od DJe, paprička vpravo
    ctx.save();
    ctx.globalAlpha = flick;
    this.neonText(ctx, 'HOT', 488, 52, 40, '#ff3d5a', beat);
    this.neonText(ctx, 'PEPPERS', 488, 100, 30, '#ff3d5a', beat);
    // paprička
    ctx.translate(1010, 72);
    ctx.rotate(0.35);
    ctx.strokeStyle = hexA('#ff3d5a', 0.3 + beat * 0.2);
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-26, -6);
    ctx.quadraticCurveTo(0, 30, 32, 26);
    ctx.stroke();
    ctx.strokeStyle = '#ff5a6e';
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = '#3dff7a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-26, -6);
    ctx.quadraticCurveTo(-34, -16, -26, -24);
    ctx.stroke();
    ctx.restore();
  },

  // Pult, DJ pult, reproduktory, šatna, gauč: krabice se šikmou horní stranou.
  drawProp(ctx, q, now) {
    const box = (x0, y0, x1, y1, h, top, front, edge) => {
      ctx.fillStyle = front;
      ctx.fillRect(x0, y1 - h, x1 - x0, h);
      ctx.fillStyle = top;
      ctx.fillRect(x0, y0 - h, x1 - x0, y1 - y0);
      if (edge) {
        ctx.fillStyle = edge;
        ctx.fillRect(x0, y1 - h - 4, x1 - x0, 4);
      }
    };
    if (q.kind === 'bar') {
      box(q.x0, q.y0, q.x1, q.y1, 40, '#5a3a22', '#2a1a10', '#ffc93c');
      ctx.fillStyle = hexA('#4fe0ff', 0.5 + this.pulse * 0.4);
      ctx.fillRect(q.x0, q.y1 - 8, q.x1 - q.x0, 4);
      // židličky
      for (let x = q.x0 + 40; x < q.x1; x += 75) {
        ctx.fillStyle = '#111';
        ctx.fillRect(x - 2, q.y1 + 4, 4, 22);
        ctx.fillStyle = '#c0283d';
        oval(ctx, x, q.y1 + 4, 15, 6);
        ctx.fill();
      }
    } else if (q.kind === 'dj') {
      box(q.x0, q.y0, q.x1, q.y1, 52, '#202634', '#111521', null);
      ctx.fillStyle = `hsl(${(this.beatN * 40) % 360},95%,60%)`;
      ctx.fillRect(q.x0 + 10, q.y1 - 30, q.x1 - q.x0 - 20, 6);
      for (const dx of [40, 180]) {
        ctx.fillStyle = '#0b0d14';
        circle(ctx, q.x0 + dx, q.y0 - 34, 22);
        ctx.fill();
        ctx.strokeStyle = '#3a4152';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = '#8a93a8';
        line(ctx, q.x0 + dx, q.y0 - 34, q.x0 + dx + Math.cos(now * 0.01 + dx) * 18, q.y0 - 34 + Math.sin(now * 0.01 + dx) * 18);
      }
    } else if (q.kind === 'speaker') {
      box(q.x0, q.y0, q.x1, q.y1, 120, '#1a1d26', '#10121a', null);
      const k = 1 + this.pulse * 0.12;
      for (const [dy, r] of [[-86, 16], [-38, 22]]) {
        ctx.fillStyle = '#05060a';
        circle(ctx, (q.x0 + q.x1) / 2, q.y1 + dy, r * k);
        ctx.fill();
        ctx.strokeStyle = '#3a4152';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    } else if (q.kind === 'wardrobe') {
      // věšák s oblečením vzadu, šatnářka a pult vepředu
      const rx0 = q.x0 + 10, rx1 = q.x1 - 10, ry = q.y0 - 70;
      ctx.fillStyle = '#8a93a8';
      ctx.fillRect(rx0, ry, rx1 - rx0, 5);
      ctx.fillRect(rx0, ry, 5, 74);
      ctx.fillRect(rx1 - 5, ry, 5, 74);
      const cols = ['#ff7ad9', '#4fe0ff', '#ffc93c', '#f7f8fa', '#7a5cff', '#22c47a', '#ff5a3d'];
      for (let i = 0; i < 9; i++) {
        const x = rx0 + 16 + i * ((rx1 - rx0 - 32) / 8);
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath();
        ctx.moveTo(x - 4, ry + 6);
        ctx.lineTo(x + 4, ry + 6);
        ctx.lineTo(x + 12, ry + 52);
        ctx.lineTo(x - 12, ry + 52);
        ctx.closePath();
        ctx.fill();
      }
      this.neonText(ctx, 'ŠATNA', (q.x0 + q.x1) / 2, ry - 26, 24, '#ff7ad9', this.pulse);
      for (const n of this.npcs) if (n.staff === 'wardrobe') this.drawChar(ctx, n, now);
      box(q.x0, q.y1 - 40, q.x1, q.y1, 40, '#4a3a5e', '#251c33', '#ff7ad9');
    } else if (q.kind === 'sofa') {
      box(q.x0, q.y0, q.x1, q.y1, 40, '#c8961c', '#8a6200', '#ffe08a');
      ctx.fillStyle = '#b8860b';
      rrect(ctx, q.x0, q.y0 - 80, q.x1 - q.x0, 44, 14);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      for (let x = q.x0 + 30; x < q.x1; x += 60) {
        circle(ctx, x, q.y0 - 58, 4);
        ctx.fill();
      }
    }
  },

  drawRopes(ctx) {
    const posts = [[1110, 160], [1110, 380], [1110, 470], [1110, 618], [1290, 618], [1462, 618]];
    ctx.strokeStyle = '#c0283d';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    const rope = (a, b) => {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1] - 36);
      ctx.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 16, b[0], b[1] - 36);
      ctx.stroke();
    };
    rope(posts[0], posts[1]);
    rope(posts[2], posts[3]);
    rope(posts[3], posts[4]);
    rope(posts[4], posts[5]);
    for (const [x, y] of posts) {
      ctx.fillStyle = '#c8961c';
      ctx.fillRect(x - 3, y - 40, 6, 40);
      circle(ctx, x, y - 42, 6);
      ctx.fill();
    }
  },

  drawGate(ctx) {
    ctx.strokeStyle = '#c0283d';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(1110, 344);
    ctx.quadraticCurveTo(1100, 410, 1110, 434);
    ctx.stroke();
  },

  // Kulaté pódium s neonovým okrajem.
  drawPodium(ctx, q, now) {
    const h = 34, r = 46;
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    oval(ctx, q.x, q.y + 6, r + 6, 16);
    ctx.fill();
    ctx.fillStyle = '#1c1228';
    ctx.fillRect(q.x - r, q.y - h, r * 2, h);
    oval(ctx, q.x, q.y, r, 15);
    ctx.fill();
    const hue = (this.beatN * 50 + q.x) % 360;
    ctx.strokeStyle = `hsla(${hue},100%,62%,${0.6 + this.pulse * 0.4})`;
    ctx.lineWidth = 3;
    oval(ctx, q.x, q.y - h, r, 15);
    ctx.stroke();
    ctx.fillStyle = '#2a1c3c';
    oval(ctx, q.x, q.y - h, r - 2, 13);
    ctx.fill();
    ctx.strokeStyle = `hsla(${hue},100%,62%,.5)`;
    ctx.lineWidth = 2;
    line(ctx, q.x - r, q.y - h + 6, q.x - r, q.y - 2);
    line(ctx, q.x + r, q.y - h + 6, q.x + r, q.y - 2);
  },

  drawTable(ctx, t, now) {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    oval(ctx, t.x, t.y + 4, 30, 11);
    ctx.fill();
    ctx.fillStyle = '#2b2236';
    ctx.fillRect(t.x - 4, t.y - 40, 8, 42);
    ctx.fillStyle = t.vip ? '#c8961c' : '#3b2f52';
    oval(ctx, t.x, t.y - 42, 30, 12);
    ctx.fill();
    ctx.strokeStyle = t.vip ? '#ffe08a' : hexA('#ff7ad9', 0.6);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // svíčka / sklenka
    ctx.fillStyle = hexA('#ffc93c', 0.8 + Math.sin(now * 0.01 + t.x) * 0.2);
    circle(ctx, t.x + 8, t.y - 48, 3);
    ctx.fill();
  },

  drawChar(ctx, e, now) {
    const k = CLUB_K, p = e.pl;
    // stín
    ctx.fillStyle = 'rgba(0,0,0,.38)';
    oval(ctx, e.x, e.y - e.lift, 26, 8);
    ctx.fill();
    if (e.me && this.fx.neon > 0) {
      const g = ctx.createRadialGradient(e.x, e.y - 40, 6, e.x, e.y - 40, 80);
      g.addColorStop(0, `hsla(${(now * 0.25) % 360},100%,60%,.55)`);
      g.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = g;
      ctx.fillRect(e.x - 80, e.y - 120, 160, 160);
    }
    if (e.me) {
      // kroužek pod mým hráčem
      ctx.strokeStyle = 'rgba(255,201,60,.85)';
      ctx.lineWidth = 3;
      oval(ctx, e.x, e.y, 30, 10);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(e.x, e.y - e.bob - e.lift);
    // holky se při tanci vlní v bocích
    if (e.lady && p.mood > 0) ctx.rotate(Math.sin(this.beatPos * Math.PI) * 0.09);
    ctx.scale(k, k);
    p.x = 0;
    p.y = -(p.R + p.F);
    p.gear = e.gear || null;
    Renderer.drawPlayer(ctx, p, { x: p.dir * 300, y: p.y - 20 }, [e.kit, e.kit], now);
    ctx.restore();
    if (e.dj) {
      // sluchátka DJe
      const hy = e.y - e.bob - (p.R + p.F) * k;
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(e.x, hy, p.R * k + 2, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.fillStyle = '#ff3d5a';
      for (const s of [-1, 1]) {
        rrect(ctx, e.x + s * (p.R * k) - 5, hy - 6, 10, 14, 4);
        ctx.fill();
      }
    }
    if (e.me && this.phase === 'in') {
      ctx.font = `14px ${FONT_D}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffc93c';
      ctx.strokeStyle = '#0b1220';
      ctx.lineWidth = 4;
      const ty = e.y - e.bob - (p.R * 2 + p.F) * k - 10;
      ctx.strokeText('TY', e.x, ty);
      ctx.fillText('TY', e.x, ty);
    }
  },

  drawPart(ctx, q) {
    const a = 1 - q.t / q.life;
    if (q.k === 'fire') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const s = q.s * (1 + q.t * 3);
      ctx.fillStyle = `rgba(255,${Math.floor(200 * a)},40,${a * 0.85})`;
      circle(ctx, q.x, q.y, s);
      ctx.fill();
      ctx.restore();
    } else if (q.k === 'heart') {
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.translate(q.x, q.y);
      const s = q.s / 6;
      ctx.scale(s, s);
      ctx.fillStyle = '#ff4d8a';
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.bezierCurveTo(-9, -2, -5, -10, 0, -5);
      ctx.bezierCurveTo(5, -10, 9, -2, 0, 5);
      ctx.fill();
      ctx.restore();
    } else if (q.k === 'bub') {
      ctx.strokeStyle = `rgba(200,240,255,${a})`;
      ctx.lineWidth = 1.5;
      circle(ctx, q.x, q.y, q.s);
      ctx.stroke();
    } else if (q.k === 'cup') {
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 3);
      ctx.translate(q.x, q.y);
      ctx.rotate(q.vy ? q.rot : 0);
      ctx.fillStyle = '#ffc93c';
      ctx.strokeStyle = '#8a6200';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8, -16);
      ctx.lineTo(8, -16);
      ctx.quadraticCurveTo(8, -4, 0, -2);
      ctx.quadraticCurveTo(-8, -4, -8, -16);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-2, -3, 4, 6);
      ctx.fillRect(-6, 2, 12, 3);
      ctx.restore();
    } else if (q.k === 'conf') {
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(q.rot);
      ctx.fillStyle = q.col;
      ctx.globalAlpha = Math.min(1, a * 2);
      ctx.fillRect(-4, -2, 8, 4);
      ctx.restore();
    }
  },

  // Barevné reflektory nad parketem.
  drawLights(ctx, now) {
    const party = this.fx.hit > 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const n = party ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const sx = 600 + i * (300 / Math.max(1, n - 1)), sy = CLUB_WALL - 20;
      const ang = Math.sin(now * 0.0007 * (1 + i * 0.3) + i * 2) * 0.7;
      const tx = sx + Math.sin(ang) * 520, ty = sy + Math.cos(ang) * 480;
      const hue = (i * 90 + this.beatN * (party ? 60 : 20)) % 360;
      const g = ctx.createLinearGradient(sx, sy, tx, ty);
      g.addColorStop(0, `hsla(${hue},100%,60%,${0.22 + this.pulse * 0.12})`);
      g.addColorStop(1, `hsla(${hue},100%,60%,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      const px = -(ty - sy), py = tx - sx, pl = Math.hypot(px, py) || 1;
      ctx.lineTo(tx + (px / pl) * 70, ty + (py / pl) * 70);
      ctx.lineTo(tx - (px / pl) * 70, ty - (py / pl) * 70);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `hsla(${hue},100%,60%,${0.12 + this.pulse * 0.08})`;
      oval(ctx, tx, ty, 74, 26);
      ctx.fill();
    }
    ctx.restore();
  },

  drawStick(ctx, dpr) {
    const st = this.stick, r = this.cv.getBoundingClientRect();
    let ox, oy, kx, ky, alpha;
    if (st.id !== null) {
      ox = st.ox - r.left;
      oy = st.oy - r.top;
      const dx = st.x - st.ox, dy = st.y - st.oy, d = Math.hypot(dx, dy), m = Math.min(1, 46 / (d || 1));
      kx = ox + dx * m;
      ky = oy + dy * m;
      alpha = 0.9;
    } else {
      if (!Touch.enabled) return;
      ox = kx = Math.max(90, r.width * 0.13);
      oy = ky = r.height - Math.max(90, r.height * 0.24);
      alpha = 0.45;
    }
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 3;
    circle(ctx, ox, oy, 58);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffc93c';
    ctx.strokeStyle = '#0b1220';
    circle(ctx, kx, ky, 26);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },
};
