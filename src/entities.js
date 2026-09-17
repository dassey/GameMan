import * as THREE from 'three';
import { AgentSprite } from './sprites.js';
import { sparkTexture, tieTexture, goldGlassesTexture, eyeTexture, loadPixelTexture } from './textures.js';
import { HALF } from './world.js';

const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();

export class Particles {
  constructor(scene, max = 400) {
    this.max = max;
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(geo, this.mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.items = [];
    this.m = new THREE.Matrix4();
    this.colors = new Float32Array(max * 3);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(this.colors, 3);
    scene.add(this.mesh);
    this.mesh.count = 0;
  }

  burst(pos, n, color, speed = 4, life = 0.9, gravity = 9) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      if (this.items.length >= this.max) this.items.shift();
      const v = new THREE.Vector3((Math.random() - 0.5), Math.random() * 0.8 + 0.2, (Math.random() - 0.5)).normalize().multiplyScalar(speed * (0.5 + Math.random()));
      this.items.push({ p: pos.clone(), v, life, t: life, c, s: 0.6 + Math.random() * 0.9, g: gravity });
    }
  }

  update(dt) {
    let k = 0;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t -= dt; if (it.t <= 0) { this.items.splice(i, 1); continue; }
      it.v.y -= it.g * dt; it.p.addScaledVector(it.v, dt);
      const s = it.s * (it.t / it.life);
      this.m.makeScale(s, s, s).setPosition(it.p);
      this.mesh.setMatrixAt(k, this.m);
      this.mesh.setColorAt(k, it.c);
      k++;
    }
    this.mesh.count = k;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

export class Collectibles {
  constructor(scene, world, max = 220) {
    this.world = world; this.max = max;
    this.sparks = [];
    const geo = new THREE.PlaneGeometry(0.4, 0.4);
    const mat = new THREE.MeshBasicMaterial({ map: sparkTexture(), side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    const tgeo = new THREE.PlaneGeometry(0.22, 0.66);
    const tmat = new THREE.MeshBasicMaterial({ map: tieTexture(), side: THREE.DoubleSide, alphaTest: 0.5 });
    this.tieMesh = new THREE.InstancedMesh(tgeo, tmat, 24);
    this.tieMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.tieMesh.frustumCulled = false;
    scene.add(this.tieMesh);
    this.ties = [];
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.s = new THREE.Vector3(1, 1, 1);
    this.time = 0;
    for (let i = 0; i < max * 0.8; i++) this.spawnSpark();
    for (let i = 0; i < 12; i++) this.spawnTie();
  }

  spawnSpark(at = null) {
    if (this.sparks.length >= this.max) return;
    let p;
    if (at) p = at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 1.6));
    else {
      const c = this.world.randomCell(0, Infinity, 5);
      p = c.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5));
    }
    p.y = this.world.heightAt(p.x, p.z) + 0.5 + Math.random() * 0.4;
    this.sparks.push({ p, phase: Math.random() * 6.28, alive: true });
  }

  spawnTie() {
    if (this.ties.length >= 24) return;
    const c = this.world.randomCell(6, Infinity, 20);
    c.y = this.world.heightAt(c.x, c.z) + 0.9;
    this.ties.push({ p: c, phase: Math.random() * 6.28 });
  }

  collect(pos, radius) {
    let s = 0, t = 0;
    const r2 = radius * radius;
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      if (this.sparks[i].p.distanceToSquared(pos) < r2) { this.sparks.splice(i, 1); s++; }
    }
    for (let i = this.ties.length - 1; i >= 0; i--) {
      if (this.ties[i].p.distanceToSquared(pos) < r2 + 0.3) { this.ties.splice(i, 1); t++; }
    }
    return { sparks: s, ties: t };
  }

  update(dt) {
    this.time += dt;
    if (this.sparks.length < this.max * 0.7 && Math.random() < dt * 2) this.spawnSpark();
    if (this.ties.length < 8 && Math.random() < dt * 0.1) this.spawnTie();
    let k = 0;
    for (const sp of this.sparks) {
      this.q.setFromAxisAngle(UP, this.time * 2 + sp.phase);
      tmp.copy(sp.p); tmp.y += Math.sin(this.time * 3 + sp.phase) * 0.08;
      this.m.compose(tmp, this.q, this.s);
      this.mesh.setMatrixAt(k++, this.m);
    }
    this.mesh.count = k; this.mesh.instanceMatrix.needsUpdate = true;
    k = 0;
    for (const t of this.ties) {
      this.q.setFromAxisAngle(UP, this.time * 1.5 + t.phase);
      tmp.copy(t.p); tmp.y += Math.sin(this.time * 2 + t.phase) * 0.1;
      this.m.compose(tmp, this.q, this.s);
      this.tieMesh.setMatrixAt(k++, this.m);
    }
    this.tieMesh.count = k; this.tieMesh.instanceMatrix.needsUpdate = true;
  }
}

