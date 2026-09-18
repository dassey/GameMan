import * as THREE from 'three';
import { box, ball, cyl, eyes, floorMark } from './art.js';

const tmp = new THREE.Vector3();
const STATS = { spoon: { xp: 30, radius: 1.2 }, fork: { xp: 40, radius: 1.0 }, knife: { xp: 20, radius: 0.9 } };

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function utensilMesh(kind) {
  const g = new THREE.Group();
  const head = new THREE.Group();
  if (kind === 'spoon') {
    const handle = cyl(0.3, 0.38, 3.4, '#b8bcc8', 6);
    handle.position.y = 1.7;
    const bowl = ball(1.15, '#c8ccd8');
    bowl.scale.set(1, 1.3, 0.55);
    head.add(bowl);
    eyes(head, 0.35, 0.68, 0.4, 0.26);
    const mouth = box(0.8, 0.16, 0.1, '#14121f');
    mouth.position.set(0, -0.45, 0.66);
    head.add(mouth);
    head.position.y = 4.4;
    g.add(handle, head);
  } else if (kind === 'fork') {
    const handle = box(0.55, 3.2, 0.28, '#b8bcc8');
    handle.position.y = 1.6;
    const base = box(1.6, 0.9, 0.3, '#c8ccd8');
    head.add(base);
    for (const x of [-0.55, 0, 0.55]) {
      const tine = box(0.26, 1.5, 0.22, '#c8ccd8');
      tine.position.set(x, 1.1, 0);
      head.add(tine);
    }
    eyes(head, 0.1, 0.18, 0.35, 0.22);
    head.position.y = 3.9;
    g.add(handle, head);
  } else {
    const handle = box(0.65, 1.7, 0.4, '#3a2418');
    handle.position.y = 0.85;
    const guard = box(0.95, 0.2, 0.45, '#8a8a95');
    guard.position.y = 1.75;
    const blade = box(0.95, 2.9, 0.12, '#d8dce6');
    blade.position.y = 3.25;
    const tip = box(0.95, 0.6, 0.12, '#d8dce6');
    tip.position.set(0.1, 4.85, 0);
    tip.rotation.z = 0.7;
    eyes(g, 3.4, 0.1, 0.28, 0.22);
    const frown = box(0.5, 0.12, 0.08, '#14121f');
    frown.position.set(0, 2.8, 0.1);
    g.add(handle, guard, blade, tip, frown, head);
  }
  g.userData.head = head;
  return g;
}

export class Utensils {
  constructor(scene, room, salad, player, particles, audio) {
    this.scene = scene;
    this.room = room;
    this.salad = salad;
    this.player = player;
    this.particles = particles;
    this.audio = audio;
    this.queue = shuffle([...Array(4).fill('spoon'), ...Array(3).fill('fork'), ...Array(10).fill('knife')]);
    this.alive = [];
    this.killed = 0;
    this.total = this.queue.length;
    this.spawnT = 1.5;
    this.maxAlive = 5;
    this.t = 0;
  }

  get remaining() {
    return this.total - this.killed;
  }

  spawn(kind, at) {
    const u = {
      kind, pos: at.clone(), group: utensilMesh(kind), radius: STATS[kind].radius, xp: STATS[kind].xp,
      state: 'walk', timer: 0, cd: 0, target: null, mark: null, bit: false, phase: Math.random() * 6.28,
    };
    u.group.position.copy(u.pos);
    this.scene.add(u.group);
    if (kind === 'spoon') {
      u.state = 'dig';
      u.group.visible = false;
      u.mark = floorMark(1.3);
      u.mark.position.set(u.pos.x, 0, u.pos.z);
      this.scene.add(u.mark);
      u.target = this.spoonTarget();
    }
    this.particles.burst(tmp.set(u.pos.x, 1.5, u.pos.z), 10, 0x8a8f9a, 5);
    this.alive.push(u);
    return u;
  }

  spoonTarget() {
    const a = Math.random() * 6.283, d = this.salad.radius + 1.8;
    return new THREE.Vector3(this.salad.pos.x + Math.cos(a) * d, 0, this.salad.pos.z + Math.sin(a) * d);
  }

  vulnerable(u) {
    return u.kind !== 'spoon' || u.state === 'up';
  }

  hitTest(point, r) {
    for (const u of this.alive) {
      if (!this.vulnerable(u)) continue;
      const dx = point.x - u.pos.x, dz = point.z - u.pos.z, rr = r + u.radius;
      if (dx * dx + dz * dz < rr * rr) return u;
    }
    return null;
  }

  kill(u, color = 0xd8dce6) {
    const i = this.alive.indexOf(u);
    if (i < 0) return 0;
    this.alive.splice(i, 1);
    this.scene.remove(u.group);
    if (u.mark) this.scene.remove(u.mark);
    this.particles.burst(tmp.set(u.pos.x, 2.2, u.pos.z), 22, color, 9);
    this.killed++;
    return u.xp;
  }

