'use strict';

/*
 * Trailer k updatu (asi 28 s): spustí se odkazem s ?trailer.
 * Scénář řídí skutečné zápasy ve hře (postavy, skiny, schopnosti, kamera)
 * a přes ně kreslí titulky. Hudba je syntetizovaná (WebAudio), takže jde stejně
 * zahrát živě i vyrenderovat do souboru (?trailer=rec nahrává bez zvuku a tlačítek).
 */

const TR_LEN = 28;
const TR_IDLE = { left: false, right: false, jump: false, kick: false, super: false, move: 0 };
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
  ac: null,

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
    this.caps = [];
    this.flashes = [];
    this.booms = [];
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

  buildCues() {
    this.cues = [];
    const cam = (x, y, z, speed = 3, cut = false) => { Game.camOverride = { x, y, z, speed, cut }; };
    const P = () => Game.match.players;

    // 0–4: úvod, kamera pomalu přes stadion
    this.cue(0, () => {
      this.setMatch({ format: '2v2', duos: [5, 4], skins: ['', '', '', 'moncler'], ai: true });
      this.scene = 'intro';
      cam(W / 2 - 160, 300, 1.15, 0.6, true);
    });
    this.cue(1.6, () => cam(W / 2 + 160, 380, 1.3, 0.6));
    this.cap(0.5, 1.7, 'LIGA VELKÝCH HLAV', { y: 320, size: 34, ui: true, sub: true });
    this.cap(2.2, 1.7, 'SE MĚNÍ', { y: 380, size: 60 });
    // 4: drop – logo
    this.cue(4, () => { this.scene = 'logo'; cam(W / 2, 360, 1.05, 2); });
    this.flash(4);
    this.boom(4, 22);

    // 6–10: nová dvojice Tlustej páv & Suli
    this.cue(6, () => {
      this.scene = 'game';
      this.setMatch({ format: '1v1', chars: ['pav', 'sully'], pos: [520, 770], ballX: 645 });
      cam(520, 455, 1.95, 4, true);
    });
    this.flash(6);
    this.cap(6.1, 3.8, 'NOVÁ DVOJICE', { x: 220, y: 100, size: 24, ui: true, sub: true });
    this.cue(7, () => {
      Game.match.usePower(P()[0]);
      Effects.shake(10);
      Effects.pop('OBŘÍ PÁV!', P()[0].x, P()[0].y - 170, '#14b8a6', 46);
    });
    this.boom(7, 16);
    this.cue(7.15, () => cam(560, 430, 1.5, 3));
    this.cap(7.1, 1.3, 'TLUSTEJ PÁV', { x: 330, y: 560, size: 74, sub2: 'OBŘÍ PÁV · NÁRAZ OMRÁČÍ' });
    this.cue(8.25, () => cam(770, 455, 1.95, 5, true));
    this.flash(8.25);
    this.cue(8.55, () => {
      Game.match.usePower(P()[1]);
      Effects.pop('FLASH!', P()[1].x, P()[1].y - 160, '#ffffff', 46);
    });
    this.boom(8.55, 12);
    this.cap(8.6, 1.4, 'SULI', { x: 950, y: 560, size: 84, sub2: 'FLASH · SOUPEŘI ZTUHNOU' });
    this.cue(9.2, () => cam(560, 440, 1.7, 4));

    // 10–14: skiny
    this.cue(10, () => {
      this.scene = 'skins';
      this.setMatch({ format: '1v1', chars: ['jenda', 'bemic'], skins: ['moncler', 'michael'], ai: true });
      cam(W / 2, 380, 1.2, 1);
    });
    this.flash(10);
    this.boom(10, 18);
    this.flash(11);
    this.flash(12);
    this.cap(13, 1, 'NOVÉ SKINY', { y: 96, size: 56 });
    this.boom(13, 10);

    // 14–16: příběh
    this.cue(14, () => { this.scene = 'story'; });
    this.flash(14);
    this.boom(14, 18);

    // 16–18: boss Milan
    this.cue(16, () => {
      this.scene = 'game';
      this.setMatch({ format: '1v1', chars: ['jenda', 'milan'], skins: ['moncler', ''], pos: [560, 730], ballX: 645 });
      cam(730, 455, 1.95, 5, true);
    });
    this.flash(16);
    this.boom(16, 20);
    this.cap(16.05, 1.9, 'BOSS', { x: 980, y: 150, size: 40, ui: true, sub: true, color: '#ff4d4d' });
    this.cap(16.2, 1.8, 'MILAN VORAČKA', { x: 900, y: 560, size: 62 });
    this.cue(16.6, () => {
      Game.match.usePower(P()[1]);
      Effects.pop('ČERVENÁ KARTA!', P()[1].x, P()[1].y - 170, '#ff3b3b', 42);
      Effects.shake(8);
    });
    this.boom(16.6, 12);
    this.cue(17.2, () => cam(560, 455, 1.8, 4));

    // 18–20: úkoly
    this.cue(18, () => { this.scene = 'tasks'; });
    this.flash(18);
    this.boom(18, 14);

    // 20–24: hra 2 v 2 a gól
    this.cue(20, () => {
      this.scene = 'game';
      this.setMatch({ format: '2v2', duos: [5, 4], skins: ['', '', '', 'moncler'], ai: true });
      this.follow = true;
    });
    this.flash(20);
    this.boom(20, 18);
    this.cap(20.1, 1.6, '2 V 2 · ONLINE · TURNAJ', { y: 110, size: 30, ui: true, sub: true });
    this.cue(20.5, () => {
      const pav = P().find((p) => p.look.id === 'pav');
      if (pav) Game.match.usePower(pav);
    });
    this.cue(21.1, () => this.goalShot());
    this.cue(21.75, () => { this.follow = false; cam(W - 300, 430, 1.45, 4); });
    this.cap(21.7, 1.3, 'GÓÓÓL!', { y: 300, size: 110, color: '#ffc93c' });
    this.boom(21.7, 24);
    this.cue(23, () => {
      this.setMatch({ format: '1v1', chars: ['bemic', 'kiki'], skins: ['michael', 'bikini'], ai: true });
      this.follow = true;
    });
    this.flash(23);
    this.cap(23.05, 0.95, 'MICHAEL BÉMIČ VS KIKI', { y: 110, size: 30, ui: true, sub: true });

    // 24–28: závěr
    this.cue(24, () => { this.scene = 'end'; this.follow = false; cam(W / 2, 400, 1.1, 1); });
    this.flash(24);
    this.boom(24, 26);
    this.cue(TR_LEN, () => this.end());
  },

  // Zápas pro scénu: postavy, skiny, poloha; ai = hrají sami, jinak stojí.
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
    const m = new Match(setup, (t, d) => Game.onEvent(t, d), () => TR_IDLE);
    Game.setup = setup;
    Game.match = m;
    Game.state = 'menu';
    Game.stateT = 0;
    Renderer.setFans(setup.teams);
    m.players.forEach((p) => { p.label = ''; p.superCharge = 0; });
    if (!o.ai) {
      m.players.forEach((p, i) => {
        p.brain = null;
        p.remote = 'trailer';
        if (o.pos) p.place(o.pos[i]);
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

  // Superstřela Suli do brány soupeře.
  goalShot() {
    const m = Game.match;
    const s = m.players.find((p) => p.look.id === 'sully') || m.players[0];
    const b = m.ball;
    s.place(W - 560);
    s.dir = 1;
    s.kickT = 0;
    s.kickHit = true;
    b.held = false;
    b.x = s.x + 70;
    b.y = GROUND_Y - 70;
    b.vx = 1350;
    b.vy = -260;
    b.superT = 1.4;
    b.superBy = m.players.indexOf(s);
    b.lastTouch = s;
    b.lastHow = 'super';
    m.players.forEach((p) => { if (p.team === 1) { p.place(p.x < W - 360 ? p.x : W - 420); } });
    Game.fx('super', b.x, b.y, 1, b.superBy);
    Effects.shake(10);
  },

  /* ---------------- běh ---------------- */

  update(now) {
    if (this.t0 === null) this.t0 = now + this.delay * 1000;
    this.t = Math.max(0, (now - this.t0) / 1000);
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const s = Math.max(cw / 1280, ch / 720);
    const t = this.t;
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
    // filmové pruhy během herních záběrů
    if (sc === 'game') this.bars(ctx, 58);
    if (sc === 'intro') this.dim(ctx, 0.55 - 0.25 * trClamp(t / 4));
    if (sc === 'logo') this.drawLogo(ctx, t - 4, false);
    if (sc === 'skins') this.drawSkins(ctx, t - 10);
    if (sc === 'story') this.drawStory(ctx, t - 14);
    if (sc === 'tasks') this.drawTasks(ctx, t - 18);
    if (sc === 'end') this.drawEnd(ctx, t - 24);

    for (const c of this.caps) this.drawCap(ctx, c, t);

    // vignette
    const g = ctx.createRadialGradient(640, 360, 260, 640, 360, 820);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = g;
    ctx.fillRect(-200, -200, 1680, 1120);

    // bílé záblesky na střizích
    let fa = 0;
    for (const f of this.flashes) {
      const d = t - f;
      if (d >= 0 && d < 0.22) fa = Math.max(fa, 1 - d / 0.22);
    }
    if (fa > 0) {
      ctx.fillStyle = `rgba(255,255,255,${fa * 0.85})`;
      ctx.fillRect(-200, -200, 1680, 1120);
    }
    // začátek z černé, konec do černé
    const black = Math.max(trClamp(1 - t / 0.6), trClamp((t - (TR_LEN - 0.8)) / 0.8));
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
      this.text(ctx, c.sub2, x, y + c.size * 0.82, 24, { ui: true, alpha: k2 * kOut, color: '#ffc93c' });
    }
  },

  // logo FIFA67 po dropu
  drawLogo(ctx, d, small) {
    this.dim(ctx, 0.35);
    const k = trClamp(d / 0.25);
    const sc = (small ? 0.8 : 1) * (1 + (1 - trEase.out(k)) * 1.6 + d * 0.03);
    ctx.save();
    ctx.translate(640, small ? 250 : 320);
    ctx.scale(sc, sc);
    // „67“ ve žlutém štítku
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
    const k2 = trClamp((d - 0.35) / 0.25);
    if (!small) this.text(ctx, 'NOVÝ UPDATE', 640, 470, 34, { ui: true, alpha: k2, color: '#ffc93c' });
  },

  // tři skiny jeden po druhém
  drawSkins(ctx, d) {
    this.dim(ctx, 0.72);
    const list = [
      { ch: 'jenda', skin: 'moncler', T: MONCLER_KIT, name: 'MONCLER-JENDA', sub: 'ODMĚNA ZA PŘÍBĚH', x: 280 },
      { ch: 'kiki', skin: 'bikini', T: DUO_TEAMS[3], name: 'KIKI V BIKINÁCH', sub: '15 GÓLŮ V ZÁPASE', x: 640 },
      { ch: 'bemic', skin: 'michael', T: SKINS.michael.kit, name: 'MICHAEL BÉMIČ', sub: '30 GÓLŮ ZA BÉMIČE', x: 1000 },
    ];
    list.forEach((o, i) => {
      const dd = d - i;
      if (dd < 0) return;
      const k = trEase.out(trClamp(dd / 0.35));
      const y = 400 + (1 - k) * 260;
      // reflektor
      const g = ctx.createRadialGradient(o.x, 520, 10, o.x, 420, 260);
      g.addColorStop(0, `rgba(255,220,140,${0.35 * k})`);
      g.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = g;
      ctx.fillRect(o.x - 300, 100, 600, 560);
      const cv = this.pic('skin' + i, 260, 340);
      Renderer.portrait(cv, o.ch, o.T, i === 2 ? -1 : 1, this.t, { skin: o.skin, happy: dd < 0.8 });
      const s = this.ctxS;
      ctx.drawImage(cv, o.x - 130, y - 230, 260, 340);
      this.text(ctx, o.name, o.x, y + 150, 40, { alpha: k, scale: 1 + (1 - k) * 0.5 });
      this.text(ctx, o.sub, o.x, y + 195, 20, { ui: true, alpha: k, color: '#ffc93c' });
      void s;
    });
  },

  // mapa příběhu: 10 zápasů naskáče do rytmu, poslední je boss
  drawStory(ctx, d) {
    this.dim(ctx, 0.8);
    this.text(ctx, 'PŘÍBĚH', 640, 110, 92, { scale: 1 + (1 - trEase.out(trClamp(d / 0.25))) * 1.2 });
    this.text(ctx, '10 ZÁPASŮ · 1 V 1 I 2 V 2 · ODMĚNY', 640, 180, 24, { ui: true, color: '#ffc93c', alpha: trClamp((d - 0.2) / 0.2) });
    const opps = STORY.map((lv) => (lv.format === '2v2' ? DUO_TEAMS[lv.duo].chars[0] : lv.opp));
    opps.forEach((ch, i) => {
      const dd = d - 0.25 - i * 0.16;
      if (dd < 0) return;
      const k = trEase.back(trClamp(dd / 0.25));
      const col = i % 5, row = Math.floor(i / 5);
      const x = 300 + col * 170, y = 320 + row * 170;
      const boss = i === 9;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(k, k);
      ctx.fillStyle = '#0b1220';
      ctx.beginPath();
      ctx.roundRect(-70, -66, 140, 140, 22);
      ctx.fill();
      ctx.fillStyle = boss ? '#a3192b' : row === 0 ? '#2e6b52' : '#8a5a12';
      ctx.beginPath();
      ctx.roundRect(-70, -72, 140, 140, 22);
      ctx.fill();
      ctx.restore();
      if (k > 0.3) {
        const cv = this.pic('node' + i, 110, 110);
        const T = boss ? charById('milan').kit : DUO_TEAMS[Math.max(0, duoOf(ch))];
        Renderer.portrait(cv, ch, T, -1, undefined, { head: true });
        ctx.save();
        ctx.translate(x, y - 6);
        ctx.scale(k, k);
        ctx.drawImage(cv, -50, -55, 100, 100);
        ctx.restore();
      }
      this.text(ctx, String(i + 1), x - 48, y - 46, 28, { alpha: trClamp(k) });
      if (boss) this.text(ctx, 'BOSS', x, y + 52, 22, { ui: true, color: '#ffd0d0', alpha: trClamp(k) });
      if (STORY[i].reward) this.text(ctx, '🎁', x + 56, y - 66, 30, { ui: true, alpha: trClamp(k) });
    });
  },

  // úkoly: ukazatele se naplní a odemknou odměny
  drawTasks(ctx, d) {
    this.dim(ctx, 0.8);
    this.text(ctx, 'ÚKOLY', 640, 100, 88, { scale: 1 + (1 - trEase.out(trClamp(d / 0.25))) * 1.2 });
    const rows = [
      { ch: 'milan', skin: '', T: charById('milan').kit, title: 'ODEHRAJ 15 ZÁPASŮ', name: 'MILAN VORAČKA' },
      { ch: 'kiki', skin: 'bikini', T: DUO_TEAMS[3], title: 'DEJ 15 GÓLŮ V ZÁPASE', name: 'KIKI V BIKINÁCH' },
      { ch: 'bemic', skin: 'michael', T: SKINS.michael.kit, title: 'DEJ 30 GÓLŮ ZA BÉMIČE', name: 'MICHAEL BÉMIČ' },
    ];
    rows.forEach((r, i) => {
      const dd = d - 0.2 - i * 0.22;
      if (dd < 0) return;
      const k = trEase.out(trClamp(dd / 0.3));
      const y = 230 + i * 150, x = 640 + (1 - k) * 400;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.fillStyle = 'rgba(20,28,52,.92)';
      ctx.beginPath();
      ctx.roundRect(x - 420, y - 60, 840, 124, 22);
      ctx.fill();
      ctx.restore();
      const cv = this.pic('task' + i, 100, 120);
      Renderer.portrait(cv, r.ch, r.T, 1, this.t, { skin: r.skin });
      ctx.globalAlpha = k;
      ctx.drawImage(cv, x - 405, y - 58, 100, 120);
      ctx.globalAlpha = 1;
      this.text(ctx, r.title, x - 290, y - 30, 20, { ui: true, align: 'left', color: '#ffc93c', alpha: k });
      this.text(ctx, r.name, x - 290, y + 8, 40, { align: 'left', alpha: k });
      const fill = trEase.out(trClamp((dd - 0.3) / 0.7));
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.beginPath();
      ctx.roundRect(x + 150, y - 10, 220, 22, 11);
      ctx.fill();
      ctx.fillStyle = fill >= 1 ? '#3ee08f' : '#ffc93c';
      ctx.beginPath();
      ctx.roundRect(x + 150, y - 10, 220 * fill, 22, 11);
      ctx.fill();
      if (fill >= 1) this.text(ctx, 'SPLNĚNO ✓', x + 260, y + 38, 22, { ui: true, color: '#6be39a', scale: 1 + Math.max(0, 0.25 - (dd - 1)) });
    });
  },

  // závěrečná karta
  drawEnd(ctx, d) {
    this.dim(ctx, 0.55 + 0.2 * trClamp(d / 1));
    this.drawLogo(ctx, d, true);
    const items = [['PŘÍBĚH', 190], ['TLUSTEJ PÁV & SULI', 330], ['SKINY', 170], ['ÚKOLY', 170]];
    const gap = 18, total = items.reduce((a, it) => a + it[1], 0) + gap * (items.length - 1);
    let left = 640 - total / 2;
    items.forEach(([it, w], i) => {
      const k = trEase.back(trClamp((d - 0.6 - i * 0.15) / 0.25));
      const x = left + w / 2;
      left += w + gap;
      ctx.save();
      ctx.translate(x, 455);
      ctx.scale(k, k);
      ctx.fillStyle = 'rgba(8,13,26,.85)';
      ctx.beginPath();
      ctx.roundRect(-w / 2, -26, w, 52, 14);
      ctx.fill();
      ctx.strokeStyle = '#ffc93c';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      this.text(ctx, it, x, 456, 22, { ui: true, color: '#ffffff', alpha: trClamp(k) });
    });
    const k3 = trClamp((d - 1.5) / 0.3);
    const pulse = 1 + Math.sin(d * 8) * 0.03;
    this.text(ctx, 'HRAJ TEĎ', 640, 555, 72, { color: '#ffc93c', alpha: k3, scale: pulse * (1 + (1 - trEase.out(k3)) * 1.2) });
    this.text(ctx, 'jenik864.github.io/moje-aplikace', 640, 625, 22, { ui: true, alpha: trClamp((d - 2) / 0.3), color: '#d8e1f2' });
  },
};

/*
 * Hudba k traileru (120 BPM, a moll): nájezd, drop na logu, groove, přechody na střizích.
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
  const B = 0.5; // doba (s)

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
  const tone = (at, dur, type, f0, f1, peak, a = 0.005, filt) => {
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
    g.connect(master);
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
  const riser = (at, dur) => {
    noise(at, dur, 'bandpass', 250, 7000, 0.55, 3);
    tone(at, dur, 'sawtooth', 110, 880, 0.14, dur * 0.8, 2200);
  };
  const roll = (at, dur, n) => {
    for (let i = 0; i < n; i++) {
      const k = i / n;
      clap(at + dur * (1 - (1 - k) ** 1.6), 0.35 + 0.65 * k);
    }
  };
  // akordy: Am F C G (basa + pad)
  const roots = [55, 43.65, 65.41, 49];
  const chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]];
  const pad = (at, dur, ci, v = 1) => {
    for (const f of chords[ci]) {
      for (const det of [-6, 6]) {
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det;
        const fl = ac.createBiquadFilter();
        fl.type = 'lowpass';
        fl.frequency.value = 1400;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.03 * v, at + 0.08);
        g.gain.setValueAtTime(0.03 * v, at + dur - 0.15);
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
    }
    for (let bar = from; bar < to - 0.001; bar += 4 * B) {
      const ci = Math.round(bar / (4 * B)) % 4;
      bassBar(t0 + bar, ci);
      pad(t0 + bar, 4 * B, ci, o.pad || 0.7);
      if (o.arp) arp(t0 + bar, ci);
    }
  };

  // 0–4: nájezd
  pad(t0, 4, 0, 0.9);
  for (let i = 0; i < 4; i++) kick(t0 + i, 0.55); // tlukot srdce v nájezdu
  riser(t0 + 0.4, 3.6);
  tone(t0 + 0.5, 0.6, 'sine', 880, 880, 0.05);
  tone(t0 + 2.2, 0.6, 'sine', 1046, 1046, 0.05);
  roll(t0 + 3, 1, 14);
  // 4–9.5: drop
  boom(t0 + 4, 1.1);
  groove(4, 9.5, { pad: 0.9 });
  whoosh(t0 + 6.9);
  tone(t0 + 7, 0.6, 'sine', 220, 55, 0.6); // nafouknutí Páva
  whoosh(t0 + 8.15);
  noise(t0 + 8.55, 0.25, 'highpass', 4000, 9000, 0.5); // blesk
  tone(t0 + 8.55, 0.4, 'sine', 3800, 2400, 0.12);
  riser(t0 + 9.5, 0.5);
  // 10–14: skiny
  boom(t0 + 10);
  groove(10, 13.5, { arp: true, sixteen: true });
  boom(t0 + 11, 0.5);
  boom(t0 + 12, 0.5);
  roll(t0 + 13.5, 0.5, 8);
  // 14–16: příběh (poloviční groove, cinknutí na každé úrovni)
  boom(t0 + 14);
  groove(14, 16, { half: true, pad: 0.5 });
  for (let i = 0; i < 10; i++) tone(t0 + 14.25 + i * 0.16, 0.18, 'triangle', 440 * 2 ** (i / 12 * 1.2), 440 * 2 ** (i / 12 * 1.2), 0.12);
  // 16–18: boss
  boom(t0 + 16, 1.2);
  groove(16, 18, { sixteen: true });
  tone(t0 + 16.6, 0.55, 'sine', 2900, 2900, 0.12); // píšťalka
  tone(t0 + 16.6, 0.55, 'sine', 2950, 2950, 0.06);
  // 18–20: úkoly
  boom(t0 + 18, 0.8);
  groove(18, 19.5, { arp: true });
  for (let i = 0; i < 3; i++) tone(t0 + 19.2 + i * 0.12, 0.3, 'triangle', 660 * (1 + i * 0.25), 660 * (1 + i * 0.25), 0.12);
  roll(t0 + 19.5, 0.5, 8);
  // 20–24: hra a gól
  boom(t0 + 20);
  groove(20, 24, { sixteen: true, arp: true });
  whoosh(t0 + 21.05, 0.5);
  boom(t0 + 21.7, 1.2);
  noise(t0 + 21.7, 2.2, 'bandpass', 900, 700, 0.35, 0.6); // fanoušci řvou
  whoosh(t0 + 22.95);
  // 24–28: závěr
  boom(t0 + 24, 1.3);
  for (let i = 0; i < 4; i++) {
    kick(t0 + 24 + i * B * 2, 0.8);
    clap(t0 + 24.5 + i * B * 2, 0.6);
  }
  pad(t0 + 24, 3.6, 0, 1.2);
  tone(t0 + 24, 3.4, 'sawtooth', 55, 55, 0.18, 0.01, 300);
  tone(t0 + 25.6, 0.3, 'triangle', 880, 880, 0.1);
  tone(t0 + 25.75, 0.6, 'triangle', 1318, 1318, 0.1);
}
