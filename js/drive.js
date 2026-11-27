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
const DRV_FOG = [20, 12, 36];
const DRV_TL = ['255,50,60', '255,190,40', '60,255,150']; // červená, oranžová, zelená
const DRV_UNDERGLOW = { super: '255,190,70', kupe: '255,50,90', limo: '170,200,255', kombi: '60,150,255', suv: '90,255,190' };
const DRV_SEAT = { hatch: [96, 78, 60], kombi: [74, 76, 88], suv: [36, 36, 42], kupe: [156, 26, 40], super: [150, 84, 34], limo: [216, 202, 178] };
const DRV_ADS = [
  { t: 'FIFA 67', bg: [30, 90, 255], fg: '#ffffff', glow: '60,120,255' },
  { t: 'HOT PEPPERS', bg: [255, 40, 120], fg: '#fff1f6', glow: '255,60,140' },
  { t: 'FIFAgram', bg: [250, 250, 255], fg: '#d62976', glow: '255,200,230' },
  { t: 'PIVO 29 Kč', bg: [255, 196, 40], fg: '#3a1a00', glow: '255,200,60' },
  { t: 'KEBAB NONSTOP', bg: [20, 160, 90], fg: '#ffffff', glow: '40,220,120' },
];

const Drive = {
  on: false,

  start(carId, onArrive, charId, skin) {
    this.on = true;
    this.car = carById(carId);
    this.driverImg = this.makeDriver(charId || 'jenda', skin || '');
    this.onArrive = onArrive;
    this.p = { x: DRV.START.x + 40, y: DRV.START.y + 36, ang: 0, v: 0, steer: 0 };
    this.cam = { x: this.p.x, y: this.p.y };
    this.camAng = 0;
    this.t = 0;
    this.shake = 0;
    this.arrived = false;
    this.routeT = 0;
    this.trail = [];
    this.fx = [];
    this.wheelRot = 0;
    this.thr = 0;
    this.braking = false;
    this.ft = undefined;
    if (!this.blocks || !this.lamps) this.buildCity();
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
              hue: Math.floor(r() * 360), l: 12 + r() * 10, ac: Math.floor(r() * 4), h: 90 + r() * 210, win: Math.floor(r() * 1000), inW: k > 0, inE: k < n - 1,
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
    // lampy podél ulic (střídavě po stranách) a semafory na rozích křižovatek
    const R = DRV.ROAD / 2;
    this.lamps = [];
    DRV.XS.forEach((x, i) => {
      let sd = i % 2 ? 1 : -1;
      for (let y = 170; y < DRV.H - 80; y += 230) {
        if (DRV.YS.some((yy) => Math.abs(yy - y) < R + 50)) continue;
        this.lamps.push({ x: x + sd * (R + 6), y, dx: -sd, dy: 0 });
        sd = -sd;
      }
    });
    DRV.YS.forEach((y, j) => {
      let sd = j % 2 ? 1 : -1;
      for (let x = 170; x < DRV.W - 80; x += 230) {
        if (DRV.XS.some((xx) => Math.abs(xx - x) < R + 50)) continue;
        this.lamps.push({ x, y: y + sd * (R + 6), dx: 0, dy: -sd });
        sd = -sd;
      }
    });
    this.tlights = [];
    DRV.XS.forEach((x, i) => DRV.YS.forEach((y, j) => {
      const off = (i * 3 + j * 5) % 12;
      this.tlights.push({ x: x - R - 8, y: y + R + 8, dx: 1, dy: 0, v: true, off });
      this.tlights.push({ x: x + R + 8, y: y - R - 8, dx: -1, dy: 0, v: true, off });
      this.tlights.push({ x: x - R - 8, y: y - R - 8, dx: 0, dy: 1, v: false, off });
      this.tlights.push({ x: x + R + 8, y: y + R + 8, dx: 0, dy: -1, v: false, off });
    }));
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
      this.traffic.push({ horiz, lane, dir: Math.random() < 0.5 ? 1 : -1, pos: rand(200, (horiz ? DRV.W : DRV.H) - 200), sp: rand(170, 260), c: k === 3 ? '#eef0f6' : cols[k % cols.length], kind: k === 3 ? 'police' : k % 8 === 6 ? 'taxi' : '', wait: 0, len: 46, wid: 24 });
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
    this.thr = throttle;
    this.braking = throttle < -0.1 && p.v > 30;
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
    this.wheelRot = (this.wheelRot || 0) + (p.v * dt) / 6.4;
    // částice: kouř z výfuku a dým pneumatik ve smyku
    this.fxT = (this.fxT || 0) - dt;
    if (this.fxT <= 0) {
      this.fxT = 0.06;
      const co = Math.cos(p.ang), si = Math.sin(p.ang), bx = p.x - co * (car.len * 0.5 + 2), by = p.y - si * (car.len * 0.5 + 2);
      if (throttle > 0.3 && p.v < car.max * 0.8) {
        for (const sg of [-1, 1]) this.fx.push({ x: bx - si * sg * car.wid * 0.27, y: by + co * sg * car.wid * 0.27, z: 4, vx: -co * 30 + rand(-8, 8), vy: -si * 30 + rand(-8, 8), vz: 10, life: 0, max: 0.9, r0: 2, r1: 9, a: 0.22, col: '190,180,210' });
      }
      if (Math.abs(p.v) > car.max * 0.6 && Math.abs(mx) > 0.5) {
        for (const sg of [-1, 1]) this.fx.push({ x: bx - si * sg * car.wid * 0.4, y: by + co * sg * car.wid * 0.4, z: 3, vx: rand(-20, 20), vy: rand(-20, 20), vz: 14, life: 0, max: 1.3, r0: 5, r1: 22, a: 0.3, col: '225,225,240' });
      }
    }
    for (const q of this.fx) {
      q.life += dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.z = Math.max(0.5, q.z + q.vz * dt);
      if (q.spark) q.vz -= 300 * dt;
    }
    this.fx = this.fx.filter((q) => q.life < q.max).slice(-90);
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
    // automatická kvalita: když hra seká, scéna se kreslí v nižším rozlišení
    this.ft = this.ft === undefined ? 1 / 60 : this.ft * 0.94 + dt * 0.06;
    this.qT = (this.qT || 0) + dt;
    if (this.t > 2 && this.qT > 1.2) {
      this.qT = 0;
      const q = this.quality || 1;
      if (this.ft > 1 / 38 && q > 0.55) {
        this.qMax = q - 0.05;
        this.quality = Math.max(0.55, q - 0.15);
      } else if (this.ft < 1 / 55 && q < (this.qMax || 1)) this.quality = Math.min(this.qMax || 1, q + 0.05);
    }
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
    const p = this.p;
    if (this.fx && p) {
      for (let i = 0; i < 12; i++) {
        const a = rand(0, Math.PI * 2), v = rand(60, 170);
        this.fx.push({ x: p.x + Math.cos(p.ang) * this.car.len * 0.5, y: p.y + Math.sin(p.ang) * this.car.len * 0.5, z: 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(40, 110), life: 0, max: rand(0.3, 0.6), r0: 1, r1: 1, a: 1, spark: true });
      }
    }
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

  // Kamera bez náklonu: svislé hrany zůstávají svislé, obzor je posunutý nahoru.
  camPt(x, y, z) {
    const C = this._C, dx = x - C.x, dy = y - C.y;
    return { r: -dx * C.s + dy * C.c, zc: dx * C.c + dy * C.s, yc: z - C.z };
  },
  toScreen(q) {
    const C = this._C;
    return { x: C.w / 2 + (q.r * C.f) / q.zc, y: C.hz - (q.yc * C.f) / q.zc };
  },
  // Bod světa -> obrazovka (null za kamerou); k = měřítko v pixelech na jednotku.
  bb(x, y, z) {
    const C = this._C, dx = x - C.x, dy = y - C.y, zc = dx * C.c + dy * C.s;
    if (zc < 8) return null;
    const k = C.f / zc;
    return { x: C.w / 2 + (-dx * C.s + dy * C.c) * k, y: C.hz - (z - C.z) * k, k, zc };
  },
  depth(x, y) {
    const C = this._C;
    return (x - C.x) * C.c + (y - C.y) * C.s;
  },
  // Mlha: barva [r,g,b] -> směs s noční oparou podle vzdálenosti.
  fog(c, zc, a = 1) {
    const k = clamp((zc - 380) / 2000, 0, 0.9), F = DRV_FOG;
    return `rgba(${(c[0] + (F[0] - c[0]) * k) | 0},${(c[1] + (F[1] - c[1]) * k) | 0},${(c[2] + (F[2] - c[2]) * k) | 0},${a})`;
  },
  // Cesta mnohoúhelníku s ořezem před kamerou. keep = přidat do rozdělané cesty (dávkové kreslení).
  path3(ctx, pts, keep) {
    const C = this._C, n = pts.length, R = this._R, Z = this._Z, Y = this._Y, hw = C.w / 2;
    for (let i = 0; i < n; i++) {
      const q = pts[i], dx = q[0] - C.x, dy = q[1] - C.y;
      R[i] = -dx * C.s + dy * C.c;
      Z[i] = dx * C.c + dy * C.s;
      Y[i] = q[2] - C.z;
    }
    if (!keep) ctx.beginPath();
    let cnt = 0, zs = 0;
    for (let i = 0; i < n; i++) {
      const j = i + 1 === n ? 0 : i + 1, a = Z[i] >= 4, b = Z[j] >= 4;
      if (a) {
        const k = C.f / Z[i], sx = hw + R[i] * k, sy = C.hz - Y[i] * k;
        if (cnt) ctx.lineTo(sx, sy);
        else ctx.moveTo(sx, sy);
        cnt++;
        zs += Z[i];
      }
      if (a !== b) {
        const t = (4 - Z[i]) / (Z[j] - Z[i]), k = C.f / 4;
        const sx = hw + (R[i] + (R[j] - R[i]) * t) * k, sy = C.hz - (Y[i] + (Y[j] - Y[i]) * t) * k;
        if (cnt) ctx.lineTo(sx, sy);
        else ctx.moveTo(sx, sy);
        cnt++;
        zs += 4;
      }
    }
    if (cnt < 3) return false;
    ctx.closePath();
    this._zs = zs / cnt;
    return true;
  },
  poly(ctx, pts, col, a) {
    if (!this.path3(ctx, pts)) return false;
    ctx.fillStyle = typeof col === 'string' ? col : this.fog(col, this._zs, a === undefined ? 1 : a);
    ctx.fill();
    return true;
  },
  // Dávka stejně barevných mnohoúhelníků jednou výplní.
  batch(ctx, list, col, zf) {
    if (!list.length) return;
    ctx.beginPath();
    for (const q of list) this.path3(ctx, q, true);
    ctx.fillStyle = typeof col === 'string' ? col : this.fog(col, zf);
    ctx.fill();
  },
  line3(ctx, pts, col, wd, close) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const b = this.bb(pts[i][0], pts[i][1], pts[i][2]);
      if (!b) return;
      if (i) ctx.lineTo(b.x, b.y);
      else ctx.moveTo(b.x, b.y);
    }
    if (close) ctx.closePath();
    ctx.strokeStyle = col;
    ctx.lineWidth = wd;
    ctx.stroke();
  },
  // Kvádr natočený o úhel (sedačky, spoiler) nebo osově zarovnaný (římsy).
  box(ctx, cx, cy, ang, L, W, z0, z1, side, top) {
    const c = Math.cos(ang), s = Math.sin(ang), hl = L / 2, hw = W / 2;
    const P = [[hl, -hw], [hl, hw], [-hl, hw], [-hl, -hw]].map(([a, b]) => [cx + a * c - b * s, cy + a * s + b * c]);
    const C = this._C;
    for (let i = 0; i < 4; i++) {
      const A = P[i], B = P[(i + 1) % 4];
      const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, nx = mx - cx, ny = my - cy;
      if (nx * (C.x - mx) + ny * (C.y - my) <= 0) continue; // odvrácená stěna (konvexní – pořadí nevadí)
      const lit = 0.72 + 0.28 * Math.abs(nx * 0.6 + ny * 0.4) / (Math.hypot(nx, ny) || 1);
      this.poly(ctx, [[A[0], A[1], z0], [B[0], B[1], z0], [B[0], B[1], z1], [A[0], A[1], z1]], [side[0] * lit, side[1] * lit, side[2] * lit]);
    }
    if (top && C.z > z1 - 1) this.poly(ctx, P.map(([x, y]) => [x, y, z1]), top);
    return P;
  },
  // Bod v souřadnicích auta (dopředu f, doprava r) -> svět.
  local(x, y, ang, f, r) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return [x + f * c - r * s, y + f * s + r * c];
  },
  quadL(ctx, x, y, ang, pts, col, a) {
    this.poly(ctx, pts.map(([f, r, z]) => [...this.local(x, y, ang, f, r), z]), col, a);
  },
  rgbOf(col) {
    const M = this._rgb || (this._rgb = {});
    return M[col] || (M[col] = hexRgb(col).split(',').map(Number));
  },
  hash(a) {
    a = (a ^ 61) ^ (a >>> 16);
    a += a << 3;
    a ^= a >>> 4;
    a = Math.imul(a, 0x27d4eb2d);
    a ^= a >>> 15;
    return a >>> 0;
  },
  // Předkreslená měkká záře v dané barvě (rychlejší než gradient v každém snímku).
  sprite(rgb) {
    const S = this._spr || (this._spr = {});
    if (S[rgb]) return S[rgb];
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`);
    gr.addColorStop(0.22, `rgba(${rgb},.55)`);
    gr.addColorStop(0.55, `rgba(${rgb},.16)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return (S[rgb] = cv);
  },
  glowAt(ctx, sx, sy, rx, ry, rgb, a) {
    if (rx < 0.8 || a <= 0.01) return;
    const mx = this._C ? this._C.w * 0.45 : 9999;
    if (rx > mx) {
      ry *= mx / rx;
      rx = mx;
    }
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(this.sprite(rgb), sx - rx, sy - ry, rx * 2, ry * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = prev;
  },
  glow(ctx, x, y, z, rad, rgb, a) {
    const b = this.bb(x, y, z);
    if (b) this.glowAt(ctx, b.x, b.y, rad * b.k, rad * b.k, rgb, a);
  },
  // Světelná skvrna na zemi (elipsa podle perspektivy).
  pool(ctx, x, y, rad, rgb, a) {
    const b = this.bb(x, y, 0);
    if (!b) return;
    const rx = rad * b.k;
    this.glowAt(ctx, b.x, b.y, rx, rx * Math.min(1, (this._C.z * 1.1) / b.zc), rgb, a);
  },
  // Text namapovaný na svislý obdélník ve světě (rohy vlevo dole, vpravo dole, vlevo nahoře).
  wallText(ctx, BL, BR, TL, text, col, glowCol, minW = 16) {
    const a = this.bb(BL[0], BL[1], BL[2]), b = this.bb(BR[0], BR[1], BR[2]), t = this.bb(TL[0], TL[1], TL[2]);
    if (!a || !b || !t || Math.abs(b.x - a.x) < minW) return;
    const Wd = 200, Hd = 40;
    ctx.save();
    ctx.setTransform((b.x - a.x) / Wd, (b.y - a.y) / Wd, (a.x - t.x) / Hd, (a.y - t.y) / Hd, t.x, t.y);
    let fs = 30;
    ctx.font = `${fs}px ${FONT_D}`;
    const mw = ctx.measureText(text).width;
    if (mw > 184) {
      fs *= 184 / mw;
      ctx.font = `${fs}px ${FONT_D}`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (glowCol) {
      ctx.strokeStyle = glowCol;
      ctx.lineJoin = 'round';
      ctx.lineWidth = fs * 0.32;
      ctx.strokeText(text, Wd / 2, Hd / 2 + 1);
    }
    ctx.fillStyle = col;
    ctx.fillText(text, Wd / 2, Hd / 2 + 1);
    ctx.restore();
  },

  /* ---------- auta ---------- */

  // Karoserie jako konvexní obal z řezů podél délky; plochy s normálami (v souřadnicích auta f, r, z).
  carMesh(c, open) {
    const key = `${c.id || 'npc'}|${c.len}|${c.wid}|${open ? 1 : 0}`;
    const MS = this._mesh || (this._mesh = {});
    if (MS[key]) return MS[key];
    const L = c.len, W = c.wid, id = c.id || '';
    const sport = id === 'kupe' || id === 'super', suv = id === 'suv', limo = id === 'limo';
    const zb = suv ? 5 : sport ? 2.6 : 3.2, zt = suv ? 18.5 : sport ? 12.6 : 14.6;
    const cab0 = limo ? -0.3 : sport ? -0.15 : -0.19, cab1 = limo ? 0.15 : sport ? 0.13 : 0.14;
    const prof = sport
      ? [[-0.5, 0.43, 0.36, 1.6, -2.6], [-0.45, 0.5, 0.42, 0, 0], [cab0, 0.5, 0.42, 0, 0], [cab1, 0.5, 0.42, 0, -1.3], [0.33, 0.49, 0.4, 0, -4.4], [0.5, 0.41, 0.32, 1.2, -7.6]]
      : suv
        ? [[-0.5, 0.47, 0.41, 1, -2], [-0.46, 0.5, 0.45, 0, 0], [cab0, 0.5, 0.45, 0, 0], [cab1, 0.5, 0.45, 0, -0.6], [0.41, 0.5, 0.44, 0, -2.2], [0.5, 0.45, 0.38, 1, -4.8]]
        : [[-0.5, 0.45, 0.38, 1.4, -3], [-0.46, 0.5, 0.44, 0, 0], [cab0, 0.5, 0.44, 0, 0], [cab1, 0.5, 0.44, 0, -0.7], [0.38, 0.49, 0.42, 0.5, -3.6], [0.5, 0.43, 0.35, 1.6, -6.6]];
    const S = prof.map(([f, hb, ht, db, dt]) => ({ f: f * L, hb: hb * W, ht: ht * W, z0: zb + db, z1: zt + dt }));
    const mk = (pts, kind, ctr) => {
      // Newellova normála otočená ven od středu tělesa
      let nx = 0, ny = 0, nz = 0, mx = 0, my = 0, mz = 0;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        nx += (a[1] - b[1]) * (a[2] + b[2]);
        ny += (a[2] - b[2]) * (a[0] + b[0]);
        nz += (a[0] - b[0]) * (a[1] + b[1]);
        mx += a[0];
        my += a[1];
        mz += a[2];
      }
      mx /= pts.length;
      my /= pts.length;
      mz /= pts.length;
      if (nx * (mx - ctr[0]) + ny * (my - ctr[1]) + nz * (mz - ctr[2]) < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      const l = Math.hypot(nx, ny, nz) || 1;
      return { pts, n: [nx / l, ny / l, nz / l], m: [mx, my, mz], kind };
    };
    const faces = [], ctr = [0, 0, (zb + zt) / 2];
    for (let i = 0; i < S.length - 1; i++) {
      const a = S[i], b = S[i + 1];
      for (const sg of [-1, 1]) faces.push(mk([[a.f, sg * a.hb, a.z0], [b.f, sg * b.hb, b.z0], [b.f, sg * b.ht, b.z1], [a.f, sg * a.ht, a.z1]], 'side', ctr));
      if (open && i === 2) {
        for (const sg of [-1, 1]) faces.push(mk([[a.f, sg * a.ht, a.z1], [b.f, sg * b.ht, b.z1], [b.f, sg * (b.ht - 2.4), b.z1], [a.f, sg * (a.ht - 2.4), a.z1]], 'door', ctr));
      } else faces.push(mk([[a.f, -a.ht, a.z1], [b.f, -b.ht, b.z1], [b.f, b.ht, b.z1], [a.f, a.ht, a.z1]], 'top', ctr));
    }
    const s0 = S[0], s5 = S[S.length - 1];
    const rear = mk([[s0.f, -s0.hb, s0.z0], [s0.f, s0.hb, s0.z0], [s0.f, s0.ht, s0.z1], [s0.f, -s0.ht, s0.z1]], 'rear', ctr);
    const front = mk([[s5.f, -s5.hb, s5.z0], [s5.f, s5.hb, s5.z0], [s5.f, s5.ht, s5.z1], [s5.f, -s5.ht, s5.z1]], 'front', ctr);
    faces.push(rear, front);
    const gh = [];
    if (!open) {
      const z0 = zt - 0.2, zr = zt + (suv ? 10.5 : 8.6), g0 = -0.3 * L, g1 = 0.15 * L, t0 = -0.21 * L, t1 = 0.05 * L, h0 = W * 0.42, h1 = W * 0.34;
      const gc = [(g0 + g1) / 2, 0, (z0 + zr) / 2];
      gh.push(mk([[g0, -h0, z0], [g0, h0, z0], [t0, h1, zr], [t0, -h1, zr]], 'glass', gc));
      gh.push(mk([[g1, -h0, z0], [g1, h0, z0], [t1, h1, zr], [t1, -h1, zr]], 'glass', gc));
      for (const sg of [-1, 1]) gh.push(mk([[g0, sg * h0, z0], [g1, sg * h0, z0], [t1, sg * h1, zr], [t0, sg * h1, zr]], 'glass', gc));
      gh.push(mk([[t0, -h1, zr], [t1, -h1, zr], [t1, h1, zr], [t0, h1, zr]], 'roof', gc));
      gh.zr = zr;
    }
    const M = { S, faces, rear, front, gh, zb, zt, R: suv ? 7.6 : sport ? 6.4 : 6.2, wf: (limo ? 0.36 : 0.31) * L, sport, suv, limo };
    MS[key] = M;
    return M;
  },

  // Auto ve 3D. Hráčova auta jsou kabriolety bez střechy a řídí je tvoje postava.
  car3d(ctx, x, y, ang, c, me) {
    const C = this._C, L = c.len, W = c.wid, open = !!me;
    const M = this.carMesh(c, open), co = Math.cos(ang), si = Math.sin(ang);
    const T = (q) => [x + q[0] * co - q[1] * si, y + q[0] * si + q[1] * co, q[2]];
    const dx = C.x - x, dy = C.y - y, d = Math.hypot(dx, dy);
    const lf = dx * co + dy * si, lr = -dx * si + dy * co, lz = C.z;
    const vis = (F) => F.n[0] * (lf - F.m[0]) + F.n[1] * (lr - F.m[1]) + F.n[2] * (lz - F.m[2]) > 0;
    const Lf = -0.35 * co - 0.55 * si, Lr = 0.35 * si - 0.55 * co, Lz = 0.76;
    const rgb = this.rgbOf(c.color), bc = this.bb(x, y, 0);
    if (!bc) return;
    const kc = bc.k;
    // stín
    const sq = (a, b, z) => [T([a, -b, z]), T([a, b, z]), T([-a, b, z]), T([-a, -b, z])];
    this.poly(ctx, sq(L * 0.6, W * 0.66, 0.2), 'rgba(0,0,0,.22)');
    this.poly(ctx, sq(L * 0.52, W * 0.55, 0.25), 'rgba(0,0,0,.42)');
    // světla na mokré silnici
    ctx.globalCompositeOperation = 'lighter';
    this.poly(ctx, [T([-L * 0.5, -W * 0.45, 0.3]), T([-L * 0.5, W * 0.45, 0.3]), T([-L * 0.5 - 64, W * 0.3, 0.3]), T([-L * 0.5 - 64, -W * 0.3, 0.3])], me && this.braking ? 'rgba(255,40,60,.3)' : 'rgba(255,40,60,.14)');
    if (me || c.moving) {
      this.poly(ctx, [T([L * 0.5, -W * 0.42, 0.35]), T([L * 0.5, W * 0.42, 0.35]), T([L * 0.5 + 250, W * 2.6, 0.35]), T([L * 0.5 + 250, -W * 2.6, 0.35])], me ? 'rgba(255,236,200,.08)' : 'rgba(255,236,200,.05)');
      const hp = T([L * 0.5 + 105, 0, 0]);
      this.pool(ctx, hp[0], hp[1], 100, '255,236,200', me ? 0.26 : 0.12);
    }
    if (me && DRV_UNDERGLOW[c.id]) this.pool(ctx, x, y, W * 1.6, DRV_UNDERGLOW[c.id], 0.55);
    if (c.police) this.pool(ctx, x, y, 150, Math.floor(C.now / 170) % 2 ? '255,40,60' : '40,90,255', 0.4);
    ctx.globalCompositeOperation = 'source-over';
    // daleká auta: jen zjednodušený tvar
    if (d > 900) {
      this.box(ctx, x, y, ang, L, W, M.zb, M.zt, rgb.map((v) => v * 0.8), rgb);
      if (!open) {
        const g = T([-0.08 * L, 0, 0]);
        this.box(ctx, g[0], g[1], ang, L * 0.42, W * 0.76, M.zt, M.gh.zr, [34, 40, 56], rgb);
      }
      this.carLights(ctx, M, T, c, me, kc, vis);
      return;
    }
    // pneumatiky (běhoun) – za karoserií
    const R = M.R, ro = W / 2 + 0.5, ri = W / 2 - 4.6;
    const wheels = [[M.wf, -1], [M.wf, 1], [-M.wf, -1], [-M.wf, 1]];
    for (const [wf, sg] of wheels) {
      for (let k = 0; k < 8; k++) {
        const a0 = (k * Math.PI) / 4, a1 = a0 + Math.PI / 4, am = a0 + Math.PI / 8;
        const nf = Math.cos(am), nz = Math.sin(am);
        if (nf * (lf - wf - nf * R) + nz * (lz - R - nz * R) <= 0) continue;
        const p = (a, rr) => T([wf + Math.cos(a) * R, rr * sg, R + Math.sin(a) * R]);
        const sh = 0.7 + 0.6 * Math.max(0, nz);
        this.poly(ctx, [p(a0, ri), p(a1, ri), p(a1, ro), p(a0, ro)], [15 * sh, 15 * sh, 19 * sh]);
      }
    }
    // karoserie: konvexní obal, stačí odvrácené plochy vynechat
    const lit = (n) => 0.36 + 0.52 * Math.max(0, n[0] * Lf + n[1] * Lr + n[2] * Lz) + (n[2] > 0.6 ? 0.12 : 0);
    const lerp = (A, B, t, dz = 0) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t + dz];
    const stripe = c.stripes && me ? this.rgbOf(c.stripes) : null;
    for (const F of M.faces) {
      if (!vis(F)) continue;
      const l = lit(F.n), P = F.pts.map(T);
      if (me && (F.kind === 'rear' || F.kind === 'side') && this.path3(ctx, P)) {
        const zm = (F.pts[0][2] + F.pts[1][2]) / 2, mf = F.m;
        const tq = T([mf[0], mf[1], 0]), gb = this.bb(tq[0], tq[1], zm), gt = this.bb(tq[0], tq[1], (F.pts[2][2] + F.pts[3][2]) / 2);
        if (gb && gt) {
          const g = ctx.createLinearGradient(0, gb.y, 0, gt.y);
          g.addColorStop(0, `rgb(${rgb[0] * l * 0.55 | 0},${rgb[1] * l * 0.55 | 0},${rgb[2] * l * 0.6 + 6 | 0})`);
          g.addColorStop(0.6, `rgb(${rgb[0] * l + 8 | 0},${rgb[1] * l + 5 | 0},${rgb[2] * l + 12 | 0})`);
          g.addColorStop(1, `rgb(${Math.min(255, rgb[0] * l * 1.2 + 24) | 0},${Math.min(255, rgb[1] * l * 1.2 + 20) | 0},${Math.min(255, rgb[2] * l * 1.2 + 26) | 0})`);
          ctx.fillStyle = g;
          ctx.fill();
        }
      } else this.poly(ctx, P, [rgb[0] * l + 8, rgb[1] * l + 5, rgb[2] * l + 12]);
      if (F.kind === 'top' && d < 700) {
        if (stripe) {
          for (const [t0, t1] of [[0.36, 0.45], [0.55, 0.64]]) this.poly(ctx, [lerp(P[0], P[3], t0, 0.04), lerp(P[1], P[2], t0, 0.04), lerp(P[1], P[2], t1, 0.04), lerp(P[0], P[3], t1, 0.04)], [stripe[0] * l, stripe[1] * l, stripe[2] * l]);
        }
        // lesk laku
        this.poly(ctx, [lerp(P[0], P[3], 0.18, 0.06), lerp(P[1], P[2], 0.18, 0.06), lerp(P[1], P[2], 0.32, 0.06), lerp(P[0], P[3], 0.32, 0.06)], 'rgba(255,245,255,.13)');
      }
    }
    // obrys horní hrany (odlesk neonů na laku)
    if (d < 600) {
      const S = M.S, out = [];
      for (const s of S) out.push(T([s.f, -s.ht, s.z1 + 0.05]));
      for (let i = S.length - 1; i >= 0; i--) out.push(T([S[i].f, S[i].ht, S[i].z1 + 0.05]));
      ctx.lineJoin = 'round';
      this.line3(ctx, out, 'rgba(255,225,245,.26)', Math.max(0.8, 0.45 * kc), true);
    }
    // disky kol z boku
    const rimC = c.id === 'super' ? [235, 186, 70] : c.id === 'suv' ? [52, 52, 60] : [172, 178, 192];
    for (const [wf, sg] of wheels) {
      if (sg * lr <= ro + 1) continue;
      const disc = (rad, rr) => {
        const out = [];
        for (let k = 0; k < 10; k++) {
          const a = (k * Math.PI * 2) / 10;
          out.push(T([wf + Math.cos(a) * rad, sg * rr, R + Math.sin(a) * rad]));
        }
        return out;
      };
      this.poly(ctx, disc(R, ro), [24, 24, 29]);
      if (d < 650) {
        this.poly(ctx, disc(R * 0.66, ro + 0.1), rimC);
        this.poly(ctx, disc(R * 0.46, ro + 0.15), [rimC[0] * 0.28, rimC[1] * 0.28, rimC[2] * 0.3]);
        const rot = me ? this.wheelRot || 0 : 0, hub = T([wf, sg * (ro + 0.2), R]);
        for (let s = 0; s < 5; s++) {
          const a = rot + (s * Math.PI * 2) / 5;
          this.line3(ctx, [hub, T([wf + Math.cos(a) * R * 0.6, sg * (ro + 0.2), R + Math.sin(a) * R * 0.6])], this.fog(rimC, d), Math.max(1, 0.9 * kc));
        }
      }
    }
    if (!open) {
      // prosklená kabina se střechou
      for (const F of M.gh) {
        if (!vis(F)) continue;
        const P = F.pts.map(T), l = lit(F.n);
        if (F.kind === 'roof') this.poly(ctx, P, [rgb[0] * l + 8, rgb[1] * l + 5, rgb[2] * l + 12]);
        else {
          this.poly(ctx, P, [22 + 22 * l, 28 + 26 * l, 44 + 34 * l]);
          if (d < 700) this.poly(ctx, [lerp(P[0], P[1], 0.18), lerp(P[0], P[1], 0.34), lerp(P[3], P[2], 0.56), lerp(P[3], P[2], 0.4)], 'rgba(210,225,255,.1)');
        }
      }
      const zr = M.gh.zr, rc = T([-0.08 * L, 0, 0]);
      if (c.taxi) {
        this.box(ctx, rc[0], rc[1], ang, 6, 11, zr, zr + 3.4, [230, 180, 40], [255, 222, 110]);
        this.glow(ctx, rc[0], rc[1], zr + 2, 10, '255,210,90', 0.45);
      }
      if (c.police) {
        this.box(ctx, rc[0], rc[1], ang, 4, W * 0.62, zr, zr + 2.4, [30, 30, 36], [40, 40, 48]);
        const on = Math.floor(C.now / 170) % 2;
        for (const sg of [-1, 1]) {
          const q = T([-0.08 * L, sg * W * 0.2, zr + 1.6]);
          const red = sg < 0;
          this.glow(ctx, q[0], q[1], q[2], (red ? on : !on) ? 30 : 8, red ? '255,40,60' : '50,110,255', 0.95);
        }
      }
    } else {
      // zpětná zrcátka a kokpit
      const s3 = M.S[3];
      for (const sg of [-1, 1]) {
        const mp = T([s3.f - 2, sg * (s3.ht + 1.3), 0]);
        this.box(ctx, mp[0], mp[1], ang, 1.6, 2.8, s3.z1 + 1.2, s3.z1 + 3.4, [24, 24, 30], rgb.map((v) => v * 0.8));
      }
      this.cockpit(ctx, M, T, c, me, kc, lr, ang);
    }
    this.carLights(ctx, M, T, c, me, kc, vis);
    if (c.spoiler && open) {
      const s0 = M.S[0], wp = T([s0.f + 2.6, 0, 0]);
      for (const sg of [-1, 1]) {
        const q = T([s0.f + 2.4, sg * W * 0.3, 0]);
        this.box(ctx, q[0], q[1], ang, 1.4, 1, s0.z1 + 0.5, s0.z1 + 3.4, [18, 18, 22], [30, 30, 36]);
      }
      this.box(ctx, wp[0], wp[1], ang, 3.4, W * 0.94, s0.z1 + 3.4, s0.z1 + 4.2, [26, 26, 32], [52, 52, 62]);
      this.line3(ctx, [T([s0.f + 0.8, -W * 0.47, s0.z1 + 4.25]), T([s0.f + 0.8, W * 0.47, s0.z1 + 4.25])], 'rgba(255,255,255,.3)', Math.max(0.6, 0.25 * kc));
    }
  },

  // Otevřená kabina: sklo, palubní deska, volant, sedačky a řidič zezadu.
  cockpit(ctx, M, T, c, me, kc, lr, ang) {
    const S = M.S, a = S[2], b = S[3], hiA = a.ht - 2.4, hiB = b.ht - 2.4, zf = M.zb + 2.4;
    const seat = DRV_SEAT[c.id] || [70, 60, 60], dr = -hiA * 0.5, steer = me ? this.p.steer || 0 : 0;
    const P = (f, r, z) => {
      const q = T([f, r, z]);
      return this.bb(q[0], q[1], q[2]);
    };
    // čelní sklo s rámem
    const fb = b.f - 0.4, ft = b.f - 5.2, z0 = b.z1, z1 = b.z1 + 8.5, wb = b.ht - 0.4, wt = b.ht - 1.8;
    this.poly(ctx, [T([fb, -wb, z0]), T([fb, wb, z0]), T([ft, wt, z1]), T([ft, -wt, z1])], 'rgba(120,170,240,.2)');
    ctx.globalCompositeOperation = 'lighter';
    this.poly(ctx, [T([fb, -wb * 0.15, z0 + 0.3]), T([fb, wb * 0.12, z0 + 0.3]), T([ft, wt * 0.55, z1 - 0.3]), T([ft, wt * 0.3, z1 - 0.3])], 'rgba(255,255,255,.1)');
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineJoin = 'round';
    this.line3(ctx, [T([fb, -wb, z0]), T([ft, -wt, z1]), T([ft, wt, z1]), T([fb, wb, z0])], 'rgba(20,20,26,.85)', Math.max(1, 0.55 * kc));
    this.line3(ctx, [T([ft, -wt, z1 + 0.15]), T([ft, wt, z1 + 0.15])], 'rgba(255,255,255,.35)', Math.max(0.6, 0.2 * kc));
    // ořez: vnitřek je vidět jen otvorem kabiny a nad zadní hranou
    const RL = P(a.f, -hiA, a.z1), RR = P(a.f, hiA, a.z1), FL = P(b.f, -hiB, b.z1), FR = P(b.f, hiB, b.z1);
    if (!RL || !RR || !FL || !FR) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(RL.x, RL.y);
    ctx.lineTo(FL.x, FL.y);
    ctx.lineTo(RL.x, FL.y);
    ctx.lineTo(RL.x, -1e4);
    ctx.lineTo(RR.x, -1e4);
    ctx.lineTo(RR.x, FR.y);
    ctx.lineTo(FR.x, FR.y);
    ctx.lineTo(RR.x, RR.y);
    ctx.closePath();
    ctx.clip();
    // podlaha, vnitřky dveří, palubní deska
    this.poly(ctx, [T([a.f, -hiA, zf]), T([b.f, -hiB, zf]), T([b.f, hiB, zf]), T([a.f, hiA, zf])], [24, 19, 26]);
    for (const sg of [-1, 1]) {
      if (sg * lr > hiA) continue;
      this.poly(ctx, [T([a.f, sg * hiA, zf]), T([b.f, sg * hiB, zf]), T([b.f, sg * hiB, b.z1]), T([a.f, sg * hiA, a.z1])], [seat[0] * 0.5 + 8, seat[1] * 0.5 + 6, seat[2] * 0.5 + 8]);
      this.line3(ctx, [T([a.f, sg * hiA, a.z1 - 1.6]), T([b.f, sg * hiB, b.z1 - 1.6])], 'rgba(255,255,255,.18)', Math.max(0.8, 0.35 * kc));
    }
    this.poly(ctx, [T([b.f, -hiB, zf]), T([b.f, hiB, zf]), T([b.f, hiB, b.z1]), T([b.f, -hiB, b.z1])], [30, 28, 36]);
    this.poly(ctx, [T([b.f - 0.2, dr - 2.6, b.z1 - 3.4]), T([b.f - 0.2, dr + 2.6, b.z1 - 3.4]), T([b.f - 0.2, dr + 2.6, b.z1 - 0.9]), T([b.f - 0.2, dr - 2.6, b.z1 - 0.9])], 'rgba(120,230,255,.92)');
    this.poly(ctx, [T([b.f - 0.2, 0.8, b.z1 - 4]), T([b.f - 0.2, 4.6, b.z1 - 4]), T([b.f - 0.2, 4.6, b.z1 - 0.8]), T([b.f - 0.2, 0.8, b.z1 - 0.8])], 'rgba(255,90,180,.88)');
    const ip = T([b.f - 0.4, dr, b.z1 - 2]);
    this.glow(ctx, ip[0], ip[1], ip[2], 6, '120,230,255', 0.35);
    // volant
    const wc = [b.f - 4.4, dr, b.z1 + 0.6], wr = 3.3, ring = [];
    for (let k = 0; k < 14; k++) {
      const t = (k / 14) * Math.PI * 2;
      ring.push(T([wc[0] - Math.sin(t) * wr * 0.34, wc[1] + Math.cos(t) * wr, wc[2] + Math.sin(t) * wr * 0.94]));
    }
    this.line3(ctx, ring, '#0d0d11', Math.max(1, 1.1 * kc), true);
    // sedadlo spolujezdce s opěrkou hlavy
    const ps = T([a.f + 6.5, -dr, 0]), sd = seat.map((v) => v * 0.72);
    this.box(ctx, ps[0], ps[1], ang, 7, 8, zf, zf + 3, sd, seat);
    this.seatBack(ctx, T([a.f + 2.2, -dr, 0]), a.z1, seat, kc);
    if (me && this.driverImg) {
      // ruce na volantu (natáčí se se zatáčením)
      ctx.lineCap = 'round';
      for (const sg of [-1, 1]) {
        const ph = (sg < 0 ? Math.PI - 0.5 : 0.5) - steer * 0.9;
        const sh = P(a.f + 3.4, dr + sg * 4.3, a.z1 + 5.2);
        const hd = P(wc[0] - Math.sin(ph) * wr * 0.34, wc[1] + Math.cos(ph) * wr, wc[2] + Math.sin(ph) * wr * 0.94);
        if (!sh || !hd) continue;
        ctx.strokeStyle = this.driverKit || '#2f6bff';
        ctx.lineWidth = 2.4 * kc;
        line(ctx, sh.x, sh.y, hd.x, hd.y);
        ctx.fillStyle = this.driverSkinC || '#f1c7a0';
        circle(ctx, hd.x, hd.y, 1.3 * kc);
        ctx.fill();
      }
      // řidič zezadu
      const dp = T([a.f + 3.2, dr, 0]);
      const bot = this.bb(dp[0], dp[1], a.z1 - 3), top = this.bb(dp[0], dp[1], a.z1 + 17);
      if (bot && top) {
        const img = this.driverImg, hh = bot.y - top.y, ww = (hh * img.width) / img.height;
        ctx.save();
        ctx.translate(bot.x, bot.y + Math.sin(this.t * 31) * this.shake * 2 * kc);
        ctx.rotate(steer * 0.12);
        ctx.drawImage(img, -ww / 2, -hh, ww, hh);
        ctx.restore();
      }
    }
    ctx.restore();
  },

  // Opěradlo s opěrkou hlavy (zezadu), kreslené jako zaoblený tvar s prošitím.
  seatBack(ctx, q, zt, seat, kc) {
    const b = this.bb(q[0], q[1], zt - 3), t = this.bb(q[0], q[1], zt + 10.5);
    if (!b || !t) return;
    const k = b.k, x = b.x, sw = 8.4 * k, hw = 5 * k, yh = t.y + 3.4 * k;
    const g = ctx.createLinearGradient(x - sw / 2, 0, x + sw / 2, 0);
    g.addColorStop(0, `rgb(${seat.map((v) => v * 0.55 | 0)})`);
    g.addColorStop(0.45, `rgb(${seat.map((v) => Math.min(255, v * 1.08) | 0)})`);
    g.addColorStop(1, `rgb(${seat.map((v) => v * 0.6 | 0)})`);
    ctx.fillStyle = g;
    rrect(ctx, x - sw / 2, yh + 1.5 * k, sw, b.y - yh - 1.5 * k, 2.4 * k);
    ctx.fill();
    rrect(ctx, x - hw / 2, t.y, hw, 3.6 * k, 1.4 * k);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = Math.max(0.6, 0.25 * kc);
    for (const ox of [-1.6, 1.6]) line(ctx, x + ox * k, yh + 3 * k, x + ox * k, b.y);
  },

  // Koncová a přední světla, difuzor, výfuky a SPZ.
  carLights(ctx, M, T, c, me, kc, vis) {
    const C = this._C, W = c.wid;
    if (vis(M.rear)) {
      const s0 = M.S[0], f0 = s0.f - 0.12, z0 = s0.z0, z1 = s0.z1;
      const hw = (z) => s0.hb + ((s0.ht - s0.hb) * (z - z0)) / (z1 - z0);
      const brake = (me && this.braking) || c.braking;
      if (kc > 1.2) {
        this.poly(ctx, [T([f0, -hw(z0) * 0.95, z0]), T([f0, hw(z0) * 0.95, z0]), T([f0, hw(z0 + 2) * 0.95, z0 + 2]), T([f0, -hw(z0 + 2) * 0.95, z0 + 2])], [14, 14, 18]);
      }
      const za = z1 - 3.6, zb = z1 - 1.1, lc = brake ? [255, 130, 140] : [232, 22, 46];
      if (kc > 1.6) this.line3(ctx, [T([f0 - 0.05, -hw(z1 - 0.6) * 0.9, z1 - 0.6]), T([f0 - 0.05, hw(z1 - 0.6) * 0.9, z1 - 0.6])], 'rgba(0,0,0,.35)', Math.max(0.6, 0.22 * kc));
      for (const sg of [-1, 1]) {
        this.poly(ctx, [T([f0, sg * hw(za) * 0.95, za]), T([f0, sg * hw(za) * 0.5, za]), T([f0, sg * hw(zb) * 0.5, zb]), T([f0, sg * hw(zb) * 0.95, zb])], lc);
        const q = T([f0 - 0.5, sg * hw(za) * 0.72, (za + zb) / 2]);
        this.glow(ctx, q[0], q[1], q[2], brake ? 17 : me ? 10 : 8, '255,30,60', brake ? 0.95 : 0.6);
      }
      if (M.sport && kc > 1.2) this.poly(ctx, [T([f0, -hw(za) * 0.5, za + 0.9]), T([f0, hw(za) * 0.5, za + 0.9]), T([f0, hw(zb) * 0.5, zb - 0.9]), T([f0, -hw(zb) * 0.5, zb - 0.9])], brake ? [255, 90, 100] : [150, 12, 30]);
      if (kc > 1.6) {
        // SPZ
        const p0 = z0 + 2.5, p1 = z0 + 5.4;
        this.poly(ctx, [T([f0 - 0.05, -4.6, p0]), T([f0 - 0.05, 4.6, p0]), T([f0 - 0.05, 4.6, p1]), T([f0 - 0.05, -4.6, p1])], [232, 232, 222]);
        if (me) this.wallText(ctx, T([f0 - 0.1, -4.4, p0]), T([f0 - 0.1, 4.4, p0]), T([f0 - 0.1, -4.4, p1]), 'FIFA 67', '#1a2a6a', null, 12);
        // výfuky
        for (const sg of [-1, 1]) {
          const q = T([f0 - 0.2, sg * W * 0.27, z0 + 1.2]), e = this.bb(q[0], q[1], q[2]);
          if (!e) continue;
          ctx.fillStyle = '#0a0a0d';
          ctx.strokeStyle = '#9a9aa6';
          ctx.lineWidth = Math.max(0.8, 0.45 * e.k);
          ctx.beginPath();
          ctx.ellipse(e.x, e.y, 1.3 * e.k, 1.05 * e.k, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          if (me && this.thr > 0.3) this.glowAt(ctx, e.x, e.y, 3 * e.k, 3 * e.k, '255,140,40', 0.4 + Math.random() * 0.3);
        }
      }
    }
    if (vis(M.front)) {
      const s5 = M.S[M.S.length - 1], f5 = s5.f + 0.12, za = s5.z1 - 3, zb = s5.z1 - 0.9;
      for (const sg of [-1, 1]) {
        this.poly(ctx, [T([f5, sg * s5.ht * 0.92, za]), T([f5, sg * s5.ht * 0.45, za]), T([f5, sg * s5.ht * 0.45, zb]), T([f5, sg * s5.ht * 0.92, zb])], [255, 248, 228]);
        const q = T([f5 + 0.5, sg * s5.ht * 0.7, (za + zb) / 2]);
        this.glow(ctx, q[0], q[1], q[2], 16, '255,244,215', 0.75);
      }
      if (kc > 1.4) this.poly(ctx, [T([f5, -s5.ht * 0.4, s5.z0 + 0.8]), T([f5, s5.ht * 0.4, s5.z0 + 0.8]), T([f5, s5.ht * 0.4, za - 0.6]), T([f5, -s5.ht * 0.4, za - 0.6])], [16, 16, 20]);
    }
    void C;
  },

  // Řidič zezadu (160×200): záda dresu se jménem a číslem, krk, uši a hlava s vlasy.
  makeDriver(charId, skin) {
    const L = lookFor(charId, skin), c0 = charById(charId);
    const d = duoOf(charId), sk = SKINS[skin];
    const kit = (sk && sk.kit) || (d >= 0 ? DUO_TEAMS[d] : c0.kit || SIDE_COLORS[0]);
    this.driverKit = kit.color;
    this.driverSkinC = L.skin;
    const cv = document.createElement('canvas');
    cv.width = 160;
    cv.height = 200;
    const g = cv.getContext('2d');
    const long = L.hair === 'longhair' || L.girl;
    const hairC = L.hairColor || '#3a2a1a', hairD = L.hairDark || shade(hairC, -0.35), hairL = L.hairLight || shade(hairC, 0.3);
    if (long) {
      g.fillStyle = hairD;
      rrect(g, 34, 52, 92, 96, 30);
      g.fill();
    }
    // záda dresu se stínováním a límcem
    const tg = g.createLinearGradient(0, 100, 0, 200);
    tg.addColorStop(0, shade(kit.color, 0.12));
    tg.addColorStop(1, kit.dark || shade(kit.color, -0.35));
    g.fillStyle = tg;
    rrect(g, 20, 100, 120, 110, 34);
    g.fill();
    g.strokeStyle = '#0b1220';
    g.lineWidth = 4;
    g.stroke();
    const sg2 = g.createLinearGradient(20, 0, 140, 0);
    sg2.addColorStop(0, 'rgba(0,0,0,.28)');
    sg2.addColorStop(0.3, 'rgba(0,0,0,0)');
    sg2.addColorStop(0.75, 'rgba(0,0,0,0)');
    sg2.addColorStop(1, 'rgba(255,120,200,.28)');
    g.fillStyle = sg2;
    rrect(g, 22, 102, 116, 106, 32);
    g.fill();
    g.fillStyle = L.skin;
    g.fillRect(68, 84, 24, 24);
    g.fillStyle = 'rgba(0,0,0,.2)';
    g.fillRect(68, 96, 24, 12);
    g.fillStyle = kit.dark || shade(kit.color, -0.35);
    g.beginPath();
    g.ellipse(80, 104, 20, 7, 0, 0, Math.PI * 2);
    g.fill();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.font = `18px ${FONT_D}`;
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(0,0,0,.45)';
    const nm = (c0.name || '').toUpperCase();
    g.strokeText(nm, 80, 130);
    g.fillStyle = kit.num || '#ffffff';
    g.fillText(nm, 80, 130);
    g.font = `38px ${FONT_D}`;
    g.lineWidth = 7;
    g.strokeText(String(L.num || c0.num || ''), 80, 164);
    g.fillText(String(L.num || c0.num || ''), 80, 164);
    // uši a hlava zezadu
    g.fillStyle = L.skin;
    for (const ex of [38, 122]) {
      g.beginPath();
      g.arc(ex, 62, 9, 0, Math.PI * 2);
      g.fill();
    }
    g.beginPath();
    g.arc(80, 56, 42, 0, Math.PI * 2);
    g.fillStyle = L.skin;
    g.fill();
    if (L.hair !== 'bald') {
      g.save();
      g.beginPath();
      g.arc(80, 56, 42, 0, Math.PI * 2);
      g.clip();
      const nape = long ? 140 : L.hair === 'buzz' || L.hair === 'fade' || L.hair === 'receding' ? 74 : 86;
      const hg = g.createLinearGradient(0, 14, 0, nape);
      hg.addColorStop(0, hairL);
      hg.addColorStop(0.45, hairC);
      hg.addColorStop(1, hairD);
      g.fillStyle = hg;
      g.fillRect(30, 0, 100, nape);
      g.strokeStyle = hairL;
      g.globalAlpha = 0.55;
      g.lineWidth = 2.5;
      for (let i = 0; i < 7; i++) {
        g.beginPath();
        g.moveTo(50 + i * 10, 18 + (i % 2) * 5);
        g.quadraticCurveTo(54 + i * 10, 44, 48 + i * 10, nape - 12);
        g.stroke();
      }
      g.globalAlpha = 1;
      g.restore();
    } else {
      g.fillStyle = 'rgba(255,255,255,.32)';
      g.beginPath();
      g.ellipse(66, 34, 14, 7, -0.4, 0, Math.PI * 2);
      g.fill();
    }
    // stín na krku a barevné světlo neonů zprava
    g.beginPath();
    g.arc(80, 56, 42, 0, Math.PI * 2);
    g.strokeStyle = '#0b1220';
    g.lineWidth = 4;
    g.stroke();
    g.beginPath();
    g.arc(80, 56, 38, -0.9, 0.7);
    g.strokeStyle = 'rgba(255,120,210,.45)';
    g.lineWidth = 4;
    g.stroke();
    if (long) {
      g.fillStyle = hairC;
      rrect(g, 42, 84, 76, 50, 22);
      g.fill();
    }
    return cv;
  },

  /* ---------- scéna ---------- */

  // Snímek: scéna (při sekání v nižším rozlišení, roztažená), přes ni HUD v plném rozlišení.
  draw(ctx, w, h, dpr, now) {
    const q = this.quality || 1;
    if (q < 0.99) {
      const tw = Math.round(w * q), th = Math.round(h * q);
      if (!this._off || this._off.width !== tw || this._off.height !== th) {
        this._off = document.createElement('canvas');
        this._off.width = tw;
        this._off.height = th;
        this._offCtx = this._off.getContext('2d');
      }
      this.scene(this._offCtx, tw, th, dpr * q, now);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this._off, 0, 0, w, h);
    } else this.scene(ctx, w, h, dpr, now);
    this.drawHud(ctx, w, h, dpr, now);
    if (this.t < 4) {
      ctx.globalAlpha = Math.min(1, (4 - this.t) * 1.5);
      ctx.font = `${14 * dpr}px ${FONT_D}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4 * dpr;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,.55)';
      ctx.strokeText('Joystick nahoru = plyn · dolů = brzda · do stran = zatáčení', w / 2, h * 0.3);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Joystick nahoru = plyn · dolů = brzda · do stran = zatáčení', w / 2, h * 0.3);
      ctx.globalAlpha = 1;
    }
  },

  scene(ctx, w, h, dpr, now) {
    const p = this.p, ca = this.camAng, sp = Math.min(1, Math.abs(p.v) / this.car.max);
    const BACK = 116 + sp * 16, CZ = 46 + sp * 3, sh = this.shake * 5;
    this._C = {
      x: p.x - Math.cos(ca) * BACK + rand(-sh, sh), y: p.y - Math.sin(ca) * BACK + rand(-sh, sh), z: CZ,
      c: Math.cos(ca), s: Math.sin(ca), w, h, f: h * (1.02 - sp * 0.14), hz: h * 0.44, dpr, now,
    };
    if (!this._R) {
      this._R = new Float64Array(40);
      this._Z = new Float64Array(40);
      this._Y = new Float64Array(40);
    }
    const C = this._C;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    this.drawSky(ctx, w, h, dpr, now);
    this.drawGround(ctx, w, h, dpr, now);
    // objekty seřazené od nejvzdálenějších
    const items = [];
    const fwd = (x, y) => (x - C.x) * C.c + (y - C.y) * C.s;
    const dist = (x, y) => Math.hypot(x - C.x, y - C.y);
    for (const b of this.blocks) {
      const bx = (b.x0 + b.x1) / 2, by = (b.y0 + b.y1) / 2;
      if (fwd(bx, by) < -420 || dist(bx, by) > 2700) continue;
      if (b.kind === 'park') {
        for (const t of b.trees) if (fwd(t.x, t.y) > 10 && dist(t.x, t.y) < 1900) items.push({ d: dist(t.x, t.y), f: () => this.tree(ctx, t) });
      } else if (b.kind === 'hp') {
        items.push({ d: dist(bx, (b.y0 + b.lotY) / 2), f: () => this.hp3d(ctx, b, now) });
      } else {
        for (const hs of b.houses) {
          const hx = clamp(C.x, hs.x0, hs.x1), hy = clamp(C.y, hs.y0, hs.y1);
          items.push({ d: dist((hs.x0 + hs.x1) / 2, (hs.y0 + hs.y1) / 2) * 0.5 + dist(hx, hy) * 0.5, f: () => this.house3d(ctx, hs, now) });
        }
      }
    }
    for (const q of this.parked) if (dist(q.x, q.y) < 1500 && fwd(q.x, q.y) > -40) items.push({ d: dist(q.x, q.y), f: () => this.car3d(ctx, q.x, q.y, q.ang, { color: q.c, len: 44, wid: 23 }, false) });
    for (const c of this.traffic) {
      const q = this.trafficPos(c);
      if (dist(q.x, q.y) < 1900 && fwd(q.x, q.y) > -40) items.push({ d: dist(q.x, q.y), f: () => this.car3d(ctx, q.x, q.y, q.ang, { color: c.c, len: c.len, wid: c.wid, taxi: c.kind === 'taxi', police: c.kind === 'police', moving: c.wait <= 0 }, false) });
    }
    for (const L of this.lamps) if (fwd(L.x, L.y) > 12 && dist(L.x, L.y) < 1500) items.push({ d: dist(L.x, L.y), f: () => this.lamp(ctx, L) });
    for (const S of this.tlights) if (fwd(S.x, S.y) > 12 && dist(S.x, S.y) < 1200) items.push({ d: dist(S.x, S.y), f: () => this.tlight(ctx, S, now) });
    items.push({ d: dist(p.x, p.y), f: () => this.car3d(ctx, p.x, p.y, p.ang, this.car, true) });
    items.sort((a, b) => b.d - a.d);
    for (const it of items) it.f();
    this.drawFx(ctx);
    // cíl: zářící sloup světla nad parkovištěm
    const dst = this.bb(DRV.DEST.x, DRV.DEST.y, 0), dtop = this.bb(DRV.DEST.x, DRV.DEST.y, 300);
    if (dst && dtop) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, dst.y, 0, dtop.y);
      g.addColorStop(0, 'rgba(255,60,130,.5)');
      g.addColorStop(1, 'rgba(255,60,130,0)');
      ctx.fillStyle = g;
      const bw = 24 * dst.k;
      ctx.fillRect(dst.x - bw, dtop.y, bw * 2, dst.y - dtop.y);
      ctx.restore();
    }
    // barevné doladění, viněta, rychlost
    ctx.drawImage(this.overlay(w, h), 0, 0, w, h);
    if (sp > 0.72) {
      ctx.strokeStyle = `rgba(255,255,255,${(sp - 0.72) * 0.5})`;
      ctx.lineWidth = 1.6 * dpr;
      for (let i = 0; i < 14; i++) {
        const a = i * 2.39996, r0 = h * (0.45 + ((i * 0.37 + now * 0.0021) % 1) * 0.6);
        const cx = w / 2, cy = C.hz;
        line(ctx, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.7, cx + Math.cos(a) * (r0 + 60 * dpr), cy + Math.sin(a) * (r0 + 60 * dpr) * 0.7);
      }
    }
  },

  // Barevné doladění a viněta (předkreslené v nižším rozlišení, roztažené přes obraz).
  overlay(w, h) {
    const key = `${w}x${h}`;
    if (this._ovK === key) return this._ov;
    const cv = document.createElement('canvas'), ow = Math.max(2, Math.round(w / 4)), oh = Math.max(2, Math.round(h / 4));
    cv.width = ow;
    cv.height = oh;
    const g = cv.getContext('2d');
    const cg = g.createLinearGradient(0, 0, 0, oh);
    cg.addColorStop(0, 'rgba(40,0,80,.12)');
    cg.addColorStop(0.5, 'rgba(0,0,0,0)');
    cg.addColorStop(1, 'rgba(60,0,40,.16)');
    g.fillStyle = cg;
    g.fillRect(0, 0, ow, oh);
    const vg = g.createRadialGradient(ow / 2, oh * 0.56, oh * 0.32, ow / 2, oh * 0.56, oh * 1.05);
    vg.addColorStop(0, 'rgba(0,0,10,0)');
    vg.addColorStop(1, 'rgba(0,0,10,.6)');
    g.fillStyle = vg;
    g.fillRect(0, 0, ow, oh);
    this._ovK = key;
    return (this._ov = cv);
  },

  // Noční obloha: hvězdy, měsíc, mraky prosvícené městem a panorama na obzoru.
  drawSky(ctx, w, h, dpr, now) {
    const C = this._C, hz = C.hz, ca = this.camAng, F = C.f;
    const sky = ctx.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, '#04030b');
    sky.addColorStop(0.45, '#100a24');
    sky.addColorStop(0.8, '#26123c');
    sky.addColorStop(1, '#4a1c4c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, hz + 2);
    const sx = (bearing) => {
      let d = bearing - ca;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      return Math.abs(d) < 1.2 ? w / 2 + Math.tan(d) * F : null;
    };
    for (let i = 0; i < 70; i++) {
      const x = sx(i * 2.39996);
      if (x === null) continue;
      const y = hz * (0.03 + ((i * 0.618034) % 1) * 0.72);
      ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.45 * (0.5 + 0.5 * Math.sin(now / 420 + i * 1.7))})`;
      const s = (i % 7 === 0 ? 2.2 : 1.3) * dpr;
      ctx.fillRect(x, y, s, s);
    }
    const mx = sx(-2.3);
    if (mx !== null) {
      const my = hz * 0.3;
      this.glowAt(ctx, mx, my, 130 * dpr, 130 * dpr, '255,236,215', 0.35);
      ctx.fillStyle = '#f4ecd8';
      circle(ctx, mx, my, 17 * dpr);
      ctx.fill();
      ctx.fillStyle = 'rgba(180,170,150,.5)';
      for (const [ox, oy, r] of [[-5, -4, 4], [6, 3, 3], [-2, 8, 2.4]]) {
        circle(ctx, mx + ox * dpr, my + oy * dpr, r * dpr);
        ctx.fill();
      }
    }
    // mraky prosvícené odspodu růžovým světlem města
    const cl = this.cloudSprite();
    for (let i = 0; i < 7; i++) {
      const x = sx(i * 0.93 + now * 0.000004);
      if (x === null) continue;
      const cw = (260 + (i % 3) * 120) * dpr, ch = cw * 0.3, y = hz * (0.18 + (i % 4) * 0.13);
      ctx.globalAlpha = 0.55 + (i % 2) * 0.2;
      ctx.drawImage(cl, x - cw / 2, y - ch / 2, cw, ch);
    }
    ctx.globalAlpha = 1;
    // panorama: vzdálená a bližší vrstva domů s okny a blikajícími světly
    for (const [step, amp, base, key, col] of [[9, 46, 14, 30, '#1a1230'], [6, 80, 20, 45, '#0b0817']]) {
      const st = step * dpr;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, hz + 1);
      for (let x = 0; x <= w + st; x += st) {
        const k = Math.floor((ca + Math.atan((x - w / 2) / F)) * key);
        const hh = (base + ((Math.sin(k * 12.9898) * 43758.5453) % 1 + 1) % 1 * amp) * dpr * 0.8;
        ctx.lineTo(x, hz - hh);
        ctx.lineTo(x + st, hz - hh);
      }
      ctx.lineTo(w, hz + 1);
      ctx.closePath();
      ctx.fill();
    }
    for (let x = 0; x < w; x += 4 * dpr) {
      const k = Math.floor((ca + Math.atan((x - w / 2) / F)) * 140);
      const r = ((Math.sin(k * 7.13) * 9999) % 1 + 1) % 1;
      if (r < 0.55) continue;
      ctx.fillStyle = r > 0.9 ? 'rgba(160,210,255,.55)' : 'rgba(255,200,130,.55)';
      ctx.fillRect(x, hz - (4 + (k % 6) * 6) * dpr, 1.6 * dpr, 1.6 * dpr);
      if (r > 0.985 && Math.sin(now / 300 + k) > 0.2) this.glowAt(ctx, x, hz - 64 * dpr, 6 * dpr, 6 * dpr, '255,40,40', 0.9);
    }
    const hzg = ctx.createLinearGradient(0, hz - 80 * dpr, 0, hz);
    hzg.addColorStop(0, 'rgba(255,70,150,0)');
    hzg.addColorStop(1, 'rgba(255,70,150,.2)');
    ctx.fillStyle = hzg;
    ctx.fillRect(0, hz - 80 * dpr, w, 80 * dpr);
  },
  cloudSprite() {
    if (this._cloud) return this._cloud;
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 80;
    const g = cv.getContext('2d'), r = mulberry32(7);
    for (let i = 0; i < 16; i++) {
      const x = 30 + r() * 196, y = 30 + r() * 26, rad = 18 + r() * 26;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(110,70,140,.35)');
      gr.addColorStop(0.6, 'rgba(90,50,120,.18)');
      gr.addColorStop(1, 'rgba(80,40,110,0)');
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    const lg = g.createLinearGradient(0, 30, 0, 80);
    lg.addColorStop(0, 'rgba(255,90,170,0)');
    lg.addColorStop(1, 'rgba(255,90,170,.35)');
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = lg;
    g.fillRect(0, 0, 256, 80);
    return (this._cloud = cv);
  },

  // Zem: chodníky s obrubníky, mokrý asfalt, čáry, zebry, smyky, odlesky světel a šipky navigace.
  drawGround(ctx, w, h, dpr, now) {
    const C = this._C, R = DRV.ROAD / 2, hz = C.hz;
    const gg = ctx.createLinearGradient(0, hz, 0, h);
    gg.addColorStop(0, '#1c1428');
    gg.addColorStop(1, '#0b0910');
    ctx.fillStyle = gg;
    ctx.fillRect(0, hz, w, h - hz);
    const fwd = (x, y) => (x - C.x) * C.c + (y - C.y) * C.s;
    const dist = (x, y) => Math.hypot(x - C.x, y - C.y);
    const nearB = [];
    for (const b of this.blocks) {
      const bx = (b.x0 + b.x1) / 2, by = (b.y0 + b.y1) / 2;
      if (fwd(bx, by) < -420 || dist(bx, by) > 2700) continue;
      this.poly(ctx, [[b.x0, b.y0, 0.2], [b.x1, b.y0, 0.2], [b.x1, b.y1, 0.2], [b.x0, b.y1, 0.2]], [50, 47, 58]);
      if (b.kind === 'park') this.poly(ctx, [[b.x0 + 14, b.y0 + 14, 0.3], [b.x1 - 14, b.y0 + 14, 0.3], [b.x1 - 14, b.y1 - 14, 0.3], [b.x0 + 14, b.y1 - 14, 0.3]], [22, 50, 34]);
      if (dist(bx, by) < 1500) nearB.push(b);
    }
    for (const x of DRV.XS) this.poly(ctx, [[x - R, 0, 0], [x + R, 0, 0], [x + R, DRV.H, 0], [x - R, DRV.H, 0]], [27, 28, 36]);
    for (const y of DRV.YS) this.poly(ctx, [[0, y - R, 0], [DRV.W, y - R, 0], [DRV.W, y + R, 0], [0, y + R, 0]], [27, 28, 36]);
    // mokrý lesk asfaltu u obzoru
    const wg = ctx.createLinearGradient(0, hz, 0, hz + h * 0.3);
    wg.addColorStop(0, 'rgba(120,70,170,.28)');
    wg.addColorStop(1, 'rgba(120,70,170,0)');
    ctx.fillStyle = wg;
    ctx.fillRect(0, hz, w, h * 0.3);
    // obrubníky
    const cb = [];
    for (const b of nearB) {
      cb.push([[b.x0, b.y0, 0.4], [b.x1, b.y0, 0.4], [b.x1, b.y0 + 4, 0.4], [b.x0, b.y0 + 4, 0.4]]);
      cb.push([[b.x0, b.y1 - 4, 0.4], [b.x1, b.y1 - 4, 0.4], [b.x1, b.y1, 0.4], [b.x0, b.y1, 0.4]]);
      cb.push([[b.x0, b.y0, 0.4], [b.x0 + 4, b.y0, 0.4], [b.x0 + 4, b.y1, 0.4], [b.x0, b.y1, 0.4]]);
      cb.push([[b.x1 - 4, b.y0, 0.4], [b.x1, b.y0, 0.4], [b.x1, b.y1, 0.4], [b.x1 - 4, b.y1, 0.4]]);
    }
    this.batch(ctx, cb, [104, 100, 116], 600);
    // čáry: přerušovaná uprostřed, plné u krajnic
    const RANGE = 1500, lines = [], edges = [];
    for (const x of DRV.XS) {
      if (Math.abs(x - C.x) > RANGE) continue;
      for (let y = Math.max(0, Math.floor((C.y - RANGE) / 60) * 60); y < Math.min(DRV.H, C.y + RANGE); y += 60) {
        if (DRV.YS.some((yy) => Math.abs(yy - y) < R + 10) || fwd(x, y + 16) < -40) continue;
        lines.push([[x - 2, y, 0.5], [x + 2, y, 0.5], [x + 2, y + 32, 0.5], [x - 2, y + 32, 0.5]]);
      }
      const ys = [0, ...DRV.YS, DRV.H];
      for (let j = 0; j < ys.length - 1; j++) {
        const a = ys[j] + (j ? R + 6 : 0), b = ys[j + 1] - (j < ys.length - 2 ? R + 6 : 0);
        if (Math.abs((a + b) / 2 - C.y) > RANGE + 350) continue;
        for (const sg of [-1, 1]) edges.push([[x + sg * (R - 9) - 1.2, a, 0.5], [x + sg * (R - 9) + 1.2, a, 0.5], [x + sg * (R - 9) + 1.2, b, 0.5], [x + sg * (R - 9) - 1.2, b, 0.5]]);
      }
    }
    for (const y of DRV.YS) {
      if (Math.abs(y - C.y) > RANGE) continue;
      for (let x = Math.max(0, Math.floor((C.x - RANGE) / 60) * 60); x < Math.min(DRV.W, C.x + RANGE); x += 60) {
        if (DRV.XS.some((xx) => Math.abs(xx - x) < R + 10) || fwd(x + 16, y) < -40) continue;
        lines.push([[x, y - 2, 0.5], [x + 32, y - 2, 0.5], [x + 32, y + 2, 0.5], [x, y + 2, 0.5]]);
      }
      const xs = [0, ...DRV.XS, DRV.W];
      for (let i = 0; i < xs.length - 1; i++) {
        const a = xs[i] + (i ? R + 6 : 0), b = xs[i + 1] - (i < xs.length - 2 ? R + 6 : 0);
        if (Math.abs((a + b) / 2 - C.x) > RANGE + 350) continue;
        for (const sg of [-1, 1]) edges.push([[a, y + sg * (R - 9) - 1.2, 0.5], [b, y + sg * (R - 9) - 1.2, 0.5], [b, y + sg * (R - 9) + 1.2, 0.5], [a, y + sg * (R - 9) + 1.2, 0.5]]);
      }
    }
    // zebry u křižovatek
    for (const x of DRV.XS) for (const y of DRV.YS) {
      if (dist(x, y) > 950 || fwd(x, y) < -160) continue;
      for (let k = -R + 14; k < R - 14; k += 18) {
        lines.push([[x + k, y - R - 24, 0.6], [x + k + 9, y - R - 24, 0.6], [x + k + 9, y - R - 4, 0.6], [x + k, y - R - 4, 0.6]]);
        lines.push([[x + k, y + R + 4, 0.6], [x + k + 9, y + R + 4, 0.6], [x + k + 9, y + R + 24, 0.6], [x + k, y + R + 24, 0.6]]);
        lines.push([[x - R - 24, y + k, 0.6], [x - R - 4, y + k, 0.6], [x - R - 4, y + k + 9, 0.6], [x - R - 24, y + k + 9, 0.6]]);
        lines.push([[x + R + 4, y + k, 0.6], [x + R + 24, y + k, 0.6], [x + R + 24, y + k + 9, 0.6], [x + R + 4, y + k + 9, 0.6]]);
      }
    }
    this.batch(ctx, edges, [170, 170, 178], 500);
    this.batch(ctx, lines, [205, 205, 212], 500);
    // stopy smyků
    const tr = this.trail, sk = [];
    for (let i = 1; i < tr.length; i++) {
      const A = tr[i - 1], B = tr[i];
      if (B.t - A.t > 0.15 || dist(B.x, B.y) > 900) continue;
      const L = Math.hypot(B.x - A.x, B.y - A.y) || 1, nx = -(B.y - A.y) / L, ny = (B.x - A.x) / L;
      for (const o of [-9, 9]) sk.push([[A.x + nx * (o - 1.6), A.y + ny * (o - 1.6), 0.55], [B.x + nx * (o - 1.6), B.y + ny * (o - 1.6), 0.55], [B.x + nx * (o + 1.6), B.y + ny * (o + 1.6), 0.55], [A.x + nx * (o + 1.6), A.y + ny * (o + 1.6), 0.55]]);
    }
    this.batch(ctx, sk, 'rgba(6,6,10,.55)', 0);
    // světla lamp a semaforů na mokré zemi
    ctx.globalCompositeOperation = 'lighter';
    const refl = (x, y, len, w0, w1, col) => {
      const dx = C.x - x, dy = C.y - y, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
      this.poly(ctx, [[x - uy * w0, y + ux * w0, 0.6], [x + uy * w0, y - ux * w0, 0.6], [x + ux * len + uy * w1, y + uy * len - ux * w1, 0.6], [x + ux * len - uy * w1, y + uy * len + ux * w1, 0.6]], col);
    };
    for (const L of this.lamps) {
      if (fwd(L.x, L.y) < 0 || dist(L.x, L.y) > 1200) continue;
      const ax = L.x + L.dx * 26, ay = L.y + L.dy * 26;
      this.pool(ctx, ax, ay, 80, '255,196,120', 0.34);
      refl(ax, ay, 170, 7, 20, 'rgba(255,196,120,.12)');
    }
    for (const S of this.tlights) {
      if (fwd(S.x, S.y) < 0 || dist(S.x, S.y) > 1200) continue;
      const ax = S.x + S.dx * 46, ay = S.y + S.dy * 46;
      refl(ax, ay, 130, 3, 12, `rgba(${DRV_TL[this.tlState(S, now)]},.16)`);
    }
    // navigace: šipky plynoucí po trase k cíli
    if (this.path) {
      const P = this.path;
      let total = 0;
      for (let i = 1; i < P.length; i++) total += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y);
      let rem = total;
      const anim = (this.t * 110) % 80, band = [], chev = [];
      for (let i = 1; i < P.length; i++) {
        const A = P[i - 1], B = P[i], L = Math.hypot(B.x - A.x, B.y - A.y);
        if (L < 1) continue;
        const ux = (B.x - A.x) / L, uy = (B.y - A.y) / L, nx = -uy, ny = ux;
        band.push([[A.x + nx * 11, A.y + ny * 11, 0.8], [B.x + nx * 11, B.y + ny * 11, 0.8], [B.x - nx * 11, B.y - ny * 11, 0.8], [A.x - nx * 11, A.y - ny * 11, 0.8]]);
        for (let s = (rem + anim) % 80; s < L; s += 80) {
          const x = A.x + ux * s, y = A.y + uy * s;
          if (dist(x, y) > 1100 || fwd(x, y) < 30) continue;
          chev.push([[x + ux * 11, y + uy * 11, 0.9], [x - ux * 3 + nx * 13, y - uy * 3 + ny * 13, 0.9], [x - ux * 10 + nx * 13, y - uy * 10 + ny * 13, 0.9], [x + ux * 4, y + uy * 4, 0.9], [x - ux * 10 - nx * 13, y - uy * 10 - ny * 13, 0.9], [x - ux * 3 - nx * 13, y - uy * 3 - ny * 13, 0.9]]);
        }
        rem -= L;
      }
      this.batch(ctx, band, 'rgba(60,170,255,.16)');
      this.batch(ctx, chev, 'rgba(110,230,255,.7)');
    }
    ctx.globalCompositeOperation = 'source-over';
  },

  /* ---------- domy ---------- */

  houseStyle(hs) {
    if (hs._st) return hs._st;
    const s = hs.win % 4;
    const base = s === 0 ? this.hsl(hs.hue, 8, 30) : s === 1 ? [98 + (hs.hue % 24), 46, 38] : s === 2 ? [30, 40, 58] : this.hsl(hs.hue, 28, 34);
    hs._st = { s, base, fh: [30, 34, 26, 40][s], ww: [16, 12, 0, 13][s], wh: [13, 18, 0, 22][s], sp: [34, 38, 22, 42][s], acc: this.hsl((hs.hue + 140) % 360, 50, 42) };
    return hs._st;
  },

  house3d(ctx, hs, now) {
    const C = this._C, st = this.houseStyle(hs);
    const cx = (hs.x0 + hs.x1) / 2, cy = (hs.y0 + hs.y1) / 2;
    if (C.y > hs.y1) this.facade(ctx, hs, st, { A: [hs.x0, hs.y1], B: [hs.x1, hs.y1], n: [0, 1], street: true, id: 0 }, now);
    if (C.y < hs.y0) this.facade(ctx, hs, st, { A: [hs.x1, hs.y0], B: [hs.x0, hs.y0], n: [0, -1], street: true, id: 1 }, now);
    if (C.x < hs.x0) this.facade(ctx, hs, st, { A: [hs.x0, hs.y0], B: [hs.x0, hs.y1], n: [-1, 0], street: !hs.inW, id: 2 }, now);
    if (C.x > hs.x1) this.facade(ctx, hs, st, { A: [hs.x1, hs.y1], B: [hs.x1, hs.y0], n: [1, 0], street: !hs.inE, id: 3 }, now);
    const dk = st.base.map((v) => v * 0.55);
    this.box(ctx, cx, cy, 0, hs.x1 - hs.x0 + 6, hs.y1 - hs.y0 + 6, hs.h, hs.h + 5, dk, dk);
    this.roofStuff(ctx, hs, st, now);
  },

  // Fasáda: přechod stěny, okna po patrech (dávkově), výlohy s markýzami, cedule a odlesk na chodníku.
  facade(ctx, hs, st, F, now) {
    const A = F.A, B = F.B, H = hs.h;
    const zA = this.depth(A[0], A[1]), zB = this.depth(B[0], B[1]);
    if (zA < 4 && zB < 4) return;
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]), nx = F.n[0], ny = F.n[1];
    const P = (t, z, o = 0) => [A[0] + (B[0] - A[0]) * t + nx * o, A[1] + (B[1] - A[1]) * t + ny * o, z];
    const zmin = Math.max(4, Math.min(zA, zB)), zmax = Math.max(zA, zB), zm = (Math.max(zA, 4) + Math.max(zB, 4)) / 2;
    const lit = 0.68 + 0.32 * Math.max(0, -nx * 0.55 - ny * 0.83), bc = st.base;
    if (!this.path3(ctx, [P(0, 0), P(1, 0), P(1, H), P(0, H)])) return;
    const zr = Math.max(zmin, Math.min(zmax, 150)), tr = zB !== zA ? clamp((zr - zA) / (zB - zA), 0, 1) : 0.5;
    const rp = P(tr, 0), gb = this.bb(rp[0], rp[1], 0), gt = this.bb(rp[0], rp[1], H), zf = this._zs;
    if (gb && gt && zmin < 1800) {
      const g = ctx.createLinearGradient(0, gb.y, 0, gt.y);
      g.addColorStop(0, this.fog([bc[0] * lit * 1.3 + 34, bc[1] * lit * 1.15 + 20, bc[2] * lit + 16], zf));
      g.addColorStop(0.3, this.fog([bc[0] * lit, bc[1] * lit, bc[2] * lit], zf));
      g.addColorStop(1, this.fog([bc[0] * lit * 0.6, bc[1] * lit * 0.6, bc[2] * lit * 0.7 + 4], zf));
      ctx.fillStyle = g;
    } else ctx.fillStyle = this.fog([bc[0] * lit * 0.85, bc[1] * lit * 0.85, bc[2] * lit * 0.9], zf);
    ctx.fill();
    if (zmin > 1700) return;
    const near = zmin < 760, G = F.street ? 38 : 10, fh = st.fh, floors = Math.min(10, Math.floor((H - 12 - G) / fh));
    const seed = hs.win * 7 + F.id * 131, litPct = 24 + (hs.win % 5) * 7, fzm = zm * 0.8;
    const dark = [], warm = [], warmHi = [], cool = [], frame = [], extra = [];
    if (floors > 0) {
      if (st.s === 2) {
        // kancelář: prosklené pásy přes celé patro
        for (let f = 0; f < floors; f++) {
          const za = G + f * fh + 5, zb = za + fh - 9, q = [P(0.02, za), P(0.98, za), P(0.98, zb), P(0.02, zb)];
          (this.hash(seed + f * 13) % 100 < 45 ? cool : dark).push(q);
          if (near) extra.push([P(0, za - 4), P(1, za - 4), P(1, za - 2.5), P(0, za - 2.5)]);
        }
      } else {
        const sp = st.sp, n = Math.max(1, Math.floor((len - 14) / sp)), m0 = (len - n * sp) / 2, fr = 1.4 / len;
        for (let f = 0; f < floors; f++) {
          const za = G + f * fh + (fh - st.wh) / 2, zb = za + st.wh;
          if (near && st.s !== 0) extra.push([P(0, za - 5), P(1, za - 5), P(1, za - 3.4), P(0, za - 3.4)]);
          for (let k = 0; k < n; k++) {
            const t0 = (m0 + k * sp + (sp - st.ww) / 2) / len, t1 = t0 + st.ww / len, hh = this.hash(seed + f * 977 + k * 31);
            if (near) frame.push([P(t0 - fr, za - 1.4), P(t1 + fr, za - 1.4), P(t1 + fr, zb + 1.4), P(t0 - fr, zb + 1.4)]);
            const q = [P(t0, za), P(t1, za), P(t1, zb), P(t0, zb)];
            if (hh % 100 < litPct) {
              if ((hh >> 8) % 10 < 7) {
                warm.push(q);
                if (near) warmHi.push([P(t0, zb - st.wh * 0.45), P(t1, zb - st.wh * 0.45), P(t1, zb), P(t0, zb)]);
              } else cool.push(q);
            } else dark.push(q);
            if (st.s === 0 && near && k % 3 === 1) extra.push([P(t0 - fr * 2, za - 9), P(t1 + fr * 2, za - 9), P(t1 + fr * 2, za - 2.5), P(t0 - fr * 2, za - 2.5)]);
          }
        }
      }
      const exCol = st.s === 0 ? st.acc : st.s === 2 ? [20, 24, 32] : [bc[0] * 1.35 + 20, bc[1] * 1.35 + 18, bc[2] * 1.35 + 16];
      this.batch(ctx, extra, [exCol[0] * lit, exCol[1] * lit, exCol[2] * lit], zm);
      this.batch(ctx, frame, [bc[0] * 0.5 + 60, bc[1] * 0.5 + 58, bc[2] * 0.5 + 62], zm);
      this.batch(ctx, dark, [16, 20, 34], zm);
      this.batch(ctx, warm, [236, 168, 84], fzm);
      this.batch(ctx, warmHi, [255, 222, 150], fzm);
      this.batch(ctx, cool, st.s === 2 ? [150, 196, 240] : [150, 186, 255], fzm);
    }
    if (!F.street) return;
    // přízemí: obchody s výlohami, nebo spuštěné rolety
    if (zmin < 1300) {
      const nS = Math.max(1, Math.round(len / 115)), glass = [], doors = [], awn = [], awnF = [], shut = [], signs = [];
      const spill = [];
      for (let j = 0; j < nS; j++) {
        const t0 = j / nS + 6 / len, t1 = (j + 1) / nS - 6 / len, hh = this.hash(seed + j * 7919), hue = (hs.signHue + j * 67) % 360;
        if (hh % 10 < 7) {
          glass.push({ q: [P(t0, 3), P(t1 - 18 / len, 3), P(t1 - 18 / len, 24), P(t0, 24)], hue });
          doors.push([P(t1 - 15 / len, 0), P(t1, 0), P(t1, 23), P(t1 - 15 / len, 23)]);
          awn.push({ q: [P(t0 - 2 / len, 31), P(t1 + 2 / len, 31), P(t1 + 2 / len, 26, 10), P(t0 - 2 / len, 26, 10)], hue });
          awnF.push({ q: [P(t0 - 2 / len, 26, 10), P(t1 + 2 / len, 26, 10), P(t1 + 2 / len, 22.5, 10), P(t0 - 2 / len, 22.5, 10)], hue });
          signs.push({ t0: t0 + 0.04 * (t1 - t0), t1: t1 - 0.04 * (t1 - t0), hue, txt: DRV_SIGNS[(hh >>> 5) % DRV_SIGNS.length] });
          spill.push({ q: [P(t0, 0.6, 1), P(t1, 0.6, 1), P(t1, 0.6, 60), P(t0, 0.6, 60)], hue });
        } else shut.push([P(t0, 0), P(t1, 0), P(t1, 27), P(t0, 27)]);
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const s of spill) this.poly(ctx, s.q, `hsla(${s.hue},90%,60%,.1)`);
      ctx.globalCompositeOperation = 'source-over';
      for (const g of glass) this.poly(ctx, g.q, this.hsl(g.hue, 70, 64), 0.95);
      this.batch(ctx, doors, [20, 16, 26], zm);
      this.batch(ctx, shut, [66, 68, 78], zm);
      for (const a of awn) this.poly(ctx, a.q, this.hsl(a.hue, 58, 30));
      for (const a of awnF) this.poly(ctx, a.q, this.hsl(a.hue, 62, 44));
      for (const s of signs) {
        this.poly(ctx, [P(s.t0, 33), P(s.t1, 33), P(s.t1, 40), P(s.t0, 40)], [18, 14, 24]);
        if (zmin < 520) this.wallText(ctx, P(s.t0, 33, 0.2), P(s.t1, 33, 0.2), P(s.t0, 40, 0.2), s.txt, `hsl(${s.hue},100%,78%)`, `hsla(${s.hue},100%,60%,.45)`);
      }
    }
    // svislá neonová cedule kolmo ke stěně
    if (hs.sign && hs.win % 2 === 0 && F.id < 2 && zmin < 1200) {
      const t = 0.1, nC = `${hs.signHue}`, letters = hs.sign.length, z0 = 46, z1 = z0 + letters * 12 + 8;
      this.poly(ctx, [P(t, z0), P(t, z0, 17), P(t, z1, 17), P(t, z1)], [24, 16, 32]);
      this.line3(ctx, [P(t, z0, 1), P(t, z0, 16), P(t, z1, 16), P(t, z1, 1)], `hsl(${nC},100%,62%)`, Math.max(1, 1.4 * this._C.dpr), true);
      const c0 = P(t, 0, 9), mid = this.bb(c0[0], c0[1], (z0 + z1) / 2);
      if (mid) {
        this.glowAt(ctx, mid.x, mid.y, 30 * mid.k, (z1 - z0) * 0.75 * mid.k, this.hsl(hs.signHue, 100, 60).join(','), 0.4);
        ctx.font = `${10 * mid.k}px ${FONT_D}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `hsl(${nC},100%,80%)`;
        for (let i = 0; i < letters; i++) {
          const b = this.bb(c0[0], c0[1], z1 - 10 - i * 12);
          if (b) ctx.fillText(hs.sign[i], b.x, b.y);
        }
      }
    }
    void now;
  },

  // Na střeše: vodárna, anténa s blikáním, reklama, neonový nápis.
  roofStuff(ctx, hs, st, now) {
    const C = this._C, cx = (hs.x0 + hs.x1) / 2, cy = (hs.y0 + hs.y1) / 2, H = hs.h + 5;
    const d = Math.hypot(cx - C.x, cy - C.y);
    if (d > 2300) return;
    if (hs.ac === 0) {
      const tx = hs.x1 - 24, ty = hs.y0 + 24;
      this.box(ctx, tx, ty, 0, 12, 12, H, H + 9, [34, 30, 32], [34, 30, 32]);
      this.box(ctx, tx, ty, 0, 20, 20, H + 9, H + 30, [86, 64, 50], [70, 52, 42]);
    } else if (hs.ac === 1) {
      const b = this.bb(cx, cy, H), t = this.bb(cx, cy, H + 70);
      if (b && t) {
        ctx.strokeStyle = this.fog([70, 70, 80], b.zc);
        ctx.lineWidth = Math.max(1, 1.4 * b.k);
        line(ctx, b.x, b.y, t.x, t.y);
        if (Math.sin(now / 380 + hs.win) > 0.3) this.glowAt(ctx, t.x, t.y, 22 * t.k + 3, 22 * t.k + 3, '255,40,40', 0.9);
      }
    } else if (hs.ac === 2 && C.y > hs.y1 && d < 1900) {
      const x0 = hs.x0 + 14, x1 = Math.min(hs.x1 - 14, hs.x0 + 150), y = hs.y1 - 8, ad = DRV_ADS[hs.win % DRV_ADS.length];
      for (const xx of [x0 + 10, x1 - 10]) {
        const b = this.bb(xx, y, H), t = this.bb(xx, y, H + 10);
        if (b && t) {
          ctx.strokeStyle = '#1a1a22';
          ctx.lineWidth = Math.max(1, 1.6 * b.k);
          line(ctx, b.x, b.y, t.x, t.y);
        }
      }
      this.poly(ctx, [[x0 - 2, y, H + 8], [x1 + 2, y, H + 8], [x1 + 2, y, H + 46], [x0 - 2, y, H + 46]], [16, 14, 22]);
      this.poly(ctx, [[x0, y + 0.3, H + 10], [x1, y + 0.3, H + 10], [x1, y + 0.3, H + 44], [x0, y + 0.3, H + 44]], ad.bg);
      this.wallText(ctx, [x0, y + 0.6, H + 12], [x1, y + 0.6, H + 12], [x0, y + 0.6, H + 42], ad.t, ad.fg, null);
      const m = this.bb((x0 + x1) / 2, y + 4, H + 27);
      if (m) this.glowAt(ctx, m.x, m.y, (x1 - x0) * 0.7 * m.k, 30 * m.k, ad.glow, 0.25);
    }
    if (hs.sign && hs.win % 2) {
      const b = this.bb(cx, cy, hs.h + 22);
      if (b && b.zc < 2100) {
        const fs = 34 * b.k;
        if (fs > 4) {
          ctx.save();
          ctx.globalAlpha = clamp(1 - (b.zc - 1500) / 600, 0, 1);
          this.glowAt(ctx, b.x, b.y, fs * 2.4, fs * 0.9, this.hsl(hs.signHue, 100, 60).join(','), 0.35);
          ctx.font = `${fs}px ${FONT_D}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = `hsla(${hs.signHue},100%,60%,.45)`;
          ctx.lineWidth = fs * 0.3;
          ctx.strokeText(hs.sign, b.x, b.y);
          ctx.fillStyle = `hsl(${hs.signHue},100%,82%)`;
          ctx.fillText(hs.sign, b.x, b.y);
          ctx.restore();
        }
      }
    }
    void st;
  },

  // Klub Hot Peppers: černá budova se zlatými žebry, LED pruh, vchod s markýzou a žárovkami, palmy, obří neon.
  hp3d(ctx, b, now) {
    const t = now / 1000, ly = b.lotY, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + 14 + ly) / 2;
    // parkoviště s čarami a růžovým světlem
    this.poly(ctx, [[b.x0 + 14, ly, 0.4], [b.x1 - 14, ly, 0.4], [b.x1 - 14, b.y1, 0.4], [b.x0 + 14, b.y1, 0.4]], [36, 34, 46]);
    const pl = [];
    for (let x = b.x0 + 40; x < b.x1 - 30; x += 46) if (Math.abs(x - cx) > 50) pl.push([[x, ly + 10, 0.5], [x + 2.5, ly + 10, 0.5], [x + 2.5, ly + 70, 0.5], [x, ly + 70, 0.5]]);
    this.batch(ctx, pl, [190, 190, 200], 400);
    this.poly(ctx, [[cx - 26, ly - 2, 0.6], [cx + 26, ly - 2, 0.6], [cx + 26, ly + 70, 0.6], [cx - 26, ly + 70, 0.6]], [170, 16, 50]);
    ctx.globalCompositeOperation = 'lighter';
    this.poly(ctx, [[b.x0 + 30, ly + 4, 0.7], [b.x1 - 30, ly + 4, 0.7], [b.x1 - 30, b.y1 + 60, 0.7], [b.x0 + 30, b.y1 + 60, 0.7]], 'rgba(255,60,130,.12)');
    this.pool(ctx, cx, ly + 40, 160, '255,70,150', 0.45);
    ctx.globalCompositeOperation = 'source-over';
    // budova
    const W = b.x1 - b.x0 - 28, Hd = ly - b.y0 - 14, Hh = 150, x0 = cx - W / 2, x1 = cx + W / 2;
    this.box(ctx, cx, cy, 0, W, Hd, 0, Hh, [30, 14, 28], [22, 10, 20]);
    const C = this._C;
    if (C.y > ly) {
      // zlatá svislá žebra a okna s růžovým světlem na čelní stěně
      const fins = [], win = [];
      for (let x = x0 + 20; x < x1 - 10; x += 26) {
        fins.push([[x, ly + 0.4, 50], [x + 3, ly + 0.4, 50], [x + 3, ly + 0.4, Hh - 18], [x, ly + 0.4, Hh - 18]]);
        if (Math.abs(x + 13 - cx) > 40) win.push([[x + 6, ly + 0.3, 62], [x + 20, ly + 0.3, 62], [x + 20, ly + 0.3, Hh - 30], [x + 6, ly + 0.3, Hh - 30]]);
      }
      this.batch(ctx, win, 'rgba(255,60,150,.38)');
      this.batch(ctx, fins, [212, 165, 60], 300);
      // vchod s markýzou a běžícími žárovkami
      this.poly(ctx, [[cx - 22, ly + 0.3, 0], [cx + 22, ly + 0.3, 0], [cx + 22, ly + 0.3, 30], [cx - 22, ly + 0.3, 30]], [255, 214, 150]);
      this.poly(ctx, [[cx - 40, ly, 36], [cx + 40, ly, 36], [cx + 40, ly + 34, 32], [cx - 40, ly + 34, 32]], [24, 12, 22]);
      this.poly(ctx, [[cx - 40, ly + 34, 32], [cx + 40, ly + 34, 32], [cx + 40, ly + 34, 28], [cx - 40, ly + 34, 28]], [212, 165, 60]);
      for (let i = 0; i < 12; i++) {
        const q = this.bb(cx - 38 + i * (76 / 11), ly + 34.5, 30);
        if (q && (i + Math.floor(t * 8)) % 3) this.glowAt(ctx, q.x, q.y, 5 * q.k + 1, 5 * q.k + 1, '255,220,150', 0.9);
      }
      // palmy u vchodu
      for (const px of [cx - 70, cx + 70]) this.palm(ctx, px, ly + 22, t);
    }
    this.box(ctx, cx, cy, 0, W + 4, Hd + 4, Hh - 14, Hh - 4, [255, 60, 130], [255, 60, 130]);
    this.box(ctx, cx, cy, 0, W + 2, Hd + 2, 40, 46, [212, 165, 60], [212, 165, 60]);
    // obří neon
    const s = this.bb(cx, ly + 4, Hh + 40);
    if (s) {
      const fs = 70 * s.k;
      this.glowAt(ctx, s.x, s.y, fs * 4, fs * 1.3, '255,50,120', 0.45 + Math.sin(t * 3) * 0.05);
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

  palm(ctx, x, y, t) {
    const b = this.bb(x, y, 0), top = this.bb(x + 6, y, 64);
    if (!b || !top) return;
    this.glowAt(ctx, b.x, b.y - 20 * b.k, 26 * b.k, 40 * b.k, '255,120,200', 0.3);
    ctx.strokeStyle = '#5a3a22';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, 3.4 * b.k);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.quadraticCurveTo(b.x - 4 * b.k, (b.y + top.y) / 2, top.x, top.y);
    ctx.stroke();
    ctx.strokeStyle = '#1f6a3a';
    ctx.lineWidth = Math.max(1, 3 * top.k);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + Math.sin(t + i) * 0.06, r = 26 * top.k;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.quadraticCurveTo(top.x + Math.cos(a) * r * 0.6, top.y - 8 * top.k, top.x + Math.cos(a) * r, top.y + Math.abs(Math.sin(a)) * r * 0.35 + 6 * top.k);
      ctx.stroke();
    }
  },

  tree(ctx, t) {
    const b = this.bb(t.x, t.y, 0), top = this.bb(t.x, t.y, 46 + t.s);
    if (!b || !top) return;
    ctx.strokeStyle = this.fog([62, 44, 32], b.zc);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, 4.5 * b.k);
    line(ctx, b.x, b.y, top.x, top.y + 10 * top.k);
    const r = t.s * top.k;
    for (const [ox, oy, rf, col] of [[-0.45, 0.3, 0.72, [16, 44, 30]], [0.5, 0.25, 0.68, [16, 44, 30]], [0, 0, 1, [28, 72, 44]], [-0.28, -0.36, 0.56, [52, 104, 62]], [0.22, -0.1, 0.4, [40, 92, 56]]]) {
      ctx.fillStyle = this.fog(col, b.zc);
      circle(ctx, top.x + ox * r, top.y + oy * r, Math.max(1.5, rf * r));
      ctx.fill();
    }
  },

  // Pouliční lampa s ramenem nad silnici a kuželem světla.
  lamp(ctx, L) {
    const H = 80, ax = L.x + L.dx * 26, ay = L.y + L.dy * 26;
    const b = this.bb(L.x, L.y, 0), t = this.bb(L.x, L.y, H), hd = this.bb(ax, ay, H - 2), gb = this.bb(ax, ay, 0);
    if (!b || !t || !hd) return;
    ctx.lineCap = 'round';
    ctx.strokeStyle = this.fog([58, 60, 72], b.zc);
    ctx.lineWidth = Math.max(1, 2.6 * b.k);
    line(ctx, b.x, b.y, t.x, t.y);
    ctx.lineWidth = Math.max(1, 1.6 * t.k);
    line(ctx, t.x, t.y, hd.x, hd.y);
    ctx.fillStyle = this.fog([36, 36, 44], b.zc);
    ctx.fillRect(hd.x - 5.5 * hd.k, hd.y - 1.6 * hd.k, 11 * hd.k, 3 * hd.k);
    ctx.fillStyle = '#fff2d2';
    ctx.fillRect(hd.x - 4.5 * hd.k, hd.y + 1.2 * hd.k, 9 * hd.k, 1.4 * hd.k);
    if (gb && hd.zc < 900) {
      ctx.globalCompositeOperation = 'lighter';
      const cg = ctx.createLinearGradient(0, hd.y, 0, gb.y);
      cg.addColorStop(0, 'rgba(255,210,140,.13)');
      cg.addColorStop(1, 'rgba(255,210,140,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(hd.x - 4.5 * hd.k, hd.y + 2 * hd.k);
      ctx.lineTo(hd.x + 4.5 * hd.k, hd.y + 2 * hd.k);
      ctx.lineTo(gb.x + 36 * gb.k, gb.y);
      ctx.lineTo(gb.x - 36 * gb.k, gb.y);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    this.glowAt(ctx, hd.x, hd.y + 2 * hd.k, 34 * hd.k + 2, 30 * hd.k + 2, '255,214,150', clamp(1.15 - hd.zc / 1600, 0.2, 0.9));
  },

  tlState(S, now) {
    const ph = (now / 1000 + S.off) % 12, st = S.v ? ph : (ph + 6) % 12;
    return st < 5 ? 2 : st < 6 ? 1 : 0;
  },
  // Semafor na rameni nad silnicí; svítí podle cyklu (provoz si ho nevšímá, je to Hot Peppers).
  tlight(ctx, S, now) {
    const H = 74, ax = S.x + S.dx * 46, ay = S.y + S.dy * 46;
    const b = this.bb(S.x, S.y, 0), t = this.bb(S.x, S.y, H), hd = this.bb(ax, ay, H - 9);
    if (!b || !t || !hd) return;
    ctx.lineCap = 'round';
    ctx.strokeStyle = this.fog([44, 46, 56], b.zc);
    ctx.lineWidth = Math.max(1, 3 * b.k);
    line(ctx, b.x, b.y, t.x, t.y);
    const ae = this.bb(ax, ay, H);
    if (ae) {
      ctx.lineWidth = Math.max(1, 2 * t.k);
      line(ctx, t.x, t.y, ae.x, ae.y);
    }
    const k = hd.k, on = this.tlState(S, now);
    ctx.fillStyle = '#121216';
    rrect(ctx, hd.x - 3 * k, hd.y - 7 * k, 6 * k, 15 * k, 1.5 * k);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const yy = hd.y - 4.4 * k + i * 4.6 * k, act = i === on;
      ctx.fillStyle = act ? `rgb(${DRV_TL[on]})` : 'rgba(60,60,70,.9)';
      circle(ctx, hd.x, yy, 1.6 * k);
      ctx.fill();
      if (act) this.glowAt(ctx, hd.x, yy, 16 * k + 2, 16 * k + 2, DRV_TL[on], 0.85);
    }
  },

  // Částice: kouř z výfuku, dým pneumatik, jiskry při nárazu.
  drawFx(ctx) {
    if (!this.fx) return;
    for (const q of this.fx) {
      const b = this.bb(q.x, q.y, q.z);
      if (!b) continue;
      const u = q.life / q.max, r = (q.r0 + (q.r1 - q.r0) * u) * b.k;
      if (q.spark) this.glowAt(ctx, b.x, b.y, 3 * b.k + 1, 3 * b.k + 1, '255,180,80', 1 - u);
      else {
        ctx.globalAlpha = q.a * (1 - u);
        ctx.drawImage(this.sprite(q.col), b.x - r, b.y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
    }
  },

  hsl(h, s, l) {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  },

  // Auto shora: karoserie, okna, střecha, světla.
  drawCar(ctx, x, y, ang, c, lights, me, look) {
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
    const roofL = c.id === 'limo' ? L * 0.62 : L * 0.42;
    if (c.price !== undefined) {
      // kabriolet shora: interiér, sedačky a řidič
      ctx.fillStyle = '#1e181e';
      rrect(ctx, -roofL / 2 - 4, -Wd / 2 + 3, roofL + 6, Wd - 6, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(170,210,255,.5)';
      ctx.fillRect(roofL / 2 + 1, -Wd / 2 + 3, 3, Wd - 6);
      ctx.fillStyle = '#4a1c24';
      for (const r of [-Wd * 0.22, Wd * 0.22]) {
        rrect(ctx, -roofL / 2 - 2, r - Wd * 0.15, 7, Wd * 0.3, 2);
        ctx.fill();
      }
      const lk = look || (typeof Club !== 'undefined' ? lookFor(Club.pick || 'jenda') : null);
      if (lk) {
        ctx.fillStyle = lk.hair === 'bald' ? lk.skin : lk.hairColor || '#3a2a1a';
        circle(ctx, -roofL / 2 + 8, -Wd * 0.22, Wd * 0.2);
        ctx.fill();
        ctx.strokeStyle = '#06060a';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    } else {
      // čelní sklo, střecha, zadní sklo
      ctx.fillStyle = '#0d1420';
      rrect(ctx, -roofL / 2 - 6, -Wd / 2 + 3, roofL + 14, Wd - 6, 5);
      ctx.fill();
      ctx.fillStyle = c.dark;
      rrect(ctx, -roofL / 2, -Wd / 2 + 4, roofL, Wd - 8, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.fillRect(roofL / 2 + 1, -Wd / 2 + 5, 5, Wd - 10);
    }
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
    // rychloměr: kruhový budík s ručičkou
    const kmh = Math.round(Math.abs(this.p.v) * 0.2), maxK = Math.round(this.car.max * 0.2);
    const gr = 40 * k, gx = w - 62 * k, gy = h - 66 * k, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, fr = clamp(kmh / maxK, 0, 1);
    ctx.fillStyle = 'rgba(8,8,18,.74)';
    circle(ctx, gx, gy, gr + 9 * k);
    ctx.fill();
    ctx.strokeStyle = 'rgba(243,211,138,.35)';
    ctx.lineWidth = 1.5 * k;
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.lineWidth = 6 * k;
    ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.beginPath();
    ctx.arc(gx, gy, gr, a0, a1);
    ctx.stroke();
    if (fr > 0.005) {
      const sgr = ctx.createLinearGradient(gx - gr, 0, gx + gr, 0);
      sgr.addColorStop(0, '#5ad8ff');
      sgr.addColorStop(1, '#ff3d8a');
      ctx.strokeStyle = sgr;
      ctx.beginPath();
      ctx.arc(gx, gy, gr, a0, a0 + (a1 - a0) * fr);
      ctx.stroke();
    }
    ctx.lineWidth = 1.5 * k;
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    for (let i = 0; i <= 8; i++) {
      const a = a0 + ((a1 - a0) * i) / 8;
      line(ctx, gx + Math.cos(a) * (gr - 11 * k), gy + Math.sin(a) * (gr - 11 * k), gx + Math.cos(a) * (gr - 7 * k), gy + Math.sin(a) * (gr - 7 * k));
    }
    const na = a0 + (a1 - a0) * fr;
    ctx.strokeStyle = '#ff4d6d';
    ctx.lineWidth = 2.5 * k;
    line(ctx, gx, gy, gx + Math.cos(na) * (gr - 5 * k), gy + Math.sin(na) * (gr - 5 * k));
    ctx.fillStyle = '#ff4d6d';
    circle(ctx, gx, gy, 3.2 * k);
    ctx.fill();
    ctx.lineCap = 'butt';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = `${19 * k}px ${FONT_D}`;
    ctx.fillText(String(kmh), gx, gy + 16 * k);
    ctx.font = `${8.5 * k}px ${FONT_D}`;
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillText(this.p.v < -5 ? 'R · km/h' : 'km/h', gx, gy + 30 * k);
    ctx.textAlign = 'right';
    ctx.font = `${11 * k}px ${FONT_D}`;
    ctx.fillStyle = 'rgba(243,211,138,.92)';
    ctx.fillText(this.car.name, gx - gr - 16 * k, h - 16 * k);
    // minimapa
    const mw = 150 * k, mh = mw * (DRV.H / DRV.W), mx0 = w - mw - 12 * k, my0 = 64 * k, s = mw / DRV.W;
    ctx.fillStyle = 'rgba(10,12,20,.8)';
    rrect(ctx, mx0 - 4 * k, my0 - 4 * k, mw + 8 * k, mh + 8 * k, 8 * k);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.fillRect(mx0, my0, mw, mh);
    for (const b of this.blocks) {
      ctx.fillStyle = b.kind === 'hp' ? '#7a1f4a' : b.kind === 'park' ? '#1d3f2a' : '#1a1a26';
      ctx.fillRect(mx0 + b.x0 * s, my0 + b.y0 * s, (b.x1 - b.x0) * s, (b.y1 - b.y0) * s);
    }
    if (this.path) {
      ctx.strokeStyle = '#7fe0ff';
      ctx.lineWidth = 2.5 * k;
      ctx.beginPath();
      this.path.forEach((q, i) => (i ? ctx.lineTo(mx0 + q.x * s, my0 + q.y * s) : ctx.moveTo(mx0 + q.x * s, my0 + q.y * s)));
      ctx.stroke();
    }
    const pul = (now / 900) % 1;
    ctx.strokeStyle = `rgba(255,61,122,${1 - pul})`;
    ctx.lineWidth = 2 * k;
    circle(ctx, mx0 + DRV.DEST.x * s, my0 + DRV.DEST.y * s, (4.5 + pul * 9) * k);
    ctx.stroke();
    ctx.fillStyle = '#ff3d7a';
    circle(ctx, mx0 + DRV.DEST.x * s, my0 + DRV.DEST.y * s, 4.5 * k);
    ctx.fill();
    ctx.save();
    ctx.translate(mx0 + this.p.x * s, my0 + this.p.y * s);
    ctx.rotate(this.p.ang);
    ctx.fillStyle = '#ffd24a';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1 * k;
    ctx.beginPath();
    ctx.moveTo(7 * k, 0);
    ctx.lineTo(-5 * k, 5 * k);
    ctx.lineTo(-2.5 * k, 0);
    ctx.lineTo(-5 * k, -5 * k);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
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
