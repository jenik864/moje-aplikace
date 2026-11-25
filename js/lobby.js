'use strict';
/*
 * Lobby: výběr hráčů. Každé místo v zápase (slot) má tým, postavu a kdo ho ovládá:
 *   'cpu' – počítač, 'p1'/'p2' – hráč 1/2 na tomto zařízení,
 *   'host' – hostitel online hry, jinak id kamaráda online.
 */

function makeSlots(format, prev) {
  const humans = prev ? prev.slots.filter((s) => s.ctrl !== 'cpu').map((s) => ({ ctrl: s.ctrl, char: s.char })) : [];
  let slots;
  if (format === '2v2') {
    slots = [
      { team: 0, char: DUO_TEAMS[0].chars[0] },
      { team: 0, char: DUO_TEAMS[0].chars[1] },
      { team: 1, char: DUO_TEAMS[1].chars[0] },
      { team: 1, char: DUO_TEAMS[1].chars[1] },
    ];
  } else {
    const old = prev && prev.format === '1v1' ? prev.slots : null;
    slots = [
      { team: 0, char: old ? old[0].char : 'nelcis' },
      { team: 1, char: old ? old[1].char : 'marsal' },
    ];
  }
  slots.forEach((s) => { s.ctrl = 'cpu'; });
  // lidé zůstanou ve hře; první dva proti sobě
  const order = format === '2v2' ? [0, 2, 1, 3] : [0, 1];
  humans.forEach((h, i) => {
    if (i >= order.length) return;
    const s = slots[order[i]];
    s.ctrl = h.ctrl;
    if (format === '1v1' && !(prev && prev.format === '1v1')) s.char = h.char;
  });
  return slots;
}

function newLobby(prefs, firstCtrl) {
  const lobby = {
    format: prefs.format === '1v1' ? '1v1' : '2v2',
    minutes: [1, 2, 3].includes(prefs.minutes) ? prefs.minutes : 2,
    level: AI_LEVELS[prefs.level] ? prefs.level : 'medium',
    slots: [],
  };
  lobby.slots = makeSlots(lobby.format, null);
  if (lobby.format === '1v1' && Array.isArray(prefs.chars)) {
    prefs.chars.forEach((c, i) => {
      if (lobby.slots[i] && ROSTER.some((r) => r.id === c)) lobby.slots[i].char = c;
    });
  }
  if (firstCtrl) lobby.slots[0].ctrl = firstCtrl;
  return lobby;
}

function claimSlot(lobby, ctrl, slot) {
  const s = lobby.slots[slot];
  if (!s || (s.ctrl !== 'cpu' && s.ctrl !== ctrl)) return false;
  lobby.slots.forEach((o) => { if (o.ctrl === ctrl) o.ctrl = 'cpu'; });
  s.ctrl = ctrl;
  return true;
}

function releaseCtrl(lobby, ctrl) {
  let changed = false;
  lobby.slots.forEach((o) => {
    if (o.ctrl === ctrl) {
      o.ctrl = 'cpu';
      changed = true;
    }
  });
  return changed;
}

function cycleChar(id, d) {
  const i = ROSTER.findIndex((c) => c.id === id);
  return ROSTER[(i + d + ROSTER.length) % ROSTER.length].id;
}

// Hostitel zpracuje přání kamaráda (vybrat místo nebo postavu).
function applyWant(lobby, uid, want) {
  if (!want || typeof want !== 'object') return false;
  let changed = false;
  if (want.slot === -1) changed = releaseCtrl(lobby, uid);
  else if (Number.isInteger(want.slot)) changed = claimSlot(lobby, uid, want.slot) || changed;
  if (lobby.format === '1v1' && typeof want.char === 'string' && ROSTER.some((c) => c.id === want.char)) {
    const mine = lobby.slots.find((s) => s.ctrl === uid);
    if (mine && mine.char !== want.char) {
      mine.char = want.char;
      changed = true;
    }
  }
  return changed;
}

// Týmy pro zápas podle lobby.
function teamsFor(lobby) {
  if (lobby.format === '2v2') return DUO_TEAMS.map((t) => ({ ...t }));
  return [0, 1].map((i) => {
    const c = charById(lobby.slots[i].char);
    return { name: c.name.toUpperCase(), short: c.name, girls: !!c.girl, ...SIDE_COLORS[i] };
  });
}

/* ---------------- obrazovka lobby ---------------- */

