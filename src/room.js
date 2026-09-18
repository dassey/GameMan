import * as THREE from 'three';
import { box, cyl, ball, mat, lineMat, setOpacity } from './art.js';

export const R = 36;
const WALL_H = 30;

export class Room {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = [];
    this.circles = [];
    this.spawnPoints = [];
    this.t = 0;
    this.tableFade = 1;
    this.buildShell();
    this.buildClock();
    this.buildChair();
    this.buildTable();
    this.buildOutlet();
    this.buildVent();
    for (const [x, z] of [[-R + 3, R - 3], [R - 3, R - 3], [R - 3, -R + 3], [-R + 3, -R + 3], [0, -R + 3], [R - 3, 0], [-R + 3, 0]]) {
      this.spawnPoints.push(new THREE.Vector3(x, 0, z));
    }
  }

  block(x, z, hw, hd) {
    this.obstacles.push({ x, z, hw, hd });
  }

  addCircle(x, z, r) {
    const c = { x, z, r };
    this.circles.push(c);
    return c;
  }

  static pushCircle(pos, r, x, z, cr) {
    const dx = pos.x - x, dz = pos.z - z;
    const d = Math.hypot(dx, dz), min = cr + r;
    if (d >= min) return false;
    if (d < 0.001) {
      pos.x += min;
    } else {
      pos.x += (dx / d) * (min - d);
      pos.z += (dz / d) * (min - d);
    }
    return true;
  }

  buildShell() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), mat('#2b4c86', { repeat: 14, seed: 3 }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    const plankLines = [];
    for (let i = -R; i <= R; i += 6) {
      plankLines.push(new THREE.Vector3(-R, 0.02, i), new THREE.Vector3(R, 0.02, i));
    }
    this.scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(plankLines), new THREE.LineBasicMaterial({ color: 0x1c3260 })));
    const wallMat = mat('#3a5fa6', { repeat: 6, seed: 4 });
    const walls = [
      { p: [0, WALL_H / 2, -R], ry: 0 },
      { p: [-R, WALL_H / 2, 0], ry: Math.PI / 2 },
      { p: [R, WALL_H / 2, 0], ry: -Math.PI / 2 },
      { p: [0, WALL_H / 2, R], ry: Math.PI },
    ];
    for (const w of walls) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, WALL_H), wallMat);
      m.position.set(...w.p);
      m.rotation.y = w.ry;
      this.scene.add(m);
    }
    const base = box(R * 2, 1.2, 0.6, '#243f70');
    base.position.set(0, 0.6, -R + 0.3);
    this.scene.add(base);
    for (const s of [-1, 1]) {
      const side = box(0.6, 1.2, R * 2, '#243f70');
      side.position.set(s * (R - 0.3), 0.6, 0);
      this.scene.add(side);
    }
  }

  buildClock() {
    const g = new THREE.Group();
    const rim = cyl(4.7, 4.7, 0.5, '#3a2a1a', 16);
    rim.rotation.x = Math.PI / 2;
    g.add(rim);
    const face = cyl(4.2, 4.2, 0.5, '#efe9d8', 16);
    face.rotation.x = Math.PI / 2;
    face.position.z = 0.15;
    g.add(face);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.25, i % 3 === 0 ? 0.8 : 0.4, 0.1), new THREE.MeshBasicMaterial({ color: 0x14121f }));
      tick.position.set(Math.sin(a) * 3.5, Math.cos(a) * 3.5, 0.45);
      tick.rotation.z = -a;
      g.add(tick);
    }
    this.hourPivot = new THREE.Group();
    const hour = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.2, 0.12), new THREE.MeshBasicMaterial({ color: 0x14121f }));
    hour.position.y = 1.0;
    this.hourPivot.add(hour);
    this.hourPivot.position.z = 0.5;
    this.minPivot = new THREE.Group();
    const min = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.3, 0.12), new THREE.MeshBasicMaterial({ color: 0x14121f }));
    min.position.y = 1.5;
    this.minPivot.add(min);
    this.minPivot.position.z = 0.6;
    g.add(this.hourPivot, this.minPivot);
    g.position.set(0, 19, -R + 0.5);
    this.scene.add(g);
  }

  buildChair() {
    const g = new THREE.Group();
    g.position.set(-17, 0, -6);
    const base = cyl(3.2, 3.8, 0.7, '#2a2a33', 5);
    base.position.y = 0.35;
    g.add(base);
    const pole = cyl(0.5, 0.5, 5.2, '#8a8a95', 8);
    pole.position.y = 3.2;
    g.add(pole);
    this.chairTop = new THREE.Group();
    this.chairTop.position.y = 5.8;
    const seat = box(6.5, 1.1, 6.5, '#8a2a3a');
    seat.position.y = 0.55;
    const back = box(6.5, 6.5, 1, '#8a2a3a');
    back.position.set(0, 4.2, -3);
    this.chairTop.add(seat, back);
    for (const s of [-1, 1]) {
      const arm = box(0.8, 0.6, 4.5, '#2a2a33');
      arm.position.set(s * 3.2, 3.0, -0.5);
      const post = box(0.5, 2.2, 0.5, '#2a2a33');
      post.position.set(s * 3.2, 1.8, 0.8);
      this.chairTop.add(arm, post);
    }
    g.add(this.chairTop);
    this.scene.add(g);
    this.block(-17, -6, 3.9, 3.9);
  }

  buildTable() {
    const g = new THREE.Group();
    g.position.set(13, 0, -14);
    this.tableTop = box(26, 1.3, 15, '#a8743c', { repeat: 3, unique: true, transparent: true });
    this.tableTop.position.y = 12.6;
    g.add(this.tableTop);
    for (const [lx, lz] of [[-12, -6.5], [12, -6.5], [-12, 6.5], [12, 6.5]]) {
      const leg = box(1.3, 12, 1.3, '#8a5c2c');
      leg.position.set(lx, 6, lz);
      g.add(leg);
      this.block(13 + lx, -14 + lz, 0.85, 0.85);
    }
    this.computer = new THREE.Group();
    const monitor = box(7, 5.5, 0.8, '#d9d6cc');
    monitor.position.set(0, 17.2, -4);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(6, 4.6), new THREE.MeshBasicMaterial({ color: 0x1a1c24 }));
    screen.position.set(0, 17.2, -3.58);
    const stand = box(1.4, 1.3, 1.4, '#b8b5aa');
    stand.position.set(0, 13.9, -4);
    const foot = box(3.5, 0.3, 2.5, '#b8b5aa');
    foot.position.set(0, 13.4, -4);
    const keyboard = box(8, 0.5, 3, '#c8c4b8');
    keyboard.position.set(0, 13.5, 1.5);
    const mouse = ball(0.6, '#c8c4b8');
    mouse.scale.set(1, 0.6, 1.3);
    mouse.position.set(6, 13.5, 1.5);
    this.computer.add(monitor, screen, stand, foot, keyboard, mouse);
    g.add(this.computer);
    this.scene.add(g);
    this.tableBox = { x: 13, z: -14, hw: 13.5, hd: 8 };
    const cordPts = [
      new THREE.Vector3(13, 15.5, -18.5), new THREE.Vector3(13, 13.3, -20.5), new THREE.Vector3(24, 13.3, -21),
      new THREE.Vector3(25.5, 12.0, -21.2), new THREE.Vector3(25.7, 0.4, -20.8), new THREE.Vector3(29, 0.3, -16),
      new THREE.Vector3(30.5, 0.3, -13),
    ];
    const cord = new THREE.Line(new THREE.BufferGeometry().setFromPoints(cordPts), new THREE.LineBasicMaterial({ color: 0x14121f }));
    this.scene.add(cord);
    const plug = box(1.3, 0.8, 1.0, '#14121f');
    plug.position.set(31.2, 0.4, -12.6);
    plug.rotation.y = 0.5;
    this.scene.add(plug);
    this.addCircle(31.2, -12.6, 0.9);
    for (const s of [-1, 1]) {
      const prong = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7), new THREE.MeshBasicMaterial({ color: 0xc0c0c8 }));
      prong.position.set(31.2 + Math.cos(0.5) * s * 0.3 + Math.sin(0.5) * 0.85, 0.4, -12.6 - Math.sin(0.5) * s * 0.3 + Math.cos(0.5) * 0.85);
      prong.rotation.y = 0.5;
      this.scene.add(prong);
    }
  }

  buildOutlet() {
    const plate = box(0.4, 3.6, 2.4, '#efe9d8');
    plate.position.set(R - 0.25, 4, -12);
    this.scene.add(plate);
    const m = new THREE.MeshBasicMaterial({ color: 0x14121f });
    for (const [dy, dz] of [[1.0, -0.35], [1.0, 0.35], [-1.0, -0.35], [-1.0, 0.35]]) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.16), m);
      slot.position.set(R - 0.5, 4 + dy, -12 + dz);
      this.scene.add(slot);
    }
  }

  buildVent() {
    const vx = -R + 9, vz = R - 11;
    const frame = box(6.5, 0.5, 4.5, '#5a5f6a');
    frame.position.set(vx, 0.25, vz);
    this.scene.add(frame);
    for (let i = -2; i <= 2; i++) {
      const slat = box(0.3, 0.7, 3.8, '#2a2d36');
      slat.position.set(vx + i * 1.1, 0.5, vz);
      this.scene.add(slat);
    }
    this.block(vx, vz, 3.3, 2.3);
    this.vent = new THREE.Vector3(vx, 0, vz);
  }

  update(dt, playerPos) {
    this.t += dt;
    this.chairTop.rotation.y += dt * 0.6;
    this.minPivot.rotation.z = -this.t * 0.6;
    this.hourPivot.rotation.z = -this.t * 0.05;
    if (playerPos) {
      const tb = this.tableBox;
      const under = Math.abs(playerPos.x - tb.x) < tb.hw && Math.abs(playerPos.z - tb.z) < tb.hd;
      const target = under ? 0.18 : 1;
      if (Math.abs(this.tableFade - target) > 0.01) {
        this.tableFade += (target - this.tableFade) * Math.min(1, dt * 8);
        setOpacity(this.tableTop, this.tableFade);
        setOpacity(this.computer, this.tableFade);
      }
    }
  }

  isBlocked(x, z, r) {
    if (Math.abs(x) > R - r || Math.abs(z) > R - r) return true;
    for (const o of this.obstacles) {
      if (Math.abs(x - o.x) < o.hw + r && Math.abs(z - o.z) < o.hd + r) return true;
    }
    for (const c of this.circles) {
      if (Math.hypot(x - c.x, z - c.z) < c.r + r) return true;
    }
    return false;
  }

  freeSpot(r, margin = 3, rnd = Math.random, avoid = null, avoidR = 0) {
    for (let i = 0; i < 80; i++) {
      const x = (rnd() * 2 - 1) * (R - margin), z = (rnd() * 2 - 1) * (R - margin);
      if (this.isBlocked(x, z, r + 0.5)) continue;
      if (avoid && Math.hypot(x - avoid.x, z - avoid.z) < avoidR) continue;
      return new THREE.Vector3(x, 0, z);
    }
    return new THREE.Vector3(0, 0, 10);
  }

  resolve(pos, r) {
    pos.x = Math.max(-R + r, Math.min(R - r, pos.x));
    pos.z = Math.max(-R + r, Math.min(R - r, pos.z));
    for (const o of this.obstacles) {
      const dx = pos.x - o.x, dz = pos.z - o.z;
      const ox = o.hw + r - Math.abs(dx), oz = o.hd + r - Math.abs(dz);
      if (ox > 0 && oz > 0) {
        if (ox < oz) pos.x += (dx >= 0 ? 1 : -1) * ox;
        else pos.z += (dz >= 0 ? 1 : -1) * oz;
      }
    }
    for (const c of this.circles) Room.pushCircle(pos, r, c.x, c.z, c.r);
  }

  spawnPoint() {
    if (Math.random() < 0.4) return this.vent.clone().add(new THREE.Vector3(0, 0, 3.5));
    return this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)].clone();
  }
}
