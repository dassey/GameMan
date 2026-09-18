import * as THREE from 'three';

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpC = new THREE.Color();

export class Particles {
  constructor(scene, max = 800) {
    this.max = max;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), new THREE.MeshBasicMaterial(), max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.next = 0;
    tmpS.set(0, 0, 0);
    for (let i = 0; i < max; i++) {
      tmpM.compose(tmpP.set(0, -99, 0), tmpQ, tmpS);
      this.mesh.setMatrixAt(i, tmpM);
      this.mesh.setColorAt(i, tmpC.set(0xffffff));
    }
    scene.add(this.mesh);
  }

  spawn(x, y, z, vx, vy, vz, color, life, gravity) {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    const j = i * 3;
    this.pos[j] = x; this.pos[j + 1] = y; this.pos[j + 2] = z;
    this.vel[j] = vx; this.vel[j + 1] = vy; this.vel[j + 2] = vz;
    this.life[i] = life;
    this.grav[i] = gravity;
    this.mesh.setColorAt(i, tmpC.set(color));
    this.mesh.instanceColor.needsUpdate = true;
  }

  burst(p, n, color, speed = 6, life = 0.8, gravity = 14) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.283, b = Math.random() * 3.14, s = speed * (0.4 + Math.random() * 0.8);
      this.spawn(p.x, p.y, p.z, Math.cos(a) * Math.sin(b) * s, Math.abs(Math.cos(b)) * s + 2, Math.sin(a) * Math.sin(b) * s, color, life * (0.6 + Math.random() * 0.8), gravity);
    }
  }

  update(dt) {
    const { pos, vel, life, grav, max } = this;
    for (let i = 0; i < max; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      const j = i * 3;
      vel[j + 1] -= grav[i] * dt;
      pos[j] += vel[j] * dt;
      pos[j + 1] += vel[j + 1] * dt;
      pos[j + 2] += vel[j + 2] * dt;
      if (pos[j + 1] < 0.1 && grav[i] > 0) {
        pos[j + 1] = 0.1;
        vel[j + 1] *= -0.3;
        vel[j] *= 0.7;
        vel[j + 2] *= 0.7;
      }
      const s = life[i] <= 0 ? 0 : Math.min(1, life[i] * 2);
      tmpS.set(s, s, s);
      tmpM.compose(tmpP.set(pos[j], pos[j + 1], pos[j + 2]), tmpQ, tmpS);
      this.mesh.setMatrixAt(i, tmpM);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
