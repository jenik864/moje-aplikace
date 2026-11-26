'use strict';
/*
 * Ovládání jednoho hráče na zařízení.
 * Klávesnice: A/D nebo šipky běh, W/↑ skok, mezerník/S/↓ střela, E/Shift superstřela.
 * Dotyk: joystick (do stran běh, nahoru skok), tlačítka Střela a Super.
 */

const KEYMAP = {
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyW: 'jump', ArrowUp: 'jump',
  Space: 'kick', KeyS: 'kick', ArrowDown: 'kick', Enter: 'kick', NumpadEnter: 'kick',
  KeyE: 'super', KeyQ: 'super', ShiftLeft: 'super', ShiftRight: 'super',
};

const Input = {
  held: new Set(),
  kickQ: false,
  superQ: false,
  touch: { move: 0, jump: false, down: false, my: 0 },
  out: { left: false, right: false, jump: false, kick: false, super: false, move: 0, down: false, my: 0 },

  down(code, repeat) {
    const a = KEYMAP[code];
    if (!a) return false;
    this.held.add(code);
    if (!repeat && a === 'kick') this.kickQ = true;
    if (!repeat && a === 'super') this.superQ = true;
    return true;
  },

  up(code) {
    this.held.delete(code);
  },

  // Stav ovládání. Střela a super jsou jednorázová zmáčknutí, ostatní se drží.
  intent() {
    const o = this.out;
    let l = false, r = false, j = false;
    for (const code of this.held) {
      const a = KEYMAP[code];
      if (a === 'left') l = true;
      else if (a === 'right') r = true;
      else if (a === 'jump') j = true;
    }
    const t = this.touch;
    o.move = Math.abs(t.move) > 0.01 ? t.move : (r ? 1 : 0) - (l ? 1 : 0);
    o.left = o.move < -0.01;
    o.right = o.move > 0.01;
    o.jump = j || t.jump;
    o.down = t.down || this.held.has('KeyS') || this.held.has('ArrowDown');
    // svislá osa (míření u penalt): joystick, nebo W/S
    o.my = Math.abs(t.my) > 0.05 ? t.my : (o.down ? 1 : 0) - (j ? 1 : 0);
    o.kick = this.kickQ;
    o.super = this.superQ;
    this.kickQ = false;
    this.superQ = false;
    return o;
  },

  clear() {
    this.held.clear();
    this.kickQ = this.superQ = false;
    this.touch.move = 0;
    this.touch.jump = false;
    this.touch.down = false;
    this.touch.my = 0;
  },
};

