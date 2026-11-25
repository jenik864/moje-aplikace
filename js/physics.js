'use strict';
/* Fyzika hřiště: hráči, míč, břevna a góly. */

const IDLE = Object.freeze({ left: false, right: false, jump: false, kick: false });
const CHEER = Object.freeze({ left: false, right: false, jump: true, kick: false });

class Ball {
  constructor() {
    this.r = PHYS.ballR;
    this.reset(W / 2, KICKOFF_Y);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.rot = 0;
    this.superT = 0;   // jak dlouho ještě letí superstřela
    this.superBy = -1; // kdo ji vystřelil (index hráče)
    this.held = true; // při výkopu visí míč nad středem hřiště
    this.lastTouch = null;
    this.idle = 0;
    this.stuck = 0;
    this.stale = 0;
    this.anchorX = x;
  }

  // Míč leží nebo se motá na jednom místě a hra by se zasekla.
  get stalled() {
    return this.idle > 5 || this.stale > 10;
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }
}

class Player {
  constructor(o) {
    this.team = o.team;
    this.dir = o.team === 0 ? 1 : -1; // směr útoku a pohledu
    this.look = o.look;
    this.label = o.label || '';
    this.ctrl = o.ctrl || 'cpu'; // 'cpu', 'p1', 'host' nebo id kamaráda online
    this.slot = -1;              // vstup na tomto zařízení (0 = hráč 1, 1 = hráč 2)
    this.remote = null;          // id kamaráda, který hráče ovládá na svém telefonu
    this.isHuman = this.ctrl !== 'cpu';
    this.role = o.role;
    this.homeX = o.x;
    this.R = PHYS.playerR;
    this.speedMul = 1;
    this.brain = null;
    this.blinkT = rand(1, 4);
    this.blink = 0;
    this.runPhase = 0;
    this.superCharge = 0; // 0..1, při 1 lze vystřelit superstřelu
    this.superKick = false;
    this.place(o.x);
  }

  get standY() {
    return GROUND_Y - PHYS.footH - this.R;
  }

  get human() {
    return this.slot >= 0;
  }

  place(x) {
    this.x = x;
    this.y = this.standY;
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.prevFeet = GROUND_Y;
    this.kickT = -1;
    this.kickHit = false;
    this.kickCd = 0;
    this.mood = 0; // 1 radost, -1 smutek
  }

  // Průběh švihu 0 → 1 → 0.
  kickS() {
    if (this.kickT < 0) return 0;
    const u = this.kickT / PHYS.kickDur;
    return u < 0.45 ? easeOutQuad(u / 0.45) : 1 - easeInOutQuad((u - 0.45) / 0.55);
  }

  // Poloha kopačky: kvadratická křivka od země dopředu a nahoru.
  footAt(s, out) {
    const R = this.R, F = PHYS.footH, i = 1 - s;
    const lx = i * i * 8 + 2 * i * s * (R + 22) + s * s * (R + 18);
    const ly = i * i * (R + F - 12) + 2 * i * s * (R + F - 4) + s * s * (R + F - 50);
    out = out || {};
    out.x = this.x + this.dir * lx;
    out.y = this.y + ly;
    return out;
  }
}

// Míč proti kruhu (hlava, kopačka), který se pohybuje rychlostí (cvx, cvy).
function collideBallCircle(b, cx, cy, cr, cvx, cvy, e, minOut) {
  const dx = b.x - cx, dy = b.y - cy;
  const rr = cr + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr) return null;
  let nx = 0, ny = -1;
  if (d2 > 1e-6) {
    const d = Math.sqrt(d2);
    nx = dx / d;
    ny = dy / d;
  }
  b.x = cx + nx * rr;
  b.y = cy + ny * rr;
  const vn = (b.vx - cvx) * nx + (b.vy - cvy) * ny;
  if (vn < 0) {
    b.vx -= (1 + e) * vn * nx;
    b.vy -= (1 + e) * vn * ny;
  }
  const out = (b.vx - cvx) * nx + (b.vy - cvy) * ny;
  if (out < minOut) {
    b.vx += (minOut - out) * nx;
    b.vy += (minOut - out) * ny;
  }
  return { nx, ny, impact: Math.max(0, -vn) };
}