  moveToward(u, target, speed, dt) {
    tmp.set(target.x - u.pos.x, 0, target.z - u.pos.z);
    const d = tmp.length();
    if (d > 0.01) {
      tmp.normalize();
      if (u.slideT > 0) {
        u.slideT -= dt;
        tmp.set(-tmp.z * u.slideDir, 0, tmp.x * u.slideDir);
      }
      const ox = u.pos.x, oz = u.pos.z;
      const want = Math.min(speed * dt, d);
      u.pos.addScaledVector(tmp, want);
      this.room.resolve(u.pos, u.radius);
      const moved = Math.hypot(u.pos.x - ox, u.pos.z - oz);
      if (moved < want * 0.4) {
        u.slideDir = u.slideT > 0 ? -u.slideDir : (u.slideDir || (Math.random() < 0.5 ? 1 : -1));
        u.slideT = 0.8;
      }
      u.group.rotation.y = Math.atan2(tmp.x, tmp.z);
    }
    return d;
  }

  update(dt) {
    this.t += dt;
    const ev = { saladDamage: 0, playerHits: [], kills: [] };
    this.spawnT -= dt;
    if (this.queue.length && this.alive.length < this.maxAlive && this.spawnT <= 0) {
      this.spawn(this.queue.shift(), this.room.spawnPoint());
      this.spawnT = 3.2;
    }
    const salad = this.salad;
    for (let i = this.alive.length - 1; i >= 0; i--) {
      const u = this.alive[i];
      u.cd = Math.max(0, u.cd - dt);
      if (salad.ranchActive && this.vulnerable(u) && Math.hypot(u.pos.x - salad.pos.x, u.pos.z - salad.pos.z) < salad.ranchRadius + u.radius * 0.5) {
        ev.kills.push(this.kill(u, 0xf4f1e6));
        this.audio.melt();
        continue;
      }
      if (u.kind === 'knife') {
        const d = Math.hypot(u.pos.x - salad.pos.x, u.pos.z - salad.pos.z);
        if (d > salad.radius + 0.8) {
          this.moveToward(u, salad.pos, 3.4, dt);
          u.group.rotation.z = Math.sin(this.t * 9 + u.phase) * 0.12;
        } else {
          u.timer += dt;
          u.group.rotation.z = Math.sin(this.t * 14) * 0.4;
          if (u.timer >= 1.0) {
            u.timer = 0;
            salad.damage(5);
            ev.saladDamage += 5;
            this.audio.chop();
          }
        }
        u.group.position.set(u.pos.x, Math.abs(Math.sin(this.t * 8 + u.phase)) * 0.25, u.pos.z);
      } else if (u.kind === 'fork') {
        const d = this.moveToward(u, this.player.pos, 5.2, dt);
        u.group.userData.head.rotation.y += dt * 20;
        u.group.position.set(u.pos.x, Math.abs(Math.sin(this.t * 10 + u.phase)) * 0.3, u.pos.z);
        if (d < this.player.radius + u.radius + 0.5 && u.cd <= 0 && this.player.knocked <= 0) {
          ev.playerHits.push(u);
          u.cd = 1.3;
        }
      } else if (u.state === 'dig') {
        tmp.set(u.target.x - u.pos.x, 0, u.target.z - u.pos.z);
        const d = tmp.length();
        if (d > 0.15) {
          u.pos.addScaledVector(tmp.normalize(), Math.min(4.5 * dt, d));
          u.mark.position.set(u.pos.x, 0, u.pos.z);
          u.mark.scale.setScalar(0.8 + Math.sin(this.t * 10) * 0.1);
        } else {
          u.state = 'rise';
          u.timer = 0.7;
        }
      } else if (u.state === 'rise') {
        u.timer -= dt;
        u.mark.scale.setScalar(1 + Math.sin(this.t * 25) * 0.25);
        if (u.timer <= 0) {
          u.state = 'up';
          u.timer = 2.4;
          u.bit = false;
          u.group.visible = true;
          u.group.rotation.y = Math.atan2(salad.pos.x - u.pos.x, salad.pos.z - u.pos.z);
          this.particles.burst(tmp.set(u.pos.x, 0.3, u.pos.z), 16, 0x2b4c86, 7);
          this.audio.pop();
        }
      } else {
        u.timer -= dt;
        const up = Math.min(1, (2.4 - u.timer) / 0.25);
        u.group.position.set(u.pos.x, -5 + up * 5, u.pos.z);
        u.group.rotation.x = u.bit ? Math.sin(this.t * 12) * 0.15 : 0;
        if (!u.bit && 2.4 - u.timer > 0.9) {
          u.bit = true;
          if (Math.hypot(u.pos.x - salad.pos.x, u.pos.z - salad.pos.z) < salad.radius + 3.5) {
            salad.damage(12);
            ev.saladDamage += 12;
            this.audio.chop();
          }
        }
        if (u.timer <= 0) {
          u.state = 'dig';
          u.group.visible = false;
          u.group.rotation.x = 0;
          u.target = this.spoonTarget();
        }
      }
    }
    return ev;
  }
}
