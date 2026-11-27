'use strict';
/* Herní smyčka, průběh zápasu, obrazovky a online režim. */

const STORE_LOBBY = 'hlavouni.lobby';
const STORE_MUTE = 'hlavouni.ztlumeno';
const STORE_NAME = 'hlavouni.jmeno';
const STORE_SWAP = 'hlavouni.prohodit';
const STORE_PROFILE = 'hlavouni.profil';

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* nevadí */ }
  },
};

// Poháry a statistiky hráče na tomto zařízení.
const Profile = {
  get() {
    const p = store.get(STORE_PROFILE, null);
    const d = { trophies: 0, played: 0, wins: 0, goals: 0, supers: 0, knocks: 0, streak: 0, bestStreak: 0, cups: 0 };
    if (!p || typeof p !== 'object') return d;
    for (const k in d) d[k] = Math.max(0, Math.floor(Number(p[k]) || 0));
    return d;
  },
  save(p) {
    store.set(STORE_PROFILE, p);
  },
};

const STATE_CODE = { intro: 'i', countdown: 'c', kickoff: 'k', play: 'p', goal: 'g', replay: 'r', over: 'o', paused: 'z', halftime: 'h', shootout: 's' };
const CODE_STATE = { i: 'intro', c: 'countdown', k: 'kickoff', p: 'play', g: 'goal', r: 'replay', o: 'over', z: 'paused', h: 'halftime', s: 'shootout' };
// Penalty
const PEN_ROUNDS = 5;
const PEN_PHASE = { intro: 0, aim: 1, flight: 2, result: 3 };
const PEN_PHASES = ['intro', 'aim', 'flight', 'result'];
const HALF_SHOW = 1.6; // za jak dlouho po hvizdu se ukáže poločasová přestávka
// Statistiky týmu: góly, držení míče (s), střely, na bránu, hlavičky, superschopnosti, odstřelení
const ST_POS = 1, ST_SHOT = 2, ST_ON = 3, ST_HEAD = 4, ST_POW = 5, ST_KNOCK = 6;
const REPLAY_SPEED = 0.7;  // zpomalení záznamu gólu
const RESULT_AT = 5.4;     // kdy po konci zápasu ukázat výsledek (s)
const INTERP_MS = 75;

