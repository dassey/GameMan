import * as THREE from 'three';
import { Room } from './room.js';
import { Player } from './player.js';
import { Grapple } from './grapple.js';
import { Fruits, Salad } from './fruit.js';
import { Utensils } from './utensils.js';
import { Toppings } from './toppings.js';
import { Progression } from './progression.js';
import { Particles } from './fx.js';
import { HUD } from './hud.js';
import { Audio } from './audio.js';
import { Grain } from './grain.js';
import { VR } from './vr.js';

const $ = (id) => document.getElementById(id);
const CAM_OFFSET = new THREE.Vector3(0, 22, 13);
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1);
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2(0, -0.5);
const aimPoint = new THREE.Vector3(0, 1, -10);
const tmp = new THREE.Vector3();
const rayOrigin = new THREE.Vector3();
const rayDir = new THREE.Vector3();
const noUtensils = { hitTest: () => null };

function drawLemon(canvas) {
  const w = canvas.width = 520, h = canvas.height = 520;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, w, h);
  g.save();
  g.translate(w / 2, h / 2);
  g.rotate(-0.25);
  g.fillStyle = '#f3e03a';
  g.strokeStyle = '#3a2f10';
  g.lineWidth = 10;
  g.beginPath();
  g.ellipse(0, 0, 215, 150, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(s * 190, -45);
    g.lineTo(s * 255, -10);
    g.lineTo(s * 190, 40);
    g.closePath();
    g.fill();
    g.stroke();
  }
  g.fillStyle = 'rgba(120,100,20,0.35)';
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * 6.283, r = Math.random() * 180;
    g.beginPath();
    g.arc(Math.cos(a) * r, Math.sin(a) * r * 0.65, 2 + Math.random() * 4, 0, 6.283);
    g.fill();
  }
  for (const s of [-1, 1]) {
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.ellipse(s * 70, -45, 40, 48, 0, 0, 6.283);
    g.fill();
    g.stroke();
    g.fillStyle = '#100c08';
    g.beginPath();
    g.arc(s * 62, -38, 14, 0, 6.283);
    g.fill();
    g.lineWidth = 14;
    g.beginPath();
    g.moveTo(s * 20, -110);
    g.lineTo(s * 115, -80);
    g.stroke();
    g.lineWidth = 10;
  }
  g.fillStyle = '#100c08';
  g.beginPath();
  g.ellipse(0, 60, 95, 62, 0, 0, 6.283);
  g.fill();
  g.stroke();
  g.fillStyle = '#b0202a';
  g.beginPath();
  g.ellipse(0, 85, 55, 30, 0, 0, 6.283);
  g.fill();
  g.fillStyle = '#ffffff';
  for (let i = -3; i <= 3; i++) {
    g.beginPath();
    g.moveTo(i * 24 - 11, 4);
    g.lineTo(i * 24 + 11, 4);
    g.lineTo(i * 24, 34);
    g.closePath();
    g.fill();
  }
  g.restore();
}

