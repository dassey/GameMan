import * as THREE from 'three';
import { box, ball, cyl, eyes } from './art.js';

const tmp = new THREE.Vector3();

function sirLemonMesh() {
  const g = new THREE.Group();
  const body = ball(1.9, '#f3e03a');
  body.scale.set(1.25, 1.0, 1.0);
  body.position.y = 2.6;
  g.add(body);
  for (const s of [-1, 1]) {
    const tip = cyl(0.05, 0.55, 0.8, '#f3e03a', 6);
    tip.rotation.z = -s * Math.PI / 2;
    tip.position.set(s * 2.6, 2.6, 0);
    g.add(tip);
    const brow = box(0.75, 0.15, 0.1, '#14121f');
    brow.position.set(s * 0.6, 3.5, 1.72);
    brow.rotation.z = -s * 0.4;
    g.add(brow);
    const stache = box(0.6, 0.2, 0.1, '#14121f');
    stache.position.set(s * 0.32, 2.35, 1.88);
    stache.rotation.z = s * 0.35;
    g.add(stache);
    const leg = box(0.35, 0.9, 0.35, '#14121f');
    leg.position.set(s * 0.6, 0.45, 0);
    g.add(leg);
  }
  eyes(g, 2.95, 1.82, 0.6, 0.3);
  const mouth = box(0.9, 0.16, 0.1, '#14121f');
  mouth.position.set(0, 2.0, 1.86);
  g.add(mouth);
  const monocle = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.06, 6, 14), new THREE.MeshBasicMaterial({ color: 0xd4a83a }));
  monocle.position.set(0.6, 2.95, 1.92);
  g.add(monocle);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.4, 12), new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.35 }));
  lens.position.set(0.6, 2.95, 1.9);
  g.add(lens);
  const chainPts = [new THREE.Vector3(1.04, 2.95, 1.9), new THREE.Vector3(1.5, 2.2, 1.6), new THREE.Vector3(1.7, 1.6, 1.2)];
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(chainPts), new THREE.LineBasicMaterial({ color: 0xd4a83a })));
  const brim = cyl(1.55, 1.55, 0.18, '#14121f', 12);
  brim.position.y = 4.45;
  const crown = cyl(1.0, 1.05, 1.8, '#1c1a2a', 12);
  crown.position.y = 5.4;
  const band = cyl(1.08, 1.08, 0.32, '#c0313a', 12);
  band.position.y = 4.72;
  g.add(brim, crown, band);
  const armL = box(0.3, 1.2, 0.3, '#f3e03a');
  armL.position.set(-2.2, 2.0, 0.3);
  g.add(armL);
  const armPivot = new THREE.Group();
  armPivot.position.set(2.2, 2.7, 0.3);
  const armR = box(0.3, 1.2, 0.3, '#f3e03a');
  armR.position.y = -0.5;
  const cane = cyl(0.09, 0.09, 3.0, '#3a2418', 6);
  cane.position.set(0, -0.2, 1.3);
  cane.rotation.x = Math.PI / 2;
  const knob = ball(0.22, '#d4a83a');
  knob.position.set(0, -0.2, 2.8);
  armPivot.add(armR, cane, knob);
  g.add(armPivot);
  g.userData.arm = armPivot;
  return g;
}

export class SirLemon {
  constructor(scene, room, particles, audio) {
    this.room = room;
    this.particles = particles;
    this.audio = audio;
    this.group = sirLemonMesh();
    this.group.visible = false;
    scene.add(this.group);
    this.pos = new THREE.Vector3();
    this.active = false;
    this.target = null;
    this.mode = null;
    this.state = 'idle';
    this.hits = 0;
    this.timer = 0;
    this.t = 0;
  }

  summon(target, mode) {
    if (this.active) return false;
    this.active = true;
    this.target = target;
    this.mode = mode;
    this.hits = 0;
    this.timer = 0;
    this.state = 'come';
    this.pos.copy(this.room.spawnPoint());
    this.group.visible = true;
    this.group.position.copy(this.pos);
    this.particles.burst(tmp.set(this.pos.x, 2.5, this.pos.z), 30, 0xf3e03a, 8, 1);
    return true;
  }

