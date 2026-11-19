import * as THREE from 'three';

// --- CONFIGURACIÓN DE ESCENA Y RENDER ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b8de); // Cielo despejado de Asunción
scene.fog = new THREE.FogExp2(0x87b8de, 0.0045);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- ILUMINACIÓN SOLAR ---
const hemiLight = new THREE.HemisphereLight(0xfff4d6, 0x4b5344, 0.85);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfff0c2, 1.35);
dirLight.position.set(60, 110, 45);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 10;
dirLight.shadow.camera.far = 260;
const d = 110;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
scene.add(dirLight);

// --- SISTEMA DE COLISIONES (AABB) ---
const colliders = [];

function addBox(x, y, z, w, h, d, color, solid = true) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
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

// Cartel flotante / hito en canvas texture
function createLandmarkSign(title, subtitle, x, y, z, rotY = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#141820';
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 176);

  ctx.fillStyle = '#f5c542';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 256, 78);

  ctx.fillStyle = '#ffffff';
  ctx.font = '22px sans-serif';
  ctx.fillText(subtitle, 256, 132);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 2.8), mat);
  plane.position.set(x, y, z);
  plane.rotation.y = rotY;
  scene.add(plane);
}

// --- CONSTRUCCIÓN DEL CORREDOR HISTÓRICO DE ASUNCIÓN ---
// 1. Suelo base general (asfalto / veredas)
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(360, 360),
  new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.92 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// 2. PLAZA DE LA DEMOCRACIA (Centro en X: 0, Z: 0)
addBox(0, 0, 0, 46, 0.25, 42, 0xc7bfb2, false); // Explanada principal
addBox(0, 0.25, -4, 14, 0.35, 12, 0xd8cfc0, true); // Plataforma central / anfiteatro
createLandmarkSign('PLAZA DE LA DEMOCRACIA', 'Centro Histórico de Asunción', 0, 4.5, -18, 0);

// Árboles estilizados alrededor de la plaza (lapachos / vegetación)
function addTree(x, z, blossomColor = 0x2e7d32) {
  addBox(x, 0, z, 0.6, 3.2, 0.6, 0x5d4037, true);
  const crown = new THREE.Mesh(
    new THREE.DodecahedronGeometry(2.2, 1),
    new THREE.MeshStandardMaterial({ color: blossomColor, roughness: 0.8 })
  );
  crown.position.set(x, 4.4, z);
  crown.castShadow = true;
  scene.add(crown);
}

const treeCoords = [
  [-18, -15, 0xd85a88], // Lapacho rosado
  [18, -15, 0x2e7d32],
  [-18, 15, 0x2e7d32],
  [18, 15, 0xf2b705],  // Lapacho amarillo
  [-10, 16, 0x2e7d32],
  [10, -16, 0xd85a88]
];
treeCoords.forEach(([tx, tz, col]) => addTree(tx, tz, col));

// 3. CALLE PALMA (Eje Este-Oeste en Z: 28)
// Veredas Norte y Sur de Calle Palma
addBox(0, 0, 21.5, 150, 0.22, 4.5, 0xb8b0a4, false);
addBox(0, 0, 34.5, 150, 0.22, 4.5, 0xb8b0a4, false);
createLandmarkSign('CALLE PALMA', 'Paseo Comercial e Histórico', 0, 5.2, 28, Math.PI / 2);

// Edificios modulares estilo histórico a lo largo de Calle Palma
const palmaColors = [0xe6d3b3, 0xd9b38c, 0xc97a63, 0xe8dfc8, 0xb58d67];
for (let i = -56; i <= 56; i += 16) {
  if (Math.abs(i) < 12) continue; // Dejar paso hacia la Plaza
  const h1 = 8 + (Math.abs(i) % 5);
  const col1 = palmaColors[Math.abs(i) % palmaColors.length];
  addBox(i, 0, 14, 14, h1, 9, col1, true);

  const h2 = 9 + ((Math.abs(i) + 2) % 6);
  const col2 = palmaColors[(Math.abs(i) + 1) % palmaColors.length];
  addBox(i, 0, 42, 14, h2, 9, col2, true);
}

// 4. CASA DE LA INDEPENDENCIA (Hacia el Oeste: X: -64, Z: 28)
addBox(-68, 0, 28, 16, 6.2, 18, 0xf5f2eb, true); // Muros blancos coloniales
addBox(-68, 6.2, 28, 17, 1.4, 19, 0x9e3b24, true); // Techo de tejas rojas
addBox(-59.5, 0, 28, 1.2, 4.2, 4.5, 0x4e342e, true); // Portón histórico
createLandmarkSign('CASA DE LA INDEPENDENCIA', '14 y 15 de Mayo de 1811', -58, 7.8, 28, Math.PI / 2);