const TOUCH_ICONS = {
  kick: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="15"/><path d="m24 15.5 7.2 5.2-2.8 8.4h-8.8l-2.8-8.4z" class="f"/><path d="M24 9v6.5M38.3 19.4l-7.1 1.3M33 36.2l-4.6-7.1M15 36.2l4.6-7.1M9.7 19.4l7.1 1.3"/></svg>',
  super: '<svg viewBox="0 0 48 48"><path d="M27 5 11 27h11l-3 16 17-23H25z" class="f"/></svg>',
  cheese: '<svg viewBox="0 0 48 48"><path d="M6 31 40 15v18L6 39z" class="f"/><path d="M6 31 24 11l16 4"/><circle cx="16" cy="33" r="2.4"/><circle cx="29" cy="27" r="3"/></svg>',
  // erb ve stylu královského klubu: koruna, kruh, šikmý pruh a monogram JP (Jenda Prime)
  prime: '<svg viewBox="0 0 48 48" class="crest"><defs><clipPath id="jp-clip"><circle cx="24" cy="31" r="11.5"/></clipPath></defs><path d="M11.5 15.5Q11 7.5 17.5 8Q20.5 3.6 24 3.6Q27.5 3.6 30.5 8Q37 7.5 36.5 15.5Z" fill="#c8102e" stroke="#7a5a00" stroke-width="1.2"/><path d="M11.5 15.5Q11 7.5 17.5 8Q20.5 3.6 24 3.6Q27.5 3.6 30.5 8Q37 7.5 36.5 15.5" fill="none" stroke="#ffd23f" stroke-width="2"/><path d="M24 4V15.5M17.5 8Q19 12 18 15.5M30.5 8Q29 12 30 15.5" fill="none" stroke="#ffd23f" stroke-width="1.4"/><rect x="11" y="14.6" width="26" height="3.4" rx="1.2" fill="#ffd23f" stroke="#7a5a00" stroke-width=".8"/><path d="M23 .6h2v1.6h1.6v1.8H25v1.4h-2V4h-1.6V2.2H23z" fill="#ffd23f"/><g fill="#fff6d0"><circle cx="13" cy="11.5" r="1"/><circle cx="15" cy="8.6" r="1"/><circle cx="20" cy="5.6" r="1"/><circle cx="28" cy="5.6" r="1"/><circle cx="33" cy="8.6" r="1"/><circle cx="35" cy="11.5" r="1"/><circle cx="24" cy="10" r="1.1"/></g><circle cx="24" cy="31" r="14" fill="#ffffff" stroke="#ffd23f" stroke-width="2.2"/><circle cx="24" cy="31" r="11.5" fill="none" stroke="#1d2b5c" stroke-width="1"/><path d="M10 22 14.6 17.4 40 42.8 35.4 47.4Z" fill="#1d2b5c" clip-path="url(#jp-clip)"/><text x="24" y="36.4" text-anchor="middle" font-family="Paytone One, Arial Black, sans-serif" font-size="13.5" fill="#ffd23f" stroke="#1d2b5c" stroke-width="1.1" paint-order="stroke">JP</text></svg>',
  basket: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="16" class="f" fill-opacity=".25"/><circle cx="24" cy="24" r="16"/><path d="M8 24h32M24 8v32M12.5 12.5c5 4 5 19 0 23M35.5 12.5c-5 4-5 19 0 23"/></svg>',
  jet: '<svg viewBox="0 0 48 48"><path d="M4 28l14-2 14-14c3-3 8-4 10-2s1 7-2 10L26 34l-2 14-5-1-2-11-9 3-2-4 7-6z" class="f"/></svg>',
  flash: '<svg viewBox="0 0 48 48"><rect x="8" y="14" width="32" height="24" rx="5"/><circle cx="24" cy="26" r="7"/><path d="M15 14l3-5h12l3 5"/><circle cx="34" cy="19.5" r="1.8" class="f"/></svg>',
  grow: '<svg viewBox="0 0 48 48"><circle cx="24" cy="26" r="14"/><path d="M6 6l9 9M42 6l-9 9M6 42l9-9M42 42l-9-9M6 6h7M6 6v7M42 6h-7M42 6v7M6 42h7M6 42v-7M42 42h-7M42 42v-7"/></svg>',
  redcard: '<svg viewBox="0 0 48 48"><rect x="15" y="7" width="20" height="29" rx="3" transform="rotate(12 25 21)" style="fill:#ff2d2d;stroke:#3a0505"/><path d="M13 41c3-2 6-3 10-3"/></svg>',
  vo2: '<svg viewBox="0 0 48 48"><path d="M6 16h18M3 24h22M7 32h16"/><path d="M30 10c8 2 12 8 12 14s-4 12-12 14" /><path d="M30 18c4 1 6 3 6 6s-2 5-6 6"/></svg>',
  penguin: '<svg viewBox="0 0 48 48"><ellipse cx="24" cy="26" rx="13" ry="17" class="f"/><ellipse cx="26" cy="29" rx="7" ry="11" fill="#fff" stroke="none"/><path d="m33 19 8 3-8 2z" fill="#ffb03a" stroke="none"/><circle cx="29" cy="17" r="2" fill="#fff" stroke="none"/></svg>',
};

const STICK_R = 56;      // jak daleko jde páčka od středu (CSS px)
const STICK_DEAD = 0.18; // mrtvá zóna pro běh
const STICK_JUMP = 0.58; // páčka nahoru = skok

/*
 * Dotykové ovládání: plovoucí joystick (kde se palec dotkne, tam se objeví)
 * a tlačítka Střela a Super. Strany lze prohodit (Touch.swap).
 */
