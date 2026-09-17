import * as THREE from 'three';
import { fbm, mulberry32, hash2 } from './noise.js';
import { grassTopTexture, grassTuftTexture, loadPixelTexture } from './textures.js';

export const CELL = 2;
export const N = 96;
export const HALF = (N * CELL) / 2;
export const WALL_H = 26;
const UP = new THREE.Vector3(0, 1, 0);

export class World {
  constructor(scene, seed = 1337) {
    this.scene = scene;
    this.seed = seed;
    this.rand = mulberry32(seed);
    this.heights = new Int16Array(N * N);
    this.group = new THREE.Group();
    scene.add(this.group);
    this.generateHeights();
    this.buildTerrain();
    this.buildGrass();
    this.buildPillars();
  }

  generateHeights() {
    let best = -1;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = i - N / 2 + 0.5, z = j - N / 2 + 0.5;
      const d = Math.hypot(x, z) / (N / 2);
      let n = fbm(i * 0.045, j * 0.045, this.seed, 4);
      let ridge = fbm(i * 0.12 + 40, j * 0.12 + 40, this.seed + 7, 2);
      let h = n * 13 + ridge * 4 + d * 6;
      const flat = Math.max(0, Math.min(1, 1 - (Math.hypot(x, z) - 6) / 5));
      h = h * (1 - flat) + 3 * flat;
      h = Math.round(h);
      h = Math.max(0, Math.min(h, 20));
      this.heights[j * N + i] = h;
      if (h > best) { best = h; this.summitCell = [i, j]; }
    }
    best = -1;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = i - N / 2 + 0.5, z = j - N / 2 + 0.5;
      if (Math.hypot(x, z) < N * 0.25) continue;
      const h = this.heights[j * N + i];
      if (h > best) { best = h; this.summitCell = [i, j]; }
    }
    this.summitHeight = best;
    this.spawn = new THREE.Vector3(0, 3, 4);
  }

  cellIndex(x, z) {
    const i = Math.floor((x + HALF) / CELL), j = Math.floor((z + HALF) / CELL);
    return [i, j];
  }

  cellCenter(i, j) {
    return new THREE.Vector3((i + 0.5) * CELL - HALF, this.cellHeight(i, j), (j + 0.5) * CELL - HALF);
  }

  cellHeight(i, j) {
    if (i < 0 || j < 0 || i >= N || j >= N) return WALL_H;
    return this.heights[j * N + i];
  }

  heightAt(x, z) {
    const [i, j] = this.cellIndex(x, z);
    return this.cellHeight(i, j);
  }

  isInside(x, z) {
    return Math.abs(x) < HALF && Math.abs(z) < HALF;
  }

  moveWithCollision(pos, dx, dz, feetY, stepUp, radius = 0.35) {
    const ok = (x, z) => {
      for (const [ox, oz] of [[radius, 0], [-radius, 0], [0, radius], [0, -radius], [radius * 0.7, radius * 0.7], [-radius * 0.7, radius * 0.7], [radius * 0.7, -radius * 0.7], [-radius * 0.7, -radius * 0.7]]) {
        if (this.heightAt(x + ox, z + oz) > feetY + stepUp) return false;
      }
      return true;
    };
    if (ok(pos.x + dx, pos.z)) pos.x += dx;
    if (ok(pos.x, pos.z + dz)) pos.z += dz;
  }

  groundAt(x, z, radius = 0.3) {
    let h = -Infinity;
    for (const [ox, oz] of [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]]) {
      h = Math.max(h, this.heightAt(x + ox, z + oz));
    }
    return h;
  }

  randomCell(minH = 0, maxDist = Infinity, minDist = 0) {
    for (let t = 0; t < 200; t++) {
      const i = Math.floor(this.rand() * N), j = Math.floor(this.rand() * N);
      const c = this.cellCenter(i, j);
      const d = Math.hypot(c.x, c.z);
      if (c.y >= minH && d <= maxDist && d >= minDist) return c;
    }
    return this.spawn.clone();
  }

  buildTerrain() {
    const top = { pos: [], nor: [], uv: [], col: [] };
    const side = { pos: [], nor: [], uv: [], col: [] };
    const pushQuad = (buf, a, b, c, d, n, uvs, color) => {
      for (const p of [a, b, c, a, c, d]) buf.pos.push(p[0], p[1], p[2]);
      for (let k = 0; k < 6; k++) { buf.nor.push(n[0], n[1], n[2]); buf.col.push(color[0], color[1], color[2]); }
      for (const idx of [0, 1, 2, 0, 2, 3]) buf.uv.push(uvs[idx][0], uvs[idx][1]);
    };
    for (let j = -1; j <= N; j++) for (let i = -1; i <= N; i++) {
      const inside = i >= 0 && j >= 0 && i < N && j < N;
      const h = this.cellHeight(i, j);
      const x0 = i * CELL - HALF, x1 = x0 + CELL, z0 = j * CELL - HALF, z1 = z0 + CELL;
      if (inside) {
        const shade = 0.75 + 0.25 * Math.min(1, h / 16) + (hash2(i, j, 5) - 0.5) * 0.12;
        pushQuad(top, [x0, h, z0], [x0, h, z1], [x1, h, z1], [x1, h, z0], [0, 1, 0],
          [[x0 / 4, z0 / 4], [x0 / 4, z1 / 4], [x1 / 4, z1 / 4], [x1 / 4, z0 / 4]], [shade, shade, shade]);
      }
      const nbrs = [
        { di: 1, dj: 0, n: [1, 0, 0], a: [x1, z1], b: [x1, z0] },
        { di: -1, dj: 0, n: [-1, 0, 0], a: [x0, z0], b: [x0, z1] },
        { di: 0, dj: 1, n: [0, 0, 1], a: [x0, z1], b: [x1, z1] },
        { di: 0, dj: -1, n: [0, 0, -1], a: [x1, z0], b: [x0, z0] },
      ];
      for (const nb of nbrs) {
        const ni = i + nb.di, nj = j + nb.dj;
        const nInside = ni >= 0 && nj >= 0 && ni < N && nj < N;
        if (!inside && !nInside) continue;
        const hn = this.cellHeight(ni, nj);
        if (hn >= h) continue;
        const tint = 0.6 + 0.4 * hash2(i * 3 + nb.di, j * 3 + nb.dj, 9);
        const c = nb.n[0] !== 0 ? [tint * 0.85, tint * 0.85, tint * 0.88] : [tint, tint, tint * 1.03];
        const along0 = (nb.a[0] + nb.a[1]) / 4, along1 = (nb.b[0] + nb.b[1]) / 4;
        pushQuad(side,
          [nb.a[0], hn, nb.a[1]], [nb.a[0], h, nb.a[1]], [nb.b[0], h, nb.b[1]], [nb.b[0], hn, nb.b[1]],
          nb.n, [[along0, hn / 4], [along0, h / 4], [along1, h / 4], [along1, hn / 4]], c);
      }
    }
    const make = (buf, mat) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(buf.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(buf.col, 3));
      const m = new THREE.Mesh(g, mat);
      m.receiveShadow = false;
      this.group.add(m);
      return m;
    };
    this.grassTex = grassTopTexture(this.rand);
    this.rockTex = loadPixelTexture('assets/textures/rock.png');
    this.topMesh = make(top, new THREE.MeshLambertMaterial({ map: this.grassTex, vertexColors: true }));
    this.sideMesh = make(side, new THREE.MeshLambertMaterial({ map: this.rockTex, vertexColors: true }));
  }

  buildGrass() {
    const tex = grassTuftTexture(this.rand);
    const geo = new THREE.PlaneGeometry(1.1, 0.8);
    geo.translate(0, 0.4, 0);
    const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
    const count = 1400;
    const mesh = new THREE.InstancedMesh(geo, mat, count * 2);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
    let k = 0;
    for (let t = 0; t < count; t++) {
      const i = Math.floor(this.rand() * N), j = Math.floor(this.rand() * N);
      const h = this.cellHeight(i, j);
      const nearCliff = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([di, dj]) => this.cellHeight(i + di, j + dj) > h);
      if (!nearCliff && this.rand() < 0.6) continue;
      const x = (i + this.rand()) * CELL - HALF, z = (j + this.rand()) * CELL - HALF;
      for (let r = 0; r < 2; r++) {
        q.setFromAxisAngle(UP, this.rand() * Math.PI + r * Math.PI / 2);
        const sc = 0.7 + this.rand() * 0.6;
        s.set(sc, sc, sc);
        m.compose(new THREE.Vector3(x, h, z), q, s);
        mesh.setMatrixAt(k++, m);
      }
    }
    mesh.count = k;
    mesh.instanceMatrix.needsUpdate = true;
    this.group.add(mesh);
  }

  buildPillars() {
    const tex = loadPixelTexture('assets/textures/rock2.png');
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    const mesh = new THREE.InstancedMesh(geo, mat, 140);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    this.pillars = [];
    for (let t = 0; t < 140; t++) {
      const c = this.randomCell(0, Infinity, 12);
      const w = 0.6 + this.rand() * 1.4, h = 0.5 + this.rand() * 3.5;
      s.set(w, h, w);
      q.setFromAxisAngle(UP, this.rand() * 0.3);
      m.compose(new THREE.Vector3(c.x, c.y + h / 2 - 0.1, c.z), q, s);
      mesh.setMatrixAt(t, m);
      this.pillars.push({ x: c.x, z: c.z, r: w * 0.55, top: c.y + h - 0.1 });
    }
    mesh.instanceMatrix.needsUpdate = true;
    this.group.add(mesh);
  }

  pushOutOfPillars(pos, radius, feetY) {
    for (const p of this.pillars) {
      if (feetY >= p.top - 0.05) continue;
      const dx = pos.x - p.x, dz = pos.z - p.z;
      const d = Math.hypot(dx, dz), min = p.r + radius;
      if (d < min && d > 1e-4) { pos.x += (dx / d) * (min - d); pos.z += (dz / d) * (min - d); }
    }
  }
}
