import * as THREE from 'three';

// --- RENDERER Y ESCENA ESTILO 2004 (CALOR TROPICAL + NIEBLA DE DISTANCIA) ---
const scene = new THREE.Scene();
const skyColor = new THREE.Color(0x9bc4e2);
scene.background = skyColor;
scene.fog = new THREE.FogExp2(0xa7cadf, 0.0052);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 450);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
document.body.appendChild(renderer.domElement);

// --- GENERADOR DE TEXTURAS PROCEDURALES (ESTILO TEXTURAS 2004 / PS2) ---
function createProceduralTexture(drawFn, repeatX = 1, repeatY = 1, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Textura de asfalto desgastado con líneas y grietas
const asphaltTex = createProceduralTexture((ctx, s) => {
  ctx.fillStyle = '#36393f';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 2400; i++) {
    const x = (i * 73) % s;
    const y = (i * 137) % s;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.14)';
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.strokeStyle = 'rgba(225, 225, 210, 0.28)';
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 16]);
  ctx.beginPath();
  ctx.moveTo(s / 2, 0);
  ctx.lineTo(s / 2, s);
  ctx.stroke();
}, 24, 24);

// Textura de pasto / césped con briznas y parches de tierra
const grassTex = createProceduralTexture((ctx, s) => {
  ctx.fillStyle = '#487a34';
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 2600; i++) {
    const x = (i * 97) % s;
    const y = (i * 53) % s;
    const shade = i % 3;
    ctx.fillStyle = shade === 0 ? '#5a913f' : shade === 1 ? '#396328' : '#6c8738';
    ctx.fillRect(x, y, 2, 5);
  }
}, 18, 18);

// Textura de baldosa / vereda / piedra colonial
const paverTex = createProceduralTexture((ctx, s) => {
  ctx.fillStyle = '#c8beae';
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(80, 70, 58, 0.35)';
  ctx.lineWidth = 2;
  const step = s / 4;
  for (let gx = 0; gx <= s; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, s);
    ctx.stroke();
  }
  for (let gy = 0; gy <= s; gy += step) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(s, gy);
    ctx.stroke();
  }
}, 8, 8);

// Textura de fachada con ventanas, revoque y molduras (estilo centro de Asunción)
function makeFacadeTexture(wallHex, trimHex, floors = 2, cols = 4, hasArcades = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = wallHex;
  ctx.fillRect(0, 0, 512, 512);

  // Grano sutil de revoque
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect((i * 61) % 512, (i * 109) % 512, 3, 2);
  }

  // Cornisa superior y franjas horizontales
  ctx.fillStyle = trimHex;
  ctx.fillRect(0, 0, 512, 26);
  ctx.fillRect(0, 486, 512, 26);

  const floorH = (460 - 40) / floors;
  const cellW = 512 / cols;

  for (let f = 0; f < floors; f++) {
    const yBase = 36 + f * floorH;
    if (f > 0) {
      ctx.fillStyle = trimHex;
      ctx.fillRect(0, yBase - 8, 512, 8);
    }

    for (let c = 0; c < cols; c++) {
      const xBase = c * cellW;
      const winW = cellW * 0.44;
      const winH = floorH * 0.48;
      const wx = xBase + (cellW - winW) / 2;
      const wy = yBase + floorH * 0.22;

      // Marco de ventana / abertura
      ctx.fillStyle = trimHex;
      ctx.fillRect(wx - 5, wy - 5, winW + 10, winH + 10);

      // Vidrio oscuro reflectante estilo 2004
      ctx.fillStyle = hasArcades && f === floors - 1 ? '#2b211b' : '#263b4d';
      ctx.fillRect(wx, wy, winW, winH);

      // Brillo diagonal en ventana
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.beginPath();
      ctx.moveTo(wx + 4, wy + winH - 4);
      ctx.lineTo(wx + winW * 0.65, wy + 4);
      ctx.lineTo(wx + winW * 0.85, wy + 4);
      ctx.lineTo(wx + winW * 0.25, wy + winH - 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// --- CIELO CON SOL Y NUBES DE CAPA ESTILO 2004 ---
const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(260, 24, 16),
  new THREE.MeshBasicMaterial({
    map: createProceduralTexture((ctx, s) => {
      const grad = ctx.createLinearGradient(0, 0, 0, s);
      grad.addColorStop(0.0, '#3a78b5');
      grad.addColorStop(0.45, '#7cb2d9');
      grad.addColorStop(0.75, '#c7e0ee');
      grad.addColorStop(1.0, '#dce9ef');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);

      // Nubes suaves estilo San Andreas / Vice City
      ctx.fillStyle = 'rgba(255, 250, 240, 0.45)';
      for (let i = 0; i < 14; i++) {
        const cx = ((i * 79) % (s - 60)) + 30;
        const cy = s * 0.35 + ((i * 37) % (s * 0.25));
        ctx.beginPath();
        ctx.ellipse(cx, cy, 42, 11, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }, 2, 1, 512),
    side: THREE.BackSide,
    fog: false
  })
);
scene.add(skyDome);

const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(8, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false })
);
sunMesh.position.set(85, 125, 60);
scene.add(sunMesh);

// --- ILUMINACIÓN SOLAR CÁLIDA ---
const hemiLight = new THREE.HemisphereLight(0xfff5dc, 0x4d6338, 0.9);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffe9b5, 1.45);
dirLight.position.set(85, 125, 60);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 15;
dirLight.shadow.camera.far = 300;
const shadowBound = 125;
dirLight.shadow.camera.left = -shadowBound;
dirLight.shadow.camera.right = shadowBound;
dirLight.shadow.camera.top = shadowBound;
dirLight.shadow.camera.bottom = -shadowBound;
scene.add(dirLight);

