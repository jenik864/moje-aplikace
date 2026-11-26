'use strict';
/*
 * Lobby: výběr hráčů. Každé místo v zápase (slot) má tým, postavu a kdo ho ovládá:
 *   'cpu' – počítač, 'p1' – hráč na tomto zařízení,
 *   'host' – hostitel online hry, jinak id kamaráda online.
 * Ve 2 v 2 se vybírají dvě dvojice (lobby.duos), v 1 v 1 libovolné postavy.
 */

function duoSlots(duos) {
  return [
    { team: 0, char: DUO_TEAMS[duos[0]].chars[0] },
    { team: 0, char: DUO_TEAMS[duos[0]].chars[1] },
    { team: 1, char: DUO_TEAMS[duos[1]].chars[0] },
    { team: 1, char: DUO_TEAMS[duos[1]].chars[1] },
  ];
}

function validDuos(d) {
  const ok = Array.isArray(d) && d.length === 2 && d.every((i) => Number.isInteger(i) && i >= 0 && i < DUO_TEAMS.length) && d[0] !== d[1];
  return ok ? d.slice() : [0, 1];
}

function makeSlots(format, prev, duos) {
  const humans = prev ? prev.slots.filter((s) => s.ctrl !== 'cpu').map((s) => ({ ctrl: s.ctrl, char: s.char })) : [];
  let slots;
  if (format === '2v2') {
    slots = duoSlots(duos);
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
    mode: prefs.mode === 'cup' && (firstCtrl === 'p1' || firstCtrl === 'host') ? 'cup' : 'match', // zápas nebo turnaj
    format: prefs.format === '1v1' ? '1v1' : '2v2',
    minutes: [1, 2, 3].includes(prefs.minutes) ? prefs.minutes : 2,
    level: AI_LEVELS[prefs.level] ? prefs.level : 'medium',
    arena: validArena(prefs.arena),
    duos: validDuos(prefs.duos),
    slots: [],
  };
  lobby.slots = makeSlots(lobby.format, null, lobby.duos);
  if (lobby.format === '1v1' && Array.isArray(prefs.chars)) {
    prefs.chars.forEach((c, i) => {
      if (lobby.slots[i] && ROSTER.some((r) => r.id === c && charAvailable(r))) lobby.slots[i].char = c;
    });
  }
  if (firstCtrl) lobby.slots[0].ctrl = firstCtrl;
  return lobby;
}

