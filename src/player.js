import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const GRAVITY = 16;
const JUMP_V = 7.6;
const EYE = 1.62;
const STEP_UP = 1.05;

export function makeHand(side) {
  const g = new THREE.Group();
  const suit = new THREE.MeshLambertMaterial({ color: 0x151515 });
  const cuff = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xb9a774 });
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.07, 0.2), suit);
  sleeve.position.set(0, 0, 0.13);
  const cuffM = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.075, 0.03), cuff);
  cuffM.position.set(0, 0, 0.02);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.03, 0.09), skin);
  hand.position.set(0, 0, -0.04);
  const fist = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.045, 0.045), skin);
  fist.position.set(0, -0.005, -0.1);
  const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.035), skin);
  thumb.position.set(side === 'left' ? 0.04 : -0.04, 0.01, -0.06);
  g.add(sleeve, cuffM, hand, fist, thumb);
  return g;
}

export class Player {
  constructor({ renderer, camera, scene, world, audio }) {
    this.renderer = renderer; this.camera = camera; this.scene = scene; this.world = world; this.audio = audio;
    this.dolly = new THREE.Group();
    this.dolly.add(camera);
    scene.add(this.dolly);
    camera.position.set(0, EYE, 0);
    this.pos = new THREE.Vector3();
    this.vy = 0; this.grounded = true; this.yaw = 0; this.pitch = 0;
    this.hp = 100; this.maxHP = 100; this.speed = 4.4; this.damage = 10;
    this.invuln = 0; this.dead = false;
    this.thirdPerson = false; this.inXR = false;
    this.keys = {};
    this.onPunch = null;
    this.onJump = null;
    this.snapCooldown = 0;
    this.moveVec = new THREE.Vector2();
    this.hands = { left: null, right: null };
    this.handPrev = { left: new THREE.Vector3(), right: new THREE.Vector3() };
    this.handVel = { left: new THREE.Vector3(), right: new THREE.Vector3() };
    this.handCooldown = { left: 0, right: 0 };
    this.punchAnim = { left: 0, right: 0 };
    this.setupDesktopHands();
    this.setupXR();
    this.setupInput();
    this.respawn(world.spawn);
  }

  setupDesktopHands() {
    this.desktopHands = new THREE.Group();
    this.dh = { left: makeHand('left'), right: makeHand('right') };
    this.dh.left.position.set(-0.28, -0.25, -0.5); this.dh.left.rotation.set(0.4, 0.25, 0);
    this.dh.right.position.set(0.28, -0.25, -0.5); this.dh.right.rotation.set(0.4, -0.25, 0);
    this.desktopHands.add(this.dh.left, this.dh.right);
    this.camera.add(this.desktopHands);
  }

  setupXR() {
    const xr = this.renderer.xr;
    this.grips = [];
    for (let i = 0; i < 2; i++) {
      const grip = xr.getControllerGrip(i);
      grip.userData.hand = null;
      this.dolly.add(grip);
      const ctrl = xr.getController(i);
      this.dolly.add(ctrl);
      ctrl.addEventListener('connected', (e) => {
        const h = e.data.handedness === 'left' ? 'left' : 'right';
        grip.userData.hand = h;
        grip.clear();
        const mesh = makeHand(h);
        mesh.rotation.x = -0.5;
        grip.add(mesh);
        this.hands[h] = grip;
        if (h === 'left' && this.wristPanel) grip.add(this.wristPanel);
      });
      ctrl.addEventListener('disconnected', () => { if (grip.userData.hand) this.hands[grip.userData.hand] = null; grip.userData.hand = null; grip.clear(); });
      this.grips.push(grip);
    }
    xr.addEventListener('sessionstart', () => { this.inXR = true; this.desktopHands.visible = false; this.camera.position.set(0, 0, 0); this.camera.rotation.set(0, 0, 0); });
    xr.addEventListener('sessionend', () => { this.inXR = false; this.desktopHands.visible = !this.thirdPerson; this.camera.position.set(0, EYE, 0); this.dolly.position.copy(this.pos); });
  }

  attachWristPanel(panel) {
    this.wristPanel = panel;
    if (this.hands.left) this.hands.left.add(panel);
  }