// --- SISTEMA DE COLISIONES (CAJAS Y RAMPAS DE ESCALERA) ---
const colliders = [];
const ramps = [];

function addBox(x, y, z, w, h, d, materialOrColor, solid = true) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat =
    materialOrColor instanceof THREE.Material
      ? materialOrColor
      : new THREE.MeshStandardMaterial({ color: materialOrColor, roughness: 0.84 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  if (solid) {
    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: y,
      maxY: y + h,
      minZ: z - d / 2,
      maxZ: z + d / 2
    });
  }
  return mesh;
}

// Escalera real con peldaños visibles + rampa colisionable suave para subir caminando/corriendo
function addStaircase(x, yStart, zStart, width, totalHeight, totalDepth, stepsCount, dirZ = -1, stepColor = 0xd6cec0) {
  const stepH = totalHeight / stepsCount;
  const stepD = totalDepth / stepsCount;

  for (let i = 0; i < stepsCount; i++) {
    const sy = yStart + i * stepH;
    const sz = zStart + dirZ * (i * stepD + stepD / 2);
    addBox(x, sy, sz, width, stepH, stepD * 1.05, stepColor, false);
  }

  // Rampa invisible de subida suave para que el personaje suba sin trabarse peldaño a peldaño
  const minZ = Math.min(zStart, zStart + dirZ * totalDepth);
  const maxZ = Math.max(zStart, zStart + dirZ * totalDepth);
  ramps.push({
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ,
    maxZ,
    yStart,
    yEnd: yStart + totalHeight,
    dirZ,
    zStart,
    totalDepth
  });
}

// Cartel de calle / hito histórico
function createLandmarkSign(title, subtitle, x, y, z, rotY = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#12161f';
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = '#f7c948';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 176);

  ctx.fillStyle = '#f7c948';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 256, 76);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '21px sans-serif';
  ctx.fillText(subtitle, 256, 130);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.7), mat);
  plane.position.set(x, y, z);
  plane.rotation.y = rotY;
  scene.add(plane);
}

// --- SUELO: CALLES DE ASFALTO + PARQUES CON PASTO ---
const roadMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.9 });
const grassMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.92 });
const paverMat = new THREE.MeshStandardMaterial({ map: paverTex, roughness: 0.85 });

const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), roadMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- ÁRBOLES CON TRONCO RAMIFICADO Y COPA FRONDOSA (ESTILO 2004) ---
function addTree(x, z, crownColor = 0x3b7a2a, scale = 1) {
  // Tronco
  addBox(x, 0, z, 0.55 * scale, 2.8 * scale, 0.55 * scale, 0x5c3d28, true);

  const cMat = new THREE.MeshStandardMaterial({ color: crownColor, roughness: 0.82 });
  const mainCrown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1 * scale, 1), cMat);
  mainCrown.position.set(x, 3.9 * scale, z);
  mainCrown.scale.set(1.15, 0.85, 1.15);
  mainCrown.castShadow = true;
  mainCrown.receiveShadow = true;
  scene.add(mainCrown);

  const subCrown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.45 * scale, 1), cMat);
  subCrown.position.set(x + 0.8 * scale, 3.4 * scale, z - 0.5 * scale);
  subCrown.castShadow = true;
  scene.add(subCrown);
}

