'use strict';
/*
 * Ovládání. Každý člověk u hry má svůj slot: 0 = hráč 1, 1 = hráč 2.
 * Když hraje jen jeden člověk, fungují mu obě sady kláves.
 */

const KEYMAP = {
  KeyA: [0, 'left'], KeyD: [0, 'right'], KeyW: [0, 'jump'], KeyS: [0, 'kick'], Space: [0, 'kick'],
  ArrowLeft: [1, 'left'], ArrowRight: [1, 'right'], ArrowUp: [1, 'jump'], ArrowDown: [1, 'kick'],
  Enter: [1, 'kick'], NumpadEnter: [1, 'kick'], Numpad0: [1, 'kick'],
};

const mkPad = () => ({ left: false, right: false, jump: false, kick: false });

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

  intent(slot) {
    const o = this.out[slot];
    o.left = o.right = o.jump = false;
    for (const code of this.held) {
      const m = this.map(code);
      if (m && m[0] === slot && m[1] !== 'kick') o[m[1]] = true;
    }
    const t = this.touch[slot];
    o.left = o.left || t.left;
    o.right = o.right || t.right;
    o.jump = o.jump || t.jump;
    o.kick = this.queued[slot];
    this.queued[slot] = false;
    return o;
  },

  clear() {
    this.held.clear();
    this.queued[0] = this.queued[1] = false;
    for (const t of this.touch) t.left = t.right = t.jump = t.kick = false;
  },
};

const TOUCH_ICONS = {
  left: '<svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
  jump: '<svg viewBox="0 0 24 24"><path d="M12 20V6M6 11l6-6 6 6"/></svg>',
  kick: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="m12 8.2 3.6 2.6-1.4 4.2H9.8l-1.4-4.2z"/></svg>',
};
const TOUCH_LABELS = { left: 'Doleva', right: 'Doprava', jump: 'Skok', kick: 'Kop' };

// Dotyková tlačítka. Prst se může mezi tlačítky posouvat.
const Touch = {
  root: null,
  enabled: false,
  ptrs: new Map(),
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

    root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { e.target.setPointerCapture(e.pointerId); } catch (err) { /* nevadí */ }
      this.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      this.update();
    });
    root.addEventListener('pointermove', (e) => {
      if (!this.ptrs.has(e.pointerId)) return;
      this.ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      this.update();
    });
    const end = (e) => {
      if (this.ptrs.delete(e.pointerId)) this.update();
    };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
    root.addEventListener('lostpointercapture', end);
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  build(dual) {
    this.root.textContent = '';
    this.btns = [];
    this.ptrs.clear();
    this.root.classList.toggle('dual', dual);
    const left = document.createElement('div');
    const right = document.createElement('div');
    left.className = 'cluster l';
    right.className = 'cluster r';
    const add = (parent, slot, act) => {
      const el = document.createElement('div');
      el.className = `tbtn ${act} s${slot}`;
      el.innerHTML = TOUCH_ICONS[act];
      el.title = TOUCH_LABELS[act];
      parent.appendChild(el);
      this.btns.push({ el, slot, act, on: false });
    };
    if (dual) {
      ['left', 'right', 'jump', 'kick'].forEach((a) => add(left, 0, a));
      ['left', 'right', 'jump', 'kick'].forEach((a) => add(right, 1, a));
    } else {
      add(left, 0, 'left');
      add(left, 0, 'right');
      add(right, 0, 'jump');
      add(right, 0, 'kick');
    }
    this.root.append(left, right);
    Input.clear();
  },

  update() {
    for (const b of this.btns) {
      const r = b.el.getBoundingClientRect();
      let on = false;
      for (const [x, y] of this.ptrs.values()) {
        if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8) {
          on = true;
          break;
        }
      }
      if (on === b.on) continue;
      b.on = on;
      b.el.classList.toggle('on', on);
      Input.touch[b.slot][b.act] = on;
      if (on && b.act === 'kick') Input.queued[b.slot] = true;
    }
  },

  reset() {
    this.ptrs.clear();
    this.update();
  },

  show(v) {
    if (!this.root) return;
    this.root.hidden = !(v && this.enabled);
    if (!v) this.reset();
  },
};