const Game = {
  mode: 'local',   // local | host | guest
  screen: 'home',  // home | online | lobby | match
  state: 'menu',   // menu | countdown | kickoff | play | goal | over | paused
  paused: null,
  stateT: 0,
  acc: 0,
  match: null,
  setup: null,
  lobby: null,
  prefs: {},
  clock: 0,       // uběhlé sekundy zápasu (na hodinách minuty)
  half: 1,        // 1. nebo 2. poločas, 3 = zlatý gól
  golden: false,
  tstats: null,
  msg: null,
  msgId: 0,
  countShown: 0,
  lastTick: -1,
  resultShown: false,
  demoGoalAt: 0,
  scorePop: [0, 0],
  // kamera a filmové scény
  cam: { x: W / 2, y: H / 2, z: 1, bars: 0 },
  excite: 0,
  goalTeam: -1,
  scorerIdx: -1,
  rec: [],        // záznam posledních vteřin pro opakování gólu
  gameT: 0,
  goalT: 0,
  replayT: 0,
  replayFrom: 0,
  replayTo: 0,
  replayIdx: 0,
  trophyShown: false,
  // hostitel: fronta efektů pro kamarády
  evq: [],
  evN: 0,
  snapN: 0,
  t0: 0,
  // host: přijaté stavy zápasu
  buf: [],
  offset: null,
  lastEvN: 0,
  lastSnapN: -1,
  lastMsgId: 0,
  setupKey: '',

  init() {
    this.prefs = store.get(STORE_LOBBY, {}) || {};
    Online.onHost = (hp) => this.onHostPresence(hp);
    Online.onHostGone = () => this.hostGone();
    Online.onGuestUpdate = (g, want) => this.onGuestUpdate(g, want);
    Online.onGuestGone = (uid) => this.onGuestGone(uid);
    LobbyUI.onAction = (a) => this.lobbyAction(a);
    this.toHome();
  },

  inMatch() {
    return this.screen === 'match' && ['intro', 'countdown', 'kickoff', 'play', 'goal', 'replay', 'shootout'].includes(this.state);
  },

  /* ---------------- obrazovky ---------------- */

  newDemo() {
    const two = Math.random() < 0.6;
    const open = DUO_TEAMS.map((t, i) => i).filter((i) => !DUO_TEAMS[i].locked);
    const da = pick(open);
    const db = pick(open.filter((i) => i !== da));
    const lobby = newLobby({ format: two ? '2v2' : '1v1', duos: [da, db], arena: Math.random() < 0.45 ? pick(ARENA_ORDER.slice(1)) : 'stadium' });
    if (!two) {
      const pool = ROSTER.filter((c) => !c.locked);
      lobby.slots[0].char = pick(pool).id;
      lobby.slots[1].char = pick(pool).id;
    }
    lobby.slots.forEach((s) => { s.ctrl = 'cpu'; });
    lobby.level = 'hard';
    const setup = this.buildSetup(lobby);
    setup.demo = true;
    this.match = new Match(setup, (t, d) => this.onEvent(t, d));
    Renderer.setFans(setup.teams);
    this.stateT = 0;
    this.acc = 0;
  },

  toHome() {
    if (Updater.pending) {
      Updater.reload(Updater.pending);
      return;
    }
    this.cup = null;
    this.story = null;
    if (Online.active) Online.leave();
    this.mode = 'local';
    this.screen = 'home';
    this.state = 'menu';
    this.paused = null;
    this.msg = null;
    this.golden = false;
    this.clock = 0;
    this.half = 1;
    Effects.clear();
    Input.clear();
    Touch.show(false);
    this.newDemo();
    Sound.quiet = true;
    Sound.crowdLevel(0.02);
    UI.show('home');
  },

  toOnline(code) {
    this.story = null;
    this.screen = 'online';
    UI.show('online');
    UI.onlineStatus('');
    UI.publicHint(false);
    if (code) UI.el.code.value = cleanCode(code);
    Net.detect().then((kind) => {
      if (kind === null) {
        UI.onlineStatus('Tady online nejde, protože hra běží na claude.ai bez přihlášení.', true);
        UI.publicHint(true);
      }
    });
  },

  toLobby() {
    this.screen = 'lobby';
    this.state = 'menu';
    this.msg = null;
    Touch.show(false);
    Input.clear();
    Sound.quiet = true;
    if (!this.match || this.match.setup.demo !== true) this.newDemo();
    UI.show('lobby');
    this.renderLobby();
  },

  // mode: 'match' (Hrát) nebo 'cup' (Turnaj z hlavního menu)
  openLocalLobby(mode) {
    this.story = null;
    this.mode = 'local';
    this.lobby = newLobby(Object.assign({}, this.prefs, mode ? { mode } : {}), 'p1');
    this.toLobby();
  },

  async hostCreate(name, mode) {
    UI.onlineStatus('Zakládám hru…');
    try {
      await Online.create(name);
    } catch (e) {
      UI.onlineStatus(this.netError(e), true);
      return;
    }
    this.mode = 'host';
    this.lobby = newLobby(this.prefs, 'host');
    if (mode === 'viet') applyViet(this.lobby);
    this.publishLobby();
    this.toLobby();
  },

  async guestJoin(code, name) {
    code = cleanCode(code);
    if (code.length !== 4) {
      UI.onlineStatus('Kód hry má 4 znaky.', true);
      return;
    }
    UI.onlineStatus('Připojuji se ke hře ' + code + '…');
    Net.onFallback = () => UI.onlineStatus('Přímé spojení nejde, zkouším záložní spojení přes server…');
    try {
      await Online.join(code, name);
    } catch (e) {
      UI.onlineStatus(this.netError(e, code), true);
      return;
    }
    this.mode = 'guest';
    this.lobby = null;
    this.toLobby();
    this.onHostPresence(Online.hostP);
  },

  netError(e, code) {
    const msg = String((e && (e.type || e.message)) || e);
    if (msg === 'notfound' || msg === 'peer-unavailable') return `Hru ${code} se nepodařilo najít. Zkontroluj kód a že hostitel i ty máte hru otevřenou na stejné adrese (${PUBLIC_URL.replace(/^https:\/\//, '').replace(/\/$/, '')}).`;
    if (msg === 'unavailable') return 'Online hra tady nejde. Na claude.ai musíš být přihlášený a mít k této hře přístup.';
    if (msg === 'timeout' || msg === 'network' || msg === 'server-error' || msg === 'socket-error') return 'Nepodařilo se spojit se serverem. Zkontroluj internet a zkus to znovu.';
    return 'Připojení se nepovedlo. Zkus to znovu.';
  },

  hostGone() {
    if (this.mode !== 'guest') return;
    this.toHome();
    UI.toast('Hostitel ukončil hru.');
  },

  /* ---------------- lobby ---------------- */

  lobbyCtx() {
    if (this.mode === 'local') return { mode: 'local', me: 'p1', members: [], canEdit: true };
    if (this.mode === 'host') return { mode: 'host', me: 'host', members: Online.members(), canEdit: true };
    const hl = Online.hostP && Online.hostP.lobby;
    return { mode: 'guest', me: Online.uid, members: (hl && hl.members) || [], canEdit: false };
  },

  currentLobby() {
    if (this.mode === 'guest') return Online.hostP && Online.hostP.lobby ? sanitizeLobby(Online.hostP.lobby) : null;
    return this.lobby;
  },

  renderLobby() {
    if (this.screen !== 'lobby') return;
    const lobby = this.currentLobby();
    if (lobby) LobbyUI.render(lobby, this.lobbyCtx());
  },

  savePrefs() {
    const l = this.lobby;
    if (!l) return;
    this.prefs = { mode: this.mode === 'local' ? l.mode : this.prefs.mode, format: l.format, minutes: l.minutes, level: l.level, arena: validArena(l.arena), duos: l.duos.slice(), chars: l.format === '1v1' ? l.slots.map((s) => s.char) : this.prefs.chars };
    store.set(STORE_LOBBY, this.prefs);
  },

  lobbyAction(a) {
    Sound.init();
    Sound.click();
    if (this.mode === 'guest') {
      const lobby = this.currentLobby();
      if (!lobby) return;
      if (a.type === 'slot') {
        const s = lobby.slots[a.slot];
        if (!s) return;
        if (s.ctrl === Online.uid) Online.want(-1, null);
        else if (s.ctrl === 'cpu') Online.want(a.slot, lobby.format === '1v1' ? s.char : null);
      } else if (a.type === 'char') {
        const s = lobby.slots[a.slot];
        if (s && s.ctrl === Online.uid) Online.want(a.slot, cycleChar(s.char, a.d));
      }
      this.renderLobby();
      return;
    }
    const l = this.lobby;
    // Vietnam: formát, obtížnost, aréna a soupeř jsou dané zápasem
    if (l.mode === 'viet') {
      if (a.type === 'setting') return;
      if (a.type === 'duo' && a.side === 1) return;
      if (a.type === 'slot' && l.slots[a.slot] && l.slots[a.slot].team === 1) return;
    }
    if (a.type === 'setting') {
      if (a.key === 'format') {
        if (l.format === a.value) return;
        l.slots = makeSlots(a.value, l, l.duos);
        l.format = a.value;
      } else if (a.key === 'mode') {
        l.mode = a.value === 'cup' ? 'cup' : 'match';
      } else if (a.key === 'arena') {
        l.arena = validArena(a.value);
      } else {
        l[a.key] = a.value;
      }
    } else if (a.type === 'slot') {
      const s = l.slots[a.slot];
      if (!s) return;
      if (this.mode === 'local') {
        // na jednom zařízení hraje jeden hráč: klepnutím si vybere postavu
        claimSlot(l, 'p1', a.slot);
      } else if (s.ctrl === 'host') {
        s.ctrl = 'cpu';
      } else {
        claimSlot(l, 'host', a.slot);
      }
    } else if (a.type === 'char') {
      const s = l.slots[a.slot];
      if (s) s.char = cycleChar(s.char, a.d);
    } else if (a.type === 'duo') {
      cycleDuo(l, a.side, a.d);
    }
    this.savePrefs();
    if (this.mode === 'host') this.publishLobby();
    this.renderLobby();
  },

  publishLobby() {
    if (this.mode !== 'host') return;
    const l = this.lobby;
    Online.publish({
      phase: 'lobby',
      lobby: { mode: l.mode, viet: l.viet || 0, format: l.format, minutes: l.minutes, level: l.level, arena: validArena(l.arena), duos: l.duos.slice(), slots: l.slots.map((s) => ({ team: s.team, char: s.char, ctrl: s.ctrl })), members: Online.members() },
      setup: null,
      g: null,
    });
  },

  onGuestUpdate(g, want) {
    if (this.mode !== 'host') return;
    if (want && this.screen === 'lobby') applyWant(this.lobby, g.uid, want);
    if (this.screen !== 'match') {
      this.publishLobby();
      this.renderLobby();
    }
  },

  onGuestGone(uid) {
    if (this.mode !== 'host') return;
    releaseCtrl(this.lobby, uid);
    if (this.screen === 'match' && this.match) {
      this.match.players.forEach((p, i) => {
        if (p.remote === uid) {
          this.match.makeCPU(p);
          this.setup.players[i].ctrl = 'cpu';
          this.setup.players[i].name = '';
          this.setup.rev++;
        }
      });
    } else {
      this.publishLobby();
      this.renderLobby();
    }
  },

  // Popis zápasu, který dostanou všichni (i kamarádi online).
  buildSetup(lobby) {
    const members = this.mode === 'host' ? Online.members() : [];
    const nameOf = (ctrl) => {
      const m = members.find((x) => x.uid === ctrl);
      return (m && m.name) || '';
    };
    const skinOf = (ctrl, char) => {
      if (ctrl === 'p1' || ctrl === 'host') return mySkinFor(char);
      const m = members.find((x) => x.uid === ctrl);
      return (m && m.skins && m.skins[char]) || '';
    };
    return {
      id: randomId(6),
      rev: 0,
      demo: false,
      format: lobby.format,
      level: lobby.level,
      minutes: lobby.minutes,
      arena: validArena(lobby.arena),
      teams: teamsFor(lobby),
      players: lobby.slots.map((s) => ({ char: s.char, team: s.team, ctrl: s.ctrl, name: nameOf(s.ctrl), skin: skinOf(s.ctrl, s.char) })),
    };
  },

  // Popisek nad hlavou hráče z pohledu tohoto zařízení.
  labelFor(sp) {
    if (sp.ctrl === 'cpu') return 'CPU';
    if (this.mode === 'local') return 'TY';
    const me = this.mode === 'host' ? 'host' : Online.uid;
    if (sp.ctrl === me) return 'TY';
    return sp.name || (sp.ctrl === 'host' ? 'Hostitel' : 'Kamarád');
  },

  localHumans(setup) {
    const mine = this.mode === 'host' ? ['host'] : ['p1'];
    return setup.players.filter((sp) => mine.includes(sp.ctrl)).length;
  },

  /* ---------------- zápas ---------------- */

  start() {
    if (this.mode === 'guest') return;
    // znovu stejná úroveň příběhu
    if (this.story && this.setup && this.setup.story) {
      this.playStory(this.setup.story - 1);
      return;
    }
    // znovu stejný zápas turnaje (z pauzy)
    if (this.cup && this.setup && this.setup.cup && this.screen === 'match') {
      this.playCupMatch();
      return;
    }
    // výzva Vietnam: jen hostitel online a dva lidé v týmu
    if (this.lobby && this.lobby.mode === 'viet') {
      if (this.mode !== 'host') return;
      applyViet(this.lobby);
      if (!vietReady(this.lobby)) {
        UI.toast('Ve Vietnamu hrajete dva lidi v jednom týmu – pozvi parťáka a ať si klepne na volné místo vedle tebe.');
        this.publishLobby();
        this.renderLobby();
        return;
      }
      const i = this.lobby.viet, lv = VIET[i];
      const setup = this.buildSetup(this.lobby);
      setup.viet = i + 1;
      setup.boost = lv.boost;
      setup.label = `VIETNAM · ZÁPAS ${i + 1}/${VIET.length}`;
      this.cup = null;
      this.beginMatch(setup);
      return;
    }
    if (this.screen === 'lobby' && lobbyLocked(this.lobby)) {
      UI.toast('Zamčená postava – odemkneš ji v Příběhu');
      return;
    }
    if ((this.mode === 'local' || this.mode === 'host') && this.lobby.mode === 'cup' && this.screen === 'lobby') {
      this.startCup();
      return;
    }
    this.cup = null;
    this.beginMatch(this.buildSetup(this.lobby));
  },

  /* ---------------- příběh ---------------- */

  openStory() {
    if (Online.active) Online.leave();
    this.storySync();
    this.cup = null;
    this.story = { idx: -1 };
    this.mode = 'local';
    this.screen = 'story';
    this.state = 'menu';
    this.paused = null;
    this.msg = null;
    Effects.clear();
    Touch.show(false);
    Input.clear();
    Sound.quiet = true;
    Sound.crowdLevel(0.02);
    if (!this.match || this.match.setup.demo !== true) this.newDemo();
    UI.showStory();
  },

  // Kód: příběh, nebo hlavní kód, který odemkne úplně všechno. Vrací 'story', 'all' nebo ''.
  tryUnlock(code) {
    const norm = String(code || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toUpperCase();
    const h = codeHash(norm);
    if (h === VIET_CODE) {
      Unlocks.set('viet');
      return 'viet';
    }
    if (h === MASTER_CODE) {
      for (const k of ['story', 'moncler', 'on.moncler', 'pav', 'milan', 'bikini', 'michael', 'truegold', 'viet', 'trana']) Unlocks.set(k);
      for (const id of Object.keys(CAMPAIGNS)) {
        const C = CAMPAIGNS[id];
        let o = {};
        try { o = JSON.parse(localStorage.getItem(C.key)) || {}; } catch (e) { /* nevadí */ }
        o.done = C.levels.length;
        try { localStorage.setItem(C.key, JSON.stringify(o)); } catch (e) { /* nevadí */ }
      }
      for (const k of ['berry', 'nikol']) Unlocks.set(k);
      return 'all';
    }
    if (h !== STORY_CODE) return '';
    Unlocks.set('story');
    return 'story';
  },

  storyChar() {
    const id = Story.get().char, c = ROSTER.find((r) => r.id === id);
    return c && charAvailable(c) ? c.id : 'jenda';
  },

  setStoryChar(id) {
    const s = Story.get();
    s.char = id;
    Story.save(s);
  },

  // Zapnout/vypnout skin (platí pro svou postavu, i online).
  toggleSkin(id) {
    if (!skinOwned(id)) return;
    const on = !Unlocks.has('on.' + id);
    // u jedné postavy může být zapnutý jen jeden skin
    if (on) for (const o of ownedSkinsFor(SKINS[id].char)) Unlocks.set('on.' + o, false);
    Unlocks.set('on.' + id, on);
    this.skinChanged();
  },

  // Přepnout skin postavy dokola: žádný → první → druhý → … → žádný.
  cycleSkin(charId) {
    const owned = ownedSkinsFor(charId);
    if (!owned.length) return;
    const next = owned[owned.indexOf(mySkinFor(charId)) + 1] || '';
    for (const o of owned) Unlocks.set('on.' + o, o === next);
    this.skinChanged();
  },

  skinChanged() {
    Sound.click();
    if (this.mode === 'guest') Online.publish({ skins: mySkins() });
    if (this.screen === 'lobby') {
      if (this.mode === 'host') this.publishLobby();
      this.renderLobby();
    }
  },

  // Zápas jedné úrovně proti počítači (1 v 1 nebo 2 v 2 se spoluhráčem počítačem).
  playStory(idx) {
    const st = Story.get();
    idx = clamp(Math.floor(idx), 0, Math.min(st.done, STORY.length - 1));
    const lv = STORY[idx], me = this.storyChar();
    const opp = storyOpp(lv);
    if (Online.active) Online.leave();
    this.mode = 'local';
    this.cup = null;
    this.story = { idx };
    let lobby;
    if (lv.format === '2v2') {
      let mine = duoOf(me);
      if (mine < 0) mine = 4; // postava bez dvojice hraje s Šimšou
      // stejná dvojice proti sobě: lobby dostane jinou, pak se soupeřům vrátí jejich postavy
      const mirror = mine === opp;
      const other = mirror ? (opp + 1) % DUO_TEAMS.length : opp;
      lobby = newLobby({ format: '2v2', level: lv.level, duos: [mine, other], arena: lv.arena }, null);
      lobby.slots.forEach((s) => { s.ctrl = 'cpu'; });
      if (mirror) lobby.slots.filter((s) => s.team === 1).forEach((s, k) => { s.char = DUO_TEAMS[opp].chars[k]; });
      this.storyMirror = mirror ? opp : -1;
      const team0 = lobby.slots.filter((s) => s.team === 0);
      const meSlot = team0.find((s) => s.char === me) || team0[0];
      meSlot.char = me;
      meSlot.ctrl = 'p1';
    } else {
      this.storyMirror = -1;
      lobby = newLobby({ format: '1v1', level: lv.level, arena: lv.arena }, null);
      const mine = lobby.slots.find((s) => s.team === 0), other = lobby.slots.find((s) => s.team === 1);
      mine.char = me;
      mine.ctrl = 'p1';
      other.char = opp;
      other.ctrl = 'cpu';
    }
    const setup = this.buildSetup(lobby);
    if (this.storyMirror >= 0) {
      // zrcadlový zápas: soupeř má stejnou dvojici, ale dres v jiné barvě
      const D = DUO_TEAMS[this.storyMirror], alt = SIDE_COLORS[D.color === SIDE_COLORS[1].color ? 0 : 1];
      setup.teams[1] = Object.assign({}, D, { color: alt.color, dark: alt.dark, light: alt.light });
    }
    setup.story = idx + 1;
    setup.boost = lv.boost;
    setup.label = `PŘÍBĚH · ÚROVEŇ ${idx + 1}`;
    setup.goal = storyGoalText(lv.goal).toUpperCase();
    this.beginMatch(setup);
  },

  // Výsledek úrovně (jednou za zápas): podmínka, postup a odměny.
  storyRecord() {
    const m = this.match, s = this.setup;
    if (!this.story || !s || !s.story || !m) return null;
    if (this.storyRes && this.storyRes.id === s.id) return this.storyRes;
    const me = this.myPlayer();
    const idx = s.story - 1, lv = STORY[idx];
    const t = me ? me.team : 0;
    const won = !!me && m.winner() === t;
    const win = storyGoalMet(lv.goal, m.score[t], m.score[1 - t], won);
    const st = Story.get(), rewards = [];
    if (win) {
      if (idx >= st.done) {
        st.done = idx + 1;
        Story.save(st);
      }
      const rw = lv.reward;
      if (rw && !Unlocks.has(rw)) {
        Unlocks.set(rw);
        if (rw === 'moncler') Unlocks.set('on.moncler');
        rewards.push(rw);
      }
    }
    // bonusová odměna (např. bez obdrženého gólu)
    let bonusMissed = false;
    if (win && lv.bonus && !Unlocks.has(lv.bonus.reward)) {
      if (storyGoalMet(lv.bonus.goal, m.score[t], m.score[1 - t], won)) {
        const rb = lv.bonus.reward;
        Unlocks.set(rb);
        if (SKINS[rb]) {
          for (const o of ownedSkinsFor(SKINS[rb].char)) Unlocks.set('on.' + o, false);
          Unlocks.set('on.' + rb);
        }
        rewards.push(rb);
      } else {
        bonusMissed = true;
      }
    }
    this.storyRes = { id: s.id, idx, win, won, rewards, bonusMissed };
    return this.storyRes;
  },

  // Odměny za už splněné úrovně (třeba po úpravě příběhu).
  storySync() {
    const st = Story.get();
    STORY.forEach((lv, i) => {
      if (lv.reward && i < st.done && !Unlocks.has(lv.reward)) Unlocks.set(lv.reward);
    });
  },

  /* ---------------- turnaj ---------------- */

  startCup() {
    this.cup = newCup(this.lobby);
    this.cupAdvance();
    this.showCupAll();
  },

  // Moje ovládání (podle něj se pozná „můj“ tým v pavouku).
  myCtrl() {
    return this.mode === 'local' ? 'p1' : this.mode === 'host' ? 'host' : Online.uid;
  },

  myCupTeam() {
    const cup = this.cup, me = this.myCtrl();
    return cup ? cup.teams.findIndex((t) => t.ctrls.includes(me)) : -1;
  },

  // Zápasy, kde nehraje žádný člověk, se odehrají „vedle“ (náhodný výsledek).
  cupAdvance() {
    const cup = this.cup;
    while (cup.stage !== 'done') {
      const [a, b] = cupPair(cup, cup.stage);
      if (cupHuman(cup, a) || cupHuman(cup, b)) break;
      cup.res[cup.stage] = simCupMatch();
      cup.stage = CUP_NEXT[cup.stage];
    }
    if (cup.stage === 'done') cup.won = this.myCupTeam() >= 0 && cupWinner(cup, 'f') === this.myCupTeam();
  },

  // Pavouk u hostitele i u kamarádů.
  showCupAll() {
    if (this.mode === 'host') {
      this.screen = 'cup';
      Online.publish({ phase: 'cup', cup: this.cupNet(), lobby: null, setup: null, g: null });
    }
    if (this.screen === 'match') {
      this.screen = 'cup';
      Touch.show(false);
    }
    UI.showCup();
  },

  cupNet() {
    const c = this.cup;
    return { format: c.format, level: c.level, teams: c.teams, res: c.res, stage: c.stage };
  },

  // Další zápas turnaje.
  playCupMatch() {
    const cup = this.cup;
    if (!cup || cup.stage === 'done' || this.mode === 'guest') return;
    const lobby = cupLobby(cup, cup.stage);
    // kamarád, který mezitím odešel, je nahrazen počítačem
    if (this.mode === 'host') {
      const here = new Set(Online.members().map((x) => x.uid));
      lobby.slots.forEach((sl) => { if (sl.ctrl !== 'cpu' && !here.has(sl.ctrl)) sl.ctrl = 'cpu'; });
    }
    const setup = this.buildSetup(lobby);
    setup.cup = true;
    setup.stage = cup.stage === 'f' ? 'FINÁLE' : 'SEMIFINÁLE';
    this.beginMatch(setup);
  },

  // Výsledek zápasu do pavouka (jednou za zápas, počítá hostitel).
  cupRecord() {
    const cup = this.cup, m = this.match;
    if (!cup || this.mode === 'guest' || !this.setup || !this.setup.cup || cup.lastId === this.setup.id || m.winner() < 0) return;
    cup.lastId = this.setup.id;
    // po penaltách se do pavouka zapíše o půl gólu víc vítězi (aby bylo vidět, kdo postoupil)
    const w = m.winner();
    const sc = [m.score[0], m.score[1]];
    if (sc[0] === sc[1]) sc[w] += 0.5;
    cup.res[cup.stage] = sc;
    cup.stage = CUP_NEXT[cup.stage];
    this.cupAdvance();
    if (this.mode === 'host') Online.publish({ cup: this.cupNet() });
  },

  quitCup() {
    this.cup = null;
    if (this.mode === 'host') Online.publish({ cup: null });
    this.backToLobby();
  },

  beginMatch(setup) {
    Sound.init();
    Sound.quiet = false;
    this.setup = setup;
    const humans = this.localHumans(setup);
    Input.clear();
    this.match = new Match(setup, (t, d) => this.onEvent(t, d), (uid) => Online.remoteIntent(uid));
    Renderer.setFans(setup.teams);
    this.match.players.forEach((p, i) => { p.label = this.labelFor(setup.players[i]); });
    this.screen = 'match';
    this.clock = 0;
    this.half = 1;
    this.halfShown = false;
    this.golden = false;
    this.tstats = [0, 1].map(() => [0, 0, 0, 0, 0, 0, 0]);
    this.lastTick = -1;
    this.countShown = 0;
    this.scorePop = [0, 0];
    this.msg = null;
    this.state = 'intro';
    this.stateT = 0;
    this.acc = 0;
    this.paused = null;
    this.resultShown = false;
    this.trophyShown = false;
    this.goalTeam = -1;
    this.scorerIdx = -1;
    this.rec = [];
    this.gameT = 0;
    this.evq = [];
    this.t0 = performance.now();
    this.stats = setup.players.map(() => ({ goals: 0, knocks: 0, supers: 0 }));
    this.lateShout = false;
    this.nextShout = 4;
    this.lastShout = 0;
    this.startIntro();
    Effects.clear();
    UI.show(null);
    Touch.build();
    Touch.show(humans >= 1);
    Sound.crowdLevel(0.05);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (this.mode === 'host') Online.publish({ phase: 'match', setup: this.netSetup(), g: this.snapshot() });
  },

  netSetup() {
    const s = this.setup;
    return { id: s.id, rev: s.rev, format: s.format, minutes: s.minutes, arena: s.arena, teams: s.teams, players: s.players, cup: s.cup ? 1 : 0, stage: s.stage || '', label: s.label || '', viet: s.viet || 0 };
  },

  pause() {
    if (!this.inMatch() || this.mode === 'guest') return;
    this.paused = this.state;
    this.state = 'paused';
    Input.clear();
    Touch.reset();
    UI.show('pause');
    Sound.crowdLevel(0);
  },

  resume() {
    if (this.state !== 'paused' || this.mode === 'guest') return;
    this.state = this.paused;
    this.paused = null;
    UI.show(null);
    Sound.init();
    Sound.crowdLevel(0.05);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  },

  backToLobby() {
    if (this.story && this.mode === 'local') {
      this.openStory();
      return;
    }
    this.cup = null;
    if (this.mode === 'host' && this.lobby && this.lobby.mode === 'viet') applyViet(this.lobby);
    if (this.mode === 'host') this.publishLobby();
    this.toLobby();
  },

  showMsg(text, sub, dur, color, size = 120) {
    this.msgId++;
    this.msg = { id: this.msgId, text, sub, dur, color, size, t: 0 };
  },

  /* ---------------- efekty a zvuky (hostitel je rozesílá kamarádům) ---------------- */

  fx(type, ...args) {
    this.playFx(type, args);
    if (this.mode === 'host' && this.screen === 'match') {
      this.evN++;
      this.evq.push([this.evN, type].concat(args.map((v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v))));
      if (this.evq.length > 12) this.evq.shift();
    }
  },

  playFx(type, a) {
    const live = this.state !== 'menu';
    const m = this.match;
    switch (type) {
      case 'kick':
        Effects.kick(a[0], a[1], a[2]);
        if (live) {
          Sound.kick(a[3]);
          Effects.shake(3);
        }
        break;
      case 'head':
        Effects.puff(a[0], a[1]);
        if (live) Sound.head(a[2]);
        break;
      case 'bounce':
        if (a[1] > 0.55) Effects.dust(a[0]);
        if (live) Sound.bounce(a[1]);
        break;
      case 'post':
        Effects.spark(a[0], a[1]);
        if (live) {
          Sound.post();
          Effects.shake(5);
        }
        break;
      case 'swing':
        if (live) Sound.swing();
        break;
      case 'jump':
        if (live) Sound.jump();
        break;
      case 'goal':
        this.goalTeam = a[0];
        this.scorerIdx = a[1] === undefined ? -1 : a[1];
        if (live && !a[2]) this.stat(a[1], 'goals');
        if (m) Effects.confetti(a[0], m.teams[a[0]]);
        if (m && live) {
          const T = m.teams[a[0]];
          for (const x of [330, W - 330]) Effects.pyro(x, [T.color, T.light, '#ffe14d', '#ffffff']);
        }
        Renderer.netHit(a[0] === 0 ? 1 : 0, m ? m.ball.y : 540, 13);
        if (live) {
          Sound.goal();
          Sound.whistle('short');
          Effects.shake(16);
        }
        break;
      case 'net':
        Renderer.netHit(a[0], a[1], Math.min(9, a[2] / 70));
        break;
      case 'trophy':
        if (m) {
          Effects.confetti(a[0], m.teams[a[0]]);
          Effects.confetti(a[0], m.teams[a[0]]);
        }
        if (live) Sound.fanfare();
        break;
      case 'whoosh':
        if (live) Sound.whoosh();
        break;
      case 'superswing':
        if (live) Sound.whoosh();
        break;
      case 'super': {
        const sp = m && m.players[a[3]];
        const col = sp ? superColor(sp.look.id) : '#ffc93c';
        if (live) this.stat(a[3], 'supers');
        Effects.rings.push({ x: a[0], y: a[1], t: 0, dur: 0.45, r0: 10, r1: 90, rgb: hexRgb(col) });
        Effects.spark(a[0], a[1]);
        if (live) Effects.pop('SUPER!', a[0], a[1] - 70, col, 40);
        if (live) {
          Sound.superShot();
          Effects.shake(10);
        }
        break;
      }
      case 'knock':
        Effects.puff(a[0], a[1]);
        Effects.spark(a[0], a[1]);
        Effects.rings.push({ x: a[0], y: a[1], t: 0, dur: 0.4, r0: 20, r1: 120, rgb: '255,225,77' });
        if (live) this.stat(a[2], 'knocks');
        if (live) {
          Effects.pop(pick(['BUM!', 'PRÁSK!', 'BAC!']), a[0], a[1] - 90, '#ff4d4d', 50);
          Sound.knock();
          Effects.shake(12);
        }
        break;
      case 'thud':
        Effects.dust(a[0]);
        Effects.grass(a[0], 10);
        if (live) {
          Sound.thud();
          Effects.shake(5);
        }
        break;
      case 'pyro':
        if (m) {
          for (let side = 0; side < 2; side++) {
            const T = m.teams[side], cols = [T.color, T.light, '#ffe14d', '#ffffff'];
            const x0 = side === 0 ? GOAL_W + 60 : W - GOAL_W - 60;
            Effects.pyro(x0, cols);
            Effects.pyro(side === 0 ? 470 : W - 470, cols);
          }
        }
        if (live) {
          Sound.pyro();
          Effects.shake(4);
        }
        break;
      case 'shout': {
        const team = a[1] === 1 ? 1 : 0;
        const col = m ? m.teams[team].color : '#ffc93c';
        Effects.shout(String(a[0] || '').slice(0, 30), team, col, this.camRectFor(this.cam.x, this.cam.y, this.cam.z));
        if (live) Sound.blip();
        break;
      }
      case 'burst': {
        // hodně bublin najednou (gól): kamera se může zrovna dívat k bráně
        const team = a[1] === 1 ? 1 : 0;
        const col = m ? m.teams[team].color : '#ffc93c';
        const goalCam = a[3] === 1 && this.goalTeam >= 0;
        const rect = goalCam ? this.camRectFor(this.goalTeam === 0 ? W - 330 : 330, 470, Math.max(1.3, this.cam.z)) : this.camRectFor(this.cam.x, this.cam.y, this.cam.z);
        Effects.burst(String(a[0] || '').slice(0, 20), team, col, rect, clamp(Number(a[2]) || 5, 1, 18));
        if (live) Sound.cheer();
        break;
      }
      case 'power': {
        const p = m && m.players[a[0]];
        if (!p) break;
        const kind = a[1];
        const col = superColor(p.look.id);
        if (live) this.stat(a[0], 'supers');
        if (kind === 'cheese') {
          if (live) {
            Sound.cheese();
            Effects.pop('HERMELÍN!', p.team === 0 ? 200 : W - 200, 300, '#f2c14e', 40);
          }
        } else if (kind === 'penguin') {
          Effects.puff(p.x, p.y);
          Effects.snow(p.x, p.y, 26);
          Effects.snow(p.team === 0 ? GOAL_W / 2 : W - GOAL_W / 2, BAR_Y + 80, 40);
          if (live) {
            Sound.freeze();
            Effects.pop('SKIPER!', p.x, p.y - 110, '#53d2ff', 38);
            Effects.shake(6);
          }
        } else if (kind === 'prime') {
          Effects.rings.push({ x: p.x, y: p.y, t: 0, dur: 0.5, r0: 20, r1: 150, rgb: '255,210,80' });
          Effects.rings.push({ x: p.x, y: p.y, t: 0, dur: 0.35, r0: 10, r1: 90, rgb: '255,255,255' });
          Effects.spark(p.x, p.y);
          Effects.spark(p.x, p.y - 40);
          if (live) {
            Effects.pop('JENDA PRIME!', p.x, p.y - 120, '#ffc93c', 38);
            Effects.shake(6);
            Sound.prime();
          }
        } else if (kind === 'basket') {
          Effects.say(a[0], 'STŘÍLIM TY TROJKY', col, 2.2);
          Effects.puff(m.ball.x, m.ball.y);
          if (live) Sound.dribble();
        } else if (kind === 'sushi') {
          Effects.say(a[0], 'JEDEEEM!', col, 1.8);
          Effects.puff(p.x, GROUND_Y - 20);
          Effects.puff(p.x + 40, GROUND_Y - 10);
          if (live) {
            Effects.pop('OBŘÍ SUSHI!', p.x, p.y - 160, '#ff8a5b', 42);
            Effects.shake(6);
            Sound.whoosh();
          }
        } else if (kind === 'arms') {
          Effects.say(a[0], 'TOHLE JE MOJE!', col, 1.6);
          if (live) {
            Effects.pop('GUMOVÉ RUCE!', p.x, p.y - 150, col, 40);
            Sound.whoosh();
          }
        } else if (kind === 'jet') {
          Effects.puff(p.x, p.y);
          Effects.puff(p.x, p.y + 40);
          Effects.spark(p.x, p.y);
          if (live) {
            Effects.pop('BYZNYSMAN!', p.x, p.y - 150, '#cfe3ff', 40);
            Sound.prime();
          }
        } else if (kind === 'grow') {
          Effects.say(a[0], 'UHNĚTE!', col, 2);
          Effects.rings.push({ x: p.x, y: p.y, t: 0, dur: 0.5, r0: 20, r1: 180, rgb: hexRgb(col) });
          Effects.puff(p.x, p.y + 40);
          if (live) {
            Effects.pop('OBŘÍ PÁV!', p.x, p.y - 140, col, 38);
            Effects.shake(7);
            Sound.thud();
          }
        } else if (kind === 'flash') {
          Effects.say(a[0], 'PŘEDPLAŤ SI MĚ!', col, 1.8);
          Effects.whiteT = 0.3; // záblesk přes celou obrazovku
          for (const o of m.players) if (o.team !== p.team) Effects.rings.push({ x: o.x, y: o.y, t: 0, dur: 0.4, r0: 8, r1: 80, rgb: '255,255,255' });
          if (live) {
            Effects.pop('FLASH!', p.x, p.y - 130, '#ffffff', 40);
            Sound.whoosh();
          }
        } else if (kind === 'redcard') {
          Effects.say(a[0], 'ČERVENÁ!', '#ff2d2d', 2);
          Effects.rings.push({ x: p.x, y: p.y, t: 0, dur: 0.5, r0: 20, r1: 220, rgb: '255,45,45' });
          for (const o of m.players) if (o.team !== p.team) Effects.rings.push({ x: o.x, y: o.y, t: 0, dur: 0.4, r0: 8, r1: 70, rgb: '255,45,45' });
          if (live) {
            Effects.pop('ČERVENÁ KARTA!', p.x, p.y - 120, '#ff3b3b', 38);
            Effects.shake(5);
            Sound.whistle('long');
          }
        } else if (kind === 'vo2') {
          Effects.say(a[0], 'MÁM VO2max 67', col, 2.6);
          Effects.rings.push({ x: p.x, y: p.y, t: 0, dur: 0.45, r0: 20, r1: 110, rgb: hexRgb(col) });
          if (live) Sound.vo2();
        }
        break;
      }
      case 'basketshot':
        Effects.rings.push({ x: a[0], y: a[1], t: 0, dur: 0.35, r0: 10, r1: 60, rgb: '255,150,60' });
        if (live) Sound.whoosh();
        break;
      case 'swish':
        Effects.rings.push({ x: a[0], y: a[1], t: 0, dur: 0.4, r0: 14, r1: 80, rgb: '255,170,70' });
        Effects.spark(a[0], a[1]);
        if (live) {
          Sound.swish();
          Effects.pop('TROJKA!', a[0] + (a[2] === 0 ? 170 : -170), BAR_Y + 70, '#ff8a1f', 40);
        }
        break;
      case 'unbasket':
        Effects.puff(a[0], a[1]);
        break;
      case 'blockhit': {
        const x = a[0] === 0 ? GOAL_W : W - GOAL_W;
        if (a[2]) Effects.snow(x, a[1], 10);
        else Effects.puff(x, a[1]);
        if (live) {
          Sound.thud();
          Effects.shake(4 * (a[3] || 0.5));
        }
        break;
      }
      case 'penres': {
        const right = a[1] === 0;
        if (a[0] === 0) {
          Renderer.netHit(right ? 1 : 0, m ? m.ball.y : 520, 11);
          if (m) Effects.confetti(a[1], m.teams[a[1]]);
          if (live) {
            Sound.goal();
            Effects.shake(10);
          }
        } else if (live) {
          Sound.ooh();
          if (a[0] === 1) Effects.pop('CHYTIL!', right ? W - 260 : 260, BAR_Y - 20, '#53d2ff', 40);
        }
        break;
      }
      case 'steal':
        Effects.spark(a[0], a[1]);
        Effects.rings.push({ x: a[0], y: a[1], t: 0, dur: 0.4, r0: 10, r1: 80, rgb: '232,107,255' });
        if (live) {
          Effects.pop(a[2] ? 'UKRADENO Z TRYSKÁČE!' : 'UKRADENO!', a[0], a[1] - 70, '#e86bff', 38);
          Effects.shake(5);
        }
        break;
      case 'armsfar': {
        const p = m && m.players[a[0]];
        if (p) Effects.say(a[0], 'MOC DALEKO!', '#e86bff', 1.2);
        break;
      }
      case 'jetgrab': {
        const p = m && m.players[a[0]];
        if (p) Effects.say(a[0], 'JEDU NA MEETING', '#cfe3ff', 1.6);
        if (live) Sound.whoosh();
        break;
      }
      case 'jetball':
        Effects.puff(a[0], a[1]);
        Effects.spark(a[0], a[1]);
        break;
      case 'jetdrop':
        Effects.rings.push({ x: a[0], y: a[1], t: 0, dur: 0.4, r0: 10, r1: 70, rgb: '207,227,255' });
        if (live) {
          Effects.pop('DORUČENO!', a[0], a[1] - 70, '#cfe3ff', 40);
          Sound.whoosh();
        }
        break;
      case 'wind':
        if (live) {
          Sound.whoosh();
          Effects.pop(a[0] > 0 ? 'VÍTR ➜' : '⬅ VÍTR', W / 2, 200, '#cfe3ff', 40);
        }
        break;
      case 'unprime': {
        const p = m && m.players[a[0]];
        if (p) Effects.puff(p.x, p.y);
        break;
      }
      case 'unblock': {
        const x = a[0] === 0 ? GOAL_W / 2 : W - GOAL_W / 2;
        if (a[1]) {
          Effects.snow(x, BAR_Y + 100, 30);
          if (m) for (const p of m.players) if (p.power === 'penguin' && p.team === a[0]) Effects.puff(p.x, p.y);
          if (live) Sound.crack();
        } else {
          Effects.puff(x, BAR_Y + 100);
          Effects.rings.push({ x, y: BAR_Y + 110, t: 0, dur: 0.35, r0: 30, r1: 140, rgb: '255,246,220' });
          if (live) Sound.whoosh();
        }
        break;
      }
      case 'chant':
        if (live) Sound.chant();
        break;
      case 'ooh':
        if (live) Sound.ooh();
        break;

      case 'whistle':
        if (live) Sound.whistle(a[0]);
        break;
      case 'beep':
        if (live) Sound.beep(!!a[0]);
        break;
      case 'tick':
        if (live) Sound.tick();
        break;
    }
  },

  onEvent(type, d) {
    switch (type) {
      case 'kick':
        this.fx('kick', d.x, d.y, d.dir, d.power);
        this.countShot(false);
        break;
      case 'head':
        this.fx('head', d.x, d.y, Math.min(1, d.impact / 700));
        this.countShot(true);
        break;
      case 'basketshot':
        this.fx('basketshot', d.x, d.y);
        this.countShot(false, true);
        break;
      case 'swish':
        this.fx('swish', d.x, d.y, d.team);
        break;
      case 'unbasket':
        this.fx('unbasket', d.x, d.y);
        break;
      case 'bounce':
        this.fx('bounce', d.x, Math.min(1, d.impact / 900));
        break;
      case 'post':
        this.fx('post', d.x, d.y);
        if (this.state === 'play') this.fx('ooh');
        break;
      case 'swing':
        this.fx('swing');
        break;
      case 'jump':
        if (d.human) this.fx('jump');
        break;
      case 'goal':
        this.onGoal(d);
        break;
      case 'net':
        this.fx('net', d.side, d.y, d.impact);
        break;
      case 'superswing':
        this.fx('superswing');
        break;
      case 'super':
        this.fx('super', d.x, d.y, d.dir, d.idx);
        this.addStat(this.match.players[d.idx], ST_POW);
        this.countShot(false);
        break;
      case 'ram': {
        // Obří páv někoho srazil
        const by = this.match.players[d.by];
        this.fx('knock', d.x, d.y, d.by);
        if (by) this.addStat(by, ST_KNOCK);
        if (this.state === 'play') this.shout('knock', by ? by.team : 0);
        break;
      }
      case 'knock': {
        const b = this.match.ball, by = this.match.players[b.superBy];
        this.fx('knock', d.x, d.y, by ? b.superBy : -1);
        if (by) this.addStat(by, ST_KNOCK);
        if (this.state === 'play') this.shout('knock', by ? by.team : 1 - this.match.players[d.idx].team);
        break;
      }
      case 'thud':
        this.fx('thud', d.x, d.y);
        break;
      case 'power':
        this.fx('power', d.idx, d.kind);
        this.addStat(this.match.players[d.idx], ST_POW);
        if (d.kind === 'penguin') this.shout('skiper', d.team);
        break;
      case 'blockhit':
        this.fx('blockhit', d.team, d.y, d.kind === 'ice' ? 1 : 0, Math.min(1, d.impact / 900));
        break;
      case 'unblock':
        this.fx('unblock', d.team, d.kind === 'ice' ? 1 : 0);
        break;
      case 'unprime':
        this.fx('unprime', d.idx);
        break;
      case 'wind':
        this.fx('wind', d.dir);
        break;
      case 'jetgrab':
        this.fx('jetgrab', d.idx);
        break;
      case 'steal':
        this.fx('steal', d.x, d.y, d.from === 'jet' ? 1 : 0);
        break;
      case 'armsfar':
        this.fx('armsfar', d.idx);
        break;
      case 'jetball':
        this.fx('jetball', d.x, d.y);
        break;
      case 'jetdrop':
        this.fx('jetdrop', d.x, d.y);
        break;
    }
  },

  onGoal(d) {
    if (this.state === 'menu') {
      this.demoGoalAt = this.stateT;
      this.playFx('goal', [d.team]);
      return;
    }
    this.state = 'goal';
    this.stateT = 0;
    this.goalT = this.gameT;
    const s = d.scorer;
    let sub = '';
    if (s) {
      const who = s.isHuman && s.label && s.label !== s.look.name ? `${s.look.name} (${s.label})` : s.look.name;
      const how = d.how === 'super' ? ' superstřelou' : d.how === 'head' ? ' hlavou' : '';
      sub = d.own ? `Vlastní gól: ${who}` : `Skóruje ${who}${how}`;
    }
    this.shout('goal', d.team);
    this.showMsg('GÓL!', sub, 2.5, this.match.teams[d.team].color, 150);
    this.scorePop[d.team] = performance.now();
    this.fx('goal', d.team, d.scorerIdx, d.own ? 1 : 0);
  },

  // Konec 1. poločasu: hvizd, hráči zastaví, pak přestávka se statistikami.
  halfTime() {
    this.state = 'halftime';
    this.stateT = 0;
    this.halfShown = false;
    this.showMsg('POLOČAS', 'Rozhodčí Milan Voračka ukončil 1. poločas', 1.6, '#f3f6ef', 110);
    this.fx('whistle', 'half');
    Touch.show(false);
  },

  secondHalf() {
    if (this.mode === 'guest' || this.state !== 'halftime') return;
    const m = this.match;
    m.kickoff();
    this.half = 2;
    this.clock = HALF_LEN;
    this.rec = [];
    this.state = 'countdown';
    this.stateT = 0;
    this.countShown = 0;
    this.showMsg('2. POLOČAS', '', 1.2, '#ffc93c', 90);
    UI.show(null);
    Touch.build();
    Touch.show(!!this.myPlayer());
  },

  /* ---------------- penalty ---------------- */

  startShootout() {
    const m = this.match;
    m.pens = [0, 0];
    m.locked = true; // góly ze hry se už nepočítají
    this.pen = { kicks: [[], []], turn: 0, phase: 'intro', t: 0, ft: null };
    this.state = 'shootout';
    this.stateT = 0;
    this.rec = [];
    Effects.clear();
    this.showMsg('PENALTY', 'Remíza – rozhodne penaltový rozstřel', 2.2, '#ffc93c', 110);
    this.fx('whistle', 'long');
    this.penSetup();
    this.pen.phase = 'intro';
    this.pen.t = -0.8;
  },

  // Další penalta: kdo kope a kdo chytá.
  penSetup() {
    const m = this.match, P = this.pen, team = P.turn, opp = 1 - team;
    const shooters = m.players.filter((p) => p.team === team);
    const sh = shooters[P.kicks[team].length % shooters.length];
    const keepers = m.players.filter((p) => p.team === opp);
    // chytá člověk, pokud v týmu nějaký je (ať si to užije)
    const kp = keepers.find((p) => p.isHuman) || keepers.find((p) => p.role === 'defender') || keepers[0];
    Object.assign(P, {
      shooter: m.players.indexOf(sh), keeper: m.players.indexOf(kp), phase: 'aim', t: 0, ft: null,
      ax: 0, ay: 0.45, aimT: 0, su: 0, sv: 0, kx: 0, ky: 0.36, kd: 0, kc: false, res: '', plan: null,
      cpuAt: rand(1.3, 2.5),
    });
  },

  // Ovládání hráče (člověk na tomto zařízení / kamarád), u počítače null.
  penInput(p) {
    if (!p || p.brain) return null;
    if (p.remote) return Online.remoteIntent(p.remote);
    return Input.intent(p.slot >= 0 ? p.slot : 0);
  },

  // Brankář se rozhodne, kam skočí.
  penCommit(kx, ky) {
    const P = this.pen;
    if (P.kc) return;
    P.kc = true;
    P.kx = clamp(kx, -0.95, 0.95);
    P.ky = clamp(ky, 0.06, 0.92);
  },

  penKeeperFromInput(it) {
    const mx = typeof it.move === 'number' ? it.move : (it.right ? 1 : 0) - (it.left ? 1 : 0);
    const my = typeof it.my === 'number' ? it.my : (it.down ? 1 : 0) - (it.jump ? 1 : 0);
    if (Math.abs(mx) > 0.45 || Math.abs(my) > 0.45) {
      this.penCommit(Math.abs(mx) > 0.45 ? Math.sign(mx) * 0.72 : 0, my < -0.45 ? 0.74 : my > 0.45 ? 0.12 : 0.4);
    } else if (it.kick || it.super) {
      this.penCommit(0, 0.78);
    }
  },

  updateShootout(dt) {
    const m = this.match, P = this.pen;
    if (!P) return;
    P.t += dt;
    const sh = m.players[P.shooter], kp = m.players[P.keeper];
    const shIn = this.penInput(sh), kpIn = this.penInput(kp);
    // ostatní lidé na tomto zařízení: zahodit stisky
    if (!shIn && !kpIn && this.mode !== 'guest') Input.intent(0);
    if (P.phase === 'intro') {
      if (P.t > 1.4) {
        P.phase = 'aim';
        P.t = 0;
      }
      return;
    }
    if (P.kc) P.kd = Math.min(1, P.kd + dt / 0.3);
    if (P.phase === 'aim') {
      P.aimT += dt;
      // míření (střelec na tomto zařízení; kamarád posílá výsledek se stiskem)
      if (shIn && !sh.remote) {
        const mx = typeof shIn.move === 'number' ? shIn.move : 0;
        const my = typeof shIn.my === 'number' ? shIn.my : (shIn.down ? 1 : 0) - (shIn.jump ? 1 : 0);
        P.ax = clamp(P.ax + mx * 1.45 * dt, -1.3, 1.3);
        P.ay = clamp(P.ay - my * 1.15 * dt, 0, 1.3);
      }
      // brankář může skočit i dřív (tipne si)
      if (kpIn) this.penKeeperFromInput(kpIn);
      let shoot = false, u = 0, v = 0;
      if (!sh.brain && shIn) {
        if (shIn.kick || shIn.super || P.aimT > PEN_AIM_TIME) {
          shoot = true;
          if (sh.remote && typeof shIn.au === 'number') {
            u = shIn.au;
            v = shIn.av;
          } else {
            const w = penWobble(P.aimT);
            u = P.ax + w.u;
            v = P.ay + w.v;
          }
        }
      } else if (sh.brain && P.t > P.cpuAt) {
        shoot = true;
        const level = this.setup.level || 'medium';
        const miss = { easy: 0.15, medium: 0.09, hard: 0.05 }[level] || 0.09;
        if (Math.random() < miss) {
          if (Math.random() < 0.5) {
            u = (Math.random() < 0.5 ? -1 : 1) * rand(1.03, 1.2);
            v = rand(0.1, 0.8);
          } else {
            u = rand(-0.9, 0.9);
            v = rand(1.03, 1.2);
          }
        } else {
          // spíš do rohů, občas doprostřed
          u = Math.random() < 0.8 ? (Math.random() < 0.5 ? -1 : 1) * rand(0.38, 0.92) : rand(-0.3, 0.3);
          v = rand(0.06, 0.9);
        }
      }
      if (shoot) this.penShoot(u, v);
      return;
    }
    if (P.phase === 'flight') {
      P.ft += dt;
      if (kpIn) this.penKeeperFromInput(kpIn);
      if (kp.brain && P.plan && !P.kc && P.ft >= P.plan.at) this.penCommit(P.plan.kx, P.plan.ky);
      if (!P.res && P.ft >= PS3.flight) this.penResolve();
      if (P.res && P.ft > PS3.flight + 1.9) {
        if (this.penDecided()) {
          this.finish();
          return;
        }
        P.turn = P.kicks[0].length > P.kicks[1].length ? 1 : 0;
        this.penSetup();
      }
    }
  },

  penShoot(u, v) {
    const m = this.match, P = this.pen, kp = m.players[P.keeper];
    P.su = u;
    P.sv = Math.max(0.02, v);
    P.phase = 'flight';
    P.t = 0;
    P.ft = 0;
    this.fx('kick', W / 2, PS3.spotY, 1, 1.2);
    // brankář počítače: tipne si stranu a výšku
    if (kp.brain && !P.kc) {
      const level = this.setup.level || 'medium';
      const read = { easy: 0.12, medium: 0.22, hard: 0.34 }[level] || 0.22;
      const side = Math.random() < read ? Math.sign(Math.abs(u) < 0.3 ? 0 : u) : [-1, 0, 1][Math.floor(Math.random() * 3)];
      const high = Math.random() < 0.6 ? v > 0.5 : Math.random() < 0.5;
      P.plan = { kx: side * 0.72, ky: side === 0 ? (high ? 0.78 : 0.36) : high ? 0.7 : 0.2, at: rand(0.08, 0.22) };
    }
  },

  // Míč doletěl do roviny brány: gól, chycení, tyčka nebo vedle.
  penResolve() {
    const m = this.match, P = this.pen, sh = m.players[P.shooter], kp = m.players[P.keeper];
    const u = P.su, v = P.sv, team = sh.team;
    const e = easeOutQuad(P.kd);
    const kx = lerp(0, P.kx, e), ky = lerp(0.36, P.ky, e);
    let res;
    if (Math.abs(u) > 1.07 || v > 1.07) res = 'miss';
    else if (Math.abs(u) > 0.97 || v > 0.97) res = Math.random() < 0.5 ? 'post' : 'miss';
    else {
      const d = Math.hypot(u - kx, (v - ky) * 0.85);
      const reach = P.kc ? 0.16 + 0.12 * e : 0.22;
      res = d < reach ? 'save' : 'goal';
    }
    P.res = res;
    P.kx = P.kc ? P.kx : 0;
    P.kicks[team].push(res === 'goal');
    if (res === 'goal') m.pens[team]++;
    const T = m.teams[team];
    if (res === 'goal') {
      this.showMsg('GÓL!', `Penaltu proměnil${sh.look.girl ? 'a' : ''} ${sh.look.name}`, 1.7, T.color, 130);
      this.shout('goal', team);
    } else if (res === 'save') {
      this.showMsg('CHYTIL!', `${kp.look.name} penaltu chytil${kp.look.girl ? 'a' : ''}`, 1.7, m.teams[kp.team].color, 120);
    } else {
      this.showMsg(res === 'post' ? 'TYČKA!' : 'VEDLE!', `${sh.look.name} penaltu neproměnil${sh.look.girl ? 'a' : ''}`, 1.7, '#f3f6ef', 120);
    }
    this.fx('penres', res === 'goal' ? 0 : res === 'save' ? 1 : 2, team);
  },

  // Je rozhodnuto? (5 penalt na tým, pak náhlá smrt)
  penDecided() {
    const [a, b] = this.pen.kicks;
    const ga = a.filter(Boolean).length, gb = b.filter(Boolean).length;
    if (a.length <= PEN_ROUNDS && b.length <= PEN_ROUNDS) {
      if (ga + (PEN_ROUNDS - a.length) < gb || gb + (PEN_ROUNDS - b.length) < ga) return true;
      if (a.length === PEN_ROUNDS && b.length === PEN_ROUNDS) return ga !== gb;
      return false;
    }
    return a.length === b.length && ga !== gb;
  },

  // Konec 90. minuty: při remíze rozhodnou penalty.
  timeUp() {
    const m = this.match;
    if (m.score[0] !== m.score[1]) {
      this.finish();
      return;
    }
    this.startShootout();
  },

  finish() {
    const m = this.match;
    m.locked = true;
    for (const p of m.players) {
      p.celeb = '';
      p.kneel = p.plane = p.face = 0;
    }
    m.penPair = null;
    m.celebrate = Math.max(0, m.winner());
    // ceremoniál: vítězové doprostřed, poražení ke své brance
    const win = m.celebrate;
    const wins = m.players.filter((p) => p.team === win), loss = m.players.filter((p) => p.team !== win);
    wins.forEach((p, k) => { p.cerX = W / 2 + (k - (wins.length - 1) / 2) * 140; });
    loss.forEach((p, k) => { p.cerX = p.team === 0 ? 200 + k * 125 : W - 200 - k * 125; });
    this.trophyShown = false;
    this.state = 'over';
    this.stateT = 0;
    this.resultShown = false;
    this.showMsg('KONEC ZÁPASU', '', 1.6, '#f3f6ef', 90);
    this.fx('whistle', 'final');
    Touch.show(false);
    UI.show(null);
  },

  physMode() {
    const m = this.match;
    switch (this.state) {
      case 'menu': return m.ball.held ? 'freeze' : m.goalTeam >= 0 ? 'celebrate' : 'play';
      case 'play': return 'play';
      case 'goal': return 'celebrate';
      case 'over': return 'ceremony';
      case 'shootout': return 'pen';
      default: return 'freeze';
    }
  },

  physics(dt, scale) {
    this.gameT += dt * scale;
    this.acc += dt * scale;
    let n = 0;
    const mode = this.physMode();
    while (this.acc >= STEP && n < 30) {
      this.match.step(STEP, mode);
      this.acc -= STEP;
      n++;
      // držení míče: kdo se ho naposledy dotkl
      const lt = this.match.ball.lastTouch;
      if (mode === 'play' && this.state === 'play' && lt && this.tstats) this.tstats[lt.team][ST_POS] += STEP;
    }
    if (n >= 30) this.acc = 0;
  },

  update(dt) {
    if (this.msg) {
      this.msg.t += dt;
      if (this.msg.t >= this.msg.dur) this.msg = null;
    }
    // skluz po kolenou: odlétá tráva
    if (this.match && this.screen === 'match') {
      for (const p of this.match.players) {
        if (p.kneel > 0.5 && Math.abs(p.vx) > 110 && Math.random() < dt * 40) Effects.grass(p.x, 1);
        // jízda na sushi: za sushi odlétají zrnka rýže
        if (p.sushiT > 0 && p.lift > 20 && Math.random() < dt * 35) {
          Effects.add({ x: p.x - p.dir * 70, y: GROUND_Y - rand(6, 30), vx: -p.dir * rand(60, 200), vy: rand(-220, -60), g: 900, life: rand(0.3, 0.55), size: rand(2, 3.2), color: '#fbfbf6' });
        }
      }
    }
    if (this.mode === 'guest' && this.screen === 'match') {
      this.guestUpdate(dt);
      return;
    }
    if (this.state === 'paused') {
      if (this.mode === 'host') Online.publish({ g: this.snapshot() });
      return;
    }
    Effects.update(dt);
    this.stateT += dt;
    const m = this.match;

    switch (this.state) {
      case 'intro':
        this.updateIntro(dt);
        if (this.stateT >= INTRO_DUR) this.endIntro();
        break;

      case 'replay':
        this.replayT += dt * REPLAY_SPEED;
        this.applyReplay(this.replayFrom + this.replayT);
        if (this.replayFrom + this.replayT >= this.replayTo) this.endReplay();
        break;

      case 'menu':
        if (m.ball.held && this.stateT > 0.7) m.release();
        if ((m.goalTeam >= 0 && this.stateT - this.demoGoalAt > 1.8) || m.ball.stalled) {
          m.kickoff();
          this.stateT = 0;
        }
        this.physics(dt, 1);
        break;

      case 'countdown': {
        const n = 3 - Math.floor(this.stateT / 0.75);
        if (n >= 1 && n !== this.countShown) {
          this.countShown = n;
          // ve speciální aréně pod odpočtem připomenout, co je jinak
          const tip = this.half === 1 && m ? ARENAS[m.arenaId].tip || '' : '';
          this.showMsg(String(n), tip, 0.7, '#f3f6ef', 150);
          this.fx('beep', 0);
        }
        if (this.stateT >= 2.25) {
          this.state = 'play';
          this.stateT = 0;
          m.release();
          this.showMsg('HRAJ!', '', 0.9, '#ffc93c', 130);
          this.fx('beep', 1);
          this.fx('whistle', 'short');
        }
        this.physics(dt, 1);
        break;
      }

      case 'kickoff':
        if (this.stateT >= 1) {
          this.state = 'play';
          this.stateT = 0;
          m.release();
          this.fx('whistle', 'short');
        }
        this.physics(dt, 1);
        break;

      case 'play': {
        this.clock += dt;
        if (!this.golden) {
          const end = this.half * HALF_LEN;
          const left = Math.ceil(end - this.clock);
          if (this.half === 2 && left <= 3 && left >= 1 && left !== this.lastTick) {
            this.lastTick = left;
            this.fx('tick');
          }
          if (this.clock >= end) {
            this.clock = end;
            if (this.half === 1) this.halfTime();
            else this.timeUp();
            if (this.state !== 'play') break;
          }
        }
        this.physics(dt, 1);
        if (this.state === 'play' && m.ball.stalled) {
          m.kickoff();
          this.rec = [];
          this.state = 'kickoff';
          this.stateT = 0;
          this.showMsg('NOVÝ VÝKOP', '', 1, '#f3f6ef', 80);
        }
        const nearGoal = Math.min(m.ball.x, W - m.ball.x) < 260;
        Sound.crowdLevel(nearGoal ? 0.1 : 0.05);
        // tribuny čas od času povzbuzují
        this.nextShout -= dt;
        if (this.nextShout <= 0) {
          this.nextShout = rand(5, 8.5);
          const lead = m.score[0] === m.score[1] ? (Math.random() < 0.5 ? 0 : 1) : m.score[0] < m.score[1] ? 0 : 1;
          this.shout('chant', Math.random() < 0.65 ? lead : 1 - lead);
          if (Math.random() < 0.5) this.fx('chant');
        }
        break;
      }

      case 'shootout':
        this.updateShootout(dt);
        break;

      case 'halftime':
        this.physics(dt, 1);
        if (!this.halfShown && this.stateT > HALF_SHOW) {
          this.halfShown = true;
          m.kickoff();
          UI.showHalf();
        }
        if (this.mode !== 'guest' && this.stateT > 40) this.secondHalf();
        break;

      case 'goal':
        if (Math.random() < dt * 22) Effects.flash();
        this.physics(dt, this.stateT < 0.9 ? 0.4 : 1);
        if (this.stateT > 2.6) this.startReplay();
        break;

      case 'over':
        if (Math.random() < dt * 14) Effects.flash();
        this.physics(dt, 1);
        if (!this.trophyShown && this.stateT > 1.6) {
          this.trophyShown = true;
          this.fx('trophy', m.celebrate);
        }
        if (!this.resultShown && this.stateT > RESULT_AT) this.showResultNow();
        break;
    }
    if (this.screen === 'match' && (this.state === 'play' || this.state === 'goal')) this.record();
    this.updateCam(dt);
    this.updateSuperUI();
    UI.setSkip(this.canSkip());

    if (this.mode === 'host' && this.screen === 'match') {
      if (this.setup.rev !== this._sentRev) {
        this._sentRev = this.setup.rev;
        Online.publish({ setup: this.netSetup() });
      }
      Online.publish({ g: this.snapshot() });
    }
  },

  // Hráč ovládaný na tomto zařízení.
  myPlayer() {
    const m = this.match;
    if (!m || this.screen !== 'match' || !this.setup) return null;
    if (this.mode === 'guest') {
      const i = this.setup.players.findIndex((sp) => sp.ctrl === Online.uid);
      return i >= 0 ? m.players[i] : null;
    }
    return m.players.find((p) => p.slot === 0) || null;
  },

  // Nabití superstřely na tlačítku a v rohu obrazovky.
  updateSuperUI() {
    const me = this.myPlayer();
    const c = me ? me.superCharge : 0;
    this.myCharge = me ? c : -1;
    this.myColor = me ? superColor(me.look.id) : '#ffc93c';
    Touch.setCharge(c);
    Touch.setColor(this.myColor);
    Touch.setPower(me ? me.power : 'shot');
    // penalty: jen potřebné ovládání, na straně bez brány
    if (this.state === 'shootout' && this.pen && me) {
      const idx = this.match.players.indexOf(me);
      const role = idx === this.pen.shooter ? 'shoot' : idx === this.pen.keeper ? 'keep' : 'watch';
      Touch.setPen(role, this.pen.turn === 0);
    } else {
      Touch.setPen(null);
    }
    this.myPower = me ? me.power : 'shot';
    if (me && c >= 1 && (this._lastCharge || 0) < 1 && this.state === 'play') Sound.charged();
    this._lastCharge = c;
  },

  /* ---------------- filmové scény ---------------- */

  startIntro() {
    const m = this.match;
    const order = [0, 0];
    m.players.forEach((p) => {
      const k = order[p.team]++;
      p.introX = p.team === 0 ? -70 - k * 120 : W + 70 + k * 120;
      p.x = p.introX;
    });
    m.ball.reset(W / 2, KICKOFF_Y);
    this.cam.x = JUMBO.x + JUMBO.w / 2;
    this.cam.y = JUMBO.y + JUMBO.h / 2 + 30;
    this.cam.z = 1.75;
    this.cam.bars = 1;
    this.introTalk = this.makeTalk(this.setup);
    this.introCues = 0;
    this.fx('whoosh');
  },

  // Kdo z každého týmu před zápasem promluví a co řekne (stejné u všech hráčů online).
  makeTalk(setup) {
    const rng = mulberry32(seedOf(String(setup.id || 'x')));
    const out = [];
    for (let team = 0; team < 2; team++) {
      const idx = setup.players.map((sp, i) => (sp.team === team ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) continue;
      const i = idx[Math.floor(rng() * idx.length)];
      const id = setup.players[i].char;
      const pool = (QUIPS[id] || []).concat(rng() < 0.3 ? QUIPS_ANY : []);
      out.push({ idx: i, at: TALK_AT[team], text: pick2(rng, pool.length ? pool : QUIPS_ANY) });
    }
    return out;
  },

  // Pokřik z tribuny (hostitel ho rozešle i kamarádům).
  // Pokřik fanoušků týmu `team` (sedí na jeho polovině tribun).
  //  chant – pokřik z tribun, pokřik dvojice nebo jméno hráče
  //  knock – SLAJZNUL DO BAHNA, goal – 15 bublin GÓL, skiper – SKIPER (Bémič tučňák)
  shout(kind, team) {
    if (!this.match || this.state === 'menu') return;
    const ps = this.match.players.filter((p) => p.team === team);
    if (kind === 'goal') {
      this.fx('burst', SHOUTS.goal, team, 15, 1);
      return;
    }
    if (kind === 'skiper') {
      this.fx('burst', 'SKIPER', team, 7, 0);
      return;
    }
    let text;
    if (kind === 'knock') {
      text = SHOUTS.knock;
    } else {
      const own = [];
      for (const q of ps) {
        const d = duoOf(q.look.id);
        if (d >= 0) for (const t of DUO_SHOUTS[d] || []) if (!own.includes(t)) own.push(t);
      }
      const r = Math.random();
      if (own.length && r < 0.38) text = pick(own);
      else if (r < 0.72 || !ps.length) text = pick(SHOUTS.crowd);
      else {
        const n = pick(ps).look.name.toUpperCase();
        text = `${n} ${n}`;
      }
    }
    this.lastShout = this.gameT;
    this.fx('shout', text.slice(0, 30), team);
  },

  // Výřez světa, který kamera ukáže s cílem (tx, ty, tz).
  camRectFor(tx, ty, tz) {
    const v = Renderer.view;
    const hw = (v.x1 - v.x0) / (2 * tz), hh = (v.y1 - v.y0) / (2 * tz);
    const x = clamp(tx, v.x0 + hw, v.x1 - hw), y = clamp(ty, v.y0 + hh, v.y1 - hh);
    return { x0: x - hw, x1: x + hw, y0: y - hh, y1: y + hh };
  },

  // Na které půlce je míč (fanoušci toho týmu reagují).
  ballSide() {
    return this.match && this.match.ball.x > W / 2 ? 0 : 1;
  },

  stat(idx, key) {
    const st = this.stats && this.stats[idx];
    if (st) st[key]++;
  },

  // Statistiky týmu (počítá hostitel, kamarádi je dostanou).
  addStat(p, k, v = 1) {
    if (!p || !this.tstats || this.state === 'menu') return;
    this.tstats[p.team][k] += v;
  },

  // Střela: míč letí k brance soupeře; na bránu, když by bez hráčů skončil v bráně.
  countShot(header, force) {
    const m = this.match, b = m && m.ball, p = b && b.lastTouch;
    if (!p || this.state !== 'play') return;
    if (header) this.addStat(p, ST_HEAD);
    const dir = p.team === 0 ? 1 : -1;
    if (!force && b.vx * dir < 260) return;
    this.addStat(p, ST_SHOT);
    const pred = predictBall(b, 1.8);
    const on = pred.some((q) => q.y > BAR_Y + BAR_T && (dir > 0 ? q.x > W - GOAL_W + b.r : q.x < GOAL_W - b.r));
    if (on || force) this.addStat(p, ST_ON);
  },

  // Hráč zápasu: nejvíc gólů, pak odstřelení a superstřely (vítězný tým má přednost).
  computeMvp() {
    const m = this.match;
    if (!m || !this.stats) return null;
    const win = m.winner();
    let best = -1, bestScore = -1;
    m.players.forEach((p, i) => {
      const st = this.stats[i];
      if (!st) return;
      const sc = st.goals * 10 + st.knocks * 3 + st.supers + (p.team === win ? 5 : 0);
      if (sc > bestScore) {
        bestScore = sc;
        best = i;
      }
    });
    return best < 0 ? null : Object.assign({ idx: best, p: m.players[best] }, this.stats[best]);
  },

  // Poháry za zápas pro hráče na tomto zařízení (jednou za zápas).
  award() {
    const m = this.match, setup = this.setup;
    if (!m || !setup) return null;
    if (this.awardedId === setup.id) return this.lastReward;
    const me = this.myPlayer();
    if (!me || m.winner() < 0) return null;
    this.awardedId = setup.id;
    const idx = m.players.indexOf(me);
    const st = (this.stats && this.stats[idx]) || { goals: 0, knocks: 0, supers: 0 };
    const win = m.winner() === me.team;
    const prof = Profile.get();
    const before = prof.trophies;
    // poháry podle obtížnosti (online proti kamarádovi zvlášť)
    const vsHuman = setup.players.some((sp) => sp.team !== me.team && sp.ctrl !== 'cpu');
    const key = vsHuman ? 'online' : TROPHY_RULES[setup.level] ? setup.level : 'medium';
    const R = TROPHY_RULES[key];
    const parts = [];
    let delta;
    if (win) {
      const big = Math.max(0, Math.min(R.bonus, Math.abs(m.score[0] - m.score[1]) - 1));
      const goals = Math.min(R.bonus, st.goals);
      delta = R.win + big + goals;
      parts.push(`výhra (${R.name}) +${R.win}`);
      if (big > 0) parts.push(`rozdíl +${big}`);
      if (goals > 0) parts.push(`tvoje góly +${goals}`);
    } else {
      const goals = Math.min(1, st.goals, R.lose);
      delta = -Math.min(before, R.lose - goals);
      parts.push(`prohra (${R.name}) −${R.lose}` + (goals ? `, tvůj gól +${goals}` : ''));
    }
    // vítězství v turnaji (podle obtížnosti turnaje)
    this.cupRecord();
    if (this.cup && setup.cup && this.cup.stage === 'done' && this.cup.won) {
      const cb = (TROPHY_RULES[this.cup.level] || TROPHY_RULES.medium).cup;
      const bonus = vsHuman ? Math.max(cb, TROPHY_RULES.online.cup) : cb;
      delta += bonus;
      parts.push(`turnaj +${bonus}`);
      prof.cups++;
    }
    prof.trophies = Math.max(0, before + delta);
    prof.played++;
    if (win) prof.wins++;
    prof.goals += st.goals;
    prof.supers += st.supers;
    prof.knocks += st.knocks;
    prof.streak = win ? prof.streak + 1 : 0;
    prof.bestStreak = Math.max(prof.bestStreak, prof.streak);
    Profile.save(prof);
    const tasks = Tasks.record(me.look.id, st.goals);
    const vietReward = setup.viet ? Viet.record(win, setup.viet) : false;
    Board.afterMatch(me.look.id);
    this.lastReward = { delta, before, after: prof.trophies, win, parts, streak: prof.streak, tasks, vietReward };
    return this.lastReward;
  },

  // Hráči vybíhají na hřiště.
  updateIntro(dt) {
    const m = this.match;
    const u = clamp((this.stateT - 0.4) / 1.9, 0, 1);
    for (const p of m.players) {
      const nx = lerp(p.introX, p.homeX, easeOutQuad(u));
      p.vx = dt > 0 ? (nx - p.x) / dt : 0;
      p.x = nx;
      p.y = p.standY;
      p.vy = 0;
      p.onGround = true;
      p.runPhase += p.vx * p.dir * dt * 0.05;
      p.mood = 0;
    }
    const t = this.stateT;
    // rozcvička: každý dělá něco jiného, pak se vrátí na místo
    if (t >= WARM_AT && t < WARM_END + 0.6) {
      m.players.forEach((p, i) => {
        const kind = WARM_KINDS[i % WARM_KINDS.length];
        const wt = t - WARM_AT, back = t >= WARM_END;
        if (kind === 'jacks' && !back) {
          const hop = Math.abs(Math.sin(wt * 6.5)) * 24;
          p.y = p.standY - hop;
          p.vy = Math.cos(wt * 6.5) * -150;
          p.onGround = hop < 3;
          p.mood = 1;
        } else if (kind === 'juggle' && !back) {
          const ph = wt % 0.55;
          p.kickT = ph < PHYS.kickDur ? ph : -1;
        } else if (kind === 'sprint') {
          // sprinty ke středu hřiště a zpátky
          const nx = back ? lerp(p.x, p.homeX, Math.min(1, dt * 8)) : p.homeX + (0.5 - 0.5 * Math.cos(wt * 2.4)) * 170 * p.dir;
          p.vx = dt > 0 ? (nx - p.x) / dt : 0;
          p.x = nx;
          p.runPhase += p.vx * p.dir * dt * 0.05;
        }
      });
    }
    this.warmPose(t);
    // mluvčí při hlášce mává rukama
    for (const k of this.introTalk || []) {
      if (t >= k.at && t < k.at + TALK_DUR && m.players[k.idx]) m.players[k.idx].mood = 1;
    }
    // ohňostroj a pokřiky tribun
    const cues = [[WARM_AT + 0.4, () => this.shout('chant', 0)], [WARM_AT + 1.6, () => this.shout('chant', 1)], [REF_AT + 0.8, () => this.fx('whistle', 'short')], [REF_END, () => this.fx('pyro')],
      [TALK_AT[0] + 0.15, () => this.shout('chant', 0)], [TALK_AT[1] + 0.15, () => this.shout('chant', 1)], [TALK_AT[1] + 1, () => this.shout('chant', 0)]];
    while (this.introCues < cues.length && t >= cues[this.introCues][0]) cues[this.introCues++][1]();
  },

  // Náklon při protahování a výška žonglovaného míče (počítá i kamarád podle času).
  warmPose(t) {
    const m = this.match;
    const on = this.state === 'intro' && t >= WARM_AT && t < WARM_END;
    m.players.forEach((p, i) => {
      const kind = WARM_KINDS[i % WARM_KINDS.length], wt = t - WARM_AT;
      p.lean = on && kind === 'stretch' ? Math.sin(wt * 2.2) * 0.38 : 0;
      p.jball = on && kind === 'juggle' ? Math.abs(Math.sin((Math.PI * wt) / 0.55)) * 62 : -1;
    });
  },

  endIntro() {
    const m = this.match;
    for (const p of m.players) {
      p.place(p.homeX);
      p.lean = 0;
      p.jball = -1;
    }
    this.introCues = 99;
    this.nextShout = 3;
    this.state = 'countdown';
    this.stateT = 0;
    this.countShown = 0;
  },

  // Záznam pro opakování gólu (herní čas, ne skutečný).
  record() {
    const m = this.match, b = m.ball;
    this.rec.push({
      t: this.gameT,
      b: [b.x, b.y, b.rot, b.superT, b.superBy, b.basketT, b.basketSide],
      p: m.players.map((p) => [p.x, p.y, p.kickT, p.onGround ? 1 : 0, p.vx, p.vy, p.stunT, p.spin, p.boostT, p.pengT, p.kneel, p.face, p.plane, p.shootT, p.primeT, p.flashT, p.growK || 1, p.selfieT, p.growT, p.suitT, p.sushiT, p.lift || 0]),
      bk: [m.blocks[0], m.blocks[1]],
      j: m.jet ? [m.jet.x, m.jet.y, m.jet.dir, m.jet.t, m.jet.by, m.jet.hold ? 1 : 0] : null,
      a: m.arms ? [m.arms.by, m.arms.t, m.arms.bx, m.arms.by0] : null,
    });
    while (this.rec.length && this.rec[0].t < this.gameT - 5) this.rec.shift();
  },

  startReplay() {
    const rec = this.rec;
    if (rec.length < 10) {
      this.endReplay();
      return;
    }
    this.replayFrom = Math.max(rec[0].t, this.goalT - 2.3);
    this.replayTo = Math.min(rec[rec.length - 1].t, this.goalT + 0.55);
    this.replayT = 0;
    this.replayIdx = 0;
    this.state = 'replay';
    this.stateT = 0;
    this.msg = null;
    Effects.clear();
    this.fx('whoosh');
    this.applyReplay(this.replayFrom);
  },

  applyReplay(t) {
    const rec = this.rec, m = this.match;
    let i = this.replayIdx;
    while (i < rec.length - 2 && rec[i + 1].t <= t) i++;
    this.replayIdx = i;
    const A = rec[i], B = rec[i + 1] || A;
    const k = B.t > A.t ? clamp((t - A.t) / (B.t - A.t), 0, 1) : 0;
    m.arms = A.a && B.a ? { by: A.a[0], t: lerp(A.a[1], B.a[1], k), bx: A.a[2], by0: A.a[3] } : null;
    const ja = A.j, jb = B.j;
    m.jet = ja && jb ? { x: lerp(ja[0], jb[0], k), y: lerp(ja[1], jb[1], k), dir: ja[2], t: lerp(ja[3], jb[3], k), by: ja[4], hold: !!ja[5] } : null;
    m.players.forEach((p, j) => {
      const a = A.p[j], b = B.p[j];
      if (!a || !b) return;
      p.x = lerp(a[0], b[0], k);
      p.y = lerp(a[1], b[1], k);
      p.kickT = b[2];
      p.onGround = !!b[3];
      p.vx = b[4];
      p.vy = b[5];
      p.stunT = b[6] || 0;
      p.boostT = b[8] || 0;
      p.pengT = b[9] || 0;
      p.kneel = b[10] || 0;
      p.face = b[11] || 0;
      p.plane = b[12] || 0;
      p.shootT = b[13] || 0;
      p.primeT = b[14] || 0;
      p.flashT = b[15] || 0;
      p.selfieT = b[17] || 0;
      p.growT = b[18] || 0;
      p.suitT = b[19] || 0;
      p.sushiT = b[20] || 0;
      p.lift = b[21] || 0;
      sizeGrow(p, b[16] || 1);
      p.spin = b[7] && a[7] && Math.sign(a[7]) === Math.sign(b[7]) ? lerp(a[7], b[7], k) : b[7] || 0;
      p.mood = 0;
      if (p.onGround) p.runPhase += p.vx * p.dir * 0.016 * 0.05 * REPLAY_SPEED;
    });
    m.ball.x = lerp(A.b[0], B.b[0], k);
    m.ball.y = lerp(A.b[1], B.b[1], k);
    m.ball.rot = lerp(A.b[2], B.b[2], k);
    m.ball.superT = B.b[3] || 0;
    m.ball.basketT = B.b[5] || 0;
    m.ball.basketSide = B.b[6] === undefined ? -1 : B.b[6];
    if (B.bk) {
      m.blocks[0] = B.bk[0];
      m.blocks[1] = B.bk[1];
    }
    m.ball.superBy = B.b[4] === undefined ? -1 : B.b[4];
    m.ball.vx = (B.b[0] - A.b[0]) / Math.max(0.001, B.t - A.t);
    m.ball.vy = (B.b[1] - A.b[1]) / Math.max(0.001, B.t - A.t);
  },

  endReplay() {
    const m = this.match;
    this.rec = [];
    if (this.golden) {
      this.finish();
      return;
    }
    m.kickoff();
    this.state = 'kickoff';
    this.stateT = 0;
  },

  showResultNow() {
    this.resultShown = true;
    UI.showResult();
  },

  canSkip() {
    if (this.mode === 'guest' || this.screen !== 'match') return false;
    return this.state === 'intro' || this.state === 'replay' || (this.state === 'over' && !this.resultShown && this.stateT > 0.8);
  },

  skip() {
    if (!this.canSkip()) return;
    if (this.state === 'intro') this.endIntro();
    else if (this.state === 'replay') this.endReplay();
    else if (this.state === 'over') {
      if (!this.trophyShown) {
        this.trophyShown = true;
        this.stateT = 1.6;
        this.fx('trophy', this.match.celebrate);
      } else {
        this.showResultNow();
      }
    }
  },

  // Kamera: při scénách přibližuje, jinak ukazuje celé hřiště.
  updateCam(dt) {
    const c = this.cam, m = this.match, st = this.state, t = this.stateT;
    const vc = Renderer.viewCenter(), v = Renderer.view;
    let tx = vc.x, ty = vc.y, tz = 1, bars = 0, speed = 2.4;
    if (this.screen === 'match' && m) {
      // široký displej (telefon na šířku): přiblížit tak, aby hřiště vyplnilo
      // šířku, a výšku dorovnat podle míče (vysoký míč = kamera nahoru)
      const vw = v.x1 - v.x0, vh = v.y1 - v.y0;
      const fit = vw / (W + 70);
      if (fit > 1.02) {
        tz = Math.min(fit, 1.3);
        const hh = vh / (2 * tz);
        tx = W / 2;
        ty = clamp(m.ball.y + hh - 90, v.y0 + hh, v.y1 - hh);
        // letí tryskáč: kamera se oddálí, ať je vidět celý i s Durcadem na žebříku
        if (m.jet && m.jet.t < 2.6) {
          tz = Math.max(1, fit * 0.82);
          const h2 = vh / (2 * tz);
          tx = clamp(lerp(W / 2, m.jet.x, 0.5), v.x0 + vw / (2 * tz), v.x1 - vw / (2 * tz));
          ty = clamp(m.jet.y - 70 + h2, v.y0 + h2, v.y1 - h2);
        }
        speed = 3.2;
      }
      if (st === 'intro') {
        bars = 1;
        speed = 2.2;
        if (t < 1.0) {
          tx = JUMBO.x + JUMBO.w / 2;
          ty = JUMBO.y + JUMBO.h / 2 + 30;
          tz = 1.75;
        } else if (t >= WARM_AT - 0.2 && t < WARM_END - 0.1) {
          // rozcvička: celé hřiště, kamera pomalu přejíždí
          tx = W / 2 + Math.sin((t - WARM_AT) * 0.7) * 90;
          ty = GROUND_Y - 150;
          tz = 1.2;
          speed = 2;
        } else if (t >= REF_AT - 0.2 && t < REF_END - 0.1) {
          // rozhodčí uprostřed hřiště (kamera trochu vlevo, ať ho nezakryje tlačítko Přeskočit)
          tx = W / 2 - 120;
          ty = GROUND_Y - 95;
          tz = 1.8;
          speed = 3;
        } else if (t >= REF_END - 0.1 && t < INTRO_DUR - 0.5) {
          // záběr na hráče, který zrovna hecuje soupeře
          const k = (this.introTalk || []).find((q) => t < q.at + TALK_DUR);
          const p = k && m.players[k.idx];
          if (p) {
            tx = p.x + p.dir * 70;
            ty = p.y - 30;
            tz = 1.75;
            speed = 3;
          }
        }
      } else if (st === 'goal' && this.goalTeam >= 0) {
        // oslava: kamera sleduje střelce (skluz po kolenou, letadlo)
        const sc = m.players[this.scorerIdx];
        const gx = this.goalTeam === 0 ? W - 330 : 330;
        tx = sc && t > 0.5 ? lerp(gx, sc.x, 0.7) : gx;
        ty = 470;
        tz = 1.3;
        speed = 3;
      } else if (st === 'shootout' && this.pen) {
        const right = this.pen.turn === 0;
        tx = right ? W - 330 : 330;
        ty = 465;
        tz = 1.3;
        speed = 2.6;
      } else if (st === 'replay') {
        // míč i hráči v záběru; vysoký míč = širší záběr
        tx = m.ball.x;
        ty = clamp(m.ball.y + 60, 380, 480);
        tz = m.ball.y < 290 ? 1.35 : 1.7;
        bars = 1;
        speed = 5;
      } else if (st === 'over' && t > 1.3) {
        const ps = m.players.filter((p) => p.team === m.celebrate);
        tx = ps.length ? ps.reduce((a, p) => a + p.x, 0) / ps.length : W / 2;
        ty = 438;
        tz = 1.65;
        bars = 1;
        speed = 1.6;
      }
    }
    // trailer: kameru řídí scénář
    const o = this.camOverride;
    if (o) {
      tx = o.x;
      ty = o.y;
      tz = o.z;
      bars = o.bars || 0;
      speed = o.speed || 3;
      if (o.cut) {
        c.x = tx;
        c.y = ty;
        c.z = tz;
        o.cut = false;
      }
    }
    const k = 1 - Math.exp(-dt * speed);
    c.x += (tx - c.x) * k;
    c.y += (ty - c.y) * k;
    c.z += (tz - c.z) * k;
    c.bars += (bars - c.bars) * (1 - Math.exp(-dt * 5));
    const hw = (v.x1 - v.x0) / (2 * c.z), hh = (v.y1 - v.y0) / (2 * c.z);
    c.x = clamp(c.x, v.x0 + hw, v.x1 - hw);
    c.y = clamp(c.y, v.y0 + hh, v.y1 - hh);
    // nadšení publika
    let ex = 0.12;
    if (this.screen === 'match') {
      if (st === 'goal' || st === 'over') ex = 1;
      else if (st === 'intro') ex = 0.75;
      else if (st === 'replay') ex = 0.45;
      else if (m && Math.min(m.ball.x, W - m.ball.x) < 240) ex = 0.35;
      else ex = 0.08;
    }
    this.excite += (ex - this.excite) * (1 - Math.exp(-dt * 3));
  },

  // Stav zápasu pro kamarády (malý, vejde se do „presence“).
  snapshot() {
    const m = this.match, b = m.ball, r = Math.round;
    const msg = this.msg;
    return {
      n: ++this.snapN,
      ht: r(performance.now() - this.t0),
      s: STATE_CODE[this.state] || 'p',
      st: Math.round(this.stateT * 100) / 100,
      t: r(this.clock * 10),
      hf: this.half,
      gd: this.golden ? 1 : 0,
      ts: this.tstats ? this.tstats.map((a) => a.map((v) => r(v))) : 0,
      po: this.pen && this.state === 'shootout' ? (() => {
        const P = this.pen;
        return [P.turn, PEN_PHASE[P.phase], P.shooter, P.keeper, P.kicks[0].map(Number).join(''), P.kicks[1].map(Number).join(''),
          P.ft === null ? -1 : r(P.ft * 100), r(P.su * 100), r(P.sv * 100), r(P.kx * 100), r(P.ky * 100), r(P.kd * 100), P.res || ''];
      })() : 0,
      pn: m.pens ? [m.pens[0], m.pens[1]] : 0,
      sc: [m.score[0], m.score[1]],
      b: [r(b.x), r(b.y), r(b.rot * 100), r(b.superT * 100), b.superBy, r(b.basketT * 100), b.basketSide, b.carryBy >= 0 ? 1 : 0],
      p: m.players.map((p) => [r(p.x), r(p.y), p.kickT < 0 ? -1 : r(p.kickT * 1000), p.mood, p.onGround ? 1 : 0, r(p.vx / 10), r(p.vy / 10), r(p.superCharge * 100), r(p.stunT * 100), r(p.spin * 100), r(p.boostT * 100), r(p.pengT * 100), r(p.kneel * 100), p.face, r(p.plane * 100), r(p.shootT * 100), r(p.primeT * 100), r(p.flashT * 100), r(((p.growK || 1) - 1) * 100), r(p.selfieT * 100), r(p.growT * 100), r(p.suitT * 10), r(p.sushiT * 100), r(p.lift || 0)]).map(trimSnap),
      bk: [r(m.blocks[0] * 100), r(m.blocks[1] * 100), m.blockKind[0] === 'ice' ? 1 : 0, m.blockKind[1] === 'ice' ? 1 : 0],
      wd: m.windDir,
      jt: m.jet ? [r(m.jet.x), r(m.jet.y), m.jet.dir, r(m.jet.t * 100), m.jet.by, m.jet.hold ? 1 : 0] : 0,
      ar: m.arms ? [m.arms.by, r(m.arms.t * 100), r(m.arms.bx), r(m.arms.by0)] : 0,
      m: msg ? [msg.id, msg.text, msg.sub || '', msg.color, msg.size, Math.round(msg.dur * 10)] : 0,
      e: this.evq,
      rs: this.resultShown ? 1 : 0,
    };
  },

  /*
   * Předpověď vlastního hráče u kamaráda: postava se pohne hned podle vlastního
   * ovládání a jen se plynule dorovnává k poloze od hostitele (bez zpoždění sítě).
   */
  predictMe(dt, it, latest) {
    const me = this.myPlayer();
    const srv = me && me._srv;
    const free = me && srv && this.state === 'play' && !(me.stunT > 0) && !me.kneel && !me.plane && !me.shootT && !(me.sushiT > 0) && !(me.lift > 0);
    if (!free || !it || dt <= 0) {
      this.pred = null;
      this.localKick = -1;
      return;
    }
    // poloha od hostitele posunutá o stáří snímku a zpoždění ovládání
    const age = clamp((performance.now() - this.offset - latest.ht) / 1000, 0, 0.3);
    const ahead = clamp(age + 0.06, 0, 0.35);
    const svx = srv[5] * 10, svy = srv[6] * 10;
    const stand = me.standY;
    const ex = clamp(srv[0] + svx * ahead, me.R, W - me.R);
    const mods = this.match.mods;
    const ey = srv[4] ? stand : Math.min(stand, srv[1] + svy * ahead + 0.5 * PHYS.gravity * mods.grav * ahead * ahead);
    let q = this.pred;
    if (!q) q = this.pred = { x: ex, y: ey, vx: svx, vy: svy, onGround: !!srv[4] };
    // vlastní pohyb jako ve fyzice hostitele
    const boost = (me.boostT > 0 ? BOOST_MUL : 1) * (me.primeT > 0 ? PRIME_SPEED : 1);
    const move = typeof it.move === 'number' ? clamp(it.move, -1, 1) : (it.right ? 1 : 0) - (it.left ? 1 : 0);
    const onIce = q.onGround && this.match && this.match.ice;
    const rate = onIce ? (move === 0 ? 1700 * ICE.brake : PHYS.accelGround * ICE.accel * boost) : (q.onGround ? PHYS.accelGround : PHYS.accelAir) * boost;
    q.vx = approach(q.vx, move * PHYS.moveSpeed * boost * mods.speed, rate * dt);
    if (it.jump && q.onGround) {
      q.vy = -PHYS.jumpV * (me.primeT > 0 ? PRIME_JUMP : 1) * mods.jump;
      q.onGround = false;
    }
    q.vy += PHYS.gravity * mods.grav * dt;
    q.x = clamp(q.x + q.vx * dt, me.R, W - me.R);
    q.y += q.vy * dt;
    if (q.y >= stand) {
      q.y = stand;
      q.vy = 0;
      q.onGround = true;
    } else if (srv[4] && Math.abs(q.y - stand) < 2) {
      q.onGround = true;
    } else {
      q.onGround = false;
    }
    // dorovnání k hostiteli (velký rozdíl = skok na správné místo)
    const dx = ex - q.x, dy = ey - q.y;
    if (Math.abs(dx) > 150 || Math.abs(dy) > 160) {
      q.x = ex;
      q.y = ey;
      q.vx = svx;
      q.vy = svy;
    } else {
      const kx = 1 - Math.exp(-dt * 6), ky = 1 - Math.exp(-dt * (q.onGround && srv[4] ? 10 : 2.5));
      q.x += dx * kx;
      q.y += dy * ky;
    }
    me.x = q.x;
    me.y = q.y;
    me.vx = q.vx;
    me.vy = q.vy;
    me.onGround = q.onGround;
    // švih nohou hned po stisku (míč ale kope hostitel)
    if (it.kick && me.kickT < 0 && !(this.localKick >= 0)) this.localKick = 0;
    if (this.localKick >= 0) {
      this.localKick += dt;
      if (this.localKick >= PHYS.kickDur) this.localKick = -1;
      else if (me.kickT < 0) me.kickT = this.localKick;
    }
  },

  /* ---------------- host: zobrazení zápasu podle hostitele ---------------- */

  onHostPresence(hp) {
    if (!hp || this.mode !== 'guest') return;
    if ('cup' in hp) {
      this.cup = hp.cup ? sanitizeCup(hp.cup) : null;
      if (this.cup && this.cup.stage === 'done') this.cup.won = this.myCupTeam() >= 0 && cupWinner(this.cup, 'f') === this.myCupTeam();
    }
    if (hp.phase === 'cup') {
      if (this.cup) {
        if (this.screen === 'match') Touch.show(false);
        this.screen = 'cup';
        if (UI.el.cup.hidden || this._cupKey !== JSON.stringify(hp.cup)) {
          this._cupKey = JSON.stringify(hp.cup);
          UI.showCup();
        }
      }
      return;
    }
    if (hp.phase === 'closed') {
      this.hostGone();
      return;
    }
    if (hp.phase === 'lobby') {
      if (this.screen === 'match' || this.screen === 'cup') this.toLobby();
      else this.renderLobby();
      return;
    }
    if (hp.phase === 'match' && hp.setup && Array.isArray(hp.setup.players)) {
      if (this.screen !== 'match' || !this.setup || this.setup.id !== hp.setup.id) this.beginGuestMatch(hp.setup);
      const key = hp.setup.id + ':' + hp.setup.rev;
      if (key !== this.setupKey) {
        this.setupKey = key;
        this.match.players.forEach((p, i) => {
          const sp = hp.setup.players[i];
          if (sp) {
            p.label = this.labelFor(sp);
            p.isHuman = sp.ctrl !== 'cpu';
          }
        });
      }
      if (hp.g && hp.g.n !== this.lastSnapN) this.onSnapshot(hp.g);
    }
  },

  beginGuestMatch(ns) {
    const setup = sanitizeSetup(ns);
    if (!setup) return;
    Sound.init();
    Sound.quiet = false;
    this.setup = setup;
    this.setupKey = '';
    // zrcadlo zápasu: stejní hráči, ale fyziku počítá hostitel
    this.match = new Match(setup, () => {}, null);
    Renderer.setFans(setup.teams);
    this.match.players.forEach((p, i) => {
      p.brain = null;
      p.label = this.labelFor(setup.players[i]);
    });
    this.match.ball.held = false;
    this.screen = 'match';
    this.state = 'countdown';
    this.buf = [];
    this.jit = [];
    this.interpMs = 0;
    this.offset = null;
    this.lastEvN = Infinity; // staré efekty nepřehrávat
    this.lastSnapN = -1;
    this.lastMsgId = 0;
    this.msg = null;
    this.resultShown = false;
    this.scorePop = [0, 0];
    this.clock = 0;
    this.half = 1;
    this.halfShown = false;
    this.tstats = [0, 1].map(() => [0, 0, 0, 0, 0, 0, 0]);
    this.introTalk = this.makeTalk(setup);
    this.stats = setup.players.map(() => ({ goals: 0, knocks: 0, supers: 0 }));
    Input.clear();
    Effects.clear();
    UI.show(null);
    Touch.build();
    // kamarád, který v tomhle zápase nehraje (turnaj), se jen dívá
    Touch.show(setup.players.some((sp) => sp.ctrl === Online.uid));
    Sound.crowdLevel(0.05);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  },

  onSnapshot(g) {
    if (!g || typeof g.ht !== 'number' || !Array.isArray(g.p)) return;
    this.lastSnapN = g.n;
    const now = performance.now();
    const d = now - g.ht;
    if (this.offset === null || d < this.offset) this.offset = d;
    else this.offset += (d - this.offset) * 0.002;
    // přizpůsobivá vyrovnávací paměť: podle toho, jak nepravidelně snímky chodí
    const jit = this.jit || (this.jit = []);
    jit.push(d - this.offset);
    if (jit.length > 90) jit.shift();
    if (jit.length >= 10 && (this.jitN = (this.jitN || 0) + 1) % 10 === 0) {
      const sorted = jit.slice().sort((x, y) => x - y);
      const p90 = sorted[Math.floor(sorted.length * 0.9)];
      const want = clamp(p90 + 40, 55, 240);
      this.interpMs = this.interpMs ? this.interpMs + (want - this.interpMs) * 0.35 : want;
    }
    const buf = this.buf;
    if (buf.length && g.ht <= buf[buf.length - 1].ht) {
      if (g.ht < buf[buf.length - 1].ht - 1000) buf.length = 0; // hostitel začal nový zápas
      else return;
    }
    buf.push({ ht: g.ht, g });
    while (buf.length > 2 && buf[1].ht < g.ht - 1500) buf.shift();

    // efekty a zvuky
    const ev = Array.isArray(g.e) ? g.e : [];
    if (this.lastEvN === Infinity) this.lastEvN = ev.length ? ev[ev.length - 1][0] : 0;
    for (const e of ev) {
      if (Array.isArray(e) && e[0] > this.lastEvN) {
        this.lastEvN = e[0];
        this.playFx(e[1], e.slice(2));
      }
    }
    // hlášky
    if (Array.isArray(g.m) && g.m[0] !== this.lastMsgId) {
      this.lastMsgId = g.m[0];
      this.msg = { id: g.m[0], text: String(g.m[1]).slice(0, 24), sub: String(g.m[2] || '').slice(0, 48), color: String(g.m[3]), size: Number(g.m[4]) || 120, dur: (Number(g.m[5]) || 10) / 10, t: 0 };
    }
    // skóre
    const sc = Array.isArray(g.sc) ? g.sc : [0, 0];
    for (let i = 0; i < 2; i++) {
      if (sc[i] > this.match.score[i]) this.scorePop[i] = now;
      this.match.score[i] = Number(sc[i]) || 0;
    }
    const st = CODE_STATE[g.s] || 'play';
    if (st !== this.state) {
      if (st === 'over' || st === 'halftime') Touch.show(false);
      if (this.state === 'halftime') {
        UI.show(null);
        Touch.build();
        Touch.show(true);
      }
      this.halfShown = false;
      if (st === 'replay' || st === 'intro') Effects.clear();
      if (st === 'intro') {
        this.cam.x = JUMBO.x + JUMBO.w / 2;
        this.cam.y = JUMBO.y + JUMBO.h / 2 + 30;
        this.cam.z = 1.75;
        this.cam.bars = 1;
      }
      this.state = st;
      this.stateT = 0;
    }
    if (typeof g.st === 'number') this.stateT = g.st;
    if (this.state === 'halftime' && !this.halfShown && this.stateT > HALF_SHOW) {
      this.halfShown = true;
      UI.showHalf();
    }
    this.clock = (Number(g.t) || 0) / 10;
    this.half = [1, 2, 3].includes(g.hf) ? g.hf : 1;
    this.golden = !!g.gd;
    // penalty
    if (Array.isArray(g.pn)) this.match.pens = [Number(g.pn[0]) || 0, Number(g.pn[1]) || 0];
    if (Array.isArray(g.po)) {
      const old = this.pen;
      const ks = (v) => String(v || '').slice(0, 30).split('').map((c) => c === '1');
      const n = (v) => Number(v) || 0;
      const P = {
        turn: g.po[0] === 1 ? 1 : 0, phase: PEN_PHASES[g.po[1]] || 'aim',
        shooter: n(g.po[2]), keeper: n(g.po[3]), kicks: [ks(g.po[4]), ks(g.po[5])],
        ft: n(g.po[6]) < 0 ? null : n(g.po[6]) / 100, su: n(g.po[7]) / 100, sv: n(g.po[8]) / 100,
        kx: n(g.po[9]) / 100, ky: n(g.po[10]) / 100 || 0.36, kd: n(g.po[11]) / 100, res: ['goal', 'save', 'post', 'miss'].includes(g.po[12]) ? g.po[12] : '',
      };
      // míření si kamarád počítá sám (míří podle toho, co vidí)
      const key = P.turn + ':' + P.kicks[0].length + ':' + P.kicks[1].length;
      P.key = key;
      const same = old && old.key === key && P.phase === 'aim';
      P.ax = same ? old.ax : 0;
      P.ay = same ? old.ay : 0.45;
      P.aimT = same ? old.aimT : 0;
      this.pen = P;
    } else if (this.state !== 'over') {
      this.pen = null;
    }
    if (Array.isArray(g.ts) && g.ts.length === 2) this.tstats = g.ts.map((a) => (Array.isArray(a) ? a.slice(0, 7).map((v) => Number(v) || 0) : [0, 0, 0, 0, 0, 0, 0]));
    if (g.rs && !this.resultShown) {
      this.resultShown = true;
      UI.showResult();
    }
  },

  guestUpdate(dt) {
    Effects.update(dt);
    this.stateT += dt;
    const m = this.match;
    if (!m) return;
    if (m.celebrate < 0 && this.state === 'over') m.celebrate = Math.max(0, m.winner());
    this.updateCam(dt);
    this.updateSuperUI();
    this.warmPose(this.stateT);
    UI.setSkip(false);
    if ((this.state === 'goal' && Math.random() < dt * 22) || (this.state === 'over' && Math.random() < dt * 10)) Effects.flash();
    // vlastní ovládání hostiteli
    const it = this.state !== 'over' ? Input.intent(0) : null;
    let aim;
    const P = this.pen;
    if (it && this.state === 'shootout' && P) {
      // kamarád střílí: míří sám u sebe a pošle, kam vystřelil
      const me = this.myPlayer();
      if (P.phase === 'aim' && me && this.match.players.indexOf(me) === P.shooter) {
        P.aimT += dt;
        const mx = typeof it.move === 'number' ? it.move : 0;
        const my = typeof it.my === 'number' ? it.my : 0;
        P.ax = clamp(P.ax + mx * 1.45 * dt, -1.3, 1.3);
        P.ay = clamp(P.ay - my * 1.15 * dt, 0, 1.3);
        const w = penWobble(P.aimT);
        aim = { u: P.ax + w.u, v: P.ay + w.v };
      }
      if (P.ft !== null) P.ft += dt; // plynulý let míče mezi snímky
      if (P.kd > 0 && P.kd < 1) P.kd = Math.min(1, P.kd + dt / 0.3);
    }
    if (it) Online.sendInput(it, aim);
    const buf = this.buf;
    if (!buf.length || this.offset === null) return;
    const target = performance.now() - this.offset - (this.interpMs || INTERP_MS);
    let a = buf[0], b = null;
    for (let i = buf.length - 1; i >= 0; i--) {
      if (buf[i].ht <= target) {
        a = buf[i];
        b = buf[i + 1] || null;
        break;
      }
    }
    let k = b ? clamp((target - a.ht) / Math.max(1, b.ht - a.ht), 0, 1) : 0;
    // snímek se opozdil: pohyb na chvíli dopočítat podle posledních dvou (místo zaseknutí)
    if (!b && buf.length >= 2 && a === buf[buf.length - 1]) {
      const a0 = buf[buf.length - 2], span = Math.max(1, a.ht - a0.ht);
      const over = Math.min(target - a.ht, 140);
      if (over > 0 && span < 200) {
        b = a;
        a = a0;
        k = 1 + over / span;
      }
    }
    const B = b || a;
    m.players.forEach((p, i) => {
      const pa = a.g.p[i], pb = B.g.p[i] || pa;
      if (!pa) return;
      p.x = clamp(lerp(pa[0], pb[0], k), p.R, W - p.R);
      p.y = Math.min(lerp(pa[1], pb[1], k), p.standY);
      p.kickT = pb[2] < 0 ? -1 : (Number(pb[2]) || 0) / 1000;
      p.mood = Number(pb[3]) || 0;
      p.onGround = !!pb[4];
      p.vx = (Number(pb[5]) || 0) * 10;
      p.vy = (Number(pb[6]) || 0) * 10;
      p.superCharge = (Number(pb[7]) || 0) / 100;
      p.stunT = (Number(pb[8]) || 0) / 100;
      p.boostT = (Number(pb[10]) || 0) / 100;
      p.pengT = (Number(pb[11]) || 0) / 100;
      p.kneel = (Number(pb[12]) || 0) / 100;
      p.face = pb[13] === 1 || pb[13] === -1 ? pb[13] : 0;
      p.plane = (Number(pb[14]) || 0) / 100;
      p.shootT = (Number(pb[15]) || 0) / 100;
      p.primeT = (Number(pb[16]) || 0) / 100;
      p.flashT = (Number(pb[17]) || 0) / 100;
      p.selfieT = (Number(pb[19]) || 0) / 100;
      p.growT = (Number(pb[20]) || 0) / 100;
      p.suitT = (Number(pb[21]) || 0) / 10;
      p.sushiT = (Number(pb[22]) || 0) / 100;
      p.lift = Number(pb[23]) || 0;
      sizeGrow(p, clamp(1 + (Number(pb[18]) || 0) / 100, 1, GROW_K));
      const sa = Number(pa[9]) || 0, sb = Number(pb[9]) || 0;
      p.spin = sb === 0 || Math.sign(sa) !== Math.sign(sb) ? sb / 100 : lerp(sa, sb, k) / 100;
      p._srv = buf[buf.length - 1].g.p[i];
      if (p.onGround) p.runPhase += p.vx * p.dir * dt * 0.05;
      p.blinkT -= dt;
      if (p.blinkT <= 0) {
        p.blink = 0.13;
        p.blinkT = rand(2, 5);
      }
      if (p.blink > 0) p.blink -= dt;
    });
    this.predictMe(dt, it, buf[buf.length - 1]);
    // zablokované brány (hermelín, led)
    if (B.g.wd === 1 || B.g.wd === -1) m.windDir = B.g.wd;
    const ar = B.g.ar;
    m.arms = Array.isArray(ar) ? { by: Number(ar[0]) || 0, t: (Number(ar[1]) || 0) / 100, bx: Number(ar[2]) || 0, by0: Number(ar[3]) || 0 } : null;
    const jt = B.g.jt;
    m.jet = Array.isArray(jt) ? { x: Number(jt[0]) || 0, y: Number(jt[1]) || 0, dir: jt[2] === -1 ? -1 : 1, t: (Number(jt[3]) || 0) / 100, by: Number(jt[4]) || 0, hold: !!jt[5] } : null;
    const bk = B.g.bk;
    if (Array.isArray(bk)) {
      for (let t = 0; t < 2; t++) {
        m.blocks[t] = (Number(bk[t]) || 0) / 100;
        m.blockKind[t] = bk[t + 2] ? 'ice' : 'cheese';
      }
    }
    const ba = a.g.b, bb = B.g.b;
    if (Array.isArray(ba) && Array.isArray(bb)) {
      m.ball.x = clamp(lerp(ba[0], bb[0], k), m.ball.r, W - m.ball.r);
      m.ball.y = Math.min(lerp(ba[1], bb[1], k), GROUND_Y - m.ball.r);
      m.ball.rot = lerp(ba[2], bb[2], k) / 100;
      m.ball.superT = (Number(bb[3]) || 0) / 100;
      m.ball.superBy = Number.isInteger(bb[4]) ? bb[4] : -1;
      m.ball.basketT = (Number(bb[5]) || 0) / 100;
      m.ball.basketSide = bb[6] === 0 || bb[6] === 1 ? bb[6] : -1;
      m.ball.carryBy = bb[7] ? 0 : -1;
      const span = Math.max(1, B.ht - a.ht) / 1000;
      m.ball.vx = b ? (bb[0] - ba[0]) / span : 0;
      m.ball.vy = b ? (bb[1] - ba[1]) / span : 0;
    }
  },
};

// Data od hostitele jsou nedůvěryhodná: ověřit tvar a hodnoty.
function sanitizeLobby(l) {
  if (!l || typeof l !== 'object' || !Array.isArray(l.slots)) return null;
  const format = l.format === '1v1' ? '1v1' : '2v2';
  return {
    mode: l.mode === 'cup' ? 'cup' : l.mode === 'viet' ? 'viet' : 'match',
    viet: Math.max(0, Math.min(VIET.length - 1, Math.floor(Number(l.viet) || 0))),
    format,
    minutes: [1, 2, 3].includes(l.minutes) ? l.minutes : 2,
    level: AI_LEVELS[l.level] ? l.level : 'medium',
    arena: validArena(l.arena),
    duos: validDuos(l.duos),
    slots: l.slots.slice(0, 4).map((s) => ({
      team: s && s.team === 1 ? 1 : 0,
      char: charById(s && s.char).id,
      ctrl: s && typeof s.ctrl === 'string' ? s.ctrl.slice(0, 16) : 'cpu',
    })),
    members: Array.isArray(l.members) ? l.members.slice(0, 8).map((m) => ({ uid: String(m && m.uid || '').slice(0, 16), name: cleanName(m && m.name), ready: !!(m && m.ready) })) : [],
  };
}

// Snímek hráče pro kamarády: nuly na konci (schopnosti, které zrovna neběží) se neposílají.
function trimSnap(a) {
  let n = a.length;
  while (n > 8 && !a[n - 1]) n--;
  return n === a.length ? a : a.slice(0, n);
}

function sanitizeSetup(s) {
  if (!s || !Array.isArray(s.players) || !Array.isArray(s.teams)) return null;
  const color = (c, d) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : d);
  return {
    id: String(s.id || '').slice(0, 12),
    rev: Number(s.rev) || 0,
    format: s.format === '1v1' ? '1v1' : '2v2',
    level: 'medium',
    arena: validArena(s.arena),
    minutes: [1, 2, 3].includes(s.minutes) ? s.minutes : 2,
    teams: [0, 1].map((i) => {
      const t = s.teams[i] || {};
      return {
        name: String(t.name || '').slice(0, 24),
        short: String(t.short || '').slice(0, 24),
        girls: !!t.girls,
        color: color(t.color, SIDE_COLORS[i].color),
        dark: color(t.dark, SIDE_COLORS[i].dark),
        light: color(t.light, SIDE_COLORS[i].light),
      };
    }),
    players: s.players.slice(0, 4).map((p) => ({
      char: charById(p && p.char).id,
      team: p && p.team === 1 ? 1 : 0,
      ctrl: p && typeof p.ctrl === 'string' ? p.ctrl.slice(0, 16) : 'cpu',
      name: cleanName(p && p.name),
      skin: p && SKINS[p.skin] && SKINS[p.skin].char === charById(p.char).id ? p.skin : '',
    })),
    cup: !!s.cup,
    stage: ['SEMIFINÁLE', 'FINÁLE'].includes(s.stage) ? s.stage : '',
    label: typeof s.label === 'string' ? s.label.slice(0, 40) : '',
    goal: typeof s.goal === 'string' ? s.goal.slice(0, 40) : '',
    viet: Math.max(0, Math.min(VIET.length, Math.floor(Number(s.viet) || 0))),
  };
}

/* ---------------- panely ---------------- */

const UI = {
  el: {},

  init() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      home: $('home'), online: $('online'), lobby: $('lobby'), pause: $('pause'), result: $('result'),
      pauseBtn: $('btn-pause'), muteBtn: $('btn-mute'), help: $('home-help'), rotate: $('rotate'),
      nick: $('nick'), code: $('join-code'), status: $('online-status'), toast: $('toast'),
      resKicker: $('res-kicker'), resTitle: $('res-title'), resA: $('res-a'), resB: $('res-b'), resSub: $('res-sub'),
      resMain: $('btn-res-main'), resSecond: $('btn-res-second'), resThird: $('btn-res-third'), resWait: $('res-wait'),
      pauseSecond: $('btn-restart'), pauseThird: $('btn-quit'),
      profile: $('profile'), chip: $('profile-chip'), cup: $('cup'), half: $('half'),
      story: $('story'), unlock: $('unlock'), reward: $('reward'), tasks: $('tasks'), board: $('board'), player: $('player'), viet: $('viet'), account: $('account'),
    };
    const click = (id, fn) => $(id).addEventListener('click', () => {
      Sound.init();
      fn();
    });
    click('btn-local', () => {
      this.goFullscreen();
      Game.openLocalLobby('match');
    });
    click('btn-cup', () => {
      this.goFullscreen();
      Game.openLocalLobby('cup');
    });
    click('btn-online', () => {
      this.goFullscreen();
      Game.toOnline();
    });
    click('btn-story', () => {
      this.goFullscreen();
      Game.openStory();
    });
    click('btn-unlock-back', () => this.show('home'));
    click('btn-code', () => this.showUnlock(true));
    click('btn-tasks', () => this.showTasks());
    Board.initUI();
    Account.initUI();
    click('btn-tasks-close', () => this.show('home'));
    $('unlock-form').addEventListener('submit', (e) => {
      e.preventDefault();
      Sound.init();
      const input = $('unlock-code');
      const got = Game.tryUnlock(input.value);
      if (got) {
        input.blur();
        this.updateLocks();
        Sound.fanfare();
        if (got === 'viet') {
          this.toast('Výzva Vietnam odemčena!');
          this.showViet();
        } else if (got === 'all') {
          this.toast('Odemčeno úplně všechno! Příběh, skiny, Páv & Suli i Milan.');
          this.show('home');
        } else {
          this.toast('Příběh odemčen!');
          Game.openStory();
        }
      } else {
        $('unlock-err').hidden = false;
        const f = $('unlock-form');
        f.classList.remove('shake');
        void f.offsetWidth;
        f.classList.add('shake');
        Sound.beep(false);
      }
    });
    $('unlock-code').addEventListener('input', () => { $('unlock-err').hidden = true; });
    click('btn-story-back', () => Game.toHome());
    click('btn-sc-prev', () => this.storyCycle(-1));
    click('btn-sc-next', () => this.storyCycle(1));
    click('btn-gold', () => {
      Game.cycleSkin(Game.storyChar());
      this.showStory(true);
    });
    click('btn-story-reward', () => {
      const lv = STORY[this.storySel];
      if (lv) this.showReward(lv.reward || (lv.bonus && lv.bonus.reward));
    });
    click('btn-reward-close', () => this.show('story'));
    click('btn-story-play', () => {
      if (this.storySel >= 0) Game.playStory(this.storySel);
    });
    click('btn-viet-close', () => {
      if (Game.screen === 'story') this.showStory(true);
      else this.show('home');
    });
    document.querySelectorAll('#camp-tabs button').forEach((b) => b.addEventListener('click', () => {
      Sound.init();
      Sound.click();
      const id = b.dataset.camp;
      if (id === 'viet') {
        this.showViet();
        return;
      }
      Story.use(id);
      this.storySel = -1;
      this.showStory();
    }));
    click('btn-viet-code', () => this.showUnlock(true));
    click('btn-viet-join', () => Game.toOnline());
    click('btn-viet-host', () => {
      this.goFullscreen();
      Game.toOnline();
      const nick = cleanName(store.get(STORE_NAME, '')) || 'Hráč';
      Game.hostCreate(nick, 'viet');
    });
    click('profile-chip', () => this.openProfile());
    click('btn-profile-close', () => this.show('home'));
    click('btn-swap2', () => this.setSwap(!Touch.swap));
    const fs = $('btn-fs');
    const standalone = window.matchMedia && window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
    fs.hidden = !(document.fullscreenEnabled && !standalone);
    fs.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else this.goFullscreen(true);
    });
    click('btn-online-back', () => Game.toHome());
    click('btn-create', () => {
      store.set(STORE_NAME, this.el.nick.value);
      Game.hostCreate(this.el.nick.value);
    });
    click('btn-join', () => {
      store.set(STORE_NAME, this.el.nick.value);
      Game.guestJoin(this.el.code.value, this.el.nick.value);
    });
    this.el.code.addEventListener('input', () => {
      const v = cleanCode(this.el.code.value);
      if (v !== this.el.code.value) this.el.code.value = v;
    });
    this.el.code.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('btn-join').click();
    });
    click('btn-lobby-back', () => Game.toHome());
    click('btn-start', () => Game.start());
    click('btn-ready', () => {
      Online.setReady(!Online.ready);
      Game.renderLobby();
    });
    click('btn-invite', () => this.invite());
    click('btn-copy-public', () => this.copy(PUBLIC_URL, 'Adresa zkopírována'));
    click('btn-resume', () => Game.resume());
    click('btn-restart', () => Game.start());
    click('btn-quit', () => Game.backToLobby());
    click('btn-res-main', () => {
      const sr = Game.story && Game.setup && Game.setup.story ? Game.storyRecord() : null;
      if (sr) Game.playStory(sr.win && sr.idx + 1 < STORY.length ? sr.idx + 1 : sr.idx);
      else if (Game.cup && Game.setup && Game.setup.cup) Game.showCupAll();
      else if (Game.mode !== 'guest') Game.start();
    });
    click('btn-res-second', () => {
      if (Game.story) Game.openStory();
      else if (Game.mode === 'guest') Game.toHome();
      else if (Game.cup) Game.quitCup();
      else Game.backToLobby();
    });
    click('btn-cup-play', () => {
      if (!Game.cup) return;
      if (Game.cup.stage === 'done') Game.startCup();
      else Game.playCupMatch();
    });
    click('btn-cup-quit', () => Game.quitCup());
    click('btn-half-go', () => Game.secondHalf());
    click('btn-res-third', () => Game.toHome());
    this.el.pauseBtn.addEventListener('click', () => (Game.state === 'paused' ? Game.resume() : Game.pause()));
    this.el.skip = $('btn-skip');
    this.el.skip.addEventListener('click', () => Game.skip());
    this.el.muteBtn.addEventListener('click', () => {
      Sound.init();
      this.setMuted(!Sound.muted);
    });
    this.el.nick.value = cleanName(store.get(STORE_NAME, ''));
    this.setSwap(store.get(STORE_SWAP, false) === true);
    $('public-url').textContent = PUBLIC_URL.replace(/^https:\/\//, '').replace(/\/$/, '');
    this.setMuted(store.get(STORE_MUTE, false) === true);
    this.renderHelp();
    this.renderProfile();
    document.getElementById('version').textContent = `FIFA67 · verze ${GAME_VERSION}`;
    this.orient();
  },

  // šířka ikon v rohu (podle ní se odsadí horní lišta lobby)
  measureHud() {
    const hud = document.getElementById('hud');
    if (hud) document.documentElement.style.setProperty('--hud-w', `${hud.offsetWidth}px`);
  },

  setEmblem(el, rank) {
    if (el) el.style.setProperty('--rank', rank.color);
  },

  // Odznak ligy a poháry v rohu menu.
  renderProfile() {
    const prof = Profile.get(), r = rankOf(prof.trophies);
    const $ = (id) => document.getElementById(id);
    $('pc-tro').textContent = prof.trophies;
    $('pc-rank').textContent = r.rank.name;
    $('pc-bar').style.width = `${Math.round(r.prog * 100)}%`;
    this.setEmblem($('pc-emblem'), r.rank);
  },

  openProfile() {
    const prof = Profile.get(), r = rankOf(prof.trophies);
    const $ = (id) => document.getElementById(id);
    $('pf-tro').textContent = prof.trophies;
    $('pf-rank').textContent = r.rank.name;
    $('pf-rank').style.color = r.rank.color;
    $('pf-bar').style.width = `${Math.round(r.prog * 100)}%`;
    $('pf-next').textContent = r.next ? `Do ligy ${r.next.name} chybí ${r.next.min - prof.trophies} pohárů` : 'Nejvyšší liga! Jsi legenda.';
    this.setEmblem($('pf-emblem'), r.rank);
    const stats = [
      ['Zápasy', prof.played], ['Výhry', prof.wins], ['Góly', prof.goals],
      ['Superstřely', prof.supers], ['Vyhrané turnaje', prof.cups], ['Nejdelší série', prof.bestStreak],
    ];
    const box = $('pf-stats');
    box.textContent = '';
    for (const [k, v] of stats) {
      const d = document.createElement('div');
      d.className = 'pf-stat';
      const b = document.createElement('b');
      b.textContent = v;
      const sp = document.createElement('span');
      sp.textContent = k;
      d.append(b, sp);
      box.appendChild(d);
    }
    const lad = $('pf-ladder');
    lad.textContent = '';
    RANKS.forEach((rk, i) => {
      const d = document.createElement('div');
      d.className = 'pf-step' + (i === r.i ? ' now' : i > r.i ? ' locked' : '');
      const em = document.getElementById('pf-emblem').cloneNode(true);
      em.removeAttribute('id');
      em.className = 'rank-emblem';
      this.setEmblem(em, rk);
      const n = document.createElement('span');
      n.textContent = rk.name;
      const t = document.createElement('small');
      t.textContent = rk.min;
      d.append(em, n, t);
      lad.appendChild(d);
    });
    this.show('profile');
  },

  // Tabulka statistik obou týmů.
  renderStats(el) {
    const m = Game.match, ts = Game.tstats;
    el.textContent = '';
    if (!m || !ts) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const head = document.createElement('div');
    head.className = 'st-row st-head';
    // dlouhá jména dvojic zkrátit na iniciály (M & D)
    const ab = (t) => (t.short.length > 10 ? t.short.split(/ a | & /).map((w) => w.trim()[0] || '').join(' & ') : t.short);
    for (const [i, txt] of [[0, ab(m.teams[0])], [1, 'Statistiky'], [2, ab(m.teams[1])]]) {
      const c = document.createElement('span');
      c.textContent = txt;
      if (i !== 1) c.style.color = m.teams[i === 0 ? 0 : 1].light;
      head.appendChild(c);
    }
    el.appendChild(head);
    const pos = ts[0][ST_POS] + ts[1][ST_POS];
    const p0 = pos > 0 ? Math.round((ts[0][ST_POS] / pos) * 100) : 50;
    const rows = [
      ['Góly', m.score[0], m.score[1]],
      ['Držení míče', `${p0} %`, `${100 - p0} %`, p0, 100 - p0],
      ['Střely', ts[0][ST_SHOT], ts[1][ST_SHOT]],
      ['Na bránu', ts[0][ST_ON], ts[1][ST_ON]],
      ['Hlavičky', ts[0][ST_HEAD], ts[1][ST_HEAD]],
      ['Superschopnosti', ts[0][ST_POW], ts[1][ST_POW]],
      ['Odstřelení', ts[0][ST_KNOCK], ts[1][ST_KNOCK]],
    ];
    for (const [label, a, b, na, nb] of rows) {
      const r = document.createElement('div');
      r.className = 'st-row';
      const va = na !== undefined ? na : Number(a), vb = nb !== undefined ? nb : Number(b);
      const ca = document.createElement('b'), cb = document.createElement('b'), cl = document.createElement('span');
      ca.textContent = a;
      cb.textContent = b;
      cl.textContent = label;
      if (va > vb) ca.className = 'lead';
      if (vb > va) cb.className = 'lead';
      // proužek poměru
      const bar = document.createElement('i');
      const tot = va + vb;
      bar.style.setProperty('--a', `${tot > 0 ? (va / tot) * 100 : 50}%`);
      bar.style.setProperty('--c0', m.teams[0].color);
      bar.style.setProperty('--c1', m.teams[1].color);
      r.append(ca, cl, cb, bar);
      el.appendChild(r);
    }
  },

  // Poločasová přestávka.
  showHalf() {
    const m = Game.match;
    if (!m) return;
    const $ = (id) => document.getElementById(id);
    $('half-a').textContent = m.teams[0].short;
    $('half-b').textContent = m.teams[1].short;
    $('half-a').style.color = m.teams[0].light;
    $('half-b').style.color = m.teams[1].light;
    $('half-sc').textContent = `${m.score[0]} : ${m.score[1]}`;
    this.renderStats($('half-stats'));
    const guest = Game.mode === 'guest';
    $('btn-half-go').hidden = guest;
    $('half-wait').hidden = !guest;
    this.show('half');
    requestAnimationFrame(() => Renderer.portrait($('half-ref'), REFEREE, REF_T, 1));
    if (!Touch.enabled && !guest) $('btn-half-go').focus({ preventScroll: true });
  },

  // Pavouk turnaje.
  showCup() {
    const cup = Game.cup;
    if (!cup) return;
    const $ = (id) => document.getElementById(id);
    const mine = Game.myCupTeam();
    const box = (id, key, a, b) => {
      const el = $(id);
      el.textContent = '';
      const r = cup.res[key], w = cupWinner(cup, key);
      [a, b].forEach((ti, k) => {
        const row = document.createElement('div');
        row.className = 'br-team' + (ti >= 0 && ti === mine ? ' me' : '') + (r ? (ti === w ? ' win' : ' lose') : '');
        const pics = document.createElement('span');
        pics.className = 'br-pics';
        let name = '?';
        if (ti >= 0) {
          const info = cupTeam(cup, ti);
          name = info.name;
          row.style.setProperty('--team', info.T.color);
          for (const c of info.chars) {
            const cv = document.createElement('canvas');
            cv.className = 'br-pic';
            pics.appendChild(cv);
            requestAnimationFrame(() => Renderer.portrait(cv, c, info.T, k === 0 ? 1 : -1));
          }
        }
        const nm = document.createElement('span');
        nm.className = 'br-name';
        const friend = ti >= 0 && ti !== mine && cupHuman(cup, ti);
        nm.textContent = name + (ti >= 0 && ti === mine ? ' (TY)' : friend ? ' (KAMARÁD)' : '');
        const sc = document.createElement('b');
        sc.className = 'br-score';
        sc.textContent = r ? (r[k] % 1 ? `${Math.floor(r[k])}p` : r[k]) : '–';
        row.append(pics, nm, sc);
        el.appendChild(row);
      });
    };
    box('br-s1', 's1', 0, 2);
    box('br-s2', 's2', 1, 3);
    box('br-f', 'f', cup.res.s1 ? cupWinner(cup, 's1') : -1, cup.res.s2 ? cupWinner(cup, 's2') : -1);
    const champ = cup.stage === 'done' && cup.won;
    $('br-cup').classList.toggle('won', champ || cup.stage === 'done');
    let sub;
    if (cup.stage === 'done') {
      const wi = cupWinner(cup, 'f');
      sub = champ ? `Pohár je tvůj! +${(TROPHY_RULES[cup.level] || TROPHY_RULES.medium).cup} pohárů navíc.` : `Turnaj vyhráli ${wi >= 0 ? cupTeam(cup, wi).name : '?'}.`;
    } else {
      const [a, b] = cupPair(cup, cup.stage);
      sub = `${cup.stage === 'f' ? 'Finále' : 'Semifinále'}: ${cupTeam(cup, a).name} – ${cupTeam(cup, b).name}`;
    }
    $('cup-title').textContent = champ ? 'Turnaj vyhrán!' : 'Turnaj';
    $('cup-sub').textContent = sub;
    const guest = Game.mode === 'guest';
    $('btn-cup-play').hidden = guest;
    $('btn-cup-quit').hidden = guest;
    $('cup-wait').hidden = !guest;
    $('btn-cup-play').textContent = cup.stage === 'f' ? 'Hrát finále' : cup.stage === 'done' ? 'Nový turnaj' : 'Hrát semifinále';
    $('btn-cup-quit').textContent = cup.stage === 'done' ? 'Hotovo' : 'Ukončit turnaj';
    this.show('cup');
    if (champ && !cup.celebrated) {
      cup.celebrated = true;
      Sound.fanfare();
    }
  },

  // Hráč zápasu a poháry na obrazovce výsledku.
  renderRewards() {
    const $ = (id) => document.getElementById(id);
    this.renderStats($('res-stats'));
    const mvp = Game.computeMvp(), m = Game.match;
    const mvpEl = $('res-mvp');
    mvpEl.hidden = !mvp;
    if (mvp) {
      const p = mvp.p, T = m.teams[p.team];
      const who = p.label && p.label !== 'CPU' && p.label !== p.look.name ? ` (${p.label})` : '';
      $('res-mvp-name').textContent = p.look.name + who;
      $('res-mvp-name').style.color = T.light;
      const pl = (n, one, few, many) => `${n} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`;
      const bits = [];
      if (mvp.goals) bits.push(pl(mvp.goals, 'gól', 'góly', 'gólů'));
      if (mvp.knocks) bits.push(`${mvp.knocks} odstřelení`);
      if (mvp.supers) bits.push(pl(mvp.supers, 'superstřela', 'superstřely', 'superstřel'));
      $('res-mvp-stats').textContent = bits.length ? bits.join(' · ') : p.look.girl ? 'Bojovala celý zápas' : 'Bojoval celý zápas';
      requestAnimationFrame(() => Renderer.portrait($('res-mvp-pic'), p.look.id, T, 1));
    }
    const rw = Game.award();
    if (rw && rw.tasks && rw.tasks.length && !rw.tasksShown) {
      rw.tasksShown = true;
      setTimeout(() => {
        Sound.fanfare();
        this.toast(`Úkol splněn! Odměna: ${rw.tasks.map((t) => t.name).join(' + ')}`);
      }, 1600);
    }
    const card = $('res-reward');
    card.hidden = !rw;
    card.classList.remove('rankup');
    if (!rw) return;
    const r0 = rankOf(rw.before), r1 = rankOf(rw.after);
    $('res-delta').textContent = (rw.delta >= 0 ? '+' : '−') + Math.abs(rw.delta);
    $('res-delta').className = rw.delta >= 0 ? 'up' : 'down';
    $('res-note').textContent = rw.parts.join(' · ') + (rw.streak >= 2 ? ` · ${rw.streak} výhry v řadě!` : '');
    // načítání poháru po kouskách
    const t0 = performance.now(), dur = 1300;
    const step = (now) => {
      const k = clamp((now - t0) / dur, 0, 1), e = easeOutQuad(k);
      const v = Math.round(lerp(rw.before, rw.after, e));
      const r = rankOf(v);
      $('res-total').textContent = v;
      $('res-rank').textContent = r.rank.name;
      $('res-bar').style.width = `${Math.round(r.prog * 100)}%`;
      this.setEmblem($('res-emblem'), r.rank);
      if (k < 1) requestAnimationFrame(step);
      else if (r1.i > r0.i) {
        card.classList.add('rankup');
        Sound.fanfare();
        this.toast(`Nová liga: ${r1.rank.name}!`);
      }
    };
    requestAnimationFrame(step);
    this.renderProfile();
  },

  setMuted(v) {
    Sound.setMuted(v);
    store.set(STORE_MUTE, v);
    this.el.muteBtn.classList.toggle('off', v);
    this.el.muteBtn.setAttribute('aria-label', v ? 'Zapnout zvuk' : 'Vypnout zvuk');
    this.el.muteBtn.setAttribute('aria-pressed', String(v));
  },

  renderHelp() {
    const k = (s) => `<kbd>${s}</kbd>`;
    const standalone = window.matchMedia && window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
    const inViewer = !!(window.claude && typeof window.claude.use === 'function');
    this.el.help.innerHTML = Touch.enabled
      ? (standalone || inViewer ? '' : 'Tip: v menu prohlížeče dej <b>Přidat na plochu</b> a hra poběží přes celou obrazovku jako aplikace.')
      : `${k('A')}${k('D')} běh · ${k('W')} skok · ${k('mezerník')} střela · ${k('E')} super · ${k('Esc')} pauza`;
  },

  // Strany ovládání: joystick vlevo (výchozí) nebo vpravo.
  setSwap(v) {
    Touch.swap = !!v;
    store.set(STORE_SWAP, Touch.swap);
    const txt = Touch.swap ? 'Joystick vpravo' : 'Joystick vlevo';
    for (const id of ['swap-label', 'swap-label2']) {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    }
    if (Game.screen === 'match') Touch.build();
  },

  // Celá obrazovka (kde to prohlížeč dovolí) a otočení na šířku.
  goFullscreen(force) {
    const d = document.documentElement;
    if (!d.requestFullscreen || document.fullscreenElement) return;
    if (!force && !Touch.enabled) return;
    try {
      d.requestFullscreen({ navigationUI: 'hide' }).then(() => {
        try {
          if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
        } catch (e) { /* nevadí */ }
      }).catch(() => {});
    } catch (e) { /* nevadí */ }
  },

  // Odkaz s kódem hry: kdo ho otevře, rovnou se připojuje.
  inviteLink() {
    const inViewer = !!(window.claude && typeof window.claude.use === 'function');
    if (inViewer) return '';
    return location.origin + location.pathname + '#kod-' + Online.code;
  },

  invite() {
    const link = this.inviteLink();
    const text = `Pojď hrát FIFA67! Kód hry: ${Online.code}`;
    if (link && navigator.share) {
      navigator.share({ title: 'FIFA67', text, url: link }).catch(() => {});
      return;
    }
    this.copy(link ? `${text}\n${link}` : text, link ? 'Pozvánka s odkazem zkopírována' : 'Kód zkopírován');
  },

  copy(text, done) {
    const fallback = () => this.toast(text.replace(/\n.*/, ''));
    try {
      navigator.clipboard.writeText(text).then(() => this.toast(done), fallback);
    } catch (e) {
      fallback();
    }
  },

  publicHint(v) {
    const el = document.getElementById('public-hint');
    if (el) el.hidden = !v;
  },

  setSkip(v) {
    if (this.el.skip && this.el.skip.hidden === v) this.el.skip.hidden = !v;
    // během filmových scén schovat dotykové ovládání
    const cut = Game.screen === 'match' && ['intro', 'replay', 'over', 'halftime'].includes(Game.state);
    const t = document.getElementById('touch');
    if (t && t.classList.contains('cut') !== cut) {
      t.classList.toggle('cut', cut);
      if (cut) Touch.reset();
    }
  },

  onlineStatus(text, error) {
    this.el.status.textContent = text;
    this.el.status.classList.toggle('error', !!error);
  },

  toast(text) {
    const t = this.el.toast;
    t.textContent = text;
    t.hidden = false;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => { t.hidden = true; }, 3500);
  },

  show(name) {
    for (const key of ['home', 'online', 'lobby', 'pause', 'result', 'profile', 'cup', 'half', 'story', 'unlock', 'reward', 'tasks', 'board', 'player', 'viet', 'account']) {
      this.el[key].hidden = name !== key && !(name === 'profile' && key === 'home') && !(name === 'reward' && key === 'story');
    }
    this.el.chip.hidden = name !== 'home';
    document.getElementById('app').classList.toggle('on-home', name === 'home');
    // u velkých tabulek schovat ikony v rohu, ať nic nepřekrývají
    document.getElementById('app').classList.toggle('modal', ['result', 'profile', 'cup', 'half', 'unlock', 'reward', 'tasks', 'board', 'player', 'viet', 'account'].includes(name));
    if (name === 'home') {
      this.updateLocks();
      const ac = document.getElementById('acc-chip');
      if (ac) ac.textContent = Account.logged ? Account.state.nick : 'Účet';
    }
    this.measureHud();
    this.el.pauseBtn.hidden = !(Game.screen === 'match' && Game.mode !== 'guest' && (Game.inMatch() || Game.state === 'paused'));
    if (name === 'pause') {
      this.el.pauseThird.textContent = Game.mode === 'host' ? 'Do lobby (i kamarádi)' : 'Výběr hráčů';
    }
    const panel = name && this.el[name];
    if (panel && !Touch.enabled) {
      const first = panel.querySelector('.btn-play:not([hidden])');
      if (first) first.focus({ preventScroll: true });
    }
  },

  showResult() {
    const m = Game.match, setup = Game.setup;
    const [a, b] = m.score;
    const win = Math.max(0, m.winner());
    const T = m.teams[win];
    const pens = a === b && m.pens ? ` · na penalty ${m.pens[0]} : ${m.pens[1]}` : '';
    // můj tým: kde hraje člověk z tohoto zařízení (když jsou všichni v jednom týmu)
    const mine = Game.mode === 'local' ? ['p1'] : [Game.mode === 'host' ? 'host' : Online.uid];
    const myTeams = new Set(setup.players.filter((sp) => mine.includes(sp.ctrl)).map((sp) => sp.team));
    let title, sub;
    const winners = setup.format === '1v1' ? charById(setup.players.find((sp) => sp.team === win).char) : null;
    const verb = winners ? (winners.girl ? 'Vyhrála' : 'Vyhrál') : T.girls ? 'Vyhrály' : 'Vyhráli';
    const winnerName = winners ? winners.name : T.short;
    if (myTeams.size === 1) {
      title = myTeams.has(win) ? 'Výhra!' : 'Prohra';
      sub = `${verb} ${winnerName}${pens}`;
    } else {
      title = `${verb} ${winnerName}`;
      sub = `${m.teams[0].short} ${a} : ${b} ${m.teams[1].short}${pens}`;
    }
    this.el.resKicker.textContent = pens ? 'Rozhodly penalty' : 'Konec zápasu';
    this.el.resTitle.textContent = title;
    this.el.resTitle.style.color = T.light;
    this.el.resA.textContent = a;
    this.el.resB.textContent = b;
    this.el.resA.style.color = m.teams[0].light;
    this.el.resB.style.color = m.teams[1].light;
    this.el.resSub.textContent = sub;
    const guest = Game.mode === 'guest';
    this.el.resMain.hidden = guest;
    this.el.resWait.hidden = !guest;
    this.el.resMain.textContent = Game.mode === 'host' ? 'Odveta' : 'Hrát znovu';
    this.el.resSecond.textContent = guest ? 'Odejít ze hry' : Game.mode === 'host' ? 'Do lobby' : 'Výběr hráčů';
    this.el.resThird.hidden = guest;
    this.el.resThird.textContent = Game.mode === 'host' ? 'Ukončit online hru' : 'Hlavní menu';
    if (Game.cup && setup.cup) {
      Game.cupRecord();
      const cup = Game.cup, me = Game.myCtrl();
      const mySp = setup.players.find((sp) => sp.ctrl === me);
      this.el.resKicker.textContent = `Turnaj · ${setup.stage}`;
      if (mySp) {
        const myWon = m.winner() === mySp.team;
        this.el.resTitle.textContent = cup.stage === 'done' && cup.won ? 'Turnaj vyhrán!' : myWon ? 'Postup do finále!' : setup.stage === 'FINÁLE' ? 'Prohra ve finále' : 'Vypadli jste';
        this.el.resTitle.style.color = myWon ? '#ffc93c' : T.light;
      }
      this.el.resMain.textContent = 'Pokračovat';
      this.el.resSecond.textContent = guest ? 'Odejít ze hry' : 'Ukončit turnaj';
    }
    if (setup.viet) {
      const L = setup.viet, mySp = setup.players.find((sp) => sp.ctrl === Game.myCtrl());
      const myWon = !!mySp && m.winner() === mySp.team;
      this.el.resKicker.textContent = `Vietnam · zápas ${L}/${VIET.length}`;
      this.el.resTitle.textContent = myWon ? (L >= VIET.length ? 'Vietnam poražen!' : `Zápas ${L}/${VIET.length} vyhrán!`) : 'Prohra – zkuste to znovu';
      this.el.resTitle.style.color = myWon ? '#ffc93c' : T.light;
      if (Game.mode === 'host') this.el.resMain.textContent = myWon && L < VIET.length ? 'Další zápas' : 'Znovu';
      const rw = Game.award();
      if (rw && rw.vietReward) {
        this.el.resSub.textContent = 'Odměna: nový hráč TRÁŇA!';
        setTimeout(() => {
          Sound.fanfare();
          this.toast('Odemčen nový hráč: TRÁŇA!');
        }, 700);
      }
    }
    const sr = Game.story && setup.story ? Game.storyRecord() : null;
    if (sr) {
      const last = sr.idx + 1 >= STORY.length;
      this.el.resKicker.textContent = `Příběh · úroveň ${sr.idx + 1}`;
      this.el.resTitle.textContent = sr.win ? (last ? 'Příběh dokončen!' : `Úroveň ${sr.idx + 1} splněna!`) : sr.won ? 'Podmínka nesplněna' : 'Prohra – zkus to znovu';
      if (!sr.win) this.el.resSub.textContent = `Úkol: ${storyGoalText(STORY[sr.idx].goal)}`;
      this.el.resTitle.style.color = sr.win ? '#ffc93c' : T.light;
      this.el.resMain.textContent = sr.win && !last ? 'Další úroveň' : sr.win ? 'Hrát znovu' : 'Zkusit znovu';
      this.el.resSecond.textContent = 'Příběh';
      if (sr.rewards.length) {
        const txt = sr.rewards.map((r) => STORY_REWARDS[r].name).join(' + ');
        this.el.resSub.textContent = `Odměna: ${txt}!`;
        setTimeout(() => {
          Sound.fanfare();
          this.toast(sr.rewards.includes('pav') ? 'Odemčena dvojice Tlustej páv & Suli!' : `Odměna: ${txt}! Skin máš hned na sobě.`);
        }, 700);
      } else if (sr.bonusMissed) {
        const lb = STORY[sr.idx].bonus;
        this.el.resSub.textContent = `Postup ✓ · bonus ${STORY_REWARDS[lb.reward].name} jen když: ${storyGoalText(lb.goal).toLowerCase()}`;
      }
    }
    this.show('result');
    this.renderRewards();
  },

  // Hra zablokovaná: přes celou obrazovku výzva od rozhodčího, hrát nejde.
  showBlocked() {
    try { if (localStorage.getItem(BLOCK_PASS_KEY) === BLOCK_CODE) return; } catch (e) { /* bez úložiště blokace platí */ } // tohle zařízení zná tajný kód
    const el = document.getElementById('blocked');
    // trojité rychlé klepnutí na hlavu rozhodčího: pole pro tajný kód
    const pic = document.getElementById('blk-pic'), form = document.getElementById('blk-form'), input = document.getElementById('blk-code');
    let taps = [];
    pic.addEventListener('pointerdown', () => {
      const now = performance.now();
      taps = taps.filter((t) => now - t < 900);
      taps.push(now);
      if (taps.length >= 3) {
        taps = [];
        form.hidden = false;
        input.value = '';
        input.focus();
      }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const norm = String(input.value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toUpperCase();
      if (codeHash(norm) === BLOCK_CODE) {
        try { localStorage.setItem(BLOCK_PASS_KEY, BLOCK_CODE); } catch (e) { /* nevadí */ }
        input.blur();
        el.hidden = true;
        document.body.classList.remove('game-blocked');
        this.blockedAnim = false;
        Sound.fanfare();
        this.show('home');
        this.toast('Vítej zpátky ve FIFA67!');
      } else {
        form.classList.remove('shake');
        void form.offsetWidth;
        form.classList.add('shake');
        input.value = '';
      }
    });
    document.body.classList.add('game-blocked');
    el.hidden = false;
    document.getElementById('blk-job').href = JOB_URL;
    Touch.show(false);
    const t0 = performance.now();
    this.blockedAnim = true;
    const anim = (now) => {
      if (!this.blockedAnim) return;
      Renderer.portrait(pic, REFEREE, REF_T, 1, (now - t0) / 1000, {});
      requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
    Sound.init();
  },

  // Zámky na tlačítkách v menu.
  updateLocks() {
    const l = document.getElementById('story-lock');
    if (l) l.hidden = true; // Příběh je odemčený pro všechny
    const v = document.getElementById('viet-lock');
    if (v) v.hidden = vietOpen();
  },

  showUnlock(any) {
    const $ = (id) => document.getElementById(id);
    $('unlock-title').textContent = any ? 'Tajný kód' : 'Příběh je zamčený';
    $('unlock-sub').textContent = any ? 'Zadej kód a odemkni zamčené věci' : 'Zadej tajný kód';
    $('unlock-code').value = '';
    $('unlock-err').hidden = true;
    this.show('unlock');
    if (!Touch.enabled) $('unlock-code').focus({ preventScroll: true });
  },

  storySel: -1,

  storyCycle(d) {
    const id = cycleChar(Game.storyChar(), d, true);
    Game.setStoryChar(id);
    Sound.click();
    this.showStory(true);
  },

  // Mapa příběhu: 10 úrovní, výběr hráče, skin a odměny.
  showStory(keepSel) {
    const $ = (id) => document.getElementById(id);
    const st = Story.get(), me = Game.storyChar(), look = charById(me);
    const d = duoOf(me), T = d >= 0 ? DUO_TEAMS[d] : look.kit || SIDE_COLORS[0];
    const skinId = ownedSkinFor(me);
    const skin = mySkinFor(me);
    $('story-prog').textContent = `${st.done} / ${STORY.length}`;
    $('story-title').textContent = 'Příběh';
    document.querySelectorAll('#camp-tabs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.camp === Story.campaign)));
    $('story-map').style.setProperty('--cols', STORY.length > 10 ? 9 : 5);
    $('story-map').classList.toggle('many', STORY.length > 10);
    $('story-name').textContent = look.name;
    const pw = POWERS[powerOf(me)];
    $('story-power').textContent = `${pw.icon} ${pw.name}`;
    document.querySelector('.story-me').style.setProperty('--me', skin === 'moncler' ? '#e9edf3' : T.color);
    requestAnimationFrame(() => Renderer.portrait($('story-pic'), me, T, 1, undefined, { skin }));
    const gb = $('btn-gold');
    gb.hidden = !skinId;
    gb.setAttribute('aria-pressed', String(!!skin));
    if (skinId) $('gold-label').textContent = skin ? `${SKINS[skin].name} ✓` : ownedSkinsFor(me).length > 1 ? 'Skin: žádný' : SKINS[skinId].name;
    const cur = Math.min(st.done, STORY.length - 1);
    if (!keepSel || this.storySel < 0) this.storySel = cur;
    const map = $('story-map');
    map.textContent = '';
    const lockSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
    STORY.forEach((lv, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      const opp = storyOpp(lv), two = lv.format === '2v2';
      const chars = two ? DUO_TEAMS[opp].chars : [opp];
      const oT = two ? DUO_TEAMS[opp] : (() => { const od = duoOf(opp); return od >= 0 ? DUO_TEAMS[od] : charById(opp).kit || SIDE_COLORS[1]; })();
      const locked = i > st.done;
      b.className = 'sn' + (two ? ' two' : '') + (i < st.done ? ' done' : i === st.done ? ' cur' : ' locked') + (i === STORY.length - 1 ? ' boss' : '') + (i === this.storySel ? ' sel' : '');
      const oname = two ? DUO_TEAMS[opp].short : charById(opp).name;
      b.setAttribute('aria-label', `Úroveň ${i + 1}: ${oname}${locked ? ' (zamčeno)' : ''}`);
      const num = document.createElement('span');
      num.className = 'sn-num';
      num.textContent = i + 1;
      const pics = document.createElement('span');
      pics.className = 'sn-pics';
      const cvs = chars.map(() => {
        const cv = document.createElement('canvas');
        cv.className = 'sn-pic';
        pics.appendChild(cv);
        return cv;
      });
      const nm = document.createElement('span');
      nm.className = 'sn-name';
      nm.textContent = i === STORY.length - 1 ? 'BOSS' : two ? '2 v 2' : oname;
      b.append(num, pics, nm);
      if (lv.reward || lv.bonus) {
        const bd = document.createElement('span');
        bd.className = 'sn-badge';
        bd.textContent = '🎁';
        b.appendChild(bd);
      }
      if (i < st.done) {
        const ck = document.createElement('span');
        ck.className = 'sn-check';
        ck.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
        b.appendChild(ck);
      }
      if (locked) {
        const lk = document.createElement('span');
        lk.className = 'sn-lock';
        lk.innerHTML = lockSvg;
        b.appendChild(lk);
      }
      b.addEventListener('click', () => {
        Sound.init();
        Sound.click();
        this.storySel = i;
        this.showStory(true);
      });
      li.appendChild(b);
      map.appendChild(li);
      requestAnimationFrame(() => cvs.forEach((cv, k) => Renderer.portrait(cv, chars[k], oT, -1, undefined, { head: true })));
    });
    const lv = STORY[this.storySel];
    const diff = { easy: 'Lehká', medium: 'Střední', hard: 'Těžká' }[lv.level];
    const boss = this.storySel === STORY.length - 1;
    const locked = this.storySel > st.done;
    $('si-kicker').textContent = `Úroveň ${this.storySel + 1} · ${lv.format === '2v2' ? '2 v 2' : '1 v 1'} · ${boss ? 'Boss' : diff}${this.storySel < st.done ? ' · splněno ✓' : ''}`;
    $('si-title').textContent = lv.title;
    $('si-text').textContent = lv.text;
    $('si-goal').textContent = `🎯 ${storyGoalText(lv.goal)}`;
    const rb = $('btn-story-reward');
    const rwKey = lv.reward || (lv.bonus && lv.bonus.reward);
    rb.hidden = !rwKey;
    if (rwKey) rb.textContent = `${lv.bonus ? '⭐ Bonus:' : '🎁'} ${STORY_REWARDS[rwKey].name}`;
    if (lv.bonus) $('si-goal').textContent += ` · ⭐ bonus: ${storyGoalText(lv.bonus.goal).toLowerCase()}`;
    const play = $('btn-story-play');
    play.disabled = locked;
    play.textContent = locked ? 'Zamčeno' : this.storySel < st.done ? 'Znovu' : 'Hrát';
    if (Game.screen === 'story') this.show('story');
  },

  // Výzva Vietnam: mapa 5 zápasů, odměna Tráňa, zámek do 12:00.
  showViet() {
    const $ = (id) => document.getElementById(id);
    const done = Viet.done(), open = vietOpen(), next = Viet.next();
    const map = $('viet-map');
    map.textContent = '';
    const draws = [];
    VIET.forEach((lv, i) => {
      const li = document.createElement('li');
      li.className = 'vn' + (i < done ? ' done' : i === next ? ' cur' : ' locked');
      const num = document.createElement('span');
      num.className = 'sn-num';
      num.textContent = i + 1;
      const pics = document.createElement('span');
      pics.className = 'sn-pics';
      const D = DUO_TEAMS[lv.duo];
      for (const ch of D.chars) {
        const cv = document.createElement('canvas');
        cv.className = 'sn-pic';
        pics.appendChild(cv);
        draws.push(() => Renderer.portrait(cv, ch, D, -1, undefined, { head: true }));
      }
      const nm = document.createElement('span');
      nm.className = 'vn-name';
      nm.textContent = lv.short;
      const meta = document.createElement('span');
      meta.className = 'vn-meta';
      meta.textContent = `${{ easy: 'Lehký', medium: 'Střední', hard: 'Těžký' }[lv.level]}${lv.arena ? ' · ' + ARENAS[lv.arena].icon : ''}`;
      li.append(num, pics, nm, meta);
      if (i < done) {
        const ck = document.createElement('span');
        ck.className = 'sn-check';
        ck.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
        li.appendChild(ck);
      }
      if (lv.reward) {
        const bd = document.createElement('span');
        bd.className = 'sn-badge';
        bd.textContent = '🎁';
        li.appendChild(bd);
      }
      map.appendChild(li);
    });
    const got = Unlocks.has('trana');
    $('viet-rw').textContent = 'TRÁŇA';
    $('viet-rw-sub').textContent = got ? 'odemčeno ✓' : 'za vítězství ve finále';
    const lv = VIET[next], D = DUO_TEAMS[lv.duo];
    $('viet-next-k').textContent = done >= VIET.length ? 'Vietnam poražen ✓ · finále znovu' : `Další zápas · ${next + 1}/${VIET.length}`;
    $('viet-next-t').textContent = lv.title;
    $('viet-info').textContent = `${lv.text}  Soupeř: ${D.name}.`;
    $('viet-locked').hidden = open;
    $('viet-actions').hidden = !open;
    this.show('viet');
    if (!open) {
      const tick = () => {
        if ($('viet').hidden) return;
        const ms = VIET_OPEN - Date.now();
        if (ms <= 0) {
          this.updateLocks();
          this.showViet();
          return;
        }
        const h = Math.floor(ms / 3600000), mn = Math.floor((ms % 3600000) / 60000), sc = Math.floor((ms % 60000) / 1000);
        $('viet-count').textContent = `🔒 Otevře se dnes ve 12:00 – za ${h ? h + ' h ' : ''}${mn} min ${sc} s`;
        setTimeout(tick, 1000);
      };
      tick();
    }
    requestAnimationFrame(() => {
      draws.forEach((f) => f());
      Renderer.portrait($('viet-pic'), 'trana', charById('trana').kit, 1, undefined, { happy: true });
    });
  },

  // Úkoly: postup, odměna a zapnutí skinu.
  showTasks() {
    const list = document.getElementById('task-list');
    list.textContent = '';
    const draws = [];
    for (const t of TASKS) {
      const got = Unlocks.has(t.reward);
      const prog = Math.min(t.goal, Tasks.progress(t));
      const li = document.createElement('li');
      li.className = 'task' + (got ? ' done' : '');
      const cv = document.createElement('canvas');
      cv.className = 'task-pic';
      const info = document.createElement('div');
      info.className = 'task-info';
      const k = document.createElement('p');
      k.className = 'mini-kicker';
      k.textContent = t.title;
      const nm = document.createElement('p');
      nm.className = 'task-name';
      nm.textContent = t.name;
      const bar = document.createElement('span');
      bar.className = 'rw-bar wide';
      const fill = document.createElement('i');
      fill.style.width = `${Math.round((prog / t.goal) * 100)}%`;
      bar.appendChild(fill);
      const num = document.createElement('span');
      num.className = 'task-num';
      num.textContent = got ? 'Splněno ✓' : `${prog} / ${t.goal}`;
      const row = document.createElement('div');
      row.className = 'task-row';
      row.append(bar, num);
      info.append(k, nm, row);
      li.append(cv, info);
      if (got && t.kind === 'skin') {
        const on = skinOn(t.reward);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn-chip small skin-toggle' + (on ? ' on' : '');
        b.textContent = on ? 'Zapnuto ✓' : 'Zapnout';
        b.addEventListener('click', () => {
          Sound.init();
          Game.toggleSkin(t.reward);
          this.showTasks();
        });
        li.appendChild(b);
      } else if (got) {
        const b = document.createElement('span');
        b.className = 'task-got';
        b.textContent = 'Odemčeno';
        li.appendChild(b);
      }
      list.appendChild(li);
      const c = charById(t.char), d = duoOf(c.id), T = d >= 0 ? DUO_TEAMS[d] : c.kit || SIDE_COLORS[0];
      draws.push(() => Renderer.portrait(cv, t.char, T, 1, undefined, { skin: t.kind === 'skin' ? t.reward : '' }));
    }
    this.show('tasks');
    requestAnimationFrame(() => draws.forEach((f) => f()));
  },

  // Náhled odměny (co dostaneš za úroveň).
  showReward(key) {
    const rw = STORY_REWARDS[key];
    if (!rw) return;
    const $ = (id) => document.getElementById(id);
    const i = STORY.findIndex((l) => l.reward === key || (l.bonus && l.bonus.reward === key)), lv = STORY[i];
    const isBonus = lv.reward !== key;
    const got = Unlocks.has(key);
    $('rw-title').textContent = rw.name;
    $('rw-kicker').textContent = got ? 'Odměna · získáno ✓' : `${isBonus ? 'Bonus' : 'Odměna'} za úroveň ${i + 1}`;
    $('rw-text').textContent = rw.text;
    $('rw-how').textContent = got ? (rw.kind === 'skin' ? `Zapneš ho tlačítkem skinu u postavy ${charById(SKINS[key].char).name}.` : 'Najdeš je ve výběru hráčů.') : `Úkol: ${storyGoalText(isBonus ? lv.bonus.goal : lv.goal)}`;
    const box = $('rw-pics');
    box.textContent = '';
    const list = rw.kind === 'skin' ? [[SKINS[key].char, key]] : DUO_TEAMS.find((t) => t.locked === key).chars.map((c) => [c, '']);
    const T = rw.kind === 'skin' ? SKINS[key].kit || DUO_TEAMS[Math.max(0, duoOf(SKINS[key].char))] : DUO_TEAMS.find((t) => t.locked === key);
    const cvs = list.map(() => {
      const cv = document.createElement('canvas');
      cv.className = 'rw-pic';
      box.appendChild(cv);
      return cv;
    });
    this.show('reward');
    // postavy v náhledu se hýbou
    const t0 = performance.now();
    const anim = (now) => {
      if ($('reward').hidden) return;
      cvs.forEach((cv, k) => Renderer.portrait(cv, list[k][0], T, k === 0 ? 1 : -1, (now - t0) / 1000, { skin: list[k][1], happy: true }));
      requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  },

  orient() {
    const portrait = window.innerHeight > window.innerWidth;
    const show = Touch.enabled && portrait;
    this.el.rotate.hidden = !show;
    if (show && Game.mode === 'local' && Game.inMatch()) Game.pause();
  },
};

/* ---------------- start ---------------- */

/*
 * Kolik místa je opravdu vidět. Některé prohlížeče (třeba okno s hrou v aplikaci)
 * hlásí větší okno, než ukážou, nebo mají dole lištu přes obsah. Hra si proto
 * změří bezpečné okraje a viditelnou část a podle toho zmenší rozložení.
 */
const Fit = {
  cutT: 0,
  cutB: 0,
  probe: null,

  init() {
    const pr = document.createElement('div');
    pr.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;'
      + 'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
    document.body.appendChild(pr);
    this.probe = pr;
    // viditelná část stránky (když ji okolní aplikace ořízne)
    if ('IntersectionObserver' in window) {
      const sentinel = document.createElement('div');
      sentinel.style.cssText = 'position:fixed;inset:0;pointer-events:none;opacity:0;z-index:-1';
      document.body.appendChild(sentinel);
      const th = [];
      for (let i = 0; i <= 100; i++) th.push(i / 100);
      new IntersectionObserver((list) => {
        const e = list[list.length - 1];
        const r = e.intersectionRect, h = window.innerHeight;
        if (!e.isIntersecting || r.height < 150 || r.height > h - 2) {
          this.setCut(0, 0);
          return;
        }
        this.setCut(Math.max(0, r.top), Math.max(0, h - r.bottom));
      }, { threshold: th }).observe(sentinel);
    }
    this.apply();
  },

  setCut(t, b) {
    t = Math.round(t);
    b = Math.round(b);
    if (t === this.cutT && b === this.cutB) return;
    this.cutT = t;
    this.cutB = b;
    this.apply();
    Renderer.resize();
    UI.orient();
    if (Game.screen === 'lobby') Game.renderLobby();
  },

  apply() {
    const root = document.documentElement, app = document.getElementById('app');
    const cs = getComputedStyle(this.probe);
    const test = window.HLAVOUNI_INSETS || {};
    const env = (k, side) => (test[side] !== undefined ? test[side] : parseFloat(cs[k]) || 0);
    const st = env('paddingTop', 't'), sb = env('paddingBottom', 'b');
    const sl = env('paddingLeft', 'l'), sr = env('paddingRight', 'r');
    // ořezaná část: #app jen na viditelný výřez
    const visH = window.innerHeight - this.cutT - this.cutB;
    app.style.marginTop = this.cutT ? `${this.cutT}px` : '';
    app.style.height = this.cutT || this.cutB ? `${visH}px` : '';
    const eff = Math.max(200, visH - st - sb), effW = window.innerWidth - sl - sr;
    root.style.setProperty('--vh', `${eff / 100}px`);
    root.style.setProperty('--safe-t', `${st}px`);
    root.style.setProperty('--safe-b', `${sb}px`);
    root.style.setProperty('--safe-l', `${sl}px`);
    root.style.setProperty('--safe-r', `${sr}px`);
    const cl = root.classList;
    cl.toggle('h460', eff <= 460);
    cl.toggle('h380', eff <= 380);
    cl.toggle('h320', eff <= 320);
    cl.toggle('w700', effW <= 700);
  },
};

// Safari na iPhonu nedodržuje zákaz přiblížení: dva prsty (joystick + tlačítko)
// bere jako roztažení a dvojí ťuknutí přibližuje. Tady se to zablokuje.
function noZoom() {
  const stop = (e) => e.preventDefault();
  for (const t of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(t, stop, { passive: false });
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1 || (e.scale !== undefined && e.scale !== 1)) e.preventDefault();
  }, { passive: false });
  // ovládání ve hře: dotyk nesmí posouvat ani přibližovat stránku
  const touch = document.getElementById('touch');
  touch.addEventListener('touchstart', stop, { passive: false });
  touch.addEventListener('touchmove', stop, { passive: false });
  document.getElementById('game').addEventListener('touchstart', stop, { passive: false });
  let lastEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    const t = e.target;
    const interactive = t && t.closest && t.closest('button, input, a, label');
    if (!interactive && now - lastEnd < 350) e.preventDefault();
    lastEnd = now;
  }, { passive: false });
  document.addEventListener('dblclick', stop, { passive: false });
  // kdyby se stránka přesto přiblížila, vrátit ji zpět
  const vv = window.visualViewport;
  const meta = document.querySelector('meta[name="viewport"]');
  if (vv && meta) {
    const base = meta.getAttribute('content');
    vv.addEventListener('resize', () => {
      if (vv.scale > 1.02) {
        meta.setAttribute('content', base + ', maximum-scale=1');
        setTimeout(() => meta.setAttribute('content', base), 300);
      }
    });
  }
}

