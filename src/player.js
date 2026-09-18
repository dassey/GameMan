import * as THREE from 'three';
import { box, eyes } from './art.js';

const SPAWN = new THREE.Vector3(0, 0, 14);
const tmp = new THREE.Vector3();

export class Player {
  constructor(scene, room) {
    this.room = room;
    this.pos = SPAWN.clone();
    this.maxHp = 100;
    this.hp = 100;
    this.infinite = false;
    this.baseSpeed = 9;
    this.speedMul = 1;
    this.boostT = 0;
    this.knocked = 0;
    this.invuln = 0;
    this.radius = 0.6;
    this.held = null;
    this.vr = false;
    this.moving = false;
    this.walkT = 0;
    this.aim = new THREE.Vector3(0, 0, -1);
    this.group = new THREE.Group();
    const body = box(1.1, 1.0, 0.8, '#e6c53a');
    body.position.y = 1.0;
    const belt = box(1.14, 0.2, 0.84, '#3a2f5a');
    belt.position.y = 0.6;
    const head = box(1.2, 1.1, 1.1, '#e6c53a');
    head.position.y = 2.05;
    const band = box(1.28, 0.28, 1.18, '#c0313a');
    band.position.y = 2.25;
    const tail = box(0.8, 0.2, 0.15, '#c0313a');
    tail.position.set(-0.8, 2.25, -0.5);
    tail.rotation.z = 0.3;
    eyes(head, -0.05, 0.56, 0.28, 0.16);
    this.legL = box(0.35, 0.6, 0.4, '#3a2f5a');
    this.legL.position.set(-0.3, 0.3, 0);
    this.legR = box(0.35, 0.6, 0.4, '#3a2f5a');
    this.legR.position.set(0.3, 0.3, 0);
    this.armL = box(0.3, 0.75, 0.3, '#e6c53a');
    this.armL.position.set(-0.75, 1.1, 0);
    this.armR = box(0.3, 0.75, 0.3, '#e6c53a');
    this.armR.position.set(0.75, 1.1, 0);
    this.hand = new THREE.Object3D();
    this.hand.position.set(0.75, 1.0, 0.5);
    this.group.add(body, belt, head, band, tail, this.legL, this.legR, this.armL, this.armR, this.hand);
    scene.add(this.group);
  }

  get speed() {
    return this.baseSpeed * this.speedMul * (this.boostT > 0 ? 1.6 : 1);
  }

  handPos(out) {
    return this.hand.getWorldPosition(out);
  }

  update(dt, keys, aimPoint, move = null) {
    this.invuln = Math.max(0, this.invuln - dt);
    this.boostT = Math.max(0, this.boostT - dt);
    if (this.knocked > 0) {
      this.knocked -= dt;
      this.group.rotation.z = Math.PI / 2;
      this.group.position.set(this.pos.x, 0.55, this.pos.z);
      if (this.knocked <= 0) {
        this.hp = this.maxHp;
        this.pos.copy(SPAWN);
        this.group.rotation.z = 0;
        this.invuln = 2;
      }
      if (this.vr) this.group.visible = false;
      return;
    }
    if (aimPoint) {
      tmp.subVectors(aimPoint, this.pos);
      tmp.y = 0;
      if (tmp.lengthSq() > 0.01) this.aim.copy(tmp).normalize();
    }
    let mx = 0, mz = 0;
    if (move) {
      mx = move.x;
      mz = move.z;
    } else {
      let fwd = 0, side = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) fwd += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) fwd -= 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) side -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) side += 1;
      mx = this.aim.x * fwd - this.aim.z * side;
      mz = this.aim.z * fwd + this.aim.x * side;
    }
    const len = Math.hypot(mx, mz);
    this.moving = len > 0.01;
    if (this.moving) {
      const k = len > 1 ? 1 / len : 1;
      this.pos.x += mx * k * this.speed * dt;
      this.pos.z += mz * k * this.speed * dt;
      this.room.resolve(this.pos, this.radius);
    }
    this.group.rotation.y = Math.atan2(this.aim.x, this.aim.z);
    this.walkT += dt * (this.moving ? 13 : 0);
    const swing = this.moving ? Math.sin(this.walkT) * 0.7 : 0;
    this.legL.rotation.x = swing;
    this.legR.rotation.x = -swing;
    this.armL.rotation.x = -swing * 0.8;
    this.armR.rotation.x = swing * 0.8;
    this.group.position.set(this.pos.x, this.moving ? Math.abs(Math.sin(this.walkT)) * 0.12 : 0, this.pos.z);
    this.group.visible = this.vr ? false : (this.invuln > 0 ? Math.floor(this.invuln * 20) % 2 === 0 : true);
  }

  takeDamage(n, from) {
    if (this.invuln > 0 || this.knocked > 0) return false;
    if (from) {
      tmp.set(this.pos.x - from.x, 0, this.pos.z - from.z);
      if (tmp.lengthSq() > 0.001) this.pos.addScaledVector(tmp.normalize(), 1.6);
      this.room.resolve(this.pos, this.radius);
    }
    if (this.infinite) {
      this.invuln = 0.4;
      return true;
    }
    this.hp -= n;
    this.invuln = 0.7;
    if (this.hp <= 0) {
      this.hp = 0;
      this.knocked = 3;
      return 'ko';
    }
    return true;
  }
}
