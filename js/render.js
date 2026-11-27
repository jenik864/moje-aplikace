'use strict';
/* Vykreslování: stadion (předkreslený), hráči, míč, efekty a výsledková tabule. */

const FONT_D = '"Paytone One", "Arial Rounded MT Bold", "Arial Black", sans-serif';
const FONT_U = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';
const TAU = Math.PI * 2;
const OUTLINE = 'rgba(28,16,10,.62)';

function rrect(ctx, x, y, w, h, r) {
  const q = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + q, y);
  ctx.arcTo(x + w, y, x + w, y + h, q);
  ctx.arcTo(x + w, y + h, x, y + h, q);
  ctx.arcTo(x, y + h, x, y, q);
  ctx.arcTo(x, y, x + w, y, q);
  ctx.closePath();
}
function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}
function oval(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}
function line(ctx, x0, y0, x1, y1) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Perspektiva trávníku: x měřené na čáře hráčů posunuté do hloubky y.
const persp = (x, y) => W / 2 + (x - W / 2) * (1 + (y - GROUND_Y) * 0.0021);

/* ---------------- efekty ---------------- */

const Effects = {
  parts: [],
  rings: [],
  flashes: [],
  pops: [],     // komiksové nápisy (BUM!, SUPER!)
  bubbles: [],  // pokřiky fanoušků v bublinách na tribuně
  talks: [],    // bubliny nad hráči (MÁM VO2max 67)
  shakeAmt: 0,
  reduced: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),

  clear() {
    this.parts.length = 0;
    this.rings.length = 0;
    this.flashes.length = 0;
    this.pops.length = 0;
    this.bubbles.length = 0;
    this.talks.length = 0;
    this.shakeAmt = 0;
  },
  say(idx, text, color, dur) {
    this.talks = this.talks.filter((t) => t.idx !== idx);
    this.talks.push({ idx, text, color, t: 0, dur });
  },
  snow(x, y, n) {
    for (let i = 0; i < (this.reduced ? n / 3 : n); i++) {
      const a = rand(0, TAU), sp = rand(60, 300);
      this.add({ x: x + rand(-20, 20), y: y + rand(-30, 30), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, g: 260, life: rand(0.6, 1.2), size: rand(2, 4), color: Math.random() < 0.5 ? '#ffffff' : '#bfefff' });
    }
  },
  // Spousta malých bublin najednou na polovině tribun týmu (gól, SKIPER).
  burst(text, team, color, rect, n) {
    const r = rect || { x0: 0, x1: W, y0: 0, y1: H };
    const half0 = team === 0 ? Math.max(r.x0, -400) : Math.max(r.x0, W / 2);
    const half1 = team === 0 ? Math.min(r.x1, W / 2) : Math.min(r.x1, W + 400);
    let lo = half0 + 50, hi = half1 - 50;
    if (hi - lo < 160) {
      // polovina týmu je mimo záběr – bubliny aspoň na kraji záběru u jeho strany
      lo = team === 0 ? r.x0 + 50 : r.x1 - 330;
      hi = lo + 280;
    }
    const ylo = Math.max(r.y0 + 95, STANDS_TOP + 45), yhi = Math.max(ylo + 20, Math.min(r.y1 - 140, STANDS_BOTTOM - 10));
    this.bubbles = this.bubbles.filter((b) => !b.small);
    const placed = [];
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0;
      for (let k = 0; k < 14; k++) {
        x = rand(lo, hi);
        y = rand(ylo, yhi);
        if (!placed.some((q) => Math.abs(q.x - x) < 74 && Math.abs(q.y - y) < 36)) break;
      }
      placed.push({ x, y });
      this.bubbles.push({ text, x, y, color, t: -rand(0, 0.55), dur: 2.4, tail: Math.random() < 0.5 ? -1 : 1, small: true });
    }
  },
  pop(text, x, y, color, size = 46) {
    if (this.pops.length > 4) this.pops.shift();
    this.pops.push({ text, x, y: Math.max(y, 110), color, size, t: 0, dur: 1.0, rot: rand(-0.16, 0.16) });
  },
  // Bublina s pokřikem z tribuny (fanoušci týmu 0 vlevo, týmu 1 vpravo).
  // rect = část světa, kterou kamera právě ukazuje.
  shout(text, team, color, rect) {
    if (this.bubbles.length >= 4) this.bubbles.shift();
    const r = rect || { x0: 0, x1: W, y0: 0, y1: H };
    const mid = (r.x0 + r.x1) / 2, pad = 120;
    const lo = team === 0 ? r.x0 + pad : mid + 40, hi = team === 0 ? mid - 40 : r.x1 - pad;
    const ylo = Math.max(r.y0 + 120, 190), yhi = Math.max(ylo + 10, Math.min(r.y1 - 150, 360));
    let x = 0, y = 0;
    for (let k = 0; k < 12; k++) {
      x = rand(lo, Math.max(lo + 1, hi));
      y = rand(ylo, yhi);
      const hitsJumbo = x > JUMBO.x - 90 && x < JUMBO.x + JUMBO.w + 90 && y < JUMBO.y + JUMBO.h + 70;
      if (!hitsJumbo && !this.bubbles.some((b) => Math.abs(b.x - x) < 200 && Math.abs(b.y - y) < 64)) break;
    }
    this.bubbles.push({ text, x, y, color, t: 0, dur: 2.6, tail: Math.random() < 0.5 ? -1 : 1 });
  },
  // Ohňostroj: fontána jisker ze země.
  pyro(x, colors) {
    const n = this.reduced ? 20 : 70;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rand(-0.22, 0.22), sp = rand(620, 980);
      this.add({ x: x + rand(-6, 6), y: GROUND_Y - 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 900, life: rand(0.7, 1.2), size: rand(2.5, 4.5), color: pick(colors), wait: rand(0, 0.9), glow: true });
    }
  },
  shake(a) {
    if (!this.reduced) this.shakeAmt = Math.max(this.shakeAmt, a);
  },
  add(o) {
    if (this.parts.length < 600) this.parts.push(Object.assign({ t: 0, g: 0, vx: 0, vy: 0, kind: 'dot' }, o));
  },
  kick(x, y, dir) {
    this.rings.push({ x, y, t: 0, dur: 0.3, r0: 8, r1: 46, rgb: '255,246,210' });
    for (let i = 0; i < 9; i++) {
      const a = rand(-1.2, 0.6), sp = rand(160, 420);
      this.add({ x, y, vx: Math.cos(a) * sp * dir, vy: Math.sin(a) * sp, g: 700, life: rand(0.2, 0.4), size: rand(2, 3.5), color: '#fff3c4' });
    }
    if (y > GROUND_Y - 45) this.grass(x, 7);
  },
  grass(x, n) {
    for (let i = 0; i < n; i++) {
      const pal = { snow: ['#ffffff', '#bfe3fa'], beach: ['#f3dc9a', '#d9b46a'], moon: ['#c9ccd4', '#8d919b'] }[Renderer.arena] || ['#6fcb5a', '#3f9a3c'];
      this.add({ x: x + rand(-10, 10), y: GROUND_Y - 2, vx: rand(-160, 160), vy: rand(-360, -140) * (Renderer.arena === 'moon' ? 0.7 : 1), g: Renderer.arena === 'moon' ? 500 : 1400, life: rand(0.35, 0.6), size: rand(2, 3.5), color: Math.random() < 0.5 ? pal[0] : pal[1] });
    }
  },
  dust(x) {
    this.grass(x, 4);
  },
  puff(x, y) {
    this.rings.push({ x, y, t: 0, dur: 0.22, r0: 6, r1: 30, rgb: '255,255,255' });
  },
  spark(x, y) {
    for (let i = 0; i < 10; i++) {
      const a = rand(0, TAU), sp = rand(120, 360);
      this.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 500, life: rand(0.15, 0.3), size: rand(1.5, 3), color: '#ffffff' });
    }
  },
  confetti(team, T) {
    const gx = team === 0 ? W - GOAL_W / 2 : GOAL_W / 2; // branka, do které padl gól
    const colors = [T.color, T.light, '#ffc93c', '#ffffff'];
    const n = this.reduced ? 40 : 150;
    for (let i = 0; i < n; i++) {
      const burst = i < n * 0.4;
      this.add({
        kind: 'conf',
        x: burst ? gx : rand(0, W),
        y: burst ? BAR_Y + 40 : rand(-160, -10),
        vx: burst ? (team === 0 ? -1 : 1) * rand(150, 520) : rand(-40, 40),
        vy: burst ? rand(-700, -250) : rand(40, 160),
        g: burst ? 900 : 140,
        life: rand(2.2, 3.4),
        size: rand(6, 10),
        color: pick(colors),
        rot: rand(0, TAU),
        vr: rand(-9, 9),
      });
    }
  },
  flash() {
    this.flashes.push({ x: rand(10, W - 10), y: rand(170, 450), t: 0, dur: rand(0.08, 0.16) });
  },

  whiteT: 0,
  update(dt) {
    if (this.whiteT > 0) this.whiteT = Math.max(0, this.whiteT - dt);
    this.shakeAmt = Math.max(0, this.shakeAmt * Math.pow(0.02, dt) - dt * 2);
    const ps = this.parts;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      if (p.wait > 0) {
        p.wait -= dt;
        continue;
      }
      p.t += dt;
      if (p.t >= p.life) {
        ps[i] = ps[ps.length - 1];
        ps.pop();
        continue;
      }
      p.vy += p.g * dt;
      if (p.kind === 'conf') {
        p.vx *= 1 - 1.2 * dt;
        if (p.vy > 170) p.vy = 170;
        p.rot += p.vr * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind !== 'conf' && p.y > GROUND_Y + 4 && p.vy > 0) {
        p.y = GROUND_Y + 4;
        p.vy *= -0.3;
        p.vx *= 0.6;
      }
    }
    for (const list of [this.rings, this.flashes, this.pops, this.bubbles, this.talks]) {
      for (let i = list.length - 1; i >= 0; i--) {
        list[i].t += dt;
        if (list[i].t >= list[i].dur) list.splice(i, 1);
      }
    }
  },

  drawFlashes(ctx) {
    for (const f of this.flashes) {
      const a = 1 - f.t / f.dur;
      ctx.fillStyle = `rgba(255,255,255,${0.25 * a})`;
      circle(ctx, f.x, f.y, 12);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      circle(ctx, f.x, f.y, 3.2);
      ctx.fill();
    }
  },

  draw(ctx) {
    for (const r of this.rings) {
      const k = r.t / r.dur;
      ctx.strokeStyle = `rgba(${r.rgb},${0.8 * (1 - k)})`;
      ctx.lineWidth = 4 * (1 - k) + 1;
      circle(ctx, r.x, r.y, lerp(r.r0, r.r1, easeOutQuad(k)));
      ctx.stroke();
    }
    for (const p of this.parts) {
      if (p.wait > 0) continue;
      ctx.globalAlpha = clamp((p.life - p.t) / 0.35, 0, 1);
      ctx.fillStyle = p.color;
      if (p.glow) {
        ctx.globalCompositeOperation = 'lighter';
        circle(ctx, p.x, p.y, p.size * 2.2);
        ctx.globalAlpha *= 0.35;
        ctx.fill();
        ctx.globalAlpha /= 0.35;
        circle(ctx, p.x, p.y, p.size * 0.8);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else if (p.kind === 'conf') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.t * 9 + p.rot));
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else {
        circle(ctx, p.x, p.y, p.size);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  },

  drawPops(ctx) {
    for (const p of this.pops) {
      const k = p.t / p.dur;
      const sc = k < 0.18 ? easeOutBack(k / 0.18) : 1 + (k - 0.18) * 0.12;
      ctx.save();
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.translate(p.x, p.y - 40 * k);
      ctx.rotate(p.rot);
      ctx.scale(sc, sc);
      ctx.font = `${p.size}px ${FONT_D}`;
      const tw = ctx.measureText(p.text).width;
      // výbuch za nápisem
      const r = tw * 0.62 + 18;
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = (i * TAU) / 24, rr = i % 2 ? r * 0.72 : r;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.62);
      }
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0b1220';
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 8;
      ctx.strokeText(p.text, 0, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(p.text, 0, 2);
      ctx.restore();
    }
  },

  drawBubbles(ctx) {
    for (const b of this.bubbles) {
      if (b.t < 0) continue;
      const k = b.t / b.dur;
      const sc = b.t < 0.22 ? easeOutBack(b.t / 0.22) : 1;
      const a = k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(b.x, b.y + Math.sin(b.t * (b.small ? 9 : 5) + b.x) * (b.small ? 4 : 2.5));
      ctx.scale(sc, sc);
      drawSpeech(ctx, b.text, 0, 0, b.color, b.small ? 19 : 24, b.tail);
      ctx.restore();
    }
  },

  // Bubliny nad hráči.
  drawTalks(ctx, players) {
    for (const k of this.talks) {
      const p = players[k.idx];
      if (!p) continue;
      const sc = k.t < 0.2 ? easeOutBack(k.t / 0.2) : 1;
      const a = k.t > k.dur - 0.2 ? (k.dur - k.t) / 0.2 : 1;
      ctx.save();
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.translate(p.x + p.dir * 16, Math.max(70, p.y - p.R - (p.label ? 44 : 12)));
      ctx.scale(sc, sc);
      drawSpeech(ctx, k.text, 0, 0, k.color, 22, p.dir);
      ctx.restore();
    }
  },
};

// Bublina s textem; (x, y) je špička ocásku.
function drawSpeech(ctx, text, x, y, color, size, tail) {
  ctx.font = `${size}px ${FONT_D}`;
  const tw = ctx.measureText(text).width;
  const w = tw + size * 1.1, h = size * 1.7;
  const bx = x - w / 2 - tail * w * 0.22, by = y - h - size * 0.55;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  rrect(ctx, bx + 3, by + 5, w, h, h / 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - size * 0.35, by + h - 2);
  ctx.lineTo(x, y);
  ctx.lineTo(x + size * 0.35, by + h - 2);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = color;
  ctx.stroke();
  rrect(ctx, bx, by, w, h, h / 2);
  ctx.fill();
  ctx.stroke();
  // zakrýt čáru mezi bublinou a ocáskem
  ctx.fillRect(x - size * 0.33, by + h - 4, size * 0.66, 5);
  ctx.fillStyle = '#0b1220';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + w / 2, by + h / 2 + 1);
}

/* ---------------- renderer ---------------- */

const ADS = [
  { t: 'FIFA67', bg: '#0d1526', fg: '#ffc93c' },
  { t: 'KOPAČKY BLESK', bg: '#2f80ff', fg: '#ffffff' },
  { t: 'LIMO HLAVIČKA', bg: '#ffc93c', fg: '#0d1526' },
  { t: 'PEKÁRNA U MÍČE', bg: '#e8458f', fg: '#ffffff' },
  { t: 'GÓL TV', bg: '#19a974', fg: '#ffffff' },
  { t: 'NELCIS & MAJDA', bg: '#9e1f5c', fg: '#ffd1e6' },
  { t: 'MARSAL & DURCADO', bg: '#1a4fb0', fg: '#cfe1ff' },
  { t: 'TÓMA & PELI', bg: '#0d7040', fg: '#c9ffe2' },
  { t: 'BÉMIČ & KIKI', bg: '#b85400', fg: '#ffe6cc' },
  { t: 'ŠIMŠA & JENDA', bg: '#5527c4', fg: '#e3d9ff' },
];
const STANDS_TOP = 150;
const STANDS_BOTTOM = 458;
const JUMBO = { x: 528, y: 162, w: 224, h: 92 };
const DEFAULT_CAM = { x: W / 2, y: H / 2, z: 1, bars: 0 };
const AISLES = [-638, 214, 1066, 1918];
const INTRO_DUR = 11.8;  // celý úvod zápasu
const POSTER_END = 3.6;  // do kdy jsou vidět plakáty týmů
const WARM_AT = 3.6;     // rozcvička
const WARM_END = 6.6;
const REF_AT = 6.6;      // představení rozhodčího
const REF_END = 8.5;
const TALK_AT = [8.75, 10.2]; // předzápasové hlášky: tým vlevo, tým vpravo
const WARM_KINDS = ['juggle', 'jacks', 'stretch', 'sprint']; // co kdo dělá při rozcvičce
const TALK_DUR = 1.35;

