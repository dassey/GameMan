import * as THREE from 'three';
import { box } from './art.js';

const UP = new THREE.Vector3(0, 1, 0);
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();
const head = new THREE.Vector3();
const tmp = new THREE.Vector3();

function handMesh() {
  const g = box(0.22, 0.18, 0.3, '#e6c53a');
  g.position.set(0, -0.02, 0.05);
  return g;
}

export class VRPanel {
  constructor(camera) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false }));
    this.mesh.renderOrder = 998;
    this.mesh.position.set(0, -0.45, -1.3);
    this.mesh.rotation.x = -0.4;
    this.mesh.visible = false;
    camera.add(this.mesh);
    this.t = 1;
  }

  bar(x, y, w, h, frac, color) {
    const g = this.ctx;
    g.fillStyle = '#23223a';
    g.fillRect(x, y, w, h);
    g.fillStyle = color;
    g.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
    g.strokeStyle = '#14121f';
    g.lineWidth = 3;
    g.strokeRect(x, y, w, h);
  }

  update(dt, s, msg, sub) {
    this.t += dt;
    if (this.t < 0.15) return;
    this.t = 0;
    const g = this.ctx, W = this.canvas.width, H = this.canvas.height;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(20,18,31,0.78)';
    g.fillRect(0, 0, W, H);
    g.font = 'bold 22px "Comic Sans MS", cursive';
    g.textBaseline = 'top';
    g.fillStyle = '#f2d43c';
    g.fillText(`LV ${s.level}`, 16, 12);
    g.fillStyle = '#efe9d8';
    g.fillText('MELLOW', 90, 12);
    this.bar(190, 14, 300, 20, s.hp / s.maxHp, '#4ad25a');
    if (s.salad) {
      g.fillStyle = '#7ac043';
      g.fillText('SALAD', 90, 44);
      this.bar(190, 46, 300, 20, s.salad.hp / s.salad.maxHp, '#7ac043');
    }
    g.fillStyle = '#f2d43c';
    const info = s.utensilsLeft === null ? `FRUIT LEFT: ${s.fruitLeft}` : `UTENSILS LEFT: ${s.utensilsLeft}`;
    g.fillText(info, 16, 78);
    if (s.held) {
      g.fillStyle = '#efe9d8';
      g.fillText(`HOLDING ${s.held.toUpperCase()}  (press A)`, 16, 108);
    }
    if (s.ketchup) {
      g.fillStyle = '#e0503a';
      g.fillText('KETCHUP  (press B)', 300, 78);
    }
    if (s.boost > 0) {
      g.fillStyle = '#c89a5a';
      g.fillText(`CROUTON SPEED ${Math.ceil(s.boost)}`, 300, 108);
    }
    if (msg) {
      g.textAlign = 'center';
      g.font = 'bold 34px "Comic Sans MS", cursive';
      g.fillStyle = '#f2d43c';
      g.fillText(msg, W / 2, 150);
      g.font = '20px "Comic Sans MS", cursive';
      g.fillStyle = '#efe9d8';
      g.fillText(sub || '', W / 2, 196);
      g.textAlign = 'left';
    }
    this.tex.needsUpdate = true;
  }
}

export class VRScare {
  constructor(camera, canvas) {
    this.tex = new THREE.CanvasTexture(canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.group = new THREE.Group();
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: false }));
    bg.position.z = -1.2;
    bg.renderOrder = 999;
    this.face = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), new THREE.MeshBasicMaterial({ map: this.tex, depthTest: false }));
    this.face.position.z = -1.1;
    this.face.renderOrder = 1000;
    this.group.add(bg, this.face);
    this.group.visible = false;
    camera.add(this.group);
  }

  refresh() {
    this.tex.needsUpdate = true;
  }

  show() {
    this.tex.needsUpdate = true;
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
  }

  update() {
    if (!this.group.visible) return;
    this.face.position.x = (Math.random() - 0.5) * 0.06;
    this.face.position.y = (Math.random() - 0.5) * 0.06;
  }
}

