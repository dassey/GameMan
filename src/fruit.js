import * as THREE from 'three';
import { box, ball, cyl, eyes } from './art.js';
import { mulberry32 } from './noise.js';

export function fruitMesh(kind) {
  const g = new THREE.Group();
  if (kind === 'banana') {
    for (let i = -1; i <= 1; i++) {
      const s = box(0.55, 0.5, 0.7, '#f2d43c');
      s.position.set(i * 0.55, 0.45 + Math.abs(i) * 0.28, 0);
      s.rotation.z = -i * 0.55;
      g.add(s);
    }
    const tip = box(0.2, 0.25, 0.3, '#5a3a1a');
    tip.position.set(-0.95, 1.0, 0);
    g.add(tip);
  } else if (kind === 'mango') {
    const b = ball(0.7, '#f08a3a');
    b.scale.set(1, 0.8, 1.25);
    b.position.y = 0.6;
    g.add(b);
    const stem = box(0.14, 0.4, 0.14, '#3a7a2a');
    stem.position.y = 1.2;
    g.add(stem);
  } else {
    const b = ball(0.65, '#f5931e');
    b.position.y = 0.65;
    g.add(b);
    const leaf = box(0.45, 0.1, 0.28, '#3a7a2a');
    leaf.position.set(0.18, 1.3, 0);
    leaf.rotation.z = 0.3;
    g.add(leaf);
  }
  return g;
}

export class Fruits {
  constructor(scene, room, perKind = 4) {
    this.scene = scene;
    this.items = [];
    this.t = 0;
    const rnd = mulberry32(77);
    for (const kind of ['banana', 'mango', 'orange']) {
      for (let i = 0; i < perKind; i++) {
        const p = room.freeSpot(1.2, 4, rnd, { x: 0, z: 12 }, 6);
        const g = fruitMesh(kind);
        g.position.copy(p);
        scene.add(g);
        this.items.push({ kind, group: g, pos: p, phase: rnd() * 6.28 });
      }
    }
    this.total = this.items.length;
  }

  get remaining() {
    return this.items.length;
  }

  update(dt) {
    this.t += dt;
    for (const it of this.items) {
      if (it.carried) continue;
      it.group.position.y = 0.15 + Math.sin(this.t * 3 + it.phase) * 0.15;
      it.group.rotation.y += dt * 1.2;
    }
  }

  collect(pos, r) {
    const got = [];
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (!it.carried && Math.hypot(pos.x - it.pos.x, pos.z - it.pos.z) < r + 1.0) {
        this.scene.remove(it.group);
        got.push(it.kind);
        this.items.splice(i, 1);
      }
    }
    return got;
  }

  findAt(pos, r) {
    for (const it of this.items) {
      if (!it.carried && Math.hypot(pos.x - it.pos.x, pos.z - it.pos.z) < r + 1.0) return it;
    }
    return null;
  }

  remove(it) {
    const i = this.items.indexOf(it);
    if (i < 0) return null;
    this.items.splice(i, 1);
    this.scene.remove(it.group);
    return it.kind;
  }
}

export class Salad {
  constructor(scene, pos) {
    this.pos = pos.clone();
    this.radius = 4.6;
    this.maxHp = 100;
    this.hp = 100;
    this.ranchT = 0;
    this.shake = 0;
    this.t = 0;
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    const bowl = cyl(4.6, 3.2, 2.6, '#ded6c4', 14);
    bowl.position.y = 1.3;
    this.group.add(bowl);
    eyes(this.group, 1.6, 4.55, 0.9, 0.4);
    const smile = box(1.6, 0.14, 0.12, '#14121f');
    smile.position.set(0, 0.9, 4.55);
    this.group.add(smile);
    this.chunks = [];
    const rnd = mulberry32(21);
    const colors = ['#f2d43c', '#f08a3a', '#f5931e', '#7ac043', '#e04a3a', '#f2d43c'];
    for (let i = 0; i < 20; i++) {
      const a = rnd() * 6.283, d = rnd() * 3.2;
      const c = box(0.7 + rnd() * 0.8, 0.5 + rnd() * 0.6, 0.7 + rnd() * 0.8, colors[i % colors.length], { seed: 2 + (i % 4) });
      c.position.set(Math.cos(a) * d, 2.7 + rnd() * 1.4, Math.sin(a) * d);
      c.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      this.group.add(c);
      this.chunks.push(c);
    }
    this.ring = cyl(this.ranchRadius, this.ranchRadius, 0.25, '#f4f1e6', 16);
    this.ring.position.y = 0.12;
    this.ring.visible = false;
    this.group.add(this.ring);
    this.bubbles = [];
    for (let i = 0; i < 12; i++) {
      const b = ball(0.35, '#ffffff');
      const a = (i / 12) * 6.283;
      b.position.set(Math.cos(a) * (this.ranchRadius - 1), 0.4, Math.sin(a) * (this.ranchRadius - 1));
      b.visible = false;
      this.group.add(b);
      this.bubbles.push(b);
    }
    scene.add(this.group);
  }

  get dead() {
    return this.hp <= 0;
  }

  get ranchActive() {
    return this.ranchT > 0;
  }

  get ranchRadius() {
    return this.radius + 2.6;
  }

  activateRanch(secs) {
    this.ranchT = secs;
    this.ring.visible = true;
    for (const b of this.bubbles) b.visible = true;
  }

  damage(n) {
    this.hp = Math.max(0, this.hp - n);
    this.shake = 0.4;
    const show = Math.ceil(this.chunks.length * (this.hp / this.maxHp));
    this.chunks.forEach((c, i) => { c.visible = i < show; });
  }

  update(dt) {
    this.t += dt;
    if (this.ranchT > 0) {
      this.ranchT -= dt;
      this.bubbles.forEach((b, i) => {
        b.position.y = 0.4 + Math.abs(Math.sin(this.t * 6 + i)) * 0.8;
      });
      if (this.ranchT <= 0) {
        this.ring.visible = false;
        for (const b of this.bubbles) b.visible = false;
      }
    }
    if (this.shake > 0) {
      this.shake -= dt;
      this.group.position.set(this.pos.x + (Math.random() - 0.5) * 0.5, 0, this.pos.z + (Math.random() - 0.5) * 0.5);
    } else {
      this.group.position.copy(this.pos);
    }
  }
}
