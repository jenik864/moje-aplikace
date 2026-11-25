'use strict';
/* Herní smyčka, průběh zápasu, obrazovky a online režim. */

const STORE_LOBBY = 'hlavouni.lobby';
const STORE_MUTE = 'hlavouni.ztlumeno';
const STORE_NAME = 'hlavouni.jmeno';

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

const STATE_CODE = { countdown: 'c', kickoff: 'k', play: 'p', goal: 'g', over: 'o', paused: 'z' };
const CODE_STATE = { c: 'countdown', k: 'kickoff', p: 'play', g: 'goal', o: 'over', z: 'paused' };
const INTERP_MS = 100;

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
  timeLeft: 0,
  golden: false,
  msg: null,
  msgId: 0,
  countShown: 0,
  lastTick: -1,
  resultShown: false,
  demoGoalAt: 0,
  scorePop: [0, 0],
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
    return this.screen === 'match' && ['countdown', 'kickoff', 'play', 'goal'].includes(this.state);
  },

  /* ---------------- obrazovky ---------------- */

  newDemo() {
    const two = Math.random() < 0.6;
    const lobby = newLobby({ format: two ? '2v2' : '1v1' });
    if (!two) {
      lobby.slots[0].char = pick(ROSTER).id;
      lobby.slots[1].char = pick(ROSTER).id;
    }
    lobby.slots.forEach((s) => { s.ctrl = 'cpu'; });
    lobby.level = 'hard';
    const setup = this.buildSetup(lobby);
    setup.demo = true;
    this.match = new Match(setup, (t, d) => this.onEvent(t, d));
    this.stateT = 0;
    this.acc = 0;
  },

  toHome() {
    if (Online.active) Online.leave();
    this.mode = 'local';
    this.screen = 'home';
    this.state = 'menu';
    this.paused = null;
    this.msg = null;
    this.golden = false;
    this.timeLeft = 0;
    Effects.clear();
    Input.clear();
    Touch.show(false);
    this.newDemo();
    Sound.quiet = true;
    Sound.crowdLevel(0.02);
    UI.show('home');
  },

  toOnline() {
    this.screen = 'online';
    UI.show('online');
    UI.onlineStatus('');
    Net.detect().then((kind) => {
      if (kind === null) UI.onlineStatus('Online hra tady nejde. Na claude.ai musíš být přihlášený, jinak otevři hru z webu (třeba GitHub Pages).', true);
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

  openLocalLobby() {
    this.mode = 'local';
    this.lobby = newLobby(this.prefs, 'p1');
    this.toLobby();
  },

  async hostCreate(name) {
    UI.onlineStatus('Zakládám hru…');
    try {
      await Online.create(name);
    } catch (e) {
      UI.onlineStatus(this.netError(e), true);
      return;
    }
    this.mode = 'host';
    this.lobby = newLobby(this.prefs, 'host');
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
    if (msg === 'notfound' || msg === 'peer-unavailable') return `Hra s kódem ${code} neexistuje nebo už skončila.`;
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
    this.prefs = { format: l.format, minutes: l.minutes, level: l.level, chars: l.format === '1v1' ? l.slots.map((s) => s.char) : this.prefs.chars };
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
      return;
    }
    const l = this.lobby;
    if (a.type === 'setting') {
      if (a.key === 'format') {
        if (l.format === a.value) return;
        l.slots = makeSlots(a.value, l);
        l.format = a.value;
      } else {
        l[a.key] = a.value;
      }
    } else if (a.type === 'slot') {
      const s = l.slots[a.slot];
      if (!s) return;
      if (this.mode === 'local') {
        // volná postava dostane prvního volného hráče, jinak hráč 1 → hráč 2 → počítač
        const used = (c) => l.slots.some((o, j) => j !== a.slot && o.ctrl === c);
        let next;
        if (s.ctrl === 'cpu') next = !used('p1') ? 'p1' : !used('p2') ? 'p2' : 'p1';
        else if (s.ctrl === 'p1') next = !used('p2') ? 'p2' : 'cpu';
        else next = 'cpu';
        if (next !== 'cpu') releaseCtrl(l, next);
        s.ctrl = next;
      } else if (s.ctrl === 'host') {
        s.ctrl = 'cpu';
      } else {
        claimSlot(l, 'host', a.slot);
      }
    } else if (a.type === 'char') {
      const s = l.slots[a.slot];
      if (s) s.char = cycleChar(s.char, a.d);
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
      lobby: { format: l.format, minutes: l.minutes, level: l.level, slots: l.slots.map((s) => ({ team: s.team, char: s.char, ctrl: s.ctrl })), members: Online.members() },
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
    return {
      id: randomId(6),
      rev: 0,
      demo: false,
      format: lobby.format,
      level: lobby.level,
      minutes: lobby.minutes,
      teams: teamsFor(lobby),
      players: lobby.slots.map((s) => ({ char: s.char, team: s.team, ctrl: s.ctrl, name: nameOf(s.ctrl) })),
    };
  },

  // Popisek nad hlavou hráče z pohledu tohoto zařízení.
  labelFor(sp) {
    if (sp.ctrl === 'cpu') return 'CPU';
    if (this.mode === 'local') return sp.ctrl === 'p1' ? 'P1' : 'P2';
    const me = this.mode === 'host' ? 'host' : Online.uid;
    if (sp.ctrl === me) return 'TY';
    return sp.name || (sp.ctrl === 'host' ? 'Hostitel' : 'Kamarád');
  },

  localHumans(setup) {
    const mine = this.mode === 'host' ? ['host'] : ['p1', 'p2'];
    return setup.players.filter((sp) => mine.includes(sp.ctrl)).length;
  },

  /* ---------------- zápas ---------------- */

  start() {
    if (this.mode === 'guest') return;
    this.beginMatch(this.buildSetup(this.lobby));
  },

  beginMatch(setup) {
    Sound.init();
    Sound.quiet = false;
    this.setup = setup;
    const humans = this.localHumans(setup);
    Input.shared = humans <= 1;
    Input.clear();
    this.match = new Match(setup, (t, d) => this.onEvent(t, d), (uid) => Online.remoteIntent(uid));
    this.match.players.forEach((p, i) => { p.label = this.labelFor(setup.players[i]); });
    this.screen = 'match';
    this.timeLeft = setup.minutes * 60;
    this.golden = false;
    this.lastTick = -1;
    this.countShown = 0;
    this.scorePop = [0, 0];
    this.msg = null;
    this.state = 'countdown';
    this.stateT = 0;
    this.acc = 0;
    this.paused = null;
    this.resultShown = false;
    this.evq = [];
    this.t0 = performance.now();
    Effects.clear();
    UI.show(null);
    Touch.build(humans >= 2);
    Touch.show(humans >= 1);
    Sound.crowdLevel(0.05);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (this.mode === 'host') Online.publish({ phase: 'match', setup: this.netSetup(), g: this.snapshot() });
  },

  netSetup() {
    const s = this.setup;
    return { id: s.id, rev: s.rev, format: s.format, minutes: s.minutes, teams: s.teams, players: s.players };
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
        if (m) Effects.confetti(a[0], m.teams[a[0]]);
        if (live) {
          Sound.goal();
          Sound.whistle('short');
          Effects.shake(16);
        }
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
        break;
      case 'head':
        this.fx('head', d.x, d.y, Math.min(1, d.impact / 700));
        break;
      case 'bounce':
        this.fx('bounce', d.x, Math.min(1, d.impact / 900));
        break;
      case 'post':
        this.fx('post', d.x, d.y);
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
    const s = d.scorer;
    let sub = '';
    if (s) {
      const who = s.isHuman && s.label && s.label !== s.look.name ? `${s.look.name} (${s.label})` : s.look.name;
      sub = d.own ? `Vlastní gól: ${who}` : `Skóruje ${who}`;
    }
    this.showMsg('GÓL!', sub, 2.5, this.match.teams[d.team].color, 150);
    this.scorePop[d.team] = performance.now();
    this.fx('goal', d.team);
  },

  timeUp() {
    const m = this.match;
    if (m.score[0] !== m.score[1]) {
      this.finish();
      return;
    }
    this.golden = true;
    this.showMsg('ZLATÝ GÓL', 'Kdo dá další gól, vyhrává', 2.4, '#ffc93c', 100);
    this.fx('whistle', 'long');
  },

  finish() {
    const m = this.match;
    m.locked = true;
    m.celebrate = m.score[0] > m.score[1] ? 0 : 1;
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
      case 'goal':
      case 'over': return 'celebrate';
      default: return 'freeze';
    }
  },

  physics(dt, scale) {
    this.acc += dt * scale;
    let n = 0;
    while (this.acc >= STEP && n < 30) {
      this.match.step(STEP, this.physMode());
      this.acc -= STEP;
      n++;
    }
    if (n >= 30) this.acc = 0;
  },

  update(dt) {
    if (this.msg) {
      this.msg.t += dt;
      if (this.msg.t >= this.msg.dur) this.msg = null;
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
          this.showMsg(String(n), '', 0.7, '#f3f6ef', 150);
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
        if (!this.golden) {
          this.timeLeft -= dt;
          const sec = Math.ceil(this.timeLeft);
          if (sec <= 5 && sec >= 1 && sec !== this.lastTick) {
            this.lastTick = sec;
            this.fx('tick');
          }
          if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.timeUp();
            if (this.state !== 'play') break;
          }
        }
        this.physics(dt, 1);
        if (this.state === 'play' && m.ball.stalled) {
          m.kickoff();
          this.state = 'kickoff';
          this.stateT = 0;
          this.showMsg('NOVÝ VÝKOP', '', 1, '#f3f6ef', 80);
        }
        const nearGoal = Math.min(m.ball.x, W - m.ball.x) < 260;
        Sound.crowdLevel(nearGoal ? 0.1 : 0.05);
        break;
      }

      case 'goal':
        if (Math.random() < dt * 22) Effects.flash();
        this.physics(dt, this.stateT < 0.9 ? 0.4 : 1);
        if (this.stateT > 2.7) {
          if (this.golden || this.timeLeft <= 0) {
            this.finish();
          } else {
            m.kickoff();
            this.state = 'kickoff';
            this.stateT = 0;
          }
        }
        break;

      case 'over':
        if (Math.random() < dt * 10) Effects.flash();
        this.physics(dt, 1);
        if (!this.resultShown && this.stateT > 1.7) {
          this.resultShown = true;
          UI.showResult();
        }
        break;
    }

    if (this.mode === 'host' && this.screen === 'match') {
      if (this.setup.rev !== this._sentRev) {
        this._sentRev = this.setup.rev;
        Online.publish({ setup: this.netSetup() });
      }
      Online.publish({ g: this.snapshot() });
    }
  },

  // Stav zápasu pro kamarády (malý, vejde se do „presence“).
  snapshot() {
    const m = this.match, b = m.ball, r = Math.round;
    const msg = this.msg;
    return {
      n: ++this.snapN,
      ht: r(performance.now() - this.t0),
      s: STATE_CODE[this.state] || 'p',
      t: r(this.timeLeft * 10),
      gd: this.golden ? 1 : 0,
      sc: [m.score[0], m.score[1]],
      b: [r(b.x), r(b.y), r(b.rot * 100)],
      p: m.players.map((p) => [r(p.x), r(p.y), p.kickT < 0 ? -1 : r(p.kickT * 1000), p.mood, p.onGround ? 1 : 0, r(p.vx / 10), r(p.vy / 10)]),
      m: msg ? [msg.id, msg.text, msg.sub || '', msg.color, msg.size, Math.round(msg.dur * 10)] : 0,
      e: this.evq,
      rs: this.resultShown ? 1 : 0,
    };
  },

  /* ---------------- host: zobrazení zápasu podle hostitele ---------------- */

  onHostPresence(hp) {
    if (!hp || this.mode !== 'guest') return;
    if (hp.phase === 'closed') {
      this.hostGone();
      return;
    }
    if (hp.phase === 'lobby') {
      if (this.screen === 'match') this.toLobby();
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
    this.match.players.forEach((p, i) => {
      p.brain = null;
      p.label = this.labelFor(setup.players[i]);
    });
    this.match.ball.held = false;
    this.screen = 'match';
    this.state = 'countdown';
    this.buf = [];
    this.offset = null;
    this.lastEvN = Infinity; // staré efekty nepřehrávat
    this.lastSnapN = -1;
    this.lastMsgId = 0;
    this.msg = null;
    this.resultShown = false;
    this.scorePop = [0, 0];
    this.timeLeft = setup.minutes * 60;
    Input.shared = true;
    Input.clear();
    Effects.clear();
    UI.show(null);
    Touch.build(false);
    Touch.show(true);
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
      if (st === 'over') Touch.show(false);
      this.state = st;
      this.stateT = 0;
    }
    this.timeLeft = (Number(g.t) || 0) / 10;
    this.golden = !!g.gd;
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
    if ((this.state === 'goal' && Math.random() < dt * 22) || (this.state === 'over' && Math.random() < dt * 10)) Effects.flash();
    // vlastní ovládání hostiteli
    if (this.state !== 'over') Online.sendInput(Input.intent(0));
    const buf = this.buf;
    if (!buf.length || this.offset === null) return;
    const target = performance.now() - this.offset - INTERP_MS;
    let a = buf[0], b = null;
    for (let i = buf.length - 1; i >= 0; i--) {
      if (buf[i].ht <= target) {
        a = buf[i];
        b = buf[i + 1] || null;
        break;
      }
    }
    const k = b ? clamp((target - a.ht) / Math.max(1, b.ht - a.ht), 0, 1) : 0;
    const B = b || a;
    m.players.forEach((p, i) => {
      const pa = a.g.p[i], pb = B.g.p[i] || pa;
      if (!pa) return;
      p.x = lerp(pa[0], pb[0], k);
      p.y = lerp(pa[1], pb[1], k);
      p.kickT = pb[2] < 0 ? -1 : pb[2] / 1000;
      p.mood = pb[3];
      p.onGround = !!pb[4];
      p.vx = pb[5] * 10;
      p.vy = pb[6] * 10;
      if (p.onGround) p.runPhase += p.vx * p.dir * dt * 0.05;
      p.blinkT -= dt;
      if (p.blinkT <= 0) {
        p.blink = 0.13;
        p.blinkT = rand(2, 5);
      }
      if (p.blink > 0) p.blink -= dt;
    });
    const ba = a.g.b, bb = B.g.b;
    if (Array.isArray(ba) && Array.isArray(bb)) {
      m.ball.x = lerp(ba[0], bb[0], k);
      m.ball.y = lerp(ba[1], bb[1], k);
      m.ball.rot = lerp(ba[2], bb[2], k) / 100;
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
    format,
    minutes: [1, 2, 3].includes(l.minutes) ? l.minutes : 2,
    level: AI_LEVELS[l.level] ? l.level : 'medium',
    slots: l.slots.slice(0, 4).map((s) => ({
      team: s && s.team === 1 ? 1 : 0,
      char: charById(s && s.char).id,
      ctrl: s && typeof s.ctrl === 'string' ? s.ctrl.slice(0, 16) : 'cpu',
    })),
    members: Array.isArray(l.members) ? l.members.slice(0, 8).map((m) => ({ uid: String(m && m.uid || '').slice(0, 16), name: cleanName(m && m.name) })) : [],
  };
}

