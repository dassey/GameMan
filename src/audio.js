export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  tone(f, dur, type = 'square', vol = 0.2, slide = 1, delay = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  noise(dur, vol = 0.2, delay = 0, filterFreq = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    let node = src;
    if (filterFreq) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filterFreq;
      node = src.connect(f);
    }
    node.connect(g).connect(this.master);
    src.start(t0);
  }

  grab() {
    this.tone(600, 0.08, 'square', 0.15, 2);
    this.tone(900, 0.1, 'square', 0.12, 1.5, 0.06);
  }

  shoot() {
    this.noise(0.15, 0.2, 0, 3000);
    this.tone(320, 0.14, 'sawtooth', 0.1, 0.4);
  }

  hit() {
    this.noise(0.08, 0.3);
    this.tone(1800, 0.1, 'triangle', 0.2, 0.5);
    this.tone(120, 0.15, 'square', 0.2, 0.5);
  }

  pop() {
    this.tone(180, 0.18, 'square', 0.22, 4);
  }

  chop() {
    this.noise(0.06, 0.25, 0, 1200);
    this.tone(90, 0.1, 'square', 0.15, 0.6);
  }

  hurt() {
    this.tone(160, 0.25, 'sawtooth', 0.2, 0.5);
  }

  spray() {
    this.noise(0.7, 0.25, 0, 6000);
  }

  melt() {
    this.tone(500, 0.35, 'sine', 0.15, 0.2);
  }

  levelup() {
    [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.15, 'square', 0.15, 1, i * 0.1));
  }

  win() {
    [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.2, 'square', 0.15, 1, i * 0.15));
  }

  fire() {
    this.noise(2.6, 0.3, 0, 400);
    this.tone(60, 2.6, 'sawtooth', 0.15, 0.5);
  }

  scream() {
    this.tone(900, 1.2, 'sawtooth', 0.35, 1.8);
    this.tone(1300, 1.2, 'square', 0.2, 0.5);
    this.noise(1.1, 0.3, 0, 5000);
  }
}
