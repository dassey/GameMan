import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const secure = !process.argv.includes('--http');
const port = Number(process.env.PORT || (secure ? 8443 : 8080));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp4': 'video/mp4', '.css': 'text/css', '.md': 'text/plain' };

function handler(req, res) {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(root, p));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

function lanIps() {
  return Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
}

if (secure) {
  const certDir = path.join(root, '.cert');
  const key = path.join(certDir, 'key.pem'), cert = path.join(certDir, 'cert.pem');
  if (!fs.existsSync(key)) {
    fs.mkdirSync(certDir, { recursive: true });
    const san = ['DNS:localhost', ...lanIps().map((ip) => `IP:${ip}`)].join(',');
    execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout "${key}" -out "${cert}" -days 365 -subj "/CN=agent-pixel" -addext "subjectAltName=${san}"`, { stdio: 'ignore' });
    console.log('generated self-signed certificate in .cert/');
  }
  https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, handler).listen(port, () => {
    console.log(`Agent Pixel running (HTTPS). On the Quest browser open one of:`);
    for (const ip of lanIps()) console.log(`  https://${ip}:${port}`);
    console.log('  (accept the self-signed certificate warning once)');
  });
} else {
  http.createServer(handler).listen(port, () => console.log(`http://localhost:${port}`));
}