// Míč proti obdélníku (břevno).
function collideBallRect(b, x0, y0, x1, y1, e) {
  const cx = clamp(b.x, x0, x1), cy = clamp(b.y, y0, y1);
  const dx = b.x - cx, dy = b.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= b.r * b.r) return null;
  let nx, ny;
  if (d2 < 1e-6) {
    // střed míče uvnitř – vytlačit nejkratší cestou
    const l = b.x - x0, r = x1 - b.x, t = b.y - y0, bt = y1 - b.y;
    const m = Math.min(l, r, t, bt);
    if (m === t) { nx = 0; ny = -1; b.y = y0 - b.r; }
    else if (m === bt) { nx = 0; ny = 1; b.y = y1 + b.r; }
    else if (m === l) { nx = -1; ny = 0; b.x = x0 - b.r; }
    else { nx = 1; ny = 0; b.x = x1 + b.r; }
  } else {
    const d = Math.sqrt(d2);
    nx = dx / d;
    ny = dy / d;
    b.x = cx + nx * b.r;
    b.y = cy + ny * b.r;
  }
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= (1 + e) * vn * nx;
    b.vy -= (1 + e) * vn * ny;
  }
  return { nx, ny, impact: Math.max(0, -vn) };
}

const goalRect = (side) => (side === 0 ? [0, GOAL_W] : [W - GOAL_W, W]);

class Match {
  // setup: { format, level, teams: [..2], players: [{ char, team, ctrl, name }] }
  constructor(setup, onEvent, remoteIntent) {
    this.setup = setup;
    this.teams = setup.teams;
    this.onEvent = onEvent || (() => {});
    this.remoteIntent = remoteIntent || null;
    this.ball = new Ball();
    this.players = [];
    this.score = [0, 0];
    this.goalTeam = -1;  // kdo právě skóroval (do dalšího výkopu)
    this.celebrate = -1; // tým, který slaví
    this.locked = false; // po konci zápasu už se góly nepočítají
    this.playT = 0;      // jak dlouho se hraje od posledního výkopu
    this.touchAt = [-9, -9]; // kdy se míče naposledy dotkl každý tým
    this.lowT = 0;
    this.pinchT = 0;
    this._f = { x: 0, y: 0 };
    this.build();
    this.kickoff();
  }

  get level() {
    return AI_LEVELS[this.setup.level] ? this.setup.level : 'medium';
  }

  build() {
    const s = this.setup;
    const two = s.format === '2v2';
    const attX = two ? 410 : 300;
    const defX = 205;
    // V týmu jde dopředu nejdřív člověk, počítač brání.
    const roles = [];
    for (let team = 0; team < 2; team++) {
      s.players
        .map((sp, i) => ({ sp, i }))
        .filter((o) => o.sp.team === team)
        .sort((a, b) => (a.sp.ctrl === 'cpu') - (b.sp.ctrl === 'cpu') || a.i - b.i)
        .forEach((o, k) => { roles[o.i] = k === 0 ? 'attacker' : 'defender'; });
    }
    s.players.forEach((sp, i) => {
      const role = roles[i];
      const x = role === 'attacker' ? attX : defX;
      const p = new Player({ team: sp.team, x: sp.team === 0 ? x : W - x, look: charById(sp.char), role, ctrl: sp.ctrl, label: sp.name });
      if (sp.ctrl === 'cpu') this.makeCPU(p);
      else if (sp.ctrl === 'p1' || sp.ctrl === 'host') p.slot = 0;
      else p.remote = sp.ctrl;
      this.players.push(p);
    });
  }

