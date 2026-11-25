'use strict';
/* Herní smyčka, průběh zápasu a propojení s menu. */

const STORE_CFG = 'hlavouni.nastaveni';
const STORE_MUTE = 'hlavouni.ztlumeno';

function loadCfg() {
  const o = { ...DEFAULT_CFG };
  try {
    const c = JSON.parse(localStorage.getItem(STORE_CFG) || '{}');
    if (['1v1', '2v2'].includes(c.format)) o.format = c.format;
    if (['1p', 'pvp', 'coop'].includes(c.players)) o.players = c.players;
    if (AI_LEVELS[c.level]) o.level = c.level;
    if ([1, 2, 3].includes(c.minutes)) o.minutes = c.minutes;
  } catch (e) { /* bez uložených dat */ }
  if (o.format === '1v1' && o.players === 'coop') o.players = '1p';
  return o;
}
function saveCfg(c) {
  try { localStorage.setItem(STORE_CFG, JSON.stringify(c)); } catch (e) { /* nevadí */ }
}
function loadMuted() {
  try { return localStorage.getItem(STORE_MUTE) === '1'; } catch (e) { return false; }
}
function saveMuted(v) {
  try { localStorage.setItem(STORE_MUTE, v ? '1' : '0'); } catch (e) { /* nevadí */ }
}

