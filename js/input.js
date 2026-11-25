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
  touch: { move: 0, jump: false },
  out: { left: false, right: false, jump: false, kick: false, super: false, move: 0 },

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
  },
};

const TOUCH_ICONS = {
  kick: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="15"/><path d="m24 15.5 7.2 5.2-2.8 8.4h-8.8l-2.8-8.4z" class="f"/><path d="M24 9v6.5M38.3 19.4l-7.1 1.3M33 36.2l-4.6-7.1M15 36.2l4.6-7.1M9.7 19.4l7.1 1.3"/></svg>',
  super: '<svg viewBox="0 0 48 48"><path d="M27 5 11 27h11l-3 16 17-23H25z" class="f"/></svg>',
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
    this._charge = this._color = null;
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
