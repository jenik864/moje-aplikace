'use strict';
/*
 * Penalty pohledem jako ve FIFĚ: kamera za střelcem, před ním brána v perspektivě
 * s brankářem. Scéna se kreslí v souřadnicích obrazovky (1280 × 720, viditelná
 * část podle Renderer.view). Poloha v bráně: u = -1 levá tyč … 1 pravá tyč,
 * v = 0 zem … 1 břevno.
 */

const PS3 = {
  goalY: 400,      // brankové čáry na obrazovce
  halfW: 292,      // polovina šířky brány
  height: 182,     // výška brány
  back: 0.86,      // zadní rám sítě (zmenšení k úběžníku)
  vpY: 150,        // úběžník
  spotY: 585,      // značka penalty
  flight: 0.62,    // jak dlouho letí míč k bráně (s)
};
const KEEPER_KIT = { color: '#a3e635', dark: '#4d7c0f', light: '#ecfccb', num: '#1f2a10' };

const PenScene = {
  bg: null,
  bgKey: '',

  // Bod v rovině brány → obrazovka.
  goalPt(cx, u, v) {
    return { x: cx + u * PS3.halfW, y: PS3.goalY - v * PS3.height };
  },
  backPt(cx, u, v) {
    const p = this.goalPt(cx, u, v);
    return { x: cx + (p.x - cx) * PS3.back, y: PS3.vpY + (p.y - PS3.vpY) * PS3.back + 6 };
  },

  /* ---- pozadí: tribuny, tabule, trávník (předkreslené) ---- */

  buildBg(view, teams, scale) {
    const key = [view.x0, view.x1, view.y0, view.y1, teams[0].color, teams[1].color, scale].join('|');
    if (this.bg && this.bgKey === key) return;
    this.bgKey = key;
    const w = Math.ceil((view.x1 - view.x0) * scale), h = Math.ceil((view.y1 - view.y0) * scale);
    const c = this.bg || (this.bg = document.createElement('canvas'));
    c.width = Math.max(1, w);
    c.height = Math.max(1, h);
    const x = c.getContext('2d');
    x.setTransform(scale, 0, 0, scale, -view.x0 * scale, -view.y0 * scale);
    const L = view.x0, R = view.x1, cx = (L + R) / 2;
    // noční obloha a střecha
    const sky = x.createLinearGradient(0, view.y0, 0, 300);
    sky.addColorStop(0, '#050a18');
    sky.addColorStop(1, '#13203b');
    x.fillStyle = sky;
    x.fillRect(L, view.y0, R - L, 320);
    // světla na střeše
    for (let i = 0; i < 9; i++) {
      const lx = L + ((i + 0.5) / 9) * (R - L), ly = view.y0 + 34;
      const g = x.createRadialGradient(lx, ly, 2, lx, ly, 70);
      g.addColorStop(0, 'rgba(255,255,240,.9)');
      g.addColorStop(0.15, 'rgba(255,255,230,.35)');
      g.addColorStop(1, 'rgba(255,255,230,0)');
      x.fillStyle = g;
      x.fillRect(lx - 70, ly - 70, 140, 140);
    }
    // tribuny: řady fanoušků, vlevo barvy týmu vlevo, vpravo týmu vpravo
    const rng = mulberry32(11);
    const top = view.y0 + 70, bottom = 298;
    x.fillStyle = '#0d1528';
    x.fillRect(L, top - 8, R - L, bottom - top + 12);
    const rows = 12;
    const skins = ['#f3c99b', '#e0ac69', '#c68642', '#8d5524', '#f8d8c0'];
    for (let r = 0; r < rows; r++) {
      const y = top + ((r + 1) / rows) * (bottom - top);
      const size = 3 + (r / rows) * 3.2, sp = 9 + (r / rows) * 5;
      for (let fx = L - 5 + rng() * sp; fx < R + 5; fx += sp * (0.85 + rng() * 0.35)) {
        if (rng() < 0.05) continue;
        const T = fx < cx ? teams[0] : teams[1];
        const q = rng();
        x.fillStyle = q < 0.78 ? pick2(rng, [T.color, shade(T.color, -0.2), shade(T.color, 0.25)]) : pick2(rng, ['#e9edf2', '#2b3445', '#ffc93c']);
        rrect(x, fx - size, y - size * 1.6, size * 2, size * 1.6, size * 0.5);
        x.fill();
        x.fillStyle = pick2(rng, skins);
        circle(x, fx, y - size * 2.1, size * 0.75);
        x.fill();
        if (q > 0.97) {
          x.fillStyle = T.color;
          x.fillRect(fx, y - size * 5, size * 2.6, size * 1.5);
        }
      }
    }
    const shadeG = x.createLinearGradient(0, top, 0, bottom);
    shadeG.addColorStop(0, 'rgba(4,8,18,.6)');
    shadeG.addColorStop(1, 'rgba(4,8,18,0)');
    x.fillStyle = shadeG;
    x.fillRect(L, top - 8, R - L, bottom - top + 12);
    // reklamní tabule za bránou
    const by = 298, bh = 34, bw = 210;
    const ads = [SPONSORS[0], { t: 'FIFA67', bg: '#0d1526', fg: '#ffc93c' }, SPONSORS[1], ADS[3], SPONSORS[0], ADS[1], SPONSORS[1]];
    let k = 0;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    for (let bx = cx - bw * 3.5 - Math.ceil((cx - bw * 3.5 - L) / bw) * bw; bx < R; bx += bw, k++) {
      const a = ads[((k % ads.length) + ads.length) % ads.length];
      x.fillStyle = a.bg;
      x.fillRect(bx, by, bw - 3, bh);
      x.fillStyle = a.fg;
      x.font = `24px ${FONT_D}`;
      x.fillText(a.t, bx + bw / 2, by + bh / 2 + 2);
    }
    // trávník s pruhy v perspektivě
    const gTop = by + bh;
    const grass = x.createLinearGradient(0, gTop, 0, view.y1);
    grass.addColorStop(0, '#2c8c46');
    grass.addColorStop(1, '#3fae55');
    x.fillStyle = grass;
    x.fillRect(L, gTop, R - L, view.y1 - gTop);
    x.fillStyle = 'rgba(0,0,0,.07)';
    let yy = gTop, band = 10;
    for (let i = 0; yy < view.y1; i++) {
      const hgt = band;
      if (i % 2) x.fillRect(L, yy, R - L, hgt);
      yy += hgt;
      band *= 1.32;
    }
    // čáry: branková čára, malé vápno, velké vápno, značka penalty
    const pers = (px, py) => cx + (px - cx) * (1 + (py - PS3.goalY) * 0.0042);
    x.strokeStyle = 'rgba(255,255,255,.85)';
    x.lineWidth = 3;
    const line2 = (x0, y0, x1, y1) => {
      x.beginPath();
      x.moveTo(x0, y0);
      x.lineTo(x1, y1);
      x.stroke();
    };
    line2(L, PS3.goalY, R, PS3.goalY);
    const box = (hw, depth) => {
      const y1 = PS3.goalY + depth;
      x.beginPath();
      x.moveTo(cx - hw, PS3.goalY);
      x.lineTo(pers(cx - hw, y1), y1);
      x.lineTo(pers(cx + hw, y1), y1);
      x.lineTo(cx + hw, PS3.goalY);
      x.stroke();
    };
    box(PS3.halfW + 95, 58);
    box(PS3.halfW + 330, 250);
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.ellipse(cx, PS3.spotY + 14, 9, 4, 0, 0, TAU);
    x.fill();
    // stín brány
    x.fillStyle = 'rgba(0,0,0,.22)';
    x.beginPath();
    x.moveTo(cx - PS3.halfW, PS3.goalY);
    x.lineTo(cx + PS3.halfW, PS3.goalY);
    x.lineTo(cx + PS3.halfW * PS3.back, PS3.goalY - 22);
    x.lineTo(cx - PS3.halfW * PS3.back, PS3.goalY - 22);
    x.closePath();
    x.fill();
  },

  /* ---- brána ---- */

  drawNet(ctx, cx, ripple, now) {
    // zadní stěna a boky sítě (za brankářem)
    const fl = (u, v) => this.goalPt(cx, u, v), bk = (u, v) => this.backPt(cx, u, v);
    const bulge = (u, v) => {
      if (!ripple) return { x: 0, y: 0 };
      const d = Math.hypot(u - ripple.u, (v - ripple.v) * 1.5);
      const a = Math.max(0, 1 - d / 0.7) * ripple.amp * Math.cos(ripple.t * 18) * Math.exp(-ripple.t * 3);
      return { x: (cx + u * PS3.halfW - cx) * -0.04 * a, y: -6 * a };
    };
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    const b00 = bk(-1, 0), b10 = bk(1, 0), b11 = bk(1, 1), b01 = bk(-1, 1);
    ctx.beginPath();
    ctx.moveTo(b00.x, b00.y);
    ctx.lineTo(b10.x, b10.y);
    ctx.lineTo(b11.x, b11.y);
    ctx.lineTo(b01.x, b01.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.42)';
    ctx.lineWidth = 1.2;
    // svislé a vodorovné provázky zadní sítě
    for (let i = 0; i <= 20; i++) {
      const u = -1 + i / 10;
      ctx.beginPath();
      for (let j = 0; j <= 8; j++) {
        const v = j / 8, p = bk(u, v), o = bulge(u, v);
        if (j) ctx.lineTo(p.x + o.x, p.y + o.y);
        else ctx.moveTo(p.x + o.x, p.y + o.y);
      }
      ctx.stroke();
    }
    for (let j = 0; j <= 8; j++) {
      const v = j / 8;
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const u = -1 + i / 10, p = bk(u, v), o = bulge(u, v);
        if (i) ctx.lineTo(p.x + o.x, p.y + o.y);
        else ctx.moveTo(p.x + o.x, p.y + o.y);
      }
      ctx.stroke();
    }
    // boční a horní síť
    for (let j = 0; j <= 6; j++) {
      const t = j / 6;
      for (const u of [-1, 1]) {
        const a = fl(u, t), b = bk(u, t);
        line(ctx, a.x, a.y, b.x, b.y);
      }
      const a = fl(-1 + t * 2, 1), b = bk(-1 + t * 2, 1);
      line(ctx, a.x, a.y, b.x, b.y);
    }
    // zadní tyče
    ctx.strokeStyle = 'rgba(220,226,236,.8)';
    ctx.lineWidth = 3;
    line(ctx, b00.x, b00.y, b01.x, b01.y);
    line(ctx, b10.x, b10.y, b11.x, b11.y);
    line(ctx, b01.x, b01.y, b11.x, b11.y);
    ctx.restore();
  },

  drawFrame(ctx, cx) {
    const a = this.goalPt(cx, -1, 0), b = this.goalPt(cx, -1, 1), c = this.goalPt(cx, 1, 1), d = this.goalPt(cx, 1, 0);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(a.x + 3, a.y);
    ctx.lineTo(b.x + 3, b.y + 3);
    ctx.lineTo(c.x + 3, c.y + 3);
    ctx.lineTo(d.x + 3, d.y);
    ctx.stroke();
    ctx.strokeStyle = '#f4f6f9';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a.x - 3, a.y);
    ctx.lineTo(b.x - 3, b.y - 3);
    ctx.lineTo(c.x - 3, c.y - 3);
    ctx.stroke();
    ctx.restore();
  },

  /* ---- míč ---- */

  drawBall(ctx, x, y, r, rot, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.fillStyle = '#f7f8fa';
    circle(ctx, 0, 0, r);
    ctx.fill();
    ctx.save();
    circle(ctx, 0, 0, r);
    ctx.clip();
    ctx.rotate(rot);
    ctx.scale(r / 17, r / 17);
    ctx.fillStyle = '#1c2230';
    pentagon(ctx, 0, 0, 6.3, -Math.PI / 2);
    for (let k = 0; k < 5; k++) {
      const a = (k * TAU) / 5 + Math.PI / 2;
      pentagon(ctx, Math.cos(a) * 15.5, Math.sin(a) * 15.5, 6.2, a);
    }
    ctx.restore();
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 1, 0, 0, r);
    g.addColorStop(0, 'rgba(255,255,255,.6)');
    g.addColorStop(0.5, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(0,0,0,.3)');
    ctx.fillStyle = g;
    circle(ctx, 0, 0, r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.stroke();
    ctx.restore();
  },

  // Kde je míč v čase ft (od kopu) – podle výsledku.
  ballAt(P, cx, ft) {
    const spot = { x: cx + 6, y: PS3.spotY, r: 18 };
    if (ft === null || ft < 0) return spot;
    const E = this.goalPt(cx, P.su, P.sv);
    const FL = PS3.flight;
    const k = Math.min(1, ft / FL);
    const e = 1 - Math.pow(1 - k, 1.6);
    const arc = Math.sin(Math.PI * k) * (30 + P.sv * 50);
    const at = { x: lerp(spot.x, E.x, e), y: lerp(spot.y, E.y, e) - arc, r: lerp(18, 8.5, e), a: 1 };
    if (ft <= FL || !P.res) return at;
    const t = ft - FL;
    if (P.res === 'goal') {
      const B = this.backPt(cx, P.su, Math.max(0, P.sv - 0.05));
      const kk = Math.min(1, t / 0.18);
      const fall = Math.max(0, t - 0.18);
      const yGround = this.backPt(cx, P.su, 0).y - 7;
      return { x: lerp(E.x, B.x, kk), y: Math.min(yGround, lerp(E.y, B.y, kk) + 900 * fall * fall), r: 7.5, a: 1 };
    }
    if (P.res === 'save' || P.res === 'post') {
      // odražený míč letí zpátky a do strany
      const side = P.res === 'post' ? -Math.sign(P.su || 1) * 0.6 : (P.su - P.kx) >= 0 ? 1 : -1;
      const up = P.res === 'post' ? -0.2 : P.sv > 0.5 ? 0.6 : 0.25;
      const dx = side * 380 * t, dy = -up * 260 * t + 700 * t * t;
      return { x: E.x + dx, y: Math.min(PS3.goalY + 60 + t * 160, E.y + dy), r: 8.5 + t * 9, a: Math.max(0, 1 - t * 0.9) };
    }
    // vedle: pokračuje dál za bránu
    const k2 = 1 + t / FL;
    return { x: lerp(spot.x, E.x, k2), y: lerp(spot.y, E.y, k2) - (P.sv > 0.95 ? t * 140 : 0), r: Math.max(3, lerp(18, 8.5, k2)), a: Math.max(0, 1 - t * 2) };
  },

  /* ---- postavy zepředu a zezadu ---- */

  hairKind(L) {
    if (['longhair', 'long', 'ponytail'].includes(L.hair)) return 'long';
    if (['curlyshort', 'curlytop', 'wavyshort', 'wavy'].includes(L.hair)) return 'curly';
    if (L.hair === 'buzz' || L.hair === 'receding') return 'short';
    return 'mid';
  },

  limb(ctx, x0, y0, x1, y1, w, col) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = w + 3;
    line(ctx, x0, y0, x1, y1);
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    line(ctx, x0, y0, x1, y1);
  },

  // Brankář zepředu. Počátek = střed hlavy, nohy v y = 86.
  drawFront(ctx, L, kit, o) {
    const R = 40, hk = this.hairKind(L);
    const arms = o.arms || 0; // 0 dolů, 1 nahoru do stran
    // dlouhé vlasy za hlavou
    if (hk === 'long') {
      ctx.fillStyle = L.hairColor;
      ctx.strokeStyle = L.hairDark;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-R - 2, -6);
      ctx.quadraticCurveTo(-R - 10, 40, -R + 4, 62);
      ctx.lineTo(R - 4, 62);
      ctx.quadraticCurveTo(R + 10, 40, R + 2, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // nohy a kopačky
    for (const s of [-1, 1]) {
      const fx = s * (11 + (o.spread || 0) * 10);
      this.limb(ctx, s * 9, 62, fx, 82, 8, L.skin);
      ctx.strokeStyle = '#f2f4f7';
      ctx.lineWidth = 8.5;
      line(ctx, s * 9 + (fx - s * 9) * 0.5, 72, fx, 81);
      ctx.fillStyle = '#1d2433';
      oval(ctx, fx + s * 2, 86, 9, 5);
      ctx.fill();
    }
    // trenky
    ctx.fillStyle = kit.dark;
    rrect(ctx, -21, 50, 42, 16, 5);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    // ruce s rukavicemi
    for (const s of [-1, 1]) {
      const a = lerp(0.35, 2.5, arms);
      const ex = s * (22 + Math.sin(a) * 26), ey = 33 + Math.cos(a) * 26;
      this.limb(ctx, s * 22, 33, ex, ey, 8, kit.color);
      ctx.fillStyle = '#ffffff';
      circle(ctx, ex, ey, 8.5);
      ctx.fill();
      ctx.strokeStyle = kit.dark;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
    // dres
    ctx.fillStyle = kit.color;
    rrect(ctx, -23, 28, 46, 27, 9);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = kit.dark;
    ctx.fillRect(-23, 41, 46, 4);
    ctx.font = `800 12px ${FONT_U}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = kit.num || '#ffffff';
    ctx.fillText('1', 9, 35);
    // hlava
    ctx.fillStyle = shade(L.skin, -0.14);
    rrect(ctx, -7, R - 16, 14, 16, 5);
    ctx.fill();
    ctx.fillStyle = L.skin;
    for (const s of [-1, 1]) {
      oval(ctx, s * (R - 1), 4, 6, 8);
      ctx.fill();
    }
    circle(ctx, 0, 0, R);
    ctx.fill();
    const sh = ctx.createRadialGradient(-12, -14, 4, 0, 0, R + 2);
    sh.addColorStop(0, 'rgba(255,255,255,.22)');
    sh.addColorStop(0.6, 'rgba(255,255,255,0)');
    sh.addColorStop(1, 'rgba(130,55,20,.22)');
    ctx.fillStyle = sh;
    circle(ctx, 0, 0, R);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    circle(ctx, 0, 0, R);
    ctx.stroke();
    // vlasy nahoře
    ctx.save();
    circle(ctx, 0, 0, R + 1);
    ctx.clip();
    ctx.fillStyle = L.hairColor;
    ctx.beginPath();
    const fr = hk === 'short' ? -26 : -16;
    ctx.moveTo(-R - 2, hk === 'long' ? 14 : fr + 6);
    if (hk === 'curly') {
      for (let i = 0; i <= 8; i++) {
        const x = -R + (i / 8) * 2 * R;
        ctx.quadraticCurveTo(x - 5, fr + 10, x, fr + (i % 2 ? 2 : 6));
      }
    } else {
      ctx.quadraticCurveTo(-18, fr + 10, 0, fr + 2);
      ctx.quadraticCurveTo(18, fr - 4, R + 2, fr + 8);
    }
    ctx.lineTo(R + 2, -R - 4);
    ctx.lineTo(-R - 2, -R - 4);
    ctx.closePath();
    ctx.fill();
    if (hk === 'long') {
      ctx.fillRect(-R - 2, -R, 8, R + 18);
      ctx.fillRect(R - 6, -R, 8, R + 18);
    }
    ctx.strokeStyle = L.hairLight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-6, -R + 12, 20, 1.15 * Math.PI, 1.65 * Math.PI);
    ctx.stroke();
    ctx.restore();
    // obličej
    for (const s of [-1, 1]) {
      const ex = s * 14, ey = 0;
      ctx.fillStyle = '#ffffff';
      oval(ctx, ex, ey, 7, 8.5);
      ctx.fill();
      ctx.fillStyle = L.eyes;
      circle(ctx, ex + (o.look || 0) * 2, ey + 1, 5.2);
      ctx.fill();
      ctx.fillStyle = '#15110e';
      circle(ctx, ex + (o.look || 0) * 2, ey + 1, 2.6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      circle(ctx, ex + 1.6 + (o.look || 0) * 2, ey - 1.6, 1.4);
      ctx.fill();
      ctx.strokeStyle = '#2c1a12';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 7.3, 8.8, 0, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.strokeStyle = L.brow;
      ctx.lineWidth = L.browW || 3;
      ctx.beginPath();
      const lift = o.mood > 0 ? -2 : o.tense ? 2 : 0;
      ctx.moveTo(ex - s * 8, -13 + lift);
      ctx.quadraticCurveTo(ex, -17 + lift, ex + s * 8, -13 + (o.tense ? 3 : 0));
      ctx.stroke();
    }
    ctx.fillStyle = L.girl ? 'rgba(255,100,120,.3)' : 'rgba(235,110,90,.16)';
    oval(ctx, -20, 12, 5, 3);
    ctx.fill();
    oval(ctx, 20, 12, 5, 3);
    ctx.fill();
    ctx.strokeStyle = shade(L.skin, -0.3);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-2, 9);
    ctx.quadraticCurveTo(0, 12, 3, 9);
    ctx.stroke();
    if (o.mood > 0 || o.open) {
      ctx.fillStyle = '#5a1a1c';
      oval(ctx, 0, 21, 7, o.mood > 0 ? 6 : 4.5);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5, 16, 10, 2);
    } else if (o.mood < 0) {
      ctx.strokeStyle = '#8a3a2c';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 27, 7, 1.2 * Math.PI, 1.8 * Math.PI);
      ctx.stroke();
    } else {
      ctx.strokeStyle = L.girl ? '#c23d5a' : '#8a3a2c';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-6, 20);
      ctx.quadraticCurveTo(0, 22, 6, 20);
      ctx.stroke();
    }
  },

  // Střelec zezadu. Počátek = střed hlavy, nohy v y = 86. kick 0..1 švih pravou nohou.
  drawBack(ctx, L, T, o) {
    const R = 40, hk = this.hairKind(L), kick = o.kick || 0;
    // nohy
    const swing = Math.sin(kick * Math.PI);
    for (const s of [-1, 1]) {
      const kickLeg = s === 1 && kick > 0;
      const fx = s * 11 + (kickLeg ? -swing * 6 : 0), fy = 82 - (kickLeg ? swing * 20 : 0);
      this.limb(ctx, s * 9, 62, fx, fy, 9, L.skin);
      ctx.strokeStyle = '#f2f4f7';
      ctx.lineWidth = 9.5;
      line(ctx, lerp(s * 9, fx, 0.5), lerp(62, fy, 0.5) + 4, fx, fy);
      ctx.fillStyle = '#1d2433';
      oval(ctx, fx, fy + 4, 8, 6);
      ctx.fill();
    }
    ctx.fillStyle = T.dark;
    rrect(ctx, -22, 50, 44, 16, 5);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    // ruce
    for (const s of [-1, 1]) {
      const a = kick > 0 ? 0.9 + swing * 0.5 : 0.25;
      this.limb(ctx, s * 22, 33, s * (22 + Math.sin(a) * 24), 33 + Math.cos(a) * 24, 8, L.skin);
      this.limb(ctx, s * 22, 33, s * (22 + Math.sin(a) * 9), 33 + Math.cos(a) * 9, 9, T.color);
    }
    // dres se jménem a číslem na zádech
    ctx.fillStyle = T.color;
    rrect(ctx, -24, 27, 48, 28, 9);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 8px ${FONT_U}`;
    ctx.fillStyle = T.num || '#ffffff';
    ctx.fillText(L.name.toUpperCase(), 0, 33);
    ctx.font = `800 17px ${FONT_U}`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = T.light && T.num ? T.light : T.dark;
    ctx.strokeText(String(L.num), 0, 45);
    ctx.fillText(String(L.num), 0, 45);
    // hlava zezadu
    ctx.fillStyle = shade(L.skin, -0.14);
    rrect(ctx, -8, R - 16, 16, 16, 5);
    ctx.fill();
    ctx.fillStyle = L.skin;
    for (const s of [-1, 1]) {
      oval(ctx, s * (R - 1), 6, 6, 8);
      ctx.fill();
    }
    circle(ctx, 0, 0, R);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.save();
    circle(ctx, 0, 0, R + 1);
    ctx.clip();
    ctx.fillStyle = hk === 'short' ? hexA(L.hairColor, 0.85) : L.hairColor;
    const nape = hk === 'long' ? R + 4 : hk === 'short' ? 16 : 22;
    ctx.fillRect(-R - 2, -R - 2, 2 * R + 4, R + nape);
    ctx.restore();
    // dlouhé vlasy na záda
    if (hk === 'long') {
      ctx.fillStyle = L.hairColor;
      ctx.strokeStyle = L.hairDark;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-R + 4, 10);
      ctx.quadraticCurveTo(-R + 2, 50, -24, 64);
      ctx.quadraticCurveTo(0, 70, 24, 64);
      ctx.quadraticCurveTo(R - 2, 50, R - 4, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // kudrny / pramínky
    ctx.strokeStyle = L.hairLight;
    ctx.lineWidth = 2;
    if (hk === 'curly') {
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.arc(-26 + i * 9, -20 + (i % 2) * 8, 5, Math.PI, TAU);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.arc(0, -10, 26, 1.2 * Math.PI, 1.8 * Math.PI);
      ctx.stroke();
    }
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 3;
    circle(ctx, 0, 0, R);
    ctx.stroke();
  },

  /* ---- celá scéna ---- */

  draw(ctx, g, now) {
    const m = g.match, P = g.pen, v = Renderer.view, cx = (v.x0 + v.x1) / 2;
    const sh = m.players[P.shooter], kp = m.players[P.keeper];
    if (!sh || !kp) return;
    this.buildBg(v, m.teams, Math.min(2, Renderer.scale));
    ctx.drawImage(this.bg, v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const ft = P.ft;
    // síť (za brankářem)
    const ripple = P.res === 'goal' && ft > PS3.flight ? { u: P.su, v: P.sv, t: ft - PS3.flight, amp: 1.4 } : null;
    this.drawNet(ctx, cx, ripple, now);
    const ball = this.ballAt(P, cx, ft);
    const behind = P.res === 'goal' && ft > PS3.flight + 0.05;
    const rot = (ft || 0) * 14;
    if (behind) this.drawBall(ctx, ball.x, ball.y, ball.r, rot, ball.a);
    // brankář
    const kd = clamp(P.kd || 0, 0, 1), e = easeOutQuad(kd);
    const kx = lerp(0, P.kx || 0, e), ky = lerp(0.36, P.ky || 0.36, e);
    const kpPt = this.goalPt(cx, kx, ky);
    const ks = 1.12;
    const baseY = PS3.goalY - 86 * ks; // hlava, když stojí
    const bodyY = lerp(baseY, kpPt.y - 30 * ks, e);
    const hop = Math.abs(Math.sin(now * 0.008)) * 3 * (1 - kd);
    // stín
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    oval(ctx, kpPt.x, PS3.goalY + 2, 34 * (1 - kd * 0.4), 7);
    ctx.fill();
    ctx.save();
    ctx.translate(kpPt.x, bodyY - hop + 40 * ks);
    ctx.rotate((P.kx || 0) * 1.15 * e);
    ctx.translate(0, -40 * ks);
    ctx.scale(ks, ks);
    const kMood = P.res === 'save' && ft > PS3.flight ? 1 : P.res === 'goal' && ft > PS3.flight + 0.3 ? -1 : 0;
    this.drawFront(ctx, kp.look, KEEPER_KIT, { arms: kd > 0 ? 1 : 0.3, spread: kd > 0 ? 0.6 : 0.4, mood: kMood, open: kd > 0 && kd < 1, tense: P.phase === 'aim', look: clamp((ball.x - kpPt.x) / 200, -1, 1) });
    ctx.restore();
    // brána (přední rám) a míč před ní
    this.drawFrame(ctx, cx);
    if (!behind) {
      // stín míče
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      const gy = ft === null || ft < 0 ? PS3.spotY + 16 : lerp(PS3.spotY + 16, PS3.goalY + 2, Math.min(1, (ft || 0) / PS3.flight));
      oval(ctx, ball.x, gy, ball.r * 0.9, ball.r * 0.3);
      ctx.fill();
      this.drawBall(ctx, ball.x, ball.y, ball.r, rot, ball.a);
    }
    // střelec zezadu (před míčem, blíž kameře)
    const kickT = ft === null ? -1 : ft;
    const kick = kickT >= -0.05 && kickT < 0.3 ? clamp((kickT + 0.05) / 0.35, 0, 1) : 0;
    const runup = P.phase === 'aim' ? 0 : clamp(((ft || 0) + 0.2) / 0.2, 0, 1);
    const ss = 1.42;
    const sx = cx - 96 + runup * 46, sy = PS3.spotY - 18 - runup * 10;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    oval(ctx, sx, sy + 86 * ss * 0.98, 40 * ss, 9 * ss);
    ctx.fill();
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(ss, ss);
    this.drawBack(ctx, sh.look, m.teams[sh.team], { kick });
    ctx.restore();
    // zaměřovač (jen pro střelce na tomto zařízení)
    if (P.phase === 'aim' && g.myPlayer && m.players.indexOf(g.myPlayer()) === P.shooter && typeof P.ax === 'number') {
      const w = penWobble(P.aimT || 0);
      const au = P.ax + w.u, av = P.ay + w.v;
      const pt = this.goalPt(cx, au, av);
      const out = Math.abs(au) > 1 || av > 1;
      ctx.save();
      ctx.strokeStyle = out ? '#ff5a4f' : '#ffd23f';
      ctx.lineWidth = 4;
      circle(ctx, pt.x, pt.y, 16 + Math.sin(now * 0.02) * 1.5);
      ctx.stroke();
      ctx.lineWidth = 3;
      line(ctx, pt.x - 26, pt.y, pt.x - 9, pt.y);
      line(ctx, pt.x + 9, pt.y, pt.x + 26, pt.y);
      line(ctx, pt.x, pt.y - 26, pt.x, pt.y - 9);
      line(ctx, pt.x, pt.y + 9, pt.x, pt.y + 26);
      ctx.fillStyle = out ? '#ff5a4f' : '#ffd23f';
      circle(ctx, pt.x, pt.y, 4);
      ctx.fill();
      // odpočet
      const left = Math.max(0, PEN_AIM_TIME - (P.aimT || 0));
      ctx.font = `800 22px ${FONT_U}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = left < 2 ? '#ff6b62' : '#ffffff';
      ctx.fillText(String(Math.ceil(left)), pt.x, pt.y - 34);
      ctx.restore();
    }
  },
};

// Chvění zaměřovače (aby trefit roh nebyla jistota).
function penWobble(t) {
  const k = 0.6 + Math.min(1, t / 4) * 0.6;
  return { u: (Math.sin(t * 2.3) * 0.05 + Math.sin(t * 3.9 + 1) * 0.035) * k, v: (Math.cos(t * 2.7) * 0.045 + Math.sin(t * 4.3) * 0.02) * k };
}
const PEN_AIM_TIME = 6; // po tolika sekundách se vystřelí samo
