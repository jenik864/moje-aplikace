'use strict';
/*
 * Počítačový hráč. Každých pár setin sekundy se rozhodne, kam běžet,
 * jestli vyskočit na hlavičku a jestli kopnout. Obtížnost mění rychlost
 * reakce, běhu a přesnost.
 */

const PDT = 1 / 60;
const _pred = [];

// Odhad dráhy míče (bez hráčů) na `horizon` sekund dopředu.
function predictBall(b, horizon, mods) {
  const M = mods || arenaMods('stadium'), wind = M.wind * (M.windDir || 0);
  let x = b.x, y = b.y, vx = b.vx, vy = b.vy;
  const r = b.r, n = Math.round(horizon / PDT);
  for (let i = 0; i < n; i++) {
    if (!b.held) {
      vy += PHYS.ballGravity * M.ballGrav * PDT;
      vx += wind * PDT;
      x += vx * PDT;
      y += vy * PDT;
      if (y + r > GROUND_Y) {
        y = GROUND_Y - r;
        if (vy > 90) vx *= Math.min(0.99, PHYS.groundGrip * M.grip);
        vy = vy > 90 ? -vy * PHYS.ballBounce * M.bounce : 0;
      }
      if (y - r < 0) { y = r; vy = -vy * 0.7; }
      if (x - r < 0) { x = r; vx = -vx * PHYS.wallBounce; }
      else if (x + r > W) { x = W - r; vx = -vx * PHYS.wallBounce; }
    }
    const q = _pred[i] || (_pred[i] = { x: 0, y: 0 });
    q.x = x;
    q.y = y;
  }
  _pred.length = n;
  return _pred;
}

function predAt(pred, t) {
  return pred[clamp(Math.round(t / PDT) - 1, 0, pred.length - 1)];
}

// Jak daleko to má hráč k míči (stát na špatné straně stojí navíc).
function reachCost(q, b) {
  const wrong = (b.x - q.x) * q.dir < -q.R * 0.4;
  return Math.abs(b.x - q.x) + (wrong ? 260 : 0);
}
// Totéž pro rozhodnutí ve dvojici: obránce se do souboje hrne méně.
function engageCost(q, b) {
  return reachCost(q, b) + (q.role === 'defender' ? 70 : 0);
}

class AIBrain {
  constructor(p, level, role) {
    this.p = p;
    this.L = AI_LEVELS[level] || AI_LEVELS.medium;
    this.role = role;
    this.out = { left: false, right: false, jump: false, kick: false, super: false };
    this.reset();
  }

  reset() {
    this.t = rand(0.1, 0.3);
    this.noise = 0;
    this.noiseT = 0;
    this.disciplined = Math.random() < this.L.defend;
    this.out.left = this.out.right = this.out.jump = this.out.kick = false;
  }

  update(dt, m) {
    this.out.kick = false; // kop je jen jednorázový stisk
    this.out.super = false;
    this.t -= dt;
    this.noiseT -= dt;
    if (this.noiseT <= 0) {
      this.noise = rand(-1, 1) * this.L.err;
      this.noiseT = rand(0.5, 1.2);
      this.disciplined = Math.random() < this.L.defend;
    }
    if (this.t <= 0) {
      this.t = this.L.think * rand(0.75, 1.25);
      this.think(m);
    }
    return this.out;
  }