// --- 1. PLAZA DE LA DEMOCRACIA (X: 0, Z: 0) CON PASTO, CANTEROS Y ESCALERAS ---
addBox(0, 0, 0, 52, 0.24, 46, paverMat, false);

// Áreas verdes con pasto dentro de la plaza
addBox(-14, 0.24, -8, 15, 0.16, 14, grassMat, false);
addBox(14, 0.24, -8, 15, 0.16, 14, grassMat, false);
addBox(-14, 0.24, 9, 15, 0.16, 12, grassMat, false);
addBox(14, 0.24, 9, 15, 0.16, 12, grassMat, false);

// Tarima / mirador elevado con escalera real accesible
addBox(0, 0.24, -7, 12, 0.9, 10, paverMat, true);
addStaircase(0, 0.24, -2, 4.5, 0.9, 2.4, 5, -1, 0xded6c8);

createLandmarkSign('PLAZA DE LA DEMOCRACIA', 'Microcentro de Asunción — Paraguay', 0, 4.8, -19, 0);

const plazaTrees = [
  [-15, -9, 0xd85a88, 1.1], // Tajy / Lapacho rosado
  [15, -9, 0x3a7d2c, 1.15],
  [-15, 9, 0x458b32, 1.0],
  [15, 9, 0xe8b825, 1.1],  // Lapacho amarillo
  [-9, 10, 0x336e26, 0.95],
  [9, -10, 0xd85a88, 1.05],
  [-22, 0, 0x3e822e, 1.2],
  [22, 0, 0x3e822e, 1.2]
];
plazaTrees.forEach(([tx, tz, col, sc]) => addTree(tx, tz, col, sc));

// --- 2. CALLE PALMA (EJE HISTÓRICO COMERCIAL EN Z: 28) ---
// Veredas y canteros con árboles
addBox(0, 0, 21.2, 170, 0.22, 4.4, paverMat, false);
addBox(0, 0, 34.8, 170, 0.22, 4.4, paverMat, false);
createLandmarkSign('CALLE PALMA', 'Corazón Comercial e Histórico de Asunción', 0, 5.5, 28, Math.PI / 2);

const palmaPalettes = [
  ['#e6d2b5', '#8c5a3c', 2, 4, false],
  ['#d9a77a', '#5c3a24', 3, 4, true],
  ['#c97b63', '#f2e8d5', 2, 3, false],
  ['#e8dec8', '#6b4c35', 3, 5, true],
  ['#b88b62', '#3d2b1f', 2, 4, false]
];

for (let i = -64; i <= 64; i += 16) {
  if (Math.abs(i) < 12) continue; // Paso libre hacia la Plaza de la Democracia

  const [w1, t1, fl1, co1, arc1] = palmaPalettes[Math.abs(i) % palmaPalettes.length];
  const h1 = fl1 * 3.4;
  const tex1 = makeFacadeTexture(w1, t1, fl1, co1, arc1);
  const mat1 = new THREE.MeshStandardMaterial({ map: tex1, roughness: 0.78 });
  addBox(i, 0, 13.5, 14.2, h1, 9.2, mat1, true);
  // Cornisa / techo superior
  addBox(i, h1, 13.5, 14.6, 0.55, 9.6, 0x6e4730, true);

  const [w2, t2, fl2, co2, arc2] = palmaPalettes[(Math.abs(i) + 2) % palmaPalettes.length];
  const h2 = fl2 * 3.4;
  const tex2 = makeFacadeTexture(w2, t2, fl2, co2, arc2);
  const mat2 = new THREE.MeshStandardMaterial({ map: tex2, roughness: 0.78 });
  addBox(i, 0, 42.5, 14.2, h2, 9.2, mat2, true);
  addBox(i, h2, 42.5, 14.6, 0.55, 9.6, 0x5c3c28, true);

  // Árboles de vereda en Calle Palma
  addTree(i + 7.5, 21.2, 0x3b7d2b, 0.9);
  addTree(i - 7.5, 34.8, 0x458a33, 0.92);
}

