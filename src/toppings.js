import * as THREE from 'three';
import { box, cyl } from './art.js';

export function toppingMesh(kind) {
  const g = new THREE.Group();
  if (kind === 'ranch') {
    const bottle = cyl(0.45, 0.52, 1.3, '#f4f1e6', 8);
    bottle.position.y = 0.65;
    const neck = cyl(0.22, 0.3, 0.3, '#f4f1e6', 8);
    neck.position.y = 1.45;
    const cap = cyl(0.2, 0.26, 0.35, '#c0313a', 8);
    cap.position.y = 1.75;
    const label = box(0.6, 0.5, 0.06, '#3a7a2a');
    label.position.set(0, 0.6, 0.5);
    g.add(bottle, neck, cap, label);
  } else if (kind === 'ketchup') {
    const packet = box(1.2, 0.2, 1.6, '#d0301a');
    packet.position.y = 0.6;
    packet.rotation.x = -0.6;
    const label = box(0.7, 0.22, 0.6, '#f4f1e6');
    label.position.set(0, 0.62, 0.02);
    label.rotation.x = -0.6;
    g.add(packet, label);
  } else {
    const c = box(1.0, 0.8, 1.0, '#c89a5a', { seed: 5 });
    c.position.y = 0.5;
    c.rotation.y = 0.4;
    g.add(c);
  }
  return g;
}

export class Toppings {
  constructor(scene, room) {
    this.scene = scene;
    this.room = room;
    this.items = [];
    this.t = 5;
    this.time = 0;
    this.spawnItem('ketchup');
  }

  spawnItem(kind) {
    const p = this.room.freeSpot(1.2, 4, Math.random, { x: 0, z: 14 }, 8);
    const g = toppingMesh(kind);
    g.position.copy(p);
    this.scene.add(g);
    const it = { kind, group: g, pos: p };
    this.items.push(it);
    return it;
  }

  update(dt) {
    this.time += dt;
    this.t -= dt;
    if (this.t <= 0 && this.items.filter((it) => it.kind !== 'ketchup').length < 2) {
      this.spawnItem(Math.random() < 0.55 ? 'ranch' : 'crouton');
      this.t = 11;
    }
    for (const it of this.items) {
      if (it.carried) continue;
      it.group.position.y = 0.2 + Math.abs(Math.sin(this.time * 4)) * 0.3;
      it.group.rotation.y += dt * 1.5;
    }
  }

  pickup(pos, r) {
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (!it.carried && Math.hypot(pos.x - it.pos.x, pos.z - it.pos.z) < r + 1.0) {
        this.scene.remove(it.group);
        this.items.splice(i, 1);
        return it.kind;
      }
    }
    return null;
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
