import * as THREE from 'three';

// --- SONIDO RETRO 16-BIT SINTETIZADO (WEB AUDIO API SIN ARCHIVOS EXTERNOS) ---
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
}

function playRetroTone(freqStart, freqEnd, duration, type = 'square', gainVal = 0.08) {
  ensureAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), now + duration);

  gain.gain.setValueAtTime(gainVal, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

// --- ESCENA 3D PIXELADA 16-BIT ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x161a26);
scene.fog = new THREE.FogExp2(0x161a26, 0.0105);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 240);

const PIXEL_SCALE = 0.44;
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
document.body.appendChild(renderer.domElement);

function resizeRenderer() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(Math.max(1, Math.floor(w * PIXEL_SCALE)), Math.max(1, Math.floor(h * PIXEL_SCALE)), false);
  renderer.domElement.style.width = `${w}px`;
  renderer.domElement.style.height = `${h}px`;
}
resizeRenderer();
window.addEventListener('resize', resizeRenderer);

// --- TEXTURAS PIXELADAS 16-BIT ---
function makePixelTex(drawFn, repeatX = 1, repeatY = 1, size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const stoneFloorTex = makePixelTex((ctx, s) => {
  ctx.fillStyle = '#363f33';
  ctx.fillRect(0, 0, s, s);
  const tile = s / 4;
  for (let gx = 0; gx < 4; gx++) {
    for (let gy = 0; gy < 4; gy++) {
      ctx.fillStyle = (gx + gy) % 2 === 0 ? '#424d3d' : '#2f372c';
      ctx.fillRect(gx * tile + 1, gy * tile + 1, tile - 2, tile - 2);
      ctx.fillStyle = '#5f8a39';
      ctx.fillRect(gx * tile + 3, gy * tile + 3, 2, 2);
      ctx.fillRect(gx * tile + 10, gy * tile + 8, 2, 2);
    }
  }
}, 14, 14, 64);

const brickWallTex = makePixelTex((ctx, s) => {
  ctx.fillStyle = '#4b5061';
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#282c36';
  for (let y = 0; y < s; y += 8) {
    ctx.fillRect(0, y, s, 2);
    const offset = (y / 8) % 2 === 0 ? 0 : 8;
    for (let x = offset; x < s; x += 16) {
      ctx.fillRect(x, y, 2, 8);
    }
  }
}, 2, 2, 64);

// --- ILUMINACIÓN ---
const hemi = new THREE.HemisphereLight(0x9fb6eb, 0x2c3a27, 1.0);
scene.add(hemi);

const moonLight = new THREE.DirectionalLight(0xd2e0ff, 1.3);
moonLight.position.set(28, 45, 24);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(1024, 1024);
const bound = 45;
moonLight.shadow.camera.left = -bound;
moonLight.shadow.camera.right = bound;
moonLight.shadow.camera.top = bound;
moonLight.shadow.camera.bottom = -bound;
scene.add(moonLight);

// --- ESCENARIO DE RUINAS CON ANTORCHAS ANIMADAS, PILARES Y OBSTÁCULOS ---
const colliders = [];
const ARENA_HALF = 34;

function addBlock(x, y, z, w, h, d, matOrHex, solid = true) {
  const mat =
    matOrHex instanceof THREE.Material
      ? matOrHex
      : new THREE.MeshStandardMaterial({ color: matOrHex, roughness: 0.85 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  if (solid) {
    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2
    });
  }
  return mesh;
}

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2),
  new THREE.MeshStandardMaterial({ map: stoneFloorTex, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const wallMat = new THREE.MeshStandardMaterial({ map: brickWallTex, roughness: 0.88 });

// Muros perimetrales
addBlock(0, 0, -ARENA_HALF, ARENA_HALF * 2 + 4, 6, 4, wallMat, true);
addBlock(0, 0, ARENA_HALF, ARENA_HALF * 2 + 4, 6, 4, wallMat, true);
addBlock(-ARENA_HALF, 0, 0, 4, 6, ARENA_HALF * 2, wallMat, true);
addBlock(ARENA_HALF, 0, 0, 4, 6, ARENA_HALF * 2, wallMat, true);

// Pilares y antorchas titilantes
const flames = [];
const pillars = [
  [-12, -12],
  [12, -12],
  [-12, 12],
  [12, 12],
  [0, -18],
  [0, 18]
];
pillars.forEach(([px, pz], idx) => {
  addBlock(px, 0, pz, 3.2, 5.2, 3.2, wallMat, true);
  addBlock(px, 5.2, pz, 3.6, 0.45, 3.6, 0x646c7d, false);

  const flame = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.95, 0.75),
    new THREE.MeshBasicMaterial({ color: idx % 2 === 0 ? 0xff9f1c : 0x56cfe1 })
  );
  flame.position.set(px, 6.0, pz);
  scene.add(flame);
  flames.push({ mesh: flame, phase: idx * 1.3 });
});

