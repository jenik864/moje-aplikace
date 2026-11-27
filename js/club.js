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
// styly hudby u DJe
const CLUB_STYLES = {
  house: { name: 'House', bpm: 122, icon: '🏠', desc: 'Klasika klubu: rovný kopák a basa.' },
  techno: { name: 'Techno', bpm: 132, icon: '⚡', desc: 'Rychlé, tvrdé a temné.' },
  hiphop: { name: 'Hip-hop', bpm: 92, icon: '🎤', desc: 'Pomalý groove a těžká 808 basa.' },
  reggaeton: { name: 'Reggaeton', bpm: 96, icon: '🌴', desc: 'Dembow rytmus, ať se vlní boky.' },
};

// Co se dá koupit (cena v pohárech).
const CLUB_SHOP = {
  bar: {
    title: 'Bar', who: 'Co to bude?',
    items: [
      { id: 'pivo', icon: '🍺', name: 'Točený pivo', price: 2, drink: 0.4, desc: 'Základ. +0,4 ‰' },
      { id: 'tuzemak', icon: '🥃', name: 'Panák tuzemáku', price: 3, drink: 0.7, desc: 'Pálí to jak čert. +0,7 ‰' },
      { id: 'zelena', icon: '🟢', name: 'Zelená', price: 3, drink: 0.6, desc: 'Bylinková klasika z vesnický zábavy. +0,6 ‰' },
      { id: 'kybl', icon: '🪣', name: 'Kýbl', price: 10, drink: 1.4, desc: 'Celej kýbl míchanýho. Pro opravdový hovada. +1,4 ‰' },
      { id: 'shot', icon: '🌶️', name: 'Pepper shot', price: 5, t: 10, drink: 0.5, desc: 'Pálivý panák podniku – 10 s chrlíš oheň. +0,5 ‰' },
      { id: 'limo', icon: '🥤', name: 'Limo Hlavička', price: 3, t: 12, desc: 'Bublinky až do nosu – 12 s běháš rychleji. Vystřízlivíš.', sober: 0.5 },
      { id: 'neon', icon: '🍹', name: 'Neonový koktejl', price: 8, t: 15, drink: 0.5, desc: '15 s záříš ve všech barvách klubu. +0,5 ‰' },
    ],
  },
  dj: {
    title: 'DJ pult', who: 'Chceš bombu?',
    items: [
      { id: 'hit', icon: '🎧', name: 'Pustit hit', price: 15, t: 20, desc: 'DJ pustí pecku: lasery, dým, konfety a celý klub 20 s šílí.' },
      ...Object.keys(CLUB_STYLES).map((k) => ({ id: 'st_' + k, style: k, icon: CLUB_STYLES[k].icon, name: CLUB_STYLES[k].name, price: 0, desc: CLUB_STYLES[k].desc })),
    ],
  },
  vip: {
    title: 'VIP', who: 'Jen pro VIP!',
    items: [{ id: 'vip', icon: '💎', name: 'Vstup do VIP', price: 60, once: true, desc: 'Natrvalo. Zlatý gauč a VIP bar s deštěm pohárků.' }],
  },
  dealer: {
    title: 'Dealer u záchodů', who: 'Psst… chceš něco?',
    items: [
      { id: 'pepr', icon: '❄️', name: 'Pepřák', price: 15, trip: 'pepr', t: 20, desc: 'Bílej prášek z dílny podniku (jen ve hře). 20 s jedeš jak raketa, pak dojezd.' },
      { id: 'smajl', icon: '💊', name: 'Smajlík', price: 10, trip: 'smajl', t: 25, desc: 'Barevná pilulka (jen ve hře). 25 s miluješ celej klub, pak únava.' },
      { id: 'houba', icon: '🍄', name: 'Kouzelná houbička', price: 12, trip: 'houba', t: 25, desc: 'Celej klub se vlní a přelévá v barvách (jen ve hře). Pak máš 15 s ovládání naruby.' },
      { id: 'zelenac', icon: '🌿', name: 'Zelenáč', price: 8, trip: 'zelenac', t: 30, desc: 'Všechno se zpomalí, zezelená a kouří se z tebe (jen ve hře). Pak se ti klíží oči.' },
      { id: 'turbo', icon: '⚡', name: 'Turbo', price: 12, trip: 'turbo', t: 15, desc: 'Letíš jak blesk a táhneš za sebou duchy (jen ve hře). Pak se klepeš a jsi pomalej.' },
    ],
  },
  lounge: {
    title: 'VIP bar', who: 'Vítej ve VIP!',
    items: [
      { id: 'privshow', icon: '🪶', name: 'Soukromá show', price: 40, desc: 'Tanečnice na VIP pódiu tančí jen pro tebe: péřové vějíře, třpytky, reflektor. Hoď jí poháry a možná ti dá číslo.' },
      { id: 'rain', icon: '🏆', name: 'Déšť pohárků', price: 25, t: 8, desc: 'Vyhodíš poháry do vzduchu a 8 s na tebe prší zlato.' },
    ],
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

const CLUB_BOOTH = { x0: 1330, y0: 790, x1: 1460, y1: 900 }; // fotokoutek
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
  Object.assign({ kind: 'booth' }, CLUB_BOOTH),
];
const CLUB_GATE = { x0: 1100, y0: 380, x1: 1120, y1: 470 };
const CLUB_TABLES = [{ x: 360, y: 520 }, { x: 390, y: 770 }, { x: 1180, y: 800 }, { x: 1250, y: 690 }, { x: 1300, y: 390, vip: true }];
const CLUB_RING = { x: 750, y: 485, r: 62 };   // kruh na parketu: taneční souboj
const CLUB_MOVES = ['Pohupování', 'Robot', 'Točení', 'Skoky'];
const CLUB_DAY_CAP = 40; // kolik pohárů jde v klubu vyhrát za den
const CLUB_LANES = [
  { key: 'arrowleft', col: '#ff4d9a', rot: Math.PI },
  { key: 'arrowdown', col: '#4fe0ff', rot: Math.PI / 2 },
  { key: 'arrowup', col: '#3dff7a', rot: -Math.PI / 2 },
  { key: 'arrowright', col: '#ffb02e', rot: 0 },
];
const CLUB_DANCE = { x0: 520, y0: 330, x1: 980, y1: 640 };
const CLUB_ZONES = [
  { id: 'exit', label: 'Odejít', x: 750, y: 915, r: 70 },
  { id: 'bar', label: 'Bar', x: 250, y: 350, r: 120 },
  { id: 'dj', label: 'DJ', x: 750, y: 300, r: 80 },
  { id: 'vip', label: 'VIP', x: 1050, y: 425, r: 85 },
  { id: 'lounge', label: 'VIP bar', x: 1300, y: 470, r: 110 },
  { id: 'wardrobe', label: 'Šatna', x: 170, y: 760, r: 100 },
  { id: 'photo', label: 'Fotka', x: 1280, y: 860, r: 75 },
  { id: 'separe', label: 'Separé', x: 1395, y: 475, r: 60 },
  { id: 'dealer', label: 'Dealer', x: 950, y: 870, r: 70 },
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
// dealer u záchodů (není ze hry)
const CLUB_DEALER = { id: 'dealer', name: 'Dealer', num: '', skin: '#d9a57a', hair: 'buzz', hairColor: '#1a1410', hairDark: '#080604', hairLight: '#3a2e24', eyes: '#3a2a1a', brow: '#1a1410', lid: 0.36, browW: 3.6, mouth: 'smirk', stubble: true };
const CLUB_PODIUMS = [{ x: 455, y: 615 }, { x: 1045, y: 615 }, { x: 1215, y: 340, vip: true }];
const CLUB_GIRL_LINES = ['Ahoj fešáku', 'Zatančíš si?', 'Koupíš mi drink?', 'Jsi fotbalista? Sexy', 'Ty máš ale styl', 'Pojď blíž', 'Jen se dívat, nesahat!', 'Nejsi ty ten z FIFA67?', 'Za chvíli jde show', 'Chceš soukromý tanec?'];
const CLUB_DRUNK_GIRL = ['Ty jsi ale nalitej', 'Zpomal, fešáku', 'Dej si vodu', 'Nemotej se mi tu'];
const CLUB_GUY_LINES = ['Ta tanečnice je bomba', 'Dáme panáka?', 'To je ten fotbalista!', 'Viděl jsi tu show?', 'Dneska to rozjedem!', 'VIP je tamhle', 'Za chvíli jde show'];
const CLUB_SHOVED = ['Hej, pozor!', 'Co blbneš?', 'Klid, kámo!', 'Nestrkej!'];
const CLUB_ME_DRUNK = ['ŠKYT!', 'Já jsem tady král!', 'Ještě jednu rundu!', 'Miluju vás všechny!', 'Neeee, já nejsem opilej'];
const CLUB_SEPARE = { x0: 1440, y0: 410, x1: 1470, y1: 540 }; // závěs separé ve VIP
const CLUB_PUKE = 2.5; // od kolika promile se pozvracíš

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
      if (o && typeof o === 'object') {
        return {
          char: o.char || 'jenda', vip: !!o.vip, own: o.own || {}, wear: o.wear || {}, adult: !!o.adult,
          nums: o.nums || {}, style: CLUB_STYLES[o.style] ? o.style : 'house', wins: Math.max(0, Number(o.wins) || 0),
          day: o.day || '', earned: Math.max(0, Number(o.earned) || 0), ban: Math.max(0, Number(o.ban) || 0),
        };
      }
    } catch (e) { /* nic */ }
    return { char: 'jenda', vip: false, own: {}, wear: {}, adult: false, nums: {}, style: 'house', wins: 0, day: '', earned: 0, ban: 0 };
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
    click('club-res-ok', () => this.finishBattle());
    click('club-out-ok', () => this.finishKick());

    click('club-nums', () => this.openContacts());
    click('club-contacts-close', () => { this.el('club-contacts').hidden = true; });
    click('club-photo-close', () => { this.el('club-photo').hidden = true; });
    click('club-photo-share', () => this.sharePhoto());
    click('club-cam', () => {
      if (this.phase === 'in' && !this.overlayOpen()) this.takePhoto();
    });
    for (const b of this.el('club-pads').querySelectorAll('button[data-lane]')) {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        Sound.init();
        this.hitLane(Number(b.dataset.lane));
      });
    }
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
      if (this.phase !== 'in' || this.overlayOpen()) return;
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
      if (this.battle && !this.battle.done) {
        const lane = CLUB_LANES.findIndex((l) => l.key === k);
        const alt = ['a', 's', 'w', 'd'].indexOf(k);
        if (lane >= 0 || alt >= 0) {
          e.preventDefault();
          if (!e.repeat) this.hitLane(lane >= 0 ? lane : alt);
        }
        return;
      }
      if (k === 'escape') {
        if (!this.el('club-contacts').hidden) this.el('club-contacts').hidden = true;
        else if (!this.el('club-photo').hidden) this.el('club-photo').hidden = true;
        else if (this.battle) this.finishBattle();
        else if (this.shopOpen) this.closeShop();
        else if (this.phase === 'in') this.leave();
        else this.close();
        return;
      }
      if (this.phase !== 'in' || this.overlayOpen()) return;
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
    this.style = s.style;
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
    if (this.battle) this.finishBattle();
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
    this.renderNums();
    this.startMusic(false);
    Sound.whoosh();
    UI.toast('Vítej v HOT PEPPERS! 🌶️');
  },

  leave() {
    this.finishBattle();
    for (const id of ['club-contacts', 'club-photo']) this.el(id).hidden = true;
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
    this._banShown = -1;
    this.drawGrid(0);
  },

  drawGrid(t) {
    const ban = this.banLeft();
    if (ban !== this._banShown) {
      this._banShown = ban;
      const b = this.el('club-enter');
      b.disabled = ban > 0;
      b.textContent = ban > 0 ? `Zákaz vstupu · ${ban} s` : `Vstoupit · ${charById(this.pick).name}`;
    }
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
    this.decals = [];
    this.kick = null;
    this.separe = null;
    this.show = null;
    this.showIn = 15;
    this.trip = null;
    this.priv = null;
    this.zoom = 1;
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
    this.npcs.push(this.mk('dealer', 955, 905, { look: CLUB_DEALER, staff: 'dealer', dir: -1, say: CLUB_SHOP.dealer.who, gear: { shades: true, chain: true }, kit: { color: '#1b1d26', dark: '#0b0c12', light: '#3a3f52' } }));
    // holky na pódiích, na parketu, u baru a ve VIP
    for (const q of CLUB_PODIUMS) {
      const g = girls[0];
      if (g) girls[0] = Object.assign({}, g, { dress: Object.assign({}, g.dress, { style: 'set' }) });
      girl(q.x, q.y, { podium: true, dancer: true, lift: 34, vipPod: !!q.vip });
    }
    for (const [x, y] of [[680, 450], [860, 520], [600, 590]]) girl(x, y, { dancer: true });
    girl(120, 335, { atBar: true, dir: 1 });
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
    const tr = this.trip;
    if (tr && tr.kind === 'zelenac' && tr.t < tr.high) dt *= 0.55; // všechno se zpomalí
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
    this.whiteT = Math.max(0, (this.whiteT || 0) - dt * 2.5);
    if (this.battle) this.updateBattle(dt);
    if (this.phase === 'in') this.updateDrunk(dt);
    this.updateTrip(dt);
    this.updateShow(dt);
    this.blackT = Math.max(0, (this.blackT || 0) - dt * 0.5);
    if (this.kick) this.updateKick(dt);
    if (this.separe) this.updateSepare(dt);
    if (this.priv) this.updatePriv(dt);
    else if ((this.zoom || 1) < 1) this.zoom = approach(this.zoom, 1, dt * 1.2);
    const party = this.fx.hit > 0;
    const me = this.me;
    if (me) {
      me.poseT = Math.max(0, (me.poseT || 0) - dt);
      me.lineT = Math.max(0, (me.lineT || 0) - dt);
      me.stunT = Math.max(0, (me.stunT || 0) - dt);
    }
    if (me && this.phase === 'in' && !this.kick) {
      let { mx, my } = this.overlayOpen() || me.stunT > 0 || this.priv ? { mx: 0, my: 0 } : this.input();
      if (this.trip && this.trip.kind === 'houba' && this.trip.t >= this.trip.high) mx = -mx; // ovládání naruby
      // opilý: joystick ujíždí a hráč se motá
      const pr = this.promile || 0;
      if (pr > 0.9 && (mx || my)) {
        const a = Math.sin(this.t * 0.9) * 0.45 * Math.min(2, pr - 0.6), c = Math.cos(a), sn = Math.sin(a);
        [mx, my] = [mx * c - my * sn, mx * sn + my * c];
      }
      const sp = CLUB_SPEED * (this.fx.limo > 0 ? 1.55 : 1) * this.tripSpeed();
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
      this.anim(me, dt, Math.hypot(me.vx, me.vy), this.dance || party || !!this.battle);
      if (this.trip && this.trip.t >= this.trip.high) me.pl.mood = -1; // dojezd: smutný obličej
      const fx = this.battle ? CLUB_RING.x : me.x, fy = this.battle ? CLUB_RING.y - 70 : me.y - 40;
      if (!this.priv) {
        this.cam.x = lerp(this.cam.x, fx, Math.min(1, dt * 6));
        this.cam.y = lerp(this.cam.y, fy, Math.min(1, dt * 6));
      }
      if (!this.battle && !this.separe) this.findZone();
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
      if (q.g && q.vy !== 0) q.vy += q.g * dt;
      if (q.k === 'fire') {
        q.vx *= 1 - dt * 2.4;
        q.vy -= 60 * dt;
      } else if (q.k === 'puke') {
        q.vy += 600 * dt;
        if (q.y > q.floor) {
          q.y = q.floor;
          q.vx *= 0.5;
          q.vy = 0;
        }
      } else if (q.k === 'top' && q.vy > 0 && q.y > q.floor) {
        q.y = q.floor;
        q.vx = q.vy = 0;
        q.g = 0;
      } else if (q.k === 'cup' && q.vy > 0 && q.y > q.floor) {
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
    n.cool = Math.max(0, (n.cool || 0) - dt);
    const d = me ? Math.hypot(me.x - n.x, (me.y - n.y) * 1.4) : 1e9;
    if (me && d < 120 && n.cool <= 0 && this.follower !== n) {
      n.line = CLUB_GIRL_LINES[Math.floor(Math.random() * CLUB_GIRL_LINES.length)];
      if (me.gear && me.gear.chain && Math.random() < 0.4) n.line = 'Hezkej řetěz!';
      if ((this.promile || 0) > 1.3 && Math.random() < 0.6) n.line = CLUB_DRUNK_GIRL[Math.floor(Math.random() * CLUB_DRUNK_GIRL.length)];
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
        if (this.dance) {
          n.danceT = (n.danceT || 0) + dt;
          if (n.danceT >= 10) this.giveNumber(n);
        }
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
    n.lineT = Math.max(0, (n.lineT || 0) - dt);
    n.poseT = Math.max(0, (n.poseT || 0) - dt);
    n.tipT = Math.max(0, (n.tipT || 0) - dt);
    if (n.stunT > 0) {
      n.stunT -= dt;
      this.anim(n, dt, 0, false);
      return;
    }
    if (n.battleOpp) {
      n.dir = -1;
      this.anim(n, dt, 0, true);
      return;
    }
    if (this.kick && n === this.kick.b) return;
    if (n.flashT > 0) {
      n.flashT -= dt;
      if (n.flashT <= 0 && !n.hold) n.pl.look.topless = false;
    }
    if (n.podium) {
      // tanec u tyče: obtáčí se kolem, občas se vyšvihne nahoru
      n.poleT = (n.poleT || rand(0, 6)) + dt * (n.tipT > 0 ? 1.6 : 1);
      const sw = Math.sin(n.poleT * 1.4);
      n.x = n.hx + sw * 20;
      n.dir = Math.cos(n.poleT * 1.4) > 0 ? 1 : -1;
      n.lift = 34 + Math.max(0, Math.sin(n.poleT * 0.6) - 0.6) * 70;
      this.anim(n, dt, 0, true);
      if (this.me && this.phase === 'in' && Math.random() < dt * 0.4 && Math.hypot(this.me.x - n.x, this.me.y - n.y) < 220) this.heart(n);
      return;
    }
    if (!n.lady && (n.watch || n.go)) {
      const tg = n.watch || n.go, dx = tg.x - n.x, dy = tg.y - n.y, dd = Math.hypot(dx, dy);
      if (dd > 10) {
        const ox = n.x, oy = n.y;
        this.moveEnt(n, (dx / dd) * 220 * dt, (dy / dd) * 220 * dt);
        if (Math.hypot(n.x - ox, n.y - oy) < 0.3) {
          n.x = tg.x; // zasekl se
          n.y = tg.y;
        }
        n.dir = dx >= 0 ? 1 : -1;
        this.anim(n, dt, 220, false);
        return;
      }
      if (n.go) {
        n.go = null;
        n.tx = undefined;
      } else {
        const g = this.show && this.show.girl;
        if (g) n.dir = g.x >= n.x ? 1 : -1;
        this.anim(n, dt, 0, true);
        if (Math.random() < dt * 0.25) {
          n.line = ['Jóóó!', 'Ještě!', 'Bravo!', 'To je bomba!'][Math.floor(Math.random() * 4)];
          n.lineT = 1.4;
        }
        return;
      }
    }
    if (!n.lady && !n.staff && this.me && this.phase === 'in') {
      n.cool = Math.max(0, (n.cool || 0) - dt);
      if (n.cool <= 0 && Math.hypot(this.me.x - n.x, (this.me.y - n.y) * 1.4) < 110) {
        n.line = CLUB_GUY_LINES[Math.floor(Math.random() * CLUB_GUY_LINES.length)];
        n.lineT = 2.2;
        n.cool = rand(9, 16);
      }
    }
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
    if (this.priv) {
      const key = 'privtip';
      if (key !== this._zoneKey) {
        this._zoneKey = key;
        this.el('club-act').hidden = false;
        this.el('club-act-lbl').textContent = 'Hodit 5 🏆';
      }
      this.zone = { id: 'privtip', n: this.priv.n };
      return;
    }
    for (const z of CLUB_ZONES) {
      if (z.id === 'vip' && vip) continue;
      if ((z.id === 'lounge' || z.id === 'separe') && !vip) continue;
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
    if (!best) {
      for (const n of this.npcs) {
        if (n.podium && !n.vipPod && Math.hypot(me.x - n.hx, (me.y - n.hy) * 1.4) < 105) best = { id: 'tip', label: 'Hodit 5 🏆', n };
      }
    }
    if (!best) {
      let gd = 58;
      for (const n of this.npcs) {
        if (n.lady || n.staff || n.battleOpp || n.stunT > 0) continue;
        const d = Math.hypot(me.x - n.x, (me.y - n.y) * 1.4);
        if (d < gd) {
          gd = d;
          best = { id: 'shove', label: 'Strčit', n };
        }
      }
    }
    if (!best && Math.hypot(me.x - CLUB_RING.x, (me.y - CLUB_RING.y) * 1.4) < CLUB_RING.r) best = { id: 'battle', label: 'Taneční souboj' };
    if (!best && onFloor) best = { id: 'dance', label: this.dance ? 'Další pohyb' : 'Tančit' };
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
    else if (z.id === 'battle') this.startBattle();
    else if (z.id === 'tip') this.tip(z.n);
    else if (z.id === 'privtip') {
      this.tip(z.n);
      if (this.priv) this.priv.tips++;
    }
    else if (z.id === 'shove') this.shove(z.n);
    else if (z.id === 'separe') this.goSepare();
    else if (z.id === 'photo') this.takePhoto();
    else if (z.id === 'dance') {
      if (!this.dance) {
        this.dance = true;
        this.move = 0;
      } else {
        this.move = ((this.move || 0) + 1) % CLUB_MOVES.length;
        UI.toast(`${CLUB_MOVES[this.move]}!`);
      }
      this._zoneKey = '';
    } else this.openShop(z.id);
  },

  /* ---------- obchod ---------- */

  openShop(id) {
    const S = CLUB_SHOP[id];
    if (!S) return;
    this.shopOpen = id;
    this.stick.id = null;
    this.el('club-shop-title').textContent = id === 'bar' && this.promile > 0.05 ? `${S.title} · ${this.promileText()}` : S.title;
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
      if (it.style) btn = (this.style || 'house') === it.style ? '<span class="club-owned">Hraje ♪</span>' : `<button type="button" class="club-buy" data-item="${it.id}">Pustit</button>`;
      else if (owned && it.gear) btn = `<button type="button" class="club-buy ${s.wear[it.id] ? 'on' : ''}" data-item="${it.id}">${s.wear[it.id] ? 'Sundat' : 'Nasadit'}</button>`;
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
    if (it.style) {
      this.style = it.style;
      s.style = it.style;
      this.save(s);
      this.pulse = 1;
      Sound.click();
      UI.toast(`DJ pouští ${CLUB_STYLES[it.style].name} ${CLUB_STYLES[it.style].icon}`);
      this.renderShop();
      return;
    }
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
    } else if (it.trip) {
      this.closeShop();
      this.takeTrip(it);
    } else if (it.id === 'privshow') {
      this.closeShop();
      this.startPriv();
    } else {
      if (it.t) this.fx[it.id] = it.t;
      if (it.id === 'hit') this.pulse = 1;
      if (it.drink) this.drink(it.drink);
      if (it.sober) this.promile = Math.max(0, (this.promile || 0) - it.sober);
      UI.toast(`${it.icon} ${it.name}!${it.drink ? ` Máš ${this.promileText()}.` : ''}`);
      this.closeShop();
    }
    Sound.fanfare();
    this.renderTro();
    if (this.shopOpen) this.renderShop();
    // poháry se hned propíšou do žebříčku a účtu
    this.syncOut();
  },
  applyGear() {
    if (!this.me) return;
    const w = this.state().wear;
    this.me.gear = { shades: !!w.shades, chain: !!w.chain, crown: !!w.crown };
  },

  /* ---------- hudba (skládaná ve Web Audio) ---------- */

  bpm() {
    const b = CLUB_STYLES[this.style || 'house'].bpm;
    return this.fx.hit > 0 ? b + 6 : b;
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
    const q = s % 16, style = this.style || 'house';
    const root = [55, 43.65, 65.41, 49][Math.floor(s / 16) % 4];
    if (style === 'techno') {
      osc('sine', 150, 40, q % 4 === 0 ? 0.25 : 0.01, q % 4 === 0 ? 1 : 0.0002);
      if (q % 4 === 2) noise('highpass', 8000, 0.16, 0.2);
      noise('highpass', 10000, 0.02, q % 2 ? 0.05 : 0.09);
      if (q === 4 || q === 12) noise('bandpass', 1900, 0.1, 0.3);
      osc('sawtooth', root * 2 * (q % 8 === 6 ? 1.5 : 1), 0, 0.08, q % 4 === 0 ? 0.03 : 0.12);
      if (party && q % 8 === 7) osc('square', root * 8, root * 4, 0.2, 0.05);
      return;
    }
    if (style === 'hiphop') {
      if (q === 0 || q === 7 || q === 10) {
        osc('sine', 120, 42, 0.3, 0.95);
        osc('sine', root * 2, root * 1.6, 0.6, 0.35); // 808
      }
      if (q === 4 || q === 12) {
        noise('bandpass', 2200, 0.16, 0.45);
        osc('triangle', 210, 160, 0.08, 0.2);
      }
      if (q % 2 === 0 || (party && q % 4 === 3)) noise('highpass', 9000, 0.03, 0.09);
      if (q === 0 || q === 8) {
        const ch = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 261.6, 329.6], [196, 246.9, 293.7]][Math.floor(s / 16) % 4];
        for (const f of ch) osc('triangle', f, 0, 0.5, 0.05);
      }
      return;
    }
    if (style === 'reggaeton') {
      if (q % 4 === 0) osc('sine', 140, 45, 0.22, 0.95);
      if (q === 3 || q === 6 || q === 11 || q === 14) noise('bandpass', 1800, 0.1, 0.38);
      if (q % 2 === 0) noise('highpass', 8500, 0.03, 0.08);
      if (q === 0 || q === 3 || q === 8 || q === 11) osc('triangle', root * 2, 0, 0.18, 0.3);
      if (q === 2 || q === 10) {
        const ch = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 261.6, 329.6], [196, 246.9, 293.7]][Math.floor(s / 16) % 4];
        for (const f of ch) osc('sine', f * 2, 0, 0.14, 0.05);
      }
      return;
    }
    if (q % 4 === 0) osc('sine', 155, 44, 0.22, 0.95); // kopák
    if (q % 4 === 2) noise('highpass', 7500, party ? 0.14 : 0.09, 0.16); // hi-hat
    if (party && q % 2 === 1) noise('highpass', 9000, 0.03, 0.07);
    if (q === 4 || q === 12) noise('bandpass', 1600, 0.14, party ? 0.42 : 0.26); // tlesk
    // basa: Am – F – C – G
    if (q % 4 === 2 || q === 15) osc('sawtooth', root * 2, 0, 0.16, 0.16);
    if (q % 4 === 2) osc('triangle', root, 0, 0.18, 0.3);
    // akordy (víc, když jede hit)
    if ((party && q % 4 === 3) || q === 3 || q === 11) {
      const ch = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 261.6, 329.6], [196, 246.9, 293.7]][Math.floor(s / 16) % 4];
      for (const f of ch) osc('square', f * 2, 0, 0.1, 0.035);
    }
  },

  /* ---------- noční život: chlast, blití, strkání, vyhazov, show, drogy ---------- */

  promileText() {
    return `${(this.promile || 0).toFixed(1).replace('.', ',')} ‰`;
  },

  drink(v) {
    this.promile = (this.promile || 0) + v;
    if (this.me) {
      this.me.line = this.promile > 1.2 ? CLUB_ME_DRUNK[Math.floor(Math.random() * CLUB_ME_DRUNK.length)] : 'Na zdraví!';
      this.me.lineT = 1.8;
    }
    if (this.promile >= CLUB_PUKE - 0.5 && this.promile < CLUB_PUKE) setTimeout(() => UI.toast('Je ti nějak blbě… ještě jeden a bude zle 🤢'), 900);
  },

  sfx(kind) {
    if (!Sound.ctx || Sound.muted) return;
    if (kind === 'hic') {
      Sound.tone('sine', 300, 700, 0.08, 0.12);
    } else if (kind === 'puke') {
      Sound.hiss(0.9, 0.35, 'lowpass', 700);
      Sound.tone('sawtooth', 160, 70, 0.8, 0.12);
    } else if (kind === 'shove') {
      Sound.hiss(0.12, 0.3, 'bandpass', 900);
      Sound.tone('sine', 180, 90, 0.15, 0.25);
    }
  },

  // Opilost: houpání, dvojité vidění, škytání, joystick ujíždí; moc chlastu = blití a vyhazov.
  updateDrunk(dt) {
    const me = this.me;
    this.promile = Math.max(0, (this.promile || 0) - dt * 0.035);
    this.rowdy = Math.max(0, (this.rowdy || 0) - dt / 45);
    if (!me || this.kick || this.separe) return;
    const pr = this.promile;
    if (pr > 0.6 && Math.random() < dt * 0.12 * pr) {
      me.line = Math.random() < 0.6 ? 'ŠKYT!' : CLUB_ME_DRUNK[Math.floor(Math.random() * CLUB_ME_DRUNK.length)];
      me.lineT = 1.2;
      if (me.line === 'ŠKYT!') this.sfx('hic');
    }
    if (pr >= CLUB_PUKE && !this.battle) this.puke();
  },

  puke() {
    const me = this.me;
    this.promile = 1.4;
    const mx = me.x + me.dir * 18, my = me.y - (me.pl.R + me.pl.F) * CLUB_K + 10;
    for (let i = 0; i < 46; i++) this.parts.push({ k: 'puke', x: mx, y: my, vx: me.dir * rand(120, 300), vy: rand(-80, 40), t: 0, life: rand(0.5, 0.9), s: rand(3, 7), floor: me.y + rand(-6, 10) });
    (this.decals = this.decals || []).push({ x: me.x + me.dir * 70, y: me.y + 4, r: rand(26, 36), rot: rand(-0.3, 0.3) });
    me.line = 'BLÉÉÉÉ';
    me.lineT = 1.6;
    this.sfx('puke');
    for (const n of this.npcs) {
      if (Math.hypot(n.x - me.x, n.y - me.y) > 260) continue;
      n.line = n.lady ? 'FUUUJ!' : 'Hnus!';
      n.lineT = 2;
      n.dir = n.x > me.x ? 1 : -1;
    }
    setTimeout(() => this.kickOut('Pozvracel jsi parket. Ochranka tě vynesla ven.'), 1300);
  },

  // Vyhazov: ochranka si pro tebe dojde a vyvede tě ven, pak zákaz vstupu.
  kickOut(reason) {
    if (this.kick || this.phase !== 'in') return;
    if (this.battle) this.finishBattle();
    this.closeShop();
    this.dance = false;
    const b = this.npcs.find((n) => n.staff === 'vip');
    this.kick = { t: 0, reason, b, bx: b.x, by: b.y };
    b.line = 'A ven!';
    b.lineT = 3;
    this.el('club-act').hidden = true;
    this._zoneKey = 'kick';
    Sound.whistle('long');
  },

  updateKick(dt) {
    const k = this.kick, me = this.me, b = k.b;
    k.t += dt;
    this.cam.x = lerp(this.cam.x, me.x, Math.min(1, dt * 5));
    this.cam.y = lerp(this.cam.y, me.y - 40, Math.min(1, dt * 5));
    if (k.t < 0.7) {
      b.x = lerp(b.x, me.x + 40, Math.min(1, dt * 7));
      b.y = lerp(b.y, me.y, Math.min(1, dt * 7));
      b.dir = me.x > b.x ? 1 : -1;
      this.anim(b, dt, 300, false);
    } else if (k.t < 2.2) {
      // vleče tě k východu
      me.x = approach(me.x, 750, 420 * dt);
      me.y = approach(me.y, 915, 330 * dt);
      b.x = me.x + 40;
      b.y = me.y;
      me.dir = 1;
      b.dir = -1;
      this.anim(b, dt, 300, false);
      this.anim(me, dt, 0, false);
      me.stunT = 0.3;
    } else if (!k.shown) {
      k.shown = true;
      const s = this.state();
      s.ban = Date.now() + 20000;
      this.save(s);
      this.el('club-out-reason').textContent = k.reason;
      this.el('club-out').hidden = false;
    }
  },

  finishKick() {
    const k = this.kick;
    if (!k) return;
    k.b.x = k.bx;
    k.b.y = k.by;
    k.b.dir = -1;
    this.kick = null;
    this.el('club-out').hidden = true;
    this.leave();
  },

  banLeft() {
    return Math.max(0, Math.ceil(((this.state().ban || 0) - Date.now()) / 1000));
  },

  // Strčit do kluka: naštve se, někdy vrátí ránu. Třetí strkanice = vyhazov.
  shove(n) {
    const me = this.me, d = Math.sign(n.x - me.x) || 1;
    this.moveEnt(n, d * 60, 0);
    n.stunT = 1.1;
    n.line = CLUB_SHOVED[Math.floor(Math.random() * CLUB_SHOVED.length)];
    n.lineT = 2;
    n.dir = -d;
    me.pose = d > 0 ? 3 : 0;
    me.poseT = 0.22;
    this.sfx('shove');
    this.rowdy = (this.rowdy || 0) + 1;
    this._zoneKey = '';
    if (this.rowdy >= 2.7) {
      setTimeout(() => this.kickOut('Strkal ses s hostama. Ochranka měla dost.'), 600);
      return;
    }
    if (this.rowdy >= 1.7) {
      const b = this.npcs.find((x) => x.staff === 'vip');
      b.line = 'Ještě jednou a letíš!';
      b.lineT = 3;
      UI.toast('Ochranka: „Ještě jednou a letíš!“');
    }
    if (Math.random() < 0.4) {
      setTimeout(() => {
        if (!this.me || this.kick) return;
        n.line = 'Tak na!';
        n.lineT = 1.5;
        this.moveEnt(me, -d * 70, 0);
        me.stunT = 0.9;
        this.sfx('shove');
      }, 500);
    }
  },

  // Drogy (vymyšlené, jen ve hře): nejdřív jízda, pak dojezd. Dvě dávky naráz = kolaps.
  takeTrip(it) {
    const me = this.me;
    if (this.trip) {
      me.stunT = 3;
      me.line = '…';
      me.lineT = 2;
      this.trip = null;
      this.blackT = 1;
      UI.toast('Dvě dávky naráz? Zkolaboval jsi 😵');
      setTimeout(() => this.kickOut('Zkolaboval jsi na záchodě. Ochranka tě vynesla ven.'), 1800);
      return;
    }
    this.trip = { kind: it.trip, t: 0, high: it.t, down: 15, trail: [] };
    const say = { pepr: ['JEDEEEM!', '❄️ Jedeš jak raketa!'], smajl: ['Miluju vás všechny!', '💊 Celej klub je najednou krásnej'], houba: ['Ty stěny dejchaj…', '🍄 Všechno se vlní'], zelenac: ['Ty jo… pohoda…', '🌿 Čas se zpomalil'], turbo: ['TURBOOO!', '⚡ Jsi rychlejší než světlo'] }[it.trip];
    me.line = say[0];
    me.lineT = 2;
    UI.toast(say[1]);
    // ochranka hlídá záchody
    if (Math.random() < 0.25) {
      setTimeout(() => {
        if (!this.me || this.kick || this.phase !== 'in') return;
        const b = this.npcs.find((x) => x.staff === 'vip');
        b.line = 'Viděl jsem tě!';
        b.lineT = 2;
        this.kickOut('Ochranka tě načapala u dealera.');
      }, 3500);
    }
  },

  updateTrip(dt) {
    const tr = this.trip, me = this.me;
    if (!tr || !me) return;
    tr.t += dt;
    const high = tr.t < tr.high;
    if (high) {
      this.dance = true;
      if (tr.kind === 'pepr' && Math.random() < dt * 30) this.parts.push({ k: 'spark', x: me.x + rand(-20, 20), y: me.y - rand(10, 80), vx: rand(-40, 40), vy: rand(-40, 10), t: 0, life: 0.6, col: `hsl(${Math.floor(rand(0, 360))},100%,70%)` });
      if (tr.kind === 'zelenac' && Math.random() < dt * 5) this.parts.push({ k: 'smoke', x: me.x + me.dir * 14, y: me.y - 70, vx: rand(-12, 12), vy: -rand(20, 40), t: 0, life: 2.2, s: rand(8, 14) });
      if (tr.kind === 'turbo') {
        tr.trail.unshift({ x: me.x, y: me.y, dir: me.dir });
        if (tr.trail.length > 18) tr.trail.pop();
      }
      if (tr.kind === 'houba' && Math.random() < dt * 4) this.parts.push({ k: 'spark', x: me.x + rand(-300, 300), y: me.y - rand(0, 250), vx: rand(-30, 30), vy: rand(-30, 30), t: 0, life: 1.6, col: `hsl(${Math.floor(rand(0, 360))},100%,70%)` });
      if (tr.kind === 'smajl' && Math.random() < dt * 6) {
        const n = this.npcs[Math.floor(Math.random() * this.npcs.length)];
        this.heart(n);
      }
    } else if (tr.t > tr.high + tr.down) {
      this.trip = null;
      UI.toast('Dojezd je pryč. Uf.');
    } else if (!tr.downSaid) {
      tr.downSaid = true;
      this.dance = false;
      me.line = { pepr: 'Proč je mi tak blbě…', smajl: 'Jsem úplně hotovej…', houba: 'Kde je vlevo?!', zelenac: 'Mám hlad… a spát…', turbo: 'Klepu se jak ratlík…' }[tr.kind];
      me.lineT = 2.4;
    }
  },

  tripSpeed() {
    const tr = this.trip;
    if (!tr) return 1;
    if (tr.t < tr.high) return { pepr: 1.8, smajl: 1.1, houba: 1, zelenac: 0.7, turbo: 2.4 }[tr.kind] || 1;
    return tr.kind === 'zelenac' ? 0.5 : 0.6;
  },

  // Show na stage: DJ ohlásí tanečnici, reflektory na pódium, kluci se seběhnou a fandí.
  updateShow(dt) {
    if (this.phase !== 'in') return;
    if (!this.show) {
      this.showIn = (this.showIn === undefined ? 15 : this.showIn) - dt;
      if (this.showIn > 0) return;
      const dancers = this.npcs.filter((n) => n.podium && !n.vipPod);
      if (!dancers.length) return;
      const girl = dancers[Math.floor(Math.random() * dancers.length)];
      const fans = this.npcs.filter((n) => !n.lady && !n.staff && !n.battleOpp && !n.vipGuest).slice(0, 5);
      fans.forEach((n, i) => {
        n.watch = { x: girl.hx + (i - 2) * 46, y: girl.hy + 85 + (i % 2) * 22 };
        n.sx = n.x;
        n.sy = n.y;
      });
      this.show = { t: 0, dur: 18, girl, fans };
      const dj = this.npcs.find((n) => n.dj);
      dj.line = `Na stage je ${girl.look.name}!`;
      dj.lineT = 3;
      this.pulse = 1;
      Sound.fanfare();
      return;
    }
    const sh = this.show;
    sh.t += dt;
    sh.girl.tipT = Math.max(sh.girl.tipT || 0, 0.5);
    // finále: tanečnice odhodí top (cenzurováno mozaikou)
    if (sh.t > sh.dur - 4 && !sh.topOff) {
      sh.topOff = true;
      this.topOff(sh.girl);
      for (const n of sh.fans) {
        n.line = ['JÓÓÓ!', 'Bravooo!', 'To je ona!'][Math.floor(Math.random() * 3)];
        n.lineT = 1.8;
      }
    }
    if (sh.t > sh.dur) {
      sh.girl.pl.look.topless = false;
      sh.girl.hold = false;
      for (const n of sh.fans) {
        n.watch = null;
        n.go = { x: n.hx !== undefined ? n.hx : n.sx, y: n.hy !== undefined ? n.hy : n.sy };
      }
      this.show = null;
      this.showIn = rand(45, 60);
    }
  },

  // Soukromá show ve VIP: kamera se přiblíží na VIP pódium, tanečnice tančí s péřovými vějíři jen pro tebe.
  startPriv() {
    const n = this.npcs.find((x) => x.vipPod);
    if (!n) return;
    const me = this.me;
    this.priv = { t: 0, dur: 22, n, tips: 0, style0: this.style };
    me.x = 1330;
    me.y = 262;
    me.dir = -1;
    me.vx = me.vy = 0;
    this.dance = false;
    if (this.follower) {
      this.follower.back = true;
      this.follower = null;
    }
    this.style = 'reggaeton';
    n.line = 'Tohle je jen pro tebe';
    n.lineT = 2.6;
    this._zoneKey = '';
    Sound.fanfare();
  },

  updatePriv(dt) {
    const pv = this.priv, n = pv.n;
    pv.t += dt;
    this.zoom = approach(this.zoom || 1, 0.55, dt * 1.2);
    this.cam.x = lerp(this.cam.x, n.hx + 50, Math.min(1, dt * 4));
    this.cam.y = lerp(this.cam.y, n.hy - 70, Math.min(1, dt * 4));
    n.tipT = Math.max(n.tipT || 0, 0.4);
    n.fans = true;
    if (Math.random() < dt * 26) this.parts.push({ k: 'spark', x: n.hx + rand(-90, 90), y: n.hy - rand(60, 260), vx: rand(-10, 10), vy: rand(20, 60), t: 0, life: 1.4, col: ['#ffd24a', '#ff9ad0', '#ffffff'][Math.floor(Math.random() * 3)] });
    if (Math.random() < dt * 1.2) this.heart(n);
    if (Math.random() < dt * 0.35 && n.lineT <= 0) {
      n.line = ['Líbí?', 'VIP zacházení', 'Nespouštěj ze mě oči', 'Ještě chvilku…'][Math.floor(Math.random() * 4)];
      n.lineT = 2;
    }
    if (pv.t > 13 && !pv.topOff) {
      pv.topOff = true;
      this.topOff(n);
      n.line = 'Jen pro tebe…';
      n.lineT = 2.2;
    }
    if (pv.t > pv.dur) this.endPriv();
  },

  // Tanečnice odhodí top: letí vzduchem, poprsí zakryje mozaika.
  topOff(n) {
    n.pl.look.topless = true;
    n.hold = true;
    const D = n.pl.look.dress;
    this.parts.push({ k: 'top', x: n.x, y: n.y - n.lift - 50, vx: rand(-90, 90), vy: -rand(260, 340), g: 600, t: 0, life: 2.2, rot: 0, col: D.color, floor: n.hy + rand(10, 30) });
    this.pulse = 1;
    Sound.fanfare();
  },

  endPriv() {
    const pv = this.priv, n = pv.n;
    n.fans = false;
    n.pl.look.topless = false;
    n.hold = false;
    this.style = pv.style0;
    this.priv = null;
    n.line = 'Děkuju, VIP';
    n.lineT = 2.5;
    for (let i = 0; i < 6; i++) this.heart(n);
    if (pv.tips >= 2) this.giveNumber(n);
    this._zoneKey = '';
  },

  // Péřové vějíře (burleska) – kreslí se přes tanečnici.
  drawFans(ctx, e, now) {
    const t = now / 1000, cy = e.y - e.lift - 48 - e.bob;
    for (const side of [-1, 1]) {
      const open = 0.55 + Math.sin(t * 3 + (side > 0 ? 1.4 : 0)) * 0.45;
      const fx = e.x + side * (18 + Math.sin(t * 2.2 + side) * 10), fy = cy + Math.cos(t * 2.6 + side) * 12;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(side * (0.35 + Math.sin(t * 1.8) * 0.3));
      for (let i = -4; i <= 4; i++) {
        ctx.save();
        ctx.rotate((i / 4) * 1.15 * open);
        ctx.fillStyle = i % 2 ? '#ff9ad0' : '#ffe0f0';
        ctx.strokeStyle = 'rgba(120,20,70,.7)';
        ctx.lineWidth = 1.2;
        oval(ctx, 0, -30, 9, 32);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#c8961c';
      circle(ctx, 0, 0, 4);
      ctx.fill();
      ctx.restore();
    }
  },

  // Hodit poháry tanečnici u tyče.
  tip(n) {
    const prof = Profile.get(), price = 5;
    if (prof.trophies < price) {
      UI.toast('Na to potřebuješ aspoň 5 pohárů.');
      return;
    }
    prof.trophies -= price;
    Profile.save(prof);
    this.renderTro();
    this.syncOut();
    const me = this.me;
    for (let i = 0; i < 14; i++) this.parts.push({ k: 'cup', x: me.x + rand(-10, 10), y: me.y - 70, vx: (n.x - me.x) * rand(0.9, 1.4) + rand(-60, 60), vy: -rand(300, 420), g: 700, t: 0, life: 2.4, rot: rand(-1, 1), floor: n.hy - 30 + rand(-8, 8) });
    n.tipT = 6;
    // za poháry na chvilku flashne (jako Suli): záblesk a mozaika
    if (n.pl.look.dress && n.pl.look.dress.style === 'set') {
      n.flashT = 2.2;
      n.pl.look.topless = true;
      this.parts.push({ k: 'flash', x: n.x, y: n.y - n.lift - 50, vx: 0, vy: 0, t: 0, life: 0.5 });
      this.whiteT = Math.max(this.whiteT || 0, 0.35);
    }
    n.line = ['Ještě!', 'Jo, to se mi líbí', 'Víc, víc!', 'Ty jsi boss'][Math.floor(Math.random() * 4)];
    n.lineT = 2;
    for (let i = 0; i < 5; i++) this.heart(n);
    this.pulse = 1;
    Sound.fanfare();
  },

  // Separé ve VIP: jen s holkou, co ti dala číslo. Co se stane v separé, zůstane v separé.
  goSepare() {
    const f = this.follower, s = this.state();
    if (!f) {
      UI.toast('Soukromý tanec: přiveď si holku (Zatančit spolu).');
      return;
    }
    const price = s.nums[f.look.id] ? 0 : 25;
    if (price) {
      const prof = Profile.get();
      if (prof.trophies < price) {
        UI.toast(`Soukromý tanec stojí ${price} pohárů.`);
        return;
      }
      prof.trophies -= price;
      Profile.save(prof);
      this.renderTro();
      this.syncOut();
    }
    this.separe = { t: 0, n: f };
    this.dance = false;
    this.el('club-act').hidden = true;
    this._zoneKey = 'separe';
    Sound.click();
  },

  updateSepare(dt) {
    const sp = this.separe;
    sp.t += dt;
    if (Math.random() < dt * 8) this.parts.push({ k: 'heart', x: 1455 + rand(-20, 10), y: rand(400, 520), vx: rand(-30, 10), vy: -rand(40, 80), t: 0, life: 1.5, s: rand(5, 9) });
    if (sp.t > 4.5) {
      const n = sp.n, me = this.me;
      me.x = 1385;
      me.y = 490;
      me.dir = -1;
      n.x = 1340;
      n.y = 480;
      n.line = ['Zavolej mi', 'To bylo něco', 'Přijď zas'][Math.floor(Math.random() * 3)];
      n.lineT = 2.8;
      me.line = 'Gentleman nic neříká';
      me.lineT = 2.2;
      for (let i = 0; i < 8; i++) this.heart(n);
      this.separe = null;
      this._zoneKey = '';
    }
  },

  /* ---------- taneční souboj (rytmická minihra) ---------- */

  startBattle() {
    if (this.battle) return;
    const opps = this.npcs.filter((n) => !n.lady && !n.staff && (n.dancer || n.walker) && !n.vipGuest);
    const opp = opps[Math.floor(Math.random() * opps.length)];
    if (!opp) return;
    const s = this.state(), lvl = Math.min(8, s.wins);
    const beat = 60 / this.bpm(), lead = 4, notes = [];
    let last = -1;
    for (let i = 0; i < 32; i++) {
      const subs = i >= 8 && Math.random() < 0.12 + lvl * 0.04 ? [0, 0.5] : [0];
      for (const o of subs) {
        let lane = Math.floor(Math.random() * 4);
        if (lane === last && Math.random() < 0.6) lane = (lane + 1 + Math.floor(Math.random() * 3)) % 4;
        last = lane;
        notes.push({ t: (lead + i + o) * beat, lane, j: '' });
      }
    }
    this.battle = {
      t: -(1 - this.beatPhase()) * beat, beat, lead, notes, score: 0, combo: 0, best: 0, perfect: 0, good: 0, miss: 0,
      judge: '', judgeCol: '#fff', judgeT: 0, flash: [0, 0, 0, 0], opp, done: false,
      oppAcc: clamp(0.58 + lvl * 0.035 + rand(-0.07, 0.07), 0.5, 0.93), end: notes[notes.length - 1].t + 1.2,
    };
    opp.battleOpp = true;
    opp.sx = opp.x;
    opp.sy = opp.y;
    opp.x = CLUB_RING.x + 78;
    opp.y = CLUB_RING.y;
    opp.line = 'Pojď na mě!';
    opp.lineT = 2;
    const me = this.me;
    me.x = CLUB_RING.x - 78;
    me.y = CLUB_RING.y;
    me.dir = 1;
    me.vx = me.vy = 0;
    this.dance = false;
    this.stick.id = null;
    this.el('club-act').hidden = true;
    this._zoneKey = 'battle';
    this.el('club-pads').hidden = false;
    this.el('club-hud').classList.add('battling');
    Sound.whistle('short');
  },

  updateBattle(dt) {
    const b = this.battle;
    if (b.done) return;
    b.t += dt;
    b.judgeT = Math.max(0, b.judgeT - dt);
    for (let i = 0; i < 4; i++) b.flash[i] = Math.max(0, b.flash[i] - dt * 4);
    for (const n of b.notes) {
      if (!n.j && b.t - n.t > 0.2) {
        n.j = 'miss';
        b.miss++;
        b.combo = 0;
        this.judge('MIMO', '#ff5a6e');
      }
      // soupeř tančí podle stejných šipek (někdy se splete)
      if (!n.oppDone && n.t <= b.t) {
        n.oppDone = true;
        if (Math.random() < b.oppAcc) {
          b.opp.pose = n.lane;
          b.opp.poseT = 0.22;
        }
      }
    }
    if (b.combo >= 8 && Math.random() < dt * 3) {
      const g = this.npcs.filter((x) => x.lady);
      if (g.length) this.heart(g[Math.floor(Math.random() * g.length)]);
    }
    if (b.t >= b.end) this.endBattle();
  },

  judge(text, col) {
    const b = this.battle;
    b.judge = text;
    b.judgeCol = col;
    b.judgeT = 0.55;
  },

  hitLane(lane) {
    const b = this.battle;
    if (!b || b.done) return;
    b.flash[lane] = 1;
    this.me.pose = lane;
    this.me.poseT = 0.22;
    let best = null, bd = 1;
    for (const n of b.notes) {
      if (n.j || n.lane !== lane) continue;
      const d = Math.abs(n.t - b.t);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    if (!best || bd > 0.2) {
      b.combo = 0; // ťuk mimo rytmus
      return;
    }
    if (bd < 0.075) {
      best.j = 'p';
      b.perfect++;
      b.combo++;
      b.score += 100 + b.combo * 5;
      this.judge('PERFEKT!', '#3dff7a');
    } else {
      best.j = 'g';
      b.good++;
      b.combo++;
      b.score += 50 + b.combo * 2;
      this.judge('DOBŘE', '#4fe0ff');
    }
    b.best = Math.max(b.best, b.combo);
  },

  battleAcc(b) {
    const done = b.perfect + b.good + b.miss;
    return done ? (b.perfect + b.good * 0.6) / done : 1;
  },

  endBattle() {
    const b = this.battle;
    b.done = true;
    const acc = (b.perfect + b.good * 0.6) / b.notes.length;
    const win = acc > b.oppAcc;
    const s = this.state();
    const today = new Date().toISOString().slice(0, 10);
    if (s.day !== today) {
      s.day = today;
      s.earned = 0;
    }
    let reward = 0;
    if (win) {
      s.wins++;
      reward = Math.max(0, Math.min(CLUB_DAY_CAP - s.earned, 3 + Math.round(acc * 9)));
      s.earned += reward;
    }
    this.save(s);
    if (reward > 0) {
      const prof = Profile.get();
      prof.trophies += reward;
      Profile.save(prof);
      this.renderTro();
      this.syncOut();
    }
    const cand = win ? this.npcs.filter((n) => n.lady && !s.nums[n.look.id]) : [];
    const girl = cand.length ? cand[Math.floor(Math.random() * cand.length)] : null;
    this.el('club-pads').hidden = true;
    const opp = charById(b.opp.id).name;
    this.el('club-res-title').textContent = win ? 'VÝHRA!' : 'PROHRA';
    this.el('club-res-title').className = win ? 'win' : 'lose';
    const lines = [`Ty <b>${Math.round(acc * 100)} %</b> : <b>${Math.round(b.oppAcc * 100)} %</b> ${opp}`, `Nejdelší série: ${b.best} · perfektních ${b.perfect}`];
    if (reward > 0) lines.push(`<span class="gold">+${reward} 🏆</span>`);
    else if (win) lines.push(`Dnes už jsi v klubu vyhrál max pohárů (${CLUB_DAY_CAP}). Zítra zase!`);
    else lines.push('Zkus to znovu – trefuj šipky přesně do rytmu.');
    if (girl) lines.push(`📱 ${girl.look.name} ti dala číslo!`);
    this.el('club-res-lines').innerHTML = lines.map((l) => `<p>${l}</p>`).join('');
    this.el('club-res').hidden = false;
    if (win) {
      Sound.fanfare();
      this.fx.hit = Math.max(this.fx.hit || 0, 6);
      this.pulse = 1;
      if (girl) this.giveNumber(girl, true);
    } else {
      Sound.whistle('long');
      b.opp.line = 'Na mě nemáš!';
      b.opp.lineT = 2.5;
    }
  },

  finishBattle() {
    const b = this.battle;
    if (!b) return;
    const o = b.opp;
    o.battleOpp = false;
    o.poseT = 0;
    o.x = o.sx;
    o.y = o.sy;
    o.tx = undefined;
    this.battle = null;
    this._zoneKey = '';
    this.el('club-res').hidden = true;
    this.el('club-pads').hidden = true;
    this.el('club-hud').classList.remove('battling');
  },

  /* ---------- kontakty (čísla od holek) ---------- */

  giveNumber(n, quiet) {
    const s = this.state(), id = n.look.id;
    if (s.nums[id]) return false;
    s.nums[id] = true;
    this.save(s);
    const cnt = Object.keys(s.nums).filter((k) => CLUB_GIRLS.some((g) => g.id === k)).length;
    n.line = 'Tady máš moje číslo';
    n.lineT = 2.8;
    n.cool = 12;
    for (let i = 0; i < 6; i++) this.heart(n);
    if (!quiet) UI.toast(`📱 ${n.look.name} ti dala číslo! (${cnt}/${CLUB_GIRLS.length})`);
    if (cnt >= CLUB_GIRLS.length && !s.own.crown) {
      s.own.crown = true;
      s.wear.crown = true;
      this.save(s);
      this.applyGear();
      setTimeout(() => UI.toast('Máš čísla od všech holek! Koruna krále klubu je tvoje 👑'), 1800);
    }
    this.renderNums();
    Sound.fanfare();
    return true;
  },

  renderNums() {
    const s = this.state();
    const cnt = CLUB_GIRLS.filter((g) => s.nums[g.id]).length;
    this.el('club-nums-n').textContent = `${cnt}/${CLUB_GIRLS.length}`;
  },

  openContacts() {
    const s = this.state(), grid = this.el('club-contacts-grid');
    grid.innerHTML = CLUB_GIRLS.map((g) => `<div class="club-ccard${s.nums[g.id] ? '' : ' unknown'}"><canvas data-g="${g.id}" aria-hidden="true"></canvas><b>${s.nums[g.id] ? g.name : '???'}</b><span>${s.nums[g.id] ? '📱 číslo máš' : 'zatím nic'}</span></div>`).join('');
    this.el('club-contacts').hidden = false;
    for (const c of grid.querySelectorAll('canvas')) {
      const g = CLUB_GIRLS.find((x) => x.id === c.dataset.g), D = g.dress;
      Renderer.portrait(c, g, { color: D.color, dark: D.dark, light: D.light }, 1, undefined, { head: true });
    }
    this.stick.id = null;
  },

  overlayOpen() {
    return !!(this.battle || this.kick || this.separe || this.shopOpen || !this.el('club-contacts').hidden || !this.el('club-photo').hidden);
  },

  /* ---------- fotokoutek ---------- */

  // Fotka jako z opravdového foťáku: skutečná scéna z klubu kolem tebe, blesk,
  // rozmazané pozadí, zrno, viněta, lehce nakřivo a datum v rohu.
  takePhoto() {
    const me = this.me;
    if (!me) return;
    const s = this.state(), now = performance.now();
    let partner = this.follower;
    if (!partner) {
      let bd = 260;
      for (const n of this.npcs) {
        if (!n.lady || n.staff) continue;
        const d = Math.hypot(n.x - me.x, n.y - me.y);
        if (d < bd) {
          bd = d;
          partner = n;
        }
      }
    }
    // na fotce stojíte těsně u sebe a díváte se na sebe
    const saved = [];
    const keep = (e) => saved.push([e, e.x, e.y, e.dir, e.lift, e.pl.mood, e.bob]);
    keep(me);
    if (partner) {
      keep(partner);
      if (!partner.podium) {
        partner.x = me.x + 50;
        partner.y = me.y + 4;
      }
      partner.dir = partner.x >= me.x ? -1 : 1;
      me.dir = -partner.dir;
      partner.bob = 0;
    }
    me.bob = 0;
    const W2 = 1200, H2 = 900;
    const mk = (w, h) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    };
    const A = mk(W2, H2), a = A.getContext('2d');
    a.fillStyle = '#07040d';
    a.fillRect(0, 0, W2, H2);
    const fx = partner ? (me.x + partner.x) / 2 : me.x;
    const fy = (partner ? Math.min(me.y, partner.y) : me.y) - 62;
    const viewH = 230 + rand(-15, 25), sc = H2 / viewH;
    a.translate(W2 / 2, H2 / 2);
    a.rotate(rand(-0.045, 0.045)); // z ruky, lehce nakřivo
    a.scale(sc, sc);
    a.translate(-fx - rand(-12, 12), -fy - rand(-6, 6));
    // přirozené výrazy: úsměv / smích
    me.pl.mood = Math.random() < 0.5 ? 1 : 0;
    if (partner) partner.pl.mood = Math.random() < 0.7 ? 1 : 0;
    this.drawWorld(a, now, true);
    for (const [e, x, y, d, l, m, bb] of saved) {
      e.x = x;
      e.y = y;
      e.dir = d;
      e.lift = l;
      e.pl.mood = m;
      e.bob = bb;
    }
    // --- zpracování jako fotka ---
    const P = mk(W2, H2), p = P.getContext('2d');
    // rozmazané pozadí (hloubka ostrosti)
    const sm = mk(W2 / 10, H2 / 10);
    sm.getContext('2d').drawImage(A, 0, 0, W2 / 10, H2 / 10);
    p.imageSmoothingEnabled = true;
    p.imageSmoothingQuality = 'high';
    p.drawImage(sm, 0, 0, W2, H2);
    // ostrý střed s lidmi
    const C = mk(W2, H2), c = C.getContext('2d');
    c.drawImage(A, 0, 0);
    c.globalCompositeOperation = 'destination-in';
    const m = c.createRadialGradient(W2 / 2, H2 * 0.55, H2 * 0.3, W2 / 2, H2 * 0.55, H2 * 0.72);
    m.addColorStop(0, 'rgba(0,0,0,1)');
    m.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = m;
    c.fillRect(0, 0, W2, H2);
    p.drawImage(C, 0, 0);
    // blesk: popředí přesvícené, okolí zapadne do tmy
    p.globalCompositeOperation = 'soft-light';
    let g = p.createRadialGradient(W2 / 2, H2 * 0.5, 10, W2 / 2, H2 * 0.5, H2 * 0.62);
    g.addColorStop(0, 'rgba(255,255,255,.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    p.fillStyle = g;
    p.fillRect(0, 0, W2, H2);
    p.globalCompositeOperation = 'screen';
    g = p.createRadialGradient(W2 / 2, H2 * 0.48, 10, W2 / 2, H2 * 0.48, H2 * 0.5);
    g.addColorStop(0, 'rgba(255,245,235,.22)');
    g.addColorStop(1, 'rgba(255,245,235,0)');
    p.fillStyle = g;
    p.fillRect(0, 0, W2, H2);
    p.globalCompositeOperation = 'multiply';
    g = p.createRadialGradient(W2 / 2, H2 * 0.5, H2 * 0.35, W2 / 2, H2 * 0.5, H2 * 0.95);
    g.addColorStop(0, 'rgb(255,255,255)');
    g.addColorStop(1, 'rgb(40,28,50)');
    p.fillStyle = g;
    p.fillRect(0, 0, W2, H2);
    // teplý nádech levného foťáku
    p.globalCompositeOperation = 'soft-light';
    p.fillStyle = 'rgba(255,170,100,.22)';
    p.fillRect(0, 0, W2, H2);
    // chromatická vada na krajích
    p.globalCompositeOperation = 'screen';
    p.globalAlpha = 0.06;
    p.drawImage(A, 4, 0);
    p.drawImage(A, -4, 1);
    p.globalAlpha = 1;
    // zrno
    if (!this._grain) {
      const n = mk(256, 256), nc = n.getContext('2d'), id = nc.createImageData(256, 256);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = 128 + (Math.random() - 0.5) * 255;
        id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
        id.data[i + 3] = 255;
      }
      nc.putImageData(id, 0, 0);
      this._grain = n;
    }
    p.globalCompositeOperation = 'overlay';
    p.globalAlpha = 0.16;
    p.fillStyle = p.createPattern(this._grain, 'repeat');
    p.fillRect(0, 0, W2, H2);
    p.globalAlpha = 1;
    p.globalCompositeOperation = 'source-over';
    // datum jako na digitálu
    const d = new Date(), z = (v) => String(v).padStart(2, '0');
    const stamp = `'${z(d.getFullYear() % 100)} ${z(d.getMonth() + 1)} ${z(d.getDate())}  ${z(d.getHours())}:${z(d.getMinutes())}`;
    p.font = 'bold 38px "Courier New", Courier, monospace';
    p.textAlign = 'right';
    p.textBaseline = 'bottom';
    p.shadowColor = 'rgba(255,120,20,.9)';
    p.shadowBlur = 10;
    p.fillStyle = '#ffa53a';
    p.fillText(stamp, W2 - 34, H2 - 26);
    p.shadowBlur = 0;
    this.photoCanvas = P;
    const url = P.toDataURL('image/jpeg', 0.9);
    this.el('club-photo-img').src = url;
    this.el('club-photo-save').href = url;
    this.el('club-photo-save').setAttribute('download', 'hot-peppers.jpg');
    this.el('club-photo').hidden = false;
    this.whiteT = 1;
    this.stick.id = null;
    if (Sound.ctx && !Sound.muted) {
      Sound.hiss(0.05, 0.3, 'highpass', 3000);
      Sound.hiss(0.08, 0.25, 'bandpass', 1200, 1, 0.09);
    }
    if (partner && partner.lady) {
      partner.line = 'Pošli mi ji!';
      partner.lineT = 2.4;
    }
  },

  async sharePhoto() {
    try {
      const blob = await new Promise((res) => this.photoCanvas.toBlob(res, 'image/jpeg', 0.9));
      const file = new File([blob], 'hot-peppers.jpg', { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Hot Peppers' });
      else this.el('club-photo-save').click();
    } catch (e) { /* zrušeno */ }
  },

  syncOut() {
    if (Board.nick()) Board.publish();
    if (Account.logged) setTimeout(() => Account.sync(), 800);
  },

  /* ---------- kreslení ---------- */

  scale() {
    return this.cv.height / (CLUB_VIEW_H * (this.zoom || 1));
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
    const vh = CLUB_VIEW_H * (this.zoom || 1);
    const cy = clamp(this.cam.y, vh / 2 - 30, CLUB_H - vh / 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#07040d';
    ctx.fillRect(0, 0, w, h);
    const pr = this.phase === 'in' ? this.promile || 0 : 0;
    const sway = pr > 0.4 ? Math.sin(this.t * 0.8) * 0.018 * Math.min(3, pr) : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const tr1 = this.phase === 'in' ? this.trip : null;
    const shake = tr1 && tr1.kind === 'turbo' && tr1.t >= tr1.high ? 3 * dpr : 0;
    ctx.translate(w / 2 + rand(-shake, shake), h / 2 + rand(-shake, shake));
    ctx.rotate(sway);
    ctx.scale(sc, sc);
    ctx.translate(-cx, -cy);
    this.view = { x0: cx - vw / 2, x1: cx + vw / 2, y0: cy - CLUB_VIEW_H / 2, y1: cy + CLUB_VIEW_H / 2 };
    this.drawWorld(ctx, now, false);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawPost(ctx, w, h, dpr, pr, now);
  },

  // Celý klub ve světových souřadnicích (i pro fotku – ta je bez bublin a značek).
  drawWorld(ctx, now, photo) {
    this._photo = photo;
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
    const tr0 = this.trip;
    if (tr0 && tr0.kind === 'turbo' && tr0.t < tr0.high && this.me && !photo) {
      const me = this.me, ox = me.x, oy = me.y, od = me.dir;
      this._ghost = true;
      for (let i = tr0.trail.length - 1; i >= 2; i -= 3) {
        const g = tr0.trail[i];
        ctx.save();
        ctx.globalAlpha = 0.35 * (1 - i / tr0.trail.length);
        me.x = g.x;
        me.y = g.y;
        me.dir = g.dir;
        this.drawChar(ctx, me, now);
        ctx.restore();
      }
      me.x = ox;
      me.y = oy;
      me.dir = od;
      this._ghost = false;
    }
    for (const d of list) d.f();
    for (const q of this.parts) if (!(q.k === 'cup' && q.vy === 0)) this.drawPart(ctx, q);
    this.drawLights(ctx, now);
    this.drawDisco(ctx, now);
    this._photo = false;
    if (photo) return;
    // bubliny obsluhy
    const me0 = this.me;
    if (me0 && this.phase === 'in' && me0.lineT > 0 && !this.separe) drawSpeech(ctx, me0.line, me0.x, me0.y - (me0.pl.R + me0.pl.F) * CLUB_K - 40, '#ffc93c', 15, 0);
    for (const n of this.npcs) {
      if (this.separe && n === this.separe.n) continue;
      const text = n.talk && n.say ? n.say : n.lineT > 0 ? n.line : '';
      if (text) drawSpeech(ctx, text, n.x, n.y - n.lift - (n.pl.R + n.pl.F) * CLUB_K - 34, n.lady ? '#ff4d9a' : '#ff3d5a', 15, 0);
    }
  },

  // Efekty přes celou obrazovku (opilost, drogy, souboj, HUD).
  drawPost(ctx, w, h, dpr, pr, now) {
    if (pr > 1) {
      // dvojité vidění
      ctx.save();
      ctx.globalAlpha = Math.min(0.38, (pr - 1) * 0.22);
      ctx.drawImage(this.cv, Math.sin(this.t * 1.3) * 14 * dpr * Math.min(2, pr - 0.8), Math.cos(this.t * 0.9) * 4 * dpr);
      ctx.restore();
    }
    if (pr > 2) {
      ctx.fillStyle = `rgba(90,200,60,${Math.min(0.18, (pr - 2) * 0.2)})`;
      ctx.fillRect(0, 0, w, h);
    }
    const tr = this.phase === 'in' ? this.trip : null;
    if (tr) {
      const high = tr.t < tr.high;
      ctx.save();
      if (tr.kind === 'houba' && (high || tr.t < tr.high + tr.down)) {
        // vlnění: obraz rozřezaný na pruhy posunuté do vlny
        const amp = (high ? 22 : 7) * dpr;
        if (!this._tmp) this._tmp = document.createElement('canvas');
        const tmp = this._tmp;
        if (tmp.width !== w || tmp.height !== h) {
          tmp.width = w;
          tmp.height = h;
        }
        tmp.getContext('2d').drawImage(this.cv, 0, 0);
        const band = Math.max(4, Math.round(6 * dpr));
        for (let y = 0; y < h; y += band) ctx.drawImage(tmp, 0, y, w, band, Math.sin(y * 0.012 / dpr + this.t * 3) * amp, y, w, band);
        if (high) {
          ctx.globalCompositeOperation = 'hue';
          ctx.fillStyle = `hsla(${(this.t * 60) % 360},100%,50%,.4)`;
          ctx.fillRect(0, 0, w, h);
        }
      } else if (high && tr.kind === 'zelenac') {
        ctx.fillStyle = 'rgba(80,200,90,.22)';
        ctx.fillRect(0, 0, w, h);
        const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.8);
        g.addColorStop(0, 'rgba(200,255,200,0)');
        g.addColorStop(1, 'rgba(200,255,200,.35)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      } else if (high && tr.kind === 'turbo') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(120,200,255,.25)';
        ctx.lineWidth = 3 * dpr;
        for (let i = 0; i < 14; i++) {
          const y = ((i * 97 + this.t * 900) % h);
          line(ctx, 0, y, w * 0.25, y);
          line(ctx, w * 0.75, h - y, w, h - y);
        }
      } else if (high && tr.kind === 'pepr') {
        ctx.globalCompositeOperation = 'hue';
        ctx.fillStyle = `hsla(${(this.t * 160) % 360},100%,50%,.55)`;
        ctx.fillRect(0, 0, w, h);
      } else if (high) {
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = `rgba(255,90,190,${0.45 + Math.sin(this.t * 4) * 0.15})`;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.globalCompositeOperation = 'saturation';
        ctx.fillStyle = 'rgba(128,128,128,.8)';
        ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0,0,20,.25)';
        ctx.fillRect(0, 0, w, h);
        if (tr.kind === 'zelenac') {
          // klíží se oči
          const lid = Math.max(0, Math.sin(this.t * 1.3)) ** 3 * h * 0.5;
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, w, lid);
          ctx.fillRect(0, h - lid, w, lid);
        }
      }
      ctx.restore();
    }
    if (this.blackT > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this.blackT * 1.4)})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (this.show && this.show.t < 3.2 && this.phase === 'in' && !this.battle) {
      const a = Math.min(1, this.show.t * 3, (3.2 - this.show.t) * 2);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.font = `${44 * dpr}px ${FONT_D}`;
      ctx.lineWidth = 10 * dpr;
      ctx.strokeStyle = '#5a0718';
      const txt = `SHOW · ${this.show.girl.look.name.toUpperCase()}`;
      ctx.strokeText(txt, w / 2, h * 0.3);
      ctx.fillStyle = '#ffd0e4';
      ctx.fillText(txt, w / 2, h * 0.3);
      ctx.restore();
    }
    if (this.priv) {
      const pv = this.priv, n = pv.n, sc = this.scale(), r = this.cv.getBoundingClientRect();
      // reflektor jen na VIP pódium, zbytek klubu potemní
      const vh = CLUB_VIEW_H * (this.zoom || 1), vw = w / sc;
      const cx = clamp(this.cam.x, vw / 2, CLUB_W - vw / 2), cy = clamp(this.cam.y, vh / 2 - 30, CLUB_H - vh / 2);
      const sx = (n.hx - cx) * sc + w / 2, sy = (n.hy - 60 - cy) * sc + h / 2;
      const g = ctx.createRadialGradient(sx, sy, 60 * sc, sx, sy, 260 * sc);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,.72)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      if (pv.t < 3) {
        const a = Math.min(1, pv.t * 3, (3 - pv.t) * 2);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.font = `${38 * dpr}px ${FONT_D}`;
        ctx.lineWidth = 9 * dpr;
        ctx.strokeStyle = '#5a0718';
        const txt = `SOUKROMÁ SHOW · ${n.look.name.toUpperCase()}`;
        ctx.strokeText(txt, w / 2, h * 0.16);
        ctx.fillStyle = '#ffd0e4';
        ctx.fillText(txt, w / 2, h * 0.16);
        ctx.restore();
      }
      const left = Math.ceil(pv.dur - pv.t);
      ctx.font = `${15 * dpr}px ${FONT_D}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffd0e4';
      ctx.fillText(`🪶 Soukromá show · ${left} s · hozeno ${pv.tips}×`, w / 2, 60 * dpr);
      void r;
    }
    if (this.separe) this.drawSepare(ctx, w, h, dpr);
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
    if (this.whiteT > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.whiteT * 0.85})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (this.battle) this.drawBattle(ctx, w, h, dpr);
    else if (this.phase === 'in') {
      this.drawStick(ctx, dpr);
      // co hraje
      const st = CLUB_STYLES[this.style || 'house'];
      ctx.font = `${13 * dpr}px ${FONT_D}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.fillText(`♪ ${st.name} · ${this.bpm()} BPM${this.dance ? ' · ' + CLUB_MOVES[this.move || 0] : ''}`, w / 2, h - 12 * dpr);
      if (tr) {
        const high = tr.t < tr.high, left = Math.ceil(high ? tr.high - tr.t : tr.high + tr.down - tr.t);
        ctx.font = `${16 * dpr}px ${FONT_D}`;
        ctx.textBaseline = 'top';
        ctx.fillStyle = high ? '#ff7ad9' : '#9fb0c7';
        const lab = { pepr: '❄️ Jedeš', smajl: '💊 Láska', houba: '🍄 Vlnění', zelenac: '🌿 Pohoda', turbo: '⚡ Turbo' }[tr.kind];
        ctx.fillText(high ? `${lab} · ${left} s` : `😵 Dojezd${tr.kind === 'houba' ? ' – ovládání naruby' : ''} · ${left} s`, w / 2, (pr > 0.05 ? 36 : 14) * dpr);
      }
      if (pr > 0.05) {
        ctx.font = `${16 * dpr}px ${FONT_D}`;
        ctx.textBaseline = 'top';
        ctx.fillStyle = pr > 2.2 ? '#7dff5a' : pr > 1.2 ? '#ffb02e' : '#ffffff';
        ctx.fillText(`🍺 ${this.promileText()}${pr > 2.2 ? ' – je ti blbě!' : pr > 1.2 ? ' – jsi nalitej' : ''}`, w / 2, 14 * dpr);
      }
    }
  },

  // Separé: zatažený závěs, srdíčka a nic víc.
  drawSepare(ctx, w, h, dpr) {
    const t = this.separe.t, a = Math.min(1, t * 2, (4.5 - t) * 2);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = '#12040a';
    ctx.fillRect(0, 0, w, h);
    const n = 9, cw = w / n;
    for (let i = 0; i < n; i++) {
      const wob = Math.sin(t * 9 + i * 1.3) * 10 * dpr * (t > 1 && t < 3.6 ? 1 : 0.2);
      const g = ctx.createLinearGradient(i * cw, 0, (i + 1) * cw, 0);
      g.addColorStop(0, '#5a0716');
      g.addColorStop(0.5, '#c0283d');
      g.addColorStop(1, '#5a0716');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(i * cw, 0);
      ctx.lineTo((i + 1) * cw, 0);
      ctx.lineTo((i + 1) * cw + wob, h);
      ctx.lineTo(i * cw + wob, h);
      ctx.closePath();
      ctx.fill();
    }
    // stín tanečnice za závěsem
    const sx = w * 0.5 + Math.sin(t * 2.2) * w * 0.06, sy = h * 0.74, k = h / 400;
    ctx.fillStyle = 'rgba(20,0,8,.55)';
    circle(ctx, sx, sy - 120 * k, 34 * k);
    ctx.fill();
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.sin(t * 4.4) * 0.12);
    ctx.beginPath();
    ctx.moveTo(-18 * k, -86 * k);
    ctx.quadraticCurveTo(-28 * k, -40 * k, -14 * k, -10 * k);
    ctx.quadraticCurveTo(-30 * k, 20 * k, -16 * k, 90 * k);
    ctx.lineTo(16 * k, 90 * k);
    ctx.quadraticCurveTo(30 * k, 20 * k, 14 * k, -10 * k);
    ctx.quadraticCurveTo(28 * k, -40 * k, 18 * k, -86 * k);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 9 * k;
    ctx.strokeStyle = 'rgba(20,0,8,.55)';
    ctx.lineCap = 'round';
    line(ctx, -16 * k, -78 * k, -40 * k + Math.sin(t * 4) * 10 * k, -140 * k);
    line(ctx, 16 * k, -78 * k, 40 * k - Math.sin(t * 4) * 10 * k, -140 * k);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = `${58 * dpr}px ${FONT_D}`;
    ctx.lineWidth = 12 * dpr;
    ctx.strokeStyle = '#2a0610';
    ctx.strokeText('SOUKROMÝ TANEC', w / 2, h * 0.2);
    ctx.fillStyle = '#ffd0d8';
    ctx.fillText('SOUKROMÝ TANEC', w / 2, h * 0.2);
    ctx.font = `${22 * dpr}px ${FONT_D}`;
    ctx.lineWidth = 6 * dpr;
    ctx.strokeText('Co se stane v separé, zůstane v separé', w / 2, h * 0.9);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Co se stane v separé, zůstane v separé', w / 2, h * 0.9);
    for (let i = 0; i < 6; i++) {
      const hx = w / 2 + Math.sin(t * 2 + i * 1.7) * w * 0.3, hy = h * 0.8 - ((t * 60 * dpr + i * 50 * dpr) % (h * 0.6));
      ctx.save();
      ctx.translate(hx, hy);
      ctx.scale(2 * dpr, 2 * dpr);
      ctx.fillStyle = '#ff4d8a';
      ctx.beginPath();
      ctx.moveTo(0, 5);
      ctx.bezierCurveTo(-9, -2, -5, -10, 0, -5);
      ctx.bezierCurveTo(5, -10, 9, -2, 0, 5);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  // Šipka (vyplněná = nota, obrys = cíl).
  arrow(ctx, x, y, s, rot, fill, stroke, glow, dim) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(0, -s);
    ctx.lineTo(0, -s * 0.45);
    ctx.lineTo(-s, -s * 0.45);
    ctx.lineTo(-s, s * 0.45);
    ctx.lineTo(0, s * 0.45);
    ctx.lineTo(0, s);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = dim ? 'rgba(110,110,130,.55)' : fill;
      ctx.fill();
      ctx.lineWidth = s * 0.14;
      ctx.strokeStyle = '#0b1220';
      ctx.stroke();
    } else {
      if (glow > 0) {
        ctx.fillStyle = hexA(stroke, glow * 0.7);
        ctx.fill();
      }
      ctx.lineWidth = s * 0.16;
      ctx.strokeStyle = hexA(stroke, 0.55 + glow * 0.45);
      ctx.stroke();
    }
    ctx.restore();
  },

  // Dráha se šipkami, skóre a odpočet tanečního souboje.
  drawBattle(ctx, w, h, dpr) {
    const b = this.battle;
    if (b.done) return;
    const pads = this.el('club-pads').getBoundingClientRect(), r = this.cv.getBoundingClientRect();
    const gap = 80 * dpr;
    const cx = pads.width ? (pads.left + pads.width / 2 - r.left) * dpr : w / 2;
    const hitY = pads.width ? (pads.top - r.top - 34) * dpr : h - 140 * dpr;
    const topY = 64 * dpr, speed = (hitY - topY) / 1.5;
    ctx.fillStyle = 'rgba(5,3,10,.6)';
    rrect(ctx, cx - 2 * gap, topY - 14 * dpr, 4 * gap, hitY - topY + 48 * dpr, 18 * dpr);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      const x = cx + (i - 1.5) * gap;
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      ctx.fillRect(x - 1 * dpr, topY, 2 * dpr, hitY - topY);
      this.arrow(ctx, x, hitY, 26 * dpr, CLUB_LANES[i].rot, null, CLUB_LANES[i].col, b.flash[i]);
    }
    for (const n of b.notes) {
      if (n.j === 'p' || n.j === 'g') continue;
      const y = hitY - (n.t - b.t) * speed;
      if (y < topY - 30 * dpr || y > hitY + 50 * dpr) continue;
      this.arrow(ctx, cx + (n.lane - 1.5) * gap, y, 24 * dpr, CLUB_LANES[n.lane].rot, CLUB_LANES[n.lane].col, null, 0, n.j === 'miss');
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const big = (text, y, size, col) => {
      ctx.font = `${size * dpr}px ${FONT_D}`;
      ctx.lineWidth = size * 0.22 * dpr;
      ctx.strokeStyle = '#0b1220';
      ctx.strokeText(text, cx, y);
      ctx.fillStyle = col;
      ctx.fillText(text, cx, y);
    };
    // odpočet
    if (b.t < b.lead * b.beat) {
      const k = Math.ceil(b.lead - b.t / b.beat - 0.001);
      big(k > 3 ? 'PŘIPRAV SE!' : k > 0 ? String(k) : 'TEĎ!', (topY + hitY) / 2, k > 3 ? 34 : 60, '#ffc93c');
    } else if (b.judgeT > 0) {
      big(b.judge, (topY + hitY) / 2 - 20 * dpr, 30 + b.judgeT * 20, b.judgeCol);
    }
    if (b.combo >= 3) big(`${b.combo}× SÉRIE`, (topY + hitY) / 2 + 30 * dpr, 20, '#ffffff');
    // skóre nahoře: já vs. soupeř
    const acc = Math.round(this.battleAcc(b) * 100), oppAcc = Math.round(clamp(b.oppAcc + Math.sin(b.t * 1.3) * 0.04, 0, 1) * 100);
    ctx.font = `${18 * dpr}px ${FONT_D}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffc93c';
    ctx.fillText(`TY ${acc} %`, cx - 2.2 * gap, 18 * dpr);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff9aac';
    ctx.fillText(`${oppAcc} % ${charById(b.opp.id).name.toUpperCase()}`, cx + 2.2 * gap, 18 * dpr);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('TANEČNÍ SOUBOJ', cx, 18 * dpr);
    // průběh
    const prog = clamp(b.t / b.end, 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ctx.fillRect(cx - 2 * gap, 44 * dpr, 4 * gap, 5 * dpr);
    ctx.fillStyle = '#ff3d5a';
    ctx.fillRect(cx - 2 * gap, 44 * dpr, 4 * gap * prog, 5 * dpr);
  },

  // Disco koule nad parketem (odlesky na podlaze kreslí drawRoom).
  drawDisco(ctx, now) {
    const x = 750, y = 262, r = 24, rot = now * 0.0012;
    ctx.strokeStyle = 'rgba(200,200,220,.6)';
    ctx.lineWidth = 2;
    line(ctx, x, y - r, x, y - 120);
    ctx.save();
    circle(ctx, x, y, r);
    ctx.clip();
    const g = ctx.createRadialGradient(x - 8, y - 8, 2, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, '#a8b0c8');
    g.addColorStop(1, '#4a5068');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    for (let i = -4; i <= 4; i++) {
      for (let j = -4; j <= 4; j++) {
        const lit = Math.sin(i * 1.7 + j * 2.3 + rot * 6) > 0.6;
        if (!lit) continue;
        ctx.fillStyle = `hsla(${(i * 40 + j * 70 + now * 0.05) % 360},80%,85%,.9)`;
        ctx.fillRect(x + i * 5.6 - 2.4 + ((rot * 20) % 5.6), y + j * 5.6 - 2.4, 4.4, 4.4);
      }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 1.5;
    circle(ctx, x, y, r);
    ctx.stroke();
    // záblesky kolem koule
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const a = rot * 3 + i * 1.6, sx = x + Math.cos(a) * (r + 6), sy = y + Math.sin(a) * (r + 6);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      star(ctx, sx, sy, 5, 1.6);
      ctx.fill();
    }
    ctx.restore();
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
    // louže od blití
    for (const d of this.decals || []) {
      ctx.fillStyle = 'rgba(140,190,40,.75)';
      oval(ctx, d.x, d.y, d.r, d.r * 0.42, d.rot);
      ctx.fill();
      ctx.fillStyle = 'rgba(200,230,90,.6)';
      oval(ctx, d.x - d.r * 0.3, d.y - 3, d.r * 0.3, d.r * 0.12, d.rot);
      ctx.fill();
    }
    // separé ve VIP (červený závěs na pravé stěně)
    const S0 = CLUB_SEPARE;
    ctx.fillStyle = '#2a0610';
    ctx.fillRect(S0.x0 - 6, S0.y0 - 90, S0.x1 - S0.x0 + 12, S0.y1 - S0.y0 + 90);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#8a0f2c' : '#c0283d';
      ctx.fillRect(S0.x0 + i * 7.5, S0.y0 - 84, 7.5, S0.y1 - S0.y0 + 80);
    }
    this.neonText(ctx, 'SEPARÉ', S0.x0 - 40, S0.y0 - 108, 18, '#ff4d9a', beat);
    // kruh pro taneční souboj
    const R0 = CLUB_RING;
    ctx.strokeStyle = `rgba(255,201,60,${0.55 + beat * 0.4})`;
    ctx.lineWidth = 5;
    oval(ctx, R0.x, R0.y, R0.r * 1.5, R0.r * 0.95);
    ctx.stroke();
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 2;
    oval(ctx, R0.x, R0.y, R0.r * 1.5 - 10, R0.r * 0.95 - 7);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.font = `16px ${FONT_D}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,201,60,.85)';
    ctx.fillText('DANCE BATTLE', R0.x, R0.y + R0.r * 0.95 + 14);
    ctx.restore();
    // odlesky disco koule po parketu
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const a = now * 0.0004 + i * 2.4, rr = 60 + ((i * 53) % 220);
      const sx = 750 + Math.cos(a) * rr * 1.3, sy = 485 + Math.sin(a) * rr * 0.6;
      if (sy < CLUB_WALL + 10) continue;
      ctx.fillStyle = `hsla(${(i * 47) % 360},90%,80%,${0.16 + this.pulse * 0.12})`;
      oval(ctx, sx, sy, 7, 3.5);
      ctx.fill();
    }
    ctx.restore();
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
    ctx.fillStyle = '#1b1028';
    ctx.fillRect(900, CLUB_FLOOR_B - 4, 90, 44);
    this.neonText(ctx, 'WC', 945, CLUB_FLOOR_B + 22, 18, '#4fe0ff', 0.2);
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
    } else if (q.kind === 'booth') {
      // fotokoutek: budka se závěsem a bleskem
      box(q.x0, q.y0, q.x1, q.y1, 120, '#2b1a3a', '#1a0f26', '#ff4d9a');
      ctx.fillStyle = '#c0283d';
      for (let i = 0; i < 5; i++) {
        rrect(ctx, q.x0 + 10 + i * 22, q.y1 - 108, 20, 100, 8);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      for (let i = 0; i < 5; i++) ctx.fillRect(q.x0 + 26 + i * 22, q.y1 - 104, 3, 94);
      this.neonText(ctx, 'FOTO', (q.x0 + q.x1) / 2, q.y0 - 140, 22, '#4fe0ff', this.pulse);
      ctx.fillStyle = this.whiteT > 0 ? '#ffffff' : '#8a93a8';
      circle(ctx, q.x1 - 18, q.y0 - 112, 7);
      ctx.fill();
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
    // chromová tyč
    const pg = ctx.createLinearGradient(q.x - 4, 0, q.x + 4, 0);
    pg.addColorStop(0, '#8a93a8');
    pg.addColorStop(0.5, '#ffffff');
    pg.addColorStop(1, '#6a7388');
    ctx.fillStyle = pg;
    ctx.fillRect(q.x - 3.5, q.y - h - 240, 7, 240);
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
    if (this.separe && (e === this.me || e === this.separe.n)) return;
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
    if (e.me && !this._photo && !this._ghost) {
      // kroužek pod mým hráčem
      ctx.strokeStyle = 'rgba(255,201,60,.85)';
      ctx.lineWidth = 3;
      oval(ctx, e.x, e.y, 30, 10);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(e.x, e.y - e.bob - e.lift);
    // holky se při tanci vlní v bocích
    if (e.lady && p.mood > 0) ctx.rotate(e.tipT > 0 ? Math.sin(now * 0.045) * 0.13 : Math.sin(this.beatPos * Math.PI) * 0.09);
    if (e.me && (this.promile || 0) > 0.8) ctx.rotate(Math.sin(this.t * 2.1) * 0.06 * Math.min(3, this.promile));
    if (e.stunT > 0) ctx.rotate(Math.sin(now * 0.03) * 0.35);
    if (e.me && this.dance) {
      // taneční pohyby
      const ph = this.beatPos, mv = this.move || 0;
      if (mv === 1) {
        ctx.rotate((Math.floor(ph * 2) % 2 ? 1 : -1) * 0.08);
        p.dir = Math.floor(ph) % 2 ? 1 : -1;
      } else if (mv === 2) {
        const c = Math.cos(ph * Math.PI);
        ctx.scale(Math.abs(c) < 0.15 ? (c < 0 ? -0.15 : 0.15) : c, 1);
      } else if (mv === 3) ctx.translate(0, -Math.abs(Math.sin(ph * Math.PI)) * 24);
    }
    if (e.poseT > 0) {
      // póza v tanečním souboji podle šipky
      const u = e.poseT / 0.22;
      if (e.pose === 0) ctx.rotate(-0.28 * u);
      else if (e.pose === 3) ctx.rotate(0.28 * u);
      else if (e.pose === 1) ctx.scale(1 + 0.1 * u, 1 - 0.14 * u);
      else ctx.translate(0, -28 * u);
    }
    ctx.scale(k, k);
    p.x = 0;
    p.y = -(p.R + p.F);
    p.gear = e.gear || null;
    Renderer.drawPlayer(ctx, p, { x: p.dir * 300, y: p.y - 20 }, [e.kit, e.kit], now);
    ctx.restore();
    if (e.fans) this.drawFans(ctx, e, now);
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
    if (e.me && this.phase === 'in' && !this._photo && !this._ghost) {
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
    } else if (q.k === 'flash') {
      const u = q.t / q.life;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - u)})`;
      circle(ctx, q.x, q.y, 20 + u * 90);
      ctx.fill();
      ctx.restore();
    } else if (q.k === 'top') {
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(q.vy ? q.t * 9 : 0.3);
      ctx.fillStyle = q.col;
      ctx.strokeStyle = '#0b1220';
      ctx.lineWidth = 1.2;
      rrect(ctx, -9, -3, 18, 6, 3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (q.k === 'smoke') {
      ctx.fillStyle = `rgba(190,230,190,${0.35 * a})`;
      circle(ctx, q.x, q.y, q.s * (1 + q.t));
      ctx.fill();
    } else if (q.k === 'spark') {
      ctx.fillStyle = q.col;
      ctx.globalAlpha = a;
      star(ctx, q.x, q.y, 4, 1.4);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (q.k === 'puke') {
      ctx.fillStyle = `rgba(150,200,50,${Math.min(1, a * 2)})`;
      circle(ctx, q.x, q.y, q.s);
      ctx.fill();
    } else if (q.k === 'wave') {
      const u = q.t / q.life;
      ctx.strokeStyle = `rgba(160,220,90,${1 - u})`;
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        oval(ctx, q.x, q.y, 20 + u * 120 + i * 14, 12 + u * 60 + i * 8);
        ctx.stroke();
      }
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
    // dým nad parketem
    for (let i = 0; i < 6; i++) {
      const fx = 560 + ((now * 0.012 * (1 + i * 0.2) + i * 170) % 520), fy = 420 + (i % 3) * 90;
      const g = ctx.createRadialGradient(fx, fy, 10, fx, fy, 150);
      g.addColorStop(0, `rgba(170,120,255,${party ? 0.12 : 0.05})`);
      g.addColorStop(1, 'rgba(170,120,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(fx - 150, fy - 150, 300, 300);
    }
    // reflektory na tanečnici při show
    if (this.show) {
      const g = this.show.girl;
      for (const [sx, col] of [[g.hx - 260, '255,240,200'], [g.hx + 260, '255,120,200']]) {
        const grd = ctx.createLinearGradient(sx, 0, g.x, g.y);
        grd.addColorStop(0, `rgba(${col},.05)`);
        grd.addColorStop(1, `rgba(${col},.35)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(sx - 8, 0);
        ctx.lineTo(sx + 8, 0);
        ctx.lineTo(g.x + 60, g.y + 10);
        ctx.lineTo(g.x - 60, g.y + 10);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,240,200,.18)';
      oval(ctx, g.hx, g.hy, 70, 22);
      ctx.fill();
    }
    // lasery z DJ pultu (při hitu)
    if (party) {
      for (let i = 0; i < 10; i++) {
        const a = Math.PI * 0.12 + (i / 9) * Math.PI * 0.76 + Math.sin(now * 0.002 + i) * 0.18;
        ctx.strokeStyle = i % 2 ? 'rgba(61,255,122,.55)' : 'rgba(255,61,90,.55)';
        ctx.lineWidth = 2.2;
        line(ctx, 750, 200, 750 + Math.cos(a) * 1100, 200 + Math.sin(a) * 900);
      }
    }
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
