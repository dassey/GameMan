export class Grain {
  constructor(canvas) {
    this.w = 160;
    this.h = 90;
    canvas.width = this.w;
    canvas.height = this.h;
    this.ctx = canvas.getContext('2d');
    this.img = this.ctx.createImageData(this.w, this.h);
    this.frame = 0;
  }

  update() {
    this.frame++;
    if (this.frame % 2) return;
    const d = this.img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = 70 + Math.random() * 130;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
    this.ctx.putImageData(this.img, 0, 0);
  }
}