// Cajas rompibles de madera/suministros que sueltan vida o puntos
const crates = [];
function spawnCrate(x, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.5, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.85 })
  );
  mesh.position.set(x, 0.75, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  crates.push({ mesh, hp: 20 });
}

[
  [-6, -6],
  [6, -6],
  [-6, 6],
  [6, 6]
].forEach(([cx, cz]) => spawnCrate(cx, cz));

// --- PARTÍCULAS Y ITEMS DROPEADOS (POCIONES DE VIDA / CRISTALES) ---
const particles = [];
const pickups = [];

function spawnHitParticles(x, y, z, colorHex, count = 7) {
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.24, 0.24),
      new THREE.MeshBasicMaterial({ color: colorHex })
    );
    p.position.set(x, y, z);
    scene.add(p);
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const spd = 2.5 + Math.random() * 4.0;
    particles.push({
      mesh: p,
      vx: Math.cos(angle) * spd,
      vy: 2.2 + Math.random() * 3.5,
      vz: Math.sin(angle) * spd,
      life: 0.35 + Math.random() * 0.15
    });
  }
}

function spawnPickup(x, z, kind = 'potion') {
  const color = kind === 'potion' ? 0x38d996 : 0xf5c542;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.MeshBasicMaterial({ color })
  );
  mesh.position.set(x, 0.6, z);
  scene.add(mesh);
  pickups.push({ mesh, kind, age: 0 });
}

// --- JUGADOR (GUERRERO 16-BIT CON ESPADA Y ARCO DE TAJO) ---
const player = new THREE.Group();
player.position.set(0, 0, 4);
scene.add(player);

const pTorso = new THREE.Mesh(
  new THREE.BoxGeometry(0.85, 1.05, 0.5),
  new THREE.MeshStandardMaterial({ color: 0x2b6cb0, roughness: 0.7 })
);
pTorso.position.y = 1.15;
pTorso.castShadow = true;
player.add(pTorso);

const pHead = new THREE.Mesh(
  new THREE.BoxGeometry(0.58, 0.58, 0.58),
  new THREE.MeshStandardMaterial({ color: 0xf0c29b, roughness: 0.7 })
);
pHead.position.y = 1.98;
pHead.castShadow = true;
player.add(pHead);

const pHelm = new THREE.Mesh(
  new THREE.BoxGeometry(0.64, 0.22, 0.64),
  new THREE.MeshStandardMaterial({ color: 0xe53e3e })
);
pHelm.position.y = 2.22;
player.add(pHelm);

const legGeo = new THREE.BoxGeometry(0.34, 0.72, 0.36);
const legMat = new THREE.MeshStandardMaterial({ color: 0x374151 });
const leftLeg = new THREE.Mesh(legGeo, legMat);
leftLeg.position.set(-0.22, 0.36, 0);
leftLeg.castShadow = true;
player.add(leftLeg);

const rightLeg = new THREE.Mesh(legGeo, legMat);
rightLeg.position.set(0.22, 0.36, 0);
rightLeg.castShadow = true;
player.add(rightLeg);

const swordPivot = new THREE.Group();
swordPivot.position.set(0.55, 1.25, 0.25);
player.add(swordPivot);

const swordBlade = new THREE.Mesh(
  new THREE.BoxGeometry(0.16, 0.16, 1.55),
  new THREE.MeshStandardMaterial({ color: 0xe2e8f0, emissive: 0x3b82f6, emissiveIntensity: 0.25 })
);
swordBlade.position.set(0, 0, 0.7);
swordPivot.add(swordBlade);

const swordGuard = new THREE.Mesh(
  new THREE.BoxGeometry(0.48, 0.16, 0.16),
  new THREE.MeshStandardMaterial({ color: 0xf5c542 })
);
swordGuard.position.set(0, 0, 0.05);
swordPivot.add(swordGuard);

