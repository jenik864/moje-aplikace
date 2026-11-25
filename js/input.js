'use strict';
/*
 * Ovládání. Každý člověk u zařízení má svůj slot: 0 = hráč 1, 1 = hráč 2.
 * Když na zařízení hraje jen jeden člověk, fungují mu obě sady kláves.
 */

const KEYMAP = {
  KeyA: [0, 'left'], KeyD: [0, 'right'], KeyW: [0, 'jump'], KeyS: [0, 'kick'], Space: [0, 'kick'],
  ArrowLeft: [1, 'left'], ArrowRight: [1, 'right'], ArrowUp: [1, 'jump'], ArrowDown: [1, 'kick'],
  Enter: [1, 'kick'], NumpadEnter: [1, 'kick'], Numpad0: [1, 'kick'],
};

const mkPad = () => ({ left: false, right: false, jump: false, kick: false, move: 0 });

const Input = {
  shared: true,
  held: new Set(),
  queued: [false, false],
  touch: [mkPad(), mkPad()],
  out: [mkPad(), mkPad()],

  map(code) {
    const m = KEYMAP[code];
    if (!m) return null;
    return this.shared ? [0, m[1]] : m;
  },

  down(code, repeat) {
    const m = this.map(code);
    if (!m) return false;
    this.held.add(code);
    if (m[1] === 'kick' && !repeat) this.queued[m[0]] = true;
    return true;
  },

  up(code) {
    this.held.delete(code);
  },

  // Stav ovládání pro jeden slot. Kop je jednorázový (zmáčknutí), ostatní se drží.
  intent(slot) {
    const o = this.out[slot];
    let l = false, r = false, j = false;
    for (const code of this.held) {
      const m = this.map(code);
      if (!m || m[0] !== slot) continue;
      if (m[1] === 'left') l = true;
      else if (m[1] === 'right') r = true;
      else if (m[1] === 'jump') j = true;
    }
    const t = this.touch[slot];
    o.move = Math.abs(t.move) > 0.01 ? t.move : (r ? 1 : 0) - (l ? 1 : 0);
    o.left = o.move < -0.01;
    o.right = o.move > 0.01;
    o.jump = j || t.jump;
    o.kick = this.queued[slot];
    this.queued[slot] = false;
    return o;
  },

  clear() {
    this.held.clear();
    this.queued[0] = this.queued[1] = false;
    for (const t of this.touch) {
      t.left = t.right = t.jump = t.kick = false;
      t.move = 0;
    }
  },
};

const TOUCH_ICONS = {
  jump: '<svg viewBox="0 0 24 24"><path d="M12 20V6M6 11l6-6 6 6"/></svg>',
  kick: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="m12 8.2 3.6 2.6-1.4 4.2H9.8l-1.4-4.2z"/></svg>',
};

const STICK_R = 54;      // jak daleko jde páčka od středu (CSS px)
const STICK_DEAD = 0.18; // mrtvá zóna pro běh
const STICK_JUMP = 0.6;  // páčka nahoru = skok

/*
 * Dotykové ovládání: plovoucí joystick (kde se prst dotkne, tam se objeví)
 * a tlačítka KOP a SKOK. Při dvou hráčích na jednom telefonu má každý
 * joystick a kop na své polovině displeje.
 */