// --- 3. CASA DE LA INDEPENDENCIA (ESTILO COLONIAL PARAGUAYO CON TEJAS Y GALERÍA) ---
const indTex = makeFacadeTexture('#f7f3ea', '#8b3a2b', 1, 3, true);
const indMat = new THREE.MeshStandardMaterial({ map: indTex, roughness: 0.82 });

addBox(-72, 0, 28, 17, 5.6, 19, indMat, true);
// Tejado inclinado escalonado de tejas rojas
addBox(-72, 5.6, 28, 18.2, 0.9, 20.2, 0xa83b24, true);
addBox(-72, 6.5, 28, 13.5, 0.8, 15.0, 0x94321d, true);
// Escalera de acceso a la entrada principal
addStaircase(-61.5, 0, 28, 4.2, 1.1, 2.4, 5, -1, 0xe5ddd0);
createLandmarkSign('CASA DE LA INDEPENDENCIA', 'Gesta de Mayo 1811 — Asunción', -59, 8.2, 28, Math.PI / 2);

addTree(-62, 19.5, 0x3c7e2c, 1.15);
addTree(-62, 36.5, 0xd85a88, 1.1);

// --- 4. EL CABILDO / CENTRO CULTURAL DE LA REPÚBLICA (CON ESCALINATA Y COLUMNATA) ---
// Parque y corredor con pasto rumbo al Cabildo
addBox(-24, 0, -45, 14, 0.22, 44, grassMat, false);
addBox(24, 0, -45, 14, 0.22, 44, grassMat, false);
addBox(-9.5, 0, -45, 3.2, 0.22, 44, paverMat, false);
addBox(9.5, 0, -45, 3.2, 0.22, 44, paverMat, false);

const cabildoTex = makeFacadeTexture('#f2e8d5', '#c9b79c', 2, 7, false);
const cabildoMat = new THREE.MeshStandardMaterial({ map: cabildoTex, roughness: 0.78 });

// Base elevada y cuerpo principal del Cabildo
addBox(0, 0, -78, 40, 1.4, 16, paverMat, true);
addBox(0, 1.4, -78, 38, 10.2, 14, cabildoMat, true);
addBox(0, 11.6, -78, 39.2, 1.4, 15.2, 0xa6442e, true);

// Columnas clásicas frontales
for (let cx = -16; cx <= 16; cx += 4) {
  addBox(cx, 1.4, -70.4, 0.85, 10.2, 0.85, 0xfaf6ee, true);
}

// Escalinata real ancha frente al Cabildo
addStaircase(0, 0, -68.5, 14, 1.4, 3.6, 7, -1, 0xe3dbd0);
createLandmarkSign('EL CABILDO', 'Centro Cultural de la República', 0, 14.5, -69, 0);

addTree(-18, -56, 0x3c7d2b, 1.25);
addTree(18, -56, 0xe8b825, 1.2);
addTree(-23, -34, 0x458b32, 1.15);
addTree(23, -34, 0x387828, 1.15);

// --- PERSONAJE JUGABLE (MANTENIDO COMO EN LA VERSIÓN ANTERIOR) ---
const player = new THREE.Group();
player.position.set(0, 0, 8);
scene.add(player);

const torso = new THREE.Mesh(
  new THREE.BoxGeometry(0.75, 1.0, 0.42),
  new THREE.MeshStandardMaterial({ color: 0xf4f4f4 })
);
torso.position.y = 1.15;
torso.castShadow = true;
player.add(torso);

const head = new THREE.Mesh(
  new THREE.BoxGeometry(0.45, 0.45, 0.45),
  new THREE.MeshStandardMaterial({ color: 0xd99b72 })
);
head.position.y = 1.92;
head.castShadow = true;
player.add(head);

const legMat = new THREE.MeshStandardMaterial({ color: 0x243447 });
const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.34), legMat);
leftLeg.position.set(-0.2, 0.35, 0);
leftLeg.castShadow = true;
player.add(leftLeg);

const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.7, 0.34), legMat);
rightLeg.position.set(0.2, 0.35, 0);
rightLeg.castShadow = true;
player.add(rightLeg);

// --- CONTROLES DE TECLADO, MOUSE Y TÁCTIL ---
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

let camYaw = 0;
let camPitch = 0.28;
let isDraggingCam = false;
let prevPointer = { x: 0, y: 0 };

