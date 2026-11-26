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
    mode: prefs.mode === 'cup' && firstCtrl === 'p1' ? 'cup' : 'match', // zápas nebo turnaj (jen na tomto zařízení)
    format: prefs.format === '1v1' ? '1v1' : '2v2',
    minutes: [1, 2, 3].includes(prefs.minutes) ? prefs.minutes : 2,
    level: AI_LEVELS[prefs.level] ? prefs.level : 'medium',
    duos: validDuos(prefs.duos),
    slots: [],
  };
  lobby.slots = makeSlots(lobby.format, null, lobby.duos);
  if (lobby.format === '1v1' && Array.isArray(prefs.chars)) {
    prefs.chars.forEach((c, i) => {
      if (lobby.slots[i] && ROSTER.some((r) => r.id === c)) lobby.slots[i].char = c;
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

/* ---------------- turnaj: pavouk pro 4 týmy (semifinále a finále) ---------------- */

// Hráč je vždy tým 0. Ostatní tři týmy se vylosují.
function newCup(lobby) {
  const me = lobby.slots.find((s) => s.ctrl === 'p1') || lobby.slots[0];
  const cup = { format: lobby.format, minutes: lobby.minutes, level: lobby.level, myChar: me.char, teams: [], res: { s1: null, s2: null, f: null }, stage: 's1' };
  if (lobby.format === '2v2') {
    const mine = lobby.duos[me.team];
    const rest = shuffle(DUO_TEAMS.map((d, i) => i).filter((i) => i !== mine)).slice(0, 3);
    cup.teams = [mine].concat(rest).map((duo) => ({ duo }));
  } else {
    const rest = shuffle(ROSTER.map((c) => c.id).filter((id) => id !== me.char)).slice(0, 3);
    cup.teams = [me.char].concat(rest).map((char) => ({ char }));
  }
  return cup;
}

// Jméno, postavy a barvy týmu v turnaji.
function cupTeam(cup, i) {
  const t = cup.teams[i];
  if (t.duo !== undefined) {
    const d = DUO_TEAMS[t.duo];
    return { name: d.name, chars: d.chars.slice(), T: d };
  }
  const c = charById(t.char), d = duoOf(c.id);
  return { name: c.name.toUpperCase(), chars: [c.id], T: d >= 0 ? DUO_TEAMS[d] : SIDE_COLORS[0] };
}

// Kdo vyhrál zápas v pavouku (index týmu) nebo -1.
function cupWinner(cup, key) {
  const r = cup.res[key];
  if (!r) return -1;
  const pair = key === 's1' ? [0, 1] : key === 's2' ? [2, 3] : [0, cupWinner(cup, 's2')];
  return r[0] > r[1] ? pair[0] : pair[1];
}

// Lobby pro zápas v turnaji (já vlevo, soupeř vpravo). Ve finále je počítač o stupeň těžší.
function cupLobby(cup, opp, final) {
  const levels = ['easy', 'medium', 'hard'];
  const level = final ? levels[Math.min(2, levels.indexOf(cup.level) + 1)] : cup.level;
  const me = cup.teams[0], op = cup.teams[opp];
  let lobby;
  if (cup.format === '2v2') {
    lobby = { format: '2v2', minutes: cup.minutes, level, duos: [me.duo, op.duo], slots: duoSlots([me.duo, op.duo]) };
    lobby.slots.forEach((s) => { s.ctrl = 'cpu'; });
    (lobby.slots.find((s) => s.team === 0 && s.char === cup.myChar) || lobby.slots[0]).ctrl = 'p1';
  } else {
    lobby = { format: '1v1', minutes: cup.minutes, level, duos: [0, 1], slots: [{ team: 0, char: me.char, ctrl: 'p1' }, { team: 1, char: op.char, ctrl: 'cpu' }] };
  }
  return lobby;
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
    return d >= 0 ? DUO_TEAMS[d] : SIDE_COLORS[i];
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
      if (o.cv.isConnected) Renderer.portrait(o.cv, o.char, o.T, o.facing, t, { happy: o.mine && (t - o.since) < 1.4 });
    }
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
    el.modeRow.hidden = ctx.mode !== 'local';
    const cup = ctx.mode === 'local' && lobby.mode === 'cup';

    // hlavička
    if (ctx.mode === 'local') {
      el.kicker.textContent = 'Hra proti počítači';
      el.title.textContent = 'Výběr hráčů';
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
        const vs = this.el2('div', 'vs-badge', 'VS');
        el.arena.appendChild(vs);
      }
      if (cup && team === 1) {
        // turnaj: soupeře vylosuje pavouk
        const col = this.el2('div', 'team-col side-1 cup-col');
        col.style.setProperty('--team', '#ffc93c');
        col.style.setProperty('--team-dark', '#7a4f00');
        col.style.setProperty('--team-light', '#ffe9a0');
        const box = this.el2('div', 'cup-info');
        const icon = this.el2('span', 'cup-icon');
        icon.innerHTML = '<svg class="cup" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v2h3v2.5a4 4 0 0 1-4 4h-.4A5 5 0 0 1 13 14.6V17h3v3H8v-3h3v-2.4A5 5 0 0 1 8.4 11.5H8a4 4 0 0 1-4-4V5h3zm0 4H6v.5a2 2 0 0 0 1.2 1.8zm10 0v2.3A2 2 0 0 0 18 7.5V7z"/></svg>';
        box.append(icon, this.el2('strong', 'cup-name', 'TURNAJ'), this.el2('span', 'cup-line', '4 týmy · semifinále a finále'), this.el2('span', 'cup-line', 'Soupeře vylosuje pavouk, finále je těžší'));
        col.appendChild(box);
        el.arena.appendChild(col);
        continue;
      }
      const T = teams[team];
      const col = this.el2('div', `team-col side-${team}`);
      col.style.setProperty('--team', T.color);
      col.style.setProperty('--team-dark', T.dark);
      col.style.setProperty('--team-light', T.light);
      const head = this.el2('div', 'team-head');
      const tt = this.el2('div', 'team-tt');
      tt.appendChild(this.el2('span', 'team-title', two ? T.name : team === 0 ? 'Levá strana' : 'Pravá strana'));
      // pokřik fanoušků dvojice
      const duo = two ? lobby.duos[team] : duoOf(lobby.slots[team].char);
      const chant = duo >= 0 && DUO_SHOUTS[duo] && DUO_SHOUTS[duo][0];
      if (chant) tt.appendChild(this.el2('span', 'team-chant', `📣 ${chant}`));
      if (two) {
        head.appendChild(this.arrow(-1, { duo: team, d: -1 }, 'Předchozí dvojice', !ctx.canEdit));
        head.appendChild(tt);
        head.appendChild(this.arrow(1, { duo: team, d: 1 }, 'Další dvojice', !ctx.canEdit));
      } else {
        head.appendChild(tt);
      }
      col.appendChild(head);
      const row = this.el2('div', 'cards');
      lobby.slots.forEach((s, i) => {
        if (s.team !== team) return;
        const c = charById(s.char);
        const b = this.badge(s.ctrl, ctx);
        const mine = b.cls === 'b-me' || (ctx.mode === 'local' && s.ctrl !== 'cpu');
        const card = this.el2('div', 'card' + (s.ctrl === 'cpu' ? '' : ' taken') + (mine ? ' mine' : ''));
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
        card.appendChild(main);
        const canChar = !two && (ctx.mode === 'local' || s.ctrl === ctx.me || (ctx.mode === 'host' && s.ctrl === 'cpu'));
        if (!two) {
          const arrows = this.el2('div', 'arrows');
          arrows.appendChild(this.arrow(-1, { slot: i, d: -1 }, 'Předchozí postava', !canChar));
          arrows.appendChild(this.el2('span', 'pick-hint', canChar ? 'postava' : ''));
          arrows.appendChild(this.arrow(1, { slot: i, d: 1 }, 'Další postava', !canChar));
          card.appendChild(arrows);
        }
        row.appendChild(card);
        const key2 = `${i}:${s.char}:${s.ctrl}`;
        const prev = (this.portraits || []).find((o) => o.key === key2);
        portraits.push({ cv, char: s.char, T, facing: team === 0 ? 1 : -1, mine, key: key2, since: prev ? prev.since : performance.now() / 1000 });
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
    el.power.hidden = !me;

    // nápověda a tlačítka
    const meSlot = lobby.slots.find((s) => s.ctrl === ctx.me);
    if (ctx.mode === 'local') {
      el.hint.textContent = cup
        ? 'Vyber svůj tým a postavu. Vyhraj semifinále i finále a získáš pohár.'
        : two
          ? 'Šipkami vyber dvojice a klepni na postavu, za kterou chceš hrát. Ostatní hraje počítač. Spoluhráče na svém telefonu přidáš přes Online.'
          : 'Šipkami vyber postavy a klepni na tu, za kterou chceš hrát.';
    } else if (ctx.mode === 'host') {
      el.hint.textContent = 'Klepni na postavu, za kterou chceš hrát. Kamarádi si vyberou u sebe, volná místa hraje počítač.';
    } else {
      el.hint.textContent = meSlot ? 'Až budeš mít vybráno, dej „Jsem připraven“.' : 'Klepni na volnou postavu (Počítač), za kterou chceš hrát.';
    }
    el.start.hidden = ctx.mode === 'guest';
    if (ctx.mode === 'host') {
      const guests = ctx.members.filter((m) => m.uid !== 'host');
      const ready = guests.filter((m) => m.ready).length;
      el.start.textContent = guests.length ? `Hrát (${ready}/${guests.length} připraveno)` : 'Hrát';
    } else {
      el.start.textContent = cup ? 'Začít turnaj' : 'Hrát';
    }
    el.ready.hidden = ctx.mode !== 'guest';
    if (ctx.mode === 'guest') {
      el.ready.disabled = !meSlot;
      el.ready.classList.toggle('on', !!Online.ready);
      el.ready.textContent = Online.ready ? 'Připraven ✓' : 'Jsem připraven';
    }
    el.wait.hidden = ctx.mode !== 'guest' || !Online.ready;
  },
};
