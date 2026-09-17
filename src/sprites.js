import * as THREE from 'three';

let atlasTex = null, atlasMeta = null;

export async function loadAtlas() {
  const meta = await (await fetch('assets/sprites/agent.json')).json();
  const tex = await new Promise((res, rej) => new THREE.TextureLoader().load('assets/sprites/agent.png', res, undefined, rej));
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
  atlasTex = tex; atlasMeta = meta;
  return meta;
}

export class AgentSprite extends THREE.Object3D {
  constructor({ height = 1.8, tint = 0xffffff, fps = 8 } = {}) {
    super();
    this.fps = fps;
    this.anim = 'idle'; this.frame = 0; this.time = 0; this.loop = true; this.flip = false;
    this.onEnd = null;
    this.tex = atlasTex.clone();
    this.tex.needsUpdate = true;
    const w = height * (atlasMeta.cellW / atlasMeta.cellH);
    this.mat = new THREE.MeshLambertMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide, color: tint });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, height), this.mat);
    this.mesh.position.y = height / 2;
    this.add(this.mesh);
    this.applyFrame();
  }

  play(name, { loop = true, restart = false, onEnd = null } = {}) {
    if (this.anim === name && !restart) return;
    this.anim = name; this.frame = 0; this.time = 0; this.loop = loop; this.onEnd = onEnd;
    this.applyFrame();
  }

  applyFrame() {
    const frames = atlasMeta.anims[this.anim] || atlasMeta.anims.idle;
    const f = frames[Math.min(this.frame, frames.length - 1)];
    const W = atlasMeta.width, H = atlasMeta.height;
    this.tex.repeat.set((this.flip ? -1 : 1) * f.w / W, f.h / H);
    this.tex.offset.set((this.flip ? f.x + f.w : f.x) / W, 1 - (f.y + f.h) / H);
  }

  update(dt, camera) {
    this.time += dt;
    const frames = atlasMeta.anims[this.anim];
    if (this.time > 1 / this.fps) {
      this.time = 0;
      this.frame++;
      if (this.frame >= frames.length) {
        if (this.loop) this.frame = 0;
        else { this.frame = frames.length - 1; if (this.onEnd) { const cb = this.onEnd; this.onEnd = null; cb(); } }
      }
      this.applyFrame();
    }
    if (camera) {
      const p = new THREE.Vector3(); this.getWorldPosition(p);
      const c = new THREE.Vector3(); camera.getWorldPosition(c);
      this.mesh.rotation.y = Math.atan2(c.x - p.x, c.z - p.z);
    }
  }

  dispose() { this.mesh.geometry.dispose(); this.mat.dispose(); this.tex.dispose(); }
}