// Destello visual al golpear
const slashArc = new THREE.Mesh(
  new THREE.BoxGeometry(2.4, 0.25, 1.2),
  new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.0 })
);
slashArc.position.set(0, 1.25, 1.7);
player.add(slashArc);

// --- ENEMIGOS: ESQUELETOS, ZOMBIS RABIOSOS Y BRUJO/JEFE CADA 3 OLEADAS ---
const enemies = [];

function createSkeletonMesh() {
  const g = new THREE.Group();
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xede9d8, roughness: 0.75 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e2028, roughness: 0.85 });

  const rib = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, 0.42), boneMat);
  rib.position.y = 1.12;
  rib.castShadow = true;
  g.add(rib);

  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.56), boneMat);
  skull.position.y = 1.92;
  skull.castShadow = true;
  g.add(skull);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4d2e });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.08), eyeMat);
  eyeL.position.set(-0.14, 1.95, 0.28);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.08), eyeMat);
  eyeR.position.set(0.14, 1.95, 0.28);
  g.add(eyeL, eyeR);

  const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), boneMat);
  lLeg.position.set(-0.2, 0.36, 0);
  const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.26), boneMat);
  rLeg.position.set(0.2, 0.36, 0);
  g.add(lLeg, rLeg);

  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.75, 0.45), darkMat);
  shield.position.set(0.48, 1.15, 0.25);
  g.add(shield);

  return { group: g, lLeg, rLeg };
}

function createRabidZombieMesh(isBoss = false) {
  const scale = isBoss ? 1.55 : 1.0;
  const g = new THREE.Group();
  g.scale.setScalar(scale);

  const skinMat = new THREE.MeshStandardMaterial({
    color: isBoss ? 0x7a4988 : 0x5c8d46,
    roughness: 0.78
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: isBoss ? 0x9b2c2c : 0x6b2d2d,
    roughness: 0.85
  });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2a3142, roughness: 0.85 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.05, 0.5), shirtMat);
  body.position.y = 1.15;
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), skinMat);
  head.position.y = 1.98;
  head.castShadow = true;
  g.add(head);

  if (isBoss) {
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.28, 0.7),
      new THREE.MeshBasicMaterial({ color: 0xf5c542 })
    );
    crown.position.y = 2.4;
    g.add(crown);
  }

  const rageEye = new THREE.MeshBasicMaterial({ color: 0xff1e1e });
  const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.08), rageEye);
  e1.position.set(-0.15, 2.02, 0.32);
  const e2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.08), rageEye);
  e2.position.set(0.15, 2.02, 0.32);
  g.add(e1, e2);

  const armGeo = new THREE.BoxGeometry(0.26, 0.26, 0.85);
  const armL = new THREE.Mesh(armGeo, skinMat);
  armL.position.set(-0.54, 1.42, 0.42);
  const armR = new THREE.Mesh(armGeo, skinMat);
  armR.position.set(0.54, 1.42, 0.42);
  g.add(armL, armR);

  const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.72, 0.34), pantsMat);
  lLeg.position.set(-0.22, 0.36, 0);
  const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.72, 0.34), pantsMat);
  rLeg.position.set(0.22, 0.36, 0);
  g.add(lLeg, rLeg);

  return { group: g, lLeg, rLeg };
}

function spawnEnemy(type, isBoss = false) {
  const built = type === 'zombie' ? createRabidZombieMesh(isBoss) : createSkeletonMesh();

  let sx = 0;
  let sz = 0;
  for (let tries = 0; tries < 20; tries++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * 11;
    sx = Math.cos(angle) * dist;
    sz = Math.sin(angle) * dist;
    if (Math.hypot(sx - player.position.x, sz - player.position.z) > 12) break;
  }

  built.group.position.set(sx, 0, sz);
  scene.add(built.group);

  enemies.push({
    type,
    isBoss,
    group: built.group,
    lLeg: built.lLeg,
    rLeg: built.rLeg,
    hp: isBoss ? 140 : type === 'zombie' ? 45 : 35,
    speed: isBoss ? 5.6 : type === 'zombie' ? 7.0 : 5.2,
    damage: isBoss ? 22 : type === 'zombie' ? 14 : 10,
    attackCooldown: 0
  });
}

