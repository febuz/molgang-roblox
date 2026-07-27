// Theehuis — 3D Cantonese mahjong against three AI players.
// Rules live in engine.js (ported from api/routes/mahjong.py); this file is
// only the three.js table, tile meshes (canvas-textured boxes — no external
// assets) and the claim/discard interaction loop.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  newGame, stepUntilHuman, discard, drawTile, availableClaims, applyClaim,
  chowOptions, isWinningHand, finishWin, tileLabel, isFlower,
} from './engine.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x17100a);
scene.fog = new THREE.Fog(0x17100a, 14, 30);

const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 60);
camera.position.set(0, 7.4, 8.2);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.8, 0);
controls.maxPolarAngle = Math.PI * 0.46;
controls.minDistance = 4;
controls.maxDistance = 16;
controls.enableDamping = true;

// ---- teahouse ambience ---------------------------------------------------
scene.add(new THREE.AmbientLight(0x604830, 0.9));
const lamp = new THREE.PointLight(0xffb060, 60, 22, 1.8);
lamp.position.set(0, 5.2, 0);
lamp.castShadow = true;
scene.add(lamp);
for (const [x, z, hue] of [[-5, -5, 0xff8040], [5, -5, 0xffa050], [-5, 5, 0xffa050], [5, 5, 0xff8040]]) {
  const l = new THREE.PointLight(hue, 14, 12, 2);
  l.position.set(x, 3.4, z);
  scene.add(l);
  const lantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 12, 10),
    new THREE.MeshBasicMaterial({ color: hue }));
  lantern.position.copy(l.position);
  scene.add(lantern);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.2),
    new THREE.MeshBasicMaterial({ color: 0x442200 }));
  cord.position.set(x, 4.6, z);
  scene.add(cord);
}
const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 40),
  new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: 0.95 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
// table
const table = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.5, 0.28, 36),
  new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.6 }));
table.position.y = 0.86;
table.castShadow = table.receiveShadow = true;
scene.add(table);
const felt = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.15, 0.02, 36),
  new THREE.MeshStandardMaterial({ color: 0x1e5c34, roughness: 0.9 }));
felt.position.y = 1.01;
felt.receiveShadow = true;
scene.add(felt);
const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 0.86, 16),
  new THREE.MeshStandardMaterial({ color: 0x3c2612, roughness: 0.8 }));
leg.position.y = 0.43;
scene.add(leg);
// four stools
for (let i = 0; i < 4; i++) {
  const a = (i * Math.PI) / 2;
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.55, 14),
    new THREE.MeshStandardMaterial({ color: 0x4a2f18, roughness: 0.7 }));
  stool.position.set(Math.sin(a) * 4.6, 0.28, Math.cos(a) * 4.6);
  stool.castShadow = true;
  scene.add(stool);
}

// ---- tile meshes ---------------------------------------------------------
const TILE_W = 0.34, TILE_H = 0.46, TILE_D = 0.22;
const faceCache = new Map();
function tileFaceTexture(t) {
  if (faceCache.has(t)) return faceCache.get(t);
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 170;
  const g = cv.getContext('2d');
  g.fillStyle = '#f7efdd';
  g.fillRect(0, 0, 128, 170);
  g.strokeStyle = '#c9b895'; g.lineWidth = 6; g.strokeRect(3, 3, 122, 164);
  const label = tileLabel(t);
  const suitChar = label.length > 1 ? label[1] : '';
  const red = ['Rd'].includes(t) || t[1] === 'c';
  const green = ['Gd'].includes(t) || t[1] === 'b';
  g.fillStyle = isFlower(t) ? '#a04080' : red ? '#b02020' : green ? '#187830' : '#203078';
  if (label.length === 2) {
    g.font = 'bold 62px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label[0], 64, 52);
    g.fillText(suitChar, 64, 120);
  } else {
    g.font = 'bold 84px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, 64, 88);
  }
  const tex = new THREE.CanvasTexture(cv);
  faceCache.set(t, tex);
  return tex;
}
const backMat = new THREE.MeshStandardMaterial({ color: 0x2f6e4f, roughness: 0.5 });
const sideMat = new THREE.MeshStandardMaterial({ color: 0xf2e8d2, roughness: 0.4 });
const tileGeo = new THREE.BoxGeometry(TILE_W, TILE_D, TILE_H);
function makeTile(t, faceUp = true) {
  const face = new THREE.MeshStandardMaterial({ map: tileFaceTexture(t), roughness: 0.35 });
  const mesh = new THREE.Mesh(tileGeo, [sideMat, sideMat, faceUp ? face : backMat, faceUp ? backMat : face, sideMat, sideMat]);
  mesh.castShadow = true;
  mesh.userData.tile = t;
  return mesh;
}