// Přepnout dvojici na jedné straně (nesmí být stejná jako na druhé).
function cycleDuo(lobby, side, d) {
  let i = lobby.duos[side];
  do {
    i = (i + d + DUO_TEAMS.length) % DUO_TEAMS.length;
  } while (i === lobby.duos[1 - side]);
  lobby.duos[side] = i;
  if (lobby.format === '2v2') {
    const fresh = duoSlots(lobby.duos);
    lobby.slots.forEach((s, k) => { s.char = fresh[k].char; });
  }
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

// Další postava. V lobby jsou vidět i zamčené (se zámečkem), v příběhu jen hratelné.
function cycleChar(id, d, playable) {
  const ok = (c) => (playable ? charAvailable(c) : charListed(c));
  const list = ROSTER.filter((c) => ok(c) || c.id === id);
  const i = list.findIndex((c) => c.id === id);
  let j = (i + d + list.length) % list.length;
  for (let k = 0; k < list.length && !ok(list[j]); k++) j = (j + d + list.length) % list.length;
  return list[j].id;
}

// Zamčené postavy v lobby (hrát se nedá, dokud je neodemkneš v příběhu).
function lobbyLocked(lobby) {
  return lobby.slots.some((s) => !charAvailable(charById(s.char)));
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

/* ---------------- turnaj: pavouk pro 4 týmy (semifinále a finále) ---------------- */

// Oba týmy z lobby (i s lidmi, kteří za ně hrají) + 2 vylosované týmy počítače.
// Semifinále: tým 1 – tým 3 a tým 2 – tým 4, ve finále se můžou potkat kamarádi.
function newCup(lobby) {
  const cup = { format: lobby.format, minutes: lobby.minutes, level: lobby.level, arena: validArena(lobby.arena), teams: [], res: { s1: null, s2: null, f: null }, stage: 's1' };
  const ctrls = (team) => lobby.slots.filter((s) => s.team === team).map((s) => s.ctrl);
  if (lobby.format === '2v2') {
    const used = [lobby.duos[0], lobby.duos[1]];
    const rest = shuffle(DUO_TEAMS.map((d, i) => i).filter((i) => !used.includes(i) && !DUO_TEAMS[i].locked)).slice(0, 2);
    cup.teams = [
      { duo: used[0], ctrls: ctrls(0) }, { duo: used[1], ctrls: ctrls(1) },
      { duo: rest[0], ctrls: ['cpu', 'cpu'] }, { duo: rest[1], ctrls: ['cpu', 'cpu'] },
    ];
  } else {
    const chars = [lobby.slots[0].char, lobby.slots[1].char];
    const rest = shuffle(ROSTER.filter((c) => !c.locked && !chars.includes(c.id)).map((c) => c.id)).slice(0, 2);
    cup.teams = [
      { char: chars[0], ctrls: ctrls(0) }, { char: chars[1], ctrls: ctrls(1) },
      { char: rest[0], ctrls: ['cpu'] }, { char: rest[1], ctrls: ['cpu'] },
    ];
  }
  return cup;
}

const CUP_PAIRS = { s1: [0, 2], s2: [1, 3] };
const CUP_NEXT = { s1: 's2', s2: 'f', f: 'done' };

// Kdo hraje zápas `key` (indexy týmů).
function cupPair(cup, key) {
  return key === 'f' ? [cupWinner(cup, 's1'), cupWinner(cup, 's2')] : CUP_PAIRS[key];
}

// Jméno, postavy a barvy týmu v turnaji.
function cupTeam(cup, i) {
  const t = cup.teams[i];
  if (t.duo !== undefined) {
    const d = DUO_TEAMS[t.duo];
    return { name: d.name, chars: d.chars.slice(), T: d };
  }
  const c = charById(t.char), d = duoOf(c.id);
  return { name: c.name.toUpperCase(), chars: [c.id], T: d >= 0 ? DUO_TEAMS[d] : c.kit || SIDE_COLORS[i % 2] };
}

// Kdo vyhrál zápas v pavouku (index týmu) nebo -1.
function cupWinner(cup, key) {
  const r = cup.res[key];
  if (!r) return -1;
  const pair = key === 'f' ? [cupWinner(cup, 's1'), cupWinner(cup, 's2')] : CUP_PAIRS[key];
  return r[0] > r[1] ? pair[0] : pair[1];
}

// Hraje za tým aspoň jeden člověk?
function cupHuman(cup, i) {
  return i >= 0 && cup.teams[i].ctrls.some((c) => c !== 'cpu');
}

// Lobby pro zápas `key` (první tým vlevo). Ve finále je počítač o stupeň těžší.
function cupLobby(cup, key) {
  const levels = ['easy', 'medium', 'hard'];
  const level = key === 'f' ? levels[Math.min(2, levels.indexOf(cup.level) + 1)] : cup.level;
  const [a, b] = cupPair(cup, key);
  const A = cup.teams[a], B = cup.teams[b];
  if (cup.format === '2v2') {
    const lobby = { format: '2v2', minutes: cup.minutes, level, arena: validArena(cup.arena), duos: [A.duo, B.duo], slots: duoSlots([A.duo, B.duo]) };
    lobby.slots.forEach((s, k) => { s.ctrl = (k < 2 ? A.ctrls[k] : B.ctrls[k - 2]) || 'cpu'; });
    return lobby;
  }
  return { format: '1v1', minutes: cup.minutes, level, arena: validArena(cup.arena), duos: [0, 1], slots: [{ team: 0, char: A.char, ctrl: A.ctrls[0] || 'cpu' }, { team: 1, char: B.char, ctrl: B.ctrls[0] || 'cpu' }] };
}

// Turnaj od hostitele (nedůvěryhodná data).
function sanitizeCup(c) {
  if (!c || typeof c !== 'object' || !Array.isArray(c.teams) || c.teams.length !== 4) return null;
  const two = c.format === '2v2';
  const res = (r) => (Array.isArray(r) && r.length === 2 ? [Number(r[0]) || 0, Number(r[1]) || 0] : null);
  const teams = c.teams.map((t) => {
    const ctrls = Array.isArray(t && t.ctrls) ? t.ctrls.slice(0, 2).map((x) => (typeof x === 'string' ? x.slice(0, 16) : 'cpu')) : ['cpu'];
    if (two) {
      const d = Number(t && t.duo);
      return { duo: Number.isInteger(d) && d >= 0 && d < DUO_TEAMS.length ? d : 0, ctrls };
    }
    return { char: charById(t && t.char).id, ctrls };
  });
  return {
    format: two ? '2v2' : '1v1', minutes: 2, level: AI_LEVELS[c.level] ? c.level : 'medium', teams,
    res: { s1: res(c.res && c.res.s1), s2: res(c.res && c.res.s2), f: res(c.res && c.res.f) },
    stage: ['s1', 's2', 'f', 'done'].includes(c.stage) ? c.stage : 's1',
  };
}

// Druhé semifinále se odehraje „vedle“ – náhodný výsledek.
function simCupMatch() {
  const w = 1 + Math.floor(Math.random() * 4), l = Math.floor(Math.random() * w);
  return Math.random() < 0.5 ? [w, l] : [l, w];
}

// Týmy pro zápas podle lobby. V 1 v 1 dres podle dvojice, ze které postava je.
function teamsFor(lobby) {
  if (lobby.format === '2v2') return lobby.duos.map((i) => ({ ...DUO_TEAMS[i] }));
  const cols = [0, 1].map((i) => {
    const d = duoOf(lobby.slots[i].char);
    return d >= 0 ? DUO_TEAMS[d] : charById(lobby.slots[i].char).kit || SIDE_COLORS[i];
  });
  if (cols[0].color === cols[1].color) cols[1] = cols[0].color === SIDE_COLORS[1].color ? SIDE_COLORS[0] : SIDE_COLORS[1];
  return [0, 1].map((i) => {
    const c = charById(lobby.slots[i].char);
    return { name: c.name.toUpperCase(), short: c.name, girls: !!c.girl, color: cols[i].color, dark: cols[i].dark, light: cols[i].light };
  });
}

/* ---------------- obrazovka lobby ---------------- */

const LobbyUI = {
  el: {},
  ctx: null, // { mode, me, members, canEdit }
  onAction: null,
  lastKey: '',

  init() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      arena: $('slots'), hint: $('lobby-hint'), code: $('lobby-code'), invite: $('lobby-invite'),
      kicker: $('lobby-kicker'), title: $('lobby-title'), members: $('lobby-members'),
      start: $('btn-start'), ready: $('btn-ready'), wait: $('lobby-wait'), levelRow: $('lobby-level'),
      modeRow: $('lobby-mode'), power: $('lobby-power'),
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
    document.getElementById('btn-arena').addEventListener('click', () => {
      const l = this.lastLobby;
      if (this.onAction && l) this.onAction({ type: 'setting', key: 'arena', value: l.arena === 'snow' ? 'stadium' : 'snow' });
    });
    this.el.arena.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || b.disabled || !this.onAction) return;
      if (b.dataset.duo !== undefined) this.onAction({ type: 'duo', side: Number(b.dataset.duo), d: Number(b.dataset.d) });
      else if (b.dataset.d !== undefined) this.onAction({ type: 'char', slot: Number(b.dataset.slot), d: Number(b.dataset.d) });
      else if (b.dataset.slot !== undefined) this.onAction({ type: 'slot', slot: Number(b.dataset.slot) });
    });
  },

  badge(ctrl, ctx) {
    if (ctrl === 'cpu') return { text: 'Počítač', cls: 'b-cpu' };
    if (ctx.mode === 'local') return { text: 'Ty', cls: 'b-me' };
    if (ctrl === ctx.me) return { text: 'Ty', cls: 'b-me' };
    const m = ctx.members.find((x) => x.uid === ctrl);
    return { text: (m && m.name) || (ctrl === 'host' ? 'Hostitel' : 'Kamarád'), cls: 'b-friend', ready: !!(m && (m.ready || ctrl === 'host')) };
  },

  el2(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  },

  arrow(dir, data, label, disabled) {
    const a = this.el2('button', 'arr');
    a.type = 'button';
    for (const k in data) a.dataset[k] = String(data[k]);
    a.setAttribute('aria-label', label);
    a.textContent = dir < 0 ? '‹' : '›';
    a.disabled = !!disabled;
    return a;
  },

  // Postavy v lobby jsou živé (volá se z herní smyčky).
  animate(t) {
    for (const o of this.portraits || []) {
      if (o.cv.isConnected) Renderer.portrait(o.cv, o.char, o.T, o.facing, t, { happy: o.mine && (t - o.since) < 1.4, skin: o.skin });
    }
  },

  render(lobby, ctx) {
    this.ctx = ctx;
    this.lastLobby = lobby;
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
    const ar = ARENAS[validArena(lobby.arena)];
    const ab = document.getElementById('btn-arena');
    if (ab) {
      ab.textContent = `${ar.icon} ${ar.name}`;
      ab.classList.toggle('snow', lobby.arena === 'snow');
      ab.disabled = !ctx.canEdit;
    }
    el.modeRow.hidden = ctx.mode === 'guest';
    const cup = lobby.mode === 'cup';

    // hlavička
    if (ctx.mode === 'local') {
      el.kicker.textContent = cup ? 'Turnaj proti počítači' : 'Hra proti počítači';
      el.title.textContent = cup ? 'Vyber svůj tým' : 'Výběr hráčů';
      el.invite.hidden = true;
    } else {
      el.kicker.textContent = ctx.mode === 'host' ? 'Online hra · jsi hostitel' : 'Online hra';
      el.title.textContent = ctx.mode === 'host' ? 'Pozvi kamarády' : 'Čekárna';
      el.invite.hidden = false;
      el.code.textContent = Online.code;
    }

    // hráči online
    el.members.textContent = '';
    el.members.hidden = ctx.mode === 'local';
    if (ctx.mode !== 'local') {
      for (const m of ctx.members) {
        const li = this.el2('li', 'member' + (m.uid === ctx.me ? ' me' : ''));
        const isHost = m.uid === 'host';
        const ok = isHost || m.ready;
        li.appendChild(this.el2('span', 'dot' + (ok ? ' ok' : '')));
        li.appendChild(this.el2('span', 'm-name', (m.name || (isHost ? 'Hostitel' : 'Kamarád')) + (m.uid === ctx.me ? ' (ty)' : '')));
        li.appendChild(this.el2('span', 'm-state', isHost ? 'hostitel' : ok ? 'připraven' : 'vybírá'));
        el.members.appendChild(li);
      }
      // jak je kamarád připojený (pro případné hledání potíží)
      const kind = Online.t && Online.t.kind;
      if (ctx.mode === 'guest' && kind) {
        const via = kind.includes('relay') ? 'spojení přes server' : kind === 'peer' ? 'přímé spojení' : '';
        if (via) el.members.appendChild(this.el2('li', 'member via', via));
      }
    }

    // aréna: dva týmy a VS
    const teams = teamsFor(lobby);
    const two = lobby.format === '2v2';
    const lob = document.getElementById('lobby');
    lob.style.setProperty('--l0', teams[0].color);
    lob.style.setProperty('--l1', cup ? '#ffc93c' : teams[1].color);
    el.arena.textContent = '';
    const key = lobby.format + lobby.duos.join('-') + (two ? '' : lobby.slots.map((s) => s.char).join('-')) + (cup ? 'cup' : '');
    el.arena.className = `arena fmt-${lobby.format}` + (key !== this.lastKey ? ' anim' : '');
    this.lastKey = key;
    const portraits = [];
    for (let team = 0; team < 2; team++) {
      if (team === 1) {
        const vs = this.el2('div', 'vs-badge', cup ? '🏆' : 'VS');
        el.arena.appendChild(vs);
      }
      const T = teams[team];
      const col = this.el2('div', `team-col side-${team}`);
      col.style.setProperty('--team', T.color);
      col.style.setProperty('--team-dark', T.dark);
      col.style.setProperty('--team-light', T.light);
      // hlavička jen u 2 v 2 (jméno dvojice se šipkami); u 1 v 1 stačí barva a jméno pod postavou
      if (two) {
        const head = this.el2('div', 'team-head');
        const tt = this.el2('div', 'team-tt');
        const duoLocked = !duoAvailable(lobby.duos[team]);
        tt.appendChild(this.el2('span', 'team-title', (duoLocked ? '🔒 ' : '') + T.name));
        head.appendChild(this.arrow(-1, { duo: team, d: -1 }, 'Předchozí dvojice', !ctx.canEdit));
        head.appendChild(tt);
        head.appendChild(this.arrow(1, { duo: team, d: 1 }, 'Další dvojice', !ctx.canEdit));
        col.appendChild(head);
      } else {
        col.classList.add('no-head');
      }
      const row = this.el2('div', 'cards');
      lobby.slots.forEach((s, i) => {
        if (s.team !== team) return;
        const c = charById(s.char);
        const b = this.badge(s.ctrl, ctx);
        const mine = b.cls === 'b-me' || (ctx.mode === 'local' && s.ctrl !== 'cpu');
        const locked = !charAvailable(c);
        const card = this.el2('div', 'card' + (s.ctrl === 'cpu' ? '' : ' taken') + (mine ? ' mine' : '') + (locked ? ' locked' : ''));
        const main = this.el2('button', 'card-main');
        main.type = 'button';
        main.dataset.slot = String(i);
        main.setAttribute('aria-label', `${c.name}, hraje ${b.text}`);
        const cv = this.el2('canvas', 'portrait');
        // štítek: kdo hraje + jméno (pod postavou, aby nezakrýval vlasy)
        const plate = this.el2('span', 'plate');
        const chip = this.el2('span', `badge ${b.cls}`, b.text);
        if (b.cls === 'b-friend' && !b.ready) chip.classList.add('waiting');
        plate.append(chip, this.el2('span', 'card-name', c.name));
        const pw = POWERS[powerOf(c.id)];
        main.append(cv, plate, this.el2('span', 'card-power', `${pw.icon} ${pw.short}`));
        if (locked) {
          const lk = this.el2('span', 'card-lock');
          lk.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><b>${c.locked === 'milan' ? 'Úkol: 15 zápasů' : 'Odemkni v Příběhu'}</b>`;
          main.appendChild(lk);
        }
        card.appendChild(main);
        // moje postava s odemčeným skinem: přepínač
        const meCtrl = ctx.mode === 'local' ? 'p1' : ctx.me;
        const skinId = s.ctrl === meCtrl ? ownedSkinFor(c.id) : '';
        if (skinId) {
          const on = skinOn(skinId);
          const sk = this.el2('button', 'skin-chip' + (on ? ' on' : ''), SKINS[skinId].short + (on ? ' ✓' : ''));
          sk.type = 'button';
          sk.addEventListener('click', (e) => {
            e.stopPropagation();
            Sound.init();
            Game.toggleSkin(skinId);
          });
          card.appendChild(sk);
        }
        const canChar = !two && (ctx.mode === 'local' || s.ctrl === ctx.me || (ctx.mode === 'host' && s.ctrl === 'cpu'));
        if (!two) {
          const arrows = this.el2('div', 'arrows');
          arrows.appendChild(this.arrow(-1, { slot: i, d: -1 }, 'Předchozí postava', !canChar));
          arrows.appendChild(this.el2('span', 'pick-hint', canChar ? 'postava' : ''));
          arrows.appendChild(this.arrow(1, { slot: i, d: 1 }, 'Další postava', !canChar));
          card.appendChild(arrows);
        }
        row.appendChild(card);
        const skin = skinId && skinOn(skinId) ? skinId : '';
        const key2 = `${i}:${s.char}:${s.ctrl}:${skin}`;
        const prev = (this.portraits || []).find((o) => o.key === key2);
        portraits.push({ cv, char: s.char, T, facing: team === 0 ? 1 : -1, mine, skin, key: key2, since: prev ? prev.since : performance.now() / 1000 });
      });
      col.appendChild(row);
      el.arena.appendChild(col);
    }
    this.portraits = portraits;
    requestAnimationFrame(() => this.animate(performance.now() / 1000));

    // moje superschopnost
    const me = lobby.slots.find((s) => s.ctrl === ctx.me || (ctx.mode === 'local' && s.ctrl === 'p1'));
    if (me) {
      const pw = POWERS[powerOf(me.char)];
      el.power.textContent = '';
      const b1 = this.el2('b', '', `${pw.icon} ${pw.name}`);
      el.power.append(this.el2('span', 'lp-k', 'Tvoje superschopnost'), b1);
    }
    el.power.hidden = true; // schopnost je vidět pod postavou

    // nápověda a tlačítka
    const meSlot = lobby.slots.find((s) => s.ctrl === ctx.me);
    if (ctx.mode === 'local') {
      el.hint.textContent = cup
        ? 'Turnaj: tyhle dva týmy + 2 vylosované. Každý hraje své semifinále, ve finále se můžete potkat.'
        : two
          ? 'Šipkami vyber dvojice a klepni na postavu, za kterou chceš hrát. Ostatní hraje počítač. Spoluhráče na svém telefonu přidáš přes Online.'
          : 'Šipkami vyber postavy a klepni na tu, za kterou chceš hrát.';
    } else if (ctx.mode === 'host') {
      el.hint.textContent = cup
        ? 'Turnaj s kamarády: tyhle dva týmy + 2 vylosované. Kdo je ve stejném týmu, hraje spolu; ve finále se můžete potkat.'
        : 'Klepni na postavu, za kterou chceš hrát. Kamarádi si vyberou u sebe, volná místa hraje počítač.';
    } else {
      el.hint.textContent = (cup ? 'Hostitel chystá TURNAJ. ' : '') + (meSlot ? 'Až budeš mít vybráno, dej „Jsem připraven“.' : 'Klepni na volnou postavu (Počítač), za kterou chceš hrát.');
    }
    el.start.hidden = ctx.mode === 'guest';
    if (ctx.mode === 'host') {
      const guests = ctx.members.filter((m) => m.uid !== 'host');
      const ready = guests.filter((m) => m.ready).length;
      const word = cup ? 'Začít turnaj' : 'Hrát';
      el.start.textContent = guests.length ? `${word} (${ready}/${guests.length})` : word;
    } else {
      el.start.textContent = cup ? 'Začít turnaj' : 'Hrát';
    }
    const anyLocked = lobbyLocked(lobby);
    if (anyLocked && ctx.mode !== 'guest') el.hint.textContent = '🔒 Zamčená postava – odemkneš ji v Příběhu nebo v Úkolech. Vyber jinou.';
    el.start.disabled = anyLocked;
    el.ready.hidden = ctx.mode !== 'guest';
    if (ctx.mode === 'guest') {
      const myLocked = meSlot && !charAvailable(charById(meSlot.char));
      if (myLocked) el.hint.textContent = '🔒 Tahle postava je zamčená – odemkneš ji v Příběhu nebo v Úkolech. Vyber jinou.';
      el.ready.disabled = !meSlot || myLocked;
      el.ready.classList.toggle('on', !!Online.ready);
      el.ready.textContent = Online.ready ? 'Připraven ✓' : 'Jsem připraven';
    }
    el.wait.hidden = ctx.mode !== 'guest' || !Online.ready;
  },
};
