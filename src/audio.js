export class Audio {
  constructor() { this.ctx = null; this.muted = false; this.musicOn = true; }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.35; this.master.connect(this.ctx.destination);
      this.startMusic();
    } catch (e) { console.warn('audio unavailable', e); }
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  tone(freq, dur, type = 'square', vol = 0.3, slide = 0, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.25) {
    if (!this.ctx || this.muted) return;
    const n = this.ctx.sampleRate * dur, buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
    s.buffer = buf; g.gain.value = vol; s.connect(g); g.connect(this.master); s.start();
  }

  pickup() { this.tone(880, 0.08, 'square', 0.2); this.tone(1320, 0.12, 'square', 0.2, 0, 0.07); }
  tie() { [660, 880, 1100, 1320].forEach((f, i) => this.tone(f, 0.12, 'square', 0.22, 0, i * 0.08)); }
  punch() { this.noise(0.08, 0.3); this.tone(140, 0.1, 'square', 0.2, -80); }
  hit() { this.tone(220, 0.12, 'sawtooth', 0.25, -120); this.noise(0.05, 0.15); }
  kill() { this.noise(0.25, 0.35); [200, 150, 100].forEach((f, i) => this.tone(f, 0.15, 'square', 0.25, -40, i * 0.05)); }
  hurt() { this.tone(300, 0.25, 'sawtooth', 0.3, -200); }
  jump() { this.tone(300, 0.15, 'square', 0.15, 300); }
  levelup() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.25, 'square', 0.25, 0, i * 0.09)); }
  win() { [523, 659, 784, 1046, 784, 1046, 1318, 1568].forEach((f, i) => this.tone(f, 0.3, 'square', 0.25, 0, i * 0.12)); }
  die() { [400, 300, 200, 120].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.25, -50, i * 0.2)); }

  startMusic() {
    const bass = [110, 110, 131, 110, 98, 98, 131, 147];
    const lead = [0, 440, 0, 523, 0, 440, 392, 0, 0, 330, 0, 392, 440, 0, 523, 0];
    let step = 0, next = this.ctx.currentTime + 0.1;
    const spb = 0.19;
    const tick = () => {
      if (!this.ctx) return;
      while (next < this.ctx.currentTime + 0.3) {
        if (this.musicOn && !this.muted) {
          const when = next - this.ctx.currentTime;
          if (step % 2 === 0) this.tone(bass[(step / 2) % bass.length], 0.17, 'triangle', 0.16, 0, when);
          const l = lead[step % lead.length];
          if (l) this.tone(l, 0.12, 'square', 0.05, 0, when);
          if (step % 4 === 0) this.noise(0.03, 0.05);
        }
        next += spb; step++;
      }
      setTimeout(tick, 100);
    };
    tick();
  }
}
