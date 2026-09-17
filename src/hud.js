import * as THREE from 'three';

export class HUD {
  constructor(player, prog) {
    this.player = player; this.prog = prog;
    this.el = {
      hp: document.getElementById('hpbar'), xp: document.getElementById('xpbar'),
      level: document.getElementById('level'), score: document.getElementById('score'),
      msg: document.getElementById('msg'), sub: document.getElementById('submsg'), flash: document.getElementById('flash'),
      stats: document.getElementById('stats'),
    };
    this.msgT = 0; this.subT = 0;
    this.c = document.createElement('canvas'); this.c.width = 256; this.c.height = 128;
    this.ctx = this.c.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c);
    this.tex.magFilter = THREE.NearestFilter; this.tex.minFilter = THREE.NearestFilter; this.tex.colorSpace = THREE.SRGBColorSpace;
    this.panel = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true }));
    this.panel.position.set(0, 0.04, 0.16);
    this.panel.rotation.x = -Math.PI / 2 + 0.35;
    this.panel.rotation.y = Math.PI;
    this.panel.rotation.order = 'YXZ';
    player.attachWristPanel(this.panel);
    this.mc = document.createElement('canvas'); this.mc.width = 512; this.mc.height = 128;
    this.mctx = this.mc.getContext('2d');
    this.mtex = new THREE.CanvasTexture(this.mc); this.mtex.magFilter = THREE.NearestFilter; this.mtex.minFilter = THREE.NearestFilter; this.mtex.colorSpace = THREE.SRGBColorSpace;
    this.board = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: this.mtex, transparent: true, depthTest: false }));
    this.board.position.set(0, -0.25, -2.2); this.board.renderOrder = 999; this.board.visible = false;
    player.camera.add(this.board);
    this.redraw = 0;
    this.portrait = new Image(); this.portrait.src = 'assets/sprites/portrait.png';
  }

  message(text, sub = '', dur = 2.5) {
    this.el.msg.textContent = text; this.el.msg.style.opacity = 1; this.msgT = dur;
    this.el.sub.textContent = sub; this.el.sub.style.opacity = sub ? 1 : 0; this.subT = dur;
    this.boardText = text; this.boardSub = sub; this.boardT = dur; this.drawBoard();
  }

  flash(color = 'rgba(255,40,40,0.35)') {
    this.el.flash.style.background = color; this.el.flash.style.opacity = 1;
    setTimeout(() => { this.el.flash.style.opacity = 0; }, 120);
  }

  drawBoard() {
    const ctx = this.mctx; ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#ffe94a'; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center';
    ctx.fillText(this.boardText || '', 256, 58);
    ctx.fillStyle = '#ffffff'; ctx.font = '22px monospace';
    ctx.fillText(this.boardSub || '', 256, 100);
    this.mtex.needsUpdate = true;
  }

  drawWrist() {
    const ctx = this.ctx, p = this.player, pr = this.prog;
    ctx.fillStyle = '#101010'; ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#ffe94a'; ctx.fillRect(0, 0, 256, 3);
    if (this.portrait.complete) ctx.drawImage(this.portrait, 4, 8, 48, 24);
    ctx.font = 'bold 18px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
    ctx.fillText(`LV ${pr.level}`, 60, 26);
    ctx.textAlign = 'right'; ctx.fillText(`${pr.score}`, 250, 26);
    ctx.fillStyle = '#333'; ctx.fillRect(8, 44, 240, 18);
    ctx.fillStyle = p.hp > p.maxHP * 0.3 ? '#4ad25a' : '#e04a3a'; ctx.fillRect(8, 44, 240 * Math.max(0, p.hp / p.maxHP), 18);
    ctx.fillStyle = '#fff'; ctx.font = '13px monospace'; ctx.textAlign = 'left'; ctx.fillText(`HP ${Math.ceil(p.hp)}/${p.maxHP}`, 12, 58);
    ctx.fillStyle = '#333'; ctx.fillRect(8, 72, 240, 12);
    ctx.fillStyle = '#ffe94a'; ctx.fillRect(8, 72, 240 * Math.min(1, pr.xp / pr.xpToNext()), 12);
    ctx.fillStyle = '#ccc'; ctx.font = '12px monospace';
    ctx.fillText(`XP ${pr.xp}/${pr.xpToNext()}`, 12, 100);
    ctx.textAlign = 'right'; ctx.fillText(`KILLS ${pr.kills}  SPARKS ${pr.sparks}`, 250, 100);
    ctx.fillStyle = '#888'; ctx.textAlign = 'left'; ctx.fillText(`BEST ${pr.best}   WINS ${pr.wins}`, 12, 120);
    this.tex.needsUpdate = true;
  }

  update(dt) {
    const p = this.player, pr = this.prog;
    this.el.hp.style.width = `${Math.max(0, (p.hp / p.maxHP) * 100)}%`;
    this.el.hp.style.background = p.hp > p.maxHP * 0.3 ? '#4ad25a' : '#e04a3a';
    this.el.xp.style.width = `${Math.min(100, (pr.xp / pr.xpToNext()) * 100)}%`;
    this.el.level.textContent = `LV ${pr.level}`;
    this.el.score.textContent = String(pr.score).padStart(6, '0');
    this.el.stats.textContent = `HP ${Math.ceil(p.hp)}/${p.maxHP}  XP ${pr.xp}/${pr.xpToNext()}  KILLS ${pr.kills}  BEST ${pr.best}`;
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) this.el.msg.style.opacity = 0; }
    if (this.subT > 0) { this.subT -= dt; if (this.subT <= 0) this.el.sub.style.opacity = 0; }
    if (this.boardT > 0) { this.boardT -= dt; this.board.visible = !!p.inXR; if (this.boardT <= 0) this.board.visible = false; }
    this.redraw -= dt;
    if (this.redraw <= 0) { this.redraw = 0.2; if (p.inXR) this.drawWrist(); }
  }
}
