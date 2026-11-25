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
