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
  shakeAmt: 0,
  reduced: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),

  clear() {
    this.parts.length = 0;
    this.rings.length = 0;
    this.flashes.length = 0;
    this.shakeAmt = 0;
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
      this.add({ x: x + rand(-10, 10), y: GROUND_Y - 2, vx: rand(-160, 160), vy: rand(-360, -140), g: 1400, life: rand(0.35, 0.6), size: rand(2, 3.5), color: Math.random() < 0.5 ? '#6fcb5a' : '#3f9a3c' });
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

  update(dt) {
    this.shakeAmt = Math.max(0, this.shakeAmt * Math.pow(0.02, dt) - dt * 2);
    const ps = this.parts;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
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
    for (const list of [this.rings, this.flashes]) {
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
      ctx.globalAlpha = clamp((p.life - p.t) / 0.35, 0, 1);
      ctx.fillStyle = p.color;
      if (p.kind === 'conf') {
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
};

/* ---------------- renderer ---------------- */

const ADS = [
  { t: 'HLAVOUNI', bg: '#0d1526', fg: '#ffc93c' },
  { t: 'KOPAČKY BLESK', bg: '#2f80ff', fg: '#ffffff' },
  { t: 'LIMO HLAVIČKA', bg: '#ffc93c', fg: '#0d1526' },
  { t: 'PEKÁRNA U MÍČE', bg: '#e8458f', fg: '#ffffff' },
  { t: 'GÓL TV', bg: '#19a974', fg: '#ffffff' },
  { t: 'NELCIS & MAJDA', bg: '#9e1f5c', fg: '#ffd1e6' },
  { t: 'MARSAL & DURCADO', bg: '#1a4fb0', fg: '#cfe1ff' },
  { t: 'TÓMA & PELI', bg: '#0d7040', fg: '#c9ffe2' },
  { t: 'BÉMIČ & KIKI', bg: '#b85400', fg: '#ffe6cc' },
];
const STANDS_TOP = 150;
const STANDS_BOTTOM = 458;
const JUMBO = { x: 528, y: 162, w: 224, h: 92 };
const DEFAULT_CAM = { x: W / 2, y: H / 2, z: 1, bars: 0 };
const AISLES = [-638, 214, 1066, 1918];
const INTRO_DUR = 3.9;

const Renderer = {
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
        const shirt = q < 0.5 ? pick2(rng, home ? pinks : blues) : q < 0.62 ? pick2(rng, home ? blues : pinks) : pick2(rng, neutral);
        const yy = y + rowH - 1 + (rng() - 0.5) * 2;
        x.fillStyle = shirt;
        rrect(x, cx - size, yy - size * 1.7, size * 2, size * 1.7, size * 0.6);
        x.fill();
        x.fillStyle = pick2(rng, skins);
        circle(x, cx, yy - size * 2.2, size * 0.78);
        x.fill();
        const extra = rng();
        if (extra < 0.03) {
          // vlajka
          x.fillStyle = home ? ca : cb;
          x.fillRect(cx - 1, yy - size * 5.4, 1.5, size * 3.2);
          x.fillRect(cx, yy - size * 5.4, size * 2.8, size * 1.6);
        } else if (extra < 0.08) {
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

  draw(g) {
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
    ctx.setTransform(k, 0, 0, k, cw / 2 - cam.x * k + sx * s, ch / 2 - cam.y * k + sy * s);
    ctx.drawImage(this.bg, v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    this.drawCrowd(ctx, g.excite || 0, now);
    this.drawBeams(ctx, g);
    this.drawJumbotron(ctx, g, now);
    this.drawBoards(ctx, g, now);

    if (m) {
      Effects.drawFlashes(ctx);
      this.drawNet(ctx, 0, now);
      this.drawNet(ctx, 1, now);
      const b = m.ball;
      for (const p of m.players) this.drawShadow(ctx, p.x, p.standY - p.y, 36);
      this.drawShadow(ctx, b.x, GROUND_Y - b.r - b.y, 16);
      for (const p of m.players) this.drawPlayer(ctx, p, b, m.teams, now);
      const sp = b.superT > 0 && m.players[b.superBy];
      if (g.state !== 'intro') this.drawBall(ctx, b, sp ? superColor(sp.look.id) : null);
      this.drawGoalFront(ctx, 0);
      this.drawGoalFront(ctx, 1);
      if (g.screen === 'match' && g.state === 'over') this.drawTrophy(ctx, g, now);
      Effects.draw(ctx);
      if (g.state !== 'menu' && cam.bars < 0.3) {
        for (const p of m.players) this.drawTag(ctx, p, m.teams);
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
        ctx.setTransform(s, 0, 0, s, this.ox, this.oy);
        ctx.globalAlpha = 1;
      }
      if (g.state === 'intro') this.drawIntro(ctx, g, now);
      if (g.state === 'replay') this.drawReplayLabel(ctx, now);
      if (!Touch.enabled && g.myCharge >= 0 && a > 0 && g.screen === 'match') this.drawSuperMeter(ctx, g.myCharge, g.myColor, now);
    }
    if (g.state === 'paused' && g.mode === 'guest') {
      this.drawMsg(ctx, { text: 'PAUZA', sub: 'Hostitel hru pozastavil', t: 1, dur: 9, size: 110, color: '#f3f6ef' });
    }
    if (g.msg) this.drawMsg(ctx, g.msg);
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
      ctx.font = `38px ${FONT_D}`;
      ctx.fillStyle = '#ffc93c';
      ctx.fillText('HLAVOUNI', cx, cy + 2 + Math.sin(now * 0.003) * 3);
    } else if (st === 'goal' && g.goalTeam >= 0) {
      const T = m.teams[g.goalTeam];
      ctx.fillStyle = Math.floor(now / 170) % 2 ? T.color : T.dark;
      ctx.fillRect(x, y, w, h);
      const sp = m.players[g.scorerIdx];
      if (sp) this.drawFigure(ctx, sp.look, T, x + 46, y + 58, 0.62, 1, 1, { x: x + 300, y: y + 20 });
      ctx.font = `48px ${FONT_D}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('GÓL!', cx + 34, cy + 2);
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
      const win = m.score[0] > m.score[1] ? 0 : 1, T = m.teams[win];
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
      const t = Math.max(0, Math.ceil(g.timeLeft));
      ctx.fillText(g.golden ? 'ZG' : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, cx, cy + 2);
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
        const cur = ADS[(i + idx) % ADS.length], prev = ADS[(i + idx - 1 + ADS.length * 9) % ADS.length];
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
    ctx.fillStyle = a.fg;
    ctx.fillText(a.t, x + w / 2, y + h / 2 + 1);
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
    ctx.scale(sc, sc);
    const la = lookAt ? { x: (lookAt.x - x) / sc, y: (lookAt.y - y) / sc } : { x: dir * 300, y: -20 };
    this.drawPlayer(ctx, f, la, [T], performance.now());
    ctx.restore();
  },

  // Úvod zápasu: plakáty týmů a VS.
  drawIntro(ctx, g, now) {
    const t = g.stateT, m = g.match;
    const a = clamp((t - 1.0) / 0.45, 0, 1), out = clamp((t - (INTRO_DUR - 0.55)) / 0.4, 0, 1);
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
      const label = `${g.setup ? (g.setup.format === '2v2' ? '2 V 2' : '1 V 1') : ''} · ZÁPAS ZAČÍNÁ`;
      const w = ctx.measureText(label).width + 40;
      ctx.fillStyle = 'rgba(8,13,26,.8)';
      rrect(ctx, W / 2 - w / 2, 130, w, 40, 20);
      ctx.fill();
      ctx.fillStyle = '#ffc93c';
      ctx.fillText(label, W / 2, 151);
      ctx.restore();
    }
  },

  // Ukazatel superstřely pro hru na klávesnici (vlevo dole).
  drawSuperMeter(ctx, c, col, now) {
    const v = this.view, x = v.x0 + 28, y = v.y1 - 70, w = 230, h = 44;
    const full = c >= 1;
    ctx.save();
    ctx.fillStyle = 'rgba(8,13,26,.78)';
    rrect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = full ? col : 'rgba(255,255,255,.16)';
    ctx.lineWidth = full ? 3 : 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    rrect(ctx, x + 98, y + 14, w - 110, 16, 8);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.globalAlpha = full ? 0.75 + Math.sin(now * 0.012) * 0.25 : 0.85;
    rrect(ctx, x + 98, y + 14, (w - 110) * clamp(c, 0, 1), 16, 8);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = `800 20px ${FONT_U}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = full ? '#ffffff' : 'rgba(255,255,255,.7)';
    ctx.fillText(full ? 'SUPER  E' : 'SUPER', x + 14, y + h / 2 + 1);
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
    const win = m.score[0] > m.score[1] ? 0 : 1;
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
    const T = teams[p.team], L = p.look, R = p.R, F = PHYS.footH;
    const kicking = p.kickT >= 0;
    const s = p.kickS();
    const air = !p.onGround;
    const run = air ? 0 : Math.min(1, Math.abs(p.vx) / 260);
    const ph = p.runPhase;
    const footY = R + F - 7;
    let bx, by, fx, fy;
    if (air) {
      bx = -10; by = footY - 12; fx = 12; fy = footY - 16;
    } else {
      bx = -6 + Math.sin(ph) * 10 * run;
      by = footY - Math.max(0, Math.cos(ph)) * 7 * run;
      fx = 7 - Math.sin(ph) * 10 * run;
      fy = footY - Math.max(0, -Math.cos(ph)) * 7 * run;
    }
    if (kicking) {
      const f = p.footAt(s, this._f);
      fx = (f.x - p.x) * p.dir;
      fy = f.y - p.y + 5;
    }
    // úhel ruky od svislice: kladný dopředu, ±π nahoru
    let aBack, aFront;
    if (p.mood > 0) {
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

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.dir, 1);
    this.drawHair(ctx, p, T, 'back', now);
    this.drawArm(ctx, -12, R + 1, aBack, T, L, true);
    this.drawLeg(ctx, -6, R + 18, bx, by, T, L, 0, true);
    this.drawLeg(ctx, 5, R + 18, fx, fy, T, L, kicking ? -s * 0.9 : 0, false);
    this.drawTorso(ctx, p, T, L);
    this.drawHead(ctx, p, ball, T, now);
    this.drawArm(ctx, 10, R + 1, aFront, T, L, false);
    ctx.restore();
  },

  drawArm(ctx, sx, sy, a, T, L, back) {
    const len = 17;
    const ex = sx + Math.sin(a) * len, ey = sy + Math.cos(a) * len;
    const mx = sx + Math.sin(a) * 8, my = sy + Math.cos(a) * 8;
    const skin = back ? shade(L.skin, -0.16) : L.skin;
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 10;
    line(ctx, sx, sy, ex, ey);
    ctx.strokeStyle = skin;
    ctx.lineWidth = 6.5;
    line(ctx, mx, my, ex, ey);
    ctx.strokeStyle = back ? T.dark : T.color;
    ctx.lineWidth = 8;
    line(ctx, sx, sy, mx, my);
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
    ctx.strokeStyle = back ? '#c4cad3' : '#f2f4f7';
    ctx.lineWidth = 7;
    line(ctx, sx, sy, ax, ay);
    ctx.strokeStyle = back ? T.dark : T.color;
    line(ctx, sx, sy, lerp(sx, ax, 0.3), lerp(sy, ay, 0.3));
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(rot);
    this.drawBoot(ctx, T, back);
    ctx.restore();
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
    ctx.fillStyle = back ? '#10141d' : '#1d2433';
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = back ? T.dark : T.color;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-4, -5);
    ctx.quadraticCurveTo(1, 0, 9, 1);
    ctx.stroke();
    ctx.fillStyle = back ? '#aab2bd' : '#e9edf2';
    ctx.fillRect(-9, 4.4, 21, 2.4);
  },

  drawTorso(ctx, p, T, L) {
    const R = p.R;
    // trenky
    ctx.fillStyle = T.dark;
    rrect(ctx, -15, R + 9, 29, 13, 4);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
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
    // číslo
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
    ctx.strokeText(String(L.num), 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(L.num), 0, 0);
    ctx.restore();
  },

  drawHead(ctx, p, ball, T, now) {
    const R = p.R, L = p.look;
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
    }

    ctx.lineWidth = 3;
    ctx.strokeStyle = OUTLINE;
    circle(ctx, 0, 0, R);
    ctx.stroke();

    this.drawFace(ctx, p, ball);
    this.drawHair(ctx, p, T, 'top', now);
  },

  // Vlasy mají tři vrstvy: 'back' (za tělem), 'cap' (na hlavě), 'top' (přes obrys a čelo).
  drawHair(ctx, p, T, layer, now) {
    const R = p.R, L = p.look;
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
      }
      return;
    }

    if (layer === 'cap') {
      // vlasy na temeni, oříznuté obrysem hlavy
      ctx.save();
      circle(ctx, 0, 0, R);
      ctx.clip();
      ctx.fillStyle = L.hair === 'fade' ? 'rgba(90,60,30,.32)' : base;
      ctx.beginPath();
      if (L.hair === 'wavy') {
        ctx.moveTo(R + 8, -24);
        ctx.quadraticCurveTo(20, -18, 4, -22);
        ctx.quadraticCurveTo(-12, -16, -18, 2);
        ctx.quadraticCurveTo(-22, 16, -30, 24);
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

  drawFace(ctx, p, ball) {
    const L = p.look;
    let lx = (ball.x - p.x) * p.dir, ly = ball.y - p.y;
    const ln = Math.hypot(lx, ly) || 1;
    lx /= ln;
    ly /= ln;

    // tváře a pihy
    ctx.fillStyle = L.girl ? 'rgba(255,100,120,.3)' : 'rgba(235,110,90,.16)';
    oval(ctx, 16, 11, 6, 3.6);
    ctx.fill();
    if (L.freckles) {
      ctx.fillStyle = 'rgba(160,75,30,.55)';
      for (const [fx, fy] of [[12, 8], [16, 6.5], [19.5, 9], [14.5, 11], [33, 7], [35.5, 10]]) {
        circle(ctx, fx, fy, 1.1);
        ctx.fill();
      }
    }

    // oči
    this.drawEye(ctx, p, L, 9, -3, 5.4, 6.8, lx, ly, false);
    this.drawEye(ctx, p, L, 27, -3, 6.2, 7.6, lx, ly, true);

    // obočí: soustředění při kopu, smutek po inkasovaném gólu
    let inner = 0, outer = 0;
    if (p.mood < 0) inner = -3.5;
    else if (p.kickT >= 0) inner = 3;
    else if (p.mood > 0) outer = -2.5;
    ctx.strokeStyle = L.brow;
    ctx.lineWidth = L.girl ? 2.6 : 3.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(3, -14 + outer);
    ctx.quadraticCurveTo(8, -17.5, 14, -14.5 + inner);
    ctx.moveTo(21, -14.5 + inner);
    ctx.quadraticCurveTo(28, -18.5, 34, -15 + outer);
    ctx.stroke();

    // nos
    ctx.strokeStyle = shade(L.skin, -0.32);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(35, 1);
    ctx.quadraticCurveTo(40.5, 6, 35, 8.5);
    ctx.stroke();

    // pusa
    const lip = L.girl ? '#c23d5a' : '#8a3a2c';
    const open = p.mood > 0 || p.kickT >= 0 || (!p.onGround && p.vy < -200);
    if (open) {
      ctx.fillStyle = '#5a1a1c';
      oval(ctx, 25, 18.5, 5.5, p.mood > 0 ? 5.5 : 4);
      ctx.fill();
      ctx.fillStyle = '#e46a70';
      oval(ctx, 25, 21, 3.2, 1.8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(21.5, 14, 7, 1.8);
    } else if (p.mood < 0) {
      ctx.strokeStyle = lip;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(25, 24, 6, 1.22 * Math.PI, 1.78 * Math.PI);
      ctx.stroke();
    } else {
      ctx.strokeStyle = lip;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(25, 13, 6.5, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
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
    ctx.restore();
    // horní víčko
    ctx.strokeStyle = lidC;
    ctx.lineWidth = L.girl ? 2.8 : 2.3;
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx + 0.3, ry + 0.3, 0, Math.PI * 1.05, Math.PI * 1.95);
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
    const per = 5200, idx = Math.floor(now / per) % DUO_TEAMS.length, t = now % per;
    const T = DUO_TEAMS[idx];
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
  portrait(canvas, charId, team, facing) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 80, h = canvas.clientHeight || 100;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    const k = Math.min(w / 126, h / 156) * dpr;
    ctx.setTransform(k, 0, 0, k, canvas.width / 2, canvas.height / 2 - 12 * k);
    const p = new Player({ team: 0, x: 0, look: charById(charId), role: 'attacker', ctrl: 'cpu' });
    p.x = 0;
    p.y = 0;
    p.dir = facing;
    p.blink = 0;
    this.drawPlayer(ctx, p, { x: facing * 300, y: -20 }, [team], 0);
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
    const g = ctx.createRadialGradient(-6, -7, 1, 0, 0, b.r);
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
    if (g.golden) {
      ctx.font = `800 22px ${FONT_U}`;
      ctx.fillStyle = '#ffc93c';
      ctx.fillText('ZLATÝ GÓL', x + timeW / 2, iy + ih / 2 + 1);
    } else {
      const t = Math.max(0, Math.ceil(g.timeLeft));
      const urgent = g.state === 'play' && g.timeLeft <= 10 && Math.floor(g.timeLeft * 2) % 2 === 0;
      ctx.font = `800 34px ${FONT_U}`;
      ctx.fillStyle = urgent ? '#ff6b62' : '#f3f6ef';
      ctx.fillText(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, x + timeW / 2, iy + ih / 2 + 2);
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