// 5. EL CABILDO (Hacia el Norte: X: 0, Z: -68)
// Avenida conectora hacia el Cabildo
addBox(-9, 0, -44, 3.5, 0.22, 44, 0xb8b0a4, false);
addBox(9, 0, -44, 3.5, 0.22, 44, 0xb8b0a4, false);

// Fachada neoclásica con columnas del Cabildo
addBox(0, 0, -76, 36, 11, 14, 0xefe6d5, true);
addBox(0, 11, -76, 37, 1.8, 15, 0xb8523b, true);
for (let cx = -14; cx <= 14; cx += 4) {
  addBox(cx, 0, -68.2, 0.85, 9.5, 0.85, 0xfaf6ee, true); // Columnas frontales
}
createLandmarkSign('EL CABILDO', 'Centro Cultural de la República', 0, 13.5, -67, 0);

// --- PERSONAJE JUGABLE (ESTILO LOW-POLY / ARCADE) ---
const player = new THREE.Group();
player.position.set(0, 0, 8);
scene.add(player);

// Torso
const torso = new THREE.Mesh(
  new THREE.BoxGeometry(0.75, 1.0, 0.42),
  new THREE.MeshStandardMaterial({ color: 0xf4f4f4 }) // Remera blanca clásica
);
torso.position.y = 1.15;
torso.castShadow = true;
player.add(torso);

// Cabeza
const head = new THREE.Mesh(
  new THREE.BoxGeometry(0.45, 0.45, 0.45),
  new THREE.MeshStandardMaterial({ color: 0xd99b72 })
);
head.position.y = 1.92;
head.castShadow = true;
player.add(head);

// Piernas
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

// Cámara orbital estilo GTA San Andreas
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

// --- FÍSICAS TIPO GTA SAN ANDREAS ---
const velocity = new THREE.Vector3();
let isGrounded = false;
const PLAYER_RADIUS = 0.45;
const PLAYER_HEIGHT = 2.1;

function resolveCollisions(pos) {
  isGrounded = false;

  // Suelo base y=0
  if (pos.y <= 0) {
    pos.y = 0;
    velocity.y = 0;
    isGrounded = true;
  }

  for (const box of colliders) {
    const withinX = pos.x + PLAYER_RADIUS > box.minX && pos.x - PLAYER_RADIUS < box.maxX;
    const withinZ = pos.z + PLAYER_RADIUS > box.minZ && pos.z - PLAYER_RADIUS < box.maxZ;
    const withinY = pos.y + PLAYER_HEIGHT > box.minY && pos.y < box.maxY;

    if (withinX && withinZ && withinY) {
      // Comprobar si aterrizó encima de una plataforma/escalón
      const prevBottom = pos.y - velocity.y * 0.016;
      if (prevBottom >= box.maxY - 0.35 && velocity.y <= 0) {
        pos.y = box.maxY;
        velocity.y = 0;
        isGrounded = true;
        continue;
      }

      // Empuje lateral AABB
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

// --- DETECCIÓN DE ZONA EN EL HUD ---
const zoneBanner = document.getElementById('zone-banner');
const coordsEl = document.getElementById('coords');

function updateZoneHUD(pos) {
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
}

// --- LOOP PRINCIPAL ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // Input de movimiento relativo a la cámara
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
  const targetSpeed = isSprinting ? 13.5 : 7.2;

  // Dirección según ángulo de cámara
  const forwardVec = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
  const rightVec = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));

  const moveDir = new THREE.Vector3()
    .addScaledVector(forwardVec, moveForward)
    .addScaledVector(rightVec, moveRight);

  // Aceleración / frenado suave estilo GTA SA
  const accel = isGrounded ? 14 : 5;
  velocity.x = THREE.MathUtils.lerp(velocity.x, moveDir.x * targetSpeed, accel * dt);
  velocity.z = THREE.MathUtils.lerp(velocity.z, moveDir.z * targetSpeed, accel * dt);

  // Salto y gravedad
  if ((keys['Space'] || touchJump) && isGrounded) {
    velocity.y = 9.2;
    isGrounded = false;
  }
  velocity.y -= 24 * dt;

  // Aplicar movimiento
  player.position.x += velocity.x * dt;
  player.position.y += velocity.y * dt;
  player.position.z += velocity.z * dt;

  resolveCollisions(player.position);

  // Rotar personaje hacia donde camina y animar piernas
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

  // Cámara tercera persona suave
  const camDist = 7.5;
  const targetCamPos = new THREE.Vector3(
    player.position.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist,
    player.position.y + 1.8 + Math.sin(camPitch) * camDist,
    player.position.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist
  );
  camera.position.lerp(targetCamPos, 10 * dt);
  camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z);

  updateZoneHUD(player.position);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