function boot() {
  noZoom();
  const canvas = document.getElementById('game');
  const heroCanvas = document.getElementById('hero');
  Fit.init();
  Renderer.init(canvas);
  Touch.init(document.getElementById('touch'));
  Touch.onEnable = () => {
    UI.renderHelp();
    UI.orient();
    if (Game.inMatch()) {
      Touch.build();
      Touch.show(true);
    }
  };
  LobbyUI.init();
  UI.init();
  Game.init();
  // odkaz s kódem hry (#kod-ABCD) rovnou otevře připojení
  const joinFromHash = () => {
    const hm = /^#kod-([A-Za-z0-9]{4})$/.exec(location.hash || '');
    if (!hm || Online.active) return;
    Game.toOnline(hm[1]);
    if (UI.el.nick.value) Game.guestJoin(hm[1], UI.el.nick.value);
    else UI.onlineStatus('Napiš své jméno a dej Připojit.');
  };
  joinFromHash();
  window.addEventListener('hashchange', joinFromHash);

  window.addEventListener('resize', () => {
    Fit.apply();
    Renderer.resize();
    UI.orient();
    if (Game.screen === 'lobby') Game.renderLobby();
  });
  if (document.fonts && document.fonts.load) {
    Promise.all([
      // i s českými znaky (jsou v samostatném souboru písma)
      document.fonts.load(`40px ${FONT_D}`, 'AÁěščřžýíéůúĚŠČŘŽÝÍÉŮÚ'),
      document.fonts.load(`800 24px ${FONT_U}`, 'AÁěščřžýíéůúĚŠČŘŽÝÍÉŮÚ'),
      document.fonts.load(`700 24px ${FONT_U}`, 'AÁěščřžýíéůúĚŠČŘŽÝÍÉŮÚ'),
    ]).then(() => {
      Renderer.buildBg();
      if (Game.screen === 'lobby') Game.renderLobby();
    }).catch(() => {});
  }

  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (Game.state === 'paused') Game.resume();
      else if (Game.inMatch()) Game.pause();
      else return;
      e.preventDefault();
      return;
    }
    if ((e.code === 'Enter' || e.code === 'Space') && Game.canSkip()) {
      e.preventDefault();
      Game.skip();
      return;
    }
    if (Game.screen === 'match' && KEYMAP[e.code]) {
      e.preventDefault();
      Input.down(e.code, e.repeat);
    }
  });
  window.addEventListener('keyup', (e) => Input.up(e.code));
  // Při přepnutí jinam se hra na jednom zařízení pozastaví (online běží dál).
  window.addEventListener('blur', () => {
    Input.clear();
    Touch.reset();
    if (Game.mode === 'local') Game.pause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Game.mode === 'local') Game.pause();
  });
  window.addEventListener('pagehide', () => {
    if (Online.active) Online.leave();
  });

  let last = performance.now();
  // jeden snímek hry (při nahrávání traileru ho volá nahrávací skript s přesným časem)
  const tick = (now) => {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    if (Trailer.on) Trailer.update(now);
    if (UI.blockedAnim) return; // hra zablokovaná: zápas pod výzvou neběží (šetří telefon)
    Game.update(dt);
    Renderer.draw(Game);
    if (Trailer.on) Trailer.draw(now);
    if (Game.screen === 'home') Renderer.drawHero(heroCanvas, now);
    else if (Game.screen === 'lobby' && !UI.el.lobby.hidden) LobbyUI.animate(now / 1000);
  };
  window.hlavouniTick = tick;
  const frame = (now) => {
    if (Trailer.manual) return; // nahrávání: snímky řídí skript
    tick(now);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  window.hlavouni = { Game, Match, Renderer, Input, Online, Net, Trailer };
  Updater.init();
  Trailer.init();
  Account.init();
  if (GAME_BLOCKED && !Trailer.on && !/trailer/.test(location.search)) UI.showBlocked();
}