renderer.domElement.addEventListener('pointerdown', (e) => {
  isDraggingCam = true;
  prevPointer = { x: e.clientX, y: e.clientY };
});

window.addEventListener('pointermove', (e) => {
  if (!isDraggingCam) return;
  const dx = e.clientX - prevPointer.x;
  const dy = e.clientY - prevPointer.y;
  prevPointer = { x: e.clientX, y: e.clientY };

  camYaw -= dx * 0.0065;
  camPitch = Math.max(0.08, Math.min(1.05, camPitch + dy * 0.005));
});

window.addEventListener('pointerup', () => {
  isDraggingCam = false;
});

// Joystick táctil
const joyZone = document.getElementById('joystick-zone');
const joyStick = document.getElementById('joystick-stick');
let joyVector = { x: 0, y: 0 };
let joyActive = false;

joyZone.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  joyActive = true;
  updateJoystick(e);
});

joyZone.addEventListener('pointermove', (e) => {
  if (!joyActive) return;
  e.stopPropagation();
  updateJoystick(e);
});

const resetJoystick = () => {
  joyActive = false;
  joyVector = { x: 0, y: 0 };
  joyStick.style.transform = 'translate(0px, 0px)';
};
joyZone.addEventListener('pointerup', resetJoystick);
joyZone.addEventListener('pointercancel', resetJoystick);

function updateJoystick(e) {
  const rect = joyZone.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const maxR = rect.width / 2 - 18;

  let dx = e.clientX - cx;
  let dy = e.clientY - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > maxR) {
    dx = (dx / dist) * maxR;
    dy = (dy / dist) * maxR;
  }
  joyStick.style.transform = `translate(${dx}px, ${dy}px)`;
  joyVector.x = dx / maxR;
  joyVector.y = dy / maxR;
}

// Botones táctiles Correr y Saltar
let touchSprint = false;
let touchJump = false;
const btnSprint = document.getElementById('btn-sprint');
const btnJump = document.getElementById('btn-jump');

btnSprint.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  touchSprint = !touchSprint;
  btnSprint.classList.toggle('active', touchSprint);
});

btnJump.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  touchJump = true;
});
btnJump.addEventListener('pointerup', () => {
  touchJump = false;
});

// --- FÍSICAS TIPO GTA SAN ANDREAS (CAJAS + ESCALERAS/RAMPAS) ---
const velocity = new THREE.Vector3();
let isGrounded = false;
const PLAYER_RADIUS = 0.45;
const PLAYER_HEIGHT = 2.1;

function getRampHeightAt(pos) {
  let highestRampY = 0;
  for (const r of ramps) {
    if (pos.x >= r.minX && pos.x <= r.maxX && pos.z >= r.minZ && pos.z <= r.maxZ) {
      const progress = Math.min(1, Math.max(0, Math.abs(pos.z - r.zStart) / r.totalDepth));
      const h = r.yStart + progress * (r.yEnd - r.yStart);
      if (h > highestRampY) highestRampY = h;
    }
  }
  return highestRampY;
}

function resolveCollisions(pos) {
  isGrounded = false;
  const rampFloor = getRampHeightAt(pos);

  if (pos.y <= rampFloor) {
    pos.y = rampFloor;
    if (velocity.y < 0) velocity.y = 0;
    isGrounded = true;
  }

  for (const box of colliders) {
    const withinX = pos.x + PLAYER_RADIUS > box.minX && pos.x - PLAYER_RADIUS < box.maxX;
    const withinZ = pos.z + PLAYER_RADIUS > box.minZ && pos.z - PLAYER_RADIUS < box.maxZ;
    const withinY = pos.y + PLAYER_HEIGHT > box.minY && pos.y < box.maxY;

    if (withinX && withinZ && withinY) {
      const prevBottom = pos.y - velocity.y * 0.016;
      if (prevBottom >= box.maxY - 0.38 && velocity.y <= 0) {
        pos.y = box.maxY;
        velocity.y = 0;
        isGrounded = true;
        continue;
      }

      const overlapLeft = pos.x + PLAYER_RADIUS - box.minX;
      const overlapRight = box.maxX - (pos.x - PLAYER_RADIUS);
      const overlapFront = pos.z + PLAYER_RADIUS - box.minZ;
      const overlapBack = box.maxZ - (pos.z - PLAYER_RADIUS);

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapFront, overlapBack);
      if (minOverlap === overlapLeft) pos.x = box.minX - PLAYER_RADIUS;
      else if (minOverlap === overlapRight) pos.x = box.maxX + PLAYER_RADIUS;
      else if (minOverlap === overlapFront) pos.z = box.minZ - PLAYER_RADIUS;
      else if (minOverlap === overlapBack) pos.z = box.maxZ + PLAYER_RADIUS;
    }
  }
}