const Renderer = {
  arena: 'stadium',
  canvas: null,
  ctx: null,
  bg: null,
  crowd: null,
  scale: 1,
  bgScale: 1,
  ox: 0,
  oy: 0,
  trail: [],
  _f: { x: 0, y: 0 },
  nets: [{ t: -1e9, amp: 0, y: 500 }, { t: -1e9, amp: 0, y: 500 }],
  figs: new Map(),
  vig: null,
  fanColors: ['#e8458f', '#2f80ff'],
  // viditelná část světa při kameře bez přiblížení (na širokém displeji je vidět víc stadionu)
  view: { x0: 0, x1: W, y0: 0, y1: H },

  // Fanoušci v barvách týmů, které právě hrají.
  setFans(teams) {
    const c = [teams[0].color, teams[1].color];
    if (c[0] === this.fanColors[0] && c[1] === this.fanColors[1]) return;
    this.fanColors = c;
    const s = this.bgScale, cr = this.crowd;
    const y = cr.getContext('2d');
    y.setTransform(1, 0, 0, 1, 0, 0);
    y.clearRect(0, 0, cr.width, cr.height);
    y.setTransform(s, 0, 0, s, -this.view.x0 * s, -STANDS_TOP * s);
    this.drawFans(y);
  },

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bg = document.createElement('canvas');
    this.crowd = document.createElement('canvas');
    this.resize();
  },

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(1, this.canvas.clientWidth), ch = Math.max(1, this.canvas.clientHeight);
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    const A = this.canvas.width / this.canvas.height;
    // hra vyplní celý displej: širší displej ukáže víc stadionu do stran,
    // užší víc oblohy a trávníku
    if (A >= W / H) {
      this.scale = this.canvas.height / H;
      const vw = this.canvas.width / this.scale;
      this.view = { x0: W / 2 - vw / 2, x1: W / 2 + vw / 2, y0: 0, y1: H };
    } else {
      this.scale = this.canvas.width / W;
      const vh = this.canvas.height / this.scale;
      const y1 = H + (vh - H) * 0.3;
      this.view = { x0: 0, x1: W, y0: y1 - vh, y1 };
    }
    this.ox = -this.view.x0 * this.scale;
    this.oy = -this.view.y0 * this.scale;
    const vw = this.view.x1 - this.view.x0, vh = this.view.y1 - this.view.y0;
    // pozadí ve vyšším rozlišení, aby bylo ostré i při přiblížení kamery
    this.bgScale = Math.min(this.scale * 1.6, 4096 / vw, 4096 / vh);
    this.vig = null;
    this.buildBg();
  },

  /* ---- statické pozadí ---- */

  buildBg() {
    const s = this.bgScale, v = this.view;
    const c = this.bg;
    c.width = Math.max(1, Math.ceil((v.x1 - v.x0) * s));
    c.height = Math.max(1, Math.ceil((v.y1 - v.y0) * s));
    const x = c.getContext('2d');
    x.setTransform(s, 0, 0, s, -v.x0 * s, -v.y0 * s);
    this.drawSky(x);
    this.drawStandsBase(x);
    this.drawPitch(x);
    // nálada arény (opar, západ slunce, vesmír, bouřka) – vlastní vrstva nad diváky
    const md = this.moodCv || (this.moodCv = document.createElement('canvas'));
    md.width = c.width;
    md.height = c.height;
    const mx = md.getContext('2d');
    mx.setTransform(1, 0, 0, 1, 0, 0);
    mx.clearRect(0, 0, md.width, md.height);
    mx.setTransform(s, 0, 0, s, -v.x0 * s, -v.y0 * s);
    this.hasMood = this.arena !== 'stadium';
    if (this.hasMood) this.drawArenaMood(mx);
    this.drawFences(x);
    this.drawGoalShadow(x, 0);
    this.drawGoalShadow(x, 1);
    const cr = this.crowd;
    cr.width = Math.max(1, Math.ceil((v.x1 - v.x0) * s));
    cr.height = Math.max(1, Math.ceil((STANDS_BOTTOM - STANDS_TOP) * s));
    const y = cr.getContext('2d');
    y.setTransform(s, 0, 0, s, -v.x0 * s, -STANDS_TOP * s);
    this.drawFans(y);
  },

  drawSky(x) {
    const X0 = this.view.x0 - 4, X1 = this.view.x1 + 4, XW = X1 - X0, Y0 = Math.min(0, this.view.y0);
    const g = x.createLinearGradient(0, Y0, 0, 170);
    g.addColorStop(0, '#050c1c');
    g.addColorStop(1, '#152f57');
    x.fillStyle = g;
    x.fillRect(X0, Y0, XW, 170 - Y0);
    const rng = mulberry32(3);
    for (let i = 0; i < 60 * XW / W; i++) {
      x.fillStyle = `rgba(255,255,255,${0.25 + rng() * 0.5})`;
      circle(x, X0 + rng() * XW, Y0 + rng() * (100 - Y0), rng() * 1.1 + 0.3);
      x.fill();
    }
    // střecha s ocelovou konstrukcí
    x.fillStyle = '#080e1a';
    x.fillRect(X0, 108, XW, 44);
    x.strokeStyle = 'rgba(120,150,200,.16)';
    x.lineWidth = 2;
    for (let k = Math.floor(X0 / 40) * 40 - 20; k < X1 + 40; k += 40) {
      line(x, k, 110, k + 40, 150);
      line(x, k + 40, 110, k, 150);
    }
    x.fillStyle = '#0c1424';
    x.fillRect(X0, 106, XW, 5);
    x.fillRect(X0, 146, XW, 6);
    // světla pod střechou
    for (let k = Math.floor(X0 / 46) * 46 + 20; k < X1; k += 46) {
      x.fillStyle = 'rgba(255,240,200,.25)';
      circle(x, k, 150, 5);
      x.fill();
      x.fillStyle = '#fff5d6';
      circle(x, k, 150, 1.8);
      x.fill();
    }
    // stožáry reflektorů
    for (const lx of [74, W - 74]) {
      const glow = x.createRadialGradient(lx, 44, 4, lx, 44, 300);
      glow.addColorStop(0, 'rgba(255,246,214,.6)');
      glow.addColorStop(0.25, 'rgba(255,246,214,.14)');
      glow.addColorStop(1, 'rgba(255,246,214,0)');
      x.fillStyle = glow;
      x.fillRect(lx - 300, 0, 600, 420);
      x.fillStyle = '#070c16';
      x.fillRect(lx - 4, 64, 8, 50);
      x.fillStyle = '#1c2840';
      rrect(x, lx - 54, 20, 108, 46, 5);
      x.fill();
      x.strokeStyle = 'rgba(255,255,255,.12)';
      x.lineWidth = 1.5;
      x.stroke();
      for (let r = 0; r < 2; r++) {
        for (let k = 0; k < 5; k++) {
          const cx = lx - 40 + k * 20, cy = 32 + r * 21;
          x.fillStyle = 'rgba(255,250,225,.35)';
          circle(x, cx, cy, 10);
          x.fill();
          x.fillStyle = '#fffbea';
          circle(x, cx, cy, 6.5);
          x.fill();
        }
      }
    }
  },

  drawStandsBase(x) {
    const top = STANDS_TOP, bottom = STANDS_BOTTOM;
    const X0 = this.view.x0 - 4, XW = this.view.x1 - this.view.x0 + 8;
    const g = x.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, '#0d1626');
    g.addColorStop(1, '#1d2a40');
    x.fillStyle = g;
    x.fillRect(X0, top + 2, XW, bottom - top);
    const rows = 13, rowH = (bottom - 14 - top) / rows;
    for (let r = 0; r < rows; r++) {
      const y = top + 8 + r * rowH;
      x.fillStyle = r % 2 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.1)';
      x.fillRect(X0, y, XW, rowH);
      x.fillStyle = 'rgba(255,255,255,.05)';
      x.fillRect(X0, y + rowH - 2, XW, 1);
    }
    // schodiště mezi sektory
    for (const ax of AISLES) {
      x.fillStyle = '#26344d';
      x.fillRect(ax - 9, top + 4, 18, bottom - top - 4);
      x.fillStyle = 'rgba(255,255,255,.08)';
      for (let y = top + 10; y < bottom; y += rowH) x.fillRect(ax - 9, y, 18, 2);
    }
    // zábradlí a zeď pod tribunou
    x.fillStyle = '#0b1322';
    x.fillRect(X0, bottom, XW, 10);
    x.fillStyle = 'rgba(255,255,255,.18)';
    x.fillRect(X0, bottom - 2, XW, 1.5);
    // podklad pro LED tabule
    x.fillStyle = '#05080f';
    x.fillRect(X0, 462, XW, 48);
    x.fillStyle = 'rgba(0,0,0,.4)';
    x.fillRect(X0, 506, XW, 5);
  },

  drawFans(x) {
    const top = STANDS_TOP, bottom = STANDS_BOTTOM;
    const rng = mulberry32(7);
    const [ca, cb] = this.fanColors;
    const pinks = [ca, shade(ca, -0.2), shade(ca, 0.25)];
    const blues = [cb, shade(cb, -0.2), shade(cb, 0.25)];
    const neutral = ['#e9edf2', '#2b3445', '#ffc93c', '#5b6b84', '#c9d3e0', '#7a4bd6', '#19a974'];
    const skins = ['#f3c99b', '#e0ac69', '#c68642', '#8d5524', '#f8d8c0'];
    const rows = 13, rowH = (bottom - 14 - top) / rows;
    for (let r = 0; r < rows; r++) {
      const y = top + 8 + r * rowH;
      const depth = r / (rows - 1);
      const sp = 11 + depth * 4, size = 3.6 + depth * 2;
      for (let cx = this.view.x0 - 10 + rng() * sp; cx < this.view.x1 + 10; cx += sp * (0.85 + rng() * 0.4)) {
        if (rng() < 0.06 || AISLES.some((a) => Math.abs(cx - a) < 12)) continue;
        const home = cx < W / 2, q = rng();
        // levá půlka tribun fandí týmu vlevo, pravá týmu vpravo
        const shirt = q < 0.8 ? pick2(rng, home ? pinks : blues) : pick2(rng, neutral);
        const yy = y + rowH - 1 + (rng() - 0.5) * 2;
        x.fillStyle = shirt;
        rrect(x, cx - size, yy - size * 1.7, size * 2, size * 1.7, size * 0.6);
        x.fill();
        x.fillStyle = pick2(rng, skins);
        circle(x, cx, yy - size * 2.2, size * 0.78);
        x.fill();
        const extra = rng();
        if (extra < 0.05) {
          // vlajka
          x.fillStyle = home ? ca : cb;
          x.fillRect(cx - 1, yy - size * 5.4, 1.5, size * 3.2);
          x.fillRect(cx, yy - size * 5.4, size * 2.8, size * 1.6);
        } else if (extra < 0.14) {
          // šála nad hlavou
          x.fillStyle = home ? shade(ca, 0.45) : shade(cb, 0.45);
          x.fillRect(cx - size * 1.6, yy - size * 3.6, size * 3.2, size * 0.7);
        }
      }
    }
    // hloubka: horní řady tmavší
    const sh = x.createLinearGradient(0, top, 0, bottom);
    sh.addColorStop(0, 'rgba(4,8,18,.55)');
    sh.addColorStop(0.6, 'rgba(4,8,18,.08)');
    sh.addColorStop(1, 'rgba(4,8,18,0)');
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = sh;
    x.fillRect(this.view.x0 - 4, top, this.view.x1 - this.view.x0 + 8, bottom - top);
    x.globalCompositeOperation = 'source-over';
  },

  drawPitch(x) {
    if (this.arena === 'snow') {
      this.drawIcePitch(x);
      return;
    }
    if (this.arena === 'beach' || this.arena === 'moon') {
      this.drawGroundPitch(x, this.arena);
      return;
    }
    const top = 510;
    const X0 = this.view.x0 - 4, X1 = this.view.x1 + 4, XW = X1 - X0;
    const YB = Math.max(H, this.view.y1);
    const g = x.createLinearGradient(0, top, 0, YB);
    g.addColorStop(0, '#286b2e');
    g.addColorStop(0.45 * (H - top) / (YB - top), '#3b943c');
    g.addColorStop(1, '#48a646');
    x.fillStyle = g;
    x.fillRect(X0, top, XW, YB - top);
    // posekané pruhy
    const n = 16, sw = W / n;
    x.fillStyle = 'rgba(255,255,255,.055)';
    for (let i = -6 - Math.ceil(-X0 / sw) * 2; i < n + 6 + Math.ceil((X1 - W) / sw) * 2; i += 2) {
      x.beginPath();
      x.moveTo(persp(i * sw, top), top);
      x.lineTo(persp((i + 1) * sw, top), top);
      x.lineTo(persp((i + 1) * sw, H), H);
      x.lineTo(persp(i * sw, H), H);
      x.closePath();
      x.fill();
    }
    // stébla trávy
    const rng = mulberry32(11);
    for (let i = 0; i < 2600 * XW / W; i++) {
      const px = X0 + rng() * XW, py = top + 4 + rng() * (H - top - 4);
      const k = (py - top) / (H - top);
      x.strokeStyle = rng() < 0.5 ? `rgba(20,60,20,${0.18 + k * 0.12})` : `rgba(160,230,120,${0.08 + k * 0.1})`;
      x.lineWidth = 0.8 + k;
      line(x, px, py, px + (rng() - 0.5) * 2, py - 2 - k * 3);
    }
    const sh = x.createLinearGradient(0, top, 0, top + 34);
    sh.addColorStop(0, 'rgba(0,0,0,.34)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sh;
    x.fillRect(X0, top, XW, 34);

    // čáry
    x.strokeStyle = 'rgba(255,255,255,.75)';
    x.lineWidth = 3;
    x.lineCap = 'round';
    line(x, X0, 520, X1, 520);
    line(x, W / 2, 520, W / 2, YB);
    oval(x, W / 2, 602, 120, 36);
    x.stroke();
    x.fillStyle = 'rgba(255,255,255,.85)';
    oval(x, W / 2, 602, 5, 2.5);
    x.fill();
    for (let side = 0; side < 2; side++) {
      const gx = side === 0 ? GOAL_W : W - GOAL_W, s = side === 0 ? 1 : -1;
      line(x, persp(gx, 520), 520, persp(gx, H), H);
      const box = (depth, y0, y1) => {
        x.beginPath();
        x.moveTo(persp(gx, y0), y0);
        x.lineTo(persp(gx + s * depth, y0), y0);
        x.lineTo(persp(gx + s * depth, y1), y1);
        x.lineTo(persp(gx, y1), y1);
        x.stroke();
      };
      box(190, 538, 676);
      box(72, 560, 640);
    }
  },

  // Sněžná aréna: ledová plocha s odlesky a stopami bruslí, modré čáry, sněhové návěje.
  drawIcePitch(x) {
    const top = 510;
    const X0 = this.view.x0 - 4, X1 = this.view.x1 + 4, XW = X1 - X0;
    const YB = Math.max(H, this.view.y1);
    const g = x.createLinearGradient(0, top, 0, YB);
    g.addColorStop(0, '#9cc9e6');
    g.addColorStop(0.35 * (H - top) / (YB - top), '#cfe8f7');
    g.addColorStop(1, '#eaf7ff');
    x.fillStyle = g;
    x.fillRect(X0, top, XW, YB - top);
    // odlesky
    x.fillStyle = 'rgba(255,255,255,.28)';
    for (let i = -4; i < 14; i++) {
      const bx = i * 120 + 30;
      x.beginPath();
      x.moveTo(persp(bx, top), top);
      x.lineTo(persp(bx + 46, top), top);
      x.lineTo(persp(bx - 30, H), H);
      x.lineTo(persp(bx - 90, H), H);
      x.closePath();
      x.fill();
    }
    // stopy bruslí a škrábance
    const rng = mulberry32(5);
    for (let i = 0; i < 420 * XW / W; i++) {
      const px = X0 + rng() * XW, py = top + 6 + rng() * (H - top - 6);
      const k = (py - top) / (H - top);
      x.strokeStyle = rng() < 0.5 ? `rgba(255,255,255,${0.35 + k * 0.3})` : `rgba(90,140,180,${0.12 + k * 0.12})`;
      x.lineWidth = 0.7 + k * 0.8;
      const len = 10 + rng() * 40, a = (rng() - 0.5) * 0.5;
      x.beginPath();
      x.moveTo(px, py);
      x.quadraticCurveTo(px + len * 0.5, py + Math.sin(a) * 6 - 2, px + len, py + Math.sin(a) * len * 0.2);
      x.stroke();
    }
    const sh = x.createLinearGradient(0, top, 0, top + 34);
    sh.addColorStop(0, 'rgba(20,50,80,.32)');
    sh.addColorStop(1, 'rgba(20,50,80,0)');
    x.fillStyle = sh;
    x.fillRect(X0, top, XW, 34);
    // čáry (modré, jako na hokeji; uprostřed červená)
    x.lineCap = 'round';
    x.lineWidth = 3;
    x.strokeStyle = 'rgba(40,100,200,.6)';
    line(x, X0, 520, X1, 520);
    x.strokeStyle = 'rgba(220,40,50,.55)';
    x.lineWidth = 5;
    line(x, W / 2, 520, W / 2, YB);
    x.lineWidth = 3;
    x.strokeStyle = 'rgba(40,100,200,.6)';
    oval(x, W / 2, 602, 120, 36);
    x.stroke();
    x.fillStyle = 'rgba(40,100,200,.75)';
    oval(x, W / 2, 602, 5, 2.5);
    x.fill();
    for (let side = 0; side < 2; side++) {
      const gx = side === 0 ? GOAL_W : W - GOAL_W, sd = side === 0 ? 1 : -1;
      line(x, persp(gx, 520), 520, persp(gx, H), H);
      const box = (depth, y0, y1) => {
        x.beginPath();
        x.moveTo(persp(gx, y0), y0);
        x.lineTo(persp(gx + sd * depth, y0), y0);
        x.lineTo(persp(gx + sd * depth, y1), y1);
        x.lineTo(persp(gx, y1), y1);
        x.stroke();
      };
      box(190, 538, 676);
      box(72, 560, 640);
    }
    // sněhová návěj podél mantinelu
    x.fillStyle = '#f4fbff';
    x.beginPath();
    x.moveTo(X0, top + 12);
    for (let px = X0; px <= X1 + 30; px += 30) x.quadraticCurveTo(px + 15, top - 4 - rng() * 8, px + 30, top + 8 + rng() * 6);
    x.lineTo(X1, top - 20);
    x.lineTo(X0, top - 20);
    x.closePath();
    x.fill();
    x.strokeStyle = 'rgba(120,170,210,.5)';
    x.lineWidth = 1.5;
    x.stroke();
  },

  // Nálada arény přes tribuny a oblohu (opar, západ slunce, vesmír, bouřka).
  drawArenaMood(x) {
    const v = this.view, a = this.arena, w = v.x1 - v.x0;
    if (a === 'snow') {
      x.fillStyle = 'rgba(215,232,250,.16)';
      x.fillRect(v.x0, v.y0, w, 520 - v.y0);
    } else if (a === 'beach') {
      // západ slunce nad mořem
      const g = x.createLinearGradient(0, v.y0, 0, 520);
      g.addColorStop(0, 'rgba(255,120,80,.42)');
      g.addColorStop(0.5, 'rgba(255,190,110,.22)');
      g.addColorStop(1, 'rgba(255,210,150,.08)');
      x.fillStyle = g;
      x.fillRect(v.x0, v.y0, w, 520 - v.y0);
      x.fillStyle = 'rgba(255,230,140,.85)';
      circle(x, W / 2 + 420, 70, 46);
      x.fill();
      // palmy na krajích
      for (const px of [v.x0 + 60, v.x1 - 60, 300, W - 300]) this.drawPalm(x, px, 512);
    } else if (a === 'moon') {
      // vesmír: tmavá obloha, hvězdy, Země
      x.fillStyle = 'rgba(6,8,22,.58)';
      x.fillRect(v.x0, v.y0, w, 520 - v.y0);
      const rng = mulberry32(21);
      x.fillStyle = '#ffffff';
      for (let i = 0; i < 160; i++) {
        x.globalAlpha = 0.35 + rng() * 0.65;
        circle(x, v.x0 + rng() * w, v.y0 + rng() * (330 - v.y0), 0.6 + rng() * 1.6);
        x.fill();
      }
      x.globalAlpha = 1;
      const ex = W / 2 - 430, ey = 80;
      const eg = x.createRadialGradient(ex - 12, ey - 12, 4, ex, ey, 42);
      eg.addColorStop(0, '#9fd8ff');
      eg.addColorStop(0.6, '#2f7fd6');
      eg.addColorStop(1, '#173f8a');
      x.fillStyle = eg;
      circle(x, ex, ey, 40);
      x.fill();
      x.fillStyle = 'rgba(80,190,90,.85)';
      oval(x, ex - 10, ey - 6, 14, 9, 0.4);
      x.fill();
      oval(x, ex + 14, ey + 12, 10, 6, -0.3);
      x.fill();
    } else if (a === 'wind') {
      // bouřka
      const g = x.createLinearGradient(0, v.y0, 0, 520);
      g.addColorStop(0, 'rgba(30,38,58,.62)');
      g.addColorStop(1, 'rgba(40,50,70,.25)');
      x.fillStyle = g;
      x.fillRect(v.x0, v.y0, w, 520 - v.y0);
    }
  },

  drawPalm(x, px, py) {
    x.save();
    x.strokeStyle = '#3a2412';
    x.lineWidth = 9;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(px, py);
    x.quadraticCurveTo(px - 18, py - 90, px + 6, py - 170);
    x.stroke();
    x.fillStyle = '#1f5e2c';
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.55;
      x.beginPath();
      x.moveTo(px + 6, py - 170);
      x.quadraticCurveTo(px + 6 + Math.cos(a) * 60, py - 170 + Math.sin(a) * 40 - 20, px + 6 + Math.cos(a) * 95, py - 170 + Math.sin(a) * 30 + 25);
      x.quadraticCurveTo(px + 6 + Math.cos(a) * 50, py - 170 + Math.sin(a) * 20, px + 6, py - 170);
      x.fill();
    }
    x.restore();
  },

  // Pláž (písek) a Měsíc (prach a krátery): plocha, čáry a detaily.
  drawGroundPitch(x, kind) {
    const top = 510;
    const X0 = this.view.x0 - 4, X1 = this.view.x1 + 4, XW = X1 - X0;
    const YB = Math.max(H, this.view.y1);
    const beach = kind === 'beach';
    const g = x.createLinearGradient(0, top, 0, YB);
    g.addColorStop(0, beach ? '#d9b46a' : '#6f737d');
    g.addColorStop(0.4 * (H - top) / (YB - top), beach ? '#ecd08c' : '#9a9ea8');
    g.addColorStop(1, beach ? '#f6e2a8' : '#b9bcc4');
    x.fillStyle = g;
    x.fillRect(X0, top, XW, YB - top);
    const rng = mulberry32(beach ? 9 : 13);
    if (beach) {
      // vlnky v písku a mušle
      for (let i = 0; i < 260 * XW / W; i++) {
        const px = X0 + rng() * XW, py = top + 8 + rng() * (H - top - 8), k = (py - top) / (H - top);
        x.strokeStyle = `rgba(160,110,40,${0.14 + k * 0.14})`;
        x.lineWidth = 1 + k;
        x.beginPath();
        x.moveTo(px, py);
        x.quadraticCurveTo(px + 14 + k * 10, py - 3, px + 30 + k * 20, py);
        x.stroke();
      }
      for (let i = 0; i < 26; i++) {
        x.fillStyle = rng() < 0.5 ? '#fff2df' : '#f2b4a0';
        oval(x, X0 + rng() * XW, top + 20 + rng() * (H - top - 30), 4, 2.6, rng());
        x.fill();
      }
    } else {
      // krátery a prach
      for (let i = 0; i < 70 * XW / W; i++) {
        const px = X0 + rng() * XW, py = top + 10 + rng() * (H - top - 10), k = (py - top) / (H - top);
        const r = (4 + rng() * 16) * (0.6 + k);
        x.fillStyle = 'rgba(60,62,70,.35)';
        oval(x, px, py, r, r * 0.32);
        x.fill();
        x.strokeStyle = 'rgba(230,232,240,.35)';
        x.lineWidth = 1.2;
        x.beginPath();
        x.ellipse(px, py + 1, r, r * 0.32, 0, 0.1, Math.PI - 0.1);
        x.stroke();
      }
    }
    const sh = x.createLinearGradient(0, top, 0, top + 34);
    sh.addColorStop(0, 'rgba(0,0,0,.3)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sh;
    x.fillRect(X0, top, XW, 34);
    // čáry
    x.strokeStyle = beach ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.55)';
    x.lineWidth = 3;
    x.lineCap = 'round';
    line(x, X0, 520, X1, 520);
    line(x, W / 2, 520, W / 2, YB);
    oval(x, W / 2, 602, 120, 36);
    x.stroke();
    for (let side = 0; side < 2; side++) {
      const gx = side === 0 ? GOAL_W : W - GOAL_W, sd = side === 0 ? 1 : -1;
      line(x, persp(gx, 520), 520, persp(gx, H), H);
      x.beginPath();
      x.moveTo(persp(gx, 538), 538);
      x.lineTo(persp(gx + sd * 190, 538), 538);
      x.lineTo(persp(gx + sd * 190, 676), 676);
      x.lineTo(persp(gx, 676), 676);
      x.stroke();
    }
  },

  // Vichřice: listí a čáry větru letí směrem, kam fouká.
  drawWind(ctx, now, dir) {
    const v = this.view, vw = v.x1 - v.x0, t = now / 1000;
    ctx.save();
    for (let i = 0; i < 70; i++) {
      const r1 = ((i * 7919) % 1000) / 1000, r2 = ((i * 104729) % 1000) / 1000, r3 = ((i * 15485863) % 1000) / 1000;
      const sp = 380 + r2 * 420;
      const x = v.x0 + ((((r1 * vw + dir * t * sp) % vw) + vw) % vw);
      const y = 140 + r3 * 460 + Math.sin(t * 3 + i) * 12;
      if (i % 3 === 0) {
        // list
        ctx.fillStyle = i % 2 ? 'rgba(190,140,60,.85)' : 'rgba(120,160,70,.85)';
        ctx.beginPath();
        ctx.ellipse(x, y, 6, 3, t * 6 + i, 0, TAU);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(220,235,255,.28)';
        ctx.lineWidth = 2;
        line(ctx, x, y, x - dir * (40 + r2 * 50), y);
      }
    }
    ctx.restore();
  },

  // Padající sníh (jen ve sněžné aréně), kreslí se přes hřiště.
  drawSnow(ctx, now) {
    const v = this.view, vw = v.x1 - v.x0, top = v.y0 - 30, hh = v.y1 - v.y0 + 60;
    const t = now / 1000;
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < 150; i++) {
      const r1 = ((i * 7919) % 1000) / 1000, r2 = ((i * 104729) % 1000) / 1000, r3 = ((i * 15485863) % 1000) / 1000;
      const sp = 40 + r2 * 70, sz = 1.2 + r3 * 2.6;
      const y = top + ((r2 * hh + t * sp) % hh);
      const x = v.x0 + ((r1 * vw + Math.sin(t * (0.6 + r3) + i) * 18 + t * 12) % vw + vw) % vw;
      ctx.globalAlpha = 0.45 + r3 * 0.5;
      circle(ctx, x, y, sz);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  // Záchytné sítě za brankami (sem až míč dolétne, dál ne).
  drawFences(x) {
    for (const side of [0, 1]) {
      const fx = side === 0 ? -26 : W, fw = 26, top = 118, bot = GROUND_Y;
      if (side === 0 && this.view.x0 > 0) continue;
      if (side === 1 && this.view.x1 < W) continue;
      x.fillStyle = 'rgba(10,16,30,.35)';
      x.fillRect(fx, top, fw, bot - top);
      x.save();
      x.beginPath();
      x.rect(fx, top, fw, bot - top);
      x.clip();
      x.strokeStyle = 'rgba(220,230,245,.28)';
      x.lineWidth = 1;
      for (let k = top - 40; k < bot; k += 9) {
        line(x, fx, k, fx + fw, k + 26);
        line(x, fx + fw, k, fx, k + 26);
      }
      x.restore();
      x.fillStyle = '#8f9bad';
      x.fillRect(fx - 2, top - 6, 4, bot - top + 6);
      x.fillRect(fx + fw - 2, top - 6, 4, bot - top + 6);
      x.fillStyle = '#c3ccd8';
      x.fillRect(fx - 2, top - 8, fw + 4, 3);
    }
  },

  drawGoalShadow(x, side) {
    const x0 = side === 0 ? 0 : W - GOAL_W;
    x.fillStyle = 'rgba(0,0,0,.28)';
    oval(x, x0 + GOAL_W / 2, GROUND_Y + 4, GOAL_W * 0.75, 11);
    x.fill();
  },

  /* ---- snímek ---- */

  // Střed výchozího záběru (kamera bez přiblížení).
  viewCenter() {
    return { x: (this.view.x0 + this.view.x1) / 2, y: (this.view.y0 + this.view.y1) / 2 };
  },

  // přepnout vzhled hřiště podle zápasu (stadion / sněžná aréna)
  setArena(a) {
    if (a === this.arena) return;
    this.arena = a;
    if (this.bg) this.buildBg();
  },

  draw(g) {
    if (g.match) this.setArena(g.match.arenaId || 'stadium');
    const ctx = this.ctx, s = this.scale, m = g.match, v = this.view;
    const cw = this.canvas.width, ch = this.canvas.height;
    const now = performance.now();
    const cam = g.cam || DEFAULT_CAM;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#071022';
    ctx.fillRect(0, 0, cw, ch);

    let sx = 0, sy = 0;
    if (Effects.shakeAmt > 0.2) {
      sx = rand(-1, 1) * Effects.shakeAmt;
      sy = rand(-1, 1) * Effects.shakeAmt;
    }
    const k = s * cam.z;
    const penView = m && g.screen === 'match' && g.state === 'shootout' && g.pen && g.pen.shooter >= 0;
    if (penView) {
      // penalty: vlastní scéna pohledem za střelcem
      ctx.setTransform(s, 0, 0, s, this.ox + sx * s, this.oy + sy * s);
      PenScene.draw(ctx, g, now);
      Effects.draw(ctx);
      Effects.drawPops(ctx);
    } else {
    ctx.setTransform(k, 0, 0, k, cw / 2 - cam.x * k + sx * s, ch / 2 - cam.y * k + sy * s);
    ctx.drawImage(this.bg, v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    this.drawCrowd(ctx, g.excite || 0, now);
    if (this.hasMood) ctx.drawImage(this.moodCv, v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    this.drawBeams(ctx, g);
    this.drawJumbotron(ctx, g, now);
    this.drawBoards(ctx, g, now);
    Effects.drawBubbles(ctx);

    if (m) {
      Effects.drawFlashes(ctx);
      this.drawNet(ctx, 0, now);
      this.drawNet(ctx, 1, now);
      this.drawBlocks(ctx, m, now);
      const b = m.ball;
      for (const p of m.players) this.drawShadow(ctx, p.x, p.standY - p.y, 36 * PS);
      this.drawShadow(ctx, b.x, GROUND_Y - b.r - b.y, b.r);
      const hoop = b.basketT > 0 || b.carryBy >= 0;
      if (hoop) this.drawHoop(ctx, b, now, false);
      if (g.screen === 'match' && g.state === 'intro') this.drawReferee(ctx, g, b, now);
      for (const p of m.players) if (p.boostT > 0) this.drawBoost(ctx, p, now);
      for (const p of m.players) if ((p.lift || 0) > 1) this.drawSushi(ctx, p, now);
      for (const p of m.players) this.drawPlayer(ctx, p, b, m.teams, now);
      // rozcvička: žonglování s vlastním míčem
      if (g.state === 'intro') {
        for (const p of m.players) {
          if (!(p.jball >= 0)) continue;
          const bx = p.x + p.dir * 34, by = GROUND_Y - 30 - p.jball;
          this.drawShadow(ctx, bx, p.jball + 10, 14);
          PenScene.drawBall(ctx, bx, by, 15, now * 0.012);
        }
      }
      const sp = b.superT > 0 && m.players[b.superBy];
      if (m.jet) this.drawJet(ctx, m, now);
      if (m.arms) this.drawArms(ctx, m, now);
      if (g.state !== 'intro') {
        if (hoop) this.drawBasketball(ctx, b);
        else this.drawBall(ctx, b, sp ? superColor(sp.look.id) : null);
      }
      if (hoop) this.drawHoop(ctx, b, now, true);
      this.drawGoalFront(ctx, 0);
      this.drawGoalFront(ctx, 1);
      if (g.screen === 'match' && g.state === 'over') this.drawTrophy(ctx, g, now);
      Effects.draw(ctx);
      if (this.arena === 'snow') this.drawSnow(ctx, now);
      else if (this.arena === 'wind') this.drawWind(ctx, now, m.windDir || 1);
      Effects.drawTalks(ctx, m.players);
      for (const p of m.players) if (p.stunT > 0 && p.onGround && !(p.flashT > 0)) this.drawDizzy(ctx, p, now);
      for (const p of m.players) if (p.yellowT > 0) this.drawYellow(ctx, p, now);
      if (g.screen === 'match' && g.state === 'intro') this.drawIntroTalk(ctx, g, now);
      Effects.drawPops(ctx);
      if (g.state !== 'menu' && cam.bars < 0.3) {
        for (const p of m.players) this.drawTag(ctx, p, m.teams);
      }
    }
    }

    // obrazovka (nezávisle na kameře)
    ctx.setTransform(s, 0, 0, s, this.ox, this.oy);
    this.drawVignette(ctx);
    if (cam.bars > 0.01) this.drawBars(ctx, cam.bars);
    if (m && g.state !== 'menu') {
      const a = clamp(1 - cam.bars * 1.6, 0, 1);
      if (a > 0) {
        ctx.globalAlpha = a;
        ctx.setTransform(s, 0, 0, s, this.ox, 0);
        this.drawHUD(ctx, g);
        if (g.state === 'shootout' && g.pen) this.drawPenHUD(ctx, g, now);
        ctx.setTransform(s, 0, 0, s, this.ox, this.oy);
        ctx.globalAlpha = 1;
      }
      if (g.state === 'intro') {
        this.drawIntro(ctx, g, now);
        this.drawWarmBanner(ctx, g, now);
        this.drawRefBanner(ctx, g, now);
      }
      if (g.state === 'replay') this.drawReplayLabel(ctx, now);
      if (!Touch.enabled && g.myCharge >= 0 && a > 0 && g.screen === 'match') this.drawSuperMeter(ctx, g.myCharge, g.myColor, now, g.myPower);
    }
    if (g.state === 'paused' && g.mode === 'guest') {
      this.drawMsg(ctx, { text: 'PAUZA', sub: 'Hostitel hru pozastavil', t: 1, dur: 9, size: 110, color: '#f3f6ef' });
    }
    if (g.msg) this.drawMsg(ctx, g.msg);
    // Selfie flash: bílý záblesk přes celou obrazovku
    if (Effects.whiteT > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(255,255,255,${clamp(Effects.whiteT / 0.45, 0, 1) * 0.85})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  },

  // Publikum: při vzrušení vyskakuje ve vlnách.
  drawCrowd(ctx, ex, now) {
    const c = this.crowd, h = STANDS_BOTTOM - STANDS_TOP, v = this.view, vw = v.x1 - v.x0;
    if (ex < 0.05) {
      ctx.drawImage(c, v.x0, STANDS_TOP, vw, h);
      return;
    }
    const n = Math.round(32 * vw / W), sw = vw / n, csw = c.width / n;
    for (let i = 0; i < n; i++) {
      const off = -Math.max(0, Math.sin(now * 0.012 + i * 0.9)) * 6 * ex;
      ctx.drawImage(c, i * csw, 0, csw, c.height, v.x0 + i * sw, STANDS_TOP + off, sw + 0.6, h);
    }
  },

  drawBeams(ctx, g) {
    const boost = g.state === 'goal' ? 1.7 : g.state === 'over' ? 1.4 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [lx, dir] of [[74, 1], [W - 74, -1]]) {
      const gr = ctx.createLinearGradient(lx, 44, lx + dir * 320, 620);
      gr.addColorStop(0, `rgba(255,240,205,${0.09 * boost})`);
      gr.addColorStop(1, 'rgba(255,240,205,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(lx - 34, 44);
      ctx.lineTo(lx + 34, 44);
      ctx.lineTo(lx + dir * 640, 650);
      ctx.lineTo(lx + dir * 230, 650);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },

  // Velká obrazovka na tribuně.
  drawJumbotron(ctx, g, now) {
    const { x, y, w, h } = JUMBO;
    const m = g.match, st = g.state;
    ctx.fillStyle = '#070b14';
    ctx.fillRect(x + 36, y + h + 4, 10, 60);
    ctx.fillRect(x + w - 46, y + h + 4, 10, 60);
    ctx.fillStyle = '#111a2c';
    rrect(ctx, x - 7, y - 7, w + 14, h + 14, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.16)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.save();
    rrect(ctx, x, y, w, h, 3);
    ctx.clip();
    ctx.fillStyle = '#050912';
    ctx.fillRect(x, y, w, h);
    const cx = x + w / 2, cy = y + h / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const inMatch = m && g.screen === 'match' && st !== 'menu';
    if (!inMatch) {
      const gr = ctx.createLinearGradient(x, 0, x + w, 0);
      gr.addColorStop(0, 'rgba(232,69,143,.55)');
      gr.addColorStop(1, 'rgba(47,128,255,.55)');
      ctx.fillStyle = gr;
      ctx.fillRect(x, y, w, h);
      // střídá se logo hry a sponzoři
      const slot = Math.floor(now / 3500) % (SPONSORS.length + 1);
      if (slot === 0) {
        ctx.font = `38px ${FONT_D}`;
        ctx.fillStyle = '#ffc93c';
        ctx.fillText('FIFA67', cx, cy + 2 + Math.sin(now * 0.003) * 3);
      } else {
        const sp = SPONSORS[slot - 1];
        ctx.fillStyle = sp.bg;
        ctx.fillRect(x, y, w, h);
        ctx.font = `800 14px ${FONT_U}`;
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.fillText('PARTNER HRY', cx, y + 22);
        ctx.font = `32px ${FONT_D}`;
        ctx.fillStyle = sp.fg;
        ctx.fillText(sp.t, cx, cy + 12);
      }
    } else if (st === 'goal' && g.goalTeam >= 0) {
      const T = m.teams[g.goalTeam];
      ctx.fillStyle = Math.floor(now / 170) % 2 ? T.color : T.dark;
      ctx.fillRect(x, y, w, h);
      const sp = m.players[g.scorerIdx];
      if (sp) this.drawFigure(ctx, sp.look, T, x + 46, y + 58, 0.62, 1, 1, { x: x + 300, y: y + 20 });
      ctx.font = `48px ${FONT_D}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('GÓL!', cx + 34, cy + 2);
    } else if (st === 'intro' && g.stateT < 1.15) {
      // úvod: zápas přinášejí sponzoři
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(x, y, w, h);
      ctx.font = `800 14px ${FONT_U}`;
      ctx.fillStyle = '#ffc93c';
      ctx.fillText('ZÁPAS VÁM PŘINÁŠÍ', cx, y + 17);
      SPONSORS.forEach((sp, k) => {
        const yy = y + 42 + k * 29;
        ctx.fillStyle = sp.bg;
        ctx.fillRect(x + 14, yy - 13, w - 28, 26);
        ctx.font = `21px ${FONT_D}`;
        ctx.fillStyle = sp.fg;
        ctx.fillText(sp.t, cx, yy + 1);
      });
    } else if (st === 'intro') {
      ctx.fillStyle = m.teams[0].dark;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(cx + 18, y);
      ctx.lineTo(cx - 18, y + h);
      ctx.lineTo(x, y + h);
      ctx.fill();
      ctx.fillStyle = m.teams[1].dark;
      ctx.beginPath();
      ctx.moveTo(cx + 18, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(cx - 18, y + h);
      ctx.fill();
      ctx.font = `52px ${FONT_D}`;
      ctx.fillStyle = '#ffc93c';
      ctx.fillText('VS', cx, cy + 3);
    } else if (st === 'replay') {
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(x, y, w, h);
      if (Math.floor(now / 500) % 2 === 0) {
        ctx.fillStyle = '#ff3b3b';
        circle(ctx, x + 26, cy, 8);
        ctx.fill();
      }
      ctx.font = `34px ${FONT_D}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('ZÁZNAM', cx + 14, cy + 2);
    } else if (st === 'over') {
      const win = Math.max(0, m.winner()), T = m.teams[win];
      const gr = ctx.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, T.color);
      gr.addColorStop(1, T.dark);
      ctx.fillStyle = gr;
      ctx.fillRect(x, y, w, h);
      ctx.font = `800 20px ${FONT_U}`;
      ctx.fillStyle = '#ffc93c';
      ctx.fillText('VÍTĚZ', cx, y + 22);
      this.fitText(ctx, T.name, w - 20, 34, FONT_D, '');
      ctx.fillStyle = '#ffffff';
      ctx.fillText(T.name, cx, cy + 14);
    } else {
      const T0 = m.teams[0], T1 = m.teams[1];
      ctx.fillStyle = T0.dark;
      ctx.fillRect(x, y, w / 2, h);
      ctx.fillStyle = T1.dark;
      ctx.fillRect(x + w / 2, y, w / 2, h);
      ctx.font = `54px ${FONT_D}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(m.score[0]), x + w * 0.27, cy + 4);
      ctx.fillText(String(m.score[1]), x + w * 0.73, cy + 4);
      ctx.fillStyle = '#ffc93c';
      ctx.font = `800 22px ${FONT_U}`;
      ctx.fillText(fbClock(g.clock || 0), cx, cy + 2);
    }
    // LED mřížka a lesk
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    for (let i = x; i < x + w; i += 3) ctx.fillRect(i, y, 1, h);
    for (let j = y; j < y + h; j += 3) ctx.fillRect(x, j, w, 1);
    const sheen = ctx.createLinearGradient(x, y, x, y + h);
    sheen.addColorStop(0, 'rgba(255,255,255,.12)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  },

  fitText(ctx, text, maxW, size, family, weight) {
    ctx.font = `${weight} ${size}px ${family}`;
    while (size > 12 && ctx.measureText(text).width > maxW) {
      size -= 2;
      ctx.font = `${weight} ${size}px ${family}`;
    }
    return size;
  },

  // LED reklamy: střídají se, při gólu blikají.
  drawBoards(ctx, g, now) {
    const y = 466, h = 40, bw = 196;
    const m = g.match;
    const goal = m && g.screen === 'match' && g.state === 'goal' && g.goalTeam >= 0;
    const T = goal ? m.teams[g.goalTeam] : null;
    const cycle = 5200;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const first = -30 - Math.ceil(Math.max(0, -30 - this.view.x0) / bw) * bw;
    for (let bx = first, i = 0; bx < this.view.x1; bx += bw, i++) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx, y, bw - 3, h);
      ctx.clip();
      if (goal) {
        const on = (Math.floor(now / 150) + i) % 2 === 0;
        ctx.fillStyle = on ? T.color : '#0b1220';
        ctx.fillRect(bx, y, bw, h);
        ctx.fillStyle = on ? '#ffffff' : T.light;
        ctx.font = `30px ${FONT_D}`;
        ctx.fillText('GÓÓÓL', bx + bw / 2, y + h / 2 + 2);
      } else {
        const tt = now + i * 140;
        const idx = Math.floor(tt / cycle), t = tt % cycle;
        const roll = t < 380 ? easeInOutQuad(t / 380) : 1;
        // každá druhá tabule patří sponzorům
        const list = i % 2 === 0 ? SPONSORS : ADS;
        const k = i % 2 === 0 ? i / 2 : (i - 1) / 2;
        const cur = list[(k + idx) % list.length], prev = list[(k + idx - 1 + list.length * 9) % list.length];
        ctx.font = `800 22px ${FONT_U}`;
        if (roll < 1) {
          this.boardAd(ctx, prev, bx, y - roll * h, bw, h);
          this.boardAd(ctx, cur, bx, y + (1 - roll) * h, bw, h);
        } else {
          this.boardAd(ctx, cur, bx, y, bw, h);
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,.13)';
      ctx.fillRect(bx, y, bw, 6);
      ctx.fillStyle = 'rgba(0,0,0,.16)';
      for (let j = y + 1; j < y + h; j += 3) ctx.fillRect(bx, j, bw, 1);
      ctx.restore();
    }
  },

  boardAd(ctx, a, x, y, w, h) {
    ctx.fillStyle = a.bg;
    ctx.fillRect(x, y, w, h);
    if (a.icon) {
      // sponzor: větší písmo a ikonka
      ctx.save();
      ctx.font = `25px ${FONT_D}`;
      const tw = ctx.measureText(a.t).width, iw = 24, total = tw + iw + 8;
      const x0 = x + w / 2 - total / 2;
      this.sponsorIcon(ctx, a.icon, x0 + iw / 2, y + h / 2, 11);
      ctx.fillStyle = a.fg;
      ctx.textAlign = 'left';
      ctx.fillText(a.t, x0 + iw + 8, y + h / 2 + 2);
      ctx.restore();
      return;
    }
    ctx.fillStyle = a.fg;
    ctx.fillText(a.t, x + w / 2, y + h / 2 + 1);
  },

  // Ikonka sponzora: chilli paprička nebo hvězda.
  sponsorIcon(ctx, kind, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    if (kind === 'chili') {
      ctx.rotate(-0.5);
      ctx.fillStyle = '#e8261c';
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.55);
      ctx.quadraticCurveTo(r * 0.9, -r * 0.6, r * 0.55, r * 0.35);
      ctx.quadraticCurveTo(r * 0.2, r * 1.1, -r * 0.9, r * 1.05);
      ctx.quadraticCurveTo(-r * 0.1, r * 0.55, -r * 0.45, -r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.beginPath();
      ctx.ellipse(r * 0.15, -r * 0.2, r * 0.25, r * 0.1, -0.4, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#3fae3a';
      ctx.lineWidth = r * 0.28;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, -r * 0.5);
      ctx.quadraticCurveTo(-r * 0.2, -r * 1.0, r * 0.25, -r * 1.1);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffd23f';
      star(ctx, 0, 0, r, r * 0.45);
      ctx.fill();
    }
    ctx.restore();
  },

  // Míč v síti ji rozvlní.
  netHit(side, y, amp) {
    const n = this.nets[side];
    n.t = performance.now();
    n.amp = clamp(amp, 0, 14);
    n.y = y;
  },

  drawNet(ctx, side, now) {
    const x0 = side === 0 ? 0 : W - GOAL_W, x1 = x0 + GOAL_W;
    const top = BAR_Y + BAR_T, bot = GROUND_Y;
    const n = this.nets[side], age = (now - n.t) / 1000;
    const A = n.amp * Math.exp(-age * 2.6);
    ctx.fillStyle = 'rgba(6,12,24,.42)';
    ctx.fillRect(x0, top, GOAL_W, bot - top);
    const back = side === 0 ? -1 : 1;
    const off = (px, py) => {
      if (A < 0.05) return 0;
      const f = Math.exp(-((py - n.y) ** 2) / 4500) * Math.exp(-(((side === 0 ? px - x0 : x1 - px)) ** 2) / 9000);
      return Math.sin(age * 24 - Math.abs(py - n.y) * 0.07) * A * f;
    };
    ctx.strokeStyle = 'rgba(235,242,250,.42)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let gx = x0 + 6; gx < x1; gx += 11) {
      ctx.moveTo(gx, top);
      for (let gy = top + 8; gy <= bot; gy += 8) ctx.lineTo(gx + off(gx, gy) * back, gy + off(gx, gy) * 0.3);
    }
    for (let gy = top + 6; gy < bot; gy += 11) {
      ctx.moveTo(x0, gy);
      for (let gx = x0 + 8; gx <= x1; gx += 8) ctx.lineTo(gx + off(gx, gy) * back, gy + off(gx, gy) * 0.3);
    }
    ctx.stroke();
    ctx.fillStyle = '#c3ccd8';
    ctx.fillRect(side === 0 ? 1 : W - 7, BAR_Y, 6, bot - BAR_Y);
  },

  drawVignette(ctx) {
    const v = this.view, vw = v.x1 - v.x0, vh = v.y1 - v.y0;
    if (!this.vig) {
      const cx = (v.x0 + v.x1) / 2, cy = v.y0 + vh * 0.58;
      const g = ctx.createRadialGradient(cx, cy, vh * 0.38, cx, cy, Math.max(vw, vh) * 0.62);
      g.addColorStop(0, 'rgba(0,0,10,0)');
      g.addColorStop(1, 'rgba(0,0,10,.36)');
      this.vig = g;
    }
    ctx.fillStyle = this.vig;
    ctx.fillRect(v.x0, v.y0, vw, vh);
  },

  drawBars(ctx, k) {
    const v = this.view, bh = 74 * easeInOutQuad(clamp(k, 0, 1));
    ctx.fillStyle = '#000000';
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, bh);
    ctx.fillRect(v.x0, v.y1 - bh, v.x1 - v.x0, bh);
  },

  // Postavička mimo hřiště (plakáty, obrazovka).
  drawFigure(ctx, look, T, x, y, sc, dir, mood, lookAt) {
    let f = this.figs.get(look.id);
    if (!f) {
      f = new Player({ team: 0, x: 0, look, role: 'attacker', ctrl: 'cpu' });
      this.figs.set(look.id, f);
    }
    f.x = 0;
    f.y = 0;
    f.dir = dir;
    f.mood = mood || 0;
    f.kickT = -1;
    f.onGround = true;
    f.vx = 0;
    f.vy = 0;
    f.blink = 0;
    ctx.save();
    ctx.translate(x, y);
    // drawPlayer kreslí o PS větší, tady chceme přesně měřítko sc
    const k = sc / PS;
    ctx.scale(k, k);
    const la = lookAt ? { x: (lookAt.x - x) / k, y: (lookAt.y - y) / k } : { x: dir * 300, y: -20 };
    this.drawPlayer(ctx, f, la, [T], performance.now());
    ctx.restore();
  },

  // Úvod zápasu: plakáty týmů a VS.
  drawIntro(ctx, g, now) {
    const t = g.stateT, m = g.match;
    const a = clamp((t - 1.0) / 0.45, 0, 1), out = clamp((t - (POSTER_END - 0.55)) / 0.4, 0, 1);
    if (a <= 0 || out >= 1) return;
    const slide = (1 - easeOutBack(a)) + out * 1.3;
    const by = 200, bh = 210;
    for (let side = 0; side < 2; side++) {
      const T = m.teams[side];
      const dir = side === 0 ? -1 : 1;
      ctx.save();
      ctx.translate(dir * slide * W * 0.6, 0);
      ctx.beginPath();
      const L0 = Math.min(-20, this.view.x0 - 20), R0 = Math.max(W + 20, this.view.x1 + 20);
      if (side === 0) {
        ctx.moveTo(L0, by);
        ctx.lineTo(W / 2 + 6, by);
        ctx.lineTo(W / 2 - 54, by + bh);
        ctx.lineTo(L0, by + bh);
      } else {
        ctx.moveTo(W / 2 + 54, by);
        ctx.lineTo(R0, by);
        ctx.lineTo(R0, by + bh);
        ctx.lineTo(W / 2 - 6, by + bh);
      }
      ctx.closePath();
      const gr = ctx.createLinearGradient(0, by, 0, by + bh);
      gr.addColorStop(0, T.color);
      gr.addColorStop(1, T.dark);
      ctx.fillStyle = gr;
      ctx.fill();
      ctx.save();
      ctx.clip();
      // pruhy v pozadí
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      for (let k = -8; k < 18; k++) {
        const sx = (side === 0 ? this.view.x0 : W / 2) + k * 70 + ((now * 0.03) % 70);
        ctx.beginPath();
        ctx.moveTo(sx, by);
        ctx.lineTo(sx + 30, by);
        ctx.lineTo(sx - 30, by + bh);
        ctx.lineTo(sx - 60, by + bh);
        ctx.fill();
      }
      const ps = m.players.filter((p) => p.team === side);
      ps.forEach((p, k) => {
        const fx = side === 0 ? 92 + k * 135 : W - 92 - k * 135;
        this.drawFigure(ctx, p.look, T, fx, by + 112, 1.25, side === 0 ? 1 : -1, 0, { x: W / 2, y: by + 70 });
      });
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 3;
      ctx.stroke();
      // jméno týmu
      ctx.textBaseline = 'middle';
      ctx.textAlign = side === 0 ? 'right' : 'left';
      const nx = side === 0 ? W / 2 - 70 : W / 2 + 70;
      this.fitText(ctx, T.name, 250, 40, FONT_D, '');
      ctx.lineJoin = 'round';
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.strokeText(T.name, nx, by + bh - 32);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(T.name, nx, by + bh - 32);
      ctx.restore();
    }
    const v = easeOutBack(clamp((t - 1.35) / 0.4, 0, 1)) * (1 - out);
    if (v > 0) {
      ctx.save();
      ctx.translate(W / 2, by + bh / 2);
      ctx.scale(v, v);
      ctx.rotate(-0.08);
      ctx.fillStyle = '#0b1220';
      circle(ctx, 0, 0, 62);
      ctx.fill();
      ctx.strokeStyle = '#ffc93c';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.font = `68px ${FONT_D}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffc93c';
      ctx.fillText('VS', 0, 4);
      ctx.restore();
    }
    // nadpis
    const ta = clamp((t - 0.3) / 0.4, 0, 1) * (1 - out);
    if (ta > 0) {
      ctx.save();
      ctx.globalAlpha = ta;
      ctx.font = `800 26px ${FONT_U}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = g.setup && g.setup.label ? g.setup.label : g.setup && g.setup.stage ? `TURNAJ · ${g.setup.stage}` : `${g.setup ? (g.setup.format === '2v2' ? '2 V 2' : '1 V 1') : ''} · ZÁPAS ZAČÍNÁ`;
      const w = ctx.measureText(label).width + 40;
      ctx.fillStyle = 'rgba(8,13,26,.8)';
      rrect(ctx, W / 2 - w / 2, 130, w, 40, 20);
      ctx.fill();
      ctx.fillStyle = '#ffc93c';
      ctx.fillText(label, W / 2, 151);
      ctx.restore();
    }
  },

  // Předzápasové hecování: hráč pronese hlášku v bublině.
  drawIntroTalk(ctx, g, now) {
    const talk = g.introTalk, m = g.match, t = g.stateT;
    if (!talk) return;
    for (const k of talk) {
      const u = t - k.at;
      if (u < 0 || u > TALK_DUR) continue;
      const p = m.players[k.idx];
      if (!p) continue;
      const T = m.teams[p.team];
      const sc = u < 0.2 ? easeOutBack(u / 0.2) : 1;
      const a = u > TALK_DUR - 0.15 ? (TALK_DUR - u) / 0.15 : 1;
      ctx.save();
      ctx.globalAlpha = clamp(a, 0, 1);
      const x = p.x + p.dir * 18, y = p.y - p.R - 8;
      ctx.translate(x, y);
      ctx.scale(sc, sc);
      drawSpeech(ctx, k.text, 0, 0, T.color, 24, p.dir);
      ctx.restore();
    }
  },

  // Ukazatel superstřely pro hru na klávesnici (vlevo dole).
  drawSuperMeter(ctx, c, col, now, power) {
    const name = ((POWERS[power] || POWERS.shot).short).toUpperCase();
    ctx.font = `800 20px ${FONT_U}`;
    const tw = ctx.measureText(name + '  E').width;
    const v = this.view, x = v.x0 + 28, y = v.y1 - 70, bx = 14 + tw + 14, w = bx + 130, h = 44;
    const full = c >= 1;
    ctx.save();
    ctx.fillStyle = 'rgba(8,13,26,.78)';
    rrect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = full ? col : 'rgba(255,255,255,.16)';
    ctx.lineWidth = full ? 3 : 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    rrect(ctx, x + bx, y + 14, w - bx - 12, 16, 8);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.globalAlpha = full ? 0.75 + Math.sin(now * 0.012) * 0.25 : 0.85;
    rrect(ctx, x + bx, y + 14, (w - bx - 12) * clamp(c, 0, 1), 16, 8);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = `800 20px ${FONT_U}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = full ? '#ffffff' : 'rgba(255,255,255,.7)';
    ctx.fillText(full ? name + '  E' : name, x + 14, y + h / 2 + 1);
    ctx.restore();
  },

  drawReplayLabel(ctx, now) {
    const v = this.view;
    ctx.save();
    ctx.translate(v.x0, v.y0);
    ctx.font = `800 28px ${FONT_U}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (Math.floor(now / 500) % 2 === 0) {
      ctx.fillStyle = '#ff3b3b';
      circle(ctx, 44, 37, 9);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ZÁZNAM GÓLU', 64, 38);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = `800 22px ${FONT_U}`;
    ctx.fillText('ZPOMALENĚ', 36, v.y1 - v.y0 - 37);
    ctx.restore();
  },

  // Pohár nad vítězi.
  drawTrophy(ctx, g, now) {
    const t = g.stateT;
    if (t < 1.6) return;
    const m = g.match;
    const win = Math.max(0, m.winner());
    const ps = m.players.filter((p) => p.team === win);
    if (!ps.length) return;
    const cx = ps.reduce((a, p) => a + p.x, 0) / ps.length;
    const rise = easeOutBack(clamp((t - 1.6) / 0.9, 0, 1));
    const cy = lerp(380, 318, rise) + Math.sin(now * 0.004) * 4;
    if (rise <= 0.01) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(rise, rise);
    const glow = ctx.createRadialGradient(0, -6, 4, 0, -6, 120);
    glow.addColorStop(0, 'rgba(255,215,90,.55)');
    glow.addColorStop(1, 'rgba(255,215,90,0)');
    ctx.fillStyle = glow;
    circle(ctx, 0, -6, 120);
    ctx.fill();
    ctx.save();
    ctx.rotate(now * 0.0006);
    ctx.fillStyle = 'rgba(255,225,130,.14)';
    for (let i = 0; i < 12; i++) {
      ctx.rotate(TAU / 12);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(120, -12);
      ctx.lineTo(120, 12);
      ctx.fill();
    }
    ctx.restore();
    const gold = ctx.createLinearGradient(-32, 0, 32, 0);
    gold.addColorStop(0, '#9a6200');
    gold.addColorStop(0.35, '#ffd34d');
    gold.addColorStop(0.55, '#fff3b0');
    gold.addColorStop(0.75, '#e2a624');
    gold.addColorStop(1, '#8a5400');
    ctx.strokeStyle = '#6b4300';
    // ucha
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#6b4300';
    ctx.beginPath();
    ctx.arc(-30, -22, 14, Math.PI * 0.5, Math.PI * 1.5);
    ctx.moveTo(30, -36);
    ctx.arc(30, -22, 14, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = '#f2c23c';
    ctx.stroke();
    // kalich
    ctx.beginPath();
    ctx.moveTo(-32, -42);
    ctx.lineTo(32, -42);
    ctx.quadraticCurveTo(32, 8, 0, 18);
    ctx.quadraticCurveTo(-32, 8, -32, -42);
    ctx.closePath();
    ctx.fillStyle = gold;
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#6b4300';
    ctx.stroke();
    ctx.fillStyle = '#fff3b0';
    oval(ctx, 0, -42, 32, 5);
    ctx.fill();
    ctx.stroke();
    // noha a podstavec
    ctx.fillStyle = gold;
    ctx.fillRect(-5, 16, 10, 16);
    ctx.strokeRect(-5, 16, 10, 16);
    oval(ctx, 0, 24, 10, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3a2416';
    rrect(ctx, -26, 32, 52, 14, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd34d';
    rrect(ctx, -14, 35.5, 28, 7, 2);
    ctx.fill();
    // hvězda a lesk
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    star(ctx, 0, -16, 9, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-6, -20, 20, Math.PI * 0.75, Math.PI * 1.05);
    ctx.stroke();
    ctx.restore();
    // jiskry
    for (let i = 0; i < 7; i++) {
      const ang = i * 0.9 + now * 0.0012;
      const r = 70 + Math.sin(now * 0.003 + i) * 14;
      const tw = (Math.sin(now * 0.008 + i * 2) + 1) / 2;
      ctx.fillStyle = `rgba(255,248,210,${0.4 + tw * 0.6})`;
      star(ctx, cx + Math.cos(ang) * r, cy - 6 + Math.sin(ang) * r * 0.7, 3 + tw * 4, 1.2);
      ctx.fill();
    }
  },

  drawShadow(ctx, x, h, w) {
    const k = clamp(1 - h / 320, 0.3, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.32 * k})`;
    oval(ctx, x, GROUND_Y + 2, w * k, w * 0.2 * k);
    ctx.fill();
  },

  drawGoalFront(ctx, side) {
    const x0 = side === 0 ? 0 : W - GOAL_W - 3;
    const fx = side === 0 ? GOAL_W - 3 : W - GOAL_W - 3;
    ctx.fillStyle = '#f4f6f9';
    ctx.fillRect(fx, BAR_Y, 6, GROUND_Y - BAR_Y + 3);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(side === 0 ? fx + 4 : fx, BAR_Y, 2, GROUND_Y - BAR_Y + 3);
    ctx.fillStyle = '#f4f6f9';
    rrect(ctx, x0, BAR_Y, GOAL_W + 3, BAR_T, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.fillRect(x0 + 2, BAR_Y + BAR_T - 4, GOAL_W - 1, 3);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fillRect(x0 + 2, BAR_Y + 2, GOAL_W - 1, 2);
  },

  /* ---- hráč ---- */

  drawPlayer(ctx, p, ball, teams, now) {
    // JENDA PRIME: zlatá záře a bílý dres
    if (p.primeT > 0 && !p._primeDraw) {
      this.drawPrimeAura(ctx, p, now);
      const kit = p.team === 0 ? [PRIME_KIT, teams[1]] : [teams[0], PRIME_KIT];
      p._primeDraw = true;
      try {
        this.drawPlayer(ctx, p, ball, kit, now);
      } finally {
        p._primeDraw = false;
      }
      return;
    }
    // skin Moncler-Jenda (odměna z příběhu): bílá bunda místo dresu
    // Durcado byznysman: tmavý oblek (kresba trupu přidá košili a kravatu)
    if (p.suitT > 0 && !p._primeDraw && !p._goldDraw) {
      const kit = p.team === 0 ? [SUIT_KIT, teams[1]] : [teams[0], SUIT_KIT];
      p._goldDraw = true;
      try {
        this.drawPlayer(ctx, p, ball, kit, now);
      } finally {
        p._goldDraw = false;
      }
      return;
    }
    const sk = SKINS[p.skin];
    if (sk && sk.kit && !p._primeDraw && !p._goldDraw) {
      const kit = p.team === 0 ? [sk.kit, teams[1]] : [teams[0], sk.kit];
      p._goldDraw = true;
      try {
        this.drawPlayer(ctx, p, ball, kit, now);
      } finally {
        p._goldDraw = false;
      }
      return;
    }
    // při oslavě se hráč může otočit k vlastním fanouškům
    if (p.face && p.face !== p.dir) {
      const d = p.dir;
      p.dir = p.face;
      try {
        this.drawPlayerBody(ctx, p, ball, teams, now);
      } finally {
        p.dir = d;
      }
      return;
    }
    this.drawPlayerBody(ctx, p, ball, teams, now);
  },

  drawPlayerBody(ctx, p, ball, teams, now) {
    // Obří páv: nakreslit v základní velikosti a celé zvětšit kolem hlavy
    const gk = p.growK || 1;
    if (gk !== 1 && !p._growDraw) {
      const R0 = p.R, F0 = p.F;
      p.R = R0 / gk;
      p.F = F0 / gk;
      p._growDraw = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(gk, gk);
      ctx.translate(-p.x, -p.y);
      try {
        this.drawPlayerBody(ctx, p, ball, teams, now);
      } finally {
        ctx.restore();
        p.R = R0;
        p.F = F0;
        p._growDraw = false;
      }
      return;
    }
    // kresba je v základních rozměrech, na hřišti se zvětší o PS
    const T = teams[p.team], L = p.look, R = p.R / PS, F = p.F / PS;
    const kicking = p.kickT >= 0;
    const s = p.kickS();
    const air = !p.onGround;
    const run = air ? 0 : Math.min(1, Math.abs(p.vx) / 260);
    const ph = p.runPhase;
    const footY = R + F - 7;
    let bx, by, fx, fy;
    const surf = (p.lift || 0) > 1 && !air;
    if (surf) {
      // surfařský postoj na sushi: nohy rozkročené, lehce pokrčené
      const k = Math.sin(now * 0.006) * 1.5;
      bx = -15; by = footY - 1 + k; fx = 15; fy = footY - 1 - k;
    } else if (air) {
      bx = -10; by = footY - 12; fx = 12; fy = footY - 16;
    } else {
      bx = -6 + Math.sin(ph) * 10 * run;
      by = footY - Math.max(0, Math.cos(ph)) * 7 * run;
      fx = 7 - Math.sin(ph) * 10 * run;
      fy = footY - Math.max(0, -Math.cos(ph)) * 7 * run;
    }
    if (kicking) {
      const f = p.footAt(s, this._f);
      fx = ((f.x - p.x) * p.dir) / PS;
      fy = (f.y - p.y) / PS + 5;
    }
    // skluz po kolenou: kolena na zemi, bérce dozadu
    const kn = p.kneel || 0;
    if (kn > 0) {
      bx = lerp(bx, -30, kn);
      by = lerp(by, footY - 4, kn);
      fx = lerp(fx, -18, kn);
      fy = lerp(fy, footY - 2, kn);
    }
    // úhel ruky od svislice: kladný dopředu, ±π nahoru
    let aBack, aFront;
    if (p.shootT > 0) {
      // basketbalový hod: obě ruce nahoru
      aBack = -2.75;
      aFront = 2.95;
    } else if (kn > 0.3) {
      // ruce rozpažené nahoru do stran (ne přes obličej)
      const w = Math.sin(now * 0.012) * 0.12;
      aBack = -2.0 - w;
      aFront = 1.7 + w;
    } else if (p.plane > 0.3) {
      // letadlo: ruce rozpažené
      aBack = -1.62;
      aFront = 1.58;
    } else if (p.mood > 0) {
      // radost: mávání do stran (nahoru by ruce zakryly obličej)
      const w = Math.sin(now * 0.016 + p.homeX) * 0.4;
      aBack = -1.75 - w;
      aFront = 1.75 + w;
    } else if (p.mood < 0) {
      aBack = -0.05;
      aFront = 0.08;
    } else if (air) {
      aBack = -1.4;
      aFront = 1.5;
    } else if (kicking) {
      aBack = -0.9;
      aFront = 0.9;
    } else {
      aBack = 0.12 - Math.sin(ph) * 0.8 * run;
      aFront = 0.12 + Math.sin(ph) * 0.8 * run;
    }

    // na sushi: ruce rozpažené, vyvažují náklon
    if (surf && !kicking) {
      const w = Math.sin(now * 0.005) * 0.35;
      aBack = -1.65 + w;
      aFront = 1.65 + w;
    }
    // Suli vyhrnuje triko: obě ruce nahoru ke krku
    if (p.selfieT > 0) {
      aBack = -2.3;
      aFront = 2.3;
    }
    if (p.pengT > 0) {
      this.drawPenguin(ctx, p, T, now, R, F);
      return;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.spin) {
      // odstřelený hráč se točí kolem středu těla
      const c = (p.R + p.F) * 0.5;
      ctx.translate(0, c);
      ctx.rotate(p.spin);
      ctx.translate(0, -c);
    }
    if (kn > 0) ctx.translate(0, F * 0.36 * kn * PS);
    // balancování na sushi (kymácí se kolem chodidel)
    // jedno plynulé houpání (pomalé, ať to necuká) + mírný náklon dopředu do jízdy
    const lean = (p.lean || 0) + ((p.lift || 0) > 1 ? (Math.sin(now * 0.005) * 0.1 + 0.08) * Math.min(1, p.lift / SUSHI_H) : 0);
    if (lean) {
      // protahování: náklon kolem chodidel
      const c = p.R + p.F;
      ctx.translate(0, c);
      ctx.rotate(lean);
      ctx.translate(0, -c);
    }
    if (p.plane > 0) ctx.rotate(Math.sin(now * 0.008 + p.homeX) * 0.16 * p.plane);
    ctx.scale(p.dir * PS, PS);
    if (kn > 0) {
      // trup se při skluzu zaklání
      ctx.translate(0, R + 18);
      ctx.rotate(-0.22 * kn);
      ctx.translate(0, -(R + 18));
    }
    // Moncler-Jenda: péřová bunda, brýle, řetěz (při JENDA PRIME bílý dres Realu)
    this._drip = p.skin === 'moncler' && !(p.primeT > 0);
    this._beach = p.skin === 'bikini' && !(p.primeT > 0);
    this._hoop = p.skin === 'michael' && !(p.primeT > 0);
    this._suit = p.suitT > 0 && !(p.primeT > 0);
    this._dress = !!L.dress && !(p.primeT > 0); // holky v klubu: minišaty a podpatky
    const ch = (L.chub || 1) * (p.growT > 0 ? 1.15 : 1); // Tlustej páv je širší (a při Obřím pávovi ještě víc)
    this.drawHair(ctx, p, T, 'back', now);
    this.drawArm(ctx, -12 * ch, R + 1, aBack, T, L, true);
    this.drawLeg(ctx, -6 * ch, R + 18, bx - (ch - 1) * 8, by, T, L, 0, true);
    this.drawLeg(ctx, 5 * ch, R + 18, fx + (ch - 1) * 6, fy, T, L, kicking ? -s * 0.9 : 0, false);
    this.drawTorso(ctx, p, T, L);
    this.drawHead(ctx, p, ball, T, now);
    if (this._drip) this.drawShades(ctx, p);
    else if (this._beach) this.drawShades(ctx, p, true);
    if (p.gear) this.drawGear(ctx, p, R, now);
    this.drawArm(ctx, 10 * ch, R + 1, aFront, T, L, false);
    if (this._dress && L.topless) this.drawCensor(ctx, R, L);
    this._drip = false;
    this._beach = false;
    this._hoop = false;
    this._suit = false;
    this._dress = false;
    ctx.restore();
  },

  // Bémič jako tučňák (jen vzhled): velká černá hlava s bílým obličejem, zobák, šála v barvě týmu.
  drawPenguin(ctx, p, T, now, R, F) {
    const run = p.onGround ? Math.min(1, Math.abs(p.vx) / 260) : 0;
    const ph = p.runPhase, waddle = Math.sin(ph) * 0.12 * run;
    const flap = p.onGround ? Math.sin(now * 0.02) * 0.25 * run : 0.9 + Math.sin(now * 0.05) * 0.4;
    const ink = '#15171d', belly = '#f4f6f8', beak = '#ff9a1f';
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.spin) {
      const c = (p.R + p.F) * 0.5;
      ctx.translate(0, c);
      ctx.rotate(p.spin);
      ctx.translate(0, -c);
    }
    ctx.scale(p.dir * PS, PS);
    ctx.translate(0, R + F);
    ctx.rotate(waddle);
    ctx.translate(0, -(R + F));
    ctx.lineJoin = 'round';
    // nohy
    ctx.fillStyle = beak;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    for (const [fx, lift] of [[-10, Math.max(0, Math.sin(ph)) * 5 * run], [9, Math.max(0, -Math.sin(ph)) * 5 * run]]) {
      oval(ctx, fx + 4, R + F - 4 - lift, 11, 4.5);
      ctx.fill();
      ctx.stroke();
    }
    // tělo
    ctx.fillStyle = ink;
    oval(ctx, 0, R + F * 0.45, 25, F * 0.62);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = belly;
    oval(ctx, 6, R + F * 0.5, 16, F * 0.5);
    ctx.fill();
    // křídla
    ctx.fillStyle = ink;
    for (const [sx, a] of [[-18, -0.35 - flap], [16, 0.35 + flap]]) {
      ctx.save();
      ctx.translate(sx, R + 6);
      ctx.rotate(a);
      oval(ctx, 0, 14, 6.5, 17);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // hlava
    ctx.fillStyle = ink;
    circle(ctx, 0, 0, R);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();
    const g = ctx.createRadialGradient(10, -14, 3, 0, 0, R);
    g.addColorStop(0, 'rgba(255,255,255,.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    circle(ctx, 0, 0, R);
    ctx.fill();
    // bílý obličej
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(14, 4, 22, 25, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(-6, -40);
    ctx.quadraticCurveTo(18, -26, 16, -12);
    ctx.quadraticCurveTo(18, -26, 40, -14);
    ctx.lineTo(40, -44);
    ctx.closePath();
    ctx.fill();
    // oči
    for (const [ex, er] of [[8, 5.5], [25, 6.2]]) {
      ctx.fillStyle = '#ffffff';
      circle(ctx, ex, -6, er);
      ctx.fill();
      ctx.fillStyle = '#15110e';
      circle(ctx, ex + 1.5, -5.5, er * 0.55);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      circle(ctx, ex + 2.6, -7, er * 0.2);
      ctx.fill();
    }
    // zobák
    ctx.fillStyle = beak;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 4);
    ctx.quadraticCurveTo(52, 8, 56, 14);
    ctx.quadraticCurveTo(46, 18, 30, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // šála v barvě týmu
    ctx.fillStyle = T.color;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    rrect(ctx, -24, R - 8, 50, 11, 5);
    ctx.fill();
    ctx.stroke();
    rrect(ctx, -22, R - 2, 10, 22, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = T.light;
    ctx.fillRect(-21, R + 10, 8, 3);
    ctx.restore();
  },

  // JENDA PRIME: zlatá záře kolem hráče a jiskry.
  drawPrimeAura(ctx, p, now) {
    const cx = p.x, cy = p.y + (p.R + p.F) * 0.35, r = (p.R + p.F) * 0.85;
    const pulse = 1 + Math.sin(now * 0.012) * 0.06;
    const fade = Math.min(1, p.primeT / 0.4);
    ctx.save();
    ctx.globalAlpha = fade;
    const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * pulse);
    g.addColorStop(0, 'rgba(255,230,140,.55)');
    g.addColorStop(0.6, 'rgba(255,200,60,.22)');
    g.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = g;
    circle(ctx, cx, cy, r * pulse);
    ctx.fill();
    ctx.fillStyle = '#fff3b0';
    for (let i = 0; i < 5; i++) {
      const a = now * 0.003 + (i * TAU) / 5, k = (now * 0.0015 + i * 0.2) % 1;
      const x = cx + Math.cos(a) * r * 0.75, y = cy - k * r * 1.2 + r * 0.4;
      star(ctx, x, y, 6 * Math.sin(k * Math.PI) + 1, 2);
      ctx.fill();
    }
    // nápis nad hlavou
    ctx.font = `20px ${FONT_D}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#1d2b5c';
    const ty = p.y - p.R - (p.label ? 60 : 30);
    ctx.strokeText('JENDA PRIME', cx, ty);
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('JENDA PRIME', cx, ty);
    ctx.restore();
  },

  // VO2max: rychlostní čáry za hráčem.
  drawBoost(ctx, p, now) {
    const col = hexRgb(superColor(p.look.id));
    const back = -Math.sign(p.vx || p.dir);
    const len = 40 + Math.min(1, Math.abs(p.vx) / 500) * 90;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const y = p.y - p.R * 0.6 + i * (p.R + p.F) * 0.33;
      const off = ((now * 0.6 + i * 37) % 30);
      ctx.strokeStyle = `rgba(${col},${0.55 - i * 0.06})`;
      ctx.lineWidth = 5 - i * 0.5;
      line(ctx, p.x + back * (p.R * 0.8 + off), y, p.x + back * (p.R * 0.8 + off + len), y);
    }
  },

  // Zablokované brány: obří hermelín nebo ledový kráter.
  drawBlocks(ctx, m, now) {
    for (let t = 0; t < 2; t++) {
      const left = m.blocks[t];
      if (left <= 0) continue;
      const age = BLOCK_TIME - left;
      const outK = left < 0.25 ? left / 0.25 : 1;
      if (m.blockKind[t] === 'ice') this.drawIce(ctx, t, age, outK, now);
      else this.drawCheese(ctx, t, age, outK, now);
    }
  },

  drawCheese(ctx, t, age, outK, now) {
    const R = 112;
    const cx = t === 0 ? GOAL_W * 0.5 + 4 : W - GOAL_W * 0.5 - 4;
    const fall = clamp(age / 0.5, 0, 1);
    const cy = GROUND_Y - R + 2 - (1 - easeOutBounce(fall)) * 520;
    const s = t === 0 ? 1 : -1; // hrana sýra je vidět na straně od hřiště
    ctx.save();
    // stín
    ctx.fillStyle = `rgba(0,0,0,${0.3 * fall})`;
    oval(ctx, cx, GROUND_Y + 3, R * 0.95 * (0.4 + 0.6 * fall), 13);
    ctx.fill();
    ctx.translate(cx, cy + R);
    ctx.scale(outK, outK);
    ctx.translate(0, -R);
    ctx.globalAlpha = 0.35 + 0.65 * outK;
    // hrana (tloušťka bochníku)
    ctx.fillStyle = '#e8dcc0';
    ctx.strokeStyle = 'rgba(80,60,30,.7)';
    ctx.lineWidth = 4;
    circle(ctx, -s * 16, -4, R);
    ctx.fill();
    ctx.stroke();
    // přední strana s bílou plísní
    const g = ctx.createRadialGradient(-30, -40, 10, 0, 0, R);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.7, '#f6f1e4');
    g.addColorStop(1, '#e6dcc4');
    ctx.fillStyle = g;
    circle(ctx, 0, 0, R);
    ctx.fill();
    // skvrnky a chlupatá kůrka
    ctx.save();
    circle(ctx, 0, 0, R);
    ctx.clip();
    const rng = mulberry32(67);
    for (let i = 0; i < 70; i++) {
      const a = rng() * TAU, d = Math.sqrt(rng()) * R;
      ctx.fillStyle = `rgba(${190 + rng() * 30},${170 + rng() * 30},${120 + rng() * 40},${0.12 + rng() * 0.2})`;
      oval(ctx, Math.cos(a) * d, Math.sin(a) * d, 3 + rng() * 9, 2 + rng() * 6, rng() * 3);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (let i = 0; i < 160; i++) {
      const a = rng() * TAU, d = Math.sqrt(rng()) * R;
      ctx.fillRect(Math.cos(a) * d, Math.sin(a) * d, 1.6, 1.6);
    }
    // ukrojený dílek: krémový vnitřek
    const a0 = -Math.PI * 0.42, a1 = -Math.PI * 0.12;
    const ax = (a) => (s > 0 ? a : Math.PI - a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R + 2, ax(a0), ax(a1), s < 0);
    ctx.closePath();
    const gi = ctx.createRadialGradient(0, 0, 4, 0, 0, R);
    gi.addColorStop(0, '#fff6cf');
    gi.addColorStop(0.85, '#f5e1a0');
    gi.addColorStop(1, '#efd382');
    ctx.fillStyle = gi;
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,110,40,.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // tenká bílá kůrka na řezu
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, R - 3, ax(a0), ax(a1), s < 0);
    ctx.stroke();
    ctx.restore();
    // vytékající sýr
    const dx = Math.cos(ax(a1)) * R * 0.55, dy = Math.sin(ax(a1)) * R * 0.55;
    ctx.fillStyle = '#f7e6a8';
    ctx.beginPath();
    ctx.ellipse(dx, dy + 8 + Math.sin(now * 0.004) * 1.5, 9, 14, 0, 0, TAU);
    ctx.fill();
    // obrys
    ctx.strokeStyle = 'rgba(80,60,30,.75)';
    ctx.lineWidth = 4;
    circle(ctx, 0, 0, R);
    ctx.stroke();
    // nápis HERMELÍN na stuze
    ctx.save();
    ctx.rotate(-0.08 * s);
    const bw = 196, bh = 40;
    ctx.fillStyle = '#c8102e';
    ctx.strokeStyle = '#7a0a1c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-bw / 2 - 14, 14);
    ctx.lineTo(-bw / 2, 14 + bh / 2);
    ctx.lineTo(-bw / 2 - 14, 14 + bh);
    ctx.lineTo(bw / 2 + 14, 14 + bh);
    ctx.lineTo(bw / 2, 14 + bh / 2);
    ctx.lineTo(bw / 2 + 14, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.font = `30px ${FONT_D}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('HERMELÍN', 0, 15 + bh / 2);
    ctx.restore();
    ctx.restore();
  },

  drawIce(ctx, t, age, outK, now) {
    const gx0 = t === 0 ? 0 : W - GOAL_W, cx = t === 0 ? GOAL_W * 0.5 : W - GOAL_W * 0.5;
    const s = t === 0 ? 1 : -1;
    const grow = easeOutBack(clamp(age / 0.35, 0, 1));
    ctx.save();
    ctx.globalAlpha = outK;
    // zamrzlý trávník kolem brány
    const gg = ctx.createRadialGradient(cx + s * 40, GROUND_Y + 4, 10, cx + s * 40, GROUND_Y + 4, 230);
    gg.addColorStop(0, 'rgba(225,248,255,.85)');
    gg.addColorStop(1, 'rgba(225,248,255,0)');
    ctx.fillStyle = gg;
    oval(ctx, cx + s * 40, GROUND_Y + 6, 230 * clamp(age / 0.4, 0, 1), 26);
    ctx.fill();
    // ledové krystaly vyrostou ze země
    ctx.translate(0, GROUND_Y);
    ctx.scale(1, grow * outK + (1 - outK) * 0.2);
    ctx.translate(0, -GROUND_Y);
    const shards = [
      [0.02, 0.62, 0.2], [0.12, 0.95, 0.18], [0.26, 1.12, 0.17], [0.42, 1.04, 0.19], [0.58, 1.18, 0.16],
      [0.72, 0.9, 0.18], [0.86, 1.02, 0.15], [1.0, 0.7, 0.16], [1.13, 0.46, 0.15], [1.24, 0.28, 0.12],
    ];
    for (let i = 0; i < shards.length; i++) {
      const [u, hk, wk] = shards[i];
      const bx = t === 0 ? gx0 + u * GOAL_W : W - u * GOAL_W;
      const h = GOAL_H * hk, w = GOAL_W * wk * 1.4;
      const lean = (i % 2 ? 1 : -1) * 6 + s * (u - 0.5) * 14;
      ctx.beginPath();
      ctx.moveTo(bx - w / 2, GROUND_Y);
      ctx.lineTo(bx - w * 0.3 + lean * 0.4, GROUND_Y - h * 0.7);
      ctx.lineTo(bx + lean, GROUND_Y - h);
      ctx.lineTo(bx + w * 0.32 + lean * 0.4, GROUND_Y - h * 0.68);
      ctx.lineTo(bx + w / 2, GROUND_Y);
      ctx.closePath();
      const g = ctx.createLinearGradient(bx - w / 2, GROUND_Y - h, bx + w / 2, GROUND_Y);
      g.addColorStop(0, 'rgba(240,252,255,.95)');
      g.addColorStop(0.5, 'rgba(150,220,250,.85)');
      g.addColorStop(1, 'rgba(70,160,220,.85)');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // lesk
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 2;
      line(ctx, bx - w * 0.12 + lean * 0.3, GROUND_Y - h * 0.62, bx + lean * 0.85, GROUND_Y - h * 0.93);
    }
    ctx.restore();
    // rampouchy na břevnu a třpyt
    ctx.save();
    ctx.globalAlpha = outK * clamp(age / 0.4, 0, 1);
    ctx.fillStyle = 'rgba(210,245,255,.95)';
    for (let i = 0; i < 7; i++) {
      const x = gx0 + 8 + i * ((GOAL_W - 10) / 6), l = 10 + ((i * 37) % 17);
      ctx.beginPath();
      ctx.moveTo(x - 4, BAR_Y + BAR_T);
      ctx.lineTo(x, BAR_Y + BAR_T + l);
      ctx.lineTo(x + 4, BAR_Y + BAR_T);
      ctx.closePath();
      ctx.fill();
    }
    for (let i = 0; i < 6; i++) {
      const k = (now * 0.002 + i * 0.37) % 1;
      const x = gx0 + ((i * 53) % GOAL_W), y = GROUND_Y - 30 - ((i * 71) % 170);
      ctx.fillStyle = `rgba(255,255,255,${Math.sin(k * Math.PI)})`;
      star(ctx, x, y, 7 * Math.sin(k * Math.PI) + 1, 2);
      ctx.fill();
    }
    ctx.restore();
  },

  drawArm(ctx, sx, sy, a, T, L, back) {
    const len = 17;
    const ex = sx + Math.sin(a) * len, ey = sy + Math.cos(a) * len;
    if (this._drip) {
      // nafouklý rukáv bundy až k zápěstí
      const wx = sx + Math.sin(a) * 13, wy = sy + Math.cos(a) * 13;
      ctx.lineCap = 'round';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 14;
      line(ctx, sx, sy, wx, wy);
      ctx.strokeStyle = back ? '#d3d9e1' : '#fbfcfd';
      ctx.lineWidth = 10.5;
      line(ctx, sx, sy, wx, wy);
      ctx.strokeStyle = 'rgba(110,122,145,.55)';
      ctx.lineWidth = 1.3;
      const mx = sx + Math.sin(a) * 6.5, my = sy + Math.cos(a) * 6.5, nx = Math.cos(a) * 5, ny = -Math.sin(a) * 5;
      line(ctx, mx - nx, my - ny, mx + nx, my + ny);
      const skin = back ? shade(L.skin, -0.16) : L.skin;
      ctx.fillStyle = skin;
      circle(ctx, ex, ey, 4.4);
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      return;
    }
    const mx = sx + Math.sin(a) * 8, my = sy + Math.cos(a) * 8;
    const skin = back ? shade(L.skin, -0.16) : L.skin;
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 10;
    line(ctx, sx, sy, ex, ey);
    ctx.strokeStyle = skin;
    ctx.lineWidth = 6.5;
    line(ctx, mx, my, ex, ey);
    if (this._beach || this._hoop || this._dress) {
      ctx.strokeStyle = skin;
      ctx.lineWidth = 6.5;
      line(ctx, sx, sy, mx, my);
    } else {
      ctx.strokeStyle = back ? T.dark : T.color;
      ctx.lineWidth = 8;
      line(ctx, sx, sy, mx, my);
    }
    ctx.fillStyle = skin;
    circle(ctx, ex, ey, 4.4);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  },

  drawLeg(ctx, hx, hy, fx, fy, T, L, rot, back) {
    const ax = fx - 3, ay = fy - 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 9.5;
    line(ctx, hx, hy, ax, ay);
    ctx.strokeStyle = back ? shade(L.skin, -0.16) : L.skin;
    ctx.lineWidth = 6.5;
    line(ctx, hx, hy, ax, ay);
    const sx = lerp(hx, ax, 0.4), sy = lerp(hy, ay, 0.4);
    if (!this._beach && !this._dress) {
      ctx.strokeStyle = back ? '#c4cad3' : '#f2f4f7';
      ctx.lineWidth = 7;
      line(ctx, sx, sy, ax, ay);
      ctx.strokeStyle = back ? T.dark : T.color;
      line(ctx, sx, sy, lerp(sx, ax, 0.3), lerp(sy, ay, 0.3));
    }
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(rot);
    if (this._dress) this.drawHeel(ctx, L.dress, back);
    else this.drawBoot(ctx, T, back);
    ctx.restore();
  },

  // Lodičky na podpatku (holky v klubu).
  drawHeel(ctx, D, back) {
    const c = back ? D.dark : D.shoe || D.color;
    ctx.beginPath();
    ctx.moveTo(-7, -4);
    ctx.quadraticCurveTo(4, -3, 11, 3);
    ctx.quadraticCurveTo(13.5, 6.5, 9.5, 6.8);
    ctx.lineTo(-3, 4);
    ctx.quadraticCurveTo(-8, 2.5, -7, -4);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-7.5, 1);
    ctx.lineTo(-4, 2.5);
    ctx.lineTo(-5.5, 7);
    ctx.lineTo(-7.5, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 1.2;
    line(ctx, 0, -1.5, 6, 1.5);
  },

  drawBoot(ctx, T, back) {
    ctx.beginPath();
    ctx.moveTo(-9, -6);
    ctx.lineTo(3, -6.5);
    ctx.quadraticCurveTo(13, -5, 14, 2);
    ctx.quadraticCurveTo(14, 7, 8, 7);
    ctx.lineTo(-8, 7);
    ctx.quadraticCurveTo(-12, 7, -11, 0);
    ctx.closePath();
    ctx.fillStyle = this._drip ? (back ? '#cfd5de' : '#fbfcfd') : back ? '#10141d' : '#1d2433';
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = this._drip ? '#1c2230' : back ? T.dark : T.color;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-4, -5);
    ctx.quadraticCurveTo(1, 0, 9, 1);
    ctx.stroke();
    ctx.fillStyle = this._drip ? '#c9ced6' : back ? '#aab2bd' : '#e9edf2';
    ctx.fillRect(-9, 4.4, 21, 2.4);
  },

  drawTorso(ctx, p, T, L) {
    const R = p.R / PS;
    const ch = (L.chub || 1) * (this._drip ? 1.12 : 1) * (p.growT > 0 ? 1.15 : 1);
    ctx.save();
    if (ch !== 1) {
      // širší (bříško / nafouklá bunda): roztáhnout trup do stran
      ctx.translate(-1, R + 4);
      ctx.scale(ch, L.chub ? 1.12 : 1.04);
      ctx.translate(1, -(R + 4));
    }
    if (this._drip) {
      this.drawPuffer(ctx, R);
      ctx.restore();
      return;
    }
    if (this._beach) {
      this.drawBikini(ctx, R, T, L);
      ctx.restore();
      return;
    }
    if (this._dress) {
      this.drawDress(ctx, R, L);
      ctx.restore();
      return;
    }
    // trenky (basketbalové jsou delší a volné, s bílým lemem)
    ctx.fillStyle = this._hoop ? T.color : T.dark;
    if (this._hoop) rrect(ctx, -17, R + 9, 32, 19, 5);
    else rrect(ctx, -15, R + 9, 29, 13, 4);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (this._hoop) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      line(ctx, -15, R + 25, 13, R + 25);
      line(ctx, 12, R + 12, 12, R + 25);
    }
    if (L.curvy) {
      // výrazné pozadí
      ctx.fillStyle = T.dark;
      oval(ctx, -15, R + 15, 9.5, 8.5);
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(-15, R + 15, 9.5, 8.5, 0, Math.PI * 0.4, Math.PI * 1.6);
      ctx.stroke();
    }
    // dres
    ctx.beginPath();
    ctx.moveTo(-17, R - 8);
    ctx.lineTo(15, R - 8);
    ctx.quadraticCurveTo(18, R - 6, 16, R + 2);
    ctx.lineTo(14, R + 13);
    ctx.quadraticCurveTo(14, R + 16, 11, R + 16);
    ctx.lineTo(-13, R + 16);
    ctx.quadraticCurveTo(-16, R + 16, -16, R + 13);
    ctx.lineTo(-19, R + 1);
    ctx.quadraticCurveTo(-20, R - 6, -17, R - 8);
    ctx.closePath();
    const g = ctx.createLinearGradient(-19, 0, 16, 0);
    g.addColorStop(0, T.dark);
    g.addColorStop(0.5, T.color);
    g.addColorStop(1, T.color);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 2;
    line(ctx, 12, R + 2, 11, R + 13);
    if (this._hoop) {
      // dres bez rukávů: bílé lemy u krku a průramků
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(1, R - 9, 8, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.stroke();
      line(ctx, 15, R - 7, 15.5, R + 3);
      line(ctx, -17.5, R - 7, -18.5, R + 2);
    }
    if (this._suit) {
      // bílá košile do V, klopy a červená kravata
      ctx.fillStyle = '#f4f6fa';
      ctx.beginPath();
      ctx.moveTo(-6, R - 8);
      ctx.lineTo(10, R - 8);
      ctx.lineTo(2, R + 9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0b1220';
      ctx.lineWidth = 1.4;
      line(ctx, -6, R - 8, 0, R + 8);
      line(ctx, 10, R - 8, 4, R + 8);
      ctx.fillStyle = '#d42a3a';
      ctx.beginPath();
      ctx.moveTo(1, R - 7);
      ctx.lineTo(4, R - 7);
      ctx.lineTo(5.5, R + 4);
      ctx.lineTo(2.5, R + 8);
      ctx.lineTo(-0.5, R + 4);
      ctx.closePath();
      ctx.fill();
      // kapesníček
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-14, R - 1, 5, 2.5);
    }
    if (L.curvy && !(p.selfieT > 0)) {
      // výrazné poprsí
      ctx.fillStyle = T.color;
      oval(ctx, 15, R + 5, 8.5, 7.5);
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(15, R + 5, 8.5, 7.5, 0, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(15, R + 5, 5, -1.2, -0.2);
      ctx.stroke();
    }
    if (p.selfieT > 0 && L.flashPose) this.drawFlashPose(ctx, R, T, L);
    if (L.chub) {
      // bříško dopředu přes trenky
      ctx.beginPath();
      ctx.ellipse(7, R + 10, 15, 13, 0, -1.3, 1.95);
      ctx.fillStyle = T.color;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(7, R + 10, 10, 8.5, 0, -1.0, 0.2);
      ctx.stroke();
    }
    ctx.restore();
    // šňůrka s píšťalkou (rozhodčí)
    if (L.ref) {
      ctx.strokeStyle = '#111317';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-6, R - 2);
      ctx.quadraticCurveTo(4, R + 14, 12, R + 2);
      ctx.stroke();
      if (!p.blow) {
        ctx.fillStyle = '#d9dee6';
        rrect(ctx, 2, R + 10, 9, 5, 2);
        ctx.fill();
      }
      // žluté lemování dresu
      ctx.strokeStyle = T.light;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(2, R - 1, 7, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    // zlatý odznak rozhodčího na hrudi (skin Petr Kuba MS)
    if (L.badge && !this._suit && !(p.primeT > 0)) {
      ctx.fillStyle = '#ffcf3a';
      ctx.strokeStyle = '#8a6200';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(8, R + 1);
      ctx.lineTo(14, R + 1);
      ctx.lineTo(14, R + 6);
      ctx.lineTo(11, R + 9);
      ctx.lineTo(8, R + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // číslo (ne při vyhrnutém triku a v obleku)
    if ((p.selfieT > 0 && L.flashPose) || this._suit) return;
    ctx.font = `800 13px ${FONT_U}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = T.dark;
    // obrázek je zrcadlený podle směru, číslo se musí číst normálně
    ctx.save();
    ctx.translate(-3, R + 8);
    if (p.dir < 0) ctx.scale(-1, 1);
    if (T.num) ctx.strokeStyle = T.light;
    ctx.strokeText(String(L.num), 0, 0);
    ctx.fillStyle = T.num || '#ffffff';
    ctx.fillText(String(L.num), 0, 0);
    ctx.restore();
  },

  // Moncler-Jenda: bílá péřová bunda s prošíváním, černé tepláky a zlatý řetěz.
  drawPuffer(ctx, R) {
    // tepláky
    ctx.fillStyle = '#1c2230';
    rrect(ctx, -15, R + 12, 29, 12, 4);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    // bunda
    ctx.beginPath();
    ctx.moveTo(-19, R - 9);
    ctx.lineTo(16, R - 9);
    ctx.quadraticCurveTo(21, R - 7, 20, R + 3);
    ctx.quadraticCurveTo(20, R + 18, 14, R + 19);
    ctx.lineTo(-15, R + 19);
    ctx.quadraticCurveTo(-22, R + 18, -22, R + 3);
    ctx.quadraticCurveTo(-23, R - 7, -19, R - 9);
    ctx.closePath();
    const g = ctx.createLinearGradient(-22, 0, 20, 0);
    g.addColorStop(0, '#d9dee6');
    g.addColorStop(0.45, '#ffffff');
    g.addColorStop(1, '#eef1f5');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    // prošívané komory
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(105,118,142,.55)';
    ctx.lineWidth = 1.5;
    for (const y of [R - 2, R + 5, R + 12]) {
      ctx.beginPath();
      ctx.moveTo(-24, y);
      ctx.quadraticCurveTo(-2, y + 2.6, 22, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = 1.6;
    for (const y of [R - 6, R + 1, R + 8, R + 15]) {
      ctx.beginPath();
      ctx.moveTo(-8, y);
      ctx.quadraticCurveTo(2, y - 1.2, 12, y);
      ctx.stroke();
    }
    ctx.restore();
    // zip a jezdec
    ctx.strokeStyle = '#8b94a3';
    ctx.lineWidth = 1.3;
    line(ctx, 9, R - 7, 9, R + 18);
    ctx.fillStyle = '#c9a227';
    rrect(ctx, 7.6, R - 4, 3, 5, 1);
    ctx.fill();
    // nafouklý límec
    ctx.fillStyle = '#ffffff';
    rrect(ctx, -17, R - 13, 32, 9, 4.5);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    // nášivka na rukávu (bez loga)
    ctx.fillStyle = '#1c2230';
    circle(ctx, -14, R + 2, 3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    circle(ctx, -14, R + 2, 1.1);
    ctx.fill();
    // zlatý řetěz
    ctx.strokeStyle = '#7a5a10';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(-9, R - 5);
    ctx.quadraticCurveTo(0, R + 11, 12, R - 4);
    ctx.stroke();
    ctx.strokeStyle = '#ffd24a';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([2.2, 1.2]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd24a';
    circle(ctx, 1.5, R + 4.5, 3);
    ctx.fill();
    ctx.strokeStyle = '#7a5a10';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  },

  // Suli: vyhrnuté triko, místo detailů kreslená cenzura (mozaika).
  drawFlashPose(ctx, R, T, L) {
    // odhalené břicho a hrudník
    ctx.beginPath();
    ctx.moveTo(-18, R + 2);
    ctx.lineTo(16, R + 2);
    ctx.quadraticCurveTo(18, R + 8, 15, R + 13);
    ctx.quadraticCurveTo(14, R + 16, 11, R + 16);
    ctx.lineTo(-13, R + 16);
    ctx.quadraticCurveTo(-16, R + 16, -16, R + 13);
    ctx.lineTo(-19, R + 5);
    ctx.closePath();
    ctx.fillStyle = L.skin;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    oval(ctx, 15, R + 6, 8.5, 7.5);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(15, R + 6, 8.5, 7.5, 0, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();
    // pupík
    ctx.fillStyle = shade(L.skin, -0.35);
    oval(ctx, 3, R + 12.5, 1, 1.4);
    ctx.fill();
    // vyhrnuté triko pod bradou
    ctx.fillStyle = T.color;
    rrect(ctx, -21, R - 1, 42, 8, 4);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    // cenzura (mozaika)
    const cols = [shade(L.skin, -0.1), shade(L.skin, -0.28), shade(L.skin, 0.18), shade(L.skin, -0.2), shade(L.skin, 0.06)];
    const sz = 6, x0 = 2, y0 = R + 5;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = cols[(i * 2 + j * 3) % cols.length];
        ctx.fillRect(x0 + i * sz, y0 + j * sz, sz, sz);
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x0, y0, sz * 4, sz * 2);
  },

  // Obří sushi pod Tráňou: rýže, plátek lososa s pruhy a pásek nori.
  drawSushi(ctx, p, now) {
    const h = p.lift, w = 150, x = p.x, y = GROUND_Y - h;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    oval(ctx, x, GROUND_Y + 2, w * 0.55, 7);
    ctx.fill();
    // sushi se při jízdě lehce houpe spolu s Tráňou
    const tilt = Math.sin(now * 0.005) * 0.03 * Math.min(1, h / SUSHI_H);
    ctx.translate(x, GROUND_Y);
    ctx.rotate(tilt);
    ctx.translate(-x, -GROUND_Y);
    if (p.sushiT > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const ly = y + 8 + i * (h / 4), lx = x - p.dir * (w / 2 + 14 + ((now * 0.4 + i * 37) % 40));
        line(ctx, lx, ly, lx - p.dir * 34, ly);
      }
    }
    // rýže
    ctx.fillStyle = '#fbfbf6';
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y + 10, w, Math.max(4, h - 8), 16);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,200,190,.7)';
    const rng = mulberry32(17);
    for (let i = 0; i < 24; i++) {
      oval(ctx, x - w / 2 + 10 + rng() * (w - 20), y + 16 + rng() * Math.max(1, h - 20), 3.2, 1.8, rng() * 3);
      ctx.fill();
    }
    // losos
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - 6, y + 14);
    ctx.quadraticCurveTo(x - w / 2 - 4, y - 2, x - w / 2 + 20, y - 2);
    ctx.lineTo(x + w / 2 - 6, y - 4);
    ctx.quadraticCurveTo(x + w / 2 + 12, y + 2, x + w / 2 + 4, y + 16);
    ctx.quadraticCurveTo(x, y + 22, x - w / 2 - 6, y + 14);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y - 4, 0, y + 20);
    g.addColorStop(0, '#ff9a6b');
    g.addColorStop(1, '#f2643c');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,225,.85)';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 6; i++) {
      const sx = x - w / 2 + 14 + i * 24;
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.quadraticCurveTo(sx + 8, y + 7, sx + 4, y + 16);
      ctx.stroke();
    }
    // nori
    ctx.fillStyle = '#1d2b22';
    ctx.fillRect(x - 13, y - 4, 26, h + 4);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 13, y - 4, 26, h + 4);
    ctx.restore();
  },

  // Majdiny gumové ruce: od ramen k míči, vlní se jako guma, ruce drží míč.
  drawArms(ctx, m, now) {
    const A = m.arms, p = m.players[A.by], b = m.ball;
    if (!p) return;
    const L = p.look, T = m.teams[p.team], dir = p.dir || 1;
    const k = A.t < 0.22 ? A.t / 0.22 : 1;
    const tx = A.t < 0.22 ? A.bx : b.x, ty = A.t < 0.22 ? A.by0 : b.y;
    for (const side of [-1, 1]) {
      const sx = p.x + dir * (side < 0 ? -10 : 12) * PS, sy = p.y + p.R + 4 * PS;
      const hx = lerp(sx, tx - dir * 6 + side * 4, k), hy = lerp(sy, ty + side * 8, k);
      const mx = (sx + hx) / 2, my = (sy + hy) / 2 + Math.sin(now * 0.02 + side) * 18 - 20;
      ctx.lineCap = 'round';
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, hx, hy);
      ctx.stroke();
      ctx.strokeStyle = side < 0 ? shade(L.skin, -0.12) : L.skin;
      ctx.lineWidth = 8.5;
      ctx.stroke();
      // rukáv u ramene
      ctx.strokeStyle = T.color;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(lerp(sx, mx, 0.15), lerp(sy, my, 0.15));
      ctx.stroke();
      // dlaň
      ctx.fillStyle = L.skin;
      circle(ctx, hx, hy, 7);
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  },

  // Soukromý tryskáč (Durcado byznysman) a provazový žebřík k Durcadovi.
  drawJet(ctx, m, now) {
    const J = m.jet, p = m.players[J.by];
    const dir = J.dir || 1, x = J.x, y = J.y;
    // žebřík
    if (J.hold && p) {
      const top = y + 16, bot = p.y - p.R * 0.6;
      ctx.strokeStyle = '#8a6a3a';
      ctx.lineWidth = 2.2;
      line(ctx, x - dir * 18, top, p.x - 9, bot);
      line(ctx, x - dir * 6, top, p.x + 9, bot);
      for (let k = 1; k < 5; k++) {
        const f = k / 5;
        line(ctx, lerp(x - dir * 18, p.x - 9, f), lerp(top, bot, f), lerp(x - dir * 6, p.x + 9, f), lerp(top, bot, f));
      }
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(now * 0.004) * 0.03 - (J.t > 2 ? 0.18 * dir : 0));
    ctx.scale(dir, 1);
    // kondenzační stopa
    for (let i = 1; i <= 5; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.32 - i * 0.05})`;
      circle(ctx, -125 - i * 26, -14 + Math.sin(now * 0.01 + i) * 2, 7 + i * 3);
      ctx.fill();
    }
    // křídlo (zadní)
    ctx.fillStyle = '#9aa3b5';
    ctx.beginPath();
    ctx.moveTo(10, -4);
    ctx.lineTo(-55, -30);
    ctx.lineTo(-35, -30);
    ctx.lineTo(30, -4);
    ctx.closePath();
    ctx.fill();
    // trup
    const g = ctx.createLinearGradient(0, -24, 0, 24);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.6, '#e4e8ef');
    g.addColorStop(1, '#aab2c0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(130, 4);
    ctx.quadraticCurveTo(118, -22, 60, -22);
    ctx.lineTo(-100, -18);
    ctx.lineTo(-128, -8);
    ctx.lineTo(-128, 8);
    ctx.lineTo(-100, 16);
    ctx.lineTo(60, 20);
    ctx.quadraticCurveTo(118, 20, 130, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0b1220';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // ocasní plocha
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath();
    ctx.moveTo(-92, -17);
    ctx.lineTo(-122, -62);
    ctx.lineTo(-104, -62);
    ctx.lineTo(-70, -18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // motor
    ctx.fillStyle = '#5b6478';
    ctx.beginPath();
    ctx.roundRect(-96, -32, 44, 14, 7);
    ctx.fill();
    ctx.stroke();
    // zlatý pruh, okna, kokpit
    ctx.fillStyle = '#ffc93c';
    ctx.fillRect(-100, 4, 190, 4);
    ctx.fillStyle = '#1c2a44';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(-50 + i * 22, -6, 5, 6, 0, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(98, -14);
    ctx.quadraticCurveTo(116, -12, 122, -2);
    ctx.lineTo(100, -2);
    ctx.closePath();
    ctx.fill();
    // křídlo (přední)
    ctx.fillStyle = '#c4cad6';
    ctx.beginPath();
    ctx.moveTo(30, 8);
    ctx.lineTo(-40, 44);
    ctx.lineTo(-18, 44);
    ctx.lineTo(52, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // nápis (vždy čitelně)
    ctx.scale(dir, 1);
    ctx.fillStyle = '#1c2a44';
    ctx.font = `800 11px ${FONT_U}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DURCADO AIR', 5 * dir, 14);
    ctx.restore();
  },

  // Zlatá korunka (True Gold Kiki) a zlaté odlesky.
  drawCrown(ctx, R, now) {
    ctx.save();
    ctx.translate(2, -R + 4);
    ctx.rotate(-0.12);
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(-22, -20);
    ctx.lineTo(-11, -9);
    ctx.lineTo(0, -26);
    ctx.lineTo(11, -9);
    ctx.lineTo(22, -20);
    ctx.lineTo(20, 0);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -26, 0, 0);
    g.addColorStop(0, '#fff6c2');
    g.addColorStop(0.5, '#ffd23f');
    g.addColorStop(1, '#b8860b');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#5a3d00';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.fillStyle = '#b8860b';
    ctx.fillRect(-20, -5, 40, 5);
    for (const [jx, col] of [[-11, '#e8445a'], [0, '#3fa2ff'], [11, '#e8445a']]) {
      ctx.fillStyle = col;
      circle(ctx, jx, -3, 2.4);
      ctx.fill();
    }
    for (const [px, py] of [[-22, -20], [0, -26], [22, -20]]) {
      ctx.fillStyle = '#ffffff';
      circle(ctx, px, py, 2.2);
      ctx.fill();
    }
    ctx.restore();
    // třpyt
    const tw = (Math.sin(now * 0.006) + 1) / 2;
    ctx.fillStyle = `rgba(255,255,255,${0.35 + tw * 0.6})`;
    for (const [sx, sy, sz] of [[-18, -10, 3.5], [22, 14, 2.6]]) {
      ctx.beginPath();
      ctx.moveTo(sx, sy - sz * 2);
      ctx.lineTo(sx + sz * 0.5, sy - sz * 0.5);
      ctx.lineTo(sx + sz * 2, sy);
      ctx.lineTo(sx + sz * 0.5, sy + sz * 0.5);
      ctx.lineTo(sx, sy + sz * 2);
      ctx.lineTo(sx - sz * 0.5, sy + sz * 0.5);
      ctx.lineTo(sx - sz * 2, sy);
      ctx.lineTo(sx - sz * 0.5, sy - sz * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  },

  // Mobil v ruce (selfie), na začátku s bleskem.
  drawPhone(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y - 6);
    ctx.rotate(-0.25);
    ctx.fillStyle = '#1b1f2a';
    rrect(ctx, -5.5, -10, 11, 19, 2.5);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#ff7ac8';
    rrect(ctx, -4, -8.5, 8, 15, 1.5);
    ctx.fill();
    // blesk
    const f = clamp((t - 0.55) / 0.35, 0, 1);
    if (f > 0) {
      const g = ctx.createRadialGradient(0, -6, 0, 0, -6, 40 * f + 10);
      g.addColorStop(0, `rgba(255,255,255,${0.95 * f})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      circle(ctx, 0, -6, 40 * f + 10);
      ctx.fill();
    }
    ctx.restore();
  },

  // Oslněný bleskem: vyvalené oči.
  drawStareEye(ctx, x, y, r) {
    ctx.fillStyle = '#ffffff';
    circle(ctx, x, y, r);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#16120f';
    circle(ctx, x + 1, y + 0.5, r * 0.26);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    circle(ctx, x - r * 0.2, y - r * 0.35, r * 0.14);
    ctx.fill();
  },

  // Kiki v bikinách: sportovní dvoudílné plavky v barvě týmu.
  drawBikini(ctx, R, T, L) {
    // tělo
    ctx.beginPath();
    ctx.moveTo(-16, R - 8);
    ctx.lineTo(14, R - 8);
    ctx.quadraticCurveTo(17, R - 6, 15, R + 2);
    ctx.lineTo(13, R + 13);
    ctx.quadraticCurveTo(13, R + 17, 10, R + 17);
    ctx.lineTo(-12, R + 17);
    ctx.quadraticCurveTo(-15, R + 17, -15, R + 13);
    ctx.lineTo(-18, R + 1);
    ctx.quadraticCurveTo(-19, R - 6, -16, R - 8);
    ctx.closePath();
    ctx.fillStyle = L.skin;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // pupík
    ctx.fillStyle = shade(L.skin, -0.35);
    oval(ctx, 2, R + 9, 0.9, 1.3);
    ctx.fill();
    // spodní díl
    ctx.beginPath();
    ctx.moveTo(-15, R + 12);
    ctx.lineTo(13, R + 12);
    ctx.lineTo(12, R + 18);
    ctx.quadraticCurveTo(-1, R + 22, -14, R + 18);
    ctx.closePath();
    ctx.fillStyle = T.color;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    // horní díl (sportovní) a ramínka
    ctx.strokeStyle = T.dark;
    ctx.lineWidth = 2;
    line(ctx, -9, R - 8, -8, R - 2);
    line(ctx, 7, R - 8, 8, R - 2);
    ctx.fillStyle = T.color;
    rrect(ctx, -16, R - 3, 31, 7.5, 3.5);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1.4;
    line(ctx, -12, R - 1, 11, R - 1);
  },

  // Cenzura mozaikou přes poprsí – kreslí se úplně navrch (přes hlavu i ruce), ať je vždycky vidět.
  drawCensor(ctx, R, L) {
    const cols = [shade(L.skin, 0.22), shade(L.skin, -0.34), '#e79a9a', shade(L.skin, -0.12), shade(L.skin, 0.08), '#c97a72', shade(L.skin, -0.45)];
    const sz = 6.5, nx = 5, ny = 3, x0 = -1, y0 = R - 5;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        ctx.fillStyle = cols[(i * 3 + j * 5 + i * j) % cols.length];
        ctx.fillRect(x0 + i * sz, y0 + j * sz, sz, sz);
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x0, y0, sz * nx, sz * ny);
  },

  // Upnuté minišaty (holky v klubu Hot Peppers): odhalená ramena, výstřih, výrazná postava.
  drawDress(ctx, R, L) {
    const D = L.dress;
    if (D.style === 'set') {
      // tanečnice u tyče: třpytivý top a kraťásky, holé bříško
      ctx.beginPath();
      ctx.moveTo(-16, R - 8);
      ctx.lineTo(14, R - 8);
      ctx.quadraticCurveTo(17, R - 6, 15, R + 2);
      ctx.lineTo(13, R + 13);
      ctx.quadraticCurveTo(13, R + 17, 10, R + 17);
      ctx.lineTo(-12, R + 17);
      ctx.quadraticCurveTo(-15, R + 17, -15, R + 13);
      ctx.lineTo(-18, R + 1);
      ctx.quadraticCurveTo(-19, R - 6, -16, R - 8);
      ctx.closePath();
      ctx.fillStyle = L.skin;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.fillStyle = shade(L.skin, -0.35);
      oval(ctx, 2, R + 8, 0.9, 1.3);
      ctx.fill();
      ctx.fillStyle = D.dark;
      oval(ctx, -16, R + 16, 10, 9);
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(-16, R + 16, 10, 9, 0, Math.PI * 0.4, Math.PI * 1.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-17, R + 11);
      ctx.lineTo(14, R + 11);
      ctx.lineTo(13, R + 20);
      ctx.quadraticCurveTo(-2, R + 23, -18, R + 20);
      ctx.closePath();
      ctx.fillStyle = D.color;
      ctx.fill();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (L.topless) {
        // top odhozený: poprsí zakryté mozaikou (stejně jako u Suli)
        ctx.fillStyle = L.skin;
        oval(ctx, 15, R + 2, 8.5, 7.5);
        ctx.fill();
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(15, R + 2, 8.5, 7.5, 0, -Math.PI * 0.6, Math.PI * 0.6);
        ctx.stroke();
        return; // mozaiku kreslí drawCensor až přes hlavu a ruce
      }
      ctx.fillStyle = D.color;
      rrect(ctx, -15, R - 4, 28, 8, 4);
      ctx.fill();
      ctx.stroke();
      oval(ctx, 15, R + 2, 8.5, 7.5);
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(15, R + 2, 8.5, 7.5, 0, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      for (const [x, y] of [[-10, -1], [-3, 1], [4, -1], [12, 1], [17, 4], [-9, 14], [0, 16], [8, 14]]) {
        circle(ctx, x, R + y, 0.9);
        ctx.fill();
      }
      return;
    }
    // ramena a paže v barvě kůže
    ctx.beginPath();
    ctx.moveTo(-16, R - 8);
    ctx.lineTo(14, R - 8);
    ctx.quadraticCurveTo(17, R - 6, 15, R + 2);
    ctx.lineTo(-18, R + 2);
    ctx.quadraticCurveTo(-19, R - 6, -16, R - 8);
    ctx.closePath();
    ctx.fillStyle = L.skin;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // pozadí
    ctx.fillStyle = D.dark;
    oval(ctx, -16, R + 16, 10, 9);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-16, R + 16, 10, 9, 0, Math.PI * 0.4, Math.PI * 1.6);
    ctx.stroke();
    // šaty: od výstřihu po půl stehen
    ctx.beginPath();
    ctx.moveTo(-17, R - 2);
    ctx.quadraticCurveTo(-2, R - 5, 14, R - 3);
    ctx.quadraticCurveTo(18, R + 5, 13, R + 11);
    ctx.quadraticCurveTo(17, R + 18, 15, R + 26);
    ctx.lineTo(-18, R + 26);
    ctx.quadraticCurveTo(-22, R + 16, -18, R + 9);
    ctx.quadraticCurveTo(-20, R + 2, -17, R - 2);
    ctx.closePath();
    const g = ctx.createLinearGradient(-20, 0, 17, 0);
    g.addColorStop(0, D.dark);
    g.addColorStop(0.55, D.color);
    g.addColorStop(1, D.light);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    // poprsí
    ctx.fillStyle = D.color;
    oval(ctx, 15, R + 3, 8.5, 7.5);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(15, R + 3, 8.5, 7.5, 0, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(15, R + 3, 5, -1.2, -0.2);
    ctx.stroke();
    if (D.style === 'slip') {
      // tenká ramínka
      ctx.strokeStyle = D.dark;
      ctx.lineWidth = 1.6;
      line(ctx, -9, R - 8, -9, R - 3);
      line(ctx, 8, R - 8, 10, R - 3);
    } else if (D.style === 'sequin') {
      // flitry
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      for (const [x, y] of [[-12, 4], [-6, 10], [0, 3], [5, 14], [-10, 18], [9, 8], [-2, 21], [11, 20], [-15, 11]]) {
        circle(ctx, x, R + y, 0.9);
        ctx.fill();
      }
    } else if (D.style === 'cut') {
      // šněrování na boku
      ctx.strokeStyle = D.light;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) line(ctx, -14, R + 6 + i * 5, -8, R + 9 + i * 5);
    }
    // lesk po straně
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 2;
    line(ctx, 12, R + 13, 12.5, R + 23);
    // řetízek na krku
    if (L.necklace) {
      ctx.strokeStyle = L.necklace;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-7, R - 8);
      ctx.quadraticCurveTo(1, R - 1, 9, R - 8);
      ctx.stroke();
      ctx.fillStyle = L.necklace;
      circle(ctx, 1, R - 3, 1.8);
      ctx.fill();
    }
  },

  // Doplňky z klubu Hot Peppers: brýle, zlatý řetěz, koruna.
  drawGear(ctx, p, R, now) {
    const g = p.gear;
    if (g.chain && !this._drip) {
      ctx.save();
      ctx.strokeStyle = '#7a5a10';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(-10, R + 1);
      ctx.quadraticCurveTo(0, R + 16, 12, R + 2);
      ctx.stroke();
      ctx.strokeStyle = '#ffd24a';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([2.2, 1.2]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffd24a';
      circle(ctx, 1.5, R + 10, 3.4);
      ctx.fill();
      ctx.strokeStyle = '#7a5a10';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
    if (g.shades && !this._drip && !this._beach) this.drawShades(ctx, p);
    if (g.crown && !p.look.crown) this.drawCrown(ctx, R, now);
  },

  // Moncler-Jenda: černé brýle a diamant v uchu.
  drawShades(ctx, p, beach) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = beach ? '#ffffff' : '#0d0f14';
    ctx.lineWidth = 2.4;
    line(ctx, 2, -6, -15, -3);
    line(ctx, 16, -6.5, 20, -6.5);
    for (const [x0, x1] of [[1, 16.5], [19.5, 36]]) {
      ctx.beginPath();
      ctx.moveTo(x0, -11);
      ctx.lineTo(x1, -11);
      ctx.quadraticCurveTo(x1 + 0.5, 3, (x0 + x1) / 2, 3);
      ctx.quadraticCurveTo(x0 - 0.5, 3, x0, -11);
      ctx.closePath();
      if (beach) {
        // plážové brýle: tónovaná skla a bílá obroučka
        const g = ctx.createLinearGradient(0, -11, 0, 3);
        g.addColorStop(0, '#3a1f4d');
        g.addColorStop(1, '#ff7a9e');
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = '#0d0f14';
      }
      ctx.fill();
      ctx.strokeStyle = beach ? '#ffffff' : '#2a2f3a';
      ctx.lineWidth = beach ? 2 : 1.6;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.4)';
      ctx.lineWidth = 1.4;
      line(ctx, x0 + 3, -8, x0 + 7, -3);
    }
    if (beach) {
      ctx.restore();
      return;
    }
    // diamant
    ctx.fillStyle = '#e8fbff';
    circle(ctx, -16, 11.5, 2.4);
    ctx.fill();
    ctx.strokeStyle = '#7fd8ff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  },

  drawHead(ctx, p, ball, T, now) {
    const R = p.R / PS, L = p.look;
    // krk
    ctx.fillStyle = shade(L.skin, -0.14);
    rrect(ctx, -8, R - 14, 15, 16, 5);
    ctx.fill();
    // hlava se světlem zepředu shora
    ctx.fillStyle = L.skin;
    circle(ctx, 0, 0, R);
    ctx.fill();
    const sh = ctx.createRadialGradient(12, -12, 4, 2, 0, R + 2);
    sh.addColorStop(0, 'rgba(255,255,255,.22)');
    sh.addColorStop(0.55, 'rgba(255,255,255,0)');
    sh.addColorStop(1, 'rgba(130,55,20,.24)');
    ctx.fillStyle = sh;
    circle(ctx, 0, 0, R);
    ctx.fill();

    this.drawHair(ctx, p, T, 'cap', now);

    // ucho
    const ear = shade(L.skin, -0.04);
    ctx.fillStyle = ear;
    oval(ctx, -17, 3, 6.5, 8.5);
    ctx.fill();
    ctx.strokeStyle = shade(L.skin, -0.42);
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-17, 3, 3.6, -1.1, 1.3);
    ctx.stroke();
    if (L.girl) {
      ctx.fillStyle = L.accent;
      circle(ctx, -16, 11.5, 2.2);
      ctx.fill();
      if (L.hoops) {
        ctx.strokeStyle = L.hoops;
        ctx.lineWidth = 1.8;
        circle(ctx, -16, 17, 5.2);
        ctx.stroke();
      }
    }

    ctx.lineWidth = 3;
    ctx.strokeStyle = OUTLINE;
    circle(ctx, 0, 0, R);
    ctx.stroke();

    this.drawFace(ctx, p, ball);
    this.drawHair(ctx, p, T, 'top', now);
    if (L.crown) this.drawCrown(ctx, R, now);
    if (L.headset) this.drawHeadset(ctx, R);
  },

  // Sluchátko rozhodčího s mikrofonem u pusy.
  drawHeadset(ctx, R) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1c2230';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-4, 4, R - 3, 1.18 * Math.PI, 1.62 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#1c2230';
    rrect(ctx, -22, 2, 11, 16, 4);
    ctx.fill();
    ctx.fillStyle = '#d7ff3a';
    circle(ctx, -16.5, 10, 2.2);
    ctx.fill();
    ctx.strokeStyle = '#2b3242';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, 15);
    ctx.quadraticCurveTo(2, 28, 16, 22);
    ctx.stroke();
    ctx.fillStyle = '#2b3242';
    circle(ctx, 17, 21.5, 3);
    ctx.fill();
    ctx.restore();
  },

  // Vlasy mají tři vrstvy: 'back' (za tělem), 'cap' (na hlavě), 'top' (přes obrys a čelo).
  drawHair(ctx, p, T, layer, now) {
    const R = p.R / PS, L = p.look;
    if (L.hair === 'bunny') {
      // králík: dlouhé uši (jedno trochu sklopené), uvnitř růžové
      if (layer !== 'top') return;
      const ear = (bx, ang, len) => {
        ctx.save();
        ctx.translate(bx, -R + 6);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.ellipse(0, -len / 2, 9, len / 2, 0, 0, TAU);
        ctx.fillStyle = L.skin;
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 2.6;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, -len / 2 + 2, 4.5, len / 2 - 7, 0, 0, TAU);
        ctx.fillStyle = '#f7a8bd';
        ctx.fill();
        ctx.restore();
      };
      const sway = Math.sin((now || 0) * 0.004) * 0.06;
      ear(-10, -0.32 + sway, 50);
      ear(12, 0.5 - sway, 44);
      return;
    }
    if (L.hair === 'bald') {
      // holá hlava: jen odlesk (starší pán má kolem dokola krátký šedivý věnec)
      if (layer === 'cap' && L.rim) {
        ctx.save();
        circle(ctx, 0, 0, R - 1);
        ctx.clip();
        ctx.strokeStyle = L.hairColor;
        ctx.lineWidth = 15;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(2, 2, R - 2, 0.6 * Math.PI, 1.16 * Math.PI);
        ctx.stroke();
        ctx.strokeStyle = hexA(L.hairDark, 0.6);
        ctx.lineWidth = 1.2;
        const rr = mulberry32(31);
        for (let i = 0; i < 26; i++) {
          const a = (0.62 + rr() * 0.52) * Math.PI, d = R - 8 + rr() * 9;
          line(ctx, 2 + Math.cos(a) * d, 2 + Math.sin(a) * d, 2 + Math.cos(a) * (d + 3), 2 + Math.sin(a) * (d + 3));
        }
        ctx.restore();
      }
      if (layer === 'cap') {
        ctx.fillStyle = 'rgba(255,255,255,.22)';
        oval(ctx, 4, -24, 13, 6, -0.25);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        oval(ctx, 8, -26, 5, 2.2, -0.25);
        ctx.fill();
      }
      return;
    }
    const base = L.hairColor, dark = L.hairDark, light = L.hairLight;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // obrys tvaru: nejdřív tmavá kresba, pak barva
    const shape = (draw) => {
      draw();
      ctx.fillStyle = base;
      ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    };
    const blobs = (list) => {
      ctx.fillStyle = dark;
      for (const [x, y, r] of list) {
        circle(ctx, x, y, r + 2.2);
        ctx.fill();
      }
      ctx.fillStyle = base;
      for (const [x, y, r] of list) {
        circle(ctx, x, y, r);
        ctx.fill();
      }
    };
    // kudrny: světlý lesk nahoře a tmavá spirálka dole
    const curlTex = (list, every = 1) => {
      ctx.lineCap = 'round';
      list.forEach(([x, y, r], i) => {
        if (i % every) return;
        ctx.strokeStyle = light;
        ctx.lineWidth = Math.max(1.4, r * 0.18);
        ctx.beginPath();
        ctx.arc(x - r * 0.1, y - r * 0.05, r * 0.58, 1.1 * Math.PI, 1.7 * Math.PI);
        ctx.stroke();
        ctx.strokeStyle = dark;
        ctx.lineWidth = Math.max(1, r * 0.13);
        ctx.beginPath();
        ctx.arc(x + r * 0.12, y + r * 0.1, r * 0.42, 0.05 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      });
    };
    // obrys s vlnkami: každý úsek se vyboulí ven o b (třetí číslo bodu)
    const wavyPath = (pts) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1, b = 0] = pts[i];
        const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
        ctx.quadraticCurveTo((x0 + x1) / 2 + (dy / len) * b, (y0 + y1) / 2 - (dx / len) * b, x1, y1);
      }
      ctx.closePath();
    };
    const hook = (x, y, r, a0, color, w) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(x, y, r, a0, a0 + Math.PI * 1.1);
      ctx.stroke();
    };
    const strand = (x0, y0, cx, cy, x1, y1, color, w) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(cx, cy, x1, y1);
      ctx.stroke();
    };

    if (layer === 'back') {
      if (L.hair === 'ponytail') {
        const lvx = p.vx * p.dir;
        let th = Math.PI * 0.7 + clamp(lvx * 0.0011, -0.2, 0.5) + clamp(p.vy * 0.0005, -0.45, 0.45)
          + Math.sin(now * 0.005 + p.homeX) * 0.05;
        th = clamp(th, Math.PI * 0.5, Math.PI * 1.15);
        const ax = -22, ay = -32, len = 54;
        const dx = Math.cos(th), dy = Math.sin(th), nx = -dy, ny = dx;
        const mx = ax + dx * len * 0.45, my = ay + dy * len * 0.45;
        const tx = ax + dx * len + nx * 7, ty = ay + dy * len + ny * 7;
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(ax + nx * 8, ay + ny * 8);
          ctx.quadraticCurveTo(mx + nx * 15, my + ny * 15, tx, ty);
          ctx.quadraticCurveTo(mx - nx * 9, my - ny * 9, ax - nx * 7, ay - ny * 7);
          ctx.closePath();
        });
        strand(ax + dx * 8, ay + dy * 8, mx + nx * 6, my + ny * 6, ax + dx * len * 0.85 + nx * 4, ay + dy * len * 0.85 + ny * 4, light, 2.2);
        strand(ax + dx * 10 - nx * 2, ay + dy * 10 - ny * 2, mx - nx * 2, my - ny * 2, ax + dx * len * 0.7, ay + dy * len * 0.7, dark, 1.4);
      } else if (L.hair === 'longhair') {
        // dlouhé rozpuštěné vlasy až k lopatkám, vlají při běhu a skoku
        const sw = clamp(p.vx * p.dir * 0.014, -5, 9) + clamp(-p.vy * 0.005, -6, 6) + Math.sin(now * 0.004 + p.homeX) * 1.2;
        const len = 62;
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(20, -38);
          ctx.quadraticCurveTo(-36, -58, -49, -12);
          ctx.quadraticCurveTo(-57 - sw, 26, -52 - sw * 1.2, len - 8);
          if (L.wavy) {
            ctx.quadraticCurveTo(-50 - sw, len + 4, -42 - sw, len - 2);
            ctx.quadraticCurveTo(-36 - sw * 0.8, len + 6, -28 - sw * 0.7, len - 4);
            ctx.quadraticCurveTo(-20 - sw * 0.5, len + 2, -14 - sw * 0.4, len - 10);
          } else {
            ctx.lineTo(-44 - sw * 1.1, len);
            ctx.lineTo(-36 - sw, len - 6);
            ctx.lineTo(-28 - sw * 0.8, len + 1);
            ctx.lineTo(-20 - sw * 0.6, len - 8);
            ctx.lineTo(-13 - sw * 0.4, len - 3);
          }
          ctx.quadraticCurveTo(-8, 44, -6, 26);
          ctx.lineTo(0, 0);
          ctx.closePath();
        });
        strand(-40, -20, -52 - sw, 18, -46 - sw * 1.1, len - 10, light, 2.6);
        strand(-30, -10, -40 - sw * 0.8, 30, -32 - sw * 0.8, len - 6, dark, 1.6);
        strand(-20, 4, -26 - sw * 0.6, 36, -20 - sw * 0.5, len - 12, light, 1.8);
      } else if (L.hair === 'long') {
        const sw = clamp(p.vx * p.dir * 0.012, -4, 7) + clamp(-p.vy * 0.004, -4, 4);
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(16, -38);
          ctx.quadraticCurveTo(-34, -54, -47, -10);
          ctx.quadraticCurveTo(-53 - sw, 24, -46 - sw, 52);
          ctx.quadraticCurveTo(-40 - sw, 61, -32 - sw * 0.6, 54);
          ctx.quadraticCurveTo(-25, 62, -17, 51);
          ctx.quadraticCurveTo(-9, 45, -7, 28);
          ctx.lineTo(0, 0);
          ctx.closePath();
        });
        strand(-38, -18, -48 - sw, 14, -40 - sw, 46, light, 2.4);
        strand(-28, -8, -36 - sw * 0.7, 22, -28 - sw * 0.6, 48, dark, 1.5);
      } else if (L.hair === 'wavy') {
        // vlny na zátylku
        blobs([[-34, 14, 10], [-38, 2, 11], [-37, -12, 11], [-28, 22, 8]]);
      } else if (L.hair === 'shaggy') {
        // delší pramínky na krku
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(-26, 6);
          ctx.quadraticCurveTo(-44, 10, -42, 26);
          ctx.lineTo(-36, 20);
          ctx.lineTo(-33, 30);
          ctx.lineTo(-28, 21);
          ctx.lineTo(-22, 26);
          ctx.quadraticCurveTo(-20, 14, -26, 6);
          ctx.closePath();
        });
      }
      return;
    }

    if (layer === 'cap') {
      // vlasy na temeni, oříznuté obrysem hlavy
      ctx.save();
      circle(ctx, 0, 0, R);
      ctx.clip();
      const faded = L.hair === 'fade' || L.hair === 'curlyshort' || L.hair === 'receding';
      ctx.fillStyle = L.hair === 'fade' ? 'rgba(90,60,30,.32)' : L.hair === 'receding' ? hexA(base, 0.5) : faded ? hexA(dark, 0.42) : base;
      ctx.beginPath();
      if (L.hair === 'wavy') {
        ctx.moveTo(R + 8, -24);
        ctx.quadraticCurveTo(20, -18, 4, -22);
        ctx.quadraticCurveTo(-12, -16, -18, 2);
        ctx.quadraticCurveTo(-22, 16, -30, 24);
      } else if (L.hair === 'receding') {
        // ustupující koutky: vlasy začínají výš
        ctx.moveTo(R + 8, -36);
        ctx.quadraticCurveTo(20, -36, 10, -36);
        ctx.quadraticCurveTo(0, -27, -12, -12);
        ctx.quadraticCurveTo(-20, 6, -32, 22);
      } else if (L.hair === 'wavyshort') {
        ctx.moveTo(R + 8, -22);
        ctx.quadraticCurveTo(20, -20, 4, -26);
        ctx.quadraticCurveTo(-10, -18, -15, -6);
        ctx.quadraticCurveTo(-22, 12, -32, 22);
      } else if (L.hair === 'curlytop') {
        // vysoké čelo, vlasy začínají výš
        ctx.moveTo(R + 8, -31);
        ctx.quadraticCurveTo(22, -29, 6, -30);
        ctx.quadraticCurveTo(-10, -24, -16, -4);
        ctx.quadraticCurveTo(-22, 12, -32, 22);
      } else if (L.hair === 'shaggy') {
        ctx.moveTo(R + 8, -18);
        ctx.quadraticCurveTo(22, -16, 6, -19);
        ctx.quadraticCurveTo(-10, -15, -17, 0);
        ctx.quadraticCurveTo(-22, 14, -32, 24);
      } else {
        ctx.moveTo(R + 8, -27);
        ctx.quadraticCurveTo(18, -22, 2, -26);
        ctx.quadraticCurveTo(-12, -21, -18, -5);
        ctx.quadraticCurveTo(-24, 10, -34, 20);
      }
      ctx.lineTo(-R - 8, 24);
      ctx.lineTo(-R - 8, -R - 8);
      ctx.lineTo(R + 8, -R - 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }

    // vrstva 'top'
    switch (L.hair) {
      case 'ponytail':
        // ofina na stranu, lesk a gumička
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(-16, -34);
          ctx.quadraticCurveTo(10, -50, 41, -26);
          ctx.quadraticCurveTo(33, -25, 27, -17);
          ctx.quadraticCurveTo(20, -27, 6, -28);
          ctx.quadraticCurveTo(-4, -28, -16, -34);
          ctx.closePath();
        });
        strand(-6, -40, 12, -47, 32, -32, light, 2.6);
        strand(-24, -30, -26, -40, -12, -42, light, 2);
        ctx.fillStyle = L.accent;
        circle(ctx, -22, -32, 5.5);
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        break;

      case 'long':
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(-12, -36);
          ctx.quadraticCurveTo(18, -50, 41, -24);
          ctx.lineTo(37, -17);
          ctx.lineTo(31, -23);
          ctx.lineTo(25, -16);
          ctx.lineTo(19, -23);
          ctx.lineTo(12, -18);
          ctx.lineTo(6, -25);
          ctx.quadraticCurveTo(-4, -26, -12, -36);
          ctx.closePath();
        });
        strand(-2, -41, 16, -48, 34, -32, light, 2.4);
        // mašle
        ctx.save();
        ctx.translate(-15, -39);
        ctx.rotate(-0.45);
        ctx.fillStyle = L.accent;
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 1.8;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(13 * s, -8);
          ctx.quadraticCurveTo(16 * s, 0, 13 * s, 8);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        circle(ctx, 0, 0, 4);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        break;

      case 'quiff':
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(-28, -27);
          ctx.quadraticCurveTo(-20, -56, 10, -58);
          ctx.quadraticCurveTo(44, -58, 47, -32);
          ctx.quadraticCurveTo(39, -36, 30, -27);
          ctx.quadraticCurveTo(12, -37, -28, -27);
          ctx.closePath();
        });
        strand(-14, -44, 10, -56, 36, -46, light, 2.8);
        strand(-6, -36, 14, -46, 34, -36, dark, 1.5);
        break;

      case 'messy': {
        // střapaté pramínky sčesané dopředu
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(-34, 20);
          ctx.quadraticCurveTo(-45, 2, -41, -14);
          const tufts = [[-2.78, 11], [-2.42, 16], [-2.04, 19], [-1.64, 20], [-1.24, 18], [-0.9, 13]];
          for (const [a, len] of tufts) {
            const tip = a + 0.32, r0 = R - 1, r1 = R + len;
            ctx.lineTo(Math.cos(a - 0.15) * r0, Math.sin(a - 0.15) * r0);
            ctx.quadraticCurveTo(Math.cos(a) * (r1 - 3), Math.sin(a) * (r1 - 3), Math.cos(tip) * r1, Math.sin(tip) * r1);
            ctx.quadraticCurveTo(Math.cos(a + 0.12) * (r0 + 2), Math.sin(a + 0.12) * (r0 + 2), Math.cos(a + 0.18) * r0, Math.sin(a + 0.18) * r0);
          }
          ctx.quadraticCurveTo(43, -24, 39, -12);
          ctx.quadraticCurveTo(32, -19, 25, -16);
          ctx.quadraticCurveTo(20, -23, 8, -24);
          ctx.quadraticCurveTo(-10, -21, -17, -5);
          ctx.quadraticCurveTo(-23, 10, -34, 20);
          ctx.closePath();
        });
        strand(-20, -36, 0, -46, 22, -40, light, 2.4);
        strand(-30, -20, -36, -32, -26, -38, light, 1.8);
        break;
      }

      case 'buzz': {
        // krátký sestřih: tenká vrstva vlasů, jemná textura
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(-34, 18);
          ctx.arc(0, -1, R + 2.5, Math.PI * 0.86, Math.PI * 1.83);
          ctx.quadraticCurveTo(26, -25, 6, -27);
          ctx.quadraticCurveTo(-12, -22, -17, -6);
          ctx.quadraticCurveTo(-22, 8, -34, 18);
          ctx.closePath();
        });
        ctx.save();
        circle(ctx, 0, -1, R + 2);
        ctx.clip();
        ctx.fillStyle = light;
        const rng = mulberry32(5);
        for (let i = 0; i < 70; i++) {
          const a = lerp(Math.PI * 0.9, Math.PI * 1.8, rng()), r = R - 1 - rng() * 14;
          const px = Math.cos(a) * r, py = Math.sin(a) * r;
          if (py > -20 && px > -16) continue;
          ctx.fillRect(px, py, 1.4, 1.4);
        }
        ctx.restore();
        strand(-24, -30, -6, -42, 16, -40, light, 2);
        break;
      }

      case 'spiky': {
        // ježek dozadu
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(-34, 20);
          ctx.quadraticCurveTo(-46, 4, -42, -12);
          const spikes = [[-2.8, 16], [-2.45, 22], [-2.08, 25], [-1.72, 25], [-1.36, 22], [-1.02, 17]];
          for (const [a, len] of spikes) {
            const tip = a - 0.22, r0 = R - 1, r1 = R + len;
            ctx.lineTo(Math.cos(a - 0.16) * r0, Math.sin(a - 0.16) * r0);
            ctx.lineTo(Math.cos(tip) * r1, Math.sin(tip) * r1);
            ctx.lineTo(Math.cos(a + 0.16) * r0, Math.sin(a + 0.16) * r0);
          }
          ctx.quadraticCurveTo(40, -26, 37, -20);
          ctx.quadraticCurveTo(24, -23, 8, -25);
          ctx.quadraticCurveTo(-10, -21, -17, -5);
          ctx.quadraticCurveTo(-23, 10, -34, 20);
          ctx.closePath();
        });
        for (const [a, len] of [[-2.08, 25], [-1.72, 25], [-1.36, 22]]) {
          const r1 = R + len - 6;
          strand(Math.cos(a) * (R - 4), Math.sin(a) * (R - 4), Math.cos(a - 0.1) * (R + 6), Math.sin(a - 0.1) * (R + 6), Math.cos(a - 0.18) * r1, Math.sin(a - 0.18) * r1, light, 2);
        }
        break;
      }

      case 'buns': {
        // dva drdoly a ofina na stranu
        const buns = [[-17, -40, 13], [14, -45, 12]];
        for (const [bx, by, br] of buns) {
          shape(() => {
            circle(ctx, bx, by, br);
          });
          strand(bx - br * 0.5, by - br * 0.3, bx, by - br * 0.9, bx + br * 0.5, by - br * 0.4, light, 2);
        }
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(-34, 20);
          ctx.arc(0, -1, R + 2, Math.PI * 0.86, Math.PI * 1.8);
          ctx.quadraticCurveTo(42, -22, 38, -14);
          ctx.quadraticCurveTo(30, -22, 20, -20);
          ctx.quadraticCurveTo(10, -30, -4, -27);
          ctx.quadraticCurveTo(-14, -20, -17, -5);
          ctx.quadraticCurveTo(-23, 10, -34, 20);
          ctx.closePath();
        });
        strand(-14, -34, 6, -44, 28, -32, light, 2.2);
        ctx.fillStyle = L.accent;
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 1.6;
        for (const [bx, by, br] of buns) {
          const a = Math.atan2(by, bx);
          oval(ctx, bx - Math.cos(a) * br * 0.75, by - Math.sin(a) * br * 0.75, 5, 3, a + Math.PI / 2);
          ctx.fill();
          ctx.stroke();
        }
        break;
      }

      case 'fade': {
        // krátko po stranách, objem nahoře vyčesaný dozadu
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(-28, -6);
          ctx.quadraticCurveTo(-38, -20, -30, -34);
          ctx.quadraticCurveTo(-24, -50, -6, -52);
          ctx.quadraticCurveTo(6, -62, 22, -55);
          ctx.quadraticCurveTo(42, -52, 45, -31);
          ctx.quadraticCurveTo(37, -32, 31, -25);
          ctx.quadraticCurveTo(16, -31, 4, -29);
          ctx.quadraticCurveTo(-10, -27, -17, -16);
          ctx.quadraticCurveTo(-22, -9, -28, -6);
          ctx.closePath();
        });
        strand(-18, -42, 4, -56, 30, -46, light, 2.6);
        strand(-10, -36, 10, -46, 34, -36, dark, 1.4);
        strand(-26, -28, -22, -40, -8, -46, light, 1.8);
        break;
      }

      case 'bangs': {
        // husté rovné vlasy s rovně střiženou ofinou přes čelo
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(-34, 16);
          ctx.arc(0, -1, R + 3.5, Math.PI * 0.86, Math.PI * 1.86);
          ctx.quadraticCurveTo(44, -22, 40, -13);
          const pts = [[34, -15], [29, -12], [23, -15.5], [17, -12.5], [11, -15.5], [5, -13], [-1, -16], [-6, -14]];
          for (const [px, py] of pts) ctx.lineTo(px, py);
          ctx.quadraticCurveTo(-13, -10, -15, -2);
          ctx.quadraticCurveTo(-19, 8, -22, 12);
          ctx.quadraticCurveTo(-28, 16, -34, 16);
          ctx.closePath();
        });
        // pramínky v ofině
        ctx.strokeStyle = dark;
        ctx.lineWidth = 1.5;
        for (const [x0, x1] of [[30, 31], [20, 22], [10, 12], [1, 3]]) {
          ctx.beginPath();
          ctx.moveTo(x0 - 6, -34);
          ctx.quadraticCurveTo(x0, -24, x1, -16);
          ctx.stroke();
        }
        strand(-6, -40, 16, -44, 36, -28, light, 2.4);
        strand(-24, -28, -28, -12, -26, 6, light, 1.6);
        break;
      }

      case 'side': {
        // pěšinka vlevo, ofina sčesaná dopředu přes čelo
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(-34, 18);
          ctx.arc(0, -1, R + 3, Math.PI * 0.86, Math.PI * 1.82);
          ctx.quadraticCurveTo(48, -20, 41, -8);
          ctx.quadraticCurveTo(36, -18, 26, -19);
          ctx.quadraticCurveTo(10, -25, -4, -24);
          ctx.quadraticCurveTo(-14, -20, -17, -6);
          ctx.quadraticCurveTo(-23, 9, -34, 18);
          ctx.closePath();
        });
        ctx.strokeStyle = dark;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-16, -40);
        ctx.quadraticCurveTo(-8, -43, -2, -41);
        ctx.stroke();
        strand(-2, -40, 22, -44, 40, -22, light, 2.4);
        strand(-24, -30, -30, -12, -30, 4, light, 1.6);
        break;
      }

      case 'receding': {
        // krátký sestřih, vyšší čelo, pramínek trčí nahoru
        // jen nahoře; boky jsou vystříhané (vrstva 'cap')
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(-40, -4);
          ctx.quadraticCurveTo(-47, -24, -33, -34);
          ctx.quadraticCurveTo(-18, -48, 2, -47);
          ctx.quadraticCurveTo(20, -46, 27, -34);
          ctx.quadraticCurveTo(17, -37, 10, -35);
          ctx.quadraticCurveTo(0, -31, -8, -21);
          ctx.quadraticCurveTo(-16, -10, -24, -8);
          ctx.quadraticCurveTo(-32, -4, -40, -4);
          ctx.closePath();
        });
        strand(-22, -36, -4, -45, 18, -41, light, 2.2);
        strand(-34, -16, -38, -26, -28, -36, light, 1.6);
        // pramínek na temeni
        ctx.strokeStyle = dark;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-4, -41);
        ctx.quadraticCurveTo(-2, -52, 4, -55);
        ctx.stroke();
        ctx.strokeStyle = base;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        break;
      }

      case 'longhair': {
        if (L.fringe === 'side') {
          // ofina sčesaná na stranu a růžová sponka
          shape(() => {
            ctx.beginPath();
            ctx.moveTo(-18, -34);
            ctx.quadraticCurveTo(10, -52, 42, -25);
            ctx.quadraticCurveTo(38, -16, 33, -12);
            ctx.quadraticCurveTo(24, -26, 8, -27);
            ctx.quadraticCurveTo(-6, -27, -18, -34);
            ctx.closePath();
          });
          strand(-6, -41, 14, -48, 34, -30, light, 2.6);
          strand(-26, -30, -26, -42, -12, -44, light, 2);
          ctx.save();
          ctx.translate(-10, -40);
          ctx.rotate(-0.5);
          ctx.fillStyle = L.accent;
          ctx.strokeStyle = OUTLINE;
          ctx.lineWidth = 1.8;
          rrect(ctx, -9, -3.5, 18, 7, 3.5);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        } else if (L.fringe === 'bangs') {
          // rovná ofina a čelenka
          shape(() => {
            ctx.beginPath();
            ctx.moveTo(-20, -32);
            ctx.quadraticCurveTo(6, -52, 41, -26);
            ctx.lineTo(39, -15);
            ctx.lineTo(33, -18);
            ctx.lineTo(27, -14);
            ctx.lineTo(21, -18);
            ctx.lineTo(15, -14);
            ctx.lineTo(9, -18);
            ctx.lineTo(3, -15);
            ctx.quadraticCurveTo(-6, -22, -20, -32);
            ctx.closePath();
          });
          strand(-4, -40, 14, -47, 32, -32, light, 2.4);
          ctx.strokeStyle = L.accent;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(0, -1, R + 1, Math.PI * 1.13, Math.PI * 1.62);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, -1, R + 2, Math.PI * 1.18, Math.PI * 1.5);
          ctx.stroke();
        } else {
          // pěšinka uprostřed, mašle
          shape(() => {
            ctx.beginPath();
            ctx.moveTo(-12, -36);
            ctx.quadraticCurveTo(18, -50, 41, -24);
            ctx.lineTo(37, -17);
            ctx.lineTo(31, -23);
            ctx.lineTo(25, -16);
            ctx.lineTo(19, -23);
            ctx.lineTo(12, -18);
            ctx.lineTo(6, -25);
            ctx.quadraticCurveTo(-4, -26, -12, -36);
            ctx.closePath();
          });
          strand(-2, -41, 16, -48, 34, -32, light, 2.4);
          if (!L.noBow) {
          ctx.save();
          ctx.translate(-15, -39);
          ctx.rotate(-0.45);
          ctx.fillStyle = L.accent;
          ctx.strokeStyle = OUTLINE;
          ctx.lineWidth = 1.8;
          for (const sd of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(13 * sd, -8);
            ctx.quadraticCurveTo(16 * sd, 0, 13 * sd, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          circle(ctx, 0, 0, 4);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          }
        }
        // pramen vlasů před uchem dolů na rameno
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(-22, -22);
          ctx.quadraticCurveTo(-30, 0, -26, 30);
          ctx.quadraticCurveTo(-24, 40, -18, 36);
          ctx.quadraticCurveTo(-20, 10, -14, -14);
          ctx.closePath();
        });
        break;
      }

      case 'curlytop': {
        // objemné vlny vyčesané nahoru a dozadu, jedna kudrna padá do čela
        shape(() => wavyPath([
          [-32, 20], [-44, 6, 5], [-49, -13, 6], [-45, -33, 6], [-33, -51, 7], [-14, -63, 7], [7, -67, 7],
          [25, -61, 6], [39, -49, 6], [46, -35, 4], [30, -31, -2], [12, -32], [-4, -27], [-15, -8], [-20, 8], [-32, 20],
        ]));
        strand(34, -42, 14, -58, -10, -58, dark, 1.8);
        strand(22, -35, 0, -47, -24, -45, dark, 1.6);
        strand(-6, -29, -26, -36, -38, -22, dark, 1.5);
        strand(-18, -57, -38, -50, -42, -30, dark, 1.5);
        strand(30, -52, 12, -63, -8, -63, light, 2.4);
        strand(-14, -50, -32, -47, -40, -35, light, 2.2);
        strand(14, -45, 2, -54, -14, -54, light, 1.8);
        for (const [x, y, a] of [[-41, -40, 3.6], [-24, -60, 4.1], [-2, -66, 4.4], [18, -64, 4.8], [38, -48, 5.4]]) hook(x, y, 4.2, a, light, 1.8);
        // kudrna do čela
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(20, -33);
          ctx.quadraticCurveTo(40, -33, 37, -19);
          ctx.quadraticCurveTo(35, -9, 27, -12);
          ctx.quadraticCurveTo(33, -17, 30, -24);
          ctx.quadraticCurveTo(27, -29, 18, -30);
          ctx.closePath();
        });
        strand(24, -31, 35, -29, 33, -18, light, 1.8);
        break;
      }

      case 'curlyshort': {
        // krátké husté kudrny nahoře, vystříhané strany
        const pts = [];
        for (let a = -2.4; a <= -0.8; a += 0.19) pts.push([Math.cos(a) * (R - 4), Math.sin(a) * (R - 4), 7.4]);
        for (let a = -2.2; a <= -0.95; a += 0.21) pts.push([Math.cos(a) * (R + 3), Math.sin(a) * (R + 3), 7]);
        pts.push([-4, -49, 6.4], [12, -48, 6.4], [30, -32, 6], [36, -25, 4.6]);
        blobs(pts);
        curlTex(pts, 1);
        break;
      }

      case 'shaggy': {
        // střapaté vlasy s ofinou přes čelo až k obočí
        shape(() => {
          ctx.beginPath();
          ctx.moveTo(-30, 16);
          ctx.quadraticCurveTo(-49, 4, -46, -16);
          ctx.quadraticCurveTo(-46, -40, -30, -48);
          ctx.lineTo(-27, -56);
          ctx.lineTo(-18, -51);
          ctx.lineTo(-10, -60);
          ctx.lineTo(-2, -53);
          ctx.lineTo(8, -60);
          ctx.lineTo(14, -53);
          ctx.quadraticCurveTo(28, -52, 33, -44);
          ctx.quadraticCurveTo(47, -33, 45, -17);
          const tips = [[42, -10], [37, -19], [33, -9], [28, -18], [23, -11], [17, -20], [11, -13], [5, -22], [-2, -15], [-7, -23]];
          for (const [x, y] of tips) ctx.lineTo(x, y);
          ctx.quadraticCurveTo(-14, -18, -16, -4);
          ctx.lineTo(-19, 7);
          ctx.lineTo(-24, 1);
          ctx.quadraticCurveTo(-26, 10, -30, 16);
          ctx.closePath();
        });
        strand(-30, -36, -8, -50, 22, -46, light, 2.4);
        strand(-38, -20, -40, -36, -26, -44, light, 1.8);
        strand(6, -38, 20, -36, 30, -22, light, 1.8);
        strand(-4, -36, 6, -30, 10, -16, dark, 1.4);
        strand(18, -40, 28, -32, 34, -14, dark, 1.4);
        strand(-20, -30, -24, -16, -22, 0, dark, 1.4);
        break;
      }

      case 'wavyshort': {
        // blond vlny, ofina do čela, vzadu kratší
        shape(() => wavyPath([
          [-32, 20], [-43, 4, 4], [-46, -16, 5], [-41, -36, 5], [-27, -51, 5], [-7, -59, 5], [14, -57, 5],
          [31, -50, 5], [42, -38, 4], [45, -24, 3], [37, -21, -2], [28, -26, 3], [17, -22, 3], [4, -28], [-12, -14], [-20, 8], [-32, 20],
        ]));
        strand(36, -40, 16, -54, -8, -55, light, 2.4);
        strand(24, -30, 6, -44, -20, -46, dark, 1.5);
        strand(-14, -40, -32, -40, -40, -24, light, 2);
        strand(-4, -32, -20, -30, -30, -14, dark, 1.4);
        for (const [x, y, a] of [[-38, -40, 3.6], [-14, -57, 4.2], [12, -57, 4.6], [36, -44, 5.4]]) hook(x, y, 4, a, light, 1.8);
        break;
      }

      case 'wavy': {
        // objemné vlny nahoře a dozadu
        const top = [];
        for (let a = -3.25; a <= -0.62; a += 0.33) top.push([Math.cos(a) * (R - 2), Math.sin(a) * (R - 2) - 2, 12.5]);
        blobs(top);
        // prameny do čela (patka rozdělená uprostřed)
        blobs([[8, -29, 9], [20, -27, 8.5], [31, -22, 7.5], [38, -14, 5]]);
        ctx.strokeStyle = dark;
        ctx.lineWidth = 1.6;
        for (const [x, y, r] of [[8, -29, 9], [20, -27, 8.5], [31, -22, 7.5]]) {
          ctx.beginPath();
          ctx.arc(x + 1.5, y + 1, r * 0.55, 0.1 * Math.PI, 1.1 * Math.PI);
          ctx.stroke();
        }
        // světlé konečky vln
        ctx.strokeStyle = light;
        ctx.lineWidth = 2.2;
        top.forEach(([x, y, r], i) => {
          if (i % 2) return;
          ctx.beginPath();
          ctx.arc(x - 1, y - 1, r * 0.6, 1.15 * Math.PI, 1.65 * Math.PI);
          ctx.stroke();
        });
        break;
      }
    }
  },

  drawDizzyEye(ctx, x, y, r, t) {
    ctx.fillStyle = '#ffffff';
    circle(ctx, x, y, r + 1);
    ctx.fill();
    ctx.strokeStyle = 'rgba(28,16,10,.8)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    const rot = t * 14;
    for (let i = 0; i <= 30; i++) {
      const a = rot + i * 0.42, rr = (i / 30) * r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.strokeStyle = '#2a1a12';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  },

  // Žlutá karta nad hlavou zpomaleného hráče (na konci bliká).
  drawYellow(ctx, p, now) {
    if (p.yellowT < 1 && Math.floor(now / 110) % 2) return;
    const a = Math.min(1, p.yellowT * 3, (YELLOW_TIME - p.yellowT) * 6 + 0.2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(p.x - p.dir * (p.R + 14), p.y - p.R * 0.75 + Math.sin(now * 0.005) * 3);
    ctx.rotate(0.18 + Math.sin(now * 0.003) * 0.06);
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = '#4a3a00';
    ctx.lineWidth = 2.2;
    rrect(ctx, -9, -13, 18, 26, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    rrect(ctx, -6, -10, 5, 18, 2);
    ctx.fill();
    ctx.restore();
    // pomalé kapky potu
    const t = (now * 0.0012 + p.x * 0.01) % 1;
    ctx.fillStyle = `rgba(150,205,255,${0.8 * (1 - t)})`;
    circle(ctx, p.x - p.dir * 26, p.y - p.R * 0.4 + t * 18, 2.6);
    ctx.fill();
  },

  // Hvězdičky kolem hlavy omámeného hráče.
  drawDizzy(ctx, p, now) {
    const cx = p.x, cy = p.y - p.R - 6;
    for (let i = 0; i < 3; i++) {
      const a = now * 0.006 + (i * TAU) / 3;
      const x = cx + Math.cos(a) * 34, y = cy + Math.sin(a) * 10;
      ctx.fillStyle = '#ffe14d';
      star(ctx, x, y, 8, 3.6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,50,0,.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  },

  drawFace(ctx, p, ball) {
    const L = p.look;
    let lx = (ball.x - p.x) * p.dir, ly = ball.y - p.y;
    const ln = Math.hypot(lx, ly) || 1;
    lx /= ln;
    ly /= ln;

    // tváře a pihy
    ctx.fillStyle = L.girl ? 'rgba(255,100,120,.3)' : 'rgba(235,110,90,.16)';
    oval(ctx, 16, 11, L.chub ? 8 : 6, L.chub ? 5 : 3.6);
    ctx.fill();
    if (L.chub) {
      // dvojitá brada
      ctx.strokeStyle = shade(L.skin, -0.3);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(18, 22, 13, 0.35 * Math.PI, 0.78 * Math.PI);
      ctx.stroke();
    }
    if (L.freckles) {
      const soft = L.freckles === 'light';
      ctx.fillStyle = soft ? 'rgba(170,90,45,.26)' : 'rgba(160,75,30,.55)';
      const dots = soft ? [[13, 6], [18, 8], [31, 6], [35, 8.5]] : [[12, 8], [16, 6.5], [19.5, 9], [14.5, 11], [33, 7], [35.5, 10]];
      for (const [fx, fy] of dots) {
        circle(ctx, fx, fy, soft ? 0.95 : 1.1);
        ctx.fill();
      }
    }

    // oční stíny (holky v klubu)
    if (L.shadow && !(p.stunT > 0) && !(p.flashT > 0)) {
      ctx.fillStyle = hexA(L.shadow, 0.45);
      oval(ctx, 8, -8.5, 7.5, 4.5, -0.15);
      ctx.fill();
      oval(ctx, 27.5, -9, 8.5, 5, 0.1);
      ctx.fill();
    }
    // oči (odstřelený hráč má spirály)
    if (p.flashT > 0) {
      // vyvalené oči, trochu pulzují
      const pz = 1 + Math.sin(p.flashT * 14) * 0.06;
      this.drawStareEye(ctx, 8, -4, 9.5 * pz);
      this.drawStareEye(ctx, 28, -4, 11 * pz);
    } else if (p.stunT > 0) {
      this.drawDizzyEye(ctx, 9, -3, 6, p.stunT);
      this.drawDizzyEye(ctx, 27, -3, 7, p.stunT);
    } else {
      this.drawEye(ctx, p, L, 9, -3, 5.4, 6.8, lx, ly, false);
      this.drawEye(ctx, p, L, 27, -3, 6.2, 7.6, lx, ly, true);
    }

    // obočí: soustředění při kopu, smutek po inkasovaném gólu
    let inner = 0, outer = 0;
    if (p.flashT > 0) { inner = -6; outer = -6; }
    else if (p.mood < 0) inner = -3.5;
    else if (p.kickT >= 0) inner = 3;
    else if (p.mood > 0) outer = -2.5;
    ctx.strokeStyle = L.brow;
    ctx.lineWidth = L.browW || (L.girl ? 2.6 : 3.4);
    ctx.lineCap = 'round';
    const arch = L.browFlat ? 1.2 : 3.5;
    ctx.beginPath();
    ctx.moveTo(3, -14 + outer);
    ctx.quadraticCurveTo(8, -14 - arch, 14, -14.5 + inner);
    ctx.moveTo(21, -14.5 + inner);
    ctx.quadraticCurveTo(28, -15 - arch, 34, -15 + outer);
    ctx.stroke();

    // nos
    ctx.strokeStyle = shade(L.skin, -0.32);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(35, 1);
    ctx.quadraticCurveTo(40.5, 6, 35, 8.5);
    ctx.stroke();

    // pusa
    const lip = L.lipstick || (L.girl ? '#c23d5a' : '#8a3a2c');
    const open = p.mood > 0 || p.kickT >= 0 || p.flashT > 0 || (!p.onGround && p.vy < -200);
    if (open) {
      ctx.fillStyle = '#5a1a1c';
      oval(ctx, 25, 18.5, 5.5, p.mood > 0 ? 5.5 : 4);
      ctx.fill();
      ctx.fillStyle = '#e46a70';
      oval(ctx, 25, 21, 3.2, 1.8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(21.5, 14, 7, 1.8);
      if (L.lipstick) {
        ctx.strokeStyle = L.lipstick;
        ctx.lineWidth = 2.6;
        oval(ctx, 25, 18.5, 6, p.mood > 0 ? 6 : 4.5);
        ctx.stroke();
      }
    } else if (L.lipstick && !(p.mood < 0)) {
      // plné namalované rty
      ctx.fillStyle = L.lipstick;
      ctx.beginPath();
      ctx.moveTo(19.5, 19);
      ctx.quadraticCurveTo(22, 15.4, 25, 17.3);
      ctx.quadraticCurveTo(28, 15.4, 30.5, 19);
      ctx.quadraticCurveTo(25, 25.5, 19.5, 19);
      ctx.fill();
      ctx.strokeStyle = shade(L.lipstick, -0.4);
      ctx.lineWidth = 1;
      line(ctx, 20.5, 19.2, 29.5, 19.2);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      oval(ctx, 26.5, 21, 1.7, 0.8);
      ctx.fill();
    } else if (p.mood < 0) {
      ctx.strokeStyle = lip;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(25, 24, 6, 1.22 * Math.PI, 1.78 * Math.PI);
      ctx.stroke();
    } else if (L.mouth === 'flat') {
      // klidný, vážný výraz
      ctx.strokeStyle = lip;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(19.5, 19.5);
      ctx.quadraticCurveTo(25, 20.6, 30.5, 19.2);
      ctx.stroke();
    } else if (L.mouth === 'smirk') {
      // úšklebek na jednu stranu
      ctx.strokeStyle = lip;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(19.5, 19.8);
      ctx.quadraticCurveTo(26, 21.5, 31.5, 16.5);
      ctx.stroke();
    } else {
      ctx.strokeStyle = lip;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(25, 13, 6.5, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }
    // strniště
    if (L.stubble) {
      // jemné strniště na bradě a čelisti
      ctx.save();
      circle(ctx, 0, 0, 40);
      ctx.clip();
      ctx.fillStyle = 'rgba(170,130,90,.1)';
      ctx.beginPath();
      ctx.ellipse(18, 25, 22, 12, 0.15, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(150,110,70,.28)';
      const rng = mulberry32(3);
      for (let i = 0; i < 26; i++) {
        const a = rng() * Math.PI, d = 0.55 + rng() * 0.45;
        ctx.fillRect(18 + Math.cos(a) * 21 * d, 22 + Math.sin(a) * 12 * d, 0.8, 0.8);
      }
      ctx.restore();
    }
    // starší pán: vrásky na čele a u očí
    if (L.old) {
      ctx.strokeStyle = 'rgba(120,70,45,.38)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      for (const [y, w] of [[-27, 11], [-22.5, 13]]) {
        ctx.beginPath();
        ctx.moveTo(18 - w, y + 1);
        ctx.quadraticCurveTo(18, y - 1.5, 18 + w, y + 1);
        ctx.stroke();
      }
      for (const dy of [-2, 1.5, 5]) line(ctx, 36, -2 + dy * 0.4, 40, -3 + dy);
      ctx.beginPath();
      ctx.moveTo(14, 7);
      ctx.quadraticCurveTo(12, 14, 15, 19);
      ctx.stroke();
    }
    // králík: růžový čumáček, vousky a dva zoubky
    if (L.bunny) {
      ctx.fillStyle = '#f58aa8';
      ctx.beginPath();
      ctx.moveTo(33, 4);
      ctx.lineTo(40, 4);
      ctx.lineTo(36.5, 9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,40,40,.55)';
      ctx.lineWidth = 1;
      for (const [y1, y2] of [[8, 5], [10, 10], [12, 15]]) {
        line(ctx, 30, y1, 14, y2);
        line(ctx, 40, y1, 47, y2 - 1);
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(22.5, 19.5, 3.4, 5);
      ctx.fillRect(26.2, 19.5, 3.4, 5);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1;
      ctx.strokeRect(22.5, 19.5, 3.4, 5);
      ctx.strokeRect(26.2, 19.5, 3.4, 5);
    }
    // lehké vousy (Tlustej páv): po bradě a čelisti, knírek
    if (L.beard) {
      ctx.save();
      circle(ctx, 0, 0, 39);
      ctx.clip();
      const full = L.beard === 'full';
      if (full) {
        // plnovous: tváře a čelist od ucha po bradu (pusa zůstane vidět)
        ctx.fillStyle = L.hairColor;
        ctx.beginPath();
        ctx.moveTo(-8, 6);
        ctx.quadraticCurveTo(0, 11, 14, 10);
        ctx.lineTo(42, 8);
        ctx.lineTo(46, 52);
        ctx.lineTo(-30, 52);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = hexA(L.hairLight, 0.5);
        const rr = mulberry32(9);
        for (let i = 0; i < 40; i++) ctx.fillRect(-8 + rr() * 46, 12 + rr() * 24, 1.4, 2.4);
      }
      ctx.fillStyle = hexA(L.hairColor, full ? 0.92 : 0.38);
      ctx.beginPath();
      ctx.moveTo(-14, 12);
      ctx.quadraticCurveTo(-6, 30, 14, 33);
      ctx.quadraticCurveTo(32, 33, 40, 22);
      ctx.lineTo(40, 30);
      ctx.lineTo(40, 45);
      ctx.lineTo(-20, 45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = hexA(L.hairDark, 0.55);
      const rng = mulberry32(7);
      for (let i = 0; i < 70; i++) {
        const a = 0.05 + rng() * 2.9, d = 0.72 + rng() * 0.3;
        const x = 14 + Math.cos(a) * 26 * d, y = 20 + Math.sin(a) * 15 * d;
        if (y < 23 && x > 15 && x < 35) continue; // kolem pusy holo
        ctx.fillRect(x, y, 1.3, 1.3);
      }
      ctx.strokeStyle = hexA(full ? L.hairColor : L.hairDark, full ? 1 : 0.7);
      ctx.lineWidth = full ? 4 : 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(19, 15);
      ctx.quadraticCurveTo(25, 12.5, 32, 14.5);
      ctx.stroke();
      if (full) {
        // pusa vykukuje z plnovousu
        ctx.strokeStyle = '#e29a8a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(20, 20);
        ctx.quadraticCurveTo(25.5, 22.5, 31, 19.5);
        ctx.stroke();
      }
      ctx.restore();
    }
    // rozhodčí píská
    if (L.ref && p.blow) {
      ctx.fillStyle = '#d9dee6';
      ctx.strokeStyle = 'rgba(40,40,50,.8)';
      ctx.lineWidth = 1.4;
      rrect(ctx, 24, 14, 16, 8, 3);
      ctx.fill();
      ctx.stroke();
      circle(ctx, 40, 20, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fillRect(26, 15.5, 8, 1.6);
      // nafouknutá tvář
      ctx.fillStyle = 'rgba(240,120,110,.3)';
      circle(ctx, 18, 12, 6);
      ctx.fill();
    }
    // piercing v nose
    if (L.pierce) {
      ctx.fillStyle = L.pierce;
      circle(ctx, 37.2, 6.2, 1.9);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,40,50,.7)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      circle(ctx, 36.6, 5.6, 0.6);
      ctx.fill();
    }
  },

  // Oko: velká duhovka, víčko nahoře; dívá se k míči.
  drawEye(ctx, p, L, ex, ey, rx, ry, lx, ly, front) {
    const lidC = '#2c1a12';
    if (p.blink > 0) {
      ctx.strokeStyle = lidC;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(ex, ey - 2, rx, 0.18 * Math.PI, 0.82 * Math.PI);
      ctx.stroke();
      return;
    }
    ctx.save();
    oval(ctx, ex, ey, rx, ry);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.clip();
    const ix = ex + lx * rx * 0.3, iy = ey + ly * ry * 0.2 + 0.8;
    const ir = ry * 0.72;
    ctx.fillStyle = L.eyes;
    circle(ctx, ix, iy, ir);
    ctx.fill();
    ctx.fillStyle = shade(L.eyes, 0.35);
    circle(ctx, ix, iy + ir * 0.35, ir * 0.55);
    ctx.fill();
    ctx.fillStyle = '#15110e';
    circle(ctx, ix, iy, ir * 0.48);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    circle(ctx, ix + ir * 0.35, iy - ir * 0.4, ir * 0.28);
    ctx.fill();
    circle(ctx, ix - ir * 0.35, iy + ir * 0.35, ir * 0.12);
    ctx.fill();
    // stín víčka
    ctx.fillStyle = 'rgba(60,30,20,.18)';
    ctx.fillRect(ex - rx, ey - ry, rx * 2, ry * 0.45);
    // přivřené víčko (vážnější pohled)
    const lh = L.lid ? ry * 2 * L.lid : 0;
    if (lh) {
      ctx.fillStyle = shade(L.skin, -0.05);
      ctx.fillRect(ex - rx - 1, ey - ry - 1, rx * 2 + 2, lh + 1);
    }
    ctx.restore();
    // horní víčko
    ctx.strokeStyle = lidC;
    ctx.lineWidth = L.girl ? 2.8 : 2.3;
    ctx.beginPath();
    if (lh) {
      const ly0 = ey - ry + lh;
      const half = Math.sqrt(Math.max(0, 1 - ((ly0 - ey) / ry) ** 2)) * rx;
      ctx.moveTo(ex - half - 0.8, ly0 + 0.8);
      ctx.quadraticCurveTo(ex, ly0 - 1.6, ex + half + 0.8, ly0 + 0.3);
      ctx.stroke();
      // záhyb víčka
      ctx.strokeStyle = shade(L.skin, -0.3);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ex - rx * 0.8, ey - ry - 0.5);
      ctx.quadraticCurveTo(ex, ey - ry - 2.6, ex + rx * 0.9, ey - ry - 0.8);
    } else {
      ctx.ellipse(ex, ey, rx + 0.3, ry + 0.3, 0, Math.PI * 1.05, Math.PI * 1.95);
    }
    ctx.stroke();
    if (L.girl) {
      ctx.lineWidth = 1.8;
      const a = Math.PI * 1.9, sx = ex + Math.cos(a) * rx, sy = ey + Math.sin(a) * ry;
      line(ctx, sx, sy, sx + 3.5, sy - 2.5);
      if (front) line(ctx, sx - 2, sy - 1.8, sx + 0.5, sy - 5);
    }
  },

  drawTag(ctx, p, teams) {
    if (!p.label) return;
    const x = p.x, y = Math.max(16, p.y - p.R - 34);
    const me = p.label === 'TY';
    ctx.font = `800 17px ${FONT_U}`;
    const w = ctx.measureText(p.label).width + 16;
    ctx.fillStyle = me ? '#ffc93c' : p.isHuman ? teams[p.team].color : 'rgba(8,13,26,.62)';
    rrect(ctx, x - w / 2, y - 11, w, 21, 6);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 10);
    ctx.lineTo(x + 5, y + 10);
    ctx.lineTo(x, y + 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = me ? '#0b1220' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.label, x, y + 0.5);
  },

  // Úvodní obrazovka: dvojice na osvětleném pódiu, střídají se.
  drawHero(cv, now) {
    if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const k = Math.min(w / 520, h / 380) * dpr;
    ctx.setTransform(k, 0, 0, k, cv.width / 2 - 260 * k, cv.height - 380 * k);
    // v menu se střídají jen dvojice, které hráč zná (bez Vietnamců a zamčených)
    const shown = DUO_TEAMS.filter((d) => !d.viet && (!d.locked || Unlocks.has(d.locked)));
    const per = 5200, idx = Math.floor(now / per) % shown.length, t = now % per;
    const T = shown[idx];
    const enter = easeOutBack(clamp(t / 500, 0, 1)), exit = clamp((t - per + 420) / 420, 0, 1);
    const a = clamp(enter, 0, 1) * (1 - exit);
    // pódium a světlo
    ctx.save();
    ctx.globalAlpha = 0.9 * a;
    const beam = ctx.createLinearGradient(0, 0, 0, 330);
    beam.addColorStop(0, 'rgba(255,255,255,0)');
    beam.addColorStop(1, hexA(T.color, 0.35));
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(220, -20);
    ctx.lineTo(300, -20);
    ctx.lineTo(470, 330);
    ctx.lineTo(50, 330);
    ctx.closePath();
    ctx.fill();
    const pod = ctx.createRadialGradient(260, 330, 10, 260, 330, 200);
    pod.addColorStop(0, hexA(T.light, 0.9));
    pod.addColorStop(0.5, hexA(T.color, 0.55));
    pod.addColorStop(1, hexA(T.dark, 0));
    ctx.fillStyle = pod;
    oval(ctx, 260, 330, 200, 34);
    ctx.fill();
    ctx.restore();
    // postavy
    const slide = (1 - enter) * 60 + exit * 60;
    const figs = T.chars.map((id, i) => ({ look: charById(id), x: 180 + i * 160 + (i === 0 ? -slide : slide), dir: i === 0 ? 1 : -1 }));
    const happy = t > 2200 && t < 3300;
    ctx.save();
    ctx.globalAlpha = a;
    figs.forEach((f, i) => {
      const bob = Math.sin(now * 0.004 + i * 1.7) * 4;
      this.drawFigure(ctx, f.look, T, f.x, 196 + bob, 1.55, f.dir, happy ? 1 : 0, { x: 260, y: 120 });
    });
    // jmenovka
    ctx.font = `30px ${FONT_D}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(T.name).width + 40;
    ctx.fillStyle = T.color;
    rrect(ctx, 260 - tw / 2, 340, tw, 40, 20);
    ctx.fill();
    ctx.fillStyle = T.dark;
    ctx.fillRect(260 - tw / 2 + 14, 376, tw - 28, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(T.name, 260, 361);
    ctx.restore();
  },

  // Portrét postavy pro výběr hráčů.
  // Portrét postavy. S časem `t` (sekundy) je živý: dýchá, mrká a rozhlíží se.
  portrait(canvas, charId, team, facing, t, opts) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 80, h = canvas.clientHeight || 100;
    const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const look = typeof charId === 'string' ? lookFor(charId, opts && opts.skin) : charId;
    let p = canvas._pl;
    if (!p || p.look !== look) {
      p = canvas._pl = new Player({ team: 0, x: 0, look, role: 'attacker', ctrl: 'cpu' });
      canvas._ph = Math.random() * 10;
    }
    const extra = (p.F - PHYS.footH) / PS; // vysoký hráč má delší nohy
    if (opts && opts.head) {
      // jen hlava (malé ikonky): přiblížit na obličej
      const kh = (Math.min(w, h) * dpr) / (p.R * 2.5);
      ctx.setTransform(kh, 0, 0, kh, canvas.width / 2, canvas.height / 2 + p.R * 0.12 * kh);
      p.x = 0;
      p.y = 0;
      p.skin = (opts && opts.skin) || '';
      p.dir = facing;
      p.blink = 0;
      p.mood = 0;
      p.homeX = (canvas._ph || 0) * 100;
      this.drawPlayer(ctx, p, { x: facing * 300, y: -20 }, [team], 0);
      return;
    }
    const k = (Math.min(w / 126, h / (170 + extra)) * dpr) / PS;
    const live = typeof t === 'number';
    const ph = canvas._ph || 0;
    const bob = live ? Math.sin(t * 2.2 + ph) * 1.6 : 0;
    ctx.setTransform(k, 0, 0, k, canvas.width / 2, canvas.height / 2 - (8 + extra / 2 - bob) * k * PS);
    p.x = 0;
    p.y = 0;
    p.dir = facing;
    p.blink = live && (t + ph) % 3.4 < 0.13 ? 0.1 : 0;
    p.mood = opts && opts.happy ? 1 : 0;
    p.skin = (opts && opts.skin) || '';
    p.homeX = ph * 100;
    const eye = live ? { x: facing * 300, y: -20 + Math.sin(t * 0.7 + ph) * 60 } : { x: facing * 300, y: -20 };
    this.drawPlayer(ctx, p, eye, [team], live ? t * 1000 : 0);
  },

  /* ---- penalty ---- */

  // Penaltová tabulka pod skóre a nápověda dole.
  drawPenHUD(ctx, g, now) {
    const P = g.pen, m = g.match, cx = W / 2, y = 96;
    const n = Math.max(PEN_ROUNDS, P.kicks[0].length, P.kicks[1].length);
    const dot = 15, gap = 5, rowW = n * (dot + gap);
    ctx.save();
    ctx.fillStyle = 'rgba(8,13,26,.85)';
    rrect(ctx, cx - rowW - 34, y - 14, rowW * 2 + 68, 28, 10);
    ctx.fill();
    for (let t = 0; t < 2; t++) {
      const ks = P.kicks[t];
      for (let i = 0; i < n; i++) {
        const dx = t === 0 ? cx - 24 - (n - i) * (dot + gap) + dot / 2 : cx + 24 + i * (dot + gap) + dot / 2;
        const v = ks[i];
        ctx.fillStyle = v === undefined ? 'rgba(255,255,255,.18)' : v ? '#3ee08f' : '#ff5a4f';
        circle(ctx, dx, y, dot / 2);
        ctx.fill();
        if (v === undefined && P.turn === t && i === ks.length && Math.floor(now / 300) % 2) {
          ctx.strokeStyle = '#ffd23f';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }
    ctx.font = `800 16px ${FONT_U}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(`${m.pens ? m.pens[0] : 0}:${m.pens ? m.pens[1] : 0}`, cx, y + 1);
    // nápověda pro hráče na tomto zařízení
    const me = g.myPlayer && g.myPlayer();
    const idx = me ? m.players.indexOf(me) : -1;
    let tip = '';
    const touch = typeof Touch !== 'undefined' && Touch.enabled;
    if (idx === P.shooter && P.phase === 'aim') tip = touch ? 'Joystickem miř, STŘELA = kop' : 'Miř šipkami nebo WASD, mezerník = kop';
    else if (idx === P.keeper && (P.phase === 'aim' || (P.phase === 'flight' && !P.res))) tip = touch ? 'Chytáš! Joystickem skoč do strany (nahoru = vysoko), SKOK = vysoko doprostřed' : 'Chytáš! A/D do strany, W vysoko, S nízko';
    if (tip) {
      ctx.font = `800 20px ${FONT_U}`;
      const tw = ctx.measureText(tip).width + 30, ty = 136;
      ctx.fillStyle = 'rgba(8,13,26,.82)';
      rrect(ctx, cx - tw / 2, ty - 17, tw, 34, 17);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tip, cx, ty + 1);
    }
    ctx.restore();
  },

  /* ---- Marsalova trojka ---- */

  drawBasketball(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    const g = ctx.createRadialGradient(-b.r * 0.35, -b.r * 0.4, 2, 0, 0, b.r);
    g.addColorStop(0, '#ffb36b');
    g.addColorStop(0.6, '#f0782a');
    g.addColorStop(1, '#b84a12');
    ctx.fillStyle = g;
    circle(ctx, 0, 0, b.r);
    ctx.fill();
    ctx.save();
    circle(ctx, 0, 0, b.r);
    ctx.clip();
    ctx.rotate(b.rot);
    ctx.strokeStyle = '#2a1408';
    ctx.lineWidth = 1.8;
    line(ctx, -b.r, 0, b.r, 0);
    line(ctx, 0, -b.r, 0, b.r);
    ctx.beginPath();
    ctx.arc(-b.r * 1.15, 0, b.r * 0.85, -0.9, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(b.r * 1.15, 0, b.r * 0.85, Math.PI - 0.9, Math.PI + 0.9);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(60,20,0,.7)';
    ctx.lineWidth = 2;
    circle(ctx, 0, 0, b.r);
    ctx.stroke();
    ctx.restore();
  },

  // Koš nad bránou soupeře (zadní část před míčem, přední po něm).
  drawHoop(ctx, b, now, front) {
    const side = b.basketSide;
    if (side !== 0 && side !== 1) return;
    const s = side === 0 ? 1 : -1;
    const hx = side === 0 ? GOAL_W * 0.5 : W - GOAL_W * 0.5, hy = BASKET_Y;
    const age = b.carryBy >= 0 ? 0 : 4 - b.basketT;
    const k = easeOutBack(clamp((age + 0.15) / 0.35, 0, 1));
    ctx.save();
    ctx.translate(hx, BAR_Y);
    ctx.scale(1, k);
    ctx.translate(-hx, -BAR_Y);
    const ring = '#ff5a1f';
    if (!front) {
      // sloup na střeše brány a deska
      const bx = hx - s * 46;
      ctx.fillStyle = '#9aa3b2';
      ctx.fillRect(bx - 3, hy - 20, 6, BAR_Y - hy + 20);
      ctx.fillStyle = 'rgba(240,246,255,.92)';
      ctx.strokeStyle = '#1b2232';
      ctx.lineWidth = 3;
      rrect(ctx, bx - 5, hy - 74, 10, 82, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ring;
      ctx.fillRect(bx - 5, hy - 40, 10, 24);
      // držák a zadní polovina obroučky
      ctx.strokeStyle = '#8c95a5';
      ctx.lineWidth = 4;
      line(ctx, bx, hy, hx - s * 32, hy);
      ctx.strokeStyle = ring;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(hx, hy, 33, 7, 0, Math.PI, TAU);
      ctx.stroke();
    } else {
      // síťka a přední polovina obroučky
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 1.6;
      const sw = Math.sin(now * 0.02) * (b.swished ? 3 : 0);
      for (let i = -3; i <= 3; i++) {
        const x0 = hx + i * 10, x1 = hx + i * 6 + sw;
        line(ctx, x0, hy + 2, x1, hy + 40);
      }
      for (let j = 1; j <= 3; j++) {
        const yy = hy + j * 11, w = 33 - j * 4;
        ctx.beginPath();
        ctx.ellipse(hx + sw * j / 3, yy, w, 4, 0, 0, Math.PI);
        ctx.stroke();
      }
      ctx.strokeStyle = ring;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.ellipse(hx, hy, 33, 7, 0, 0, Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  },

  /* ---- rozhodčí ---- */

  // V úvodu stojí rozhodčí uprostřed hřiště, píská a pak odběhne.
  drawReferee(ctx, g, ball, now) {
    const t = g.stateT;
    if (t < 0.4) return;
    let p = this.refP;
    if (!p) p = this.refP = new Player({ team: 0, x: W / 2, look: REFEREE, role: 'attacker', ctrl: 'cpu' });
    const out = clamp((t - REF_END) / 1.7, 0, 1);
    const x = W / 2 + easeInQuad(out) * (W / 2 + 200);
    const vx = out > 0 && out < 1 ? 520 : 0;
    p.x = x;
    p.y = p.standY;
    p.vx = vx;
    p.vy = 0;
    p.onGround = true;
    p.dir = out > 0 ? 1 : -1;
    p.runPhase = x * 0.05;
    p.blink = (t % 3.1) < 0.12 ? 0.1 : 0;
    p.blow = t > REF_AT + 0.75 && t < REF_AT + 1.45;
    p.mood = 0;
    if (x > W + 150) return;
    this.drawShadow(ctx, p.x, 0, 36 * PS);
    this.drawPlayer(ctx, p, { x: p.x + p.dir * 300, y: p.y - 10 }, [REF_T], now);
  },

  // Titulek rozcvičky.
  drawWarmBanner(ctx, g, now) {
    const t = g.stateT - WARM_AT, dur = WARM_END - WARM_AT;
    if (t < 0 || t > dur) return;
    const a = clamp(t / 0.3, 0, 1) * clamp((dur - t) / 0.3, 0, 1);
    const v = this.view, cx = (v.x0 + v.x1) / 2;
    ctx.save();
    ctx.globalAlpha = a;
    const y = v.y0 + 96 + (1 - easeOutBack(clamp(t / 0.4, 0, 1))) * -60;
    ctx.font = `44px ${FONT_D}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText('ROZCVIČKA').width + 70;
    ctx.fillStyle = 'rgba(8,13,26,.85)';
    rrect(ctx, cx - w / 2, y - 34, w, 68, 20);
    ctx.fill();
    ctx.strokeStyle = '#ffc93c';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ffc93c';
    ctx.fillText('ROZCVIČKA', cx, y - 4);
    ctx.font = `800 17px ${FONT_U}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Hráči se rozehřívají před zápasem', cx, y + 22);
    ctx.restore();
  },

  // Titulek: rozhodčí dnešního zápasu.
  drawRefBanner(ctx, g, now) {
    const t = g.stateT - REF_AT, dur = REF_END - REF_AT;
    if (t < 0 || t > dur) return;
    const a = clamp(t / 0.3, 0, 1) * clamp((dur - t) / 0.3, 0, 1);
    const v = this.view;
    const slide = (1 - easeOutBack(clamp(t / 0.45, 0, 1))) * -420;
    ctx.save();
    ctx.globalAlpha = a;
    const x = v.x0 + 40 + slide, y = v.y1 - 200, w = 470, h = 92;
    ctx.fillStyle = 'rgba(8,13,26,.9)';
    rrect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    rrect(ctx, x, y, 14, h, 7);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `800 22px ${FONT_U}`;
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('ROZHODČÍ DNEŠNÍHO ZÁPASU', x + 34, y + 26);
    ctx.font = `46px ${FONT_D}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('MILAN VORAČKA', x + 32, y + 62);
    ctx.restore();
  },

  /* ---- míč ---- */

  drawBall(ctx, b, superCol) {
    const t = this.trail;
    if (!b.held && (b.speed > 760 || superCol)) {
      t.push(b.x, b.y);
      if (t.length > (superCol ? 24 : 14)) t.splice(0, 2);
    } else if (t.length) {
      t.splice(0, 2);
    }
    if (superCol) {
      // ohnivá stopa superstřely v barvě střelce
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < t.length; i += 2) {
        const k = (i + 2) / (t.length + 2);
        ctx.fillStyle = superCol;
        ctx.globalAlpha = 0.22 * k;
        circle(ctx, t[i], t[i + 1], b.r * (0.6 + 0.9 * k));
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.18 * k;
        circle(ctx, t[i], t[i + 1], b.r * 0.5 * k);
        ctx.fill();
      }
      const glow = ctx.createRadialGradient(b.x, b.y, b.r * 0.6, b.x, b.y, b.r * 3.2);
      glow.addColorStop(0, superCol);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = glow;
      circle(ctx, b.x, b.y, b.r * 3.2);
      ctx.fill();
      ctx.restore();
      if (Math.random() < 0.7) {
        Effects.add({ x: b.x + rand(-8, 8), y: b.y + rand(-8, 8), vx: -b.vx * 0.15 + rand(-60, 60), vy: rand(-80, 40), g: -60, life: rand(0.2, 0.45), size: rand(2, 4.5), color: Math.random() < 0.5 ? superCol : '#fff6c8' });
      }
    } else {
      for (let i = 0; i < t.length; i += 2) {
        const k = (i + 2) / (t.length + 2);
        ctx.fillStyle = `rgba(255,255,255,${0.28 * k})`;
        circle(ctx, t[i], t[i + 1], b.r * (0.45 + 0.45 * k));
        ctx.fill();
      }
    }

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = '#f7f8fa';
    circle(ctx, 0, 0, b.r);
    ctx.fill();
    ctx.save();
    circle(ctx, 0, 0, b.r);
    ctx.clip();
    ctx.rotate(b.rot);
    ctx.scale(b.r / 17, b.r / 17); // vzor je nakreslený pro poloměr 17
    ctx.fillStyle = '#1c2230';
    pentagon(ctx, 0, 0, 6.3, -Math.PI / 2);
    for (let k = 0; k < 5; k++) {
      const a = (k * TAU) / 5 + Math.PI / 2;
      pentagon(ctx, Math.cos(a) * 15.5, Math.sin(a) * 15.5, 6.2, a);
    }
    ctx.strokeStyle = 'rgba(28,34,48,.55)';
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 5; k++) {
      const a = (k * TAU) / 5 - Math.PI / 2;
      line(ctx, Math.cos(a) * 6.3, Math.sin(a) * 6.3, Math.cos(a) * 11, Math.sin(a) * 11);
    }
    ctx.restore();
    const g = ctx.createRadialGradient(-b.r * 0.35, -b.r * 0.4, 1, 0, 0, b.r);
    g.addColorStop(0, 'rgba(255,255,255,.65)');
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,.3)');
    ctx.fillStyle = g;
    circle(ctx, 0, 0, b.r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  },

  /* ---- výsledková tabule a hlášky ---- */

  drawHUD(ctx, g) {
    const m = g.match, cx = W / 2, y = 10, h = 56;
    const nameW = 176, scoreW = 58, timeW = 112, gap = 4, pad = 6;
    const total = pad * 2 + nameW * 2 + scoreW * 2 + timeW + gap * 4;
    let x = cx - total / 2;
    ctx.fillStyle = 'rgba(8,13,26,.85)';
    rrect(ctx, x, y, total, h, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    x += pad;
    const iy = y + pad, ih = h - pad * 2;
    this.teamBlock(ctx, x, iy, nameW, ih, m.teams[0], 0);
    x += nameW + gap;
    this.scoreBox(ctx, x, iy, scoreW, ih, m.score[0], g.scorePop[0]);
    x += scoreW + gap;

    ctx.fillStyle = '#04070f';
    rrect(ctx, x, iy, timeW, ih, 7);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // fotbalové hodiny: 0:00 → 45:00 a 45:00 → 90:00
    const left = g.half * HALF_LEN - g.clock;
    const urgent = !g.golden && g.half === 2 && g.state === 'play' && left <= 5 && Math.floor(left * 2) % 2 === 0;
    ctx.font = `800 34px ${FONT_U}`;
    ctx.fillStyle = g.golden ? '#ffc93c' : urgent ? '#ff6b62' : '#f3f6ef';
    ctx.fillText(fbClock(g.clock), x + timeW / 2, iy + ih / 2 + 2);
    // poločas pod hodinami
    const lab = g.state === 'shootout' ? 'PENALTY' : g.golden ? 'ZLATÝ GÓL' : g.half === 1 ? '1. POLOČAS' : '2. POLOČAS';
    ctx.font = `800 15px ${FONT_U}`;
    const lw = ctx.measureText(lab).width + 18;
    ctx.fillStyle = g.golden ? '#ffc93c' : 'rgba(8,13,26,.85)';
    rrect(ctx, x + timeW / 2 - lw / 2, y + h - 1, lw, 20, 6);
    ctx.fill();
    ctx.fillStyle = g.golden ? '#0b1220' : '#ffc93c';
    ctx.fillText(lab, x + timeW / 2, y + h + 9.5);
    // vichřice: kam fouká vítr
    let below = 22;
    if (m.mods && m.mods.wind && g.state !== 'shootout') {
      const gt = m.windDir > 0 ? 'VÍTR  ➜' : '⬅  VÍTR';
      ctx.font = `800 15px ${FONT_U}`;
      const gw = ctx.measureText(gt).width + 22;
      ctx.fillStyle = 'rgba(207,227,255,.92)';
      rrect(ctx, x + timeW / 2 - gw / 2, y + h + below, gw, 20, 6);
      ctx.fill();
      ctx.fillStyle = '#0b1220';
      ctx.fillText(gt, x + timeW / 2, y + h + below + 10.5);
      below += 22;
    }
    // příběh: úkol úrovně pod tabulí
    if (g.setup && g.setup.goal && g.state !== 'shootout') {
      const gt = `🎯 ${g.setup.goal}`;
      ctx.font = `800 14px ${FONT_U}`;
      const gw = ctx.measureText(gt).width + 18;
      ctx.fillStyle = 'rgba(8,13,26,.72)';
      rrect(ctx, x + timeW / 2 - gw / 2, y + h + below, gw, 19, 6);
      ctx.fill();
      ctx.fillStyle = '#ffe48a';
      ctx.fillText(gt, x + timeW / 2, y + h + below + 10);
    }
    x += timeW + gap;
    this.scoreBox(ctx, x, iy, scoreW, ih, m.score[1], g.scorePop[1]);
    x += scoreW + gap;
    this.teamBlock(ctx, x, iy, nameW, ih, m.teams[1], 1);
  },

  teamBlock(ctx, x, y, w, h, T, team) {
    const gr = ctx.createLinearGradient(x, y, x, y + h);
    gr.addColorStop(0, T.color);
    gr.addColorStop(1, T.dark);
    ctx.fillStyle = gr;
    rrect(ctx, x, y, w, h, 7);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    let size = 25;
    ctx.font = `800 ${size}px ${FONT_U}`;
    while (size > 14 && ctx.measureText(T.name).width > w - 24) {
      size -= 1;
      ctx.font = `800 ${size}px ${FONT_U}`;
    }
    ctx.textBaseline = 'middle';
    ctx.textAlign = team === 0 ? 'left' : 'right';
    ctx.fillText(T.name, team === 0 ? x + 14 : x + w - 14, y + h / 2 + 1);
  },

  scoreBox(ctx, x, y, w, h, val, popAt) {
    ctx.fillStyle = '#f3f6ef';
    rrect(ctx, x, y, w, h, 7);
    ctx.fill();
    const k = popAt ? clamp((performance.now() - popAt) / 450, 0, 1) : 1;
    const sc = 1 + 0.6 * (1 - easeOutQuad(k));
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2 + 2);
    ctx.scale(sc, sc);
    ctx.fillStyle = '#0b1220';
    ctx.font = `38px ${FONT_D}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(val), 0, 0);
    ctx.restore();
  },

  drawMsg(ctx, msg) {
    const t = msg.t;
    const sc = easeOutBack(Math.min(1, t / 0.28));
    const a = clamp((msg.dur - t) / 0.3, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, 285);
    ctx.scale(sc, sc);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = `${msg.size}px ${FONT_D}`;
    ctx.lineWidth = msg.size * 0.13;
    ctx.strokeStyle = '#0b1220';
    ctx.strokeText(msg.text, 0, 0);
    ctx.fillStyle = msg.color;
    ctx.fillText(msg.text, 0, 0);
    if (msg.sub) {
      ctx.font = `800 32px ${FONT_U}`;
      ctx.lineWidth = 8;
      ctx.strokeText(msg.sub, 0, msg.size * 0.5 + 30);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(msg.sub, 0, msg.size * 0.5 + 30);
    }
    ctx.restore();
  },
};

function star(ctx, x, y, r, r2) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r2 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function hexA(hex, a) {
  return `rgba(${hexRgb(hex)},${a})`;
}

function hexRgb(hex) {
  const n = parseInt(String(hex).slice(1), 16) || 0;
  return `${n >> 16},${(n >> 8) & 255},${n & 255}`;
}

function pick2(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pentagon(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = rot + (i * TAU) / 5;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
