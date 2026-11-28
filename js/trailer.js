'use strict';

/*
 * Trailer k updatu „největší update všech dob“ (asi 53 s): spustí se odkazem s ?trailer.
 * 1. část: fotbalové novinky (Berry, Ay$kr, jóga, Do hrobu, skiny, Točná) – skutečné zápasy ve hře.
 * 2. část: „zvrtne se to“ – auta ve 3D městě, neon Hot Peppers, klub, VIP, drogy (vymyšlené),
 *    panák, online, FIFAgram. Klub a jízda se kreslí do vlastních pláten a přes ně jdou titulky
 *    a nové animace (neon, telefon, glitch). Hudba je syntetizovaná (WebAudio), takže jde zahrát
 *    živě i vyrenderovat do souboru (?trailer=rec nahrává bez zvuku a tlačítek).
 */

const TR_LEN = 53;
const TR_IDLE = { left: false, right: false, jump: false, kick: false, super: false, move: 0 };
const TR_B2 = 60 / 140; // doba ve 2. části (140 BPM)
const TR_A2 = 24;       // začátek 2. části (drop)
const trBar = (n) => TR_A2 + n * 4 * TR_B2;
const trEase = {
  out: (k) => 1 - (1 - k) ** 3,
  back: (k) => { const c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; },
};
const trClamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