let wave = 1;
let score = 0;
let combo = 1;
let comboTimer = 0;
let playerHp = 100;
let stamina = 100;
let isGameOver = false;
let waveTransitionTimer = 0;
let screenShake = 0;

const centerBanner = document.getElementById('center-banner');
function showBanner(msg, duration = 1.9) {
  centerBanner.textContent = msg;
  centerBanner.classList.remove('hidden');
  waveTransitionTimer = duration;
}

function startWave(w) {
  const count = 4 + w * 2;
  for (let i = 0; i < count; i++) {
    spawnEnemy(i % 2 === 0 ? 'zombie' : 'skeleton', false);
  }
  if (w % 3 === 0) {
    spawnEnemy('zombie', true);
    showBanner(`OLEADA ${w} — ¡ZOMBI JEFE RABIOSO APARECIÓ!`, 2.4);
  } else {
    showBanner(`OLEADA ${w} — ESQUELETOS Y ZOMBIS RABIOSOS`, 2.0);
  }
  if (crates.length < 3) {
    spawnCrate((Math.random() - 0.5) * 24, (Math.random() - 0.5) * 24);
  }
}

startWave(wave);

// --- CONTROLES ---
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyJ' || e.code === 'KeyF') performAttack(false);
  if (e.code === 'KeyK') performAttack(true);
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') triggerDash();
  if (e.code === 'KeyR' && isGameOver) restartGame();
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

let camYaw = 0;
let camPitch = 0.35;
let isDragging = false;
let prevPtr = { x: 0, y: 0 };
let pointerDownPos = { x: 0, y: 0 };

renderer.domElement.addEventListener('pointerdown', (e) => {
  ensureAudio();
  isDragging = true;
  prevPtr = { x: e.clientX, y: e.clientY };
  pointerDownPos = { x: e.clientX, y: e.clientY };
});

window.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - prevPtr.x;
  const dy = e.clientY - prevPtr.y;
  prevPtr = { x: e.clientX, y: e.clientY };
  camYaw -= dx * 0.008;
  camPitch = Math.max(0.14, Math.min(1.05, camPitch + dy * 0.006));
});

window.addEventListener('pointerup', (e) => {
  if (!isDragging) return;
  isDragging = false;
  const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
  if (moved < 8) {
    if (isGameOver) restartGame();
    else performAttack(false);
  }
});

// Joystick táctil
const joyZone = document.getElementById('joystick-zone');
const joyStick = document.getElementById('joystick-stick');
let joyVec = { x: 0, y: 0 };
let joyActive = false;

joyZone.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  ensureAudio();
  joyActive = true;
  updateJoy(e);
});
joyZone.addEventListener('pointermove', (e) => {
  if (!joyActive) return;
  e.stopPropagation();
  updateJoy(e);
});
const resetJoy = () => {
  joyActive = false;
  joyVec = { x: 0, y: 0 };
  joyStick.style.transform = 'translate(0px, 0px)';
};
joyZone.addEventListener('pointerup', resetJoy);
joyZone.addEventListener('pointercancel', resetJoy);

function updateJoy(e) {
  const rect = joyZone.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const maxR = rect.width / 2 - 18;
  let dx = e.clientX - cx;
  let dy = e.clientY - cy;
  const d = Math.hypot(dx, dy);
  if (d > maxR) {
    dx = (dx / d) * maxR;
    dy = (dy / d) * maxR;
  }
  joyStick.style.transform = `translate(${dx}px, ${dy}px)`;
  joyVec.x = dx / maxR;
  joyVec.y = dy / maxR;
}

let touchJump = false;
document.getElementById('btn-attack').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if (isGameOver) restartGame();
  else performAttack(false);
});
document.getElementById('btn-heavy').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if (!isGameOver) performAttack(true);
});
document.getElementById('btn-dash').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  if (!isGameOver) triggerDash();
});
const btnJump = document.getElementById('btn-jump');
btnJump.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  touchJump = true;
});
btnJump.addEventListener('pointerup', () => {
  touchJump = false;
});

// --- ATAQUES Y ESQUIVE ---
let attackAnimTimer = 0;
let attackCooldown = 0;
let dashTimer = 0;
let invulnTimer = 0;
const velocity = new THREE.Vector3();
let isGrounded = false;

