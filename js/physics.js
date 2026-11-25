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
    this.lastHow = ''; // čím se ho naposledy dotkl: kick, head, super, body
    this.basketT = 0;   // míč je basketbalový (Marsalova trojka)
    this.basketSide = -1; // brána (tým), na kterou trojka letí
    this.carryBy = -1;  // Marsal drží míč nad hlavou před hodem
    this.carryT = 0;
    this.swished = false;
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
    this.F = PHYS.footH * ((o.look && o.look.tall) || 1); // tělo a nohy (vysoký hráč má delší nohy)
    this.speedMul = 1;
    this.brain = null;
    this.blinkT = rand(1, 4);
    this.blink = 0;
    this.runPhase = 0;
    this.superCharge = 0; // 0..1, při 1 lze použít superschopnost
    this.superKick = false;
    this.power = powerOf(o.look && o.look.id);
    this.boostT = 0;      // VO2max: zrychlení
    this.pengT = 0;       // proměna v tučňáka
    this.primeT = 0;      // JENDA PRIME
    this.place(o.x);
  }

  get standY() {
    return GROUND_Y - this.F - this.R;
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
    this.stunT = 0; // omámení po zásahu superstřelou
    this.boostT = 0;
    this.pengT = 0;
    this.primeT = 0;
    this.shootT = 0;  // basketbalový hod (ruce nahoře)
    this.celeb = '';  // oslava gólu: 'slide' (po kolenou) nebo 'plane' (letadlo)
    this.celebT = 0;
    this.celebDir = 0;
    this.kneel = 0;
    this.plane = 0;
    this.face = 0;    // otočení obličeje při oslavě (0 = podle týmu)
    this.spin = 0;  // otočení při letu vzduchem
    this.knockDir = 0;
  }

  // Průběh švihu 0 → 1 → 0.
  kickS() {
    if (this.kickT < 0) return 0;
    const u = this.kickT / PHYS.kickDur;
    return u < 0.45 ? easeOutQuad(u / 0.45) : 1 - easeInOutQuad((u - 0.45) / 0.55);
  }

  // Poloha kopačky: kvadratická křivka od země dopředu a nahoru.
  footAt(s, out) {
    const R = this.R, F = this.F, i = 1 - s;
    const lx = i * i * 8 * PS + 2 * i * s * (R + 22 * PS) + s * s * (R + 18 * PS);
    const ly = i * i * (R + F - 12 * PS) + 2 * i * s * (R + F - 4 * PS) + s * s * (R + F - 50 * PS);
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
    this.blocks = [0, 0]; // jak dlouho je ještě zablokovaná brána týmu 0 / 1
    this.blockKind = ['', '']; // čím: 'cheese' (hermelín) nebo 'ice' (led)
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
    const attX = two ? 430 : 310;
    const defX = 230;
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
    this.blocks[0] = this.blocks[1] = 0;
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
      if (p.boostT > 0) p.boostT = Math.max(0, p.boostT - dt);
      if (p.pengT > 0) p.pengT = Math.max(0, p.pengT - dt);
      if (p.primeT > 0) {
        p.primeT = Math.max(0, p.primeT - dt);
        if (p.primeT === 0) this.onEvent('unprime', { idx: this.players.indexOf(p) });
      }
      this.movePlayer(p, it, dt);
    }
    for (let t = 0; t < 2; t++) {
      if (this.blocks[t] > 0) {
        this.blocks[t] = Math.max(0, this.blocks[t] - dt);
        if (this.blocks[t] === 0) this.onEvent('unblock', { team: t, kind: this.blockKind[t] });
      }
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
      if (b.carryBy >= 0) break;
      // střelec se trojky nedotkne; co projde košem, propadne do brány
      if (b.basketT > 0 && (b.lastTouch === p || b.swished)) continue;
      if (this.ballVsPlayer(p)) {
        this.touchAt[p.team] = this.playT;
        if (b.basketT > 0) {
          b.basketT = 0; // obránce trojku vyrazil
          this.onEvent('unbasket', { x: b.x, y: b.y });
        }
      }
    }
    // Míč sevřený mezi soupeři (oba se ho dotýkají a drží ho dole) vyskočí
    // nad jejich hlavy a dopadne stranou, jinak by se hra zasekla.
    const low = b.y > GROUND_Y - 130 * PS;
    this.lowT = low ? this.lowT + dt : 0;
    if (low && this.lowT > 0.6 && this.playT - this.touchAt[0] < 0.3 && this.playT - this.touchAt[1] < 0.3) {
      this.pinchT += dt;
      if (this.pinchT > 0.6) {
        // hráče u míče odstrčit od sebe, aby mezi hlavami vznikla mezera
        for (const p of this.players) {
          if (Math.abs(p.x - b.x) < 110 * PS && p.onGround) p.vx = (p.x < b.x ? -1 : 1) * 380;
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
    b.stuck = still && b.carryBy < 0 && b.y + b.r < GROUND_Y - 2 ? (b.stuck || 0) + dt : 0;
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
    if (p.shootT > 0) p.shootT = Math.max(0, p.shootT - dt);
    if (p.celeb) {
      // oslava gólu
      p.celebT += dt;
      it = IDLE;
      const sd = p.celebDir;
      if (p.celeb === 'slide') {
        if (p.celebT < 0.3) p.vx = approach(p.vx, sd * 640, 4200 * dt);
        else {
          p.kneel = Math.min(1, p.kneel + dt * 9);
          p.vx = approach(p.vx, 0, 430 * dt);
        }
      } else {
        p.plane = Math.min(1, p.plane + dt * 5);
        p.vx = approach(p.vx, p.celebT < 1.7 ? sd * 470 : 0, 2200 * dt);
      }
    }
    const stunned = p.stunT > 0;
    if (stunned) {
      // odstřelený hráč neovládá nic: ve vzduchu letí a točí se, na zemi se motá
      p.stunT = Math.max(0, p.stunT - dt);
      it = IDLE;
      if (!p.onGround) p.spin += p.knockDir * 13 * dt;
    }
    const input = typeof it.move === 'number' ? clamp(it.move, -1, 1) : (it.right ? 1 : 0) - (it.left ? 1 : 0);
    const boost = (p.boostT > 0 ? BOOST_MUL : 1) * (p.primeT > 0 ? PRIME_SPEED : 1);
    const max = PHYS.moveSpeed * p.speedMul * boost;
    if (!stunned && !p.celeb) p.vx = approach(p.vx, input * max, (p.onGround ? PHYS.accelGround : PHYS.accelAir) * boost * dt);
    else if (p.onGround) p.vx = approach(p.vx, 0, 1700 * dt);

    if (it.jump && p.onGround) {
      p.vy = -PHYS.jumpV * (p.primeT > 0 ? PRIME_JUMP : 1);
      p.onGround = false;
      this.onEvent('jump', { human: p.isHuman });
    }
    if (it.super && p.superCharge >= 1 && p.power !== 'shot' && !stunned) {
      this.usePower(p);
    } else if (it.super && p.superCharge >= 1 && p.kickT < 0) {
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

    p.prevFeet = p.y + p.R + p.F;
    p.vy += PHYS.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const wasAir = !p.onGround;
    p.onGround = false;
    this.playerWorld(p);
    if (p.onGround) p.runPhase += p.vx * p.dir * dt * 0.05;
    if (stunned && wasAir && p.onGround && p.spin !== 0) {
      p.spin = 0;
      this.onEvent('thud', { x: p.x, y: GROUND_Y, idx: this.players.indexOf(p) });
    }

    p.blinkT -= dt;
    if (p.blinkT <= 0) {
      p.blink = 0.13;
      p.blinkT = rand(2, 5);
    }
    if (p.blink > 0) p.blink -= dt;
  }

  // Superschopnost postavy (kromě superstřely, ta se spouští švihem).
  usePower(p) {
    const idx = this.players.indexOf(p);
    const b = this.ball;
    if (p.power === 'basket') {
      // jen u míče: Marsal ho chytí nad hlavu a hodí trojku
      if (b.held || b.carryBy >= 0 || Math.abs(b.x - p.x) > BASKET_REACH || b.y < GROUND_Y - 320) return false;
      p.superCharge = 0;
      b.carryBy = idx;
      b.carryT = 0.34;
      b.basketT = 4;
      b.basketSide = 1 - p.team;
      b.swished = false;
      b.superT = 0;
      p.shootT = 0.75;
      p.kickT = -1;
      if (p.onGround) {
        p.vy = -PHYS.jumpV * 0.72;
        p.onGround = false;
      }
      this.onEvent('power', { idx, kind: 'basket', team: p.team });
      return true;
    }
    p.superCharge = 0;
    if (p.power === 'cheese' || p.power === 'penguin') {
      const t = p.team;
      this.blocks[t] = BLOCK_TIME;
      this.blockKind[t] = p.power === 'cheese' ? 'cheese' : 'ice';
      if (p.power === 'penguin') p.pengT = PENGUIN_TIME;
      this.clearGoal(t);
    } else if (p.power === 'vo2') {
      p.boostT = BOOST_TIME;
    } else if (p.power === 'prime') {
      p.primeT = PRIME_TIME;
    }
    this.onEvent('power', { idx, kind: p.power, team: p.team });
    return true;
  }

  // Trojka: míč letí vysokým obloukem do koše nad bránou soupeře a propadne do brány.
  launchBasket() {
    const b = this.ball, p = this.players[b.carryBy];
    b.carryBy = -1;
    const t = b.basketSide;
    const hx = t === 0 ? GOAL_W * 0.5 : W - GOAL_W * 0.5, hy = BASKET_Y;
    const g = PHYS.ballGravity, apex = 40;
    const up = Math.max(30, b.y - apex), down = Math.max(30, hy - apex);
    const t1 = Math.sqrt((2 * up) / g), t2 = Math.sqrt((2 * down) / g);
    b.vy = -Math.sqrt(2 * g * up);
    b.vx = (hx - b.x) / (t1 + t2);
    b.lastTouch = p || b.lastTouch;
    b.lastHow = 'basket';
    this.onEvent('basketshot', { x: b.x, y: b.y });
  }

  // Zablokovaná brána: míč i hráči z ní musí ven.
  clearGoal(t) {
    const b = this.ball, line = t === 0 ? GOAL_W : W - GOAL_W, s = t === 0 ? 1 : -1;
    if (b.y + b.r > BAR_Y && (b.x - line) * s < b.r) {
      b.x = line + s * (b.r + 2);
      b.vx = s * Math.max(Math.abs(b.vx) * 0.5, 200);
    }
  }

  // Hráč nesmí do zablokované brány (pod břevnem).
  blockPlayer(p) {
    for (let t = 0; t < 2; t++) {
      if (this.blocks[t] <= 0 || p.y + p.R < BAR_Y) continue;
      const line = t === 0 ? GOAL_W : W - GOAL_W, s = t === 0 ? 1 : -1;
      const min = p.R * 0.7;
      if ((p.x - line) * s < min) {
        p.x = line + s * min;
        if (p.vx * s < 0) p.vx = 0;
      }
    }
  }

  playerWorld(p) {
    const R = p.R, foot = p.F;
    this.clampPlayer(p);
    this.blockPlayer(p);
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
    const stand = GROUND_Y - p.F - p.R;
    if (p.y >= stand) {
      p.y = stand;
      if (p.vy > 0) p.vy = 0;
      p.onGround = true;
    }
    // odstřelený hráč se od stěny odrazí
    const wall = p.stunT > 0 ? -0.35 : 0;
    if (p.x < p.R) {
      p.x = p.R;
      if (p.vx < 0) p.vx *= wall;
    } else if (p.x > W - p.R) {
      p.x = W - p.R;
      if (p.vx > 0) p.vx *= wall;
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
          const min = a.R + c.R - 6 * PS;
          if (d >= min) continue;
          if (d < 0.01) { dx = a.team === 0 ? 1 : -1; dy = 0; d = 1; }
          const nx = dx / d, ny = dy / d, o = min - d;
          let wa = 0.5, wc = 0.5;
          if (a.onGround && !c.onGround) { wa = 0.1; wc = 0.9; }
          else if (c.onGround && !a.onGround) { wa = 0.9; wc = 0.1; }
          // JENDA PRIME soupeře odstrčí
          if (a.primeT > 0 && !(c.primeT > 0)) { wa = 0.1; wc = 0.9; }
          else if (c.primeT > 0 && !(a.primeT > 0)) { wa = 0.9; wc = 0.1; }
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
    if (b.carryBy >= 0) {
      // Marsal drží míč nad hlavou
      const p = this.players[b.carryBy];
      if (!p) {
        b.carryBy = -1;
      } else {
        b.x = clamp(p.x + p.dir * 8, b.r, W - b.r);
        b.y = Math.max(b.r, p.y - p.R - b.r - 8);
        b.vx = b.vy = 0;
        b.rot += dt * 6;
        b.carryT -= dt;
        if (b.carryT <= 0) this.launchBasket();
        return;
      }
    }
    if (b.basketT > 0) b.basketT = Math.max(0, b.basketT - dt);
    const py0 = b.y;
    b.vy += PHYS.ballGravity * dt;
    if (b.basketT <= 0) {
      const drag = 1 - PHYS.airDrag * dt;
      b.vx *= drag;
      b.vy *= drag;
    }
    if (b.superT > 0) b.superT = Math.max(0, b.superT - dt);
    const cap = b.basketT > 0 ? 4000 : b.superT > 0 ? PHYS.superSpeed * 1.05 : PHYS.ballMaxSpeed;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > cap) {
      const k = cap / sp;
      b.vx *= k;
      b.vy *= k;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.rot += (b.vx / b.r) * dt;
    // průlet košem
    if (b.basketT > 0 && !b.swished && py0 < BASKET_Y && b.y >= BASKET_Y) {
      const hx = b.basketSide === 0 ? GOAL_W * 0.5 : W - GOAL_W * 0.5;
      if (Math.abs(b.x - hx) < 36) {
        b.swished = true;
        b.vx *= 0.2;
        this.onEvent('swish', { x: hx, y: BASKET_Y, team: b.basketSide });
      }
    }
    this.ballWorld(dt);
  }

  ballWorld(dt) {
    const b = this.ball, r = b.r;
    if (b.y + r > GROUND_Y) {
      b.y = GROUND_Y - r;
      if (b.vy > 0) {
        const imp = b.vy;
        if (b.basketT > 0) {
          b.basketT = 0;
          this.onEvent('unbasket', { x: b.x, y: b.y });
        }
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
    // zablokovaná brána (hermelín, led) je pevná stěna na brankové čáře
    for (let t = 0; t < 2; t++) {
      if (this.blocks[t] <= 0 || b.y + r <= BAR_Y) continue;
      const line = t === 0 ? GOAL_W : W - GOAL_W, s = t === 0 ? 1 : -1;
      if ((b.x - line) * s < r) {
        b.x = line + s * r;
        if (b.vx * s < 0) {
          const imp = Math.abs(b.vx);
          b.vx = s * imp * 0.62;
          if (imp > 150) this.onEvent('blockhit', { team: t, x: line, y: b.y, impact: imp, kind: this.blockKind[t] });
        }
      }
    }
    for (let side = 0; side < 2; side++) {
      if (b.basketT > 0 && side === b.basketSide) continue; // trojka propadne střechou do brány
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
      for (const [cx, cy, cr] of [[p.x, p.y, p.R], [p.x - p.dir, p.y + p.R + PHYS.bodyOff, PHYS.bodyR]]) {
        const dx = p.x - b.x, rr = cr + b.r;
        if ((b.x - cx) ** 2 + (b.y - cy) ** 2 >= rr * rr) continue;
        if (p.stunT > 0) break; // už letí
        const dir = Math.sign(b.vx) || (dx > 0 ? 1 : -1);
        if (p.primeT > 0) {
          // JENDA PRIME superstřelu ustojí, jen ho to posune
          p.vx = dir * 260;
          b.vx *= -0.45;
          b.vy *= 0.5;
          b.superT = 0;
          this.onEvent('head', { x: b.x, y: b.y, impact: 600 });
          return true;
        }
        // odstřelit pořádně dozadu a nahoru, hráč se ve vzduchu točí
        p.vx = dir * PHYS.knockVX;
        p.vy = -PHYS.knockVY;
        p.onGround = false;
        p.x += dir * 8;
        p.y -= 6;
        p.stunT = PHYS.stunTime;
        p.knockDir = dir;
        p.kickT = -1;
        p.superKick = false;
        // míč letí dál a může odstřelit i dalšího
        b.vx *= 0.86;
        b.vy *= 0.86;
        this.onEvent('knock', { x: p.x, y: p.y, idx: this.players.indexOf(p), dir });
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
      b.lastHow = 'head';
      touch = true;
      if (hit.ny < -0.25) b.vx += p.dir * PHYS.headerPush * (p.primeT > 0 ? 3 : 1);
      // Míč sevřený mezi dvěma hlavami nesmí nabírat rychlost donekonečna.
      const cap = Math.max(s0, PHYS.headMaxSpeed * (p.primeT > 0 ? 1.3 : 1)), s1 = b.speed;
      if (s1 > cap) {
        b.vx *= cap / s1;
        b.vy *= cap / s1;
      }
      if (hit.impact > 140) this.onEvent('head', { x: b.x - hit.nx * b.r, y: b.y - hit.ny * b.r, impact: hit.impact });
    }
    // 3) tělo a kopačka v klidu jsou pevné překážky (vedení míče)
    if (collideBallCircle(b, p.x - p.dir, p.y + p.R + PHYS.bodyOff, PHYS.bodyR, p.vx, p.vy, 0.4, 50)) {
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
      b.lastHow = 'super';
      this.onEvent('super', { x: b.x, y: b.y, dir: p.dir, idx: b.superBy });
      return;
    }
    let deg = 24 + 34 * s; // pozdní zásah = vyšší lob
    // Soupeř stojí těsně před míčem: kop ho přeloží obloučkem (jinak by se míč
    // jen odrážel mezi dvěma hráči).
    const close = this.players.some((q) => q.team !== p.team && (q.x - p.x) * p.dir > 0
      && (q.x - p.x) * p.dir < 2 * p.R + 45 * PS && Math.abs(q.y - p.y) < 70 * PS);
    if (close) deg = Math.max(deg, 63);
    const el = (deg * Math.PI) / 180;
    const run = Math.max(0, p.vx * p.dir);
    const power = (PHYS.kickSpeed * rand(0.94, 1.02) + run * 0.3) * (p.primeT > 0 ? PRIME_KICK : 1);
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
    b.lastHow = 'kick';
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
        const cx = part ? p.x - p.dir : p.x, cy = part ? p.y + p.R + PHYS.bodyOff : p.y;
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
    if (team < 0 || this.blocks[1 - team] > 0) return;
    this.goalTeam = team;
    this.celebrate = team;
    this.score[team]++;
    const s = b.lastTouch;
    if (s && s.team === team) {
      s.celeb = Math.random() < 0.75 ? 'slide' : 'plane';
      s.celebT = 0;
      s.celebDir = -s.dir; // k vlastním fanouškům
      s.face = s.celebDir;
    }
    this.onEvent('goal', { team, scorer: s, scorerIdx: s ? this.players.indexOf(s) : -1, own: !!s && s.team !== team, how: b.lastHow });
  }
}
