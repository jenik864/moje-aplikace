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
              hue: Math.floor(r() * 360), l: 12 + r() * 10, ac: Math.floor(r() * 4),
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
    let { mx, my } = inp;
    const mag = Math.min(1, Math.hypot(mx, my));
    let throttle = 0;
    if (mag > 0.15 && !this.arrived) {
      // auto zatáčí ke směru joysticku a přidává plyn
      const want = Math.atan2(my, mx);
      let diff = want - p.ang;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const grip = clamp(Math.abs(p.v) / 140, 0.25, 1);
      p.ang += clamp(diff, -car.turn * grip * dt, car.turn * grip * dt);
      throttle = Math.abs(diff) > 2.3 ? -0.6 : mag * (1 - Math.min(0.6, Math.abs(diff) / 3));
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
    if (Math.abs(p.v) > car.max * 0.6 && mag > 0.15) {
      this.trail.push({ x: p.x - Math.cos(p.ang) * car.len * 0.4, y: p.y - Math.sin(p.ang) * car.len * 0.4, t: this.t });
      if (this.trail.length > 120) this.trail.shift();
    }
    // kamera s předstihem ve směru jízdy
    const lead = 0.35;
    this.cam.x = lerp(this.cam.x, p.x + Math.cos(p.ang) * p.v * lead, Math.min(1, dt * 4));
    this.cam.y = lerp(this.cam.y, p.y + Math.sin(p.ang) * p.v * lead, Math.min(1, dt * 4));
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

  draw(ctx, w, h, dpr, now) {
    const sc = h / DRV.VIEW_H, vw = w / sc, vh = DRV.VIEW_H;
    const cx = clamp(this.cam.x, vw / 2, DRV.W - vw / 2), cy = clamp(this.cam.y, vh / 2, DRV.H - vh / 2);
    const sh = this.shake * 8;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(0, 0, w, h);
    ctx.setTransform(sc, 0, 0, sc, w / 2 - (cx + rand(-sh, sh)) * sc, h / 2 - (cy + rand(-sh, sh)) * sc);
    const V = { x0: cx - vw / 2 - 60, x1: cx + vw / 2 + 60, y0: cy - vh / 2 - 60, y1: cy + vh / 2 + 60 };
    this.drawRoads(ctx, V);
    for (const b of this.blocks) if (b.x1 > V.x0 && b.x0 < V.x1 && b.y1 > V.y0 && b.y0 < V.y1) this.drawBlock(ctx, b, now);
    // stopy smyku
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    for (const s of this.trail) if (this.t - s.t < 4) {
      circle(ctx, s.x, s.y, 4);
      ctx.fill();
    }
    this.drawRoute(ctx, now);
    for (const q of this.parked) if (q.x > V.x0 && q.x < V.x1 && q.y > V.y0 && q.y < V.y1) this.drawCar(ctx, q.x, q.y, q.ang, { color: q.c, dark: shade(q.c, -0.4), len: 44, wid: 23 }, false, false);
    for (const c of this.traffic) {
      const q = this.trafficPos(c);
      if (q.x > V.x0 && q.x < V.x1 && q.y > V.y0 && q.y < V.y1) this.drawCar(ctx, q.x, q.y, q.ang, { color: c.c, dark: shade(c.c, -0.4), len: c.len, wid: c.wid }, true, false);
    }
    const p = this.p;
    this.drawCar(ctx, p.x, p.y, p.ang, this.car, true, true);
    this.drawLamps(ctx, V, now);
    // cíl
    const pulse = 1 + Math.sin(now * 0.006) * 0.15;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(DRV.DEST.x, DRV.DEST.y, 5, DRV.DEST.x, DRV.DEST.y, 90 * pulse);
    g.addColorStop(0, 'rgba(255,60,120,.6)');
    g.addColorStop(1, 'rgba(255,60,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(DRV.DEST.x - 100, DRV.DEST.y - 100, 200, 200);
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // noční viněta
    const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.9);
    vg.addColorStop(0, 'rgba(0,0,10,0)');
    vg.addColorStop(1, 'rgba(0,0,10,.6)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    this.drawHud(ctx, w, h, dpr, now);
  },

  drawRoads(ctx, V) {
    const R = DRV.ROAD, h = R / 2;
    ctx.fillStyle = '#17181e';
    for (const x of DRV.XS) ctx.fillRect(x - h, V.y0, R, V.y1 - V.y0);
    for (const y of DRV.YS) ctx.fillRect(V.x0, y - h, V.x1 - V.x0, R);
    // středové čáry a okraje
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([30, 26]);
    for (const x of DRV.XS) line(ctx, x, V.y0, x, V.y1);
    for (const y of DRV.YS) line(ctx, V.x0, y, V.x1, y);
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,200,80,.35)';
    ctx.lineWidth = 2;
    for (const x of DRV.XS) {
      line(ctx, x - h + 6, V.y0, x - h + 6, V.y1);
      line(ctx, x + h - 6, V.y0, x + h - 6, V.y1);
    }
    for (const y of DRV.YS) {
      line(ctx, V.x0, y - h + 6, V.x1, y - h + 6);
      line(ctx, V.x0, y + h - 6, V.x1, y + h - 6);
    }
    // křižovatky: asfalt přes čáry a přechody
    for (const x of DRV.XS) for (const y of DRV.YS) {
      if (x < V.x0 - R || x > V.x1 + R || y < V.y0 - R || y > V.y1 + R) continue;
      ctx.fillStyle = '#17181e';
      ctx.fillRect(x - h, y - h, R, R);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      for (let k = -h + 12; k < h - 12; k += 18) {
        ctx.fillRect(x + k, y - h - 18, 9, 16);
        ctx.fillRect(x + k, y + h + 2, 9, 16);
        ctx.fillRect(x - h - 18, y + k, 16, 9);
        ctx.fillRect(x + h + 2, y + k, 16, 9);
      }
    }
  },

  drawBlock(ctx, b, now) {
    // chodník
    ctx.fillStyle = '#2c2d36';
    ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x0 + 1, b.y0 + 1, b.x1 - b.x0 - 2, b.y1 - b.y0 - 2);
    if (b.kind === 'park') {
      ctx.fillStyle = '#10241a';
      ctx.fillRect(b.x0 + 14, b.y0 + 14, b.x1 - b.x0 - 28, b.y1 - b.y0 - 28);
      ctx.strokeStyle = 'rgba(200,180,140,.25)';
      ctx.lineWidth = 8;
      line(ctx, b.x0 + 14, (b.y0 + b.y1) / 2, b.x1 - 14, (b.y0 + b.y1) / 2);
      for (const t of b.trees) {
        ctx.fillStyle = 'rgba(0,0,0,.4)';
        circle(ctx, t.x + 6, t.y + 8, t.s);
        ctx.fill();
        ctx.fillStyle = '#1d4a2a';
        circle(ctx, t.x, t.y, t.s);
        ctx.fill();
        ctx.fillStyle = 'rgba(120,200,120,.18)';
        circle(ctx, t.x - t.s * 0.3, t.y - t.s * 0.3, t.s * 0.5);
        ctx.fill();
      }
      return;
    }
    if (b.kind === 'hp') {
      this.drawHotPeppers(ctx, b, now);
      return;
    }
    for (const hs of b.houses) {
      // střecha domu se stínem a detaily
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(hs.x0 + 10, hs.y0 + 12, hs.x1 - hs.x0, hs.y1 - hs.y0);
      ctx.fillStyle = `hsl(${hs.hue},14%,${hs.l}%)`;
      ctx.fillRect(hs.x0, hs.y0, hs.x1 - hs.x0, hs.y1 - hs.y0);
      ctx.strokeStyle = `hsl(${hs.hue},14%,${hs.l + 10}%)`;
      ctx.lineWidth = 6;
      ctx.strokeRect(hs.x0 + 3, hs.y0 + 3, hs.x1 - hs.x0 - 6, hs.y1 - hs.y0 - 6);
      ctx.fillStyle = `hsl(${hs.hue},10%,${hs.l + 6}%)`;
      for (let k = 0; k < hs.ac; k++) {
        const ax = hs.x0 + 30 + k * 60, ay = hs.y0 + 30 + (k % 2) * 50;
        if (ax + 40 > hs.x1) break;
        ctx.fillRect(ax, ay, 36, 26);
        ctx.strokeStyle = 'rgba(0,0,0,.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(ax, ay, 36, 26);
      }
      if (hs.sign) {
        const sx = (hs.x0 + hs.x1) / 2, sy = hs.y1 - 30;
        ctx.save();
        ctx.font = `30px ${FONT_D}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const flick = Math.sin(now * 0.004 + hs.hue) > -0.95 ? 1 : 0.3;
        ctx.globalAlpha = flick;
        ctx.strokeStyle = `hsla(${hs.signHue},100%,60%,.35)`;
        ctx.lineWidth = 12;
        ctx.strokeText(hs.sign, sx, sy);
        ctx.fillStyle = `hsl(${hs.signHue},100%,75%)`;
        ctx.fillText(hs.sign, sx, sy);
        ctx.restore();
      }
    }
  },

  drawHotPeppers(ctx, b, now) {
    const t = now / 1000, ly = b.lotY;
    // budova klubu
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(b.x0 + 24, b.y0 + 26, b.x1 - b.x0 - 28, ly - b.y0 - 28);
    ctx.fillStyle = '#1a0a14';
    ctx.fillRect(b.x0 + 14, b.y0 + 14, b.x1 - b.x0 - 28, ly - b.y0 - 28);
    ctx.strokeStyle = '#d4a53c';
    ctx.lineWidth = 4;
    ctx.strokeRect(b.x0 + 20, b.y0 + 20, b.x1 - b.x0 - 40, ly - b.y0 - 40);
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + ly) / 2;
    // reflektory ze střechy
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      const a = t * 0.8 + i * Math.PI, ex = cx + Math.cos(a) * 900, ey = cy + Math.sin(a) * 900;
      const g = ctx.createLinearGradient(cx, cy, ex, ey);
      g.addColorStop(0, 'rgba(255,120,200,.25)');
      g.addColorStop(1, 'rgba(255,120,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex + Math.sin(a) * 120, ey - Math.cos(a) * 120);
      ctx.lineTo(ex - Math.sin(a) * 120, ey + Math.cos(a) * 120);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // obří neon na střeše
    ctx.save();
    ctx.font = `italic 64px ${FONT_D}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const [lw, a] of [[30, 0.12], [16, 0.3], [8, 0.6]]) {
      ctx.strokeStyle = `rgba(255,50,110,${a})`;
      ctx.lineWidth = lw;
      ctx.strokeText('Hot Peppers', cx, cy - 20);
    }
    ctx.fillStyle = '#ffe6ef';
    ctx.fillText('Hot Peppers', cx, cy - 20);
    ctx.font = `22px ${FONT_D}`;
    ctx.fillStyle = '#f3d38a';
    ctx.fillText("GENTLEMEN'S CLUB", cx, cy + 34);
    ctx.restore();
    // parkoviště s čarami a červený koberec ke vchodu
    ctx.fillStyle = '#1e1f27';
    ctx.fillRect(b.x0 + 14, ly, b.x1 - b.x0 - 28, b.y1 - ly);
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 3;
    for (let x = b.x0 + 40; x < b.x1 - 30; x += 58) if (Math.abs(x - cx) > 70) line(ctx, x, ly + 6, x, ly + 70);
    ctx.fillStyle = '#9e1230';
    ctx.fillRect(cx - 26, ly - 30, 52, 40);
    ctx.fillStyle = '#d4a53c';
    ctx.fillRect(cx - 30, ly - 34, 60, 5);
    ctx.font = `18px ${FONT_D}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,215,140,.9)';
    ctx.fillText('VJEZD', cx, b.y1 - 8);
  },

  // Pouliční lampy na rozích křižovatek (teplé světlo).
  drawLamps(ctx, V, now) {
    const h = DRV.ROAD / 2 + 14;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const x of DRV.XS) for (const y of DRV.YS) {
      if (x < V.x0 - 200 || x > V.x1 + 200 || y < V.y0 - 200 || y > V.y1 + 200) continue;
      for (const [sx, sy] of [[-1, -1], [1, 1]]) {
        const lx = x + sx * h, ly = y + sy * h;
        const g = ctx.createRadialGradient(lx, ly, 4, lx, ly, 150);
        g.addColorStop(0, 'rgba(255,200,120,.28)');
        g.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = g;
        ctx.fillRect(lx - 150, ly - 150, 300, 300);
        ctx.fillStyle = 'rgba(255,230,180,.9)';
        circle(ctx, lx, ly, 5);
        ctx.fill();
      }
    }
    ctx.restore();
  },

  drawRoute(ctx, now) {
    const P = this.path;
    if (!P || P.length < 2) return;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(P[0].x, P[0].y);
    for (let i = 1; i < P.length; i++) ctx.lineTo(P[i].x, P[i].y);
    ctx.strokeStyle = 'rgba(80,200,255,.18)';
    ctx.lineWidth = 34;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,220,255,.75)';
    ctx.lineWidth = 8;
    ctx.setLineDash([24, 18]);
    ctx.lineDashOffset = -now * 0.12;
    ctx.stroke();
    ctx.restore();
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
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = `${34 * k}px ${FONT_D}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(kmh), w / 2, h - 26 * k);
    ctx.font = `${12 * k}px ${FONT_D}`;
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillText(`km/h · ${this.car.name}`, w / 2, h - 10 * k);
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
