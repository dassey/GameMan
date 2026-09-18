export class Progression {
  constructor() {
    this.level = 1;
    this.xp = 0;
  }

  get xpToNext() {
    return Math.floor(60 * Math.pow(this.level, 1.3));
  }

  get speedMul() {
    return 1 + (this.level - 1) * 0.06;
  }

  get rangeBonus() {
    return (this.level - 1) * 0.8;
  }

  addXP(n) {
    this.xp += n;
    let ups = 0;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      ups++;
    }
    return ups;
  }
}
