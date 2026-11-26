'use strict';
/* Zvuky skládané přímo ve Web Audio – hra nepotřebuje žádné zvukové soubory. */

const Sound = {
  ctx: null,
  master: null,
  noise: null,
  crowd: null,
  muted: false,
  quiet: true,      // v menu (ukázkový zápas) jsou efekty ztlumené
  crowdTarget: 0,
  goalUntil: 0,

  init() {
    // iPhone: zvuky hry se smíchají s hudbou z jiných aplikací (Spotify hraje dál)
    try {
      if (navigator.audioSession && navigator.audioSession.type !== 'ambient') navigator.audioSession.type = 'ambient';
    } catch (e) { /* starší prohlížeč */ }
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch (e) {
      this.ctx = null;
      return;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(c.destination);

    const len = Math.floor(c.sampleRate * 2);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    // tichý šum tribun
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 650;
    bp.Q.value = 0.5;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2000;
    this.crowd = c.createGain();
    this.crowd.gain.value = 0;
    src.connect(bp);
    bp.connect(lp);
    lp.connect(this.crowd);
    this.crowd.connect(this.master);
    src.start();
  },

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.03);
  },

  live() {
    return !!this.ctx && !this.quiet && !this.muted;
  },

  _env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  },

  tone(type, f0, f1, dur, vol, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this._env(g, t, vol, 0.005, dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  hiss(dur, vol, type, freq, q = 1, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    this._env(g, t, vol, 0.004, dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.master);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
  },

  kick(power = 1) {
    if (!this.live()) return;
    this.tone('sine', 190, 55, 0.16, 0.8 * power);
    this.hiss(0.05, 0.35 * power, 'highpass', 2000);
  },

  head(v = 1) {
    if (!this.live()) return;
    this.tone('triangle', 420, 200, 0.1, 0.12 + 0.25 * v);
    this.hiss(0.04, 0.12 * v, 'bandpass', 1200, 2);
  },

  bounce(v = 1) {
    if (!this.live()) return;
    this.tone('sine', 130, 60, 0.09, 0.1 + 0.3 * v);
  },

  post() {
    if (!this.live()) return;
    this.tone('sine', 1180, 1150, 0.5, 0.22);
    this.tone('sine', 1870, 1820, 0.32, 0.1);
    this.hiss(0.03, 0.25, 'highpass', 3000);
  },

  swing() {
    if (!this.live()) return;
    this.hiss(0.1, 0.05, 'bandpass', 2600, 1.5);
  },

  jump() {
    if (!this.live()) return;
    this.tone('sine', 300, 520, 0.08, 0.05);
  },

  beep(high) {
    if (!this.live()) return;
    this.tone('square', high ? 1320 : 880, 0, high ? 0.22 : 0.12, 0.07);
  },

  tick() {
    if (!this.live()) return;
    this.tone('square', 1040, 0, 0.05, 0.05);
  },

  click() {
    if (!this.ctx || this.muted) return;
    this.tone('triangle', 900, 700, 0.05, 0.08);
  },

  whistle(kind = 'short') {
    if (!this.live()) return;
    const parts = kind === 'final' ? [[0, 0.16], [0.26, 0.16], [0.52, 0.75]]
      : kind === 'half' ? [[0, 0.2], [0.32, 0.6]]
        : kind === 'long' ? [[0, 0.6]] : [[0, 0.3]];
    for (const [at, dur] of parts) this._whistle(at, dur);
  },

  _whistle(delay, dur) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = 2750;
    const lfo = c.createOscillator();
    lfo.frequency.value = 34;
    const lg = c.createGain();
    lg.gain.value = 140;
    lfo.connect(lg);
    lg.connect(o.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
    g.gain.setValueAtTime(0.15, t + dur - 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.05);
    lfo.stop(t + dur + 0.05);
  },

  goal() {
    if (!this.live()) return;
    const c = this.ctx, t = c.currentTime, g = this.crowd.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0.5, t + 0.35);
    g.linearRampToValueAtTime(0.28, t + 1.8);
    g.linearRampToValueAtTime(Math.max(this.crowdTarget, 0.001), t + 3.4);
    this.goalUntil = t + 3.4;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone('square', f, f, 0.18, 0.045, 0.1 + i * 0.11));
  },

  fanfare() {
    if (!this.live()) return;
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone('triangle', f, f, i === 4 ? 0.7 : 0.16, 0.08, i * 0.13));
    [523.25, 659.25, 783.99].forEach((f) => this.tone('sine', f, f, 0.9, 0.05, 0.65));
  },

  superShot() {
    if (!this.live()) return;
    this.tone('sawtooth', 170, 55, 0.4, 0.16);
    this.tone('sine', 700, 1500, 0.25, 0.07);
    this.hiss(0.35, 0.3, 'lowpass', 1400);
  },

  knock() {
    if (!this.live()) return;
    this.tone('sine', 150, 48, 0.28, 0.5);
    this.hiss(0.14, 0.3, 'bandpass', 600, 1);
  },

  charged() {
    if (!this.live()) return;
    this.tone('triangle', 660, 1320, 0.16, 0.06);
    this.tone('triangle', 990, 1980, 0.16, 0.04, 0.08);
  },

  // dopad odstřeleného hráče
  thud() {
    if (!this.live()) return;
    this.tone('sine', 110, 40, 0.3, 0.55);
    this.hiss(0.12, 0.25, 'lowpass', 500);
  },

  // ohňostroj: sykot a praskání
  pyro() {
    if (!this.live()) return;
    this.hiss(1.1, 0.12, 'highpass', 3500);
    for (let i = 0; i < 14; i++) this.hiss(0.03, 0.18, 'bandpass', 2500 + Math.random() * 2500, 2, 0.15 + Math.random() * 1.1);
    this.tone('sine', 90, 50, 0.35, 0.3);
  },

  // JENDA PRIME: slavnostní akord a třpyt
  prime() {
    if (!this.live()) return;
    [392, 493.88, 587.33, 783.99].forEach((f, i) => this.tone('sawtooth', f, f, 0.5, 0.035, i * 0.05));
    [1568, 2093, 2637].forEach((f, i) => this.tone('sine', f, f * 1.02, 0.25, 0.04, 0.25 + i * 0.07));
    this.hiss(0.5, 0.08, 'highpass', 6000);
  },

  // basketbalový driblink
  dribble() {
    if (!this.live()) return;
    for (const at of [0, 0.16]) {
      this.tone('sine', 160, 70, 0.12, 0.45, at);
      this.hiss(0.04, 0.2, 'bandpass', 900, 2, at);
    }
  },

  // míč propadne košem + klakson jako v hale
  swish() {
    if (!this.live()) return;
    this.hiss(0.3, 0.25, 'bandpass', 3200, 0.8);
    this.tone('sawtooth', 220, 220, 0.5, 0.06, 0.12);
    this.tone('square', 277, 277, 0.5, 0.04, 0.12);
  },

  // jásot tribuny (gól, SKIPER)
  cheer() {
    if (!this.live()) return;
    this.hiss(1.2, 0.16, 'bandpass', 900, 0.6);
    this.hiss(0.9, 0.08, 'bandpass', 1900, 1, 0.05);
  },

  // obří hermelín dopadne do brány
  cheese() {
    if (!this.live()) return;
    this.tone('sine', 130, 45, 0.45, 0.6);
    this.hiss(0.25, 0.3, 'lowpass', 600);
    [523.25, 659.25, 783.99].forEach((f, i) => this.tone('triangle', f, f * 1.01, 0.14, 0.06, 0.18 + i * 0.09));
  },

  // brána zamrzne
  freeze() {
    if (!this.live()) return;
    this.hiss(0.8, 0.14, 'highpass', 5000);
    for (let i = 0; i < 10; i++) this.tone('sine', 1800 + Math.random() * 2400, 0, 0.12, 0.03, i * 0.05);
    this.tone('triangle', 1400, 400, 0.5, 0.05);
  },

  // led praskne
  crack() {
    if (!this.live()) return;
    for (let i = 0; i < 6; i++) this.hiss(0.05, 0.22, 'bandpass', 2500 + Math.random() * 3000, 3, i * 0.04);
  },

  // VO2max: nádech a rozběh
  vo2() {
    if (!this.live()) return;
    this.hiss(0.5, 0.1, 'bandpass', 700, 0.8);
    this.tone('sawtooth', 220, 880, 0.35, 0.05);
    this.tone('square', 440, 1320, 0.25, 0.03, 0.12);
  },

  // bublina s pokřikem
  blip() {
    if (!this.live()) return;
    this.tone('triangle', 620, 940, 0.07, 0.035);
  },

  // tleskání a buben v rytmu (bum bum, bum-bum-bum)
  chant() {
    if (!this.live()) return;
    const beats = [0, 0.32, 0.64, 0.8, 0.96];
    for (const at of beats) {
      this.tone('sine', 95, 55, 0.18, 0.28, at);
      for (let k = 0; k < 4; k++) this.hiss(0.05, 0.05, 'bandpass', 1300 + k * 220, 1.2, at + 0.01 + k * 0.012);
    }
  },

  // zklamané „úúú“ tribun (tyčka, těsně vedle)
  ooh() {
    if (!this.live()) return;
    const c = this.ctx, t = c.currentTime;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.connect(g);
    g.connect(this.master);
    for (let i = 0; i < 7; i++) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      const f = 170 + Math.random() * 120;
      o.frequency.setValueAtTime(f * 1.12, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.86, t + 1.2);
      o.connect(lp);
      o.start(t + Math.random() * 0.08);
      o.stop(t + 1.35);
    }
    this.hiss(1, 0.05, 'bandpass', 500, 0.8);
  },

  whoosh() {
    if (!this.live()) return;
    this.hiss(0.35, 0.08, 'bandpass', 900, 0.7);
    this.tone('sine', 220, 660, 0.3, 0.04);
  },

  crowdLevel(v) {
    if (!this.ctx || Math.abs(v - this.crowdTarget) < 0.005) return;
    this.crowdTarget = v;
    if (this.ctx.currentTime < this.goalUntil) return;
    this.crowd.gain.setTargetAtTime(v, this.ctx.currentTime, 0.5);
  },
};