  setupInput() {
    window.addEventListener('keydown', (e) => { this.keys[e.code] = true; if (e.code === 'Space') e.preventDefault(); });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    document.addEventListener('pointerlockchange', () => { this.lockT = performance.now(); });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== this.renderer.domElement) return;
      if (performance.now() - this.lockT < 250 && (Math.abs(e.movementX) > 100 || Math.abs(e.movementY) > 100)) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch - e.movementY * 0.0022));
    });
    this.renderer.domElement.addEventListener('mousedown', (e) => {
      if (document.pointerLockElement !== this.renderer.domElement || this.inXR) return;
      this.desktopPunch(e.button === 2 ? 'left' : 'right');
    });
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  respawn(at) {
    this.pos.copy(at);
    this.pos.y = this.world.groundAt(at.x, at.z);
    this.dolly.position.copy(this.pos);
    this.vy = 0; this.dead = false; this.hp = this.maxHP; this.invuln = 2;
    if (this.inXR) this.recentre();
  }

  recentre() {
    const head = new THREE.Vector3(); this.camera.getWorldPosition(head);
    this.dolly.position.x += this.pos.x - head.x;
    this.dolly.position.z += this.pos.z - head.z;
  }

  headPos() { const v = new THREE.Vector3(); this.camera.getWorldPosition(v); return v; }

  forward() {
    const d = new THREE.Vector3(); this.camera.getWorldDirection(d); return d;
  }

  takeDamage(n, fromPos) {
    if (this.invuln > 0 || this.dead) return false;
    this.hp -= n; this.invuln = 0.8;
    this.audio.hurt();
    if (fromPos) {
      const k = new THREE.Vector3().subVectors(this.pos, fromPos).setY(0).normalize().multiplyScalar(0.9);
      this.world.moveWithCollision(this.pos, k.x, k.z, this.pos.y, STEP_UP);
      if (!this.inXR) this.dolly.position.x = this.pos.x, this.dolly.position.z = this.pos.z; else this.recentre();
    }
    if (this.hp <= 0) { this.hp = 0; this.dead = true; this.audio.die(); }
    return true;
  }

  heal(n) { this.hp = Math.min(this.maxHP, this.hp + n); }

  desktopPunch(hand) {
    if (this.punchAnim[hand] > 0) return;
    this.punchAnim[hand] = 1;
    this.audio.punch();
    const origin = this.headPos();
    if (this.onPunch) this.onPunch(origin, this.forward(), hand, 1);
  }

  update(dt) {
    this.invuln = Math.max(0, this.invuln - dt);
    this.snapCooldown = Math.max(0, this.snapCooldown - dt);
    const xrSession = this.inXR ? this.renderer.xr.getSession() : null;
    let mx = 0, mz = 0, jump = false, snap = 0;

    if (xrSession) {
      for (const src of xrSession.inputSources) {
        const gp = src.gamepad; if (!gp) continue;
        const ax = gp.axes.length >= 4 ? [gp.axes[2], gp.axes[3]] : [gp.axes[0] || 0, gp.axes[1] || 0];
        if (src.handedness === 'left') {
          if (Math.abs(ax[0]) > 0.15) mx = ax[0];
          if (Math.abs(ax[1]) > 0.15) mz = ax[1];
          if (gp.buttons[4]?.pressed || gp.buttons[5]?.pressed) jump = true;
        } else {
          if (Math.abs(ax[0]) > 0.6 && this.snapCooldown === 0) { snap = ax[0] > 0 ? -1 : 1; this.snapCooldown = 0.3; }
          if (gp.buttons[4]?.pressed || gp.buttons[5]?.pressed || gp.buttons[0]?.pressed) jump = true;
          if (Math.abs(ax[1]) > 0.15 && Math.abs(mz) < 0.15) mz = ax[1];
        }
      }
      if (snap) {
        const head = this.headPos();
        this.dolly.position.sub(head).applyAxisAngle(UP, snap * Math.PI / 6).add(head);
        this.dolly.rotation.y += snap * Math.PI / 6;
      }
    } else {
      if (this.keys.KeyW || this.keys.ArrowUp) mz -= 1;
      if (this.keys.KeyS || this.keys.ArrowDown) mz += 1;
      if (this.keys.KeyA || this.keys.ArrowLeft) mx -= 1;
      if (this.keys.KeyD || this.keys.ArrowRight) mx += 1;
      if (this.keys.Space) jump = true;
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of pads) {
        if (!gp) continue;
        if (Math.abs(gp.axes[0]) > 0.2) mx += gp.axes[0];
        if (Math.abs(gp.axes[1]) > 0.2) mz += gp.axes[1];
        if (Math.abs(gp.axes[2]) > 0.2) this.yaw -= gp.axes[2] * 2.2 * dt;
        if (Math.abs(gp.axes[3]) > 0.2) this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch - gp.axes[3] * 1.8 * dt));
        if (gp.buttons[0]?.pressed) jump = true;
        if (gp.buttons[2]?.pressed || gp.buttons[7]?.pressed) this.desktopPunch('right');
        if (gp.buttons[3]?.pressed || gp.buttons[6]?.pressed) this.desktopPunch('left');
      }
      this.dolly.rotation.y = this.yaw;
      this.camera.rotation.x = this.thirdPerson ? Math.min(this.pitch, 0.2) : this.pitch;
      const run = this.keys.ShiftLeft || this.keys.ShiftRight ? 1.5 : 1;
      mx *= run; mz *= run;
    }

    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    if (len > 0) {
      const f = this.forward(); f.y = 0; f.normalize();
      const r = new THREE.Vector3().crossVectors(f, UP);
      const move = new THREE.Vector3().addScaledVector(f, -mz).addScaledVector(r, mx).multiplyScalar(this.speed * dt);
      const before = this.pos.clone();
      this.world.moveWithCollision(this.pos, move.x, move.z, this.pos.y, this.grounded ? STEP_UP : 0.3);
      this.world.pushOutOfPillars(this.pos, 0.35, this.pos.y);
      this.dolly.position.x += this.pos.x - before.x;
      this.dolly.position.z += this.pos.z - before.z;
      this.moving = true;
    } else this.moving = false;

    if (this.inXR) { const h = this.headPos(); this.pos.x = h.x; this.pos.z = h.z; }

    const ground = this.world.groundAt(this.pos.x, this.pos.z);
    if (jump && this.grounded && !this.dead) { this.vy = JUMP_V; this.grounded = false; this.audio.jump(); if (this.onJump) this.onJump(); }
    if (this.grounded && this.pos.y > ground + 0.01) { this.grounded = false; }
    if (!this.grounded) {
      this.vy -= GRAVITY * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= ground) { this.pos.y = ground; this.vy = 0; this.grounded = true; }
    } else {
      this.pos.y += (ground - this.pos.y) * Math.min(1, dt * 14);
      if (Math.abs(ground - this.pos.y) < 0.01) this.pos.y = ground;
    }
    this.dolly.position.y = this.pos.y;

    for (const h of ['left', 'right']) {
      if (this.punchAnim[h] > 0) {
        this.punchAnim[h] = Math.max(0, this.punchAnim[h] - dt * 4);
        const t = Math.sin(this.punchAnim[h] * Math.PI);
        this.dh[h].position.z = -0.5 - t * 0.45;
        this.dh[h].position.x = (h === 'left' ? -0.28 : 0.28) * (1 - t * 0.6);
      }
    }
    if (!this.inXR) {
      const bob = this.moving && this.grounded ? Math.sin(performance.now() * 0.012) * 0.03 : 0;
      if (this.thirdPerson) this.camera.position.set(0, EYE + 1.2, 4.2); else this.camera.position.set(0, EYE + bob, 0);
    }

    if (this.inXR) {
      for (const h of ['left', 'right']) {
        const grip = this.hands[h]; if (!grip) continue;
        const p = new THREE.Vector3(); grip.getWorldPosition(p);
        this.handVel[h].subVectors(p, this.handPrev[h]).divideScalar(Math.max(dt, 1e-3));
        this.handPrev[h].copy(p);
        this.handCooldown[h] = Math.max(0, this.handCooldown[h] - dt);
        const speed = this.handVel[h].length();
        if (speed > 2.6 && this.handCooldown[h] === 0 && this.onPunch) {
          if (this.onPunch(p, null, h, Math.min(2, speed / 3))) { this.handCooldown[h] = 0.35; this.audio.punch(); }
        }
      }
    }
  }
}