function triggerDash() {
  if (isGameOver || dashTimer > 0 || stamina < 24) return;
  stamina -= 24;
  dashTimer = 0.18;
  invulnTimer = 0.28;
  const fwd = new THREE.Vector3(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
  velocity.x = fwd.x * 22;
  velocity.z = fwd.z * 22;
  playRetroTone(320, 140, 0.11, 'triangle', 0.08);
  spawnHitParticles(player.position.x, 0.8, player.position.z, 0x7dd3fc, 5);
}

function performAttack(isHeavy) {
  if (isGameOver || attackCooldown > 0) return;
  if (isHeavy && stamina < 28) return;

  if (isHeavy) {
    stamina -= 28;
    attackCooldown = 0.55;
    attackAnimTimer = 0.3;
    slashArc.scale.set(1.45, 1.35, 1.35);
    playRetroTone(220, 75, 0.18, 'sawtooth', 0.1);
  } else {
    attackCooldown = 0.32;
    attackAnimTimer = 0.2;
    slashArc.scale.set(1, 1, 1);
    playRetroTone(480, 180, 0.1, 'square', 0.07);
  }

  slashArc.material.opacity = 0.65;

  const dmg = isHeavy ? 38 : 20;
  const range = isHeavy ? 4.2 : 3.4;
  const knock = isHeavy ? 2.2 : 1.1;
  const forward = new THREE.Vector3(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));

  // Golpear cajas rompibles
  for (let c = crates.length - 1; c >= 0; c--) {
    const cr = crates[c];
    const distC = Math.hypot(cr.mesh.position.x - player.position.x, cr.mesh.position.z - player.position.z);
    if (distC < range) {
      cr.hp -= dmg;
      spawnHitParticles(cr.mesh.position.x, 0.9, cr.mesh.position.z, 0xd99b52, 6);
      if (cr.hp <= 0) {
        scene.remove(cr.mesh);
        crates.splice(c, 1);
        score += 50;
        playRetroTone(180, 70, 0.14, 'square', 0.08);
        spawnPickup(cr.mesh.position.x, cr.mesh.position.z, Math.random() < 0.65 ? 'potion' : 'gem');
      }
    }
  }

  // Golpear enemigos
  for (let i = enemies.length - 1; i >= 0; i--) {
    const en = enemies[i];
    const toEn = new THREE.Vector3().subVectors(en.group.position, player.position);
    toEn.y = 0;
    const dist = toEn.length();
    if (dist < range) {
      toEn.normalize();
      const dot = forward.dot(toEn);
      if (dot > 0.05 || dist < 1.6) {
        en.hp -= dmg;
        en.group.position.x += toEn.x * knock;
        en.group.position.z += toEn.z * knock;
        screenShake = isHeavy ? 0.16 : 0.07;
        playRetroTone(160, 85, 0.09, 'square', 0.08);
        spawnHitParticles(en.group.position.x, 1.3, en.group.position.z, en.type === 'zombie' ? 0x74c648 : 0xfaf0ca, 7);

        if (en.hp <= 0) {
          const deadPos = en.group.position.clone();
          const wasBoss = en.isBoss;
          const wasZombie = en.type === 'zombie';
          scene.remove(en.group);
          enemies.splice(i, 1);

          combo = Math.min(8, combo + 1);
          comboTimer = 4.0;
          score += (wasBoss ? 600 : wasZombie ? 150 : 120) * combo;
          playRetroTone(520, 780, 0.12, 'square', 0.08);
          spawnHitParticles(deadPos.x, 1.2, deadPos.z, 0xf5c542, 10);

          if (wasBoss || Math.random() < 0.25) {
            spawnPickup(deadPos.x, deadPos.z, Math.random() < 0.6 ? 'potion' : 'gem');
          }
        }
      }
    }
  }
}

function restartGame() {
  for (const en of enemies) scene.remove(en.group);
  enemies.length = 0;
  for (const pk of pickups) scene.remove(pk.mesh);
  pickups.length = 0;
  for (const cr of crates) scene.remove(cr.mesh);
  crates.length = 0;

  playerHp = 100;
  stamina = 100;
  score = 0;
  combo = 1;
  wave = 1;
  isGameOver = false;
  player.position.set(0, 0, 4);
  velocity.set(0, 0, 0);
  centerBanner.classList.add('hidden');

  [
    [-6, -6],
    [6, -6],
    [-6, 6],
    [6, 6]
  ].forEach(([cx, cz]) => spawnCrate(cx, cz));

  startWave(wave);
}

