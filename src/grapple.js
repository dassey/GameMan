import * as THREE from 'three';
import { box } from './art.js';

const tmp = new THREE.Vector3();
const target = new THREE.Vector3();

export class Grapple {
  constructor(scene, player) {
    this.player = player;
    this.state = 'idle';
    this.pos = new THREE.Vector3();
    this.dir = new THREE.Vector3(0, 0, -1);
    this.baseRange = 10;
    this.rangeBonus = 0;
    this.speed = 34;
    this.travelled = 0;
    this.knife = new THREE.Group();
    const blade = box(0.2, 1.4, 0.07, '#d8dce6');
    blade.position.y = 0.9;
    const tip = box(0.2, 0.3, 0.07, '#d8dce6');
    tip.position.y = 1.7;
    tip.rotation.z = 0.6;
    const guard = box(0.55, 0.14, 0.22, '#8a8a95');
    guard.position.y = 0.2;
    const handle = box(0.3, 0.6, 0.2, '#4a2f1a');
    handle.position.y = -0.15;
    this.knife.add(blade, tip, guard, handle);
    this.knife.visible = false;
    scene.add(this.knife);
    this.chainGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.chain = new THREE.Line(this.chainGeo, new THREE.LineBasicMaterial({ color: 0x4a4a55 }));
    this.chain.visible = false;
    this.chain.frustumCulled = false;
    scene.add(this.chain);
  }

  get range() {
    return this.baseRange + this.rangeBonus;
  }

  get ready() {
    return this.state === 'idle';
  }

  fire(dir) {
    if (!this.ready) return false;
    this.player.handPos(this.pos);
    this.pos.y = 1.2;
    this.dir.copy(dir).normalize();
    this.travelled = 0;
    this.state = 'out';
    this.knife.visible = true;
    this.chain.visible = true;
    return true;
  }

  update(dt, utensils) {
    if (this.state === 'idle') return null;
    let hit = null;
    this.player.handPos(tmp);
    tmp.y = 1.2;
    if (this.state === 'out') {
      const step = this.speed * dt;
      this.pos.addScaledVector(this.dir, step);
      this.travelled += step;
      hit = utensils.hitTest(this.pos, 0.9);
      if (hit || this.travelled >= this.range) this.state = 'back';
      target.copy(this.pos).add(this.dir);
    } else {
      target.copy(tmp);
      tmp.sub(this.pos);
      const d = tmp.length();
      const step = this.speed * 1.4 * dt;
      if (d <= step + 0.4) {
        this.state = 'idle';
        this.knife.visible = false;
        this.chain.visible = false;
        return hit;
      }
      this.pos.addScaledVector(tmp.normalize(), step);
    }
    this.knife.position.copy(this.pos);
    this.knife.lookAt(target);
    this.knife.rotateX(Math.PI / 2);
    const a = this.chainGeo.attributes.position;
    this.player.handPos(tmp);
    a.setXYZ(0, tmp.x, 1.2, tmp.z);
    a.setXYZ(1, this.pos.x, this.pos.y, this.pos.z);
    a.needsUpdate = true;
    return hit;
  }
}
