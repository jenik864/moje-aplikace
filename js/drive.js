'use strict';
/*
 * Jízda do Hot Peppers: noční město shora, hráč řídí auto joystickem podle navigace.
 * Auta se kupují za poháry v garáži (výběr postavy v klubu).
 */

const CARS = [
  { id: 'hatch', name: 'Rezavý hatchback', price: 0, max: 520, acc: 380, turn: 2.6, color: '#9a5b34', dark: '#5a2f14', len: 46, wid: 24, desc: 'Starý, ale jede. Většinou.' },
  { id: 'kombi', name: 'Tuned kombi', price: 150, max: 620, acc: 460, turn: 2.8, color: '#2f6bff', dark: '#163a9a', len: 52, wid: 25, stripes: '#ffffff', desc: 'Kapota s pruhy a výfuk jak traktor.' },
  { id: 'suv', name: 'Černé SUV', price: 300, max: 660, acc: 480, turn: 2.4, color: '#17181f', dark: '#08080c', len: 56, wid: 30, desc: 'Tónovaný skla, ochranka zírá.' },
  { id: 'kupe', name: 'Sportovní kupé', price: 600, max: 800, acc: 640, turn: 3.1, color: '#e0203f', dark: '#7a0a1e', len: 50, wid: 25, spoiler: true, stripes: '#111111', desc: 'Nízký, rychlý, hlasitý.' },
  { id: 'super', name: 'Zlaté superauto', price: 1200, max: 960, acc: 780, turn: 3.3, color: '#f2c23a', dark: '#8a6200', len: 52, wid: 27, spoiler: true, desc: 'Celé zlaté. Všichni se otáčí.' },
  { id: 'limo', name: 'Bílá limuzína', price: 2000, max: 720, acc: 460, turn: 2.0, color: '#f2f2f5', dark: '#a8acb8', len: 96, wid: 30, desc: 'Přijedeš jako boss. Nejdelší auto ve městě.' },
];
const carById = (id) => CARS.find((c) => c.id === id) || CARS[0];

const DRV = {
  W: 4800, H: 4100, ROAD: 150,
  XS: [300, 1000, 1700, 2400, 3100, 3800, 4500],
  YS: [300, 1000, 1700, 2400, 3100, 3800],
  START: { x: 300, y: 3800 },
  DEST: { x: 4150, y: 845 },   // parkoviště Hot Peppers
  ENTRY: { x: 4150, y: 1000 }, // vjezd z ulice
  VIEW_H: 780,
};
const DRV_SIGNS = ['BAR', 'HOTEL', 'KEBAB', 'PIZZA', '24/7', 'CASINO', 'NONSTOP', 'GYM', 'SUSHI', 'TATTOO'];

