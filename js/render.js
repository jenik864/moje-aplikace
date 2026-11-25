'use strict';
/* Vykreslování: stadion (předkreslený), hráči, míč, efekty a výsledková tabule. */

const FONT_D = '"Lilita One", "Arial Rounded MT Bold", "Arial Black", sans-serif';
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

const Renderer = {
  canvas: null,
  ctx: null,
  bg: null,
  scale: 1,
  ox: 0,
  oy: 0,
  trail: [],
  _f: { x: 0, y: 0 },

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bg = document.createElement('canvas');
    this.resize();
  },

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(1, this.canvas.clientWidth), ch = Math.max(1, this.canvas.clientHeight);
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    this.scale = Math.min(this.canvas.width / W, this.canvas.height / H);
    this.ox = Math.round((this.canvas.width - W * this.scale) / 2);
    this.oy = Math.round((this.canvas.height - H * this.scale) / 2);
    this.buildBg();
  },

  /* ---- statické pozadí ---- */

  buildBg() {
    const s = this.scale, c = this.bg;
    c.width = Math.max(1, Math.ceil(W * s));
    c.height = Math.max(1, Math.ceil(H * s));
    const x = c.getContext('2d');
    x.setTransform(s, 0, 0, s, 0, 0);
    this.drawSky(x);
    this.drawStands(x);
    this.drawBoards(x);
    this.drawPitch(x);
    this.drawGoalBack(x, 0);
    this.drawGoalBack(x, 1);
  },

  drawSky(x) {
    const g = x.createLinearGradient(0, 0, 0, 170);
    g.addColorStop(0, '#071022');
    g.addColorStop(1, '#14305a');
    x.fillStyle = g;
    x.fillRect(0, 0, W, 170);
    const rng = mulberry32(3);
    x.fillStyle = 'rgba(255,255,255,.55)';
    for (let i = 0; i < 40; i++) {
      circle(x, rng() * W, rng() * 110, rng() * 1.1 + 0.3);
      x.fill();
    }
    for (const lx of [74, W - 74]) {
      const glow = x.createRadialGradient(lx, 44, 4, lx, 44, 300);
      glow.addColorStop(0, 'rgba(255,246,214,.55)');
      glow.addColorStop(0.25, 'rgba(255,246,214,.14)');
      glow.addColorStop(1, 'rgba(255,246,214,0)');
      x.fillStyle = glow;
      x.fillRect(lx - 300, 0, 600, 420);
      x.fillStyle = '#0a111f';
      x.fillRect(lx - 4, 64, 8, 80);
      x.fillStyle = '#1c2840';
      rrect(x, lx - 54, 20, 108, 46, 5);
      x.fill();
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

  drawStands(x) {
    const top = 150, bottom = 458;
    x.fillStyle = '#0a1120';
    x.fillRect(0, 128, W, 24);
    x.fillStyle = 'rgba(255,238,200,.55)';
    x.fillRect(0, 150, W, 2);
    const g = x.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, '#0f1828');
    g.addColorStop(1, '#1d2a40');
    x.fillStyle = g;
    x.fillRect(0, top + 2, W, bottom - top);

    const rng = mulberry32(7);
    const blues = ['#2f80ff', '#1f5fd1', '#5b9bff'];
    const reds = ['#f2463d', '#c8302a', '#ff6b62'];
    const neutral = ['#e9edf2', '#2b3445', '#ffc93c', '#5b6b84', '#c9d3e0', '#7a4bd6'];
    const skins = ['#f3c99b', '#e0ac69', '#c68642', '#8d5524', '#f8d8c0'];
    const rows = 13, rowH = (bottom - 14 - top) / rows;
    for (let r = 0; r < rows; r++) {
      const y = top + 8 + r * rowH;
      x.fillStyle = r % 2 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.08)';
      x.fillRect(0, y, W, rowH);
      const depth = r / (rows - 1);
      const sp = 11 + depth * 4, size = 3.6 + depth * 2;
      for (let cx = rng() * sp; cx < W; cx += sp * (0.85 + rng() * 0.4)) {
        if (rng() < 0.07) continue;
        const home = cx < W / 2, q = rng();
        const shirt = q < 0.48 ? pick2(rng, home ? blues : reds) : q < 0.6 ? pick2(rng, home ? reds : blues) : pick2(rng, neutral);
        const yy = y + rowH - 1 + (rng() - 0.5) * 2;
        x.fillStyle = shirt;
        rrect(x, cx - size, yy - size * 1.7, size * 2, size * 1.7, size * 0.6);
        x.fill();
        x.fillStyle = pick2(rng, skins);
        circle(x, cx, yy - size * 2.2, size * 0.78);
        x.fill();
        if (rng() < 0.025) {
          x.fillStyle = home ? '#2f80ff' : '#f2463d';
          x.fillRect(cx - 1, yy - size * 5.2, 1.5, size * 3);
          x.fillRect(cx, yy - size * 5.2, size * 2.6, size * 1.5);
        }
      }
    }
    const shade = x.createLinearGradient(0, top, 0, bottom);
    shade.addColorStop(0, 'rgba(4,8,18,.6)');
    shade.addColorStop(0.6, 'rgba(4,8,18,.1)');
    shade.addColorStop(1, 'rgba(4,8,18,0)');
    x.fillStyle = shade;
    x.fillRect(0, top, W, bottom - top);
    x.fillStyle = '#0b1322';
    x.fillRect(0, bottom, W, 10);
  },

  drawBoards(x) {
    const ads = [
      { t: 'HLAVOUNI', bg: '#0d1526', fg: '#ffc93c' },
      { t: 'KOPAČKY BLESK', bg: '#2f80ff', fg: '#ffffff' },
      { t: 'LIMO HLAVIČKA', bg: '#ffc93c', fg: '#0d1526' },
      { t: 'PEKÁRNA U MÍČE', bg: '#f2463d', fg: '#ffffff' },
      { t: 'GÓL TV', bg: '#19a974', fg: '#ffffff' },
    ];
    const y = 466, h = 40, bw = 196;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = `800 22px ${FONT_U}`;
    for (let bx = -30, i = 0; bx < W; bx += bw, i++) {
      const a = ads[i % ads.length];
      x.fillStyle = a.bg;
      x.fillRect(bx, y, bw - 3, h);
      x.fillStyle = a.fg;
      x.fillText(a.t, bx + bw / 2, y + h / 2 + 1);
      x.fillStyle = 'rgba(255,255,255,.12)';
      x.fillRect(bx, y, bw - 3, 6);
    }
    x.fillStyle = 'rgba(0,0,0,.35)';
    x.fillRect(0, y + h, W, 4);
  },

  drawPitch(x) {
    const top = 508;
    const g = x.createLinearGradient(0, top, 0, H);
    g.addColorStop(0, '#2a6f30');
    g.addColorStop(0.45, '#3c963d');
    g.addColorStop(1, '#46a445');
    x.fillStyle = g;
    x.fillRect(0, top, W, H - top);
    // posekané pruhy
    const n = 16, sw = W / n;
    x.fillStyle = 'rgba(255,255,255,.055)';
    for (let i = -6; i < n + 6; i += 2) {
      x.beginPath();
      x.moveTo(persp(i * sw, top), top);
      x.lineTo(persp((i + 1) * sw, top), top);
      x.lineTo(persp((i + 1) * sw, H), H);
      x.lineTo(persp(i * sw, H), H);
      x.closePath();
      x.fill();
    }
    const sh = x.createLinearGradient(0, top, 0, top + 30);
    sh.addColorStop(0, 'rgba(0,0,0,.3)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sh;
    x.fillRect(0, top, W, 30);

    // čáry
    x.strokeStyle = 'rgba(255,255,255,.72)';
    x.lineWidth = 3;
    x.lineCap = 'round';
    line(x, 0, 520, W, 520);
    line(x, W / 2, 520, W / 2, H);
    oval(x, W / 2, 602, 120, 36);
    x.stroke();
    x.fillStyle = 'rgba(255,255,255,.8)';
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

  drawGoalBack(x, side) {
    const x0 = side === 0 ? 0 : W - GOAL_W;
    const top = BAR_Y + BAR_T;
    x.fillStyle = 'rgba(0,0,0,.25)';
    oval(x, x0 + GOAL_W / 2, GROUND_Y + 4, GOAL_W * 0.7, 10);
    x.fill();
    x.fillStyle = 'rgba(6,12,24,.4)';
    x.fillRect(x0, top, GOAL_W, GROUND_Y - top);
    x.save();
    x.beginPath();
    x.rect(x0, BAR_Y, GOAL_W, GROUND_Y - BAR_Y);
    x.clip();
    x.strokeStyle = 'rgba(235,242,250,.38)';
    x.lineWidth = 1.2;
    for (let k = -260; k < 300; k += 13) {
      line(x, x0 + k, BAR_Y, x0 + k + 220, BAR_Y + 220);
      line(x, x0 + k, BAR_Y, x0 + k - 220, BAR_Y + 220);
    }
    x.restore();
    x.fillStyle = '#c3ccd8';
    x.fillRect(side === 0 ? 1 : W - 7, BAR_Y, 6, GROUND_Y - BAR_Y);
  },

  /* ---- snímek ---- */

  draw(g) {
    const ctx = this.ctx, s = this.scale, m = g.match;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawLetterbox(ctx);

    let sx = 0, sy = 0;
    if (Effects.shakeAmt > 0.2) {
      sx = rand(-1, 1) * Effects.shakeAmt;
      sy = rand(-1, 1) * Effects.shakeAmt;
    }
    ctx.setTransform(s, 0, 0, s, this.ox + sx * s, this.oy + sy * s);
    ctx.drawImage(this.bg, 0, 0, W, H);
    if (!m) return;

    Effects.drawFlashes(ctx);
    const b = m.ball;
    for (const p of m.players) this.drawShadow(ctx, p.x, p.standY - p.y, 36);
    this.drawShadow(ctx, b.x, GROUND_Y - b.r - b.y, 16);
    const now = performance.now();
    for (const p of m.players) this.drawPlayer(ctx, p, b, m.teams, now);
    this.drawBall(ctx, b);
    this.drawGoalFront(ctx, 0);
    this.drawGoalFront(ctx, 1);
    Effects.draw(ctx);

    if (g.state !== 'menu') {
      for (const p of m.players) this.drawTag(ctx, p, m.teams);
      this.drawHUD(ctx, g);
    }
    if (g.state === 'paused' && g.mode === 'guest') {
      this.drawMsg(ctx, { text: 'PAUZA', sub: 'Hostitel hru pozastavil', t: 1, dur: 9, size: 110, color: '#f3f6ef' });
    }
    if (g.msg) this.drawMsg(ctx, g.msg);
  },

  drawLetterbox(ctx) {
    const c = this.canvas, s = this.scale, oy = this.oy;
    if (this.ox <= 0 && oy <= 0) return;
    const g = ctx.createLinearGradient(0, oy, 0, oy + H * s);
    g.addColorStop(0, '#071022');
    g.addColorStop(150 / H, '#14305a');
    g.addColorStop(155 / H, '#0f1828');
    g.addColorStop(458 / H, '#1d2a40');
    g.addColorStop(508 / H, '#0d1526');
    g.addColorStop(512 / H, '#2a6f30');
    g.addColorStop(1, '#46a445');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(3,6,14,.55)';
    ctx.fillRect(0, 0, c.width, c.height);
  },

  drawShadow(ctx, x, h, w) {
    const k = clamp(1 - h / 320, 0.3, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.3 * k})`;
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
    ctx.strokeText(String(L.num), -3, R + 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(L.num), -3, R + 8);
  },

  drawHead(ctx, p, ball, T, now) {
    const R = p.R, L = p.look;
    ctx.fillStyle = L.skin;
    circle(ctx, 0, 0, R);
    ctx.fill();
    const sh = ctx.createRadialGradient(-12, -16, 4, 0, 0, R);
    sh.addColorStop(0, 'rgba(255,255,255,.26)');
    sh.addColorStop(0.55, 'rgba(255,255,255,0)');
    sh.addColorStop(1, 'rgba(90,30,0,.22)');
    ctx.fillStyle = sh;
    circle(ctx, 0, 0, R);
    ctx.fill();

    if (L.beard) {
      ctx.save();
      circle(ctx, 0, 0, R);
      ctx.clip();
      ctx.fillStyle = L.hairColor;
      ctx.beginPath();
      ctx.moveTo(-14, 6);
      ctx.quadraticCurveTo(-2, 22, 14, 22);
      ctx.quadraticCurveTo(30, 22, 44, 10);
      ctx.lineTo(44, 50);
      ctx.lineTo(-14, 50);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    this.drawHair(ctx, p, T, 'cap', now);

    // ucho
    ctx.fillStyle = L.skin;
    oval(ctx, -9, 4, 7, 9.5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,35,15,.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-9, 4, 4, -1.2, 1.4);
    ctx.stroke();
    if (L.girl) {
      ctx.fillStyle = L.accent || '#ffd23f';
      circle(ctx, -8, 13, 2.4);
      ctx.fill();
    }

    ctx.lineWidth = 3;
    ctx.strokeStyle = OUTLINE;
    circle(ctx, 0, 0, R);
    ctx.stroke();

    this.drawHair(ctx, p, T, 'top', now);
    this.drawFace(ctx, p, ball);
  },

  // Účesy mají tři vrstvy: 'back' (za tělem), 'cap' (na hlavě), 'top' (přes obrys hlavy).
  drawHair(ctx, p, T, layer, now) {
    const R = p.R, L = p.look, c = L.hairColor, dark = shade(c, -0.45);
    ctx.lineJoin = 'round';
    if (layer === 'back') {
      if (L.hair === 'afro') {
        ctx.fillStyle = c;
        for (let a = -3.5; a <= -0.15; a += 0.42) {
          circle(ctx, Math.cos(a) * (R + 1), Math.sin(a) * (R + 1) - 3, 17);
          ctx.fill();
        }
      } else if (L.hair === 'ponytail') {
        const lvx = p.vx * p.dir;
        let th = Math.PI * 0.72 + clamp(lvx * 0.0011, -0.2, 0.5) + clamp(p.vy * 0.0005, -0.45, 0.45)
          + Math.sin(now * 0.005 + p.homeX) * 0.05;
        th = clamp(th, Math.PI * 0.5, Math.PI * 1.15);
        const ax = -24, ay = -30, len = 52;
        const dx = Math.cos(th), dy = Math.sin(th), nx = -dy, ny = dx;
        const mx = ax + dx * len * 0.45, my = ay + dy * len * 0.45;
        const tx = ax + dx * len + nx * 6, ty = ay + dy * len + ny * 6;
        ctx.beginPath();
        ctx.moveTo(ax + nx * 7, ay + ny * 7);
        ctx.quadraticCurveTo(mx + nx * 14, my + ny * 14, tx, ty);
        ctx.quadraticCurveTo(mx - nx * 10, my - ny * 10, ax - nx * 7, ay - ny * 7);
        ctx.closePath();
        ctx.fillStyle = c;
        ctx.fill();
        ctx.strokeStyle = dark;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ax + dx * 8, ay + dy * 8);
        ctx.quadraticCurveTo(mx + nx * 5, my + ny * 5, ax + dx * len * 0.85, ay + dy * len * 0.85);
        ctx.stroke();
      } else if (L.hair === 'long') {
        const sw = clamp(p.vx * p.dir * 0.012, -4, 7) + clamp(-p.vy * 0.004, -4, 4);
        ctx.beginPath();
        ctx.moveTo(14, -37);
        ctx.quadraticCurveTo(-34, -52, -46, -10);
        ctx.quadraticCurveTo(-52 - sw, 22, -46 - sw, 50);
        ctx.quadraticCurveTo(-40 - sw, 60, -32 - sw * 0.6, 52);
        ctx.quadraticCurveTo(-25, 61, -17, 50);
        ctx.quadraticCurveTo(-9, 45, -6, 30);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fillStyle = c;
        ctx.fill();
        ctx.strokeStyle = dark;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.22)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-40, -6);
        ctx.quadraticCurveTo(-46 - sw, 22, -40 - sw, 44);
        ctx.stroke();
      }
      return;
    }

    if (layer === 'cap') {
      if (L.hair === 'bald') return;
      const shaved = L.hair === 'mohawk';
      ctx.save();
      circle(ctx, 0, 0, R);
      ctx.clip();
      ctx.fillStyle = shaved ? 'rgba(50,25,10,.14)' : c;
      ctx.beginPath();
      ctx.moveTo(R + 8, -27);
      ctx.quadraticCurveTo(18, -22, 2, -26);
      ctx.quadraticCurveTo(-12, -21, -18, -5);
      ctx.quadraticCurveTo(-24, 10, -34, 20);
      ctx.lineTo(-R - 8, 20);
      ctx.lineTo(-R - 8, -R - 8);
      ctx.lineTo(R + 8, -R - 8);
      ctx.closePath();
      ctx.fill();
      if (!shaved) {
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        oval(ctx, -6, -31, 18, 5, -0.25);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    // vrstva 'top'
    ctx.fillStyle = c;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2;
    switch (L.hair) {
      case 'spiky': {
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
          const a = lerp(-2.85, -0.5, i / 6), tip = a - 0.16;
          ctx.moveTo(Math.cos(a - 0.2) * (R - 6), Math.sin(a - 0.2) * (R - 6));
          ctx.lineTo(Math.cos(tip) * (R + 15), Math.sin(tip) * (R + 15));
          ctx.lineTo(Math.cos(a + 0.2) * (R - 6), Math.sin(a + 0.2) * (R - 6));
          ctx.closePath();
        }
        ctx.fill();
        break;
      }
      case 'afro':
        for (let a = -2.3; a <= -0.8; a += 0.38) {
          circle(ctx, Math.cos(a) * (R - 3), Math.sin(a) * (R - 3), 13);
          ctx.fill();
        }
        break;
      case 'mohawk': {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = lerp(-2.45, -0.95, i / 5);
          ctx.moveTo(Math.cos(a - 0.14) * (R - 4), Math.sin(a - 0.14) * (R - 4));
          ctx.lineTo(Math.cos(a - 0.1) * (R + 22), Math.sin(a - 0.1) * (R + 22));
          ctx.lineTo(Math.cos(a + 0.14) * (R - 4), Math.sin(a + 0.14) * (R - 4));
          ctx.closePath();
        }
        ctx.fill();
        break;
      }
      case 'swoosh':
        ctx.beginPath();
        ctx.moveTo(-24, -31);
        ctx.quadraticCurveTo(20, -60, 50, -27);
        ctx.quadraticCurveTo(36, -31, 24, -22);
        ctx.quadraticCurveTo(4, -32, -24, -31);
        ctx.fill();
        ctx.stroke();
        break;
      case 'curly':
        for (let a = -3.0; a <= -0.65; a += 0.3) {
          circle(ctx, Math.cos(a) * (R - 1), Math.sin(a) * (R - 1), 9);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(0,0,0,.18)';
        ctx.lineWidth = 1.5;
        for (let a = -2.85; a <= -0.8; a += 0.6) {
          ctx.beginPath();
          ctx.arc(Math.cos(a) * (R - 1), Math.sin(a) * (R - 1), 4, 0, 4);
          ctx.stroke();
        }
        break;
      case 'bald': {
        ctx.fillStyle = 'rgba(255,255,255,.28)';
        oval(ctx, -8, -29, 12, 5, -0.3);
        ctx.fill();
        ctx.save();
        circle(ctx, 0, 0, R + 1);
        ctx.clip();
        ctx.translate(0, -31);
        ctx.rotate(-0.08);
        ctx.fillStyle = T.color;
        ctx.fillRect(-R - 4, -6, 2 * R + 8, 12);
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fillRect(-R - 4, -1.5, 2 * R + 8, 3);
        ctx.restore();
        break;
      }
      case 'ponytail':
        // ofina na stranu a gumička
        ctx.beginPath();
        ctx.moveTo(-14, -35);
        ctx.quadraticCurveTo(16, -48, 41, -25);
        ctx.quadraticCurveTo(32, -24, 25, -17);
        ctx.quadraticCurveTo(16, -28, -2, -27);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.22)';
        ctx.beginPath();
        ctx.moveTo(-4, -38);
        ctx.quadraticCurveTo(16, -44, 32, -30);
        ctx.stroke();
        ctx.fillStyle = L.accent;
        circle(ctx, -24, -30, 5.5);
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        break;
      case 'long': {
        // rovná ofina a mašle
        ctx.beginPath();
        ctx.moveTo(-10, -36);
        ctx.quadraticCurveTo(20, -49, 41, -24);
        ctx.lineTo(37, -18);
        ctx.lineTo(31, -24);
        ctx.lineTo(25, -17);
        ctx.lineTo(19, -24);
        ctx.lineTo(12, -19);
        ctx.lineTo(6, -26);
        ctx.quadraticCurveTo(-4, -27, -10, -36);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.save();
        ctx.translate(-14, -38);
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
      }
      case 'quiff':
        ctx.beginPath();
        ctx.moveTo(-26, -28);
        ctx.quadraticCurveTo(-16, -58, 14, -57);
        ctx.quadraticCurveTo(46, -55, 46, -30);
        ctx.quadraticCurveTo(38, -36, 28, -27);
        ctx.quadraticCurveTo(10, -36, -26, -28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.22)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-10, -45);
        ctx.quadraticCurveTo(12, -55, 34, -45);
        ctx.stroke();
        break;
      case 'cap': {
        // kšiltovka v barvě týmu, otočená kšiltem dozadu
        ctx.save();
        ctx.translate(-R + 4, -20);
        ctx.rotate(0.18);
        ctx.fillStyle = T.dark;
        rrect(ctx, -24, -4, 28, 8, 4);
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.stroke();
        ctx.restore();
        const r2 = R + 2, a0 = Math.PI + 0.35, a1 = -0.3;
        ctx.beginPath();
        ctx.arc(0, -4, r2, a0, a1);
        ctx.quadraticCurveTo(0, -22, Math.cos(a0) * r2, -4 + Math.sin(a0) * r2);
        ctx.closePath();
        ctx.fillStyle = T.color;
        ctx.fill();
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -46);
        ctx.quadraticCurveTo(14, -32, 13, -18);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.22)';
        oval(ctx, -10, -36, 14, 5, -0.3);
        ctx.fill();
        ctx.fillStyle = T.dark;
        circle(ctx, 0, -46, 3.5);
        ctx.fill();
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
    ctx.fillStyle = L.girl ? 'rgba(255,95,120,.32)' : 'rgba(255,110,110,.2)';
    oval(ctx, 15, 12, 6.5, 3.8);
    ctx.fill();
    if (L.freckles) {
      ctx.fillStyle = 'rgba(150,70,20,.55)';
      for (const [x, y] of [[11, 9], [15, 7], [18, 10], [13, 12]]) {
        circle(ctx, x, y, 1.1);
        ctx.fill();
      }
    }

    // oči sledují míč
    const eyes = [[6, -5, 7.5, 10], [26, -5, 8.5, 11]];
    for (const [ex, ey, rx, ry] of eyes) {
      if (p.blink > 0) {
        ctx.strokeStyle = '#2a1a12';
        ctx.lineWidth = 2.5;
        line(ctx, ex - rx + 1, ey, ex + rx - 1, ey);
        continue;
      }
      ctx.fillStyle = '#ffffff';
      oval(ctx, ex, ey, rx, ry);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,20,10,.55)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      const px = ex + lx * (rx - 4.6), py = ey + ly * (ry - 5.2);
      ctx.fillStyle = L.eyes || '#3b2416';
      circle(ctx, px, py, 4.8);
      ctx.fill();
      ctx.fillStyle = '#12141c';
      circle(ctx, px, py, 2.5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      circle(ctx, px + 1.5, py - 1.7, 1.5);
      ctx.fill();
      if (L.girl) {
        // řasy
        ctx.strokeStyle = '#2a1a12';
        ctx.lineWidth = 1.7;
        ctx.lineCap = 'round';
        for (const a of [-1.2, -0.8, -0.4]) {
          const sx = ex + Math.cos(a) * rx, sy = ey + Math.sin(a) * ry;
          line(ctx, sx, sy, sx + Math.cos(a) * 4, sy + Math.sin(a) * 4);
        }
      }
    }

    // obočí: soustředění při kopu, smutek po inkasovaném gólu
    let inner = 0, outer = 0;
    if (p.mood < 0) inner = -4;
    else if (p.kickT >= 0) inner = 4;
    else if (p.mood > 0) outer = -3;
    ctx.strokeStyle = L.brow;
    ctx.lineWidth = L.girl ? 2.8 : 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-1, -19 + outer);
    ctx.quadraticCurveTo(5, L.girl ? -23 : -21, 12, -19 + inner);
    ctx.moveTo(20, -19 + inner);
    ctx.quadraticCurveTo(27, L.girl ? -24 : -22, 33, -21 + outer);
    ctx.stroke();

    // nos
    ctx.fillStyle = L.skin;
    ctx.strokeStyle = 'rgba(60,28,12,.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(37, -3);
    ctx.quadraticCurveTo(L.girl ? 44 : 46, 6, 37, 10);
    ctx.fill();
    ctx.stroke();

    if (L.beard) {
      ctx.fillStyle = L.hairColor;
      oval(ctx, 26, 14, 10, 3.6, -0.1);
      ctx.fill();
    }

    // pusa
    const lip = L.beard ? '#f0c29a' : L.girl ? '#c2405a' : '#3a1a10';
    const open = p.mood > 0 || p.kickT >= 0 || (!p.onGround && p.vy < -200);
    if (open) {
      ctx.fillStyle = '#4a1414';
      oval(ctx, 25, 22, 7, p.mood > 0 ? 7 : 5.5);
      ctx.fill();
      ctx.fillStyle = '#e46a70';
      oval(ctx, 25, 25.5, 4, 2.3);
      ctx.fill();
      if (L.girl) {
        ctx.strokeStyle = lip;
        ctx.lineWidth = 1.6;
        oval(ctx, 25, 22, 7, p.mood > 0 ? 7 : 5.5);
        ctx.stroke();
      }
    } else if (p.mood < 0) {
      ctx.strokeStyle = lip;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(25, 29, 7, 1.2 * Math.PI, 1.8 * Math.PI);
      ctx.stroke();
    } else {
      ctx.strokeStyle = lip;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(23, 13, 10, 0.3 * Math.PI, 0.72 * Math.PI);
      ctx.stroke();
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

  drawBall(ctx, b) {
    const t = this.trail;
    if (!b.held && b.speed > 760) {
      t.push(b.x, b.y);
      if (t.length > 14) t.splice(0, 2);
    } else if (t.length) {
      t.splice(0, 2);
    }
    for (let i = 0; i < t.length; i += 2) {
      const k = (i + 2) / (t.length + 2);
      ctx.fillStyle = `rgba(255,255,255,${0.28 * k})`;
      circle(ctx, t[i], t[i + 1], b.r * (0.45 + 0.45 * k));
      ctx.fill();
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