const Game = {
  state: 'menu', // menu | countdown | kickoff | play | goal | over | paused
  paused: null,
  stateT: 0,
  acc: 0,
  cfg: { ...DEFAULT_CFG },
  match: null,
  timeLeft: 0,
  golden: false,
  msg: null,
  countShown: 0,
  lastTick: -1,
  resultShown: false,
  demoGoalAt: 0,
  scorePop: [0, 0],

  init() {
    this.cfg = loadCfg();
    this.toMenu();
  },

  inMatch() {
    return ['countdown', 'kickoff', 'play', 'goal'].includes(this.state);
  },

  newDemo() {
    this.match = new Match({ format: this.cfg.format, players: 'demo', level: 'hard' }, (t, d) => this.onEvent(t, d));
    this.stateT = 0;
    this.acc = 0;
  },

  toMenu() {
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
    UI.show('menu');
  },

  start() {
    Sound.init();
    Sound.quiet = false;
    const c = this.cfg;
    Input.shared = c.players === '1p';
    Input.clear();
    this.match = new Match({ ...c }, (t, d) => this.onEvent(t, d));
    this.timeLeft = c.minutes * 60;
    this.golden = false;
    this.lastTick = -1;
    this.countShown = 0;
    this.scorePop = [0, 0];
    this.msg = null;
    this.state = 'countdown';
    this.stateT = 0;
    this.acc = 0;
    this.paused = null;
    Effects.clear();
    UI.show(null);
    Touch.build(c.players !== '1p');
    Touch.show(true);
    Sound.crowdLevel(0.05);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  },

  pause() {
    if (!this.inMatch()) return;
    this.paused = this.state;
    this.state = 'paused';
    Input.clear();
    Touch.reset();
    UI.show('pause');
    Sound.crowdLevel(0);
  },

  resume() {
    if (this.state !== 'paused') return;
    this.state = this.paused;
    this.paused = null;
    UI.show(null);
    Sound.init();
    Sound.crowdLevel(0.05);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  },

  showMsg(text, sub, dur, color, size = 120) {
    this.msg = { text, sub, dur, color, size, t: 0 };
  },

  onEvent(type, d) {
    const live = this.state !== 'menu';
    switch (type) {
      case 'kick':
        Effects.kick(d.x, d.y, d.dir);
        if (live) {
          Sound.kick(d.power);
          Effects.shake(3);
        }
        break;
      case 'head':
        Effects.puff(d.x, d.y);
        if (live) Sound.head(Math.min(1, d.impact / 700));
        break;
      case 'bounce':
        if (d.impact > 520) Effects.dust(d.x);
        if (live) Sound.bounce(Math.min(1, d.impact / 900));
        break;
      case 'post':
        Effects.spark(d.x, d.y);
        if (live) {
          Sound.post();
          Effects.shake(5);
        }
        break;
      case 'swing':
        if (live) Sound.swing();
        break;
      case 'jump':
        if (live && d.human) Sound.jump();
        break;
      case 'goal':
        this.onGoal(d);
        break;
    }
  },

  onGoal(d) {
    if (this.state === 'menu') {
      this.demoGoalAt = this.stateT;
      Effects.confetti(d.team);
      return;
    }
    this.state = 'goal';
    this.stateT = 0;
    const s = d.scorer;
    let sub = '';
    if (s) {
      const who = s.human ? `${s.look.name} (${s.label})` : s.look.name;
      sub = d.own ? `Vlastní gól: ${who}` : `Skóruje ${who}`;
    }
    this.showMsg('GÓL!', sub, 2.5, TEAMS[d.team].color, 150);
    this.scorePop[d.team] = performance.now();
    Sound.goal();
    Sound.whistle('short');
    Effects.confetti(d.team);
    Effects.shake(16);
  },

  timeUp() {
    const m = this.match;
    if (m.score[0] !== m.score[1]) {
      this.finish();
      return;
    }
    this.golden = true;
    this.showMsg('ZLATÝ GÓL', 'Kdo dá další gól, vyhrává', 2.4, '#ffc93c', 100);
    Sound.whistle('long');
  },

  finish() {
    const m = this.match;
    m.locked = true;
    m.celebrate = m.score[0] > m.score[1] ? 0 : 1;
    this.state = 'over';
    this.stateT = 0;
    this.resultShown = false;
    this.showMsg('KONEC ZÁPASU', '', 1.6, '#f3f6ef', 90);
    Sound.whistle('final');
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
    if (this.state === 'paused') return;
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
          Sound.beep(false);
        }
        if (this.stateT >= 2.25) {
          this.state = 'play';
          this.stateT = 0;
          m.release();
          this.showMsg('HRAJ!', '', 0.9, '#ffc93c', 130);
          Sound.beep(true);
          Sound.whistle('short');
        }
        this.physics(dt, 1);
        break;
      }

      case 'kickoff':
        if (this.stateT >= 1) {
          this.state = 'play';
          this.stateT = 0;
          m.release();
          Sound.whistle('short');
        }
        this.physics(dt, 1);
        break;

      case 'play': {
        if (!this.golden) {
          this.timeLeft -= dt;
          const sec = Math.ceil(this.timeLeft);
          if (sec <= 5 && sec >= 1 && sec !== this.lastTick) {
            this.lastTick = sec;
            Sound.tick();
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
  },
};

/* ---------------- menu a panely ---------------- */

const UI = {
  el: {},

  init() {
    const $ = (id) => document.getElementById(id);
    this.el = {
      menu: $('menu'), pause: $('pause'), result: $('result'),
      pauseBtn: $('btn-pause'), muteBtn: $('btn-mute'), help: $('controls-help'),
      coop: $('opt-coop'), levelRow: $('row-level'), rotate: $('rotate'),
      resKicker: $('res-kicker'), resTitle: $('res-title'), resA: $('res-a'), resB: $('res-b'), resSub: $('res-sub'),
    };
    document.querySelectorAll('.seg').forEach((seg) => {
      seg.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-v]');
        if (!b) return;
        const key = seg.dataset.key;
        const v = key === 'minutes' ? Number(b.dataset.v) : b.dataset.v;
        if (Game.cfg[key] === v) return;
        Game.cfg[key] = v;
        if (Game.cfg.format === '1v1' && Game.cfg.players === 'coop') Game.cfg.players = '1p';
        saveCfg(Game.cfg);
        Sound.init();
        Sound.click();
        this.sync();
        if (key === 'format' && Game.state === 'menu') Game.newDemo();
      });
    });
    $('btn-play').addEventListener('click', () => Game.start());
    $('btn-resume').addEventListener('click', () => Game.resume());
    $('btn-restart').addEventListener('click', () => Game.start());
    $('btn-quit').addEventListener('click', () => Game.toMenu());
    $('btn-again').addEventListener('click', () => Game.start());
    $('btn-menu').addEventListener('click', () => Game.toMenu());
    this.el.pauseBtn.addEventListener('click', () => (Game.state === 'paused' ? Game.resume() : Game.pause()));
    this.el.muteBtn.addEventListener('click', () => {
      Sound.init();
      this.setMuted(!Sound.muted);
    });
    this.setMuted(loadMuted());
    this.sync();
    this.orient();
  },

  setMuted(v) {
    Sound.setMuted(v);
    saveMuted(v);
    this.el.muteBtn.classList.toggle('off', v);
    this.el.muteBtn.setAttribute('aria-label', v ? 'Zapnout zvuk' : 'Vypnout zvuk');
    this.el.muteBtn.setAttribute('aria-pressed', String(v));
  },

  sync() {
    const c = Game.cfg;
    document.querySelectorAll('.seg').forEach((seg) => {
      const key = seg.dataset.key;
      seg.querySelectorAll('button[data-v]').forEach((b) => {
        b.setAttribute('aria-pressed', String(String(c[key]) === b.dataset.v));
      });
    });
    this.el.coop.hidden = c.format === '1v1';
    this.el.levelRow.hidden = c.format === '1v1' && c.players === 'pvp';
    this.renderHelp();
  },

  renderHelp() {
    const c = Game.cfg;
    const k = (s) => `<kbd>${s}</kbd>`;
    let html;
    if (Touch.enabled) {
      html = c.players === '1p'
        ? '<p>Vlevo dole běháš, vpravo dole skáčeš a kopeš.</p>'
        : '<p>Hráč 1 má tlačítka vlevo dole, hráč 2 vpravo dole.</p>';
    } else if (c.players === '1p') {
      html = `<p>${k('A')}${k('D')} nebo ${k('←')}${k('→')} běh · ${k('W')} nebo ${k('↑')} skok · ${k('mezerník')} nebo ${k('↓')} kop</p>`;
    } else {
      const t2 = c.players === 'coop' ? 'modří' : 'červení';
      html = `<p><b class="t0">Hráč 1 · modří</b> ${k('A')}${k('D')} běh · ${k('W')} skok · ${k('mezerník')} kop</p>`
        + `<p><b class="${c.players === 'coop' ? 't0' : 't1'}">Hráč 2 · ${t2}</b> ${k('←')}${k('→')} běh · ${k('↑')} skok · ${k('↓')} kop</p>`;
    }
    if (!Touch.enabled) html += `<p class="dim">${k('Esc')} pauza</p>`;
    this.el.help.innerHTML = html;
  },

  show(name) {
    this.el.menu.hidden = name !== 'menu';
    this.el.pause.hidden = name !== 'pause';
    this.el.result.hidden = name !== 'result';
    this.el.pauseBtn.hidden = !Game.inMatch() && Game.state !== 'paused';
    const panel = name && this.el[name];
    if (panel) {
      const first = panel.querySelector('.btn-play');
      if (first && !Touch.enabled) first.focus({ preventScroll: true });
    }
  },

  showResult() {
    const m = Game.match, c = Game.cfg;
    const [a, b] = m.score;
    const win = a > b ? 0 : 1;
    let title;
    if (c.players === 'pvp') title = c.format === '1v1' ? `Vyhrál hráč ${win + 1}` : `Vyhráli ${TEAMS[win].short}`;
    else title = win === 0 ? 'Výhra!' : 'Prohra';
    this.el.resKicker.textContent = Game.golden ? 'Rozhodl zlatý gól' : 'Konec zápasu';
    this.el.resTitle.textContent = title;
    this.el.resTitle.className = `res-title t${win}`;
    this.el.resA.textContent = a;
    this.el.resB.textContent = b;
    const names = (team) => m.players.filter((p) => p.team === team).map((p) => (p.human ? `${p.look.name} (${p.label})` : p.look.name)).join(', ');
    this.el.resSub.textContent = `${TEAMS[0].short}: ${names(0)} · ${TEAMS[1].short}: ${names(1)}`;
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
      Touch.build(Game.cfg.players !== '1p');
      Touch.show(true);
    }
  };
  UI.init();
  Game.init();

  window.addEventListener('resize', () => {
    Renderer.resize();
    UI.orient();
  });
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load(`40px ${FONT_D}`),
      document.fonts.load(`800 24px ${FONT_U}`),
    ]).then(() => Renderer.buildBg()).catch(() => {});
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (Game.state === 'paused') Game.resume();
      else if (Game.inMatch()) Game.pause();
      else return;
      e.preventDefault();
      return;
    }
    if (Game.inMatch() && KEYMAP[e.code]) {
      e.preventDefault();
      Input.down(e.code, e.repeat);
    }
  });
  window.addEventListener('keyup', (e) => Input.up(e.code));
  window.addEventListener('blur', () => {
    Input.clear();
    Game.pause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) Game.pause();
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

  window.hlavouni = { Game, Match, Renderer, Input };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