const Drive = {
  on: false,

  start(carId, onArrive) {
    this.on = true;
    this.car = carById(carId);
    this.onArrive = onArrive;
    this.p = { x: DRV.START.x + 40, y: DRV.START.y + 36, ang: 0, v: 0, steer: 0 };
    this.cam = { x: this.p.x, y: this.p.y };
    this.camAng = 0;
    this.t = 0;
    this.shake = 0;
    this.arrived = false;
    this.routeT = 0;
    this.trail = [];
    if (!this.blocks) this.buildCity();
    this.spawnTraffic();
    this.route();
    this.startEngine();
  },

  stop() {
    this.on = false;
    this.stopEngine();
  },

  /* ---------- město ---------- */

  buildCity() {
    const r = mulberry32(2024), X = [0, ...DRV.XS, DRV.W], Y = [0, ...DRV.YS, DRV.H], h = DRV.ROAD / 2;
    this.blocks = [];
    for (let i = 0; i < X.length - 1; i++) {
      for (let j = 0; j < Y.length - 1; j++) {
        const x0 = X[i] + (i ? h : 0), x1 = X[i + 1] - (i < X.length - 2 ? h : 0);
        const y0 = Y[j] + (j ? h : 0), y1 = Y[j + 1] - (j < Y.length - 2 ? h : 0);
        const b = { x0, y0, x1, y1, kind: 'bld' };
        if (x0 < DRV.DEST.x && x1 > DRV.DEST.x && y0 < DRV.DEST.y && y1 > DRV.DEST.y) {
          b.kind = 'hp';
          b.lotY = DRV.DEST.y - 85; // parkoviště ve spodní části bloku
        } else if (r() < 0.16) b.kind = 'park';
        // budovy v bloku: 1–3 domy vedle sebe
        b.houses = [];
        if (b.kind === 'bld') {
          const n = 1 + Math.floor(r() * 3), w = (x1 - x0 - 28) / n;
          for (let k = 0; k < n; k++) {
            b.houses.push({
              x0: x0 + 14 + k * w + 4, y0: y0 + 14, x1: x0 + 14 + (k + 1) * w - 4, y1: y1 - 14,
              hue: Math.floor(r() * 360), l: 12 + r() * 10, ac: Math.floor(r() * 4), h: 90 + r() * 210, win: Math.floor(r() * 1000),
              sign: r() < 0.35 ? DRV_SIGNS[Math.floor(r() * DRV_SIGNS.length)] : '', signHue: Math.floor(r() * 360),
            });
          }
        } else if (b.kind === 'park') {
          b.trees = [];
          for (let k = 0; k < 14; k++) b.trees.push({ x: x0 + 30 + r() * (x1 - x0 - 60), y: y0 + 30 + r() * (y1 - y0 - 60), s: 16 + r() * 16 });
        }
        this.blocks.push(b);
      }
    }
    // parkující auta podél ulic (jen na kreslení)
    this.parked = [];
    for (let k = 0; k < 40; k++) {
      const horiz = r() < 0.5, idx = Math.floor(r() * (horiz ? DRV.YS.length : DRV.XS.length));
      const along = 120 + r() * ((horiz ? DRV.W : DRV.H) - 240);
      const side = r() < 0.5 ? -1 : 1;
      const c = ['#3a3f52', '#6a1424', '#1d4a7a', '#c9ced8', '#2a2a30', '#7a6a2a'][Math.floor(r() * 6)];
      if (horiz) this.parked.push({ x: along, y: DRV.YS[idx] + side * 64, ang: 0, c });
      else this.parked.push({ x: DRV.XS[idx] + side * 64, y: along, ang: Math.PI / 2, c });
    }
  },

  // Kolizní obdélníky (bloky; u Hot Peppers jen budova, parkoviště je průjezdné).
  hitBlock(x, y, rad) {
    if (x < rad || y < rad || x > DRV.W - rad || y > DRV.H - rad) return true;
    for (const b of this.blocks) {
      const y1 = b.kind === 'hp' ? b.lotY : b.y1;
      if (x + rad < b.x0 || x - rad > b.x1 || y + rad < b.y0 || y - rad > y1) continue;
      const cx = clamp(x, b.x0, b.x1), cy = clamp(y, b.y0, y1);
      if ((x - cx) ** 2 + (y - cy) ** 2 < rad * rad) return true;
    }
    return false;
  },

  /* ---------- provoz ---------- */

  spawnTraffic() {
    this.traffic = [];
    const cols = ['#c9ced8', '#3a3f52', '#6a1424', '#1d4a7a', '#e8e0c8', '#2a6a3a', '#ffcf3a', '#111216'];
    for (let k = 0; k < 18; k++) {
      const horiz = k % 2 === 0;
      const lane = horiz ? Math.floor(Math.random() * DRV.YS.length) : Math.floor(Math.random() * DRV.XS.length);
      this.traffic.push({ horiz, lane, dir: Math.random() < 0.5 ? 1 : -1, pos: rand(200, (horiz ? DRV.W : DRV.H) - 200), sp: rand(170, 260), c: cols[k % cols.length], wait: 0, len: 46, wid: 24 });
    }
  },

  trafficPos(c) {
    if (c.horiz) return { x: c.pos, y: DRV.YS[c.lane] + (c.dir > 0 ? 36 : -36), ang: c.dir > 0 ? 0 : Math.PI };
    return { x: DRV.XS[c.lane] + (c.dir > 0 ? -36 : 36), y: c.pos, ang: c.dir > 0 ? Math.PI / 2 : -Math.PI / 2 };
  },

  updateTraffic(dt) {
    for (const c of this.traffic) {
      if (c.wait > 0) {
        c.wait -= dt;
        continue;
      }
      const prev = c.pos;
      c.pos += c.dir * c.sp * dt;
      const cross = c.horiz ? DRV.XS : DRV.YS;
      for (let i = 0; i < cross.length; i++) {
        const q = cross[i];
        if ((prev - q) * (c.pos - q) > 0 || prev === q) continue;
        // křižovatka: jet dál, nebo odbočit
        if (Math.random() < 0.4) {
          const otherLanes = c.horiz ? DRV.XS : DRV.YS;
          const myCoord = c.horiz ? DRV.YS[c.lane] : DRV.XS[c.lane];
          c.horiz = !c.horiz;
          c.lane = i;
          c.pos = myCoord;
          c.dir = Math.random() < 0.5 ? 1 : -1;
          void otherLanes;
        }
        break;
      }
      const lim = c.horiz ? DRV.W : DRV.H;
      if (c.pos < 60 || c.pos > lim - 60) {
        c.dir = -c.dir;
        c.pos = clamp(c.pos, 60, lim - 60);
      }
    }
  },

  /* ---------- navigace ---------- */

  node(i, j) {
    return { x: DRV.XS[i], y: DRV.YS[j] };
  },

  // Nejkratší cesta po křižovatkách (BFS) z nejbližší křižovatky k vjezdu na parkoviště.
  route() {
    const p = this.p;
    let si = 0, sj = 0, bd = Infinity;
    DRV.XS.forEach((x, i) => DRV.YS.forEach((y, j) => {
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < bd) {
        bd = d;
        si = i;
        sj = j;
      }
    }));
    const nx = DRV.XS.length, ny = DRV.YS.length, key = (i, j) => i * ny + j;
    const prev = new Map([[key(si, sj), -1]]), q = [[si, sj]];
    while (q.length) {
      const [i, j] = q.shift();
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj;
        if (a < 0 || b < 0 || a >= nx || b >= ny || prev.has(key(a, b))) continue;
        prev.set(key(a, b), key(i, j));
        q.push([a, b]);
      }
    }
    // cíl: jedna ze dvou křižovatek kolem vjezdu (vybrat kratší)
    const tj = DRV.YS.indexOf(DRV.ENTRY.y);
    let best = null;
    for (const ti of [DRV.XS.findIndex((x) => x > DRV.ENTRY.x) - 1, DRV.XS.findIndex((x) => x > DRV.ENTRY.x)]) {
      const path = [];
      let k = key(ti, tj);
      while (k !== -1 && k !== undefined) {
        path.unshift(this.node(Math.floor(k / ny), k % ny));
        k = prev.get(k);
      }
      let len = Math.hypot(DRV.XS[ti] - DRV.ENTRY.x, 0);
      for (let m = 1; m < path.length; m++) len += Math.hypot(path[m].x - path[m - 1].x, path[m].y - path[m - 1].y);
      if (!best || len < best.len) best = { path, len };
    }
    this.path = [{ x: p.x, y: p.y }, ...best.path, { ...DRV.ENTRY }, { ...DRV.DEST }];
    // první křižovatku přeskočit, když je za námi
    if (this.path.length > 3) {
      const a = this.path[1], b = this.path[2];
      const toA = Math.hypot(a.x - p.x, a.y - p.y), toB = Math.hypot(b.x - p.x, b.y - p.y), ab = Math.hypot(b.x - a.x, b.y - a.y);
      if (toB < ab && toA < 260) this.path.splice(1, 1);
    }
  },

  navInfo() {
    const P = this.path;
    let total = 0;
    for (let i = 1; i < P.length; i++) total += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y);
    let dist = 0, turn = '', turnAt = 0;
    for (let i = 1; i < P.length - 1; i++) {
      dist += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y);
      const d1x = P[i].x - P[i - 1].x, d1y = P[i].y - P[i - 1].y, d2x = P[i + 1].x - P[i].x, d2y = P[i + 1].y - P[i].y;
      const l1 = Math.hypot(d1x, d1y) || 1, l2 = Math.hypot(d2x, d2y) || 1;
      const cr = (d1x * d2y - d1y * d2x) / (l1 * l2), dot = (d1x * d2x + d1y * d2y) / (l1 * l2);
      if (dot < 0.7 && l1 > 40) {
        turn = cr > 0 ? 'right' : 'left';
        turnAt = dist;
        break;
      }
    }
    return { total, turn, turnAt };
  },

  /* ---------- jízda ---------- */

  update(dt, inp) {
    if (!this.on) return;
    this.t += dt;
    this.shake = Math.max(0, this.shake - dt * 3);
    const p = this.p, car = this.car;
    const { mx, my } = inp;
    const mag = Math.min(1, Math.hypot(mx, my));
    let throttle = 0;
    if (!this.arrived) {
      // pohled za autem: joystick nahoru = plyn, dolů = brzda/couvání, do stran = zatáčení
      const steer = Math.abs(mx) > 0.12 ? clamp(mx, -1, 1) : 0;
      throttle = my < -0.15 ? Math.min(1, -my * 1.2) : my > 0.15 ? -Math.min(1, my * 1.2) : 0;
      const grip = clamp(Math.abs(p.v) / 160, 0.2, 1) * (p.v < 0 ? -1 : 1);
      p.ang += steer * car.turn * grip * dt;
      p.steer = approach(p.steer || 0, steer, dt * 6);
    }
    const drag = throttle === 0 ? 1.6 : 0.45;
    p.v += (throttle * car.acc - p.v * drag) * dt;
    p.v = clamp(p.v, -car.max * 0.35, car.max);
    const nx = p.x + Math.cos(p.ang) * p.v * dt, ny = p.y + Math.sin(p.ang) * p.v * dt;
    const rad = car.wid * 0.85;
    if (!this.hitBlock(nx, ny, rad)) {
      p.x = nx;
      p.y = ny;
    } else if (!this.hitBlock(nx, p.y, rad)) {
      p.x = nx;
      p.v *= 0.8;
    } else if (!this.hitBlock(p.x, ny, rad)) {
      p.y = ny;
      p.v *= 0.8;
    } else {
      if (Math.abs(p.v) > 220) this.bump(0.5);
      p.v *= -0.25;
    }
    // provoz a srážky s ním
    this.updateTraffic(dt);
    for (const c of this.traffic) {
      const q = this.trafficPos(c), d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < 36) {
        const ux = (p.x - q.x) / (d || 1), uy = (p.y - q.y) / (d || 1);
        p.x += ux * (36 - d);
        p.y += uy * (36 - d);
        if (Math.abs(p.v) > 150) this.bump(0.7);
        p.v *= 0.3;
        c.wait = 0.8;
      }
    }
    // stopy smyku při ostrém zatáčení
    if (Math.abs(p.v) > car.max * 0.6 && Math.abs(mx) > 0.5) {
      this.trail.push({ x: p.x - Math.cos(p.ang) * car.len * 0.4, y: p.y - Math.sin(p.ang) * car.len * 0.4, t: this.t });
      if (this.trail.length > 120) this.trail.shift();
    }
    // kamera za autem: natáčí se se zpožděním
    let da = p.ang - (this.camAng === undefined ? p.ang : this.camAng);
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    this.camAng = (this.camAng === undefined ? p.ang : this.camAng) + da * Math.min(1, dt * 5);
    this.cam.x = p.x;
    this.cam.y = p.y;
    this.routeT -= dt;
    if (this.routeT <= 0) {
      this.routeT = 0.4;
      this.route();
    } else this.path[0] = { x: p.x, y: p.y };
    this.updateEngine();
    if (!this.arrived && Math.hypot(p.x - DRV.DEST.x, p.y - DRV.DEST.y) < 80) {
      this.arrived = true;
      this.arriveT = 0;
      Sound.fanfare();
    }
    if (this.arrived) {
      this.arriveT += dt;
      p.v *= 0.9;
      if (this.arriveT > 1.6 && this.onArrive) {
        const f = this.onArrive;
        this.onArrive = null;
        f();
      }
    }
  },

  bump(k) {
    this.shake = Math.max(this.shake, k);
    if (Sound.ctx && !Sound.muted) {
      Sound.hiss(0.2, 0.3 * k, 'lowpass', 600);
      Sound.tone('sine', 120, 50, 0.25, 0.3 * k);
    }
  },

  startEngine() {
    const c = Sound.ctx;
    if (!c || this.eng) return;
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 45;
    f.type = 'lowpass';
    f.frequency.value = 500;
    g.gain.value = 0.0001;
    o.connect(f);
    f.connect(g);
    g.connect(Sound.master);
    o.start();
    g.gain.setTargetAtTime(0.06, c.currentTime, 0.2);
    this.eng = { o, f, g };
  },
  updateEngine() {
    if (!this.eng) return;
    const c = Sound.ctx, k = Math.abs(this.p.v) / this.car.max;
    this.eng.o.frequency.setTargetAtTime(42 + k * 150, c.currentTime, 0.05);
    this.eng.f.frequency.setTargetAtTime(380 + k * 1400, c.currentTime, 0.05);
  },
  stopEngine() {
    if (!this.eng) return;
    const c = Sound.ctx, e = this.eng;
    e.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.08);
    setTimeout(() => { try { e.o.stop(); e.g.disconnect(); } catch (err) { /* nevadí */ } }, 500);
    this.eng = null;
  },

  /* ---------- kreslení ---------- */

  /* ---------- kreslení: kamera za autem (3D perspektiva) ---------- */

  // Bod světa (x, y, výška z) -> souřadnice kamery.
  camPt(x, y, z) {
    const C = this._C, dx = x - C.x, dy = y - C.y;
    const f = dx * C.c + dy * C.s, r = -dx * C.s + dy * C.c, u = z - C.z;
    return { r, zc: f * C.cp - u * C.sp, yc: f * C.sp + u * C.cp };
  },
  toScreen(q) {
    const C = this._C;
    return { x: C.w / 2 + (q.r * C.f) / q.zc, y: C.hy0 - (q.yc * C.f) / q.zc };
  },
  // Mlha: barva [r,g,b] -> směs s nocí podle vzdálenosti.
  fog(c, zc, a = 1) {
    const k = clamp((zc - 300) / 1900, 0, 0.88), F = [14, 10, 26];
    return `rgba(${Math.round(c[0] + (F[0] - c[0]) * k)},${Math.round(c[1] + (F[1] - c[1]) * k)},${Math.round(c[2] + (F[2] - c[2]) * k)},${a})`;
  },
  // Mnohoúhelník ve 3D s ořezem před kamerou.
  poly(ctx, pts, col, a) {
    const NEAR = 6, cs = pts.map((p) => this.camPt(p[0], p[1], p[2]));
    const out = [];
    for (let i = 0; i < cs.length; i++) {
      const A = cs[i], B = cs[(i + 1) % cs.length];
      const ain = A.zc >= NEAR, bin = B.zc >= NEAR;
      if (ain) out.push(A);
      if (ain !== bin) {
        const t = (NEAR - A.zc) / (B.zc - A.zc);
        out.push({ r: A.r + (B.r - A.r) * t, yc: A.yc + (B.yc - A.yc) * t, zc: NEAR });
      }
    }
    if (out.length < 3) return false;
    let zsum = 0;
    ctx.beginPath();
    out.forEach((q, i) => {
      const sp = this.toScreen(q);
      zsum += q.zc;
      if (i) ctx.lineTo(sp.x, sp.y);
      else ctx.moveTo(sp.x, sp.y);
    });
    ctx.closePath();
    ctx.fillStyle = typeof col === 'string' ? col : this.fog(col, zsum / out.length, a === undefined ? 1 : a);
    ctx.fill();
    return true;
  },
  // Kvádr natočený o úhel (auta) nebo osově zarovnaný (domy).
  box(ctx, cx, cy, ang, L, W, z0, z1, side, top, opt = {}) {
    const c = Math.cos(ang), s = Math.sin(ang), hl = L / 2, hw = W / 2;
    const P = [[hl, -hw], [hl, hw], [-hl, hw], [-hl, -hw]].map(([a, b]) => [cx + a * c - b * s, cy + a * s + b * c]);
    const C = this._C;
    const faces = [];
    for (let i = 0; i < 4; i++) {
      const A = P[i], B = P[(i + 1) % 4];
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
      const nx = (A[0] + B[0]) / 2 - cx, ny = (A[1] + B[1]) / 2 - cy;
      if (nx * (C.x - mx) + ny * (C.y - my) <= 0) continue; // odvrácená stěna
      const lit = 0.75 + 0.25 * Math.abs(nx * 0.7 + ny * 0.3) / (Math.hypot(nx, ny) || 1);
      faces.push({ i, A, B, d: Math.hypot(mx - C.x, my - C.y), lit });
    }
    faces.sort((a, b) => b.d - a.d);
    for (const F of faces) {
      const col = [side[0] * F.lit, side[1] * F.lit, side[2] * F.lit];
      this.poly(ctx, [[F.A[0], F.A[1], z0], [F.B[0], F.B[1], z0], [F.B[0], F.B[1], z1], [F.A[0], F.A[1], z1]], col);
      if (opt.windows) this.windows(ctx, F.A, F.B, z0, z1, opt.windows, F.i);
      if (opt.rear && F.i === 2) this.tailLights(ctx, F.A, F.B, z0, z1, opt.rear);
    }
    if (top && C.z > z1 - 1) this.poly(ctx, P.map(([x, y]) => [x, y, z1]), top);
    return P;
  },
  // Rozsvícená okna: vodorovné pásy po patrech.
  windows(ctx, A, B, z0, z1, seed, face) {
    const floors = Math.floor((z1 - z0) / 34);
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.max(1, Math.floor(len / 46));
    for (let f = 0; f < floors; f++) {
      const za = z0 + 12 + f * 34, zb = za + 16;
      for (let k = 0; k < n; k++) {
        const on = ((seed * 31 + f * 17 + k * 7 + face * 13) % 10) < 4;
        if (!on) continue;
        const t0 = (k + 0.2) / n, t1 = (k + 0.8) / n;
        const x0 = A[0] + (B[0] - A[0]) * t0, y0 = A[1] + (B[1] - A[1]) * t0, x1 = A[0] + (B[0] - A[0]) * t1, y1 = A[1] + (B[1] - A[1]) * t1;
        const warm = (seed + k + f) % 3 ? [255, 214, 150] : [150, 210, 255];
        this.poly(ctx, [[x0, y0, za], [x1, y1, za], [x1, y1, zb], [x0, y0, zb]], warm, 0.85);
      }
    }
  },
  tailLights(ctx, A, B, z0, z1, col) {
    const zl = z0 + (z1 - z0) * 0.45, zh = z0 + (z1 - z0) * 0.8;
    for (const [t0, t1] of [[0.06, 0.26], [0.74, 0.94]]) {
      const x0 = A[0] + (B[0] - A[0]) * t0, y0 = A[1] + (B[1] - A[1]) * t0, x1 = A[0] + (B[0] - A[0]) * t1, y1 = A[1] + (B[1] - A[1]) * t1;
      this.poly(ctx, [[x0, y0, zl], [x1, y1, zl], [x1, y1, zh], [x0, y0, zh]], col);
    }
  },
  // Auto ve 3D: podvozek, kabina, světla.
  car3d(ctx, x, y, ang, c, me) {
    const rgb = hexRgb(c.color).split(',').map(Number), dk = hexRgb(c.dark || shade(c.color, -0.4)).split(',').map(Number);
    this.box(ctx, x, y, ang, c.len, c.wid, 3, 15, rgb, rgb.map((v) => v * 1.1), { rear: 'rgba(255,40,60,1)' });
    const cl = c.id === 'limo' ? c.len * 0.62 : c.len * 0.48;
    this.box(ctx, x - Math.cos(ang) * c.len * 0.05, y - Math.sin(ang) * c.len * 0.05, ang, cl, c.wid * 0.84, 15, 27, [20, 28, 44], dk);
    if (c.spoiler) this.box(ctx, x - Math.cos(ang) * c.len * 0.46, y - Math.sin(ang) * c.len * 0.46, ang, 5, c.wid, 18, 22, [12, 12, 16], [12, 12, 16]);
    // světla: záře vzadu a před autem
    const C = this._C;
    for (const [d, col, rad] of [[-c.len / 2, '255,40,60', 22], [c.len / 2 + 30, '255,240,200', me ? 70 : 50]]) {
      const q = this.camPt(x + Math.cos(ang) * d, y + Math.sin(ang) * d, 10);
      if (q.zc < 10) continue;
      const sp = this.toScreen(q), r = (rad * C.f) / q.zc;
      const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, r);
      g.addColorStop(0, `rgba(${col},.55)`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(sp.x - r, sp.y - r, r * 2, r * 2);
      ctx.restore();
    }
  },
  // Billboard (lampy, neony): bod ve světě -> 2D kresba v měřítku vzdálenosti.
  bb(x, y, z) {
    const q = this.camPt(x, y, z);
    if (q.zc < 12) return null;
    const sp = this.toScreen(q);
    return { x: sp.x, y: sp.y, k: this._C.f / q.zc, zc: q.zc };
  },

  draw(ctx, w, h, dpr, now) {
    const p = this.p, ca = this.camAng, BACK = 150, CZ = 64, pitch = 0.16;
    const sh = this.shake * 6;
    this._C = {
      x: p.x - Math.cos(ca) * BACK + rand(-sh, sh), y: p.y - Math.sin(ca) * BACK + rand(-sh, sh), z: CZ,
      c: Math.cos(ca), s: Math.sin(ca), cp: Math.cos(pitch), sp: Math.sin(pitch), w, f: h * 0.95, hy0: h * 0.6,
    };
    const C = this._C, horizon = C.hy0 - C.f * Math.tan(pitch);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // obloha s rozzářeným městem u obzoru a hvězdami
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#04030a');
    sky.addColorStop(0.7, '#160c2a');
    sky.addColorStop(1, '#3a1a40');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon + 1);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 977 + Math.floor(ca * 400)) % w + w) % w, sy = (i * 53) % Math.max(1, horizon * 0.8);
      ctx.fillRect(sx, sy, 1.5 * dpr, 1.5 * dpr);
    }
    ctx.fillStyle = '#100c18';
    ctx.fillRect(0, horizon, w, h - horizon);
    // silnice a chodníky (zem)
    const R = DRV.ROAD / 2, RANGE = 2300;
    for (const x of DRV.XS) this.poly(ctx, [[x - R, 0, 0], [x + R, 0, 0], [x + R, DRV.H, 0], [x - R, DRV.H, 0]], [30, 31, 38]);
    for (const y of DRV.YS) this.poly(ctx, [[0, y - R, 0], [DRV.W, y - R, 0], [DRV.W, y + R, 0], [0, y + R, 0]], [30, 31, 38]);
    // čáry na silnici v okolí kamery
    const near = (a, b) => Math.abs(a - b) < RANGE;
    for (const x of DRV.XS) {
      if (!near(x, C.x)) continue;
      for (let y = Math.max(0, Math.floor((C.y - RANGE) / 60) * 60); y < Math.min(DRV.H, C.y + RANGE); y += 60) {
        if (DRV.YS.some((yy) => Math.abs(yy - y) < R + 10)) continue;
        this.poly(ctx, [[x - 2, y, 0.5], [x + 2, y, 0.5], [x + 2, y + 32, 0.5], [x - 2, y + 32, 0.5]], [230, 230, 230]);
      }
    }
    for (const y of DRV.YS) {
      if (!near(y, C.y)) continue;
      for (let x = Math.max(0, Math.floor((C.x - RANGE) / 60) * 60); x < Math.min(DRV.W, C.x + RANGE); x += 60) {
        if (DRV.XS.some((xx) => Math.abs(xx - x) < R + 10)) continue;
        this.poly(ctx, [[x, y - 2, 0.5], [x + 32, y - 2, 0.5], [x + 32, y + 2, 0.5], [x, y + 2, 0.5]], [230, 230, 230]);
      }
    }
    // navigace: svítící čára trasy na silnici
    if (this.path) {
      for (let i = 1; i < this.path.length; i++) {
        const A = this.path[i - 1], B = this.path[i], L = Math.hypot(B.x - A.x, B.y - A.y);
        if (L < 1) continue;
        const nx = -(B.y - A.y) / L * 9, ny = (B.x - A.x) / L * 9;
        this.poly(ctx, [[A.x + nx, A.y + ny, 1], [B.x + nx, B.y + ny, 1], [B.x - nx, B.y - ny, 1], [A.x - nx, A.y - ny, 1]], 'rgba(90,210,255,.42)');
      }
    }
    // objekty seřazené od nejvzdálenějších
    const items = [];
    const fwd = (x, y) => (x - C.x) * C.c + (y - C.y) * C.s;
    for (const b of this.blocks) {
      const bx = (b.x0 + b.x1) / 2, by = (b.y0 + b.y1) / 2;
      if (fwd(bx, by) < -500 || Math.hypot(bx - C.x, by - C.y) > RANGE + 400) continue;
      if (b.kind === 'park') {
        items.push({ d: Math.hypot(bx - C.x, by - C.y) + 400, f: () => {
          this.poly(ctx, [[b.x0 + 14, b.y0 + 14, 0.3], [b.x1 - 14, b.y0 + 14, 0.3], [b.x1 - 14, b.y1 - 14, 0.3], [b.x0 + 14, b.y1 - 14, 0.3]], [22, 52, 34]);
        } });
        for (const t of b.trees) items.push({ d: Math.hypot(t.x - C.x, t.y - C.y), f: () => this.tree(ctx, t) });
      } else if (b.kind === 'hp') {
        items.push({ d: Math.hypot(bx - C.x, by - C.y), f: () => this.hp3d(ctx, b, now) });
      } else {
        for (const hs of b.houses) {
          const hx = (hs.x0 + hs.x1) / 2, hy = (hs.y0 + hs.y1) / 2;
          items.push({ d: Math.hypot(hx - C.x, hy - C.y), f: () => this.house3d(ctx, hs, now) });
        }
      }
    }
    for (const q of this.parked) if (Math.hypot(q.x - C.x, q.y - C.y) < 1400 && fwd(q.x, q.y) > -60) items.push({ d: Math.hypot(q.x - C.x, q.y - C.y), f: () => this.car3d(ctx, q.x, q.y, q.ang, { color: q.c, len: 44, wid: 23 }, false) });
    for (const c of this.traffic) {
      const q = this.trafficPos(c);
      if (Math.hypot(q.x - C.x, q.y - C.y) < 1800 && fwd(q.x, q.y) > -60) items.push({ d: Math.hypot(q.x - C.x, q.y - C.y), f: () => this.car3d(ctx, q.x, q.y, q.ang, { color: c.c, len: c.len, wid: c.wid }, false) });
    }
    for (const x of DRV.XS) for (const y of DRV.YS) {
      if (Math.hypot(x - C.x, y - C.y) > 1600) continue;
      for (const [sx, sy] of [[-1, -1], [1, 1]]) {
        const lx = x + sx * (R + 12), ly = y + sy * (R + 12);
        if (fwd(lx, ly) > 10) items.push({ d: Math.hypot(lx - C.x, ly - C.y), f: () => this.lamp(ctx, lx, ly) });
      }
    }
    items.push({ d: Math.hypot(p.x - C.x, p.y - C.y), f: () => this.car3d(ctx, p.x, p.y, p.ang, this.car, true) });
    items.sort((a, b) => b.d - a.d);
    for (const it of items) it.f();
    // cíl: zářící sloup světla nad parkovištěm
    const dst = this.bb(DRV.DEST.x, DRV.DEST.y, 0);
    if (dst) {
      const top = this.bb(DRV.DEST.x, DRV.DEST.y, 260);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, dst.y, 0, top ? top.y : dst.y - 200);
      g.addColorStop(0, 'rgba(255,60,130,.55)');
      g.addColorStop(1, 'rgba(255,60,130,0)');
      ctx.fillStyle = g;
      const bw = 22 * dst.k;
      ctx.fillRect(dst.x - bw, top ? top.y : dst.y - 200, bw * 2, dst.y - (top ? top.y : dst.y - 200));
      ctx.restore();
    }
    // viněta a HUD
    const vg = ctx.createRadialGradient(w / 2, h * 0.6, h * 0.3, w / 2, h * 0.6, h);
    vg.addColorStop(0, 'rgba(0,0,10,0)');
    vg.addColorStop(1, 'rgba(0,0,10,.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    if (Math.abs(p.v) > this.car.max * 0.75) {
      // rychlostní čáry po stranách
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.lineWidth = 2 * dpr;
      for (let i = 0; i < 10; i++) {
        const yy = h * 0.35 + ((i * 97 + now * 0.9) % (h * 0.6));
        line(ctx, 0, yy, w * 0.12, yy + 20 * dpr);
        line(ctx, w, yy, w * 0.88, yy + 20 * dpr);
      }
    }
    this.drawHud(ctx, w, h, dpr, now);
    if (this.t < 4) {
      ctx.globalAlpha = Math.min(1, (4 - this.t) * 1.5);
      ctx.font = `${14 * dpr}px ${FONT_D}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Joystick nahoru = plyn · dolů = brzda · do stran = zatáčení', w / 2, h * 0.3);
      ctx.globalAlpha = 1;
    }
  },

  house3d(ctx, hs, now) {
    const col = this.hsl(hs.hue, 14, hs.l + 6);
    const cx = (hs.x0 + hs.x1) / 2, cy = (hs.y0 + hs.y1) / 2;
    this.box(ctx, cx, cy, 0, hs.x1 - hs.x0, hs.y1 - hs.y0, 0, hs.h, col, col.map((v) => v * 0.8), { windows: hs.win });
    if (hs.sign) {
      const b = this.bb(cx, cy, hs.h + 18);
      if (b && b.zc < 2000) {
        const fs = 34 * b.k;
        if (fs > 4) {
          ctx.save();
          ctx.globalAlpha = clamp(1 - (b.zc - 1400) / 600, 0, 1);
          ctx.font = `${fs}px ${FONT_D}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = `hsla(${hs.signHue},100%,60%,.4)`;
          ctx.lineWidth = fs * 0.35;
          ctx.strokeText(hs.sign, b.x, b.y);
          ctx.fillStyle = `hsl(${hs.signHue},100%,78%)`;
          ctx.fillText(hs.sign, b.x, b.y);
          ctx.restore();
        }
      }
    }
  },

  hp3d(ctx, b, now) {
    const t = now / 1000, ly = b.lotY, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + 14 + ly) / 2;
    // parkoviště a koberec
    this.poly(ctx, [[b.x0 + 14, ly, 0.4], [b.x1 - 14, ly, 0.4], [b.x1 - 14, b.y1, 0.4], [b.x0 + 14, b.y1, 0.4]], [40, 40, 50]);
    this.poly(ctx, [[cx - 26, ly - 2, 0.6], [cx + 26, ly - 2, 0.6], [cx + 26, ly + 60, 0.6], [cx - 26, ly + 60, 0.6]], [160, 18, 48]);
    // budova klubu: tmavá, zlatý pás, růžový LED pruh nahoře
    const W = b.x1 - b.x0 - 28, H = ly - b.y0 - 14, Hh = 150;
    this.box(ctx, cx, cy, 0, W, H, 0, Hh, [34, 16, 30], [26, 12, 22]);
    this.box(ctx, cx, cy, 0, W + 4, H + 4, Hh - 14, Hh - 4, [255, 60, 130], [255, 60, 130]);
    this.box(ctx, cx, cy, 0, W + 2, H + 2, 40, 46, [212, 165, 60], [212, 165, 60]);
    // obří neon
    const s = this.bb(cx, ly + 4, Hh + 40);
    if (s) {
      const fs = 70 * s.k;
      ctx.save();
      ctx.font = `italic ${fs}px ${FONT_D}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      for (const [lw, a] of [[0.5, 0.15], [0.25, 0.35], [0.1, 0.7]]) {
        ctx.strokeStyle = `rgba(255,50,110,${a + Math.sin(t * 3) * 0.05})`;
        ctx.lineWidth = fs * lw;
        ctx.strokeText('Hot Peppers', s.x, s.y);
      }
      ctx.fillStyle = '#ffe6ef';
      ctx.fillText('Hot Peppers', s.x, s.y);
      ctx.font = `${fs * 0.3}px ${FONT_D}`;
      ctx.fillStyle = '#f3d38a';
      ctx.fillText("GENTLEMEN'S CLUB", s.x, s.y + fs * 0.62);
      ctx.restore();
    }
    // reflektory do nebe
    for (let i = 0; i < 2; i++) {
      const a = t * 0.7 + i * 2.2, base = this.bb(cx + (i ? 120 : -120), cy, Hh);
      if (!base) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(base.x, base.y);
      ctx.rotate(Math.sin(a) * 0.5);
      const L = 900 * base.k + 200;
      const g = ctx.createLinearGradient(0, 0, 0, -L);
      g.addColorStop(0, 'rgba(255,140,210,.35)');
      g.addColorStop(1, 'rgba(255,140,210,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 0);
      ctx.lineTo(L * 0.12, -L);
      ctx.lineTo(-L * 0.12, -L);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  },

  tree(ctx, t) {
    const b = this.bb(t.x, t.y, 0), top = this.bb(t.x, t.y, 70);
    if (!b || !top) return;
    ctx.strokeStyle = this.fog([70, 50, 30], b.zc);
    ctx.lineWidth = Math.max(1, 6 * b.k);
    line(ctx, b.x, b.y, top.x, top.y + 20 * top.k);
    ctx.fillStyle = this.fog([30, 80, 46], b.zc);
    circle(ctx, top.x, top.y, Math.max(2, t.s * 0.9 * top.k));
    ctx.fill();
  },

  lamp(ctx, x, y) {
    const b = this.bb(x, y, 0), top = this.bb(x, y, 80);
    if (!b || !top) return;
    ctx.strokeStyle = this.fog([90, 90, 100], b.zc);
    ctx.lineWidth = Math.max(1, 3 * b.k);
    line(ctx, b.x, b.y, top.x, top.y);
    const r = 70 * top.k;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(top.x, top.y, 0, top.x, top.y, r);
    g.addColorStop(0, `rgba(255,210,140,${clamp(1 - b.zc / 1800, 0.1, 0.7)})`);
    g.addColorStop(1, 'rgba(255,210,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(top.x - r, top.y - r, r * 2, r * 2);
    const lg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r * 1.6);
    lg.addColorStop(0, 'rgba(255,200,120,.18)');
    lg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(b.x - r * 1.6, b.y - r * 0.6, r * 3.2, r * 1.2);
    ctx.restore();
  },

  hsl(h, s, l) {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  },

  // Auto shora: karoserie, okna, střecha, světla.
  drawCar(ctx, x, y, ang, c, lights, me) {
    const L = c.len, Wd = c.wid;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    if (lights) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(L / 2, 0, L / 2 + 190, 0);
      g.addColorStop(0, 'rgba(255,245,210,.4)');
      g.addColorStop(1, 'rgba(255,245,210,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(L / 2, -Wd * 0.35);
      ctx.lineTo(L / 2 + 190, -Wd * 1.6);
      ctx.lineTo(L / 2 + 190, Wd * 1.6);
      ctx.lineTo(L / 2, Wd * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    rrect(ctx, -L / 2 + 4, -Wd / 2 + 5, L, Wd, 8);
    ctx.fill();
    ctx.fillStyle = c.color;
    rrect(ctx, -L / 2, -Wd / 2, L, Wd, 8);
    ctx.fill();
    ctx.strokeStyle = '#06060a';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (c.stripes) {
      ctx.fillStyle = c.stripes;
      ctx.fillRect(-L / 2 + 2, -3.5, L - 4, 2.5);
      ctx.fillRect(-L / 2 + 2, 1, L - 4, 2.5);
    }
    // čelní sklo, střecha, zadní sklo
    const roofL = c.id === 'limo' ? L * 0.62 : L * 0.42;
    ctx.fillStyle = '#0d1420';
    rrect(ctx, -roofL / 2 - 6, -Wd / 2 + 3, roofL + 14, Wd - 6, 5);
    ctx.fill();
    ctx.fillStyle = c.dark;
    rrect(ctx, -roofL / 2, -Wd / 2 + 4, roofL, Wd - 8, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(roofL / 2 + 1, -Wd / 2 + 5, 5, Wd - 10);
    if (c.spoiler) {
      ctx.fillStyle = '#0b0b10';
      ctx.fillRect(-L / 2 - 3, -Wd / 2 + 1, 5, Wd - 2);
    }
    // světla
    ctx.fillStyle = '#fff6d8';
    ctx.fillRect(L / 2 - 4, -Wd / 2 + 2, 3, 5);
    ctx.fillRect(L / 2 - 4, Wd / 2 - 7, 3, 5);
    ctx.fillStyle = '#ff2a3a';
    ctx.fillRect(-L / 2 + 1, -Wd / 2 + 2, 3, 5);
    ctx.fillRect(-L / 2 + 1, Wd / 2 - 7, 3, 5);
    if (me && c.id === 'super') {
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillRect(-L / 2 + 6, -1, L - 12, 2);
    }
    ctx.restore();
  },

  drawHud(ctx, w, h, dpr, now) {
    const nav = this.navInfo(), k = dpr;
    // navigace nahoře
    const pw = Math.min(w * 0.5, 420 * k), ph = 64 * k, px = w / 2 - pw / 2, py = 10 * k;
    ctx.fillStyle = 'rgba(10,12,20,.82)';
    rrect(ctx, px, py, pw, ph, 14 * k);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,220,255,.6)';
    ctx.lineWidth = 2 * k;
    ctx.stroke();
    // šipka
    const ax = px + 34 * k, ay = py + ph / 2;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(this.arrived ? 0 : nav.turn === 'right' ? Math.PI / 2 : nav.turn === 'left' ? -Math.PI / 2 : 0);
    ctx.fillStyle = '#7fe0ff';
    ctx.beginPath();
    ctx.moveTo(0, -18 * k);
    ctx.lineTo(14 * k, 0);
    ctx.lineTo(5 * k, 0);
    ctx.lineTo(5 * k, 16 * k);
    ctx.lineTo(-5 * k, 16 * k);
    ctx.lineTo(-5 * k, 0);
    ctx.lineTo(-14 * k, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const m = (px2) => (px2 * 0.25 >= 1000 ? `${(px2 * 0.25 / 1000).toFixed(1).replace('.', ',')} km` : `${Math.max(10, Math.round(px2 * 0.25 / 10) * 10)} m`);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = `${18 * k}px ${FONT_D}`;
    const main = this.arrived ? 'Jsi na místě!' : nav.turn ? `Za ${m(nav.turnAt)} ${nav.turn === 'right' ? 'doprava' : 'doleva'}` : 'Rovně do cíle';
    ctx.fillText(main, px + 62 * k, py + 24 * k);
    ctx.font = `${13 * k}px ${FONT_D}`;
    ctx.fillStyle = '#ff9ac8';
    ctx.fillText(`🌶️ Hot Peppers · ${m(nav.total)}`, px + 62 * k, py + 46 * k);
    // rychloměr
    const kmh = Math.round(Math.abs(this.p.v) * 0.2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.font = `${40 * k}px ${FONT_D}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(kmh), w - 22 * k, h - 30 * k);
    ctx.font = `${12 * k}px ${FONT_D}`;
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillText(`km/h · ${this.car.name}`, w - 22 * k, h - 14 * k);
    // minimapa
    const mw = 150 * k, mh = mw * (DRV.H / DRV.W), mx0 = w - mw - 12 * k, my0 = 64 * k, s = mw / DRV.W;
    ctx.fillStyle = 'rgba(10,12,20,.8)';
    rrect(ctx, mx0 - 4 * k, my0 - 4 * k, mw + 8 * k, mh + 8 * k, 8 * k);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 2 * k;
    for (const x of DRV.XS) line(ctx, mx0 + x * s, my0, mx0 + x * s, my0 + mh);
    for (const y of DRV.YS) line(ctx, mx0, my0 + y * s, mx0 + mw, my0 + y * s);
    if (this.path) {
      ctx.strokeStyle = '#7fe0ff';
      ctx.lineWidth = 2.5 * k;
      ctx.beginPath();
      this.path.forEach((q, i) => (i ? ctx.lineTo(mx0 + q.x * s, my0 + q.y * s) : ctx.moveTo(mx0 + q.x * s, my0 + q.y * s)));
      ctx.stroke();
    }
    ctx.fillStyle = '#ff3d7a';
    circle(ctx, mx0 + DRV.DEST.x * s, my0 + DRV.DEST.y * s, 4.5 * k);
    ctx.fill();
    ctx.fillStyle = '#ffd24a';
    circle(ctx, mx0 + this.p.x * s, my0 + this.p.y * s, 4 * k);
    ctx.fill();
    if (this.arrived) {
      const a = Math.min(1, this.arriveT * 2);
      ctx.fillStyle = `rgba(0,0,0,${a * 0.5})`;
      ctx.fillRect(0, 0, w, h);
      ctx.textBaseline = 'middle';
      ctx.font = `italic ${52 * k}px ${FONT_D}`;
      ctx.lineWidth = 10 * k;
      ctx.strokeStyle = `rgba(255,50,110,${a * 0.5})`;
      ctx.strokeText('Hot Peppers', w / 2, h * 0.42);
      ctx.fillStyle = `rgba(255,230,240,${a})`;
      ctx.fillText('Hot Peppers', w / 2, h * 0.42);
      ctx.font = `${18 * k}px ${FONT_D}`;
      ctx.fillStyle = `rgba(243,211,138,${a})`;
      ctx.fillText('Zaparkováno. Ochranka otvírá dveře…', w / 2, h * 0.56);
    }
  },
};