function boot() {
  const canvas = $('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(0.5);
  renderer.setSize(innerWidth, innerHeight);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1c2f57);
  scene.fog = new THREE.Fog(0x1c2f57, 70, 150);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 300);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x22305a, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(20, 40, 10);
  scene.add(sun);

  const audio = new Audio();
  const hud = new HUD();
  const grain = new Grain($('grain'));
  const room = new Room(scene);
  const player = new Player(scene, room);
  const grapple = new Grapple(scene, player);
  const fruits = new Fruits(scene, room, 4);
  const toppings = new Toppings(scene, room);
  const particles = new Particles(scene);
  const prog = new Progression();
  const vr = new VR(renderer, scene, camera, player, room);
  let salad = null, utensils = null;
  const state = { phase: 'menu', paused: false, loseT: 0, scared: false, ended: false, vr: false };
  const keys = new Set();
  let fireQueued = false;

  const playing = () => (state.phase === 'collect' || state.phase === 'defend') && !state.paused;

  function openMenu() {
    state.paused = true;
    $('overlay').style.display = 'flex';
    $('playbtn').textContent = 'CONTINUE';
  }

  function useTopping() {
    if (!playing() || !player.held || player.knocked > 0) return;
    if (player.held === 'ranch') {
      if (!salad || Math.hypot(player.pos.x - salad.pos.x, player.pos.z - salad.pos.z) > salad.radius + 6) {
        hud.message('GET CLOSER TO THE SALAD', 'ranch goes on the salad', 1.5);
        return;
      }
      salad.activateRanch(9);
      audio.spray();
      hud.message('ACID RANCH!', 'utensils that touch the salad melt', 2.5);
      particles.burst(tmp.set(salad.pos.x, 3, salad.pos.z), 40, 0xf4f1e6, 10, 1.2);
    } else {
      player.boostT = 10;
      audio.grab();
      hud.message('CROUTON SPEED!', 'zoom for 10 seconds', 1.5);
    }
    player.held = null;
  }

  function startDefend() {
    salad = new Salad(scene, new THREE.Vector3(0, 0, -2));
    room.addCircle(salad.pos.x, salad.pos.z, salad.radius);
    room.resolve(player.pos, player.radius);
    utensils = new Utensils(scene, room, salad, player, particles, audio);
    state.phase = 'defend';
    hud.message('GIANT SALAD!', 'defend it from the utensils!', 3.5);
    audio.levelup();
    particles.burst(tmp.set(0, 3, -2), 60, 0x7ac043, 12, 1.4);
  }

  function startLose() {
    state.phase = 'lose';
    state.loseT = 0;
    audio.fire();
    $('flash').style.opacity = 0.45;
    hud.message('THE SALAD IS GONE!', '', 2.5);
  }

  function showEnd(title, text) {
    state.ended = true;
    $('scare').style.display = 'none';
    vr.lemon.hide();
    $('endtitle').textContent = title;
    $('endtext').textContent = text;
    $('end').style.display = 'flex';
    if (state.vr) hud.message(title, 'press A to play again', 999);
  }

  function startWin() {
    state.phase = 'win';
    audio.win();
    particles.burst(tmp.set(player.pos.x, 2, player.pos.z), 80, 0xf2d43c, 12, 1.6);
    showEnd('YOU WIN!', `Mellow saved the salad. All ${utensils.total} utensils are gone. Level ${prog.level}.`);
  }

  function startGame() {
    if (state.phase === 'menu') {
      state.phase = 'collect';
      hud.message('GRAB ALL THE FRUIT!', 'bananas, mangoes and oranges', 3.5);
    }
    state.paused = false;
    $('overlay').style.display = 'none';
  }

  addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Escape' && (state.phase === 'collect' || state.phase === 'defend') && !state.vr) {
      if (state.paused) { state.paused = false; $('overlay').style.display = 'none'; } else openMenu();
    }
    if (e.code === 'KeyE') useTopping();
    if (e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  addEventListener('mousemove', (e) => {
    mouseNDC.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && playing() && !state.vr) fireQueued = true;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const inf = $('inf');
  try { inf.checked = localStorage.getItem('sdn-infinite') === '1'; } catch (e) { }
  player.infinite = inf.checked;
  inf.onchange = () => {
    player.infinite = inf.checked;
    try { localStorage.setItem('sdn-infinite', inf.checked ? '1' : '0'); } catch (e) { }
  };
  $('playbtn').onclick = () => {
    audio.init();
    startGame();
  };
  $('retrybtn').onclick = () => location.reload();
  $('loading').style.display = 'none';

  const vrbtn = $('vrbtn');
  VR.supported().then((ok) => {
    vrbtn.disabled = !ok;
    vrbtn.textContent = ok ? 'ENTER VR' : 'NO VR HEADSET';
  });
  vrbtn.onclick = () => {
    audio.init();
    vr.enter().catch(() => { vrbtn.textContent = 'VR FAILED'; });
  };
  vr.onStart = () => {
    state.vr = true;
    startGame();
  };
  vr.onEnd = () => {
    state.vr = false;
    grapple.originObj = null;
    camera.position.copy(player.pos).add(CAM_OFFSET);
    if (state.phase === 'collect' || state.phase === 'defend') openMenu();
  };
  vr.onFire = (c) => {
    if (!playing() || player.knocked > 0) return;
    vr.controllerRay(c, rayOrigin, rayDir);
    grapple.originObj = c;
    if (grapple.fire(rayDir, rayOrigin)) audio.shoot();
  };

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });

  camera.position.copy(player.pos).add(CAM_OFFSET);
  function tick(dt, now) {
    grain.update();
    let vrIn = null;
    if (state.vr) {
      vrIn = vr.input(dt);
      if (vrIn.a) {
        if (state.ended) location.reload();
        else useTopping();
      }
      vr.lemon.update(dt);
    }
    if (playing()) {
      room.update(dt, player.pos);
      particles.update(dt);
      player.speedMul = prog.speedMul;
      grapple.rangeBonus = prog.rangeBonus;
      let move = null;
      if (state.vr) {
        vr.frameBegin();
        move = { x: vrIn.move.x * 0.75, z: vrIn.move.z * 0.75 };
      } else {
        raycaster.setFromCamera(mouseNDC, camera);
        raycaster.ray.intersectPlane(aimPlane, aimPoint);
      }
      player.update(dt, keys, state.vr ? null : aimPoint, move);
      if (utensils) utensils.pushOut(player.pos, player.radius);
      if (fireQueued) {
        fireQueued = false;
        if (player.knocked <= 0 && grapple.fire(player.aim)) audio.shoot();
      }
      fruits.update(dt);
      toppings.update(dt);
      const got = fruits.collect(player.pos, player.radius);
      if (got.length) {
        audio.grab();
        particles.burst(tmp.set(player.pos.x, 1.2, player.pos.z), 10, 0xf2d43c, 6);
        prog.addXP(5 * got.length);
        if (fruits.remaining === 0 && state.phase === 'collect') startDefend();
        else hud.message(`${fruits.remaining} FRUIT LEFT`, '', 1);
      }
      const tp = toppings.pickup(player.pos, player.radius);
      if (tp) {
        player.held = tp;
        audio.grab();
        hud.message(tp === 'ranch' ? 'GOT RANCH' : 'GOT A CROUTON', state.vr ? 'press A to use it' : 'press E to use it', 2);
      }
      if (state.phase === 'defend') {
        salad.update(dt);
        const ev = utensils.update(dt);
        const hit = grapple.update(dt, utensils);
        if (hit) {
          ev.kills.push(utensils.kill(hit));
          audio.hit();
        }
        for (const u of ev.playerHits) {
          const r = player.takeDamage(12, u.pos);
          if (r) audio.hurt();
          if (r === 'ko') hud.message('MELLOW IS DOWN!', 'getting back up...', 2.5);
        }
        let xpGain = 0;
        for (const xp of ev.kills) xpGain += xp;
        if (xpGain) {
          const ups = prog.addXP(xpGain);
          if (ups) {
            audio.levelup();
            hud.message(`LEVEL ${prog.level}!`, 'faster, and the chain reaches further', 2);
          }
        }
        $('flash').style.opacity = ev.saladDamage ? 0.25 : 0;
        if (utensils.killed >= utensils.total) startWin();
        else if (salad.dead) startLose();
      } else {
        grapple.update(dt, noUtensils);
      }
      if (state.vr) {
        vr.frameEnd();
      } else {
        tmp.copy(player.pos).add(CAM_OFFSET);
        camera.position.lerp(tmp, 1 - Math.pow(0.002, dt));
        camera.lookAt(player.pos.x, 1, player.pos.z - 3);
      }
    } else if (state.phase === 'lose') {
      state.loseT += dt;
      particles.update(dt);
      room.update(dt, player.pos);
      if (state.loseT < 2.8) {
        for (let k = 0; k < 8; k++) {
          particles.spawn(player.pos.x + (Math.random() - 0.5) * 44, 28, player.pos.z + (Math.random() - 0.5) * 44,
            (Math.random() - 0.5) * 3, -22 - Math.random() * 8, (Math.random() - 0.5) * 3,
            Math.random() < 0.5 ? 0xff5a1a : 0xffc21a, 1.6, 0);
        }
        if (!state.vr) {
          camera.position.x += (Math.random() - 0.5) * 0.4;
          camera.position.y += (Math.random() - 0.5) * 0.4;
        }
      }
      if (state.loseT > 2.6 && !state.scared) {
        state.scared = true;
        if (state.vr) {
          vr.lemon.show(drawLemon);
        } else {
          drawLemon($('lemon'));
          $('scare').style.display = 'flex';
        }
        audio.scream();
      }
      if (state.loseT > 4.4 && !state.ended) showEnd('GAME OVER', 'The utensils ate the whole salad.');
    } else if (state.phase === 'win') {
      particles.update(dt);
      room.update(dt, player.pos);
      if (!state.vr) {
        camera.position.x = player.pos.x + Math.sin(now / 1500) * 6;
        camera.lookAt(player.pos.x, 1, player.pos.z);
      }
    }
    const hs = {
      salad, hp: player.hp, maxHp: player.maxHp, level: prog.level, xp: prog.xp, xpToNext: prog.xpToNext,
      utensilsLeft: utensils ? utensils.remaining : null, fruitLeft: fruits.remaining, held: player.held, boost: player.boostT,
    };
    hud.update(hs, dt);
    if (state.vr) vr.panel.update(dt, hs, hud.msgT > 0 ? hud.el.msg.textContent : '', hud.el.submsg.textContent);
    renderer.render(scene, camera);
  }

  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tick(dt, now);
  });

  window.game = { scene, camera, room, player, grapple, fruits, toppings, prog, state, vr, get salad() { return salad; }, get utensils() { return utensils; }, startDefend, tick };
}

boot();
