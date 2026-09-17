import * as THREE from 'three';

const loader = new THREE.TextureLoader();

function pixel(tex) {
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function loadPixelTexture(url, repeat = true) {
  const t = pixel(loader.load(url));
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function canvasTexture(w, h, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = pixel(new THREE.CanvasTexture(c));
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function grassTopTexture(rand) {
  const greens = ['#3f6b2a', '#4a7a30', '#557f34', '#3a5f27', '#63913c'];
  return canvasTexture(64, 64, (ctx) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      ctx.fillStyle = greens[Math.floor(rand() * greens.length)];
      ctx.fillRect(x * 4, y * 4, 4, 4);
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rand() < 0.5 ? '#7fae4a' : '#2f4f20';
      ctx.fillRect(Math.floor(rand() * 64), Math.floor(rand() * 64), 2, 2);
    }
  });
}

export function grassTuftTexture(rand) {
  return canvasTexture(32, 24, (ctx) => {
    ctx.clearRect(0, 0, 32, 24);
    const greens = ['#4f8a2f', '#6da842', '#3c6b25', '#88c14f'];
    for (let b = 0; b < 11; b++) {
      const x = 2 + Math.floor(rand() * 28);
      const hgt = 6 + Math.floor(rand() * 16);
      ctx.fillStyle = greens[Math.floor(rand() * greens.length)];
      for (let y = 0; y < hgt; y++) {
        const dx = Math.round((y / hgt) * (rand() < 0.5 ? -2 : 2));
        ctx.fillRect(x + dx, 23 - y, 2, 1);
      }
    }
  }, false);
}

export function sparkTexture() {
  return canvasTexture(8, 8, (ctx) => {
    ctx.fillStyle = '#ffe94a'; ctx.fillRect(0, 0, 8, 8);
    ctx.fillStyle = '#fff7b0'; ctx.fillRect(2, 2, 3, 3);
  }, false);
}

export function tieTexture() {
  return canvasTexture(8, 24, (ctx) => {
    ctx.clearRect(0, 0, 8, 24);
    ctx.fillStyle = '#f2c230';
    ctx.fillRect(2, 0, 4, 4); ctx.fillRect(1, 4, 6, 14); ctx.fillRect(2, 18, 4, 4); ctx.fillRect(3, 22, 2, 2);
    ctx.fillStyle = '#ffe98a'; ctx.fillRect(3, 6, 1, 10);
  }, false);
}

export function goldGlassesTexture() {
  return canvasTexture(24, 10, (ctx) => {
    ctx.clearRect(0, 0, 24, 10);
    ctx.fillStyle = '#f2c230';
    ctx.fillRect(0, 2, 10, 7); ctx.fillRect(14, 2, 10, 7); ctx.fillRect(10, 4, 4, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, 4, 6, 3); ctx.fillRect(16, 4, 6, 3);
  }, false);
}

export function eyeTexture() {
  return canvasTexture(8, 4, (ctx) => {
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 8, 4);
    ctx.fillStyle = '#ffe94a'; ctx.fillRect(1, 1, 2, 2); ctx.fillRect(5, 1, 2, 2);
  }, false);
}