  leave() {
    if (!this.active) return;
    this.particles.burst(tmp.set(this.pos.x, 2.5, this.pos.z), 45, 0xf3e03a, 10, 1.1);
    this.group.visible = false;
    this.active = false;
    this.target = null;
    this.state = 'idle';
  }

  update(dt, utensils) {
    if (!this.active) return null;
    this.t += dt;
    const out = { xp: 0, playerBonk: false };
    if (this.mode === 'utensil' && (!utensils || utensils.alive.indexOf(this.target) < 0)) {
      this.leave();
      return out;
    }
    const tp = this.target.pos;
    tmp.set(tp.x - this.pos.x, 0, tp.z - this.pos.z);
    const d = tmp.length();
    const reach = 2.8 + (this.target.radius || 0.6);
    if (d > 0.01) this.group.rotation.y = Math.atan2(tmp.x, tmp.z);
    let hop = 0;
    const arm = this.group.userData.arm;
    if (this.state === 'come') {
      if (d > reach) {
        this.pos.addScaledVector(tmp.normalize(), Math.min(13 * dt, d - reach + 0.05));
        hop = Math.abs(Math.sin(this.t * 7)) * 3.2;
      } else {
        this.state = 'attack';
        this.timer = 0.25;
      }
      arm.rotation.x = -0.6;
    } else {
      if (d > reach + 1.5) this.state = 'come';
      this.timer -= dt;
      const period = this.mode === 'player' ? 0.8 : 0.45;
      const phase = 1 - Math.max(0, this.timer) / period;
      arm.rotation.x = -2.2 + Math.min(1, phase * 1.6) * 2.6;
      hop = Math.max(0, Math.sin(phase * Math.PI)) * 0.6;
      if (this.timer <= 0) {
        this.timer = period;
        this.hits++;
        this.audio.bonk();
        this.particles.burst(tmp.set(tp.x, 2.2, tp.z), 12, this.hits % 2 ? 0xd0301a : 0xf3e03a, 7, 0.6);
        if (this.mode === 'utensil') {
          this.target.group.rotation.z = (Math.random() - 0.5) * 0.7;
          if (this.hits >= 4) {
            out.xp = utensils.kill(this.target, 0xd0301a);
            this.leave();
            return out;
          }
        } else {
          out.playerBonk = true;
        }
      }
    }
    this.group.position.set(this.pos.x, hop, this.pos.z);
    return out;
  }
}

export class Ketchup {
  constructor(scene, particles) {
    this.particles = particles;
    this.active = false;
    this.pos = new THREE.Vector3();
    this.dir = new THREE.Vector3();
    this.travelled = 0;
    this.blob = ball(0.35, '#d0301a');
    this.blob.visible = false;
    scene.add(this.blob);
  }

  fire(origin, dir) {
    this.active = true;
    this.pos.copy(origin);
    this.dir.copy(dir).normalize();
    this.travelled = 0;
    this.blob.visible = true;
  }

  update(dt, utensils, salad) {
    if (!this.active) return null;
    const step = 30 * dt;
    this.pos.addScaledVector(this.dir, step);
    this.travelled += step;
    this.blob.position.copy(this.pos);
    for (let i = 0; i < 3; i++) {
      this.particles.spawn(this.pos.x, this.pos.y, this.pos.z, (Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3, 0xd0301a, 0.5, 14);
    }
    let result = null;
    const u = utensils ? utensils.hitTest(this.pos, 1.0) : null;
    if (u) result = { hit: 'utensil', u };
    else if (salad && Math.hypot(this.pos.x - salad.pos.x, this.pos.z - salad.pos.z) < salad.radius + 0.2) result = { hit: 'salad' };
    else if (this.travelled > 16 || this.pos.y < 0.1) result = { hit: 'miss' };
    if (result) {
      this.active = false;
      this.blob.visible = false;
      this.particles.burst(this.pos, 30, 0xd0301a, 7, 0.9);
    }
    return result;
  }
}

export function ketchupGlob(size = 0.9) {
  const glob = ball(size, '#d0301a');
  glob.scale.y = 0.35;
  glob.position.y = 0.3;
  return glob;
}