function sanitizeSetup(s) {
  if (!s || !Array.isArray(s.players) || !Array.isArray(s.teams)) return null;
  const color = (c, d) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : d);
  return {
    id: String(s.id || '').slice(0, 12),
    rev: Number(s.rev) || 0,
    format: s.format === '1v1' ? '1v1' : '2v2',
    level: 'medium',
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
    })),
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
    };
    const click = (id, fn) => $(id).addEventListener('click', () => {
      Sound.init();
      fn();
    });
    click('btn-local', () => Game.openLocalLobby());
    click('btn-online', () => Game.toOnline());
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
    click('btn-resume', () => Game.resume());
    click('btn-restart', () => Game.start());
    click('btn-quit', () => Game.backToLobby());
    click('btn-res-main', () => {
      if (Game.mode !== 'guest') Game.start();
    });
    click('btn-res-second', () => {
      if (Game.mode === 'guest') Game.toHome();
      else Game.backToLobby();
    });
    click('btn-res-third', () => Game.toHome());
    this.el.pauseBtn.addEventListener('click', () => (Game.state === 'paused' ? Game.resume() : Game.pause()));
    this.el.muteBtn.addEventListener('click', () => {
      Sound.init();
      this.setMuted(!Sound.muted);
    });
    this.el.nick.value = cleanName(store.get(STORE_NAME, ''));
    this.setMuted(store.get(STORE_MUTE, false) === true);
    this.renderHelp();
    this.orient();
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
    this.el.help.innerHTML = Touch.enabled
      ? '<p>Levým palcem joystick: do stran běh, nahoru skok. Pravým palcem kop.</p>'
      : `<p>${k('A')}${k('D')} nebo ${k('←')}${k('→')} běh · ${k('W')} nebo ${k('↑')} skok · ${k('mezerník')} nebo ${k('↓')} kop</p>`
        + `<p class="dim">Dva hráči u jednoho počítače: hráč 1 ${k('W')}${k('A')}${k('S')}${k('D')} a ${k('mezerník')}, hráč 2 šipky · ${k('Esc')} pauza</p>`;
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
    for (const key of ['home', 'online', 'lobby', 'pause', 'result']) this.el[key].hidden = name !== key;
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
    const win = a > b ? 0 : 1;
    const T = m.teams[win];
    // můj tým: kde hraje člověk z tohoto zařízení (když jsou všichni v jednom týmu)
    const mine = Game.mode === 'local' ? ['p1', 'p2'] : [Game.mode === 'host' ? 'host' : Online.uid];
    const myTeams = new Set(setup.players.filter((sp) => mine.includes(sp.ctrl)).map((sp) => sp.team));
    let title, sub;
    const winners = setup.format === '1v1' ? charById(setup.players.find((sp) => sp.team === win).char) : null;
    const verb = winners ? (winners.girl ? 'Vyhrála' : 'Vyhrál') : T.girls ? 'Vyhrály' : 'Vyhráli';
    const winnerName = winners ? winners.name : T.short;
    if (myTeams.size === 1) {
      title = myTeams.has(win) ? 'Výhra!' : 'Prohra';
      sub = `${verb} ${winnerName}`;
    } else {
      title = `${verb} ${winnerName}`;
      sub = `${m.teams[0].short} ${a} : ${b} ${m.teams[1].short}`;
    }
    this.el.resKicker.textContent = Game.golden ? 'Rozhodl zlatý gól' : 'Konec zápasu';
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
    this.show('result');
  },

  orient() {
    const portrait = window.innerHeight > window.innerWidth;
    this.el.rotate.hidden = !(Touch.enabled && portrait);
  },
};

/* ---------------- start ---------------- */

function boot() {
  const canvas = document.getElementById('game');
  Renderer.init(canvas);
  Touch.init(document.getElementById('touch'));
  Touch.onEnable = () => {
    UI.renderHelp();
    UI.orient();
    if (Game.inMatch()) {
      Touch.build(Game.mode !== 'guest' && Game.localHumans(Game.setup) >= 2);
      Touch.show(true);
    }
  };
  LobbyUI.init();
  UI.init();
  Game.init();

  window.addEventListener('resize', () => {
    Renderer.resize();
    UI.orient();
    if (Game.screen === 'lobby') Game.renderLobby();
  });
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load(`40px ${FONT_D}`),
      document.fonts.load(`800 24px ${FONT_U}`),
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
  const frame = (now) => {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    Game.update(dt);
    Renderer.draw(Game);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  window.hlavouni = { Game, Match, Renderer, Input, Online, Net };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