const Touch = {
  root: null,
  enabled: false,
  ptrs: new Map(), // pointerId -> { kind: 'stick'|'btn', ref }
  sticks: [],
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

  build(dual) {
    this.root.textContent = '';
    this.sticks = [];
    this.btns = [];
    this.ptrs.clear();
    this.root.classList.toggle('dual', dual);
    const mk = (cls, parent = this.root) => {
      const el = document.createElement('div');
      el.className = cls;
      parent.appendChild(el);
      return el;
    };
    const addStick = (slot, side) => {
      const zone = mk(`stick-zone ${side}`);
      const base = mk('stick-base', zone);
      const knob = mk('stick-knob', base);
      const st = { slot, side, zone, base, knob, active: false, ox: 0, oy: 0 };
      zone.dataset.stick = String(this.sticks.length);
      this.sticks.push(st);
      this.restStick(st);
    };
    const addBtn = (slot, act, cls) => {
      const el = mk(`tbtn ${act} ${cls}`);
      el.innerHTML = TOUCH_ICONS[act];
      el.title = act === 'kick' ? 'Kop' : 'Skok';
      el.dataset.btn = String(this.btns.length);
      this.btns.push({ el, slot, act, on: false });
    };
    if (dual) {
      addStick(0, 'l');
      addStick(1, 'r');
      addBtn(0, 'kick', 'p1k');
      addBtn(1, 'kick', 'p2k');
    } else {
      addStick(0, 'l');
      addBtn(0, 'jump', 'single-jump');
      addBtn(0, 'kick', 'single-kick');
    }
    Input.clear();
  },

  restStick(st) {
    st.active = false;
    st.base.classList.remove('on');
    st.base.style.left = '';
    st.base.style.top = '';
    st.knob.style.transform = 'translate(-50%, -50%)';
    const pad = Input.touch[st.slot];
    pad.move = 0;
    pad.jump = this.btns.some((b) => b.on && b.slot === st.slot && b.act === 'jump');
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
    const st = this.sticks[Number(stickEl.dataset.stick)];
    if (st.active) return;
    const zr = st.zone.getBoundingClientRect();
    // střed joysticku tam, kam se prst dotkl (ale ne přes okraj)
    st.ox = clamp(e.clientX, zr.left + STICK_R + 6, zr.right - STICK_R - 6);
    st.oy = clamp(e.clientY, zr.top + STICK_R + 6, zr.bottom - STICK_R - 6);
    st.active = true;
    st.base.classList.add('on');
    st.base.style.left = `${st.ox - zr.left}px`;
    st.base.style.top = `${st.oy - zr.top}px`;
    this.ptrs.set(e.pointerId, { kind: 'stick', ref: st });
    this.moveStick(st, e.clientX, e.clientY);
  },

  move(e) {
    const p = this.ptrs.get(e.pointerId);
    if (!p) return;
    if (p.kind === 'stick') {
      this.moveStick(p.ref, e.clientX, e.clientY);
    } else {
      const r = p.ref.el.getBoundingClientRect();
      const inside = e.clientX >= r.left - 14 && e.clientX <= r.right + 14 && e.clientY >= r.top - 14 && e.clientY <= r.bottom + 14;
      this.setBtn(p.ref, inside);
    }
  },

  up(e) {
    const p = this.ptrs.get(e.pointerId);
    if (!p) return;
    this.ptrs.delete(e.pointerId);
    if (p.kind === 'stick') this.restStick(p.ref);
    else this.setBtn(p.ref, false);
  },

  moveStick(st, x, y) {
    let dx = x - st.ox, dy = y - st.oy;
    const d = Math.hypot(dx, dy);
    if (d > STICK_R) {
      dx *= STICK_R / d;
      dy *= STICK_R / d;
    }
    st.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const pad = Input.touch[st.slot];
    let mx = dx / STICK_R;
    mx = Math.abs(mx) < STICK_DEAD ? 0 : (mx - Math.sign(mx) * STICK_DEAD) / (1 - STICK_DEAD);
    pad.move = clamp(mx * 1.15, -1, 1);
    const jumpBtn = this.btns.some((b) => b.on && b.slot === st.slot && b.act === 'jump');
    pad.jump = dy / STICK_R < -STICK_JUMP || jumpBtn;
  },

  setBtn(b, on) {
    if (b.on === on) return;
    b.on = on;
    b.el.classList.toggle('on', on);
    const pad = Input.touch[b.slot];
    if (b.act === 'kick') {
      pad.kick = on;
      if (on) Input.queued[b.slot] = true;
    } else {
      pad.jump = on;
    }
  },

  reset() {
    this.ptrs.clear();
    for (const st of this.sticks) this.restStick(st);
    for (const b of this.btns) this.setBtn(b, false);
  },

  show(v) {
    if (!this.root) return;
    this.root.hidden = !(v && this.enabled);
    if (!v) this.reset();
  },
};