  // Po zápase: vítězové doběhnou doprostřed a skáčou, poražení odejdou ke své brance.
  ceremonyIntent(p) {
    const o = this._ci || (this._ci = { left: false, right: false, jump: false, kick: false, move: 0 });
    const win = p.team === this.celebrate;
    const d = (p.cerX === undefined ? p.x : p.cerX) - p.x;
    o.move = Math.abs(d) < 8 ? 0 : clamp(d / 70, -1, 1) * (win ? 0.85 : 0.45);
    o.jump = win && Math.abs(d) < 26;
    o.kick = false;
    return o;
  }

  // Hráče převezme počítač (třeba když kamarád odejde ze hry).
  makeCPU(p) {
    p.brain = new AIBrain(p, this.level, p.role);
    p.speedMul = AI_LEVELS[this.level].speed;
    p.ctrl = 'cpu';
    p.slot = -1;
    p.remote = null;
    p.isHuman = false;
    p.label = 'CPU';
  }

  kickoff() {
    for (const p of this.players) {
      p.place(p.homeX);
      if (p.brain) p.brain.reset();
    }
    this.ball.reset(W / 2, KICKOFF_Y);
    this.goalTeam = -1;
    this.celebrate = -1;
  }

  release() {
    const b = this.ball;
    this.playT = 0;
    b.held = false;
    b.vx = rand(-30, 30);
    b.vy = 0;
  }

  // mode: 'play' (hraje se), 'freeze' (všichni stojí), 'celebrate' (oslava gólu / konec)
  step(dt, mode) {
    const b = this.ball;
    for (const p of this.players) {
      let it = IDLE;
      if (mode === 'play') {
        if (p.brain) it = p.brain.update(dt, this);
        else if (p.remote) it = this.remoteIntent ? this.remoteIntent(p.remote) : IDLE;
        else it = Input.intent(p.slot);
      } else if (mode === 'celebrate') {
        it = p.team === this.celebrate ? CHEER : IDLE;
      } else if (mode === 'ceremony') {
        it = this.ceremonyIntent(p);
      } else if (p.human) {
        Input.intent(p.slot); // zahodit kopy zmáčknuté během odpočtu
      } else if (p.remote && this.remoteIntent) {
        this.remoteIntent(p.remote);
      }
      p.mood = (mode === 'celebrate' || mode === 'ceremony') && this.celebrate >= 0 ? (p.team === this.celebrate ? 1 : -1) : 0;
      if (mode === 'play') p.superCharge = Math.min(1, p.superCharge + dt / PHYS.superCharge);
      this.movePlayer(p, it, dt);
    }
    this.collidePlayers();

    if (b.held) {
      b.rot += dt * 0.8;
      b.idle = 0;
      b.stale = 0;
      return;
    }
    this.playT += dt;
    const px = b.x, py = b.y;
    this.moveBall(dt);
    for (const p of this.players) {
      if (this.ballVsPlayer(p)) this.touchAt[p.team] = this.playT;
    }
    // Míč sevřený mezi soupeři (oba se ho dotýkají a drží ho dole) vyskočí
    // nad jejich hlavy a dopadne stranou, jinak by se hra zasekla.
    const low = b.y > GROUND_Y - 130;
    this.lowT = low ? this.lowT + dt : 0;
    if (low && this.lowT > 0.6 && this.playT - this.touchAt[0] < 0.3 && this.playT - this.touchAt[1] < 0.3) {
      this.pinchT += dt;
      if (this.pinchT > 0.6) {
        // hráče u míče odstrčit od sebe, aby mezi hlavami vznikla mezera
        for (const p of this.players) {
          if (Math.abs(p.x - b.x) < 110 && p.onGround) p.vx = (p.x < b.x ? -1 : 1) * 380;
        }
        b.vy = -700;
        b.vx = rand(-70, 70);
        this.pinchT = 0;
        this.lowT = 0;
      }
    } else if (!low) {
      this.pinchT = 0;
    }
    this.settleBall();
    if (this.goalTeam < 0 && !this.locked) this.checkGoal();

    // Míč, který se nehýbe, i když by měl padat (zaklíněný mezi hlavou, stěnou
    // a břevnem), vyskočí zpátky do hry.
    const moved = Math.abs(b.x - px) + Math.abs(b.y - py);
    const still = moved < 0.25;
    b.stuck = still && b.y + b.r < GROUND_Y - 2 ? (b.stuck || 0) + dt : 0;
    if (b.stuck > 0.4) {
      b.vy = -560;
      b.vx = (b.x < W / 2 ? 1 : -1) * 280;
      b.stuck = 0;
    }
    b.idle = still ? b.idle + dt : 0;
    // Tlačenice: míč se dlouho drží na malém kousku hřiště.
    if (Math.abs(b.x - b.anchorX) > 150) {
      b.anchorX = b.x;
      b.stale = 0;
    } else {
      b.stale += dt;
    }
  }

