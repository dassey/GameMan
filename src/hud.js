const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.el = {
      saladwrap: $('saladwrap'), saladbar: $('saladbar'), hpbar: $('hpbar'), level: $('level'), xpbar: $('xpbar'),
      left: $('left'), fruit: $('fruit'), topping: $('topping'), msg: $('msg'), submsg: $('submsg'), boost: $('boost'), ketchup: $('ketchup'),
    };
    this.msgT = 0;
  }

  update(s, dt) {
    const e = this.el;
    e.saladwrap.style.display = s.salad ? '' : 'none';
    if (s.salad) e.saladbar.style.width = `${(s.salad.hp / s.salad.maxHp) * 100}%`;
    e.hpbar.style.width = `${(s.hp / s.maxHp) * 100}%`;
    e.level.textContent = `LV ${s.level}`;
    e.xpbar.style.width = `${(s.xp / s.xpToNext) * 100}%`;
    e.left.textContent = s.utensilsLeft === null ? '' : `UTENSILS LEFT: ${s.utensilsLeft}`;
    e.fruit.textContent = s.fruitLeft > 0 ? `FRUIT LEFT: ${s.fruitLeft}` : '';
    e.topping.textContent = s.held ? `HOLDING ${s.held.toUpperCase()}  (press E)` : '';
    e.boost.textContent = s.boost > 0 ? `CROUTON SPEED ${Math.ceil(s.boost)}` : '';
    e.ketchup.textContent = s.ketchup ? 'KETCHUP PACKET  (press Q)' : '';
    this.msgT -= dt;
    if (this.msgT <= 0) {
      e.msg.style.opacity = 0;
      e.submsg.style.opacity = 0;
    }
  }

  message(text, sub = '', secs = 2.5) {
    this.el.msg.textContent = text;
    this.el.submsg.textContent = sub;
    this.el.msg.style.opacity = 1;
    this.el.submsg.style.opacity = 1;
    this.msgT = secs;
  }
}
