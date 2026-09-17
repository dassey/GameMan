import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { loadAtlas, AgentSprite } from './sprites.js';
import { Particles, Collectibles, Enemies, Guide, GoldenGlasses } from './entities.js';
import { Progression } from './progression.js';
import { HUD } from './hud.js';
import { Audio } from './audio.js';

const $ = (id) => document.getElementById(id);

async function boot() {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  renderer.xr.setFramebufferScaleFactor(1.0);
  renderer.domElement.id = 'gl';
  document.body.appendChild(renderer.domElement);
  const pixelScales = [0.5, 0.34, 1];
  let pixelIdx = 0;
  const applyPixel = () => renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * pixelScales[pixelIdx]);
  applyPixel();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x5a636c);
  scene.fog = new THREE.FogExp2(0x5a636c, 0.011);
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 400);

  scene.add(new THREE.HemisphereLight(0xbfc8d6, 0x3a4a30, 1.6));
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.2); sun.position.set(40, 70, 20); scene.add(sun);

  await loadAtlas();
  const audio = new Audio();
  const prog = new Progression();
  const world = new World(scene, 1337);
  const player = new Player({ renderer, camera, scene, world, audio });
  const particles = new Particles(scene);
  const collectibles = new Collectibles(scene, world);
  const enemies = new Enemies(scene, world, particles, audio);
  const summit = world.cellCenter(world.summitCell[0], world.summitCell[1]);
  const glasses = new GoldenGlasses(scene, summit);
  const guide = new Guide(scene, new THREE.Vector3(3, world.heightAt(3, -1), -1),
    'COLLECT SPARKS. PUNCH GOLEMS.\nCLIMB TO THE YELLOW BEAM\nAND GRAB THE GOLDEN GLASSES!\n\n1m ledges: walk. 2m: jump.');
  const hud = new HUD(player, prog);
  enemies.populate(prog.difficulty);

  const applyStats = () => { player.maxHP = prog.maxHP; player.damage = prog.damage; player.speed = prog.speed; };
  applyStats(); player.hp = player.maxHP;
  if (prog.saved && prog.saved.pos) {
    const p = prog.saved.pos; player.respawn(new THREE.Vector3(p[0], p[1], p[2])); player.hp = prog.saved.hp || player.maxHP;
  }

  prog.on('levelup', (lv) => {
    applyStats(); player.hp = player.maxHP;
    audio.levelup(); guide.cheer();
    particles.burst(player.pos.clone().add(new THREE.Vector3(0, 1, 0)), 60, 0xffe94a, 5, 1.6, 4);
    hud.message(`LEVEL ${lv}!`, `HP ${prog.maxHP}  DMG ${prog.damage}  SPEED ${prog.speed.toFixed(1)}`, 3.5);
    hud.flash('rgba(255,233,74,0.35)');
  });

  player.onPunch = (origin, dir, hand, power) => enemies.punch(origin, dir, player.damage * power, (e) => {
    prog.kills++; prog.addScore(e.score); prog.addXP(e.xp); player.heal(5);
    for (let i = 0; i < 3; i++) collectibles.spawnSpark(e.pos);
    hud.message(`+${e.score}`, e.kind === 'golem' ? 'GOLEM SMASHED' : 'SHADE DISPELLED', 1.2);
  });
  const prevHP = { v: player.hp };

  const overlay = $('overlay'), vrBtn = $('vrbtn'), playBtn = $('playbtn'), resetBtn = $('resetbtn');
  const startDesktop = () => { audio.init(); audio.resume(); overlay.style.display = 'none'; renderer.domElement.requestPointerLock?.(); };
  playBtn.addEventListener('click', startDesktop);
  renderer.domElement.addEventListener('click', () => { if (!player.inXR && document.pointerLockElement !== renderer.domElement && overlay.style.display === 'none') renderer.domElement.requestPointerLock?.(); });
  document.addEventListener('pointerlockchange', () => { $('hint').style.opacity = document.pointerLockElement ? 0 : 1; });
  resetBtn.addEventListener('click', () => { if (confirm('Reset all progress?')) { prog.reset(); location.reload(); } });

  let xrSession = null;
  if (navigator.xr) {
    navigator.xr.isSessionSupported('immersive-vr').then((ok) => {
      vrBtn.disabled = !ok;
      vrBtn.textContent = ok ? 'ENTER VR (Quest)' : 'VR NOT AVAILABLE';
      if (!ok) $('vrnote').textContent = 'Open this page in the Meta Quest Browser over HTTPS to play in VR.';
    }).catch(() => { vrBtn.disabled = true; });
  } else { vrBtn.disabled = true; vrBtn.textContent = 'VR NOT AVAILABLE'; $('vrnote').textContent = 'WebXR is not available in this browser. Use the Meta Quest Browser over HTTPS.'; }
  vrBtn.addEventListener('click', async () => {
    audio.init(); audio.resume();
    if (xrSession) { xrSession.end(); return; }
    try {
      xrSession = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
      xrSession.addEventListener('end', () => { xrSession = null; overlay.style.display = ''; vrBtn.textContent = 'ENTER VR (Quest)'; });
      await renderer.xr.setSession(xrSession);
      overlay.style.display = 'none';
      vrBtn.textContent = 'EXIT VR';
      hud.message('AGENT PIXEL', 'Left stick: move  Right stick: turn  A/X: jump  Swing fists to punch', 5);
    } catch (e) { console.error(e); $('vrnote').textContent = 'Could not start VR: ' + e.message; }
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyV' && !player.inXR) { player.thirdPerson = !player.thirdPerson; player.desktopHands.visible = !player.thirdPerson; avatar.visible = player.thirdPerson; }
    if (e.code === 'KeyP') { pixelIdx = (pixelIdx + 1) % pixelScales.length; applyPixel(); hud.message(`PIXEL SCALE ${pixelScales[pixelIdx]}`, '', 1); }
    if (e.code === 'KeyM') { audio.muted = !audio.muted; hud.message(audio.muted ? 'MUTED' : 'SOUND ON', '', 1); }
    if (e.code === 'KeyN') { audio.musicOn = !audio.musicOn; hud.message(audio.musicOn ? 'MUSIC ON' : 'MUSIC OFF', '', 1); }
    if (e.code === 'Escape') { overlay.style.display = ''; }
    if (e.code === 'KeyR' && player.dead) doRespawn();
  });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const avatar = new AgentSprite({ height: 1.8, fps: 9 }); avatar.visible = false; scene.add(avatar);

  const doRespawn = () => {
    player.respawn(world.spawn); prog.addScore(-Math.min(prog.score, 250));
    hud.message('BACK ON YOUR FEET', 'lost 250 points', 2.5);
  };

  const clock = new THREE.Clock();
  let saveT = 5, deadT = 0, hint = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    player.update(dt);
    particles.update(dt);
    collectibles.update(dt);
    enemies.update(dt, player, camera, prog.difficulty);
    glasses.update(dt);
    guide.update(dt, camera, player);
    hud.update(dt);

    if (avatar.visible) {
      avatar.position.copy(player.pos);
      avatar.update(dt, camera);
      if (player.punchAnim.right > 0 || player.punchAnim.left > 0) avatar.play('punch'); else avatar.play(player.moving ? 'walk' : 'idle');
    }

    const centres = [player.pos.clone().add(new THREE.Vector3(0, 0.9, 0))];
    if (player.inXR) for (const h of ['left', 'right']) if (player.hands[h]) centres.push(player.hands[h].getWorldPosition(new THREE.Vector3()));
    for (const c of centres) {
      const got = collectibles.collect(c, c === centres[0] ? 1.1 : 0.35);
      if (got.sparks) {
        prog.sparks += got.sparks; prog.addScore(10 * got.sparks); prog.addXP(5 * got.sparks); audio.pickup();
        particles.burst(c, 4 * got.sparks, 0xffe94a, 2.5, 0.6, 3);
      }
      if (got.ties) {
        prog.addScore(100 * got.ties); prog.addXP(40 * got.ties); player.heal(25); audio.tie();
        particles.burst(c, 20, 0xf2c230, 4, 1.2, 3);
        hud.message('GOLDEN TIE +100', '+25 HP', 1.8);
      }
      if (glasses.tryTake(c)) {
        prog.wins++; prog.addScore(1000); prog.addXP(300); audio.win();
        particles.burst(c, 80, 0xffe94a, 6, 2, 2);
        hud.message('GOLDEN GLASSES FOUND!', `+1000 points. The valley grows more dangerous (x${prog.difficulty.toFixed(1)}).`, 6);
        setTimeout(() => glasses.reset(world.randomCell(8, Infinity, 40)), 8000);
      }
    }

    if (player.hp < prevHP.v) hud.flash();
    prevHP.v = player.hp;
    if (player.dead) {
      deadT += dt;
      if (deadT > 0.1 && deadT - dt <= 0.1) hud.message('KNOCKED OUT', player.inXR ? 'respawning...' : 'press R to respawn', 3);
      if (deadT > 3) { deadT = 0; doRespawn(); }
    }

    saveT -= dt;
    if (saveT <= 0) { saveT = 5; prog.save({ pos: [player.pos.x, player.pos.y, player.pos.z], hp: player.hp }); }

    hint -= dt;
    if (hint <= 0) {
      hint = 25;
      const d = Math.round(player.pos.distanceTo(glasses.pos));
      if (!glasses.taken) hud.message('', `Golden Glasses: ${d}m away. Look for the yellow beam.`, 4);
    }

    renderer.render(scene, camera);
  });

  window.game = { renderer, scene, camera, world, player, enemies, collectibles, prog, glasses };
  $('loading').style.display = 'none';
  hud.message('AGENT PIXEL', 'Stone Valley', 3);
}

boot().catch((e) => { console.error(e); $('loading').textContent = 'Failed to start: ' + e.message; });