  movePlayer(p, it, dt) {
    const input = typeof it.move === 'number' ? clamp(it.move, -1, 1) : (it.right ? 1 : 0) - (it.left ? 1 : 0);
    const max = PHYS.moveSpeed * p.speedMul;
    p.vx = approach(p.vx, input * max, (p.onGround ? PHYS.accelGround : PHYS.accelAir) * dt);

    if (it.jump && p.onGround) {
      p.vy = -PHYS.jumpV;
      p.onGround = false;
      this.onEvent('jump', { human: p.isHuman });
    }
    if (it.super && p.superCharge >= 1 && p.kickT < 0) {
      // superstřela: švih nohou, další zásah míče je superstřela
      p.superCharge = 0;
      p.superKick = true;
      p.kickT = 0;
      p.kickCd = 0;
      p.kickHit = false;
      this.onEvent('superswing', { idx: this.players.indexOf(p) });
    } else if (it.kick && p.kickT < 0 && p.kickCd <= 0) {
      p.kickT = 0;
      p.kickHit = false;
      this.onEvent('swing', p);
    }
    if (p.kickT >= 0) {
      p.kickT += dt;
      if (p.kickT >= PHYS.kickDur) {
        p.kickT = -1;
        p.kickCd = PHYS.kickCooldown;
        // superstřela minula míč – nabití nepropadne
        if (p.superKick) p.superCharge = 1;
        p.superKick = false;
      }
    } else if (p.kickCd > 0) {
      p.kickCd -= dt;
    }

    p.prevFeet = p.y + p.R + PHYS.footH;
    p.vy += PHYS.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.onGround = false;
    this.playerWorld(p);
    if (p.onGround) p.runPhase += p.vx * p.dir * dt * 0.05;

    p.blinkT -= dt;
    if (p.blinkT <= 0) {
      p.blink = 0.13;
      p.blinkT = rand(2, 5);
    }
    if (p.blink > 0) p.blink -= dt;
  }