let rockTex = null, eyeTex = null;

function makeGolem(scale) {
  rockTex ||= loadPixelTexture('assets/textures/rock2.png');
  eyeTex ||= eyeTexture();
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ map: rockTex });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.7), mat); body.position.y = 0.75;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.5), mat); head.position.y = 1.5;
  const eyes = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshBasicMaterial({ map: eyeTex }));
  eyes.position.set(0, 1.52, 0.26);
  const la = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), mat); la.position.set(-0.68, 0.7, 0);
  const ra = la.clone(); ra.position.x = 0.68;
  const ll = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.32), mat); ll.position.set(-0.25, 0.2, 0);
  const rl = ll.clone(); rl.position.x = 0.25;
  g.add(body, head, eyes, la, ra, ll, rl);
  g.userData.parts = { la, ra, ll, rl, body, head };
  g.scale.setScalar(scale);
  return g;
}

export class Enemy {
  constructor(kind, pos, tier) {
    this.kind = kind; this.tier = tier;
    this.pos = pos.clone(); this.vel = new THREE.Vector3();
    this.dir = Math.random() * Math.PI * 2; this.wanderT = 0;
    this.hitFlash = 0; this.attackT = 0; this.dead = false; this.deathT = 0; this.t = Math.random() * 10;
    this.knock = new THREE.Vector3();
    if (kind === 'golem') {
      const scale = 0.8 + tier * 0.12;
      this.obj = makeGolem(scale);
      this.maxHP = Math.round(30 * (1 + tier * 0.6)); this.speed = 1.6 + tier * 0.25; this.dmg = 8 + tier * 4;
      this.radius = 0.6 * scale; this.height = 1.8 * scale; this.xp = 25 + tier * 12; this.score = 100 + tier * 60;
      this.aggro = 12;
    } else {
      this.obj = new AgentSprite({ height: 1.8, tint: 0x6a4a7a, fps: 10 });
      this.obj.play('stance');
      this.maxHP = Math.round(45 * (1 + tier * 0.6)); this.speed = 2.6 + tier * 0.3; this.dmg = 12 + tier * 5;
      this.radius = 0.5; this.height = 1.8; this.xp = 45 + tier * 15; this.score = 200 + tier * 80;
      this.aggro = 16;
    }
    this.hp = this.maxHP;
    this.obj.position.copy(this.pos);
  }

  centre() { return tmp.copy(this.pos).add(new THREE.Vector3(0, this.height * 0.55, 0)); }