// ---- layout --------------------------------------------------------------
const g3 = { hand: new THREE.Group(), table: new THREE.Group() };
scene.add(g3.hand, g3.table);

function rebuild(game) {
  g3.hand.clear(); g3.table.clear();
  // human hand: arc facing the camera, slightly raised and tilted
  const hand = game.players[0].hand;
  hand.forEach((t, i) => {
    const m = makeTile(t, true);
    const x = (i - (hand.length - 1) / 2) * (TILE_W + 0.05);
    m.position.set(x, 1.35, 3.35);
    m.rotation.x = -1.05;
    m.userData.handIndex = i;
    g3.hand.add(m);
  });
  // per player: discards in rows toward center, melds+flowers at the edge
  game.players.forEach((p, pi) => {
    const a = (pi * Math.PI) / 2;         // 0 = human (south), CCW
    const rot = new THREE.Matrix4().makeRotationY(a);
    const place = (mesh, lx, lz, faceRotX = 0) => {
      mesh.position.set(lx, 1.06, lz).applyMatrix4(rot);
      mesh.rotation.y = a;
      mesh.rotation.x = faceRotX;
      g3.table.add(mesh);
    };
    p.discards.forEach((t, i) => {
      const m = makeTile(t, true);
      place(m, ((i % 6) - 2.5) * (TILE_W + 0.03), 1.15 + Math.floor(i / 6) * (TILE_H + 0.04));
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = -a;
      m.rotation.y = 0;
      m.rotateY(a);
    });
    let mx = -2.6;
    for (const meld of p.melds) {
      for (const t of meld.tiles) {
        const m = makeTile(t, true);
        place(m, mx, 2.55);
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = -a; m.rotation.y = 0; m.rotateY(a);
        mx += TILE_W + 0.02;
      }
      mx += 0.14;
    }
    p.flowers.forEach((t, i) => {
      const m = makeTile(t, true);
      place(m, 2.2 + (i % 4) * 0.16, 2.85);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = -a; m.rotation.y = 0; m.rotateY(a);
    });
    if (pi !== 0) {
      // opponents' concealed hands: face-down row
      p.hand.forEach((t, i) => {
        const m = makeTile(t, false);
        place(m, (i - (p.hand.length - 1) / 2) * (TILE_W + 0.03), 3.05);
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = -a; m.rotation.y = 0; m.rotateY(a);
      });
    }
  });
}

// ---- game flow -----------------------------------------------------------
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const claimsEl = document.getElementById('claims');
const game = newGame();

function pushLog(lines) {
  for (const l of lines) {
    const d = document.createElement('div');
    d.textContent = l;
    logEl.prepend(d);
  }
  while (logEl.children.length > 24) logEl.lastChild.remove();
}

function showResult() {
  const r = game.result;
  document.getElementById('result-title').textContent =
    game.winner === 0 ? '🎉 Jij wint!' : `${r ? r.name : '—'} wint`;
  document.getElementById('result-faan').textContent =
    r ? `${r.faan} faan · ${r.coins} MolCoins-waarde` : 'Remise — muur is op';
  const ul = document.getElementById('result-details');
  ul.innerHTML = '';
  for (const d of (r ? r.details : [])) {
    const li = document.createElement('li');
    li.textContent = d;
    ul.appendChild(li);
  }
  document.getElementById('result').style.display = 'grid';
}