// --- COLISIONES XZ ---
const RADIUS = 0.5;
function collideXZ(pos) {
  const limit = ARENA_HALF - 2.4;
  pos.x = Math.max(-limit, Math.min(limit, pos.x));
  pos.z = Math.max(-limit, Math.min(limit, pos.z));

  for (const box of colliders) {
    const hitX = pos.x + RADIUS > box.minX && pos.x - RADIUS < box.maxX;
    const hitZ = pos.z + RADIUS > box.minZ && pos.z - RADIUS < box.maxZ;
    if (hitX && hitZ) {
      const oL = pos.x + RADIUS - box.minX;
      const oR = box.maxX - (pos.x - RADIUS);
      const oF = pos.z + RADIUS - box.minZ;
      const oB = box.maxZ - (pos.z - RADIUS);
      const m = Math.min(oL, oR, oF, oB);
      if (m === oL) pos.x = box.minX - RADIUS;
      else if (m === oR) pos.x = box.maxX + RADIUS;
      else if (m === oF) pos.z = box.minZ - RADIUS;
      else if (m === oB) pos.z = box.maxZ + RADIUS;
    }
  }
}

// --- HUD ---
const hpBar = document.getElementById('hp-bar');
const hpText = document.getElementById('hp-text');
const staminaBar = document.getElementById('stamina-bar');
const staminaText = document.getElementById('stamina-text');
const waveText = document.getElementById('wave-text');
const scoreText = document.getElementById('score-text');
const comboText = document.getElementById('combo-text');

function updateHUD(dt) {
  const clampedHp = Math.max(0, playerHp);
  hpBar.style.width = `${clampedHp}%`;
  hpText.textContent = `${Math.ceil(clampedHp)}`;

  const clampedStam = Math.max(0, stamina);
  staminaBar.style.width = `${clampedStam}%`;
  staminaText.textContent = `${Math.floor(clampedStam)}`;

  waveText.textContent = `${wave}`;
  scoreText.textContent = `${score}`;
  comboText.textContent = `x${combo}`;

  if (waveTransitionTimer > 0 && !isGameOver) {
    waveTransitionTimer -= dt;
    if (waveTransitionTimer <= 0) {
      centerBanner.classList.add('hidden');
    }
  }
}

