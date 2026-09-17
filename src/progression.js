const KEY = 'agent-pixel-save-v1';

export class Progression {
  constructor() {
    this.score = 0; this.xp = 0; this.level = 1; this.kills = 0; this.sparks = 0;
    this.best = 0; this.wins = 0;
    this.listeners = {};
    this.load();
  }

  on(evt, fn) { (this.listeners[evt] ||= []).push(fn); }
  emit(evt, data) { (this.listeners[evt] || []).forEach((f) => f(data)); }

  xpToNext(level = this.level) { return Math.floor(80 * Math.pow(level, 1.4)); }
  get maxHP() { return 100 + (this.level - 1) * 15; }
  get damage() { return 10 + (this.level - 1) * 3; }
  get speed() { return Math.min(7, 4.4 + (this.level - 1) * 0.15); }
  get difficulty() { return 1 + (this.level - 1) * 0.12 + this.wins * 0.5; }

  addScore(n) { this.score += n; if (this.score > this.best) this.best = this.score; this.emit('score', n); }

  addXP(n) {
    this.xp += n;
    let leveled = false;
    while (this.xp >= this.xpToNext()) { this.xp -= this.xpToNext(); this.level++; leveled = true; }
    if (leveled) this.emit('levelup', this.level);
    this.emit('xp', n);
  }

  save(extra = {}) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        score: this.score, xp: this.xp, level: this.level, kills: this.kills, sparks: this.sparks,
        best: this.best, wins: this.wins, ...extra,
      }));
    } catch (e) { }
  }

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!d) return;
      Object.assign(this, { score: d.score || 0, xp: d.xp || 0, level: d.level || 1, kills: d.kills || 0,
        sparks: d.sparks || 0, best: d.best || 0, wins: d.wins || 0 });
      this.saved = d;
    } catch (e) { }
  }

  reset() {
    this.score = 0; this.xp = 0; this.level = 1; this.kills = 0; this.sparks = 0; this.wins = 0;
    this.saved = null;
    try { localStorage.removeItem(KEY); } catch (e) { }
  }
}