const Trailer = {
  on: false,
  rec: false,
  t: 0,
  t0: 0,
  cues: [],
  caps: [],
  flashes: [],
  booms: [],
  pics: {},
  scene: '',
  layer: 'game', // co je pod titulky: game (zápas), drive (jízda), club (klub), frozen (zastavený snímek)
  ac: null,
  intents: {},

  init() {
    const q = location.search + location.hash;
    if (!/trailer/.test(q)) return;
    this.rec = /trailer=rec/.test(q);
    this.manual = this.rec; // nahrávání: snímky řídí skript (window.hlavouniTick)
    document.body.classList.add('trailer-mode');
    const cv = document.createElement('canvas');
    cv.id = 'trailer-ov';
    document.body.appendChild(cv);
    this.ov = cv;
    this.octx = cv.getContext('2d');
    const box = document.createElement('div');
    box.id = 'trailer-pics';
    document.body.appendChild(box);
    this.picBox = box;
    Sound.quiet = true;
    UI.show('none');
    Touch.show(false);
    if (this.rec) return; // nahrávání spustí skript sám (Trailer.begin())
    const b = document.createElement('button');
    b.id = 'trailer-play';
    b.type = 'button';
    b.innerHTML = '<span>▶</span> PUSTIT TRAILER';
    b.addEventListener('click', () => {
      b.hidden = true;
      this.begin(true);
    });
    document.body.appendChild(b);
    this.playBtn = b;
  },

  begin(audio) {
    this.on = true;
    this.t = 0;
    this.lastT = 0;
    this.caps = [];
    this.flashes = [];
    this.booms = [];
    this.layer = 'game';
    this.buildCues();
    Game.screen = 'trailer';
    Game.state = 'menu';
    UI.show('none');
    Touch.show(false);
    Sound.quiet = true;
    let delay = 0;
    if (audio) {
      try {
        this.ac = this.ac || new (window.AudioContext || window.webkitAudioContext)();
        this.ac.resume();
        delay = 0.08;
        trailerScore(this.ac, this.ac.destination, this.ac.currentTime + delay);
      } catch (e) { /* bez zvuku */ }
    }
    // začátek se odměří od prvního snímku (stejné hodiny jako herní smyčka)
    this.t0 = null;
    this.delay = delay;
  },

  end() {
    this.on = false;
    Game.camOverride = null;
    if (this.rec) return;
    const b = this.playBtn;
    b.innerHTML = '<span>↻</span> ZNOVU';
    b.hidden = false;
    let go = document.getElementById('trailer-game');
    if (!go) {
      go = document.createElement('a');
      go.id = 'trailer-game';
      go.href = location.pathname;
      go.textContent = 'HRÁT FIFA67';
      document.body.appendChild(go);
    }
  },

  /* ---------------- scénář ---------------- */

  cue(at, fn) {
    this.cues.push({ at, fn, done: false });
  },
  cap(at, dur, text, o = {}) {
    this.caps.push(Object.assign({ at, dur, text }, o));
  },
  flash(at) {
    this.flashes.push(at);
  },
  boom(at, amp = 14) {
    this.booms.push({ at, amp });
  },
  // krátké zmáčknutí tlačítka hráčem ve scéně (index hráče)
  press(i, it, dur = 0.05) {
    this.intents['tr' + i] = { it: Object.assign({}, TR_IDLE, it), until: this.t + dur };
  },
  intentFor(r) {
    const o = this.intents[r];
    return o && this.t <= o.until ? o.it : TR_IDLE;
  },

  buildCues() {
    this.cues = [];
    const cam = (x, y, z, speed = 3, cut = false) => { Game.camOverride = { x, y, z, speed, cut }; };
    const P = () => Game.match.players;
    const byId = (id) => P().find((p) => p.look.id === id);
    const scene = (name, layer = 'game') => {
      this.scene = name;
      this.layer = layer;
    };

    /* ===== 1. ČÁST: FOTBAL ===== */

    // 0–3,6: nájezd přes stadion
    this.cue(0, () => {
      this.setMatch({ format: '2v2', duos: [11, 12], ai: true });
      scene('intro');
      cam(W / 2 - 200, 300, 1.2, 0.5, true);
    });
    this.cue(1.8, () => cam(W / 2 + 200, 360, 1.35, 0.6));
    this.cap(0.4, 1.4, 'FIFA67 UVÁDÍ', { y: 330, size: 30, ui: true, sub: true });
    this.cap(1.7, 0.95, 'NEJVĚTŠÍ', { y: 300, size: 92 });
    this.cap(2.6, 1.0, 'UPDATE VŠECH DOB', { y: 400, size: 72, color: '#ffc93c' });
    // 3,6: drop – logo
    this.cue(3.6, () => { scene('logo'); cam(W / 2, 360, 1.05, 2); });
    this.flash(3.6);
    this.boom(3.6, 24);

    // 5,6–8,1: Berry – králičí skoky
    this.cue(5.6, () => {
      scene('game');
      this.setMatch({ format: '1v1', chars: ['berry', 'kiki'], pos: [520, 820], ballX: 690 });
      cam(560, 420, 1.7, 5, true);
    });
    this.flash(5.6);
    this.cue(5.85, () => {
      const p = byId('berry');
      p.hop = true;
      Effects.rings.push({ x: p.x, y: p.y + 40, t: 0, dur: 0.4, r0: 10, r1: 110, rgb: '255,154,208' });
      Effects.pop('KRÁLIČÍ SKOKY!', p.x, p.y - 140, '#ff9ad0', 40);
    });
    this.boom(5.85, 10);
    this.cue(6.3, () => {
      this.press(0, { jump: true });
      cam(560, 300, 1.35, 3);
    });
    this.cue(6.55, () => {
      const p = byId('berry'), b = Game.match.ball;
      b.held = false;
      b.x = p.x + 30;
      b.y = p.y - p.R - 70;
      b.vx = 0;
      b.vy = 60;
    });
    this.cap(5.75, 2.3, 'BERRY', { x: 920, y: 560, size: 96, sub2: 'KRÁLIČÍ SKOKY · SKÁČE 2× VÝŠ · PŘEPÍNÁ SE KDYKOLI' });

    // 8,1–10,6: Bémič Š. – rapper Ay$kr
    this.cue(8.1, () => {
      scene('game');
      this.setMatch({ format: '2v2', duos: [11, 0], ai: true });
      Game.match.usePower(byId('bemics'));
      cam(W * 0.2 + 40, 330, 1.9, 6, true);
    });
    this.flash(8.1);
    this.boom(8.1, 18);
    this.cap(8.2, 1.3, 'AY$KR', { x: 760, y: 250, size: 110, color: '#ffcf3a', glow: '#ffb000' });
    this.cue(9.3, () => { this.follow = true; });
    this.cap(9.35, 1.2, 'BÉMIČ Š. · 5 S RAP · RYCHLEJŠÍ · SILNĚJŠÍ', { y: 110, size: 26, ui: true, sub: true });

    // 10,6–13,1: Nikol – jóga
    this.cue(10.6, () => {
      this.follow = false;
      scene('game');
      this.setMatch({ format: '2v2', duos: [12, 4], posTeam: [[430, 560], [780, 930]], ballX: 650 });
      cam(W / 2 + 40, 420, 1.45, 5, true);
    });
    this.flash(10.6);
    this.cue(10.85, () => {
      const n = byId('nikol');
      Game.match.usePower(n);
      Effects.pop('JÓGA!', n.x, n.y - 140, '#c084ff', 46);
      for (const o of P()) if (o.team !== n.team) Effects.rings.push({ x: o.x, y: o.y, t: 0, dur: 0.5, r0: 8, r1: 90, rgb: '200,160,255' });
    });
    this.boom(10.85, 12);
    this.cap(11.0, 2.0, 'NIKOL', { x: 640, y: 150, size: 96, sub2: 'JÓGA · SOUPEŘI 3 S NA KARIMATCE' });

    // 13,1–15,6: Luďan – do hrobu
    this.cue(13.1, () => {
      scene('game');
      this.setMatch({ format: '1v1', chars: ['ludan', 'marsal'], pos: [1030, 360], ballX: 300 });
      cam(W / 2, 400, 1.05, 5, true);
    });
    this.flash(13.1);
    this.cue(13.45, () => {
      const l = byId('ludan');
      Game.match.ball.y = GROUND_Y - 260;
      Game.match.usePower(l);
      Effects.pop('DO HROBU!', l.x, l.y - 160, '#9b5cff', 44);
      Effects.shake(8);
    });
    this.boom(13.45, 16);
    this.cap(13.5, 1.9, '„TEN MÍČ SI VEZMU', { x: 600, y: 120, size: 58 });
    this.cap(13.75, 1.65, 'DO HROBU“', { x: 640, y: 200, size: 74, color: '#c9a2ff', glow: '#7a2cff' });
    this.cap(14.3, 1.2, 'LUĎAN · MÍČ SE K NĚMU PŘESUNE ODKUDKOLI', { y: 600, size: 22, ui: true, sub: true });

    // 15,6–19,6: nové skiny
    this.cue(15.6, () => { scene('skins'); this.follow = false; });
    this.flash(15.6);
    this.boom(15.6, 18);
    for (let i = 1; i < 6; i++) this.boom(15.85 + i * 0.5, 6);

    // 19,6–21,6: kampaň Točná a úkoly
    this.cue(19.6, () => scene('tocna'));
    this.flash(19.6);
    this.boom(19.6, 14);

    // 21,6–24: zvrat
    this.cue(21.6, () => {
      scene('game');
      this.setMatch({ format: '2v2', duos: [11, 12], ai: true });
      this.follow = true;
    });
    this.flash(21.6);
    this.cap(21.65, 0.5, 'TO BYL FOTBAL…', { y: 360, size: 64 });
    this.cue(22.1, () => {
      this.follow = false;
      this.freeze();
      scene('twist', 'frozen');
    });
    this.boom(22.1, 20);
    this.cue(22.2, () => this.clubSetup());
    this.cue(23.1, () => this.driveSetup('super'));

    /* ===== 2. ČÁST: ZVRTNE SE TO ===== */

    // auta: tři takty, každý takt jiné auto, poslední přijede k Hot Peppers
    this.cue(TR_A2, () => scene('cars', 'drive'));
    this.flash(TR_A2);
    this.boom(TR_A2, 28);
    this.cue(trBar(1), () => this.swapCar('kupe'));
    this.flash(trBar(1));
    this.boom(trBar(1), 14);
    this.cue(trBar(2), () => {
      this.swapCar('limo');
      Drive.p.x = 3836;
      Drive.p.y = 1700;
      Drive.p.ang = -Math.PI / 2;
      Drive.camAng = -Math.PI / 2;
      Drive.p.v = 420;
    });
    this.flash(trBar(2));
    this.boom(trBar(2), 14);

    // neon Hot Peppers (nová animace)
    this.cue(trBar(3), () => scene('neon', 'none'));
    this.flash(trBar(3));

    // klub: parket, DJ pouští hit
    this.cue(trBar(4), () => {
      scene('club', 'club');
      const C = Club;
      C.me.x = 720;
      C.me.y = 520;
      C.cam.x = 750;
      C.cam.y = 430;
      C.zoom = 1.12;
      C.dance = true;
      C.move = 0;
      C.fx.hit = 9;
      this.clubMove = { mx: 0, my: 0 };
    });
    this.flash(trBar(4));
    this.boom(trBar(4), 30);
    this.cue(trBar(4) + 4 * TR_B2, () => {
      Club.move = 2;
      Club.fx.hit = 9;
    });
    this.cap(trBar(4) + 0.1, 3.2, 'HOT PEPPERS', { x: 640, y: 130, size: 96, color: '#ff4d9a', glow: '#ff2d7a' });
    this.cap(trBar(4) + 0.6, 2.6, 'NOČNÍ KLUB · TANČI · PIJ · UTRÁCEJ POHÁRY', { y: 610, size: 24, ui: true, sub: true, color: '#ff9ad0' });

    // VIP: vířivka, šampus, ohňostroj
    this.cue(trBar(6), () => {
      scene('vip', 'club');
      const C = Club;
      C.dance = false;
      C.me.x = CLUB_TUB.x;
      C.me.y = CLUB_TUB.y + 22;
      C.me.inTub = true;
      C.tub = true;
      C.tubShow = true;
      C.zoom = 0.62;
      for (const n of C.npcs) {
        if (!n.inTub) continue;
        n.pl.look.topless = true;
        n.hold = true;
        n.line = 'VIP život';
        n.lineT = 2;
      }
      C.champ = { t: 3 };
      C.fw = { t: 0, next: 0 };
      C.fx.hit = 8;
    });
    this.flash(trBar(6));
    this.boom(trBar(6), 22);
    this.cap(trBar(6) + 0.1, 3.3, 'VIP', { x: 330, y: 150, size: 120, color: '#ffc93c', glow: '#ffb000' });
    this.cap(trBar(6) + 0.5, 2.9, 'VÍŘIVKA · ŠAMPUS · OHŇOSTROJ · SOUKROMÁ SHOW', { y: 610, size: 24, ui: true, sub: true });

    // drogy (vymyšlené, jen ve hře)
    this.cue(trBar(8), () => {
      scene('drugs', 'club');
      const C = Club;
      C.tub = false;
      C.tubShow = false;
      C.me.inTub = false;
      for (const n of C.npcs) if (n.inTub) {
        n.pl.look.topless = false;
        n.hold = false;
      }
      C.champ = null;
      C.fw = null;
      C.zoom = 0.6;
      C.me.x = 900;
      C.me.y = 880;
      C.cam.x = 930;
      C.cam.y = 820;
      const d = C.npcs.find((n) => n.staff === 'dealer');
      if (d) {
        d.line = 'Psst… chceš něco?';
        d.lineT = 3;
      }
    });
    this.flash(trBar(8));
    this.boom(trBar(8), 20);
    this.cap(trBar(8) + 0.05, 0.8, 'TEMPO', { x: 640, y: 140, size: 110, color: '#7dff9a', glow: '#2bff6a' });
    const trips = [['pepr', 'PEPŘÁK', '#ffffff'], ['smajl', 'SMAJLÍK', '#ff7ad9'], ['houba', 'HOUBIČKA', '#7dff9a']];
    trips.forEach(([kind, name, col], i) => {
      const at = trBar(8) + (2 + i * 2) * TR_B2;
      this.cue(at, () => {
        const C = Club;
        C.trip = { kind, t: 0, high: 8, down: 15, trail: [] };
        C.zoom = 0.85;
        C.me.x = 760;
        C.me.y = 480;
        C.cam.x = 760;
        C.cam.y = 440;
        C.dance = true;
        C.move = i + 1;
        this.tripKind = kind;
      });
      this.flash(at);
      this.boom(at, 16);
      this.cap(at + 0.02, 2 * TR_B2 - 0.05, name, { x: 640, y: 330, size: 120, color: col, glow: col });
    });
    this.cap(trBar(8) + 2 * TR_B2, 6 * TR_B2, '* VYMYŠLENÉ – JEN VE HŘE', { x: 1090, y: 650, size: 16, ui: true, sub: true, color: '#bfc7d6' });

    // panák s kámošem a opilost
    this.cue(trBar(10), () => {
      scene('panak', 'club');
      const C = Club;
      C.trip = null;
      this.tripKind = '';
      C.dance = false;
      C.zoom = 0.6;
      C.me.x = 380;
      C.me.y = 345;
      C.cam.x = 340;
      C.cam.y = 300;
      C.promile = 2.1;
      const g = C.npcs.find((n) => n.walker) || C.npcs.find((n) => !n.lady && !n.staff);
      if (g) {
        g.x = 300;
        g.y = 342;
        g.dir = 1;
        C.panak = { n: g, t: 0, stage: 'drink', spot: { x: 300, y: 342 } };
      }
    });
    this.flash(trBar(10));
    this.boom(trBar(10), 18);
    this.cap(trBar(10) + 0.1, 1.6, 'NA ZDRAVÍ!', { x: 900, y: 200, size: 88, color: '#ffc93c' });
    this.cap(trBar(10) + 0.4, 1.3, 'PANÁK S KÁMOŠEM · PLATÍ ON', { y: 610, size: 24, ui: true, sub: true });

    // Peppers online
    this.cue(trBar(11), () => {
      scene('online', 'club');
      const C = Club;
      C.promile = 0.3;
      C.panak = null;
      C.zoom = 0.9;
      C.me.x = 750;
      C.me.y = 560;
      C.cam.x = 750;
      C.cam.y = 500;
      C.dance = true;
      C.fx.hit = 6;
      this.fakeOnline();
    });
    this.flash(trBar(11));
    this.boom(trBar(11), 18);
    this.cap(trBar(11) + 0.1, 1.6, 'PEPPERS ONLINE', { x: 640, y: 120, size: 84, color: '#7fe0ff', glow: '#2fb8ff' });
    this.cap(trBar(11) + 0.4, 1.3, 'POTKEJ KÁMOŠE V KLUBU', { y: 610, size: 24, ui: true, sub: true, color: '#7fe0ff' });

    // FIFAgram (nová animace telefonu)
    this.cue(trBar(12), () => {
      scene('gram', 'club');
      this.gramShot = null;
    });
    this.flash(trBar(12));
    this.boom(trBar(12), 18);

    // rychlé střihy
    const cuts = [
      () => { this.setMatch({ format: '2v2', duos: [11, 12], ai: true }); Game.match.usePower(byId('bemics')); cam(W * 0.2 + 40, 340, 1.7, 8, true); scene('montage', 'game'); },
      () => { scene('montage', 'drive'); this.swapCar('super'); Drive.p.x = 900; Drive.p.y = 3836; Drive.p.ang = 0; Drive.camAng = 0; Drive.p.v = 800; },
      () => { scene('montage', 'club'); Club.tub = true; Club.me.inTub = true; Club.me.x = CLUB_TUB.x; Club.me.y = CLUB_TUB.y + 22; Club.zoom = 0.6; Club.fx.hit = 6; },
      () => { scene('montage', 'club'); Club.tub = false; Club.me.inTub = false; Club.me.x = 760; Club.me.y = 480; Club.zoom = 0.9; Club.trip = { kind: 'houba', t: 0, high: 8, down: 15, trail: [] }; this.tripKind = 'houba'; },
    ];
    cuts.forEach((f, i) => {
      const at = trBar(13) + i * TR_B2;
      this.cue(at, f);
      this.flash(at);
      this.boom(at, 12);
    });

    // závěr
    this.cue(trBar(14), () => {
      scene('end', 'club');
      Club.trip = null;
      this.tripKind = '';
      Club.zoom = 1.1;
      Club.fx.hit = 10;
      Club.me.x = 750;
      Club.me.y = 560;
    });
    this.flash(trBar(14));
    this.boom(trBar(14), 30);
    this.cue(TR_LEN, () => this.end());
  },

  // Zápas pro scénu: postavy, skiny, poloha; ai = hrají sami, jinak stojí (a ovládá je scénář).
  setMatch(o) {
    const lobby = newLobby({ format: o.format, level: 'hard', duos: o.duos || [0, 1] }, null);
    if (o.format === '1v1') {
      lobby.slots.find((s) => s.team === 0).char = o.chars[0];
      lobby.slots.find((s) => s.team === 1).char = o.chars[1];
    }
    lobby.slots.forEach((s) => { s.ctrl = 'cpu'; });
    const setup = Game.buildSetup(lobby);
    setup.demo = true;
    setup.players.forEach((sp, i) => { sp.skin = (o.skins && o.skins[i]) || ''; });
    const m = new Match(setup, (t, d) => Game.onEvent(t, d), (r) => this.intentFor(r));
    Game.setup = setup;
    Game.match = m;
    Game.state = 'menu';
    Game.stateT = 0;
    Renderer.setFans(setup.teams);
    this.intents = {};
    m.players.forEach((p) => { p.label = ''; p.superCharge = 0; });
    if (!o.ai) {
      const k = [0, 0];
      m.players.forEach((p, i) => {
        p.brain = null;
        p.remote = 'tr' + i;
        if (o.pos) p.place(o.pos[i]);
        if (o.posTeam) p.place(o.posTeam[p.team][k[p.team]++]);
        p.dir = p.team === 0 ? 1 : -1;
      });
    }
    const b = m.ball;
    b.held = false;
    b.x = o.ballX || W / 2;
    b.y = GROUND_Y - b.r - (o.ai ? 140 : 0);
    b.vx = o.ai ? (Math.random() < 0.5 ? -120 : 120) : 0;
    b.vy = 0;
  },

  // Zastavený snímek hřiště (zvrat): kopie herního plátna.
  freeze() {
    const src = document.getElementById('game');
    const cv = document.createElement('canvas');
    cv.width = src.width;
    cv.height = src.height;
    cv.getContext('2d').drawImage(src, 0, 0);
    this.frozen = cv;
  },

  // plátno mimo stránku s rozměry okna (klub a jízda si z něj berou velikost)
  offCanvas() {
    const cv = document.createElement('canvas');
    Object.defineProperty(cv, 'clientWidth', { get: () => innerWidth });
    Object.defineProperty(cv, 'clientHeight', { get: () => innerHeight });
    return cv;
  },

  // Klub Hot Peppers pro trailer: VIP, brýle a řetěz, bez ukládání a bez ovládacích prvků.
  clubSetup() {
    const C = Club;
    if (!C.cv) C.init();
    if (!this.clubCv) this.clubCv = this.offCanvas();
    C.cv = this.clubCv;
    C.ctx = this.clubCv.getContext('2d');
    const st = { char: 'jenda', vip: true, own: { shades: true, chain: true }, wear: { shades: true, chain: true }, adult: true, style: 'reggaeton', ban: 0, cars: { hatch: true, super: true, kupe: true, limo: true }, car: 'super' };
    C.state = () => st;
    C.save = () => {};
    C.syncOut = () => {};
    C.input = () => this.clubMove || { mx: 0, my: 0 };
    C.cine = true;
    C.on = false;
    C.phase = 'in';
    C.pick = 'jenda';
    C.style = 'reggaeton';
    C.t = 0;
    C.promile = 0;
    C.build('jenda');
    C.applyGear();
    C.showIn = 999;
  },

  // Jízda pro trailer: bez HUD a nápovědy, kvalita naplno.
  driveSetup(car) {
    if (!this.driveCv) this.driveCv = this.offCanvas();
    Drive.drawHud = () => {};
    Drive.start(car, null, 'jenda', '');
    Drive.p.x = 420;
    Drive.p.y = 3836;
    Drive.p.ang = 0;
    Drive.camAng = 0;
    Drive.p.v = 520;
    Drive.t = 5;
    Drive.quality = 1;
    this.carT = this.t;
    this.carId = car;
  },
  swapCar(id) {
    Drive.car = carById(id);
    this.carT = this.t;
    this.carId = id;
  },

  // Falešní hráči online kolem tebe (jako by přišli kámoši).
  fakeOnline() {
    const C = Club;
    C.remotes = new Map();
    const list = [['peli', 'Pepa_07', 640, 470, 'Čus!'], ['toma', 'FrantaKral', 860, 500, 'Jdem na VIP?'], ['durcado', 'Durca67', 700, 620, ''], ['marsal', 'Marsik', 880, 640, 'Ten klub je nemocnej']];
    for (const [ch, nick, x, y, line] of list) {
      const e = C.mk(ch, x, y, { remote: true });
      Object.assign(e, { nick, tx: x, ty: y, sp: 0, dn: true, vipTag: nick === 'FrantaKral', seen: Infinity, q: 0, line, lineT: line ? 3 : 0 });
      C.remotes.set(nick, e);
    }
  },

  /* ---------------- běh ---------------- */

  update(now) {
    if (this.t0 === null) this.t0 = now + this.delay * 1000;
    this.t = Math.max(0, (now - this.t0) / 1000);
    const dt = Math.min(0.1, Math.max(0, this.t - (this.lastT || 0)));
    this.lastT = this.t;
    for (const c of this.cues) {
      if (!c.done && this.t >= c.at) {
        c.done = true;
        c.fn();
      }
    }
    if (this.follow && Game.match) {
      const b = Game.match.ball;
      Game.camOverride = { x: clamp(b.x, 380, W - 380), y: clamp(b.y + 40, 380, 470), z: 1.35, speed: 4 };
    }
    // jízda: plný plyn a lehké kličkování
    if (this.driveCv && Drive.on && dt > 0) {
      Drive.update(dt, { mx: Math.sin(this.t * 1.3) * 0.22, my: -1 });
      Drive.quality = 1;
    }
    // klub běží na pozadí od chvíle, kdy je připravený
    if (this.clubCv && Club.phase === 'in' && dt > 0) {
      for (let i = 0; i < Math.round(dt * 60); i++) Club.pump();
      Club.t += dt;
      Club.update(dt);
      if (this.scene === 'drugs' || this.tripKind) {
        const tr = Club.trip;
        if (tr) tr.t = Math.min(tr.t, 4); // pořád v jízdě, žádný dojezd
      }
      if (this.scene === 'online' || this.scene === 'end') Club.cam.y = approach(Club.cam.y, 480, dt * 60);
    }
  },

  // obrázek postavy (vlastní plátno s danou velikostí)
  pic(key, w, h) {
    let cv = this.pics[key];
    if (!cv) {
      cv = document.createElement('canvas');
      cv.style.width = w + 'px';
      cv.style.height = h + 'px';
      this.picBox.appendChild(cv);
      this.pics[key] = cv;
    }
    return cv;
  },

  draw(now) {
    const cv = this.ov, ctx = this.octx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(innerWidth * dpr), ch = Math.round(innerHeight * dpr);
    if (cv.width !== cw || cv.height !== ch) {
      cv.width = cw;
      cv.height = ch;
    }
    this.cw = cw;
    this.ch = ch;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const t = this.t, tn = t * 1000;
    // spodní vrstva: jízda / klub / zastavený snímek
    if (this.layer === 'drive' && this.driveCv) {
      const d = this.driveCv;
      if (d.width !== cw || d.height !== ch) {
        d.width = cw;
        d.height = ch;
      }
      Drive.draw(d.getContext('2d'), cw, ch, dpr, tn);
      ctx.drawImage(d, 0, 0);
    } else if (this.layer === 'club' && this.clubCv) {
      Club.draw(tn);
      if (this.tripKind === 'houba' || this.tripKind === 'smajl') this.waves(ctx, this.clubCv, t);
      else ctx.drawImage(this.clubCv, 0, 0, cw, ch);
    } else if (this.layer === 'frozen' && this.frozen) {
      this.glitch(ctx, this.frozen, t - 22.1);
    } else if (this.layer === 'none') {
      ctx.fillStyle = '#050307';
      ctx.fillRect(0, 0, cw, ch);
    }
    const s = Math.max(cw / 1280, ch / 720);
    // otřesy při úderech
    let sx = 0, sy = 0;
    for (const b of this.booms) {
      const d = t - b.at;
      if (d >= 0 && d < 0.35) {
        const a = b.amp * (1 - d / 0.35);
        sx += (Math.random() * 2 - 1) * a;
        sy += (Math.random() * 2 - 1) * a;
      }
    }
    ctx.setTransform(s, 0, 0, s, (cw - 1280 * s) / 2 + sx * s, (ch - 720 * s) / 2 + sy * s);
    this.ctxS = s;

    const sc = this.scene;
    if (sc === 'game') this.bars(ctx, 58);
    if (sc === 'intro') this.dim(ctx, 0.6 - 0.3 * trClamp(t / 3.6));
    if (sc === 'logo') this.drawLogo(ctx, t - 3.6, false);
    if (sc === 'skins') this.drawSkins(ctx, t - 15.6);
    if (sc === 'tocna') this.drawTocna(ctx, t - 19.6);
    if (sc === 'twist') this.drawTwist(ctx, t - 22.1);
    if (sc === 'cars') this.drawCars(ctx, t);
    if (sc === 'neon') this.drawNeon(ctx, t - trBar(3));
    if (sc === 'drugs' && t < trBar(8) + 2 * TR_B2) this.drawTempo(ctx, t - trBar(8));
    if (sc === 'gram') this.drawGram(ctx, t - trBar(12));
    if (sc === 'end') this.drawEnd(ctx, t - trBar(14));

    for (const c of this.caps) this.drawCap(ctx, c, t);

    // vignette
    const g = ctx.createRadialGradient(640, 360, 260, 640, 360, 820);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = g;
    ctx.fillRect(-200, -200, 1680, 1120);

    // bílé záblesky na střizích (ve 2. části růžové)
    let fa = 0;
    for (const f of this.flashes) {
      const d = t - f;
      if (d >= 0 && d < 0.22) fa = Math.max(fa, 1 - d / 0.22);
    }
    if (fa > 0) {
      ctx.fillStyle = t >= TR_A2 ? `rgba(255,190,230,${fa * 0.8})` : `rgba(255,255,255,${fa * 0.85})`;
      ctx.fillRect(-200, -200, 1680, 1120);
    }
    // začátek z černé, konec do černé
    const black = Math.max(trClamp(1 - t / 0.5), trClamp((t - (TR_LEN - 0.9)) / 0.9));
    if (black > 0) {
      ctx.fillStyle = `rgba(0,0,0,${black})`;
      ctx.fillRect(-200, -200, 1680, 1120);
    }
  },

  /* ---------------- kreslení ---------------- */

  dim(ctx, a) {
    ctx.fillStyle = `rgba(4,7,16,${a})`;
    ctx.fillRect(-200, -200, 1680, 1120);
  },

  bars(ctx, h) {
    ctx.fillStyle = '#000';
    ctx.fillRect(-200, -200, 1680, 200 + h);
    ctx.fillRect(-200, 720 - h, 1680, 200 + h);
  },

  text(ctx, str, x, y, size, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    if (o.scale) ctx.scale(o.scale, o.scale);
    if (o.rot) ctx.rotate(o.rot);
    if (!o.ui) ctx.transform(1, 0, -0.14, 1, 0, 0);
    ctx.globalAlpha *= o.alpha === undefined ? 1 : o.alpha;
    ctx.font = o.ui ? `800 ${size}px ${FONT_U}` : `400 ${size}px ${FONT_D}`;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    if ('letterSpacing' in ctx) ctx.letterSpacing = o.ui ? `${Math.round(size * 0.22)}px` : '0px';
    if (!o.ui && !o.plain) {
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillText(str, 0, size * 0.1);
      ctx.lineWidth = size * 0.17;
      ctx.strokeStyle = '#0b1220';
      ctx.strokeText(str, 0, 0);
    }
    if (o.glow) {
      ctx.shadowColor = o.glow;
      ctx.shadowBlur = size * 0.5;
    }
    ctx.fillStyle = o.color || '#ffffff';
    ctx.fillText(str, 0, 0);
    ctx.restore();
  },

  drawCap(ctx, c, t) {
    const d = t - c.at;
    if (d < 0 || d > c.dur) return;
    const kIn = trClamp(d / 0.2), kOut = trClamp((c.dur - d) / 0.18);
    const x = c.x === undefined ? 640 : c.x, y = c.y === undefined ? 360 : c.y;
    if (c.sub) {
      // menší popisek: vyjede s rozšířeným písmem
      const w = c.size * c.text.length * 0.62 + 60;
      ctx.save();
      ctx.globalAlpha = kIn * kOut;
      ctx.fillStyle = 'rgba(8,13,26,.78)';
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - c.size * 0.75, w * trEase.out(kIn), c.size * 1.5, 10);
      ctx.fill();
      ctx.fillStyle = c.color || '#ffc93c';
      ctx.fillRect(x - w / 2, y - c.size * 0.75, 6, c.size * 1.5);
      ctx.restore();
      this.text(ctx, c.text, x, y, c.size, { ui: true, alpha: kIn * kOut, color: c.color || '#ffc93c' });
      return;
    }
    // velký titulek: dopadne ze zvětšení
    const scale = 1 + (1 - trEase.out(kIn)) * 1.3 + Math.max(0, d - 0.2) * 0.04;
    this.text(ctx, c.text, x, y, c.size, { scale, alpha: kIn * kOut, color: c.color, glow: c.glow });
    if (c.sub2) {
      const k2 = trClamp((d - 0.22) / 0.2);
      this.text(ctx, c.sub2, x, y + c.size * 0.78, 22, { ui: true, alpha: k2 * kOut, color: '#ffc93c' });
    }
  },

  // logo FIFA67 (po dropu velké, na konci menší)
  drawLogo(ctx, d, small) {
    if (!small) this.dim(ctx, 0.45);
    const k = trClamp(d / 0.25);
    const sc = (small ? 0.72 : 1) * (1 + (1 - trEase.out(k)) * 1.6 + d * 0.03);
    // paprsky za logem
    ctx.save();
    ctx.translate(640, small ? 200 : 320);
    ctx.globalAlpha = 0.35 * k;
    for (let i = 0; i < 16; i++) {
      ctx.rotate(Math.PI / 8);
      const g = ctx.createLinearGradient(0, 0, 700, 0);
      g.addColorStop(0, 'rgba(255,201,60,.8)');
      g.addColorStop(1, 'rgba(255,201,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(700, -40 - (i % 2) * 30);
      ctx.lineTo(700, 40 + (i % 2) * 30);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.translate(640, small ? 200 : 320);
    ctx.scale(sc, sc);
    ctx.save();
    ctx.translate(150, 0);
    ctx.rotate(-0.08);
    ctx.fillStyle = '#0b1220';
    ctx.beginPath();
    ctx.roundRect(-84, -84, 176, 168, 26);
    ctx.fill();
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath();
    ctx.roundRect(-90, -92, 176, 168, 26);
    ctx.fill();
    ctx.restore();
    this.text(ctx, 'FIFA', -110, 0, 170, { color: '#ffffff' });
    this.text(ctx, '67', 148, -6, 150, { color: '#0b1220', plain: true });
    ctx.restore();
    if (!small) {
      const k2 = trClamp((d - 0.35) / 0.25);
      this.text(ctx, 'NEJVĚTŠÍ UPDATE VŠECH DOB', 640, 480, 32, { ui: true, alpha: k2, color: '#ffc93c' });
      this.text(ctx, 'SUPERSCHOPNOSTI · SKINY · AUTA · HOT PEPPERS', 640, 530, 18, { ui: true, alpha: trClamp((d - 0.7) / 0.25), color: '#d8e1f2' });
    }
  },

  // šest nových skinů na pódiu, naskáčou do rytmu
  drawSkins(ctx, d) {
    this.dim(ctx, 0.78);
    this.text(ctx, 'NOVÉ SKINY', 640, 92, 76, { scale: 1 + (1 - trEase.out(trClamp(d / 0.25))) * 1.2, color: '#ffc93c' });
    const list = [
      ['spider', 'SPIDER BOY', 'TOČNÁ · 5. ÚROVEŇ'],
      ['tgbemics', 'TRUE GOLD BÉMIČ Š.', 'BONUS TOČNÁ'],
      ['tgberry', 'TRUE GOLD BERRY', 'BONUS TOČNÁ'],
      ['tgnikol', 'TRUE GOLD NIKOL', 'FINÁLE BEZ GÓLU'],
      ['tgludan', 'TRUE GOLD LUĎAN', 'FINÁLE BEZ GÓLU'],
      ['bohemka', 'ŠIMŠA BOHEMKA', '100 GÓLŮ ZA ŠIMŠU'],
    ];
    list.forEach(([sk, name, sub], i) => {
      const dd = d - 0.25 - i * 0.5;
      if (dd < 0) return;
      const k = trEase.back(trClamp(dd / 0.35));
      const x = 128 + i * 205, y = 410;
      const gold = sk.startsWith('tg');
      const g = ctx.createRadialGradient(x, 520, 10, x, 400, 230);
      g.addColorStop(0, gold ? `rgba(255,207,58,${0.45 * trClamp(k)})` : `rgba(160,200,255,${0.35 * trClamp(k)})`);
      g.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 260, 120, 520, 540);
      // podstavec
      ctx.fillStyle = gold ? '#5a3d00' : '#1a2440';
      ctx.beginPath();
      ctx.ellipse(x, 540, 80 * k, 18 * k, 0, 0, Math.PI * 2);
      ctx.fill();
      const cv = this.pic('skin' + i, 200, 260);
      Renderer.portrait(cv, SKINS[sk].char, SKINS[sk].kit, i % 2 ? -1 : 1, this.t, { skin: sk, happy: dd < 0.8 });
      ctx.save();
      ctx.translate(x, 540);
      ctx.scale(k, k);
      ctx.drawImage(cv, -100, -270, 200, 260);
      ctx.restore();
      if (gold && dd < 0.6) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let j = 0; j < 6; j++) {
          const a = j + dd * 6;
          ctx.fillStyle = `rgba(255,230,140,${0.8 - dd})`;
          circle(ctx, x + Math.cos(a) * 80 * dd * 2, 380 + Math.sin(a) * 80 * dd * 2, 4);
          ctx.fill();
        }
        ctx.restore();
      }
      const tg = name.startsWith('TRUE GOLD ');
      if (tg) this.text(ctx, 'TRUE GOLD', x, 566, 13, { ui: true, alpha: trClamp(k), color: '#ffcf3a' });
      this.text(ctx, tg ? name.slice(10) : name, x, 592, 24, { alpha: trClamp(k), scale: 1 + (1 - trClamp(k)) * 0.5 });
      this.text(ctx, sub, x, 624, 11, { ui: true, alpha: trClamp(k), color: '#ffc93c' });
    });
  },

  // kampaň Točná: 18 zápasů naskáče, odměny září
  drawTocna(ctx, d) {
    this.dim(ctx, 0.82);
    this.text(ctx, 'KAMPAŇ TOČNÁ', 640, 92, 72, { scale: 1 + (1 - trEase.out(trClamp(d / 0.25))) * 1.2 });
    this.text(ctx, '18 ZÁPASŮ · SPIDER BOY · TRUE GOLD · NOVÉ DVOJICE · NOVÉ ÚKOLY', 640, 150, 18, { ui: true, color: '#ffc93c', alpha: trClamp((d - 0.15) / 0.2) });
    TOCNA.forEach((lv, i) => {
      const dd = d - 0.2 - i * 0.055;
      if (dd < 0) return;
      const k = trEase.back(trClamp(dd / 0.22));
      const col = i % 9, row = Math.floor(i / 9);
      const x = 160 + col * 120, y = 290 + row * 190;
      const rw = lv.reward || (lv.bonus && lv.bonus.reward);
      const boss = i === TOCNA.length - 1;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(k, k);
      if (rw) {
        ctx.shadowColor = '#ffc93c';
        ctx.shadowBlur = 24 + Math.sin(this.t * 10 + i) * 8;
      }
      ctx.fillStyle = boss ? '#a3192b' : rw ? '#8a5a12' : '#2e6b52';
      ctx.beginPath();
      ctx.roundRect(-50, -52, 100, 100, 18);
      ctx.fill();
      ctx.restore();
      if (k > 0.3) {
        const ch = lv.format === '2v2' ? DUO_TEAMS[lv.duo].chars[0] : lv.opp;
        const cv = this.pic('tn' + i, 80, 80);
        Renderer.portrait(cv, ch, DUO_TEAMS[Math.max(0, duoOf(ch))], -1, undefined, { head: true });
        ctx.save();
        ctx.translate(x, y - 4);
        ctx.scale(k, k);
        ctx.drawImage(cv, -38, -40, 76, 76);
        ctx.restore();
      }
      this.text(ctx, String(i + 1), x - 34, y - 36, 20, { alpha: trClamp(k) });
      if (rw) this.text(ctx, lv.bonus ? '⭐' : '🎁', x + 40, y - 50, 24, { ui: true, alpha: trClamp(k) });
    });
  },

  // Zvrat: zastavený obraz, škrábnutí desky, glitch a text.
  glitch(ctx, img, d) {
    const cw = this.cw, ch = this.ch;
    const amt = d < 0.15 ? 1 : 0.25 + Math.max(0, Math.sin(d * 23)) * 0.6;
    ctx.filter = `saturate(${Math.max(0, 1 - d * 1.2)}) contrast(1.2)`;
    ctx.drawImage(img, 0, 0, cw, ch);
    ctx.filter = 'none';
    const n = 14;
    for (let i = 0; i < n; i++) {
      if (Math.random() > amt * 0.6) continue;
      const y = Math.random() * ch, h = ch * (0.01 + Math.random() * 0.06), off = (Math.random() * 2 - 1) * cw * 0.06 * amt;
      ctx.drawImage(img, 0, (y / ch) * img.height, img.width, (h / ch) * img.height, off, y, cw, h);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 * amt;
    ctx.drawImage(img, cw * 0.008 * amt, 0, cw, ch);
    ctx.restore();
    ctx.fillStyle = `rgba(255,40,120,${0.12 + 0.2 * trClamp(d - 0.6)})`;
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    for (let y = 0; y < ch; y += 4) ctx.fillRect(0, y, cw, 1);
  },

  drawTwist(ctx, d) {
    this.dim(ctx, Math.min(0.55, d * 0.6));
    if (d < 0.9) {
      this.text(ctx, '…ALE TOHLE', 640, 300, 84, { scale: 1 + (1 - trEase.out(trClamp(d / 0.2))) * 0.8, rot: Math.sin(d * 40) * 0.02 });
      this.text(ctx, 'NENÍ VŠECHNO', 640, 400, 84, { alpha: trClamp((d - 0.2) / 0.15), color: '#ff4d9a' });
    } else {
      const k = trClamp((d - 0.9) / 0.15);
      const jit = Math.sin(d * 60) * 4;
      this.text(ctx, 'TEĎ SE TO', 640 + jit, 290, 100, { scale: 1 + (1 - trEase.out(k)) * 1.4, alpha: k });
      this.text(ctx, 'ZVRTNE 😈', 640 - jit, 410, 120, { scale: 1 + (1 - trEase.out(trClamp((d - 1.1) / 0.15))) * 1.4, alpha: trClamp((d - 1.1) / 0.15), color: '#ff2d7a', glow: '#ff2d7a' });
    }
  },

  // Auta: cenovka a název auta vyjedou zleva, na začátku velký nápis.
  drawCars(ctx, t) {
    const d0 = t - TR_A2;
    if (d0 < 1.5) {
      const k = trClamp(d0 / 0.18), out = trClamp((1.5 - d0) / 0.2);
      this.text(ctx, 'DRAHÝ AUTA', 640, 150, 104, { scale: 1 + (1 - trEase.out(k)) * 1.5, alpha: k * out, color: '#ffc93c', glow: '#ffb000' });
    }
    const car = carById(this.carId || 'super');
    const d = t - (this.carT || 0), k = trEase.out(trClamp(d / 0.3));
    const x = -420 + k * 470, y = 520;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(6,6,12,.82)';
    ctx.strokeStyle = '#ffc93c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(0, 0, 400, 118, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = car.color;
    ctx.fillRect(0, 18, 8, 82);
    ctx.restore();
    this.text(ctx, car.name.toUpperCase(), x + 26, y + 42, 32, { align: 'left' });
    this.text(ctx, `${car.price} 🏆`, x + 26, y + 88, 26, { ui: true, align: 'left', color: '#ffc93c' });
    this.text(ctx, 'KUP SI HO ZA POHÁRY · JEĎ DO HOT PEPPERS', 640, 668, 16, { ui: true, color: '#ffffff', alpha: 0.85 });
  },

  // Neon HOT PEPPERS se rozsvěcuje písmeno po písmenu na cihlové zdi.
  drawNeon(ctx, d) {
    // cihlová zeď
    ctx.fillStyle = '#1a0c10';
    ctx.fillRect(-200, -200, 1680, 1120);
    for (let row = 0; row < 26; row++) {
      for (let col = -1; col < 24; col++) {
        const x = col * 64 + (row % 2) * 32, y = row * 30;
        const v = 30 + ((row * 7 + col * 13) % 9) * 3;
        ctx.fillStyle = `rgb(${v + 18},${v * 0.45},${v * 0.42})`;
        ctx.fillRect(x + 2, y + 2, 60, 26);
      }
    }
    const push = 1 + d * 0.05;
    ctx.save();
    ctx.translate(640, 330);
    ctx.scale(push, push);
    const g = ctx.createRadialGradient(0, 0, 40, 0, 0, 640);
    const on = trClamp((d - 0.15) / 1.1);
    g.addColorStop(0, `rgba(255,40,120,${0.4 * on})`);
    g.addColorStop(1, 'rgba(255,40,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-900, -600, 1800, 1200);
    const word = 'Hot Peppers';
    ctx.font = `italic 150px ${FONT_D}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const total = ctx.measureText(word).width;
    let x = -total / 2;
    for (let i = 0; i < word.length; i++) {
      const chr = word[i], w = ctx.measureText(chr).width;
      const at = 0.12 + i * 0.085;
      let a = d < at ? 0 : d < at + 0.08 ? (Math.random() < 0.5 ? 1 : 0.15) : 1;
      if (i === 5 && Math.sin(d * 37) > 0.85) a = 0.3; // jedno písmeno bliká
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(80,20,40,.9)';
      ctx.lineWidth = 6;
      ctx.strokeText(chr, x, -20);
      if (a > 0) {
        ctx.save();
        ctx.shadowColor = '#ff2d7a';
        ctx.shadowBlur = 40 * a;
        ctx.strokeStyle = `rgba(255,70,140,${a})`;
        ctx.lineWidth = 10;
        ctx.strokeText(chr, x, -20);
        ctx.fillStyle = `rgba(255,230,240,${a})`;
        ctx.fillText(chr, x, -20);
        ctx.restore();
      }
      x += w;
    }
    const k2 = trClamp((d - 1.15) / 0.2);
    if (k2 > 0) {
      ctx.font = `44px ${FONT_D}`;
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ffc93c';
      ctx.shadowBlur = 26;
      ctx.fillStyle = `rgba(255,224,150,${k2})`;
      ctx.fillText("GENTLEMEN'S CLUB · 18+", 0, 100);
      ctx.shadowBlur = 0;
    }
    // neonová paprička
    const kp = trClamp((d - 0.9) / 0.15);
    if (kp > 0) {
      ctx.save();
      ctx.translate(total / 2 + 60, -40);
      ctx.rotate(0.4);
      ctx.shadowColor = '#ff2d4a';
      ctx.shadowBlur = 30;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(255,90,110,${kp})`;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(-40, -10);
      ctx.quadraticCurveTo(0, 50, 50, 40);
      ctx.stroke();
      ctx.strokeStyle = `rgba(125,255,154,${kp})`;
      ctx.shadowColor = '#2bff6a';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-40, -10);
      ctx.quadraticCurveTo(-52, -26, -40, -40);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // jiskry při rozsvícení
    if (d < 1.2) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) {
        const a = i * 1.7 + d * 3, r = 80 + ((d * 600 + i * 50) % 300);
        ctx.fillStyle = `rgba(255,${180 + (i % 3) * 30},120,${0.8 * (1 - d / 1.2)})`;
        circle(ctx, 640 + Math.cos(a) * r, 330 + Math.sin(a) * r * 0.5, 3);
        ctx.fill();
      }
      ctx.restore();
    }
    // dveře se otevřou do klubu (růžové světlo)
    const kd = trClamp((d - 1.45) / 0.25);
    if (kd > 0) {
      ctx.fillStyle = `rgba(255,120,200,${kd * 0.9})`;
      ctx.fillRect(640 - 700 * kd, -200, 1400 * kd, 1120);
    }
  },

  // Psychedelické vlnění klubu (houbička, smajlík): obraz v pruzích posunutých do vlny a duhový nádech.
  waves(ctx, img, t) {
    const cw = this.cw, ch = this.ch, strip = Math.max(4, Math.round(ch / 90));
    const amp = cw * 0.025;
    for (let y = 0; y < ch; y += strip) {
      const off = Math.sin(y * 0.012 + t * 7) * amp + Math.sin(y * 0.031 - t * 4) * amp * 0.4;
      ctx.drawImage(img, 0, (y / ch) * img.height, img.width, (strip / ch) * img.height, off, y, cw, strip + 1);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'hue';
    const g = ctx.createLinearGradient(0, 0, cw, ch);
    const h0 = (t * 160) % 360;
    g.addColorStop(0, `hsla(${h0},100%,50%,.55)`);
    g.addColorStop(0.5, `hsla(${(h0 + 120) % 360},100%,50%,.55)`);
    g.addColorStop(1, `hsla(${(h0 + 240) % 360},100%,50%,.55)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();
  },

  // TEMPO u záchodů: zelené světlo, sáček, prášky a pilulky letí do obrazu.
  drawTempo(ctx, d) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(640, 420, 20, 640, 420, 520);
    g.addColorStop(0, 'rgba(60,255,120,.22)');
    g.addColorStop(1, 'rgba(60,255,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-200, -200, 1680, 1120);
    ctx.restore();
    const items = ['❄️', '💊', '🍄', '🌿', '⚡'];
    items.forEach((ic, i) => {
      const k = trEase.back(trClamp((d - 0.1 - i * 0.07) / 0.3));
      const x = 280 + i * 180, y = 470 + Math.sin(this.t * 4 + i) * 10;
      this.text(ctx, ic, x, y, 70 * k + 1, { ui: true, alpha: trClamp(k) });
    });
  },

  // FIFAgram: telefon s fotkou z klubu, lajky naskakují, srdíčka létají, komentáře.
  drawGram(ctx, d) {
    this.dim(ctx, 0.45);
    if (!this.gramShot && this.clubCv) {
      // fotka: čtvercový výřez z klubu
      const src = this.clubCv, sz = Math.min(src.width, src.height);
      const cv = document.createElement('canvas');
      cv.width = cv.height = 512;
      cv.getContext('2d').drawImage(src, (src.width - sz) / 2, (src.height - sz) / 2, sz, sz, 0, 0, 512, 512);
      this.gramShot = cv;
    }
    const k = trEase.back(trClamp(d / 0.35));
    const px = 820, py = 360 + (1 - k) * 500, pw = 330, ph = 620;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.06 + (1 - k) * 0.3);
    ctx.fillStyle = '#0b0b10';
    ctx.beginPath();
    ctx.roundRect(-pw / 2 - 12, -ph / 2 - 12, pw + 24, ph + 24, 48);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 38);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 38);
    ctx.clip();
    // hlavička
    const hg = ctx.createLinearGradient(-pw / 2, 0, pw / 2, 0);
    hg.addColorStop(0, '#ff2f6e');
    hg.addColorStop(0.5, '#ff9a3c');
    hg.addColorStop(1, '#6a2cff');
    ctx.fillStyle = hg;
    ctx.fillRect(-pw / 2, -ph / 2, pw, 64);
    ctx.font = `italic 30px ${FONT_D}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('FIFAgram', 0, -ph / 2 + 36);
    // profil
    const av = this.pic('gramav', 60, 60);
    Renderer.portrait(av, 'jenda', DUO_TEAMS[4], 1, undefined, { head: true });
    ctx.fillStyle = '#ffd0e4';
    circle(ctx, -pw / 2 + 34, -ph / 2 + 96, 22);
    ctx.fill();
    ctx.drawImage(av, -pw / 2 + 12, -ph / 2 + 74, 44, 44);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#111';
    ctx.font = `800 17px ${FONT_U}`;
    ctx.fillText('jenda21 · Hot Peppers 🌶️', -pw / 2 + 66, -ph / 2 + 96);
    // fotka
    if (this.gramShot) ctx.drawImage(this.gramShot, -pw / 2, -ph / 2 + 124, pw, pw);
    // dvojité klepnutí: velké srdce
    const hk = trClamp((d - 0.55) / 0.15) * trClamp((1.05 - d) / 0.2);
    if (hk > 0) this.text(ctx, '❤', 0, -ph / 2 + 124 + pw / 2, 150 * (0.6 + hk * 0.5), { ui: true, color: '#ffffff', alpha: hk });
    // lajky
    const likes = Math.round(12847 * trEase.out(trClamp((d - 0.5) / 1.1)));
    const ly = -ph / 2 + 124 + pw + 26;
    ctx.font = `800 24px ${FONT_U}`;
    ctx.fillStyle = d > 0.55 ? '#ff2f6e' : '#222';
    ctx.fillText(d > 0.55 ? '❤' : '♡', -pw / 2 + 14, ly);
    ctx.fillStyle = '#111';
    ctx.font = `800 19px ${FONT_U}`;
    ctx.fillText(`${likes.toLocaleString('cs-CZ')} lajků`, -pw / 2 + 50, ly);
    const comments = [['pepa_07', 'kde to je?? 🔥'], ['kiki', 'král klubu 👑'], ['durca67', 'beru tě příště']];
    comments.forEach(([u, c], i) => {
      const a = trClamp((d - 0.8 - i * 0.22) / 0.15);
      if (a <= 0) return;
      ctx.globalAlpha = a;
      ctx.font = `800 15px ${FONT_U}`;
      ctx.fillStyle = '#111';
      ctx.fillText(u, -pw / 2 + 14, ly + 32 + i * 24);
      const w = ctx.measureText(u + ' ').width;
      ctx.font = `600 15px ${FONT_U}`;
      ctx.fillText(c, -pw / 2 + 14 + w, ly + 32 + i * 24);
      ctx.globalAlpha = 1;
    });
    ctx.restore();
    ctx.restore();
    // létající srdíčka
    for (let i = 0; i < 14; i++) {
      const tt = (d * 0.9 + i / 14) % 1;
      if (d < 0.55) break;
      this.text(ctx, '❤', 640 + Math.sin(i * 2.3) * 120 + (i % 2 ? 380 : 0), 640 - tt * 520, 22 + (i % 3) * 10, { ui: true, color: i % 3 ? '#ff2f6e' : '#ff9ad0', alpha: 1 - tt });
    }
    // titulek vlevo
    const kt = trClamp((d - 0.1) / 0.2);
    this.text(ctx, 'FIFAgram', 330, 300, 96, { scale: 1 + (1 - trEase.out(kt)) * 1.3, alpha: kt, color: '#ff6fb0', glow: '#ff2f6e' });
    this.text(ctx, 'FOŤ V KLUBU · LAJKY · KOMENTÁŘE', 330, 380, 18, { ui: true, alpha: trClamp((d - 0.3) / 0.2), color: '#ffffff' });
  },

  // závěrečná karta
  drawEnd(ctx, d) {
    this.dim(ctx, 0.55 + 0.2 * trClamp(d / 1));
    this.drawLogo(ctx, d, true);
    const k1 = trClamp((d - 0.35) / 0.25);
    this.text(ctx, 'NEJVĚTŠÍ UPDATE VŠECH DOB', 640, 370, 56, { color: '#ffc93c', alpha: k1, scale: 1 + (1 - trEase.out(k1)) * 1.2, glow: '#ffb000' });
    const items = [['SUPERSCHOPNOSTI', 250], ['SKINY', 120], ['AUTA', 110], ['HOT PEPPERS', 200], ['ONLINE', 130], ['FIFAgram', 150]];
    const gap = 14, total = items.reduce((a, it) => a + it[1], 0) + gap * (items.length - 1);
    let left = 640 - total / 2;
    items.forEach(([it, w], i) => {
      const k = trEase.back(trClamp((d - 0.7 - i * 0.12) / 0.25));
      const x = left + w / 2;
      left += w + gap;
      ctx.save();
      ctx.translate(x, 460);
      ctx.scale(k, k);
      ctx.fillStyle = 'rgba(8,13,26,.88)';
      ctx.beginPath();
      ctx.roundRect(-w / 2, -24, w, 48, 14);
      ctx.fill();
      ctx.strokeStyle = i >= 3 ? '#ff4d9a' : '#ffc93c';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      this.text(ctx, it, x, 461, 17, { ui: true, color: '#ffffff', alpha: trClamp(k) });
    });
    const k3 = trClamp((d - 1.7) / 0.3);
    const pulse = 1 + Math.sin(d * 8) * 0.03;
    this.text(ctx, 'HRAJ TEĎ', 640, 560, 72, { color: '#ffc93c', alpha: k3, scale: pulse * (1 + (1 - trEase.out(k3)) * 1.2) });
    this.text(ctx, 'jenik864.github.io/moje-aplikace', 640, 628, 22, { ui: true, alpha: trClamp((d - 2.1) / 0.3), color: '#d8e1f2' });
  },
};

/*
 * Hudba k traileru. 1. část: 120 BPM a moll (groove, drop na logu, rap, zen u jógy, zvon u hrobu).
 * Zvrat: škrábnutí desky a 808 „braam“. 2. část: 140 BPM trap ve f moll (808 basa, hi-hat rolly,
 * temné zvonky), neon s bzučením, drogy s wobble, panák s cinknutím, foťák, velký konec.
 * ac může být AudioContext (živě) nebo OfflineAudioContext (vyrenderování do souboru).
 */
function trailerScore(ac, out, t0) {
  const master = ac.createGain();
  master.gain.value = 0.85;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master.connect(comp);
  comp.connect(out);
  const nbuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const nd = nbuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const B = 0.5, B2 = TR_B2, A2 = TR_A2;
  const sat = ac.createWaveShaper(); // lehké zkreslení pro 808
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = (i / 1023) * 2 - 1;
    curve[i] = Math.tanh(x * 2.2);
  }
  sat.curve = curve;
  sat.connect(master);

  const env = (g, at, a, d, peak) => {
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + a);
    g.gain.exponentialRampToValueAtTime(0.0001, at + a + d);
  };
  const noise = (at, dur, type, f0, f1, peak, q = 1) => {
    const s = ac.createBufferSource();
    s.buffer = nbuf;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, at);
    f.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = ac.createGain();
    env(g, at, Math.min(0.01, dur / 4), dur, peak);
    s.connect(f);
    f.connect(g);
    g.connect(master);
    s.start(at);
    s.stop(at + dur + 0.05);
  };
  const tone = (at, dur, type, f0, f1, peak, a = 0.005, filt, dest = master) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = ac.createGain();
    env(g, at, a, dur, peak);
    let node = o;
    if (filt) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filt;
      f.Q.value = 3;
      o.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(dest);
    o.start(at);
    o.stop(at + a + dur + 0.05);
  };
  const kick = (at, v = 1) => {
    tone(at, 0.32, 'sine', 150, 42, 0.9 * v);
    noise(at, 0.03, 'lowpass', 3000, 800, 0.25 * v);
  };
  const clap = (at, v = 1) => {
    noise(at, 0.16, 'bandpass', 1800, 1200, 0.45 * v, 1.2);
    noise(at + 0.012, 0.12, 'bandpass', 2200, 1500, 0.3 * v, 1.2);
  };
  const hat = (at, v = 1, open = false) => noise(at, open ? 0.18 : 0.045, 'highpass', 7000, 9000, 0.16 * v);
  const boom = (at, v = 1) => {
    tone(at, 1.4, 'sine', 90, 30, 0.95 * v, 0.004);
    noise(at, 0.5, 'lowpass', 1800, 120, 0.6 * v);
    noise(at, 1.6, 'highpass', 5000, 9000, 0.22 * v); // činel
  };
  const whoosh = (at, dur = 0.35) => noise(at, dur, 'bandpass', 400, 5000, 0.28, 2);
  const riser = (at, dur, v = 1) => {
    noise(at, dur, 'bandpass', 250, 7000, 0.55 * v, 3);
    tone(at, dur, 'sawtooth', 110, 880, 0.14 * v, dur * 0.8, 2200);
  };
  const roll = (at, dur, n) => {
    for (let i = 0; i < n; i++) {
      const k = i / n;
      clap(at + dur * (1 - (1 - k) ** 1.6), 0.35 + 0.65 * k);
    }
  };
  // 1. část: Am F C G
  const roots = [55, 43.65, 65.41, 49];
  const chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]];
  const pad = (at, dur, notes, v = 1, cut = 1400) => {
    for (const f of notes) {
      for (const det of [-6, 6]) {
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det;
        const fl = ac.createBiquadFilter();
        fl.type = 'lowpass';
        fl.frequency.value = cut;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.03 * v, at + 0.08);
        g.gain.setValueAtTime(0.03 * v, at + Math.max(0.1, dur - 0.15));
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        o.connect(fl);
        fl.connect(g);
        g.connect(master);
        o.start(at);
        o.stop(at + dur + 0.05);
      }
    }
  };
  const bassBar = (at, ci, v = 1) => {
    for (let i = 0; i < 8; i++) {
      const f = roots[ci] * (i % 4 === 3 ? 2 : 1);
      tone(at + i * B / 2, 0.2, 'sawtooth', f, f, 0.22 * v, 0.005, 420);
    }
  };
  const arp = (at, ci, v = 1) => {
    const ns = chords[ci];
    for (let i = 0; i < 16; i++) tone(at + i * B / 4, 0.1, 'square', ns[i % 3] * 2, ns[i % 3] * 2, 0.045 * v, 0.003, 3200);
  };
  const groove = (from, to, o = {}) => {
    for (let t = from; t < to - 0.001; t += B) {
      const beat = Math.round((t - from) / B);
      if (!o.half || beat % 2 === 0) kick(t0 + t);
      if (beat % 2 === 1) clap(t0 + t, o.half ? 0.8 : 1);
      hat(t0 + t + B / 2, 1, beat % 4 === 3);
      if (o.sixteen) hat(t0 + t + B / 4, 0.55);
      if (o.scratch && beat % 4 === 2) noise(t0 + t + B / 2, 0.12, 'bandpass', 900, 3200, 0.3, 4);
    }
    for (let bar = from; bar < to - 0.001; bar += 4 * B) {
      const ci = Math.round((bar - 3.6) / (4 * B)) % 4;
      bassBar(t0 + bar, ci);
      pad(t0 + bar, Math.min(4 * B, to - bar), chords[ci], o.pad || 0.7);
      if (o.arp) arp(t0 + bar, ci);
    }
  };

  // 0–3,6: nájezd
  pad(t0, 3.6, chords[0], 0.9);
  for (let i = 0; i < 4; i++) kick(t0 + i * 0.9, 0.55); // tlukot srdce
  riser(t0 + 0.4, 3.2);
  tone(t0 + 1.7, 0.6, 'sine', 880, 880, 0.06);
  tone(t0 + 2.6, 0.8, 'sine', 1046, 1046, 0.06);
  roll(t0 + 2.8, 0.8, 14);
  // 3,6: drop
  boom(t0 + 3.6, 1.2);
  groove(3.6, 8.1, { pad: 0.9, arp: true });
  tone(t0 + 5.85, 0.25, 'sine', 400, 1600, 0.2); // pružina Berryho
  tone(t0 + 6.3, 0.5, 'triangle', 300, 1400, 0.18);
  whoosh(t0 + 6.3, 0.5);
  // 8,1: rap – hip-hop polovina, škrábání
  boom(t0 + 8.1, 1.1);
  groove(8.1, 10.6, { half: true, scratch: true, pad: 0.6 });
  // 10,6: jóga – bubny pryč, tibetská miska
  boom(t0 + 10.6, 0.7);
  pad(t0 + 10.6, 2.5, [220, 329.6, 440], 0.8, 900);
  for (const [f, at] of [[528, 10.85], [792, 11.6], [528, 12.3]]) {
    tone(t0 + at, 2.2, 'sine', f, f, 0.16, 0.01);
    tone(t0 + at, 2.2, 'sine', f * 1.007, f * 1.007, 0.08, 0.01);
  }
  // 13,1: Luďan – temný zvon a varhany
  boom(t0 + 13.1, 1);
  groove(13.1, 15.6, { pad: 0.5 });
  for (const at of [13.45, 14.45]) {
    tone(t0 + at, 1.6, 'sine', 110, 108, 0.35, 0.004);
    tone(t0 + at, 1.2, 'sine', 293, 290, 0.12, 0.004);
  }
  pad(t0 + 13.45, 2, [110, 130.8, 164.8], 1.2, 700);
  // 15,6: skiny
  boom(t0 + 15.6);
  groove(15.6, 19.6, { arp: true, sixteen: true });
  for (let i = 0; i < 6; i++) tone(t0 + 15.85 + i * 0.5, 0.3, 'triangle', 660 * 2 ** (i / 12 * 2), 660 * 2 ** (i / 12 * 2), 0.12);
  // 19,6: Točná
  boom(t0 + 19.6, 0.9);
  groove(19.6, 21.6, { arp: true });
  for (let i = 0; i < 18; i++) tone(t0 + 19.8 + i * 0.055, 0.12, 'triangle', 440 * 2 ** (i / 18), 440 * 2 ** (i / 18), 0.08);
  // 21,6: ještě chvilka fotbalu…
  groove(21.6, 22.1, { pad: 0.6 });
  // 22,1: škrábnutí desky, deska se zastaví
  for (let i = 0; i < 3; i++) {
    noise(t0 + 22.1 + i * 0.09, 0.08, 'bandpass', i % 2 ? 3000 : 800, i % 2 ? 700 : 3500, 0.55, 6);
  }
  tone(t0 + 22.1, 0.7, 'sawtooth', 220, 30, 0.25, 0.005, 1200); // zastavení desky
  noise(t0 + 22.4, 1.5, 'lowpass', 400, 200, 0.06); // praskání ticha
  for (let i = 0; i < 6; i++) noise(t0 + 22.5 + i * 0.21, 0.02, 'highpass', 5000, 6000, 0.25);
  // 23: braam a nájezd do 2. části
  tone(t0 + 23.0, 1.0, 'sine', 110, 36, 0.5, 0.01, 0, sat);
  riser(t0 + 23.0, 1.0, 1.2);
  for (let i = 0; i < 12; i++) hat(t0 + 23.5 + i * 0.04, 0.5 + i * 0.05);

  /* ----- 2. část: trap 140 BPM, f moll ----- */
  const R2 = [43.65, 34.65, 51.91, 38.89]; // F, Db, Ab, Eb (808)
  const C2 = [[349.2, 415.3, 523.3], [277.2, 349.2, 415.3], [415.3, 523.3, 622.3], [311.1, 392, 466.2]];
  const k808 = (at, f, dur = 0.7, v = 1) => {
    tone(at, dur, 'sine', f * 2.4, f, 0.75 * v, 0.004, 0, sat);
    tone(at, 0.05, 'sine', 180, 60, 0.6 * v);
    noise(at, 0.02, 'lowpass', 4000, 1000, 0.2 * v);
  };
  const snare = (at, v = 1) => {
    noise(at, 0.2, 'bandpass', 2400, 1600, 0.55 * v, 0.9);
    tone(at, 0.1, 'triangle', 260, 180, 0.25 * v);
  };
  const bell = (at, f, v = 1) => {
    tone(at, 0.9, 'sine', f, f, 0.1 * v, 0.003);
    tone(at, 0.6, 'sine', f * 2.76, f * 2.76, 0.03 * v, 0.003);
  };
  const trap = (from, bars, o = {}) => {
    for (let b = 0; b < bars; b++) {
      const at = from + b * 4 * B2, ci = (o.ci0 || 0) + b;
      const c = ci % 4;
      if (!o.noDrums) {
        for (const [beat, mul] of [[0, 1], [1.5, 1], [2.75, 1]]) k808(t0 + at + beat * B2, R2[c] * (beat === 2.75 ? 1.5 : 1), beat === 0 ? 0.8 : 0.4);
        snare(t0 + at + 2 * B2);
        if (b % 2 === 1) snare(t0 + at + 3.75 * B2, 0.5);
        for (let h = 0; h < 8; h++) hat(t0 + at + h * B2 / 2, h % 2 ? 0.55 : 0.8);
        if (b % 2 === 1) for (let r = 0; r < 6; r++) hat(t0 + at + 3 * B2 + r * B2 / 6, 0.4 + r * 0.08); // roll
      }
      pad(t0 + at, 4 * B2, C2[c].map((f) => f / 2), o.pad || 0.6, o.cut || 1200);
      if (o.bells !== false) {
        const ns = C2[c];
        for (let i = 0; i < 8; i++) bell(t0 + at + i * B2 / 2, ns[[0, 1, 2, 1, 0, 2, 1, 2][i]] * (o.oct || 1), 0.8);
      }
      if (o.wobble) {
        for (let i = 0; i < 8; i++) tone(t0 + at + i * B2 / 2, B2 / 2, 'sawtooth', R2[c] * 4, R2[c] * 2, 0.08, 0.01, 600 + (i % 2) * 1400);
      }
    }
  };
  // auta: drop + motor
  boom(t0 + A2, 1.3);
  noise(t0 + A2, 1.5, 'lowpass', 300, 1200, 0.35);
  tone(t0 + A2, 1.6, 'sawtooth', 55, 140, 0.15, 0.02, 500); // motor vytočí
  trap(A2, 3);
  for (const b of [1, 2]) {
    whoosh(t0 + trBar(b) - 0.2, 0.3);
    tone(t0 + trBar(b), 0.9, 'sawtooth', 70, 160, 0.12, 0.02, 500);
  }
  // neon: bzučení a nájezd
  const nb = trBar(3);
  tone(t0 + nb, 4 * B2, 'sawtooth', 60, 60, 0.05, 0.01, 300);
  for (let i = 0; i < 11; i++) noise(t0 + nb + 0.12 + i * 0.085, 0.04, 'highpass', 3000, 5000, 0.25);
  pad(t0 + nb, 4 * B2, C2[0].map((f) => f / 2), 0.8, 800);
  riser(t0 + nb + 0.3, 4 * B2 - 0.3, 1.1);
  for (let i = 0; i < 16; i++) hat(t0 + nb + 2 * B2 + i * B2 / 8, 0.3 + i * 0.04);
  // klub + VIP: plný trap
  boom(t0 + trBar(4), 1.4);
  trap(trBar(4), 4, { pad: 0.7 });
  noise(t0 + trBar(6) + 0.1, 0.12, 'highpass', 2000, 6000, 0.5); // špunt šampusu
  tone(t0 + trBar(6) + 0.1, 0.08, 'sine', 900, 300, 0.3);
  for (let i = 0; i < 10; i++) noise(t0 + trBar(6) + 1 + i * 0.17, 0.25, 'highpass', 3000, 8000, 0.2); // ohňostroj
  // drogy: wobble a zpětné činely
  boom(t0 + trBar(8), 1.1);
  trap(trBar(8), 2, { wobble: true, oct: 2, pad: 0.8, ci0: 0 });
  for (let i = 1; i < 4; i++) {
    const at = trBar(8) + i * 2 * TR_B2;
    noise(t0 + at - 0.35, 0.35, 'highpass', 9000, 3000, 0.3); // zpětný činel
    tone(t0 + at, 0.5, 'sine', 1200, 300, 0.12);
  }
  // panák: cinknutí
  trap(trBar(10), 1, { ci0: 2 });
  tone(t0 + trBar(10) + 0.4, 0.8, 'sine', 2400, 2400, 0.15, 0.002);
  tone(t0 + trBar(10) + 0.4, 0.8, 'sine', 3610, 3610, 0.08, 0.002);
  // online
  trap(trBar(11), 1, { ci0: 3 });
  // FIFAgram: spoušť foťáku a „lajky“
  trap(trBar(12), 1, { ci0: 0 });
  noise(t0 + trBar(12) + 0.05, 0.05, 'highpass', 2000, 4000, 0.5);
  noise(t0 + trBar(12) + 0.12, 0.06, 'highpass', 1500, 3000, 0.4);
  for (let i = 0; i < 10; i++) tone(t0 + trBar(12) + 0.6 + i * 0.1, 0.06, 'sine', 1400 + i * 60, 1400 + i * 60, 0.08);
  // střihy: údery na každou dobu
  for (let i = 0; i < 4; i++) {
    k808(t0 + trBar(13) + i * B2, R2[i % 4], 0.35);
    snare(t0 + trBar(13) + i * B2, 0.6);
  }
  riser(t0 + trBar(13), 4 * B2, 1.2);
  // konec
  const E = trBar(14);
  boom(t0 + E, 1.5);
  k808(t0 + E, R2[0], 2.2, 1.2);
  pad(t0 + E, TR_LEN - E - 0.3, C2[0].map((f) => f / 2), 1.3, 1600);
  pad(t0 + E, TR_LEN - E - 0.3, C2[0], 0.6, 2400);
  for (let i = 0; i < 4; i++) bell(t0 + E + 0.6 + i * B2, C2[0][i % 3] * 2, 1);
  for (let b = 0; b < 2; b++) {
    k808(t0 + E + 1.8 + b * 4 * B2, R2[b % 4], 0.6, 0.8);
    snare(t0 + E + 1.8 + b * 4 * B2 + 2 * B2, 0.7);
  }
  boom(t0 + TR_LEN - 1.6, 0.9);
}