export class VR {
  constructor(renderer, scene, camera, player, room, scareCanvas) {
    this.renderer = renderer;
    this.camera = camera;
    this.player = player;
    this.room = room;
    this.dolly = new THREE.Group();
    this.dolly.add(camera);
    scene.add(this.dolly);
    this.active = false;
    this.started = false;
    this.lastHead = new THREE.Vector3();
    this.snapCd = 0;
    this.aHeld = false;
    this.bHeld = false;
    this.onFire = null;
    this.onStart = null;
    this.onEnd = null;
    this.controllers = [];
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    renderer.xr.setFramebufferScaleFactor(0.75);
    for (let i = 0; i < 2; i++) {
      const c = renderer.xr.getController(i);
      c.addEventListener('selectstart', () => { if (this.onFire) this.onFire(c); });
      c.addEventListener('connected', (e) => { c.userData.hand = e.data.handedness; });
      this.dolly.add(c);
      const grip = renderer.xr.getControllerGrip(i);
      grip.add(handMesh());
      this.dolly.add(grip);
      this.controllers.push(c);
    }
    renderer.xr.addEventListener('sessionstart', () => this.begin());
    renderer.xr.addEventListener('sessionend', () => this.end());
    this.panel = new VRPanel(camera);
    this.scare = new VRScare(camera, scareCanvas);
  }

  static async supported() {
    try {
      return !!(navigator.xr && await navigator.xr.isSessionSupported('immersive-vr'));
    } catch (e) {
      return false;
    }
  }

  async enter() {
    const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
    await this.renderer.xr.setSession(session);
  }

  begin() {
    this.active = true;
    this.started = false;
    this.player.vr = true;
    this.player.group.visible = false;
    this.dolly.scale.setScalar(1.3);
    this.dolly.rotation.set(0, 0, 0);
    this.dolly.position.set(this.player.pos.x, 0, this.player.pos.z);
    this.panel.mesh.visible = true;
    if (this.onStart) this.onStart();
  }

  end() {
    this.active = false;
    this.player.vr = false;
    this.player.group.visible = true;
    this.dolly.scale.setScalar(1);
    this.dolly.rotation.set(0, 0, 0);
    this.dolly.position.set(0, 0, 0);
    this.camera.rotation.set(0, 0, 0);
    this.panel.mesh.visible = false;
    this.scare.hide();
    if (this.onEnd) this.onEnd();
  }

  aimRay(origin, dir) {
    const c = this.controllers.find((k) => k.userData.hand === 'right') || this.controllers[0];
    return this.controllerRay(c, origin, dir);
  }

  controllerRay(c, origin, dir) {
    c.getWorldPosition(origin);
    c.getWorldDirection(dir).negate();
    return dir;
  }

  frameBegin() {
    this.camera.getWorldPosition(head);
    if (this.started) {
      this.player.pos.x += head.x - this.lastHead.x;
      this.player.pos.z += head.z - this.lastHead.z;
      this.room.resolve(this.player.pos, this.player.radius);
    }
    this.started = true;
  }

  input(dt) {
    const move = { x: 0, z: 0 };
    let a = false, b = false;
    this.snapCd = Math.max(0, this.snapCd - dt);
    const session = this.renderer.xr.getSession();
    if (session) {
      for (const src of session.inputSources) {
        const gp = src.gamepad;
        if (!gp) continue;
        const ax = gp.axes;
        const sx = ax.length >= 4 ? ax[2] : (ax[0] || 0), sy = ax.length >= 4 ? ax[3] : (ax[1] || 0);
        if (src.handedness === 'left') {
          if (Math.abs(sx) > 0.15 || Math.abs(sy) > 0.15) {
            this.camera.getWorldDirection(fwd);
            fwd.y = 0;
            fwd.normalize();
            right.crossVectors(fwd, UP);
            move.x = fwd.x * -sy + right.x * sx;
            move.z = fwd.z * -sy + right.z * sx;
          }
        } else if (src.handedness === 'right') {
          if (Math.abs(sx) > 0.6 && this.snapCd <= 0) {
            this.snapTurn(sx > 0 ? -Math.PI / 6 : Math.PI / 6);
            this.snapCd = 0.3;
          }
        }
        if (gp.buttons[4] && gp.buttons[4].pressed) a = true;
        if (gp.buttons[5] && gp.buttons[5].pressed) b = true;
      }
    }
    const aEdge = a && !this.aHeld, bEdge = b && !this.bHeld;
    this.aHeld = a;
    this.bHeld = b;
    return { move, a: aEdge, b: bEdge };
  }

  snapTurn(angle) {
    this.camera.getWorldPosition(head);
    const hx = head.x, hz = head.z;
    this.dolly.rotation.y += angle;
    this.dolly.updateMatrixWorld(true);
    this.camera.getWorldPosition(tmp);
    this.dolly.position.x += hx - tmp.x;
    this.dolly.position.z += hz - tmp.z;
    this.dolly.updateMatrixWorld(true);
    head.set(hx, head.y, hz);
  }

  frameEnd() {
    this.dolly.position.x += this.player.pos.x - head.x;
    this.dolly.position.z += this.player.pos.z - head.z;
    this.lastHead.set(this.player.pos.x, 0, this.player.pos.z);
  }
}
