import * as THREE from 'three';
import { mulberry32 } from './noise.js';

const matCache = new Map();
let lineMaterial = null;

export function scribbleCanvas(w, h, base, ink, seed = 1, density = 1) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 0.16;
  for (let i = 0; i < 30 * density; i++) {
    g.fillStyle = rnd() < 0.5 ? ink : '#ffffff';
    const x = rnd() * w, y = rnd() * h, r = 3 + rnd() * w * 0.18;
    g.beginPath();
    g.ellipse(x, y, r, r * (0.4 + rnd() * 0.6), rnd() * 6.28, 0, 6.28);
    g.fill();
  }
  g.globalAlpha = 0.32;
  g.strokeStyle = ink;
  for (let i = 0; i < 70 * density; i++) {
    g.lineWidth = 0.6 + rnd() * 1.2;
    const x = rnd() * w, y = rnd() * h, len = 5 + rnd() * w * 0.2;
    const a = (rnd() < 0.5 ? 0.6 : 2.2) + (rnd() - 0.5) * 0.5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  g.globalAlpha = 1;
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 36;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function canvasTexture(canvas, repeat = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  return t;
}

export function mat(color, opts = {}) {
  const repeat = opts.repeat || 1, seed = opts.seed || 1;
  const key = `${color}|${repeat}|${seed}|${opts.ink || ''}`;
  if (!opts.unique && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshLambertMaterial({
    map: canvasTexture(scribbleCanvas(64, 64, color, opts.ink || '#161428', seed), repeat),
    transparent: !!opts.transparent,
    side: opts.side || THREE.FrontSide,
  });
  if (!opts.unique) matCache.set(key, m);
  return m;
}

export function lineMat(unique = false) {
  if (unique) return new THREE.LineBasicMaterial({ color: 0x14121f, transparent: true });
  if (!lineMaterial) lineMaterial = new THREE.LineBasicMaterial({ color: 0x14121f });
  return lineMaterial;
}

function withEdges(geo, material, angle = 20, unique = false) {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(geo, material);
  g.add(mesh);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, angle), lineMat(unique));
  g.add(edges);
  g.userData.mesh = mesh;
  g.userData.edges = edges;
  return g;
}

export function box(w, h, d, color, opts = {}) {
  return withEdges(new THREE.BoxGeometry(w, h, d), mat(color, opts), 20, opts.unique);
}

export function cyl(rt, rb, h, color, seg = 10, opts = {}) {
  return withEdges(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, opts), 25, opts.unique);
}

export function ball(r, color, opts = {}) {
  return withEdges(new THREE.IcosahedronGeometry(r, 1), mat(color, opts), 40, opts.unique);
}

export function eyes(parent, y, z, spread = 0.22, size = 0.14) {
  const m = new THREE.MeshBasicMaterial({ color: 0x14121f });
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(size, size * 1.4, 0.06), m);
    e.position.set(s * spread, y, z);
    parent.add(e);
  }
}

export function floorMark(radius, color = 0x2a1a10) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }));
  disc.rotation.x = -Math.PI / 2;
  g.add(disc);
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 1.2, radius * 1.45, 10), new THREE.MeshBasicMaterial({ color: 0x14121f, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  g.add(ring);
  g.position.y = 0.03;
  return g;
}

export function setOpacity(group, opacity) {
  group.traverse((o) => {
    if (o.material) {
      o.material.transparent = true;
      o.material.opacity = opacity;
    }
  });
}