  think(m) {
    const p = this.p, b = m.ball, L = this.L, dir = p.dir, R = p.R, br = b.r;
    const speed = PHYS.moveSpeed * p.speedMul * m.mods.speed;
    m.mods.windDir = m.windDir;
    const pred = predictBall(b, 1.3, m.mods);
    const ownLine = p.team === 0 ? GOAL_W : W - GOAL_W;
    const toOwnGoal = -b.vx * dir; // > 0 když míč letí k mé brance

    // 1) Kde míč nejdřív stihnu (a je dost nízko, abych na něj dosáhl).
    let ix = pred[pred.length - 1].x;
    for (let i = 0; i < pred.length; i++) {
      const q = pred[i];
      if (q.y < GROUND_Y - 250) continue;
      if (Math.abs(q.x - dir * 30 * PS - p.x) <= speed * ((i + 1) * PDT + 0.05)) {
        ix = q.x;
        break;
      }
    }
    let tx = ix - dir * 30 * PS + this.noise; // stát kousek za míčem
    let jump = false, kick = false;

    // 2) Míč je za mnou (mezi mnou a mou brankou) – oběhnout, nízký míč přeskočit.
    //    Když za míč nejde (je u stěny), jít přímo na něj a hlavičkovat.
    const rel = (b.x - p.x) * dir;
    if (rel < -R * 0.4) {
      const behind = b.x - dir * (R + br + 46 * PS);
      if (behind > R && behind < W - R) {
        tx = behind;
        if (p.onGround && b.y > GROUND_Y - 95 * PS && Math.abs(b.x - p.x) < R + 80 && Math.random() < L.jump) jump = true;
      } else {
        tx = b.x;
        if (p.onGround && Math.abs(b.x - p.x) < R + 30 && b.y < p.y) jump = true;
      }
    }

    // 3) Soupeř je u míče dřív – vrátit se před svou branku a čekat na střelu.
    //    Po výkopu se do souboje uprostřed nehrnout, branka by zůstala prázdná.
    const opps = m.players.filter((q) => q.team !== p.team);
    const oppReach = Math.min(...opps.map((q) => reachCost(q, b)));
    const myReach = reachCost(p, b);
    const kickoffScrum = m.playT < 2 && Math.abs(b.x - W / 2) < 120 && myReach < oppReach + 120;
    if (this.disciplined && (oppReach + 90 < myReach || kickoffScrum)) {
      tx = ownLine + dir * clamp((b.x - ownLine) * dir * 0.3, 50, 200);
      jump = false;
    }

    // 4) Ve dvojici k míči běží ten, kdo to má blíž. Druhý drží pozici.
    const mates = m.players.filter((q) => q !== p && q.team === p.team);
    if (mates.length) {
      const mine = engageCost(p, b);
      const best = Math.min(...mates.map((q) => engageCost(q, b)));
      const danger = (b.x - ownLine) * dir < 300;
      const engage = mine <= best || (this.role === 'defender' && danger);
      if (!engage) {
        jump = false;
        if (this.role === 'defender') tx = ownLine + dir * (110 + clamp((b.x - ownLine) * dir * 0.2, 0, 170));
        else tx = clamp(b.x + dir * 230, GOAL_W + R + 20, W - GOAL_W - R - 20);
      }
    }

    // 5) Hlavička: vyskočit jen tehdy, když míč přeletí nad stojící hlavou,
    //    ale hlava ve skoku ho trefí. Jinak by míč proletěl pod nohama.
    if (!jump && p.onGround) {
      const hitR = R + br;
      for (let k = 1; k <= 8; k++) {
        const t = k * 0.05;
        const q = predAt(pred, t);
        const hx = p.x + clamp(tx - p.x, -speed * t, speed * t);
        const dx = q.x - hx;
        const sy = q.y - p.y;
        if (dx * dx + sy * sy < hitR * hitR) break; // stačí zůstat stát
        const hy = p.y - PHYS.jumpV * m.mods.jump * t + 0.5 * PHYS.gravity * m.mods.grav * t * t;
        const jy = q.y - hy;
        const useful = dx * dir > -R * 0.5 || toOwnGoal > 250;
        if (q.y < p.y - 10 && useful && dx * dx + jy * jy < (hitR + 4) * (hitR + 4)) {
          jump = Math.random() < L.jump;
          break;
        }
      }
    }

    // 6) V cestě stojí jiný hráč a tlačíme se – přeskočit ho.
    const mv = Math.sign(tx - p.x);
    if (!jump && p.onGround && mv !== 0 && Math.abs(tx - p.x) > 60 && Math.abs(p.vx) < 140) {
      for (const q of m.players) {
        const ahead = (q.x - p.x) * mv;
        if (q !== p && ahead > 0 && ahead < 2 * R + 12 && Math.abs(q.y - p.y) < R) {
          jump = Math.random() < L.jump * 0.8;
          break;
        }
      }
    }

    // 7) Přetlačovaná: soupeř těsně přede mnou a míč dole mezi námi – vyskočit
    //    a uvolnit ho (jinak se míč jen odráží mezi hlavami).
    if (!jump && p.onGround && b.y > GROUND_Y - 80 * PS && (b.x - p.x) * dir > 0) {
      for (const q of opps) {
        const gap = (q.x - p.x) * dir;
        if (gap > 0 && gap < 2 * R + 14 && q.onGround && Math.abs(b.x - (p.x + q.x) / 2) < 45 * PS) {
          jump = Math.random() < L.jump * 0.35;
          break;
        }
      }
    }

    // 8) Kop: míč je (nebo za okamžik bude) v dosahu kopačky.
    const zx = p.x + dir * (R + 4), zy = p.y + R + p.F - 24 * PS;
    const inZone = (q) => (q.x - p.x) * dir > 0 && Math.hypot(q.x - zx, q.y - zy) < 46 * PS;
    if ((inZone(b) || inZone(predAt(pred, 0.06))) && Math.random() < L.kick) kick = true;

    // superschopnost, když je nabitá
    const oppGoal = p.team === 0 ? W - GOAL_W : GOAL_W;
    if (p.power === 'hop') {
      // Berry: skoky zapne, když je míč vysoko a blízko, jinak vypne
      const want = b.y < GROUND_Y - 230 && Math.abs(b.x - p.x) < 420;
      if (want !== !!p.hop && Math.random() < 0.08) this.out.super = true;
    } else if (p.superCharge >= 1) {
      if (p.power === 'shot') {
        if (kick && Math.abs(oppGoal - p.x) < 760 && Math.random() < L.kick) {
          this.out.super = true;
          kick = false;
        }
      } else if (p.power === 'basket') {
        // trojka, když je u míče (ne těsně u vlastní brány)
        const nearBall = Math.abs(b.x - p.x) < BASKET_REACH - 40 && b.y > GROUND_Y - 260;
        if (nearBall && (b.x - ownLine) * dir > 250 && m.blocks[1 - p.team] <= 0 && Math.random() < L.kick * 0.6) this.out.super = true;
      } else if (p.power === 'prime') {
        // JENDA PRIME, když jde o míč
        if (Math.abs(b.x - p.x) < 380 && Math.random() < L.kick * 0.7) this.out.super = true;
      } else if (p.power === 'sushi') {
        // jízda, když je míč nebo soupeř před ním a cesta k bráně je dlouhá
        const ahead = (b.x - p.x) * dir;
        if (ahead > 20 && ahead < 420 && Math.abs(oppGoal - p.x) > 380 && Math.random() < L.kick * 0.6) this.out.super = true;
      } else if (p.power === 'rap') {
        // rapper, když jde o míč
        if (Math.abs(b.x - p.x) < 420 && Math.random() < L.kick * 0.6) this.out.super = true;
      } else if (p.power === 'yoga') {
        // jóga, když je soupeř u míče blíž než my
        const opp = m.players.filter((o) => o.team !== p.team && o.stunT <= 0 && !(o.yogaT > 0));
        const close = opp.some((o) => Math.abs(o.x - b.x) < 170 && Math.abs(o.x - b.x) < Math.abs(p.x - b.x));
        if (close && Math.random() < L.kick * 0.5) this.out.super = true;
      } else if (p.power === 'grave') {
        // míč do hrobu: ukrást trojku nebo tryskáč, nebo míč u soupeře (odkudkoli)
        const opp = m.players.filter((o) => o.team !== p.team);
        const oppCloser = opp.some((o) => Math.abs(o.x - b.x) < Math.abs(p.x - b.x) - 60);
        const danger = b.jetBy >= 0 || b.carryBy >= 0 || b.basketT > 0;
        if (!b.held && !m.arms && (danger || (oppCloser && Math.abs(b.x - p.x) > 200)) && Math.random() < L.kick * (danger ? 1 : 0.4)) this.out.super = true;
      } else if (p.power === 'arms') {
        // ruce: ukrást trojku nebo tryskáč, nebo míč, ke kterému je soupeř blíž
        const d = Math.hypot(b.x - p.x, b.y - p.y);
        const opp = m.players.filter((o) => o.team !== p.team);
        const oppCloser = opp.some((o) => Math.abs(o.x - b.x) < Math.abs(p.x - b.x) - 60);
        const danger = b.jetBy >= 0 || b.carryBy >= 0 || b.basketT > 0;
        if (d < ARM_REACH - 40 && !b.held && (danger || (oppCloser && d > 160)) && Math.random() < L.kick * (danger ? 1 : 0.4)) this.out.super = true;
      } else if (p.power === 'jet') {
        // tryskáč, když je daleko od brány soupeře
        if (Math.abs(oppGoal - p.x) > 520 && !m.jet && Math.random() < L.kick * 0.5) this.out.super = true;
      } else if (p.power === 'grow') {
        // zvětšit se, když je soupeř blízko nebo jde o míč
        const near = m.players.some((o) => o.team !== p.team && o.stunT <= 0 && Math.abs(o.x - p.x) < 260);
        if ((near || Math.abs(b.x - p.x) < 200) && Math.random() < L.kick * 0.6) this.out.super = true;
      } else if (p.power === 'redcard' || p.power === 'flash' || p.power === 'yellowcard') {
        // karta, když je soupeř u míče blíž než my
        const opp = m.players.filter((o) => o.team !== p.team && o.stunT <= 0);
        const close = opp.some((o) => Math.abs(o.x - b.x) < 170 && Math.abs(o.x - b.x) < Math.abs(p.x - b.x));
        if (close && Math.random() < L.kick * 0.5) this.out.super = true;
      } else if (p.power === 'vo2') {
        // zrychlení, když je míč daleko nebo jde o závod
        if (Math.abs(b.x - p.x) > 320 && Math.random() < L.kick) this.out.super = true;
      } else {
        // hermelín / led: míč letí na naši bránu a je blízko
        const dist = (b.x - ownLine) * dir;
        if (dist < 300 && toOwnGoal > 150 && m.blocks[p.team] <= 0 && Math.random() < L.kick) this.out.super = true;
      }
    }

    const dx = tx - p.x;
    this.out.left = dx < -8;
    this.out.right = dx > 8;
    this.out.jump = jump;
    this.out.kick = kick;
  }
}