  playerWorld(p) {
    const R = p.R, foot = PHYS.footH;
    this.clampPlayer(p);
    for (let side = 0; side < 2; side++) {
      const [x0, x1] = goalRect(side);
      // na břevno se dá doskočit
      const feet = p.y + R + foot;
      if (p.vy >= 0 && p.x > x0 - 8 && p.x < x1 + 8 && p.prevFeet <= BAR_Y + 1 && feet >= BAR_Y) {
        p.y = BAR_Y - R - foot;
        p.vy = 0;
        p.onGround = true;
      }
      // hlava narazí do břevna zespodu nebo z boku
      const cx = clamp(p.x, x0, x1), cy = clamp(p.y, BAR_Y, BAR_Y + BAR_T);
      const dx = p.x - cx, dy = p.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < R * R && d2 > 1e-6) {
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, o = R - d;
        p.x += nx * o;
        p.y += ny * o;
        if (ny > 0.5 && p.vy < 0) p.vy = 0;
        if (ny < -0.5 && p.vy > 0) { p.vy = 0; p.onGround = true; }
        if (Math.abs(nx) > 0.5 && p.vx * nx < 0) p.vx = 0;
      }
    }
  }

  clampPlayer(p) {
    const stand = GROUND_Y - PHYS.footH - p.R;
    if (p.y >= stand) {
      p.y = stand;
      if (p.vy > 0) p.vy = 0;
      p.onGround = true;
    }
    if (p.x < p.R) {
      p.x = p.R;
      if (p.vx < 0) p.vx = 0;
    } else if (p.x > W - p.R) {
      p.x = W - p.R;
      if (p.vx > 0) p.vx = 0;
    }
  }

  collidePlayers() {
    const ps = this.players;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const a = ps[i], c = ps[j];
          let dx = c.x - a.x, dy = c.y - a.y;
          let d = Math.hypot(dx, dy);
          const min = a.R + c.R - 6;
          if (d >= min) continue;
          if (d < 0.01) { dx = a.team === 0 ? 1 : -1; dy = 0; d = 1; }
          const nx = dx / d, ny = dy / d, o = min - d;
          let wa = 0.5, wc = 0.5;
          if (a.onGround && !c.onGround) { wa = 0.1; wc = 0.9; }
          else if (c.onGround && !a.onGround) { wa = 0.9; wc = 0.1; }
          a.x -= nx * o * wa; a.y -= ny * o * wa;
          c.x += nx * o * wc; c.y += ny * o * wc;
          const rv = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
          if (rv < 0) {
            const j2 = rv * 0.5;
            a.vx += j2 * nx; a.vy += j2 * ny;
            c.vx -= j2 * nx; c.vy -= j2 * ny;
          }
          // stání na hlavě jiného hráče
          if (ny > 0.6) { if (a.vy > c.vy) a.vy = c.vy; a.onGround = true; }
          else if (ny < -0.6) { if (c.vy > a.vy) c.vy = a.vy; c.onGround = true; }
          this.clampPlayer(a);
          this.clampPlayer(c);
        }
      }
    }
  }

  moveBall(dt) {
    const b = this.ball;
    b.vy += PHYS.ballGravity * dt;
    const drag = 1 - PHYS.airDrag * dt;
    b.vx *= drag;
    b.vy *= drag;
    if (b.superT > 0) b.superT = Math.max(0, b.superT - dt);
    const cap = b.superT > 0 ? PHYS.superSpeed * 1.05 : PHYS.ballMaxSpeed;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > cap) {
      const k = cap / sp;
      b.vx *= k;
      b.vy *= k;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.rot += (b.vx / b.r) * dt;
    this.ballWorld(dt);
  }

  ballWorld(dt) {
    const b = this.ball, r = b.r;
    if (b.y + r > GROUND_Y) {
      b.y = GROUND_Y - r;
      if (b.vy > 0) {
        const imp = b.vy;
        b.vy = imp > 90 ? -imp * PHYS.ballBounce : 0;
        if (imp > 90) b.vx *= PHYS.groundGrip;
        if (imp > 240) this.onEvent('bounce', { x: b.x, impact: imp });
      }
      b.vx *= 1 - PHYS.rollFriction * dt;
    }
    if (b.y - r < 0) {
      b.y = r;
      if (b.vy < 0) b.vy = -b.vy * 0.7;
    }
    const inNet = b.y > BAR_Y + BAR_T; // pod břevnem u kraje = zadní síť
    if (b.x - r < 0) {
      b.x = r;
      if (b.vx < 0) {
        if (inNet && b.vx < -90) this.onEvent('net', { side: 0, y: b.y, impact: -b.vx });
        b.vx = -b.vx * (inNet ? 0.2 : PHYS.wallBounce);
      }
    } else if (b.x + r > W) {
      b.x = W - r;
      if (b.vx > 0) {
        if (inNet && b.vx > 90) this.onEvent('net', { side: 1, y: b.y, impact: b.vx });
        b.vx = -b.vx * (inNet ? 0.2 : PHYS.wallBounce);
      }
    }
    for (let side = 0; side < 2; side++) {
      const [x0, x1] = goalRect(side);
      const hit = collideBallRect(b, x0, BAR_Y, x1, BAR_Y + BAR_T, 0.55);
      if (!hit) continue;
      if (hit.impact > 160) this.onEvent('post', { x: b.x, y: b.y, impact: hit.impact });
      // míč nesmí zůstat ležet na střeše branky
      if (hit.ny < -0.7 && Math.abs(b.vx) < 140) b.vx += (side === 0 ? 1 : -1) * 700 * dt;
    }
  }

  // Vrací true, když se hráč míče dotkl.
  ballVsPlayer(p) {
    const b = this.ball;
    let touch = false;
    // superstřela soupeře srazí a letí dál
    if (b.superT > 0 && b.superBy >= 0 && this.players[b.superBy] && this.players[b.superBy].team !== p.team) {
      for (const [cx, cy, cr] of [[p.x, p.y, p.R], [p.x - p.dir, p.y + p.R + 18, PHYS.bodyR]]) {
        const dx = p.x - b.x, rr = cr + b.r;
        if ((b.x - cx) ** 2 + (b.y - cy) ** 2 >= rr * rr) continue;
        const dir = Math.sign(b.vx) || (dx > 0 ? 1 : -1);
        p.vx = dir * 560;
        p.vy = -460;
        p.onGround = false;
        p.x += dir * 6;
        b.vx *= 0.72;
        b.vy *= 0.72;
        b.superT = 0;
        this.onEvent('knock', { x: p.x, y: p.y, idx: this.players.indexOf(p) });
        return true;
      }
    }
    // 1) kop – kopačka ve švihu
    if (p.kickT >= 0 && !p.kickHit && p.kickT / PHYS.kickDur <= 0.55) {
      const s = p.kickS();
      const f = p.footAt(s, this._f);
      const dx = b.x - f.x, dy = b.y - f.y, rr = PHYS.footR + 6 + b.r;
      if (dx * dx + dy * dy < rr * rr) {
        this.doKick(p, s, f);
        touch = true;
      }
    }
    // 2) hlava
    const s0 = b.speed;
    const hit = collideBallCircle(b, p.x, p.y, p.R, p.vx, p.vy, PHYS.headBounce, PHYS.headMinOut);
    if (hit) {
      b.lastTouch = p;
      touch = true;
      if (hit.ny < -0.25) b.vx += p.dir * PHYS.headerPush;
      // Míč sevřený mezi dvěma hlavami nesmí nabírat rychlost donekonečna.
      const cap = Math.max(s0, PHYS.headMaxSpeed), s1 = b.speed;
      if (s1 > cap) {
        b.vx *= cap / s1;
        b.vy *= cap / s1;
      }
      if (hit.impact > 140) this.onEvent('head', { x: b.x - hit.nx * b.r, y: b.y - hit.ny * b.r, impact: hit.impact });
    }
    // 3) tělo a kopačka v klidu jsou pevné překážky (vedení míče)
    if (collideBallCircle(b, p.x - p.dir, p.y + p.R + 18, PHYS.bodyR, p.vx, p.vy, 0.4, 50)) {
      b.lastTouch = p;
      touch = true;
    }
    if (p.kickT < 0) {
      const f = p.footAt(0, this._f);
      if (collideBallCircle(b, f.x, f.y, PHYS.footR, p.vx, p.vy, 0.45, 60)) {
        b.lastTouch = p;
        touch = true;
      }
    }
    return touch;
  }

  doKick(p, s, f) {
    const b = this.ball;
    p.superCharge = Math.min(1, p.superCharge + 0.06);
    if (p.superKick) {
      p.superKick = false;
      const el = ((8 + 14 * s) * Math.PI) / 180;
      b.vx = p.dir * Math.cos(el) * PHYS.superSpeed;
      b.vy = -Math.sin(el) * PHYS.superSpeed;
      b.superT = 1.4;
      b.superBy = this.players.indexOf(p);
      p.kickHit = true;
      b.lastTouch = p;
      this.onEvent('super', { x: b.x, y: b.y, dir: p.dir, idx: b.superBy });
      return;
    }
    let deg = 24 + 34 * s; // pozdní zásah = vyšší lob
    // Soupeř stojí těsně před míčem: kop ho přeloží obloučkem (jinak by se míč
    // jen odrážel mezi dvěma hráči).
    const close = this.players.some((q) => q.team !== p.team && (q.x - p.x) * p.dir > 0
      && (q.x - p.x) * p.dir < 2 * p.R + 45 && Math.abs(q.y - p.y) < 70);
    if (close) deg = Math.max(deg, 63);
    const el = (deg * Math.PI) / 180;
    const run = Math.max(0, p.vx * p.dir);
    const power = PHYS.kickSpeed * rand(0.94, 1.02) + run * 0.3;
    b.vx = p.dir * Math.cos(el) * power;
    b.vy = -Math.sin(el) * power + Math.min(0, p.vy) * 0.25;
    // míč vysunout před kopačku
    const dx = b.x - f.x, dy = b.y - f.y, d = Math.hypot(dx, dy) || 1, rr = PHYS.footR + b.r + 1;
    if (d < rr) {
      b.x = f.x + (dx / d) * rr;
      b.y = f.y + (dy / d) * rr;
    }
    p.kickHit = true;
    b.lastTouch = p;
    this.onEvent('kick', { x: b.x, y: b.y, dir: p.dir, power: clamp(power / PHYS.kickSpeed, 0.6, 1.2) });
  }

  // Míč zaklíněný mezi hráčem a trávníkem/stěnou – ustoupí hráč.
  settleBall() {
    const b = this.ball, r = b.r;
    if (b.y + r > GROUND_Y) b.y = GROUND_Y - r;
    if (b.y < r) b.y = r;
    if (b.x < r) b.x = r;
    else if (b.x > W - r) b.x = W - r;
    for (const p of this.players) {
      // hlava, potom tělo
      for (let part = 0; part < 2; part++) {
        const cx = part ? p.x - p.dir : p.x, cy = part ? p.y + p.R + 18 : p.y;
        const rr = (part ? PHYS.bodyR : p.R) + r - 0.5;
        const dx = b.x - cx, dy = b.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr) continue;
        const d = Math.sqrt(d2) || 0.001, o = rr - d, nx = dx / d, ny = dy / d;
        p.x -= nx * o;
        p.y -= ny * o;
        if (ny > 0.3) {
        // hráč stojí na míči – míč vyklouzne do strany
        if (p.vy > 0) p.vy = 0;
        p.onGround = true;
          b.vx += (Math.abs(dx) > 2 ? Math.sign(dx) : Math.random() < 0.5 ? -1 : 1) * 40;
        }
        this.clampPlayer(p);
      }
    }
  }

  checkGoal() {
    const b = this.ball;
    if (b.y <= BAR_Y) return;
    let team = -1;
    if (b.x + b.r < GOAL_W) team = 1; // celý míč za čarou levé branky – skóruje pravý tým
    else if (b.x - b.r > W - GOAL_W) team = 0;
    if (team < 0) return;
    this.goalTeam = team;
    this.celebrate = team;
    this.score[team]++;
    const s = b.lastTouch;
    this.onEvent('goal', { team, scorer: s, scorerIdx: s ? this.players.indexOf(s) : -1, own: !!s && s.team !== team });
  }
}
