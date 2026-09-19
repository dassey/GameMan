function blob(g, x, y, rx, ry, inner, outer) {
  const grad = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

function drawFace(c) {
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 512, 512);
  blob(g, 256, 250, 190, 240, '#cfcfcf', 'rgba(0,0,0,0)');
  blob(g, 256, 110, 120, 70, 'rgba(230,230,230,0.5)', 'rgba(0,0,0,0)');
  for (const x of [175, 337]) {
    blob(g, x, 185, 85, 70, '#000', 'rgba(0,0,0,0)');
    blob(g, x, 185, 60, 50, '#000', 'rgba(0,0,0,0)');
    g.fillStyle = '#e8e8e8';
    g.beginPath();
    g.ellipse(x, 180, 30, 23, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#555';
    g.beginPath();
    g.arc(x, 180, 13, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#000';
    g.beginPath();
    g.arc(x, 180, 8, 0, Math.PI * 2);
    g.fill();
  }
  blob(g, 256, 255, 26, 60, 'rgba(235,235,235,0.7)', 'rgba(0,0,0,0)');
  blob(g, 236, 292, 12, 8, '#000', 'rgba(0,0,0,0)');
  blob(g, 278, 292, 12, 8, '#000', 'rgba(0,0,0,0)');
  g.fillStyle = '#030303';
  g.beginPath();
  g.moveTo(125, 325);
  g.quadraticCurveTo(256, 300, 387, 325);
  g.quadraticCurveTo(256, 470, 125, 325);
  g.fill();
  g.fillStyle = '#f2f2f2';
  for (let i = 0; i < 9; i++) {
    const x = 160 + i * 22, mid = Math.abs(i - 4);
    g.fillRect(x, 322 + mid * 1.5, 19, 30 - mid * 3);
  }
  g.fillStyle = '#d8d8d8';
  for (let i = 0; i < 7; i++) {
    const x = 182 + i * 22, mid = Math.abs(i - 3);
    g.fillRect(x, 392 - mid * 7, 19, 22 - mid * 2);
  }
  g.strokeStyle = 'rgba(0,0,0,0.6)';
  g.lineWidth = 6;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(256 + s * 60, 285);
    g.quadraticCurveTo(256 + s * 150, 300, 256 + s * 140, 360);
    g.stroke();
  }
  const img = g.getImageData(0, 0, 512, 512), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 38;
    const v = Math.max(0, Math.min(255, (d[i] + d[i + 1] + d[i + 2]) / 3 + n));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  g.putImageData(img, 0, 0);
}

export function initScare(onChange) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  drawFace(canvas);
  const img = new Image();
  img.onload = () => {
    const g = canvas.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, 512, 512);
    g.drawImage(img, 0, 0, 512, 512);
    if (onChange) onChange();
  };
  img.src = 'scare.png';
  return canvas;
}