const LobbyUI = {
  el: {},
  ctx: null, // { mode, me, members, canEdit }
  onAction: null,

  init() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      slots: $('slots'), hint: $('lobby-hint'), code: $('lobby-code'), codeBox: $('lobby-code-box'),
      kicker: $('lobby-kicker'), members: $('lobby-members'), start: $('btn-start'), wait: $('lobby-wait'),
      levelRow: $('lobby-level'),
    };
    document.querySelectorAll('#lobby .seg').forEach((seg) => {
      seg.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-v]');
        if (!b || b.disabled) return;
        const key = seg.dataset.key;
        const v = key === 'minutes' ? Number(b.dataset.v) : b.dataset.v;
        if (this.onAction) this.onAction({ type: 'setting', key, value: v });
      });
    });
    this.el.slots.addEventListener('click', (e) => {
      const arr = e.target.closest('button[data-d]');
      if (arr) {
        if (this.onAction) this.onAction({ type: 'char', slot: Number(arr.dataset.slot), d: Number(arr.dataset.d) });
        return;
      }
      const main = e.target.closest('button[data-slot]');
      if (main && this.onAction) this.onAction({ type: 'slot', slot: Number(main.dataset.slot) });
    });
  },

  badge(ctrl, ctx) {
    if (ctrl === 'cpu') return { text: 'CPU', cls: 'b-cpu' };
    if (ctx.mode === 'local') return ctrl === 'p1' ? { text: 'HRÁČ 1', cls: 'b-p1' } : { text: 'HRÁČ 2', cls: 'b-p2' };
    if (ctrl === ctx.me) return { text: 'TY', cls: 'b-me' };
    const m = ctx.members.find((x) => x.uid === ctrl);
    return { text: (m && m.name) || (ctrl === 'host' ? 'Hostitel' : 'Kamarád'), cls: 'b-friend' };
  },

  render(lobby, ctx) {
    this.ctx = ctx;
    const el = this.el;
    // nastavení
    document.querySelectorAll('#lobby .seg').forEach((seg) => {
      const key = seg.dataset.key;
      seg.querySelectorAll('button[data-v]').forEach((b) => {
        b.setAttribute('aria-pressed', String(String(lobby[key]) === b.dataset.v));
        b.disabled = !ctx.canEdit;
      });
    });
    el.levelRow.hidden = !lobby.slots.some((s) => s.ctrl === 'cpu');

    // hlavička
    if (ctx.mode === 'local') {
      el.kicker.textContent = 'Výběr hráčů';
      el.codeBox.hidden = true;
      el.members.hidden = true;
    } else {
      el.kicker.textContent = ctx.mode === 'host' ? 'Online hra · pošli kamarádům kód' : 'Online hra';
      el.codeBox.hidden = false;
      el.code.textContent = Online.code;
      el.members.hidden = false;
      el.members.textContent = 'Ve hře: ' + ctx.members.map((m) => (m.uid === ctx.me ? `${m.name || 'ty'} (ty)` : m.name || 'Kamarád')).join(', ');
    }

    // karty
    const teams = teamsFor(lobby);
    el.slots.textContent = '';
    el.slots.className = `slots fmt-${lobby.format}`;
    const cards = [];
    for (let team = 0; team < 2; team++) {
      if (team === 1) {
        const vs = document.createElement('div');
        vs.className = 'vs';
        vs.textContent = 'VS';
        el.slots.appendChild(vs);
      }
      const T = teams[team];
      const box = document.createElement('div');
      box.className = 'team';
      box.style.setProperty('--team', T.color);
      if (lobby.format === '2v2') {
        const tn = document.createElement('p');
        tn.className = 'team-name';
        tn.textContent = T.name;
        box.appendChild(tn);
      }
      const row = document.createElement('div');
      row.className = 'cards';
      lobby.slots.forEach((s, i) => {
        if (s.team !== team) return;
        const c = charById(s.char);
        const b = this.badge(s.ctrl, ctx);
        const card = document.createElement('div');
        card.className = 'card' + (s.ctrl === 'cpu' ? '' : ' taken') + (b.cls === 'b-me' || (ctx.mode === 'local' && s.ctrl !== 'cpu') ? ' mine' : '');
        const main = document.createElement('button');
        main.type = 'button';
        main.className = 'card-main';
        main.dataset.slot = String(i);
        main.setAttribute('aria-label', `${c.name}, hraje ${b.text}`);
        const cv = document.createElement('canvas');
        cv.className = 'portrait';
        const nm = document.createElement('span');
        nm.className = 'card-name';
        nm.textContent = c.name;
        main.append(cv, nm);
        const bd = document.createElement('span');
        bd.className = `badge ${b.cls}`;
        bd.textContent = b.text;
        card.append(main, bd);
        const canChar = lobby.format === '1v1' && (ctx.mode === 'local' || s.ctrl === ctx.me || (ctx.mode === 'host' && s.ctrl === 'cpu'));
        if (canChar) {
          const arrows = document.createElement('div');
          arrows.className = 'arrows';
          for (const d of [-1, 1]) {
            const a = document.createElement('button');
            a.type = 'button';
            a.className = 'arr';
            a.dataset.slot = String(i);
            a.dataset.d = String(d);
            a.setAttribute('aria-label', d < 0 ? 'Předchozí postava' : 'Další postava');
            a.textContent = d < 0 ? '‹' : '›';
            arrows.appendChild(a);
          }
          card.appendChild(arrows);
        }
        row.appendChild(card);
        cards.push({ cv, char: s.char, T, facing: team === 0 ? 1 : -1 });
      });
      box.appendChild(row);
      el.slots.appendChild(box);
    }
    requestAnimationFrame(() => cards.forEach((o) => Renderer.portrait(o.cv, o.char, o.T, o.facing)));

    // nápověda a tlačítka
    if (ctx.mode === 'local') {
      el.hint.textContent = 'Klepni na postavu, kterou má hrát druhý hráč na tomto zařízení. Další klepnutí ji vrátí počítači.';
    } else if (ctx.mode === 'host') {
      el.hint.textContent = 'Klepni na postavu, za kterou chceš hrát. Kamarádi si vyberou na svém telefonu. Volná místa hraje počítač.';
    } else {
      el.hint.textContent = 'Klepni na volnou postavu (CPU), za kterou chceš hrát.';
    }
    el.start.hidden = ctx.mode === 'guest';
    el.start.textContent = ctx.mode === 'host' ? 'Spustit zápas' : 'Hrát';
    el.wait.hidden = ctx.mode !== 'guest';
  },
};