function offerClaims() {
  const claims = availableClaims(game, 0);
  claimsEl.innerHTML = '';
  if (!claims.length) return false;
  for (const c of claims) {
    const b = document.createElement('button');
    b.textContent = { win: '🀄 WIN!', kong: 'Kong', pung: 'Pung', chow: 'Chow' }[c];
    b.onclick = () => {
      claimsEl.style.display = 'none';
      applyClaim(game, 0, c, c === 'chow' ? chowOptions(game.players[0].hand, game.lastDiscard)[0] : null);
      afterHumanAction();
    };
    claimsEl.appendChild(b);
  }
  const pass = document.createElement('button');
  pass.textContent = 'Pas';
  pass.onclick = () => {
    claimsEl.style.display = 'none';
    game.phase = 'draw';
    game.turn = (game.lastDiscarder + 1) % 4;
    game.lastDiscard = null;
    advance();
  };
  claimsEl.appendChild(pass);
  claimsEl.style.display = 'flex';
  statusEl.textContent = 'Je kunt de afgelegde tegel claimen…';
  return true;
}

function afterHumanAction() {
  rebuild(game);
  if (game.phase === 'over') { showResult(); return; }
  if (game.turn === 0 && game.phase === 'discard') {
    statusEl.textContent = 'Jouw beurt — klik een tegel om af te leggen';
    return;
  }
  advance();
}

function advance() {
  const log = stepUntilHuman(game);
  pushLog(log);
  rebuild(game);
  if (game.phase === 'over') { showResult(); return; }
  if (game.drawn) { game.result = null; showResult(); return; }
  if (game.phase === 'claims' && offerClaims()) return;
  if (game.phase === 'self-win-offer') {
    claimsEl.innerHTML = '';
    const winBtn = document.createElement('button');
    winBtn.textContent = '🀄 WIN (zelf getrokken)!';
    winBtn.onclick = () => { claimsEl.style.display = 'none'; finishWin(game, 0); rebuild(game); showResult(); };
    const no = document.createElement('button');
    no.textContent = 'Doorspelen';
    no.onclick = () => { claimsEl.style.display = 'none'; game.phase = 'discard'; statusEl.textContent = 'Klik een tegel om af te leggen'; };
    claimsEl.append(winBtn, no);
    claimsEl.style.display = 'flex';
    statusEl.textContent = 'Je getrokken tegel maakt je hand compleet!';
    return;
  }
  if (game.phase === 'draw' && game.turn === 0) {
    const t = drawTile(game, game.players[0]);
    if (t == null) { game.result = null; showResult(); return; }
    if (isWinningHand(game.players[0].hand, game.players[0].melds.length)) {
      game.phase = 'self-win-offer';
      rebuild(game);
      advance();
      return;
    }
    game.phase = 'discard';
    rebuild(game);
  }
  if (game.turn === 0 && game.phase === 'discard') {
    statusEl.textContent = `Jouw beurt — klik een tegel om af te leggen (muur: ${game.wall.length})`;
  }
}

// ---- input ---------------------------------------------------------------
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let hovered = null;
function pick(ev) {
  const r = canvas.getBoundingClientRect();
  ptr.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  ptr.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(g3.hand.children, false);
  return hits.length ? hits[0].object : null;
}
canvas.addEventListener('pointermove', (ev) => {
  const h = pick(ev);
  if (hovered && hovered !== h) hovered.position.y = 1.35;
  hovered = h;
  if (h) h.position.y = 1.5;
  canvas.style.cursor = h ? 'pointer' : 'default';
});
canvas.addEventListener('click', (ev) => {
  if (game.phase !== 'discard' || game.turn !== 0) return;
  const h = pick(ev);
  if (!h) return;
  discard(game, 0, h.userData.tile);
  pushLog([`Jij legt ${tileLabel(h.userData.tile)} af`]);
  advance();
});

// ---- boot ----------------------------------------------------------------
function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();
rebuild(game);
advance();
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