  update(dt, world, player, camera) {
    this.t += dt;
    if (this.dead) {
      this.deathT += dt;
      const s = Math.max(0.01, 1 - this.deathT * 2.5);
      this.obj.scale.setScalar(this.kind === 'golem' ? s * (0.8 + this.tier * 0.12) : s);
      return;
    }
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.attackT = Math.max(0, this.attackT - dt);
    const toP = new THREE.Vector3().subVectors(player.pos, this.pos); toP.y = 0;
    const dist = toP.length();
    let mv = new THREE.Vector3();
    if (dist < this.aggro && !player.dead) {
      mv.copy(toP).normalize();
      this.chasing = true;
    } else {
      this.chasing = false;
      this.wanderT -= dt;
      if (this.wanderT <= 0) { this.wanderT = 1.5 + Math.random() * 3; this.dir = Math.random() * Math.PI * 2; this.pause = Math.random() < 0.4; }
      if (!this.pause) mv.set(Math.sin(this.dir), 0, Math.cos(this.dir));
    }
    mv.multiplyScalar(this.speed).add(this.knock);
    this.knock.multiplyScalar(Math.max(0, 1 - dt * 6));
    const before = this.pos.clone();
    world.moveWithCollision(this.pos, mv.x * dt, mv.z * dt, this.pos.y, 1.05, this.radius * 0.6);
    world.pushOutOfPillars(this.pos, this.radius * 0.6, this.pos.y);
    if (!this.chasing && before.distanceToSquared(this.pos) < 1e-6 && !this.pause) this.wanderT = 0;
    const ground = world.groundAt(this.pos.x, this.pos.z, this.radius * 0.5);
    this.pos.y += (ground - this.pos.y) * Math.min(1, dt * 10);
    this.obj.position.copy(this.pos);

    const hitDist = this.radius + 0.5;
    if (dist < hitDist && this.attackT === 0 && !player.dead) {
      this.attackT = 1.1;
      player.takeDamage(this.dmg, this.pos);
      this.lunge = 1;
    }

    if (this.kind === 'golem') {
      const P = this.obj.userData.parts;
      const walking = mv.lengthSq() > 0.05 ? 1 : 0;
      const sw = Math.sin(this.t * 7) * 0.6 * walking;
      P.la.rotation.x = sw; P.ra.rotation.x = -sw; P.ll.rotation.x = -sw * 0.5; P.rl.rotation.x = sw * 0.5;
      if (this.lunge) { this.lunge = Math.max(0, this.lunge - dt * 3); P.la.rotation.x = P.ra.rotation.x = -1.6 * Math.sin(this.lunge * Math.PI); }
      if (mv.lengthSq() > 0.01) this.obj.rotation.y = Math.atan2(mv.x, mv.z);
      const f = this.hitFlash > 0 ? 3 : 0;
      this.obj.traverse((o) => { if (o.material && o.material.emissive) o.material.emissive.setScalar(f); });
    } else {
      this.obj.update(dt, camera);
      const moving = mv.lengthSq() > 0.05;
      if (this.lunge) { this.lunge = Math.max(0, this.lunge - dt * 2); this.obj.play('punch'); }
      else this.obj.play(moving ? 'walk' : 'stance');
      this.obj.mat.color.setHex(this.hitFlash > 0 ? 0xffffff : 0x6a4a7a);
    }
  }

  hit(dmg, fromPos) {
    this.hp -= dmg; this.hitFlash = 0.12;
    const k = new THREE.Vector3().subVectors(this.pos, fromPos); k.y = 0; k.normalize().multiplyScalar(5);
    this.knock.add(k);
    if (this.hp <= 0 && !this.dead) { this.dead = true; this.deathT = 0; return true; }
    return false;
  }
}

export class Enemies {
  constructor(scene, world, particles, audio) {
    this.scene = scene; this.world = world; this.particles = particles; this.audio = audio;
    this.list = []; this.spawnT = 0;
  }

  tierFor(pos, difficulty) {
    const d = Math.hypot(pos.x, pos.z);
    const zone = d < 34 ? 0 : d < 62 ? 1 : d < 84 ? 2 : 3;
    return Math.min(6, zone + Math.floor(difficulty - 1));
  }

  spawn(kind, pos, difficulty) {
    const e = new Enemy(kind, pos, this.tierFor(pos, difficulty));
    this.scene.add(e.obj); this.list.push(e); return e;
  }

  populate(difficulty, count = 26) {
    for (let i = 0; i < count; i++) {
      const c = this.world.randomCell(0, Infinity, 16);
      const far = Math.hypot(c.x, c.z) > 50;
      this.spawn(far && Math.random() < 0.45 ? 'shade' : 'golem', c, difficulty);
    }
  }

  update(dt, player, camera, difficulty) {
    this.spawnT -= dt;
    const target = Math.min(50, 24 + Math.floor(difficulty * 4));
    if (this.spawnT <= 0 && this.list.length < target) {
      this.spawnT = 3;
      const c = this.world.randomCell(0, Infinity, 22);
      if (c.distanceTo(player.pos) > 18) {
        const far = Math.hypot(c.x, c.z) > 45;
        this.spawn(far && Math.random() < 0.5 ? 'shade' : 'golem', c, difficulty);
      }
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      const d2 = e.pos.distanceToSquared(player.pos);
      if (d2 > 60 * 60 && Math.random() > 0.2 && !e.dead) continue;
      e.update(dt, this.world, player, camera);
      if (e.dead && e.deathT > 0.45) {
        this.scene.remove(e.obj);
        if (e.obj.dispose) e.obj.dispose();
        this.list.splice(i, 1);
      }
    }
  }