/*
 * Automatická aktualizace (jen na GitHub Pages): telefon si stránku drží v paměti,
 * takže se při spuštění a po návratu do aplikace zeptáme na version.json. Když je venku
 * novější verze a hráč je v hlavním menu, stránka se sama načte znovu (s ?v=…, aby se
 * nepoužila stará kopie). Na claude.ai a v souboru se nic nedělá.
 */
const Updater = {
  busy: false,
  init() {
    if (!/^https?:$/.test(location.protocol) || !/github\.io$/.test(location.hostname)) return;
    this.check();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.check(); });
    setInterval(() => this.check(), 5 * 60 * 1000);
  },
  check() {
    if (this.busy) return;
    this.busy = true;
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((o) => {
        this.busy = false;
        const v = o && typeof o.v === 'string' ? o.v.slice(0, 12) : '';
        if (!v || v === GAME_VERSION) return;
        // jednou za verzi (kdyby server ještě chvíli posílal starou stránku, nezacyklí se to)
        let tried = '';
        try { tried = sessionStorage.getItem('hlavouni.upd') || ''; } catch (e) { /* nevadí */ }
        if (tried === v) return;
        if (Game.screen !== 'home' && Game.screen !== 'online') {
          this.pending = v;
          return;
        }
        this.reload(v);
      })
      .catch(() => { this.busy = false; });
  },
  reload(v) {
    try { sessionStorage.setItem('hlavouni.upd', v); } catch (e) { /* nevadí */ }
    UI.toast(`Stahuji novou verzi ${v}…`);
    setTimeout(() => location.replace(location.pathname + '?v=' + encodeURIComponent(v) + location.hash), 600);
  },
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