const Touch = {
  root: null,
  enabled: false,
  swap: false,
  ptrs: new Map(), // pointerId -> { kind: 'stick'|'btn', ref }
  stick: null,
  btns: [],
  onEnable: null,

  init(root) {
    this.root = root;
    this.enabled = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    window.addEventListener('touchstart', () => {
      if (this.enabled) return;
      this.enabled = true;
      if (this.onEnable) this.onEnable();
    }, { passive: true });

    root.addEventListener('pointerdown', (e) => this.down(e));
    root.addEventListener('pointermove', (e) => this.move(e));
    const end = (e) => this.up(e);
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
    root.addEventListener('lostpointercapture', end);
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  build() {
    this.root.textContent = '';
    this.btns = [];
    this.ptrs.clear();
    this.root.classList.toggle('swap', this.swap);
    const mk = (cls, parent = this.root) => {
      const el = document.createElement('div');
      el.className = cls;
      parent.appendChild(el);
      return el;
    };
    const zone = mk('stick-zone');
    const base = mk('stick-base', zone);
    const knob = mk('stick-knob', base);
    mk('stick-arrow up', base);
    mk('stick-arrow left', base);
    mk('stick-arrow right', base);
    zone.dataset.stick = '1';
    this.stick = { zone, base, knob, active: false, ox: 0, oy: 0 };
    const pad = mk('action-pad');
    const addBtn = (act, label) => {
      const el = mk(`tbtn ${act}`, pad);
      el.innerHTML = TOUCH_ICONS[act] + `<span class="lbl">${label}</span>`;
      el.dataset.btn = String(this.btns.length);
      this.btns.push({ el, act, on: false });
      return el;
    };
    this._charge = this._color = this._power = null;
    this.superEl = addBtn('super', 'Super');
    addBtn('kick', 'Střela');
    this.restStick();
    Input.clear();
  },

  // Nabití superstřely (0..1) – kroužek kolem tlačítka.
  setCharge(c) {
    if (!this.superEl) return;
    const v = Math.round(clamp(c, 0, 1) * 100);
    if (v === this._charge) return;
    this._charge = v;
    this.superEl.style.setProperty('--charge', `${v}%`);
    this.superEl.classList.toggle('full', v >= 100);
  },

  // Ikona a název superschopnosti podle postavy.
  setPower(kind) {
    if (!this.superEl || kind === this._power) return;
    this._power = kind;
    const icon = TOUCH_ICONS[kind] || TOUCH_ICONS.super;
    const label = (POWERS[kind] || POWERS.shot).short;
    this.superEl.innerHTML = icon + `<span class="lbl">${label}</span>`;
  },

  // Barva superstřely podle postavy, za kterou hraju.
  setColor(col) {
    if (!this.superEl || col === this._color) return;
    this._color = col;
    this.superEl.style.setProperty('--sc', col);
  },

  restStick() {
    const st = this.stick;
    if (!st) return;
    st.active = false;
    st.base.classList.remove('on');
    st.base.style.left = '';
    st.base.style.top = '';
    st.knob.style.transform = 'translate(-50%, -50%)';
    Input.touch.move = 0;
    Input.touch.jump = false;
    Input.touch.down = false;
    Input.touch.my = 0;
  },

  // Penalty: střelec má jen tlačítko, brankář jen joystick; obojí na straně bez brány.
  setPen(role, goalRight) {
    const r = this.root;
    if (!r) return;
    const key = role ? role + (goalRight ? 'R' : 'L') : '';
    if (key === this._pen) return;
    this._pen = key;
    r.classList.toggle('pen-shoot', role === 'shoot');
    r.classList.toggle('pen-keep', role === 'keep');
    r.classList.toggle('pen-watch', role === 'watch');
    r.classList.toggle('pen-gr', !!role && goalRight);
    r.classList.toggle('pen-gl', !!role && !goalRight);
    const kick = this.btns.find((b) => b.act === 'kick');
    if (kick) {
      const lbl = kick.el.querySelector('.lbl');
      if (lbl) lbl.textContent = role === 'keep' ? 'Skok' : 'Střela';
    }
    this.reset();
  },

  down(e) {
    const stickEl = e.target.closest('[data-stick]');
    const btnEl = e.target.closest('[data-btn]');
    if (!stickEl && !btnEl) return;
    e.preventDefault();
    try { e.target.setPointerCapture(e.pointerId); } catch (err) { /* nevadí */ }
    if (btnEl) {
      const b = this.btns[Number(btnEl.dataset.btn)];
      this.ptrs.set(e.pointerId, { kind: 'btn', ref: b });
      this.setBtn(b, true);
      return;
    }
    const st = this.stick;
    if (st.active) return;
    const zr = st.zone.getBoundingClientRect();
    st.ox = clamp(e.clientX, zr.left + STICK_R + 6, zr.right - STICK_R - 6);
    st.oy = clamp(e.clientY, zr.top + STICK_R + 6, zr.bottom - STICK_R - 6);
    st.active = true;
    st.base.classList.add('on');
    st.base.style.left = `${st.ox - zr.left}px`;
    st.base.style.top = `${st.oy - zr.top}px`;
    this.ptrs.set(e.pointerId, { kind: 'stick', ref: st });
    this.moveStick(e.clientX, e.clientY);
  },

  move(e) {
    const p = this.ptrs.get(e.pointerId);
    if (!p) return;
    if (p.kind === 'stick') this.moveStick(e.clientX, e.clientY);
  },

  up(e) {
    const p = this.ptrs.get(e.pointerId);
    if (!p) return;
    this.ptrs.delete(e.pointerId);
    if (p.kind === 'stick') this.restStick();
    else this.setBtn(p.ref, false);
  },

  moveStick(x, y) {
    const st = this.stick;
    let dx = x - st.ox, dy = y - st.oy;
    const d = Math.hypot(dx, dy);
    if (d > STICK_R) {
      dx *= STICK_R / d;
      dy *= STICK_R / d;
    }
    st.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    let mx = dx / STICK_R;
    mx = Math.abs(mx) < STICK_DEAD ? 0 : (mx - Math.sign(mx) * STICK_DEAD) / (1 - STICK_DEAD);
    Input.touch.move = clamp(mx * 1.15, -1, 1);
    Input.touch.jump = dy / STICK_R < -STICK_JUMP;
    Input.touch.down = dy / STICK_R > STICK_JUMP;
    Input.touch.my = clamp(dy / STICK_R, -1, 1);
    st.base.classList.toggle('jump', Input.touch.jump);
  },

  setBtn(b, on) {
    if (b.on === on) return;
    b.on = on;
    b.el.classList.toggle('on', on);
    if (!on) return;
    if (b.act === 'kick') Input.kickQ = true;
    else Input.superQ = true;
    if (navigator.vibrate) {
      try { navigator.vibrate(b.act === 'super' ? 25 : 10); } catch (err) { /* nevadí */ }
    }
  },

  reset() {
    this.ptrs.clear();
    this.restStick();
    for (const b of this.btns) this.setBtn(b, false);
  },

  show(v) {
    if (!this.root) return;
    this.root.hidden = !(v && this.enabled);
    if (!v) this.reset();
  },
};