  punch(origin, dir, dmg, onKill) {
    let hitAny = false;
    for (const e of this.list) {
      if (e.dead) continue;
      const c = e.centre().clone();
      if (dir) {
        const to = c.clone().sub(origin); const dist = to.length();
        if (dist > 2.6 + e.radius) continue;
        to.normalize();
        if (to.dot(dir) < 0.75) continue;
      } else {
        if (c.distanceTo(origin) > e.radius + 0.25 && Math.hypot(origin.x - e.pos.x, origin.z - e.pos.z) > e.radius + 0.2) continue;
        if (origin.y < e.pos.y - 0.2 || origin.y > e.pos.y + e.height + 0.2) continue;
      }
      hitAny = true;
      this.particles.burst(c, 6, e.kind === 'golem' ? 0x9a9a9a : 0x8a5aa0, 3, 0.5);
      const killed = e.hit(dmg, origin);
      if (killed) {
        this.audio.kill();
        this.particles.burst(c, 24, e.kind === 'golem' ? 0x7a7a7a : 0x3a2a4a, 5, 1.0);
        this.particles.burst(c, 10, 0xffe94a, 4, 1.2);
        onKill(e);
      } else this.audio.hit();
    }
    return hitAny;
  }
}

export class Guide {
  constructor(scene, pos, text) {
    this.sprite = new AgentSprite({ height: 1.8, fps: 6 });
    this.sprite.position.copy(pos);
    scene.add(this.sprite);
    this.pos = pos;
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#ffe94a'; ctx.fillRect(4, 4, 248, 120);
    ctx.fillStyle = '#1b1b1b'; ctx.fillRect(8, 8, 240, 112);
    ctx.fillStyle = '#ffe94a'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center';
    text.split('\n').forEach((l, i) => ctx.fillText(l, 128, 30 + i * 20));
    const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
    this.board = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
    this.board.position.set(pos.x, pos.y + 2.5, pos.z);
    scene.add(this.board);
    this.cheerT = 0;
  }

  cheer() { this.cheerT = 3; this.sprite.play('victory', { restart: true }); }

  update(dt, camera, player) {
    this.sprite.update(dt, camera);
    this.board.rotation.y = this.sprite.mesh.rotation.y;
    if (this.cheerT > 0) { this.cheerT -= dt; if (this.cheerT <= 0) this.sprite.play('idle'); return; }
    const d = player.pos.distanceTo(this.pos);
    if (d < 6 && this.sprite.anim !== 'point') this.sprite.play('point');
    else if (d >= 6 && this.sprite.anim !== 'idle') this.sprite.play('idle');
  }
}

export class GoldenGlasses {
  constructor(scene, pos) {
    this.pos = pos.clone(); this.pos.y += 1.2;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), new THREE.MeshBasicMaterial({ map: goldGlassesTexture(), side: THREE.DoubleSide, alphaTest: 0.5 }));
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 60, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe94a, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.set(pos.x, pos.y + 30, pos.z);
    scene.add(beam);
    this.beam = beam; this.taken = false; this.t = 0;
  }

  update(dt) {
    this.t += dt;
    this.mesh.rotation.y = this.t * 1.5;
    this.mesh.position.y = this.pos.y + Math.sin(this.t * 2) * 0.15;
    this.beam.material.opacity = 0.18 + Math.sin(this.t * 3) * 0.08;
  }

  tryTake(pos) {
    if (this.taken) return false;
    if (pos.distanceTo(this.pos) < 1.6) { this.taken = true; this.mesh.visible = false; this.beam.visible = false; return true; }
    return false;
  }

  reset(pos) {
    this.pos.copy(pos); this.pos.y += 1.2; this.mesh.position.copy(this.pos); this.beam.position.set(pos.x, pos.y + 30, pos.z);
    this.taken = false; this.mesh.visible = true; this.beam.visible = true;
  }
}

export { HALF };