// --- HUD DE ZONA Y RELOJ ESTILO 2004 ---
const zoneBanner = document.getElementById('zone-banner');
const coordsEl = document.getElementById('coords');
const clockHud = document.getElementById('clock-hud');
let gameMinutes = 16 * 60 + 20; // Inicia a las 16:20 (tarde cálida de Asunción)

function updateHUD(pos, dt) {
  coordsEl.textContent = `X: ${Math.round(pos.x)} | Z: ${Math.round(pos.z)}`;

  if (pos.z < -48) {
    zoneBanner.textContent = 'EL CABILDO';
  } else if (pos.x < -46 && pos.z > 12) {
    zoneBanner.textContent = 'CASA DE LA INDEPENDENCIA';
  } else if (pos.z > 18 && pos.z < 38) {
    zoneBanner.textContent = 'CALLE PALMA';
  } else {
    zoneBanner.textContent = 'PLAZA DE LA DEMOCRACIA';
  }

  // Avance suave del reloj estilo GTA (1 segundo real = 1 minuto de juego)
  gameMinutes = (gameMinutes + dt * 1.0) % (24 * 60);
  const hh = String(Math.floor(gameMinutes / 60)).padStart(2, '0');
  const mm = String(Math.floor(gameMinutes % 60)).padStart(2, '0');
  clockHud.textContent = `${hh}:${mm}`;
}

// --- LOOP PRINCIPAL ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  skyDome.position.copy(player.position);

  let moveForward = 0;
  let moveRight = 0;
  if (keys['KeyW'] || keys['ArrowUp']) moveForward += 1;
  if (keys['KeyS'] || keys['ArrowDown']) moveForward -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) moveRight += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) moveRight -= 1;

  if (joyActive) {
    moveForward -= joyVector.y;
    moveRight += joyVector.x;
  }

  const inputLen = Math.hypot(moveForward, moveRight);
  if (inputLen > 1) {
    moveForward /= inputLen;
    moveRight /= inputLen;
  }

  const isSprinting = keys['ShiftLeft'] || keys['ShiftRight'] || touchSprint;
  const targetSpeed = isSprinting ? 14.0 : 7.5;

  const forwardVec = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
  const rightVec = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

  const moveDir = new THREE.Vector3()
    .addScaledVector(forwardVec, moveForward)
    .addScaledVector(rightVec, moveRight);

  const accel = isGrounded ? 15 : 5.5;
  velocity.x = THREE.MathUtils.lerp(velocity.x, moveDir.x * targetSpeed, accel * dt);
  velocity.z = THREE.MathUtils.lerp(velocity.z, moveDir.z * targetSpeed, accel * dt);

  if ((keys['Space'] || touchJump) && isGrounded) {
    velocity.y = 9.4;
    isGrounded = false;
  }
  velocity.y -= 24 * dt;

  player.position.x += velocity.x * dt;
  player.position.y += velocity.y * dt;
  player.position.z += velocity.z * dt;

  resolveCollisions(player.position);

  const horizSpeed = Math.hypot(velocity.x, velocity.z);
  if (horizSpeed > 0.4) {
    const targetRot = Math.atan2(velocity.x, velocity.z);
    player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, targetRot, 12 * dt);
    const swing = Math.sin(clock.elapsedTime * horizSpeed * 1.4) * 0.55;
    leftLeg.rotation.x = swing;
    rightLeg.rotation.x = -swing;
  } else {
    leftLeg.rotation.x = 0;
    rightLeg.rotation.x = 0;
  }

  const camDist = 7.6;
  const targetCamPos = new THREE.Vector3(
    player.position.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist,
    player.position.y + 1.85 + Math.sin(camPitch) * camDist,
    player.position.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist
  );
  camera.position.lerp(targetCamPos, 10 * dt);
  camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z);

  updateHUD(player.position, dt);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