// --- LOOP PRINCIPAL ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  if (attackCooldown > 0) attackCooldown -= dt;
  if (invulnTimer > 0) invulnTimer -= dt;
  if (screenShake > 0) screenShake -= dt;

  if (combo > 1) {
    comboTimer -= dt;
    if (comboTimer <= 0) combo = 1;
  }

  stamina = Math.min(100, stamina + 18 * dt);

  if (attackAnimTimer > 0) {
    attackAnimTimer -= dt;
    swordPivot.rotation.x = Math.sin((1 - attackAnimTimer / 0.22) * Math.PI) * 1.5;
    slashArc.material.opacity = Math.max(0, (attackAnimTimer / 0.22) * 0.65);
  } else {
    swordPivot.rotation.x = 0;
    slashArc.material.opacity = 0;
  }

  // Animación de antorchas
  for (const fl of flames) {
    fl.mesh.scale.y = 0.85 + Math.sin(elapsed * 12 + fl.phase) * 0.25;
  }

  // Actualizar partículas
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.life -= dt;
    pt.vy -= 14 * dt;
    pt.mesh.position.x += pt.vx * dt;
    pt.mesh.position.y = Math.max(0.1, pt.mesh.position.y + pt.vy * dt);
    pt.mesh.position.z += pt.vz * dt;
    if (pt.life <= 0) {
      scene.remove(pt.mesh);
      particles.splice(i, 1);
    }
  }

  // Recoger pociones y cristales
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pk = pickups[i];
    pk.age += dt;
    pk.mesh.rotation.y += 3.2 * dt;
    pk.mesh.position.y = 0.65 + Math.sin(elapsed * 5 + i) * 0.14;

    if (Math.hypot(pk.mesh.position.x - player.position.x, pk.mesh.position.z - player.position.z) < 1.6) {
      if (pk.kind === 'potion') {
        playerHp = Math.min(100, playerHp + 28);
        playRetroTone(440, 660, 0.14, 'triangle', 0.08);
      } else {
        score += 250 * combo;
        playRetroTone(587, 880, 0.14, 'square', 0.08);
      }
      scene.remove(pk.mesh);
      pickups.splice(i, 1);
    }
  }

  if (!isGameOver) {
    let mf = 0;
    let mr = 0;
    if (keys['KeyW'] || keys['ArrowUp']) mf += 1;
    if (keys['KeyS'] || keys['ArrowDown']) mf -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mr += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) mr -= 1;
    if (joyActive) {
      mf -= joyVec.y;
      mr += joyVec.x;
    }

    const len = Math.hypot(mf, mr);
    if (len > 1) {
      mf /= len;
      mr /= len;
    }

    const fwd = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const rgt = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
    const dir = new THREE.Vector3().addScaledVector(fwd, mf).addScaledVector(rgt, mr);

    if (dashTimer > 0) {
      dashTimer -= dt;
    } else {
      const speed = 8.6;
      velocity.x = THREE.MathUtils.lerp(velocity.x, dir.x * speed, 14 * dt);
      velocity.z = THREE.MathUtils.lerp(velocity.z, dir.z * speed, 14 * dt);
    }

    if ((keys['Space'] || touchJump) && isGrounded) {
      velocity.y = 9.3;
      isGrounded = false;
      playRetroTone(240, 420, 0.09, 'square', 0.05);
    }
    velocity.y -= 24 * dt;

    player.position.x += velocity.x * dt;
    player.position.y += velocity.y * dt;
    player.position.z += velocity.z * dt;

    if (player.position.y <= 0) {
      player.position.y = 0;
      velocity.y = 0;
      isGrounded = true;
    }

    collideXZ(player.position);

    const hSpeed = Math.hypot(velocity.x, velocity.z);
    if (hSpeed > 0.35) {
      const targetYaw = Math.atan2(velocity.x, velocity.z);
      player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, targetYaw, 13 * dt);
      const swing = Math.sin(elapsed * hSpeed * 1.5) * 0.55;
      leftLeg.rotation.x = swing;
      rightLeg.rotation.x = -swing;
    } else {
      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
    }

    // IA de esqueletos y zombis rabiosos
    for (const en of enemies) {
      if (en.attackCooldown > 0) en.attackCooldown -= dt;

      const toPlayer = new THREE.Vector3().subVectors(player.position, en.group.position);
      toPlayer.y = 0;
      const dist = toPlayer.length();

      if (dist > 0.1) {
        toPlayer.normalize();
        const wobble = en.type === 'zombie' ? Math.sin(elapsed * 12 + en.group.position.x) * 0.28 : 0;
        en.group.position.x += (toPlayer.x + wobble * -toPlayer.z) * en.speed * dt;
        en.group.position.z += (toPlayer.z + wobble * toPlayer.x) * en.speed * dt;
        en.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
        collideXZ(en.group.position);

        const stride = Math.sin(elapsed * en.speed * 1.8) * 0.6;
        en.lLeg.rotation.x = stride;
        en.rLeg.rotation.x = -stride;
      }

      const hitReach = en.isBoss ? 2.2 : 1.55;
      if (dist < hitReach && en.attackCooldown <= 0 && invulnTimer <= 0) {
        en.attackCooldown = en.type === 'zombie' ? 0.75 : 1.05;
        playerHp -= en.damage;
        combo = 1;
        screenShake = 0.14;
        playRetroTone(140, 55, 0.14, 'sawtooth', 0.09);
        spawnHitParticles(player.position.x, 1.2, player.position.z, 0xff3b30, 6);

        if (playerHp <= 0) {
          playerHp = 0;
          isGameOver = true;
          showBanner('HAS CAÍDO — TOCA O PULSA R PARA REINICIAR', 999);
        }
      }
    }

    if (enemies.length === 0) {
      wave += 1;
      startWave(wave);
    }
  }

  const camDist = 8.2;
  const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 2.5 : 0;
  const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake * 2.5 : 0;

  const camTarget = new THREE.Vector3(
    player.position.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist + shakeX,
    player.position.y + 2.2 + Math.sin(camPitch) * camDist + shakeY,
    player.position.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist
  );
  camera.position.lerp(camTarget, 10 * dt);
  camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z);

  updateHUD(dt);
  renderer.render(scene, camera);
}

animate();
