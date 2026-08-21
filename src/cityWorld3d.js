import * as THREE from "./vendor/three.module.js";
import {
  buildWorldModel,
  findNearestInteraction,
  getInteractables,
  getSpawnPoint,
  resolveWorldCollisions
} from "./cityWorldFoundation.mjs";
import { LOCATIONS } from "./gameData.mjs";

/** Minimal HTML escape for user-supplied strings inserted via innerHTML. */
function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const PLAYER_RADIUS = 0.58;
const WALK_SPEED = 4.8;
const RUN_SPEED = 8.9;
const ACCELERATION = 20;
const DECELERATION = 16;
const GRAVITY = 20;
const JUMP_VELOCITY = 6.2;
const CAMERA_DISTANCE = 7.8;
const CAMERA_MIN_DISTANCE = 5.2;
const CAMERA_MAX_DISTANCE = 11.8;
const CAMERA_HEIGHT = 3.1;
const BASE_LOOK_SENSITIVITY = 0.0038;
const INTERACTION_RANGE = 3.4;

const QUALITY = {
  low: { pixelRatio: 1.1, shadow: false, drawDistance: 85, npcLimit: 10 },
  medium: { pixelRatio: 1.5, shadow: true, drawDistance: 120, npcLimit: 22 },
  high: { pixelRatio: 1.8, shadow: true, drawDistance: 150, npcLimit: 40 }
};

const ENTERABLE_INTERIORS = {
  safehouse: "safehouse",
  "safehouse-compound": "safehouse",
  bank: "bank",
  "luxury-club": "nightclub",
  "underground-club": "nightclub",
  restaurant: "restaurant",
  "high-end-restaurant": "restaurant",
  hotel: "hotel",
  "corporate-hotel": "hotel",
  garage: "garage",
  "service-garage": "garage",
  "private-casino": "casino",
  "office-complex": "office",
  "legal-office": "office",
  "business-hub": "office",
  "small-businesses": "store",
  "roadside-market": "store"
};

function createLabelTexture(text, bg = "rgba(15,15,20,0.75)", fg = "#f4e8c8") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = fg;
  ctx.font = "600 28px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(text).slice(0, 22), canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a canvas texture simulating a building facade with lit windows.
 * seed: integer for deterministic randomness
 * baseColor: THREE hex color integer
 * floors: approximate floor count
 */
function createBuildingFacadeTexture(seed, baseColorHex, floors = 8) {
  const w = 256, h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const r = (baseColorHex >> 16) & 0xff;
  const g = (baseColorHex >> 8) & 0xff;
  const b = baseColorHex & 0xff;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, w, h);

  // Horizontal concrete-panel lines
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  const panelH = Math.round(h / Math.max(4, floors));
  for (let i = 0; i < h; i += panelH) {
    ctx.fillRect(0, i, w, 1);
  }
  // Vertical seams
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for (let x = 0; x < w; x += Math.round(w / 6)) {
    ctx.fillRect(x, 0, 1, h);
  }

  // Windows
  const cols = 5;
  const rows = Math.max(4, floors);
  const winW = Math.round(w / cols * 0.56);
  const winH = Math.round(h / rows * 0.48);
  const hPad = Math.round((w / cols - winW) / 2);
  const vPad = Math.round((h / rows - winH) / 2);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const wx = col * Math.round(w / cols) + hPad;
      const wy = row * Math.round(h / rows) + vPad;
      // Seeded deterministic hash for this window
      const hash = (((seed * 1664525 + col * 1013904223 + row * 22695477) >>> 0) % 100);
      if (hash > 22) {
        // Lit window — warm amber/gold
        const warm = 120 + (hash % 80);
        const blue = 30 + (hash % 45);
        ctx.fillStyle = `rgba(255,${warm},${blue},0.88)`;
        // Subtle window frame
        ctx.fillRect(wx - 1, wy - 1, winW + 2, winH + 2);
        ctx.fillStyle = `rgba(255,${warm},${blue},0.92)`;
      } else {
        // Dark/reflective window
        ctx.fillStyle = `rgba(${18 + (hash % 14)},${24 + (hash % 18)},${38 + (hash % 22)},0.92)`;
      }
      ctx.fillRect(wx, wy, winW, winH);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Creates a car mesh: body, cabin, wheels, headlights/tail-lights */
function createCarMesh(owned) {
  const group = new THREE.Group();
  const bodyColor = owned ? 0x1a6ba8 : 0x606068;
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.65, roughness: 0.28 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.95 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x2a3448, metalness: 0.3, roughness: 0.1, transparent: true, opacity: 0.7 });

  // Main body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.6, 4.0), bodyMat);
  body.position.y = 0.54;
  body.castShadow = true;
  group.add(body);

  // Cabin/roof
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.52, 2.1), bodyMat);
  cabin.position.set(0, 1.12, -0.15);
  cabin.castShadow = true;
  group.add(cabin);

  // Windshield (front glass)
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.46, 0.08), glassMat);
  windshield.position.set(0, 1.1, -1.16);
  group.add(windshield);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.26, 14);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x888898, metalness: 0.8, roughness: 0.2 });
  [[-0.95, 0.3, -1.3], [0.95, 0.3, -1.3], [-0.95, 0.3, 1.3], [0.95, 0.3, 1.3]].forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.28, 8), rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(wx, wy, wz);
    group.add(wheel, rim);
  });

  // Headlights (emissive)
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff8e8, emissive: 0xfff0c0, emissiveIntensity: 0.55 });
  [[-0.55, 0.54, -2.02], [0.55, 0.54, -2.02]].forEach(([lx, ly, lz]) => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.05), headMat);
    h.position.set(lx, ly, lz);
    group.add(h);
  });

  // Tail lights
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xee1122, emissive: 0xcc0818, emissiveIntensity: 0.45 });
  [[-0.55, 0.54, 2.02], [0.55, 0.54, 2.02]].forEach(([lx, ly, lz]) => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.05), tailMat);
    tl.position.set(lx, ly, lz);
    group.add(tl);
  });

  group.castShadow = true;
  return group;
}

function makeMarker(text, color = 0xf1b84c) {
  const group = new THREE.Group();
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 8), new THREE.MeshStandardMaterial({ color }));
  cone.position.y = 2.1;
  group.add(cone);

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createLabelTexture(text),
      depthTest: false,
      depthWrite: false
    })
  );
  sprite.scale.set(3.2, 1.1, 1);
  sprite.position.y = 3.1;
  group.add(sprite);

  return group;
}

function createPlayerMesh() {
  const group = new THREE.Group();
  const materials = {
    suit: new THREE.MeshStandardMaterial({ color: 0x1e1f24, roughness: 0.55 }),
    shirt: new THREE.MeshStandardMaterial({ color: 0x3b2440, roughness: 0.6 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb78970, roughness: 0.7 }),
    accent: new THREE.MeshStandardMaterial({ color: 0xc7a569, metalness: 0.42, roughness: 0.34 })
  };

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.05, 0.4), materials.suit);
  torso.position.y = 1.4;
  torso.castShadow = true;
  group.add(torso);

  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.82, 0.23), materials.shirt);
  shirt.position.set(0, 1.4, 0.17);
  shirt.castShadow = true;
  group.add(shirt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), materials.skin);
  head.position.y = 2.2;
  head.castShadow = true;
  group.add(head);

  const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.55, 4, 8), materials.suit);
  const rightArm = leftArm.clone();
  leftArm.position.set(-0.46, 1.45, 0);
  rightArm.position.set(0.46, 1.45, 0);
  leftArm.castShadow = true;
  rightArm.castShadow = true;
  group.add(leftArm, rightArm);

  const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.65, 4, 8), materials.suit);
  const rightLeg = leftLeg.clone();
  leftLeg.position.set(-0.2, 0.6, 0);
  rightLeg.position.set(0.2, 0.6, 0);
  leftLeg.castShadow = true;
  rightLeg.castShadow = true;
  group.add(leftLeg, rightLeg);

  const chain = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 24), materials.accent);
  chain.position.set(0, 1.86, 0.19);
  group.add(chain);

  group.userData.animation = { leftArm, rightArm, leftLeg, rightLeg, head, phase: 0 };
  return group;
}

function animatePlayer(player, speed, dt) {
  const anim = player.userData.animation;
  if (!anim) return;
  const moving = speed > 0.2;
  const swing = moving ? Math.min(0.75, speed / RUN_SPEED) : 0.05;
  anim.phase += dt * (moving ? speed * 0.9 : 1.4);
  const wave = Math.sin(anim.phase * 7) * swing;
  anim.leftArm.rotation.x = wave;
  anim.rightArm.rotation.x = -wave;
  anim.leftLeg.rotation.x = -wave * 1.2;
  anim.rightLeg.rotation.x = wave * 1.2;
  anim.head.position.y = 2.2 + (moving ? Math.abs(Math.sin(anim.phase * 7)) * 0.03 : Math.sin(anim.phase * 2) * 0.02);
}

function createJoystick(container, knob) {
  const state = { x: 0, y: 0, active: false, pointerId: null, cx: 0, cy: 0 };

  const reset = () => {
    state.x = 0;
    state.y = 0;
    state.active = false;
    state.pointerId = null;
    knob.style.transform = "translate(-50%, -50%)";
  };

  const onDown = (event) => {
    if (state.active) return;
    state.active = true;
    state.pointerId = event.pointerId;
    const rect = container.getBoundingClientRect();
    state.cx = rect.left + rect.width / 2;
    state.cy = rect.top + rect.height / 2;
    container.setPointerCapture(event.pointerId);
  };

  const onMove = (event) => {
    if (!state.active || event.pointerId !== state.pointerId) return;
    const dx = event.clientX - state.cx;
    const dy = event.clientY - state.cy;
    const max = 44;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(max, len);
    const nx = (dx / len) * clamped;
    const ny = (dy / len) * clamped;
    state.x = nx / max;
    state.y = ny / max;
    knob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
  };

  const onUp = (event) => {
    if (!state.active || event.pointerId !== state.pointerId) return;
    reset();
  };

  container.addEventListener("pointerdown", onDown);
  container.addEventListener("pointermove", onMove);
  container.addEventListener("pointerup", onUp);
  container.addEventListener("pointercancel", onUp);

  return {
    state,
    destroy() {
      container.removeEventListener("pointerdown", onDown);
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerup", onUp);
      container.removeEventListener("pointercancel", onUp);
    }
  };
}

function createLookPad(pad, onLook) {
  const state = { active: false, pointerId: null, x: 0, y: 0 };

  const onDown = (event) => {
    if (state.active) return;
    state.active = true;
    state.pointerId = event.pointerId;
    state.x = event.clientX;
    state.y = event.clientY;
    pad.setPointerCapture(event.pointerId);
  };

  const onMove = (event) => {
    if (!state.active || event.pointerId !== state.pointerId) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    state.x = event.clientX;
    state.y = event.clientY;
    onLook(dx, dy);
  };

  const onUp = (event) => {
    if (!state.active || event.pointerId !== state.pointerId) return;
    state.active = false;
    state.pointerId = null;
  };

  pad.addEventListener("pointerdown", onDown);
  pad.addEventListener("pointermove", onMove);
  pad.addEventListener("pointerup", onUp);
  pad.addEventListener("pointercancel", onUp);

  return {
    destroy() {
      pad.removeEventListener("pointerdown", onDown);
      pad.removeEventListener("pointermove", onMove);
      pad.removeEventListener("pointerup", onUp);
      pad.removeEventListener("pointercancel", onUp);
    }
  };
}

function getDayPhase(state) {
  const turnsPerDay = state.time?.turnsPerDay || 8;
  const index = ((state.time?.turn || 1) - 1) % turnsPerDay;
  if (index < 2) return "morning";
  if (index < 4) return "day";
  if (index < 6) return "evening";
  return "night";
}

function makeCityBlock(scene, model, state, qualitySettings, streetLights, colliders) {
  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 320),
    new THREE.MeshStandardMaterial({ color: 0x1a2025, roughness: 0.94, metalness: 0.02 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Sidewalk/pavement (slightly raised)
  const sidewalk = new THREE.Mesh(
    new THREE.PlaneGeometry(285, 285),
    new THREE.MeshStandardMaterial({ color: 0x343c44, roughness: 0.96 })
  );
  sidewalk.rotation.x = -Math.PI / 2;
  sidewalk.position.y = 0.01;
  scene.add(sidewalk);

  // Pavement tiles pattern (dark blocks)
  const tileMat = new THREE.MeshStandardMaterial({ color: 0x2c3238, roughness: 0.97 });
  for (let tx = -120; tx <= 120; tx += 20) {
    for (let tz = -120; tz <= 120; tz += 20) {
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(19.2, 19.2), tileMat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(tx, 0.015, tz);
      scene.add(tile);
    }
  }

  // Roads — darker asphalt
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.85 });
  const roads = [
    { w: 240, h: 18, x: 0, z: 0, r: 0 },
    { w: 240, h: 18, x: 0, z: 0, r: Math.PI / 2 },
    { w: 160, h: 14, x: -50, z: -52, r: Math.PI / 7 },
    { w: 160, h: 14, x: 56, z: 54, r: -Math.PI / 6 },
    { w: 110, h: 12, x: -42, z: 28, r: Math.PI / 2.4 },
    { w: 110, h: 12, x: 38, z: -16, r: -Math.PI / 3.6 }
  ];
  roads.forEach((entry) => {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(entry.w, entry.h), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = entry.r;
    road.position.set(entry.x, 0.03, entry.z);
    scene.add(road);
  });

  // Road lane markings (white dashed center lines)
  const laneMat = new THREE.MeshStandardMaterial({ color: 0xdde0e4, roughness: 0.95, transparent: true, opacity: 0.75 });
  // Horizontal road
  for (let x = -110; x <= 110; x += 14) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.32), laneMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, 0.042, 0);
    scene.add(dash);
  }
  // Vertical road
  for (let z = -110; z <= 110; z += 14) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 8), laneMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.042, z);
    scene.add(dash);
  }

  // Crosswalk at main intersection
  const crossMat = new THREE.MeshStandardMaterial({ color: 0xdde0e4, roughness: 0.95, transparent: true, opacity: 0.62 });
  for (let cx = -4; cx <= 4; cx += 2) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 9), crossMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(cx, 0.04, -9);
    scene.add(stripe);
  }
  for (let cx = -4; cx <= 4; cx += 2) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), crossMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(-9, 0.04, cx);
    scene.add(stripe);
  }

  // Curbs/curb edging
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x3e4850, roughness: 0.9 });
  // Along horizontal road
  [-9.5, 9.5].forEach(z => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(200, 0.12, 0.45), curbMat);
    curb.position.set(0, 0.06, z);
    scene.add(curb);
  });
  // Along vertical road
  [-9.5, 9.5].forEach(x => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 200), curbMat);
    curb.position.set(x, 0.06, 0);
    scene.add(curb);
  });

  // Trees (more spread out, around district areas)
  const treeMat  = new THREE.MeshStandardMaterial({ color: 0x273e34, roughness: 0.88 });
  const treeMat2 = new THREE.MeshStandardMaterial({ color: 0x1e3028, roughness: 0.88 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3c2a1e, roughness: 0.92 });
  const treePositions = [
    [-12, -12], [12, -12], [-12, 12], [12, 12],
    [-24, -22], [24, -22], [-24, 22], [24, 22],
    [-38, -14], [38, -14], [-38, 14], [38, 14],
    [-15, -35], [15, -35], [-15, 35], [15, 35],
    [-48, -35], [48, -35], [-48, 35], [48, 35],
    [-68, -8], [68, -8], [-68, 8], [68, 8],
    [-5, -56], [5, -56], [-5, 56], [5, 56],
    [-30, -65], [30, -65], [-30, 65], [30, 65]
  ];
  treePositions.forEach(([tx, tz], ti) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.8, 7), trunkMat);
    trunk.position.set(tx, 0.9, tz);
    const crownH = 2.0 + (ti % 3) * 0.6;
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.9 + (ti % 4) * 0.15, crownH, 7), ti % 2 === 0 ? treeMat : treeMat2);
    crown.position.set(tx, 2.0 + crownH * 0.5 - 0.2, tz);
    scene.add(trunk, crown);
  });

  // Small street furniture: bollards, benches, dumpsters
  const bollardMat = new THREE.MeshStandardMaterial({ color: 0x3a3a4a, metalness: 0.5, roughness: 0.55 });
  const bollardPositions = [[-10, -11], [10, -11], [-10, 11], [10, 11], [-18, -11], [18, -11], [-18, 11], [18, 11]];
  bollardPositions.forEach(([bx, bz]) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.9, 8), bollardMat);
    b.position.set(bx, 0.45, bz);
    scene.add(b);
  });

  // Benches along sidewalk
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x2e2824, roughness: 0.9 });
  const benchMetalMat = new THREE.MeshStandardMaterial({ color: 0x484450, metalness: 0.5, roughness: 0.6 });
  [[-16, -14], [16, -14], [-16, 14], [16, 14]].forEach(([bx, bz]) => {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.6), benchMat);
    seat.position.set(bx, 0.46, bz);
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.46, 0.1), benchMetalMat);
    leg1.position.set(bx - 0.7, 0.23, bz);
    const leg2 = leg1.clone(); leg2.position.set(bx + 0.7, 0.23, bz);
    scene.add(seat, leg1, leg2);
  });

  // Dumpsters
  const dumpMat = new THREE.MeshStandardMaterial({ color: 0x1e3c1e, roughness: 0.85 });
  [[-22, 16], [22, -16], [-44, 8], [44, -8]].forEach(([dx, dz]) => {
    const dump = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.3, 1.0), dumpMat);
    dump.position.set(dx, 0.65, dz);
    scene.add(dump);
  });

  // Parking lot stripes
  const parkMat = new THREE.MeshStandardMaterial({ color: 0xd0d4d8, roughness: 0.96, transparent: true, opacity: 0.5 });
  for (let i = 0; i < 6; i++) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 4.5), parkMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(22 + i * 2.8, 0.038, 20);
    scene.add(stripe);
  }

  const facadeByType = {
    safehouse:  0x3c2e38,
    nightlife:  0x3a2952,
    finance:    0x3a4054,
    garage:     0x2e3740,
    business:   0x4a4254
  };

  const buildingHeightScale = [1.0, 1.2, 0.8, 1.5, 1.8, 1.1, 0.9, 2.0, 1.4, 1.3, 1.6, 0.85, 1.7, 1.0, 1.25, 1.45];

  model.buildings.forEach((building, index) => {
    const baseColor = facadeByType[building.locationType] || (index % 3 === 0 ? 0x3e3a52 : index % 3 === 1 ? 0x4a3848 : 0x2e3844);
    const heightMul = buildingHeightScale[index % buildingHeightScale.length];
    const bh = building.height * heightMul;

    // Facade texture with window lights
    const facadeTex = createBuildingFacadeTexture(index * 137 + 41, baseColor, Math.round(bh * 1.2));
    const facadeMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      map: facadeTex,
      roughness: 0.78,
      metalness: 0.1
    });

    // Main building body
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(building.width, bh, building.depth), facadeMat);
    mesh.position.set(building.x, bh * 0.5, building.z);
    mesh.castShadow = qualitySettings.shadow;
    mesh.receiveShadow = true;
    scene.add(mesh);
    colliders.push(mesh);

    // Rooftop equipment (AC, water tower, antenna)
    const roofY = bh;
    if (index % 4 === 0) {
      // Antenna
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 4),
        new THREE.MeshStandardMaterial({ color: 0x888898, metalness: 0.6, roughness: 0.4 }));
      ant.position.set(building.x + building.width * 0.3, roofY + 1.25, building.z - building.depth * 0.3);
      scene.add(ant);
    }
    if (index % 5 === 0 && bh > 8) {
      // Water tower
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.9 }));
      tank.position.set(building.x - building.width * 0.25, roofY + 0.9, building.z + building.depth * 0.2);
      const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 4),
        new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.8 }));
      legs.position.set(building.x - building.width * 0.25, roofY + 0.0, building.z + building.depth * 0.2);
      scene.add(tank, legs);
    }
    if (index % 3 === 0) {
      // AC unit
      const ac = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x606878, metalness: 0.4, roughness: 0.6 }));
      ac.position.set(building.x + building.width * 0.2, roofY + 0.3, building.z - building.depth * 0.25);
      scene.add(ac);
    }

    // Entrance portal for enterable buildings
    if (building.enterable) {
      const portalMat = new THREE.MeshStandardMaterial({
        color: 0xb59a5f, emissive: 0x6b4a1a, emissiveIntensity: 0.55,
        metalness: 0.3, roughness: 0.4
      });
      const portal = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.22), portalMat);
      portal.position.set(building.door.x, 1.2, building.door.z - 0.4);
      scene.add(portal);

      // Door frame
      const frameMat = new THREE.MeshStandardMaterial({ color: 0xc4a96a, metalness: 0.5, roughness: 0.3 });
      const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.18), frameMat);
      frameL.position.set(building.door.x - 0.85, 1.3, building.door.z - 0.38);
      const frameR = frameL.clone();
      frameR.position.set(building.door.x + 0.85, 1.3, building.door.z - 0.38);
      const frameT = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.18), frameMat);
      frameT.position.set(building.door.x, 2.5, building.door.z - 0.38);
      scene.add(frameL, frameR, frameT);

      // Awning
      const awningMat = new THREE.MeshStandardMaterial({ color: 0x2a1a2e, roughness: 0.9 });
      const awning = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.2), awningMat);
      awning.position.set(building.door.x, 2.75, building.door.z + 0.2);
      scene.add(awning);
    }

    // Sign (neon-lit for nightlife)
    if (building.locationType === "nightlife") {
      const signMat = new THREE.MeshStandardMaterial({
        color: 0x9b4dca, emissive: 0x7a28a8, emissiveIntensity: 0.8, roughness: 0.4
      });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(building.width * 0.6, 0.5, 0.12), signMat);
      sign.position.set(building.x, bh * 0.65, building.z - building.depth * 0.5 - 0.1);
      scene.add(sign);
    }

    const marker = makeMarker(building.name, building.enterable ? 0x78e8b6 : 0xf4c35c);
    marker.position.set(building.door.x, 0, building.door.z);
    scene.add(marker);
  });

  model.districtMarkers.forEach((markerData) => {
    const marker = makeMarker(markerData.name, markerData.districtId === state.selectedDistrictId ? 0x5bd37d : 0x9ec9ff);
    marker.position.set(markerData.x, 0, markerData.z);
    scene.add(marker);
  });

  // Street lights — more of them, along roads
  const lampPostMat = new THREE.MeshStandardMaterial({ color: 0x4a5260, metalness: 0.5, roughness: 0.45 });
  const lampArmMat  = new THREE.MeshStandardMaterial({ color: 0x404858, metalness: 0.55, roughness: 0.4 });
  const lampBulbMat = new THREE.MeshStandardMaterial({ color: 0xfde4ad, emissive: 0xffcc7a, emissiveIntensity: 0.28 });

  const lampPositions = [
    // Along horizontal road (z ≈ ±10)
    [-90, -11], [-72, -11], [-54, -11], [-36, -11], [-18, -11],
    [18, -11],  [36, -11],  [54, -11],  [72, -11],  [90, -11],
    [-90, 11],  [-72, 11],  [-54, 11],  [-36, 11],  [-18, 11],
    [18, 11],   [36, 11],   [54, 11],   [72, 11],   [90, 11],
    // Along vertical road (x ≈ ±10)
    [-11, -90], [-11, -72], [-11, -54], [-11, -36], [-11, -18],
    [-11, 18],  [-11, 36],  [-11, 54],  [-11, 72],  [-11, 90],
    [11, -90],  [11, -72],  [11, -54],  [11, -36],  [11, -18],
    [11, 18],   [11, 36],   [11, 54],   [11, 72],   [11, 90],
    // Diagonal road lamps
    [-52, -48], [-38, -38], [-28, -28],
    [42, 28],   [54, 38],   [66, 48]
  ];

  lampPositions.forEach(([x, z]) => {
    // Post
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5.0, 8), lampPostMat);
    post.position.set(x, 2.5, z);
    // Arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.1), lampArmMat);
    arm.position.set(x + (z > 0 ? 0.6 : -0.6), 4.9, z);
    // Bulb
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), lampBulbMat.clone());
    bulb.position.set(x + (z > 0 ? 1.1 : -1.1), 4.7, z);
    // Housing shade
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.22, 0.28, 8, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x3a4050, side: THREE.DoubleSide, roughness: 0.8 }));
    shade.position.set(x + (z > 0 ? 1.1 : -1.1), 4.84, z);
    scene.add(post, arm, bulb, shade);

    const light = new THREE.PointLight(0xffe0a0, 0, 18, 2);
    light.position.set(x + (z > 0 ? 1.1 : -1.1), 4.7, z);
    scene.add(light);
    streetLights.push({ bulb, light });
  });
}

function populateInteriors(scene, interiorType, markers) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x27222a, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3b3237, roughness: 0.84 });
  [
    [0, 3, -15, 30, 6, 1],
    [0, 3, 15, 30, 6, 1],
    [-15, 3, 0, 1, 6, 30],
    [15, 3, 0, 1, 6, 30]
  ].forEach(([x, y, z, w, h, d]) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    wall.position.set(x, y, z);
    scene.add(wall);
  });

  const createProp = (x, y, z, w, h, d, color) => {
    const prop = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.72 }));
    prop.position.set(x, y, z);
    prop.castShadow = true;
    scene.add(prop);
  };

  if (interiorType === "safehouse") {
    createProp(-8.2, 0.4, -6.4, 3.6, 0.8, 2.1, 0x4f3742); // sofa
    createProp(-2.4, 0.45, 4.1, 2.4, 0.9, 1.5, 0x574447); // bed
    createProp(5.8, 1.1, -2.6, 2.2, 2.2, 1.1, 0x352f36); // wardrobe
    createProp(1.8, 0.5, -5.6, 2.1, 1.0, 1.2, 0x4f4143); // table
    createProp(8.1, 0.75, 4.7, 2.0, 1.5, 1.3, 0x493e44); // storage
  }

  if (interiorType === "nightclub") {
    createProp(0, 0.12, 0, 11, 0.24, 9, 0x2a2034); // dance floor
    createProp(-9.6, 1, -8, 5.2, 2, 1.2, 0x463942); // bar
    createProp(8.3, 0.45, -6.4, 2, 0.9, 1.1, 0x533f4f); // table
    createProp(8.3, 0.45, -2.8, 2, 0.9, 1.1, 0x533f4f);
    createProp(8.3, 0.45, 1, 2, 0.9, 1.1, 0x533f4f);
    createProp(9, 1.2, 8.4, 4.8, 2.4, 1.7, 0x4d3e3a); // vip booth

    const clubLight = new THREE.PointLight(0xb35dff, 0.9, 24, 1.7);
    clubLight.position.set(0, 4.7, 0);
    scene.add(clubLight);
  }

  if (interiorType === "bank") {
    createProp(-9.2, 1.1, -5, 5.2, 2.2, 1.2, 0x5f646d); // counter 1
    createProp(-9.2, 1.1, 0, 5.2, 2.2, 1.2, 0x5f646d); // counter 2
    createProp(-9.2, 1.1, 5, 5.2, 2.2, 1.2, 0x5f646d); // counter 3
    createProp(8.4, 1.5, -0.4, 3.6, 3, 0.8, 0x4f535b); // vault door
    createProp(3.8, 0.8, 7.5, 2.6, 1.6, 1.5, 0x686d76); // teller area
  }

  if (interiorType === "restaurant" || interiorType === "hotel") {
    createProp(0, 0.42, -2.6, 8, 0.84, 2.2, 0x4b3a3d);
    createProp(-7.2, 0.44, 4.4, 2.2, 0.88, 2.2, 0x5a4641);
    createProp(7.2, 0.44, 4.4, 2.2, 0.88, 2.2, 0x5a4641);
    createProp(0, 1.5, 12.8, 6.2, 2.8, 1.2, 0x3a333e);
  }

  if (interiorType === "garage") {
    createProp(-8.2, 0.5, -5.4, 4, 1, 5, 0x3e434c);
    createProp(0.8, 0.65, -5.2, 5.4, 1.3, 4.2, 0x474f59);
    createProp(8.2, 0.6, 6.4, 4.8, 1.2, 5.6, 0x4d5864);
  }

  if (interiorType === "casino" || interiorType === "store" || interiorType === "office") {
    createProp(-8.8, 1.1, -6.8, 5.4, 2.2, 1.2, 0x554b5f);
    createProp(-8.8, 1.1, 0, 5.4, 2.2, 1.2, 0x554b5f);
    createProp(7.6, 0.55, 5.8, 4.2, 1.1, 2.2, 0x3f4450);
    createProp(0, 0.5, -2.4, 5.6, 1, 2.4, 0x514958);
  }

  markers.push({
    id: "interior-exit",
    districtId: null,
    locationId: null,
    x: 0,
    z: 12,
    prompt: "Exit Interior",
    interactionType: "interior-exit"
  });
  const exitMarker = makeMarker("EXIT", 0x8ed2ff);
  exitMarker.position.set(0, 0, 12);
  scene.add(exitMarker);
}

export function mountCityWorld3d({ container, state, onInteract, onMenuAction, onError, settings = {}, text = {} }) {
  if (!container) return { destroy() {} };
  if (typeof window === "undefined" || !window.WebGLRenderingContext) {
    container.innerHTML = `<section class="card"><h3>3D Unsupported</h3><p class="muted">WebGL is unavailable on this device. Use City/District panels.</p></section>`;
    return { destroy() {} };
  }

  const model = buildWorldModel(state);
  const qualitySettings = QUALITY[settings.graphicsQuality] || QUALITY.medium;
  const interactables = getInteractables(model);
  const spawn = getSpawnPoint(state, model);

  const t = (key, fallback) => text[key] || fallback;
  const weatherLabelById = {
    clear: t("weather.clear", "CLEAR"),
    cloudy: t("weather.cloudy", "CLOUDY"),
    rain: t("weather.rain", "RAIN"),
    fog: t("weather.fog", "FOG")
  };

  const initHp  = Math.round(state.player.health);
  const initEn  = Math.round(state.player.energy);
  const initXp  = state.player.xp || 0;
  const initNxp = state.player.nextLevelXp || 100;
  const initLvl = state.player.level || 1;
  const initCash = `$${Math.round(state.player.money || 0).toLocaleString()}`;
  const initWanted = state.player.wantedLevel || 0;
  const initRep = state.player.reputation?.city || 0;
  const initName = state.player.name || "—";
  const initDistrict = (state.districts?.find(d => d.id === state.selectedDistrictId)?.name || "CITY").toUpperCase();

  const wantedStars = Array.from({ length: 5 }, (_, i) =>
    `<span class="hud-wanted-star${i < initWanted ? " lit" : ""}">★</span>`
  ).join("");

  container.innerHTML = `
    <div class="city-world-stage">
      <div class="city-world-canvas"></div>
      <div class="city-world-overlay">

        <!-- Premium HUD left: health, energy, xp, level -->
        <div class="hud-panel hud-left">
          <div class="hud-name" id="hud-name">${esc(initName)}</div>
          <div class="hud-row">
            <span class="hud-ico">♥</span>
            <div class="hud-bar-track"><div class="hud-bar-fill hud-hp" id="hud-hp-fill" style="width:${Math.min(100,initHp)}%"></div></div>
            <span class="hud-val" id="hud-hp-val">${initHp}</span>
          </div>
          <div class="hud-row">
            <span class="hud-ico hud-ico-en">⚡</span>
            <div class="hud-bar-track"><div class="hud-bar-fill hud-en" id="hud-en-fill" style="width:${Math.min(100,initEn)}%"></div></div>
            <span class="hud-val" id="hud-en-val">${initEn}</span>
          </div>
          <div class="hud-row">
            <span class="hud-ico hud-ico-xp">★</span>
            <div class="hud-bar-track"><div class="hud-bar-fill hud-xp" id="hud-xp-fill" style="width:${Math.min(100,initXp/Math.max(1,initNxp)*100)}%"></div></div>
            <span class="hud-lvl" id="hud-lvl">LV${initLvl}</span>
          </div>
        </div>

        <!-- Premium HUD right: cash, wanted, rep -->
        <div class="hud-panel hud-right">
          <div class="hud-cash" id="hud-cash">${initCash}</div>
          <div class="hud-wanted" id="hud-wanted">${wantedStars}</div>
          <div class="hud-rep" id="hud-rep">REP ${initRep}</div>
        </div>

        <!-- Top controls + district/time/weather badges -->
        <div class="hud-top-controls">
          <button class="world-button small" id="pause-button" type="button" aria-label="Pause menu">☰</button>
          <div class="hud-badge-row">
            <span class="hud-badge hud-badge-district" id="hud-district">${initDistrict}</span>
            <span class="hud-badge" id="hud-time">--:--</span>
            <span class="hud-badge" id="hud-weather">—</span>
          </div>
          <button class="world-button small" id="zoom-in-button" type="button" aria-label="Zoom in">＋</button>
          <button class="world-button small" id="zoom-out-button" type="button" aria-label="Zoom out">－</button>
          <button class="world-button small" id="fullscreen-button" type="button" aria-label="Toggle fullscreen">⛶</button>
        </div>

        <!-- Legacy time/weather nodes (kept for backwards-compat, hidden) -->
        <div id="world-time" class="hud-hidden" aria-hidden="true"></div>
        <div id="world-weather" class="hud-hidden" aria-hidden="true"></div>

        <!-- Interaction prompt (panel style) -->
        <div class="interact-panel" id="interaction-prompt">
          <span class="interact-icon" id="interact-icon">🧭</span>
          <span class="interact-body">
            <span class="interact-target" id="interact-target">${t("prompt.explore", "Explore the city...")}</span>
            <span class="interact-hint" id="interact-hint"></span>
          </span>
        </div>

        <!-- Pause menu -->
        <div class="pause-menu" id="pause-menu" hidden>
          <h3>${t("pause.title", "PAUSED")}</h3>
          <div class="pause-grid">
            <button data-menu="resume" type="button">${t("pause.resume", "Resume")}</button>
            <button data-menu="map" type="button">${t("pause.map", "Map")}</button>
            <button data-menu="quests" type="button">${t("pause.quests", "Quests")}</button>
            <button data-menu="inventory" type="button">${t("pause.inventory", "Inventory")}</button>
            <button data-menu="profile" type="button">${t("pause.profile", "Profile")}</button>
            <button data-menu="family" type="button">${t("pause.family", "Family")}</button>
            <button data-menu="business" type="button">${t("pause.business", "Business")}</button>
            <button data-menu="vehicles" type="button">${t("pause.vehicles", "Vehicles")}</button>
            <button data-menu="settings" type="button">${t("pause.settings", "Settings")}</button>
            <button data-menu="save" type="button">${t("pause.save", "Save")}</button>
            <button data-menu="main-menu" type="button">${t("pause.exit", "Exit Menu")}</button>
          </div>
        </div>

        <!-- Mobile controls -->
        <div class="city-world-controls" aria-hidden="true">
          <div class="left-controls">
            <div class="stick-base" id="move-stick"><div class="stick-knob" id="move-knob"></div></div>
          </div>
          <div class="right-controls">
            <div class="look-pad" id="look-pad">${t("hud.camera", "CAMERA")}</div>
            <button class="world-button run" id="run-button" type="button">${t("hud.run", "RUN")}</button>
            <button class="world-button action" id="action-button" type="button">${t("hud.interact", "INTERACT")}</button>
            <button class="world-button context" id="context-button" type="button">${t("hud.action", "ACTION")}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const canvasHost = container.querySelector(".city-world-canvas");
  const promptNode = container.querySelector("#interaction-prompt");
  const worldTimeNode = container.querySelector("#world-time");
  const worldWeatherNode = container.querySelector("#world-weather");
  const moveStick = container.querySelector("#move-stick");
  const moveKnob = container.querySelector("#move-knob");
  const lookPad = container.querySelector("#look-pad");
  const runButton = container.querySelector("#run-button");
  const actionButton = container.querySelector("#action-button");
  const contextButton = container.querySelector("#context-button");
  const pauseButton = container.querySelector("#pause-button");
  const fullscreenButton = container.querySelector("#fullscreen-button");
  const pauseMenu = container.querySelector("#pause-menu");
  const zoomInButton = container.querySelector("#zoom-in-button");
  const zoomOutButton = container.querySelector("#zoom-out-button");

  // Premium HUD element refs
  const hudHpFill    = container.querySelector("#hud-hp-fill");
  const hudEnFill    = container.querySelector("#hud-en-fill");
  const hudXpFill    = container.querySelector("#hud-xp-fill");
  const hudHpVal     = container.querySelector("#hud-hp-val");
  const hudEnVal     = container.querySelector("#hud-en-val");
  const hudLvlEl     = container.querySelector("#hud-lvl");
  const hudCashEl    = container.querySelector("#hud-cash");
  const hudWantedEl  = container.querySelector("#hud-wanted");
  const hudRepEl     = container.querySelector("#hud-rep");
  const hudDistrictEl= container.querySelector("#hud-district");
  const hudTimeEl    = container.querySelector("#hud-time");
  const hudWeatherEl = container.querySelector("#hud-weather");
  const hudNameEl    = container.querySelector("#hud-name");
  const interactIcon = container.querySelector("#interact-icon");
  const interactTarget = container.querySelector("#interact-target");
  const interactHint   = container.querySelector("#interact-hint");

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch {
    container.innerHTML = `<section class="card"><h3>3D Initialization Failed</h3><p class="muted">Renderer could not start. Continue with 2D systems.</p></section>`;
    return { destroy() {} };
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, qualitySettings.pixelRatio));
  renderer.shadowMap.enabled = qualitySettings.shadow;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasHost.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x13151c);
  scene.fog = new THREE.Fog(0x13151c, 28, qualitySettings.drawDistance);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 260);
  const clock = new THREE.Clock();
  const raycaster = new THREE.Raycaster();
  raycaster.camera = camera;
  const colliders = [];
  const streetLights = [];
  let disposed = false;

  const hemi = new THREE.HemisphereLight(0xe9f0ff, 0x2a2018, 0.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff3d2, 1.06);
  sun.position.set(24, 34, 10);
  sun.castShadow = qualitySettings.shadow;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const player = createPlayerMesh();
  player.position.set(spawn.x, 0, spawn.z);
  scene.add(player);

  const npcs = [];
  const interiorInteractables = [];
  const interiorId = state.world?.currentInteriorId;
  const interiorType = ENTERABLE_INTERIORS[interiorId] || null;

  if (interiorType) {
    populateInteriors(scene, interiorType, interiorInteractables);
    player.position.set(0, 0, 7.5);
  } else {
    makeCityBlock(scene, model, state, qualitySettings, streetLights, colliders);

    const npcLimit = Math.min(qualitySettings.npcLimit, model.npcs.length);
    // NPC color palettes by role type
    const npcBodyColors = [0x2a1a30, 0x1a2a38, 0x2a2018, 0x182a1a, 0x2a1a1a];
    const npcSkinColors = [0xb07858, 0xc8a07a, 0x8a6040, 0xd0aa88, 0xa08060];
    model.npcs.slice(0, npcLimit).forEach((npc, index) => {
      const group = new THREE.Group();
      const skinCol = npcSkinColors[index % npcSkinColors.length];
      const bodyCol = npcBodyColors[index % npcBodyColors.length];
      const bodyMat = new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.7 });
      const skinMat = new THREE.MeshStandardMaterial({ color: skinCol, roughness: 0.75 });

      // Torso
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.3), bodyMat);
      torso.position.y = 1.2;
      torso.castShadow = qualitySettings.shadow;
      group.add(torso);
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 9), skinMat);
      head.position.y = 1.85;
      head.castShadow = qualitySettings.shadow;
      group.add(head);
      // Legs
      const legGeo = new THREE.CapsuleGeometry(0.1, 0.48, 4, 8);
      const leftLeg  = new THREE.Mesh(legGeo, bodyMat);
      const rightLeg = new THREE.Mesh(legGeo, bodyMat);
      leftLeg.position.set(-0.15, 0.64, 0);
      rightLeg.position.set( 0.15, 0.64, 0);
      leftLeg.castShadow = rightLeg.castShadow = qualitySettings.shadow;
      group.add(leftLeg, rightLeg);
      // Arms
      const armGeo = new THREE.CapsuleGeometry(0.08, 0.38, 4, 8);
      const leftArm  = new THREE.Mesh(armGeo, bodyMat);
      const rightArm = new THREE.Mesh(armGeo, bodyMat);
      leftArm.position.set(-0.35, 1.15, 0);
      rightArm.position.set( 0.35, 1.15, 0);
      group.add(leftArm, rightArm);
      // Store for animation
      group.userData.arms = { leftArm, rightArm, leftLeg, rightLeg, phase: Math.random() * Math.PI * 2 };

      group.position.set(npc.x, 0, npc.z);

      const badge = makeMarker(npc.name.split(" ")[0], 0x89d9a1);
      badge.scale.setScalar(0.6);
      badge.position.y = 0.08;
      group.add(badge);

      scene.add(group);
      npcs.push({ ...npc, mesh: group, wanderPhase: Math.random() * Math.PI * 2, targetX: npc.homeX, targetZ: npc.homeZ });
      colliders.push(group);
    });

    model.vehicles.forEach((vehicle) => {
      const carGroup = createCarMesh(vehicle.owned);
      carGroup.position.set(vehicle.x, 0, vehicle.z);
      carGroup.rotation.y = (vehicle.owned ? 0 : Math.PI * 0.18);
      scene.add(carGroup);
    });
  }

  const keys = { up: false, down: false, left: false, right: false };
  let yaw = Math.PI;
  let pitch = -0.28;
  let sprintHeld = false;
  let nearest = null;
  let currentSpeed = 0;
  let velocityY = 0;
  let draggingMouse = false;
  let mouseX = 0;
  let mouseY = 0;
  let paused = false;
  let lastLoopPausedState = null;
  let cameraDistance = CAMERA_DISTANCE;
  let footstepTimer = 0;
  const cameraPos = new THREE.Vector3();

  const sensitivity = BASE_LOOK_SENSITIVITY * (settings.cameraSensitivity || 1);

  function setPauseState(next, source = "unknown") {
    const wasPaused = paused;
    paused = !!next;
    pauseMenu.hidden = !paused;
    console.debug(`[PAUSE] STATE_CHANGE source=${source} before=${wasPaused} after=${paused} hidden=${pauseMenu.hidden}`);
    if (paused) {
      keys.up = keys.down = keys.left = keys.right = false;
      sprintHeld = false;
      runButton.classList.remove("active");
    }
  }

  function togglePause() {
    setPauseState(!paused, "toggle");
  }

  async function toggleFullscreen() {
    const target = container.querySelector(".city-world-stage");
    if (!target) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen?.();
      } else if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen();
      }
    } catch {
      // Ignore and keep viewport-sized mode.
    }
  }

  function adjustCameraDistance(delta) {
    cameraDistance = Math.max(CAMERA_MIN_DISTANCE, Math.min(CAMERA_MAX_DISTANCE, cameraDistance + delta));
  }

  const updateLighting = () => {
    const phase = getDayPhase(state);
    const lightConfig = {
      morning: { bg: 0x28334d, fog: 0x2a3650, hemi: 0.62, sun: 0.9, lamp: 0.1 },
      day: { bg: 0x687893, fog: 0x667890, hemi: 0.75, sun: 1.2, lamp: 0 },
      evening: { bg: 0x31293f, fog: 0x372c44, hemi: 0.5, sun: 0.66, lamp: 0.6 },
      night: { bg: 0x12141d, fog: 0x141826, hemi: 0.35, sun: 0.25, lamp: 1.2 }
    }[phase];
    const weather = state.weather?.current || "clear";
    const weatherMix = {
      clear: { fogMul: 1, hemiMul: 1, sunMul: 1, lampAdd: 0 },
      cloudy: { fogMul: 1.08, hemiMul: 0.9, sunMul: 0.72, lampAdd: 0.2 },
      rain: { fogMul: 1.18, hemiMul: 0.85, sunMul: 0.64, lampAdd: 0.36 },
      fog: { fogMul: 1.28, hemiMul: 0.8, sunMul: 0.58, lampAdd: 0.32 }
    }[weather] || { fogMul: 1, hemiMul: 1, sunMul: 1, lampAdd: 0 };

    scene.background.setHex(lightConfig.bg);
    scene.fog.color.setHex(lightConfig.fog);
    scene.fog.near = 28;
    scene.fog.far = qualitySettings.drawDistance / weatherMix.fogMul;
    hemi.intensity = lightConfig.hemi * weatherMix.hemiMul;
    sun.intensity = lightConfig.sun * weatherMix.sunMul;
    streetLights.forEach(({ bulb, light }) => {
      bulb.material.emissiveIntensity = 0.22 + (lightConfig.lamp + weatherMix.lampAdd) * 0.9;
      light.intensity = lightConfig.lamp + weatherMix.lampAdd;
    });
  };

  const updateSize = () => {
    const rect = canvasHost.getBoundingClientRect();
    const width = Math.max(260, rect.width);
    const height = Math.max(220, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const keyDown = (event) => {
    if (event.code === "Escape") {
      event.preventDefault();
      togglePause();
      return;
    }
    if (paused) return;
    if (event.code === "KeyW" || event.code === "ArrowUp") keys.up = true;
    if (event.code === "KeyS" || event.code === "ArrowDown") keys.down = true;
    if (event.code === "KeyA" || event.code === "ArrowLeft") keys.left = true;
    if (event.code === "KeyD" || event.code === "ArrowRight") keys.right = true;
    if (event.code === "KeyW" || event.code === "ArrowUp" || event.code === "KeyS" || event.code === "ArrowDown" || event.code === "KeyA" || event.code === "ArrowLeft" || event.code === "KeyD" || event.code === "ArrowRight") {
      console.debug(`[PAUSE] MOVE_INPUT_ACCEPTED code=${event.code} paused=${paused}`);
    }
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") sprintHeld = true;
    if (event.code === "Space" && Math.abs(player.position.y) < 0.001) velocityY = JUMP_VELOCITY;
    if (event.code === "KeyE") {
      event.preventDefault();
      triggerInteraction();
    }
  };

  const keyUp = (event) => {
    if (paused) return;
    if (event.code === "KeyW" || event.code === "ArrowUp") keys.up = false;
    if (event.code === "KeyS" || event.code === "ArrowDown") keys.down = false;
    if (event.code === "KeyA" || event.code === "ArrowLeft") keys.left = false;
    if (event.code === "KeyD" || event.code === "ArrowRight") keys.right = false;
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") sprintHeld = false;
  };

  const onMouseDown = (event) => {
    if (paused) return;
    if (event.button !== 0) return;
    draggingMouse = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
  };

  const onMouseUp = () => {
    draggingMouse = false;
  };

  const onMouseMove = (event) => {
    if (!draggingMouse) return;
    const dx = event.clientX - mouseX;
    const dy = event.clientY - mouseY;
    mouseX = event.clientX;
    mouseY = event.clientY;
    yaw -= dx * sensitivity;
    pitch = Math.max(-0.98, Math.min(-0.07, pitch - dy * sensitivity * 0.8));
  };

  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  renderer.domElement.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("mousemove", onMouseMove);

  const joystick = createJoystick(moveStick, moveKnob);
  const look = createLookPad(lookPad, (dx, dy) => {
    if (paused) return;
    console.debug(`[PAUSE] LOOK_INPUT_APPLIED dx=${Math.round(dx)} dy=${Math.round(dy)} paused=${paused}`);
    yaw -= dx * sensitivity;
    pitch = Math.max(-0.98, Math.min(-0.07, pitch - dy * sensitivity * 0.8));
  });

  const toggleSprintOn = () => {
    sprintHeld = true;
    runButton.classList.add("active");
  };
  const toggleSprintOff = () => {
    sprintHeld = false;
    runButton.classList.remove("active");
  };

  runButton.addEventListener("pointerdown", toggleSprintOn);
  runButton.addEventListener("pointerup", toggleSprintOff);
  runButton.addEventListener("pointercancel", toggleSprintOff);
  const onActionClick = () => triggerInteraction();
  const onContextClick = () => triggerInteraction();
  const onPauseClick = () => togglePause();
  const onFullscreenClick = () => toggleFullscreen();
  const onZoomInClick = () => adjustCameraDistance(-0.6);
  const onZoomOutClick = () => adjustCameraDistance(0.6);
  const onWheelZoom = (event) => {
    event.preventDefault();
    adjustCameraDistance(Math.sign(event.deltaY) * 0.5);
  };
  actionButton.addEventListener("click", onActionClick);
  contextButton.addEventListener("click", onContextClick);
  pauseButton.addEventListener("click", onPauseClick);
  fullscreenButton.addEventListener("click", onFullscreenClick);
  zoomInButton.addEventListener("click", onZoomInClick);
  zoomOutButton.addEventListener("click", onZoomOutClick);
  renderer.domElement.addEventListener("wheel", onWheelZoom, { passive: false });
  const runPauseMenuAction = (menuAction) => {
    if (!menuAction) return;
    if (menuAction === "resume") {
      console.debug(`[PAUSE] CONTINUE_CLICKED before=${paused}`);
      setPauseState(false, "resume-button");
      console.debug(`[PAUSE] CONTINUE_DONE after=${paused} hidden=${pauseMenu.hidden}`);
      return;
    }
    onMenuAction?.(menuAction);
  };
  const onPauseMenuPointerDown = (event) => {
    if (typeof event.button === "number" && event.button !== 0) return;
    const button = event.target.closest("button[data-menu]");
    if (!button || !pauseMenu.contains(button)) return;
    event.preventDefault();
    event.stopPropagation();
    button._pauseHandled = true;
    runPauseMenuAction(button.dataset.menu);
  };
  const onPauseMenuClick = (event) => {
    const button = event.target.closest("button[data-menu]");
    if (!button || !pauseMenu.contains(button)) return;
    event.preventDefault();
    event.stopPropagation();
    if (button._pauseHandled) { button._pauseHandled = false; return; }
    if (button.dataset.menu === "resume" && !paused) return;
    runPauseMenuAction(button.dataset.menu);
  };
  pauseMenu.addEventListener("pointerdown", onPauseMenuPointerDown);
  pauseMenu.addEventListener("click", onPauseMenuClick);

  function triggerInteraction() {
    if (paused) return;
    if (!nearest || !onInteract) {
      // Flash "no nearby target" message in the interaction prompt
      if (promptNode) {
        if (interactTarget) {
          const origTarget = interactTarget.textContent;
          interactTarget.textContent = t("prompt.noTarget", "No target nearby");
          promptNode.classList.add("prompt-flash");
          clearTimeout(promptNode._flashTimeout);
          promptNode._flashTimeout = setTimeout(() => {
            interactTarget.textContent = origTarget;
            promptNode.classList.remove("prompt-flash");
          }, 1800);
        } else {
          const original = promptNode.textContent;
          promptNode.textContent = t("prompt.noTarget", "No target nearby");
          promptNode.classList.add("prompt-flash");
          clearTimeout(promptNode._flashTimeout);
          promptNode._flashTimeout = setTimeout(() => {
            promptNode.textContent = original;
            promptNode.classList.remove("prompt-flash");
          }, 1800);
        }
      }
      return;
    }
    onInteract(nearest);
  }

  function updateNpcWander(dt) {
    npcs.forEach((npc) => {
      const dx = npc.targetX - npc.mesh.position.x;
      const dz = npc.targetZ - npc.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      const moving = dist >= 0.2;
      if (!moving) {
        npc.wanderPhase += dt * 0.6;
        npc.targetX = npc.homeX + Math.cos(npc.wanderPhase) * 2.2;
        npc.targetZ = npc.homeZ + Math.sin(npc.wanderPhase * 1.1) * 2.2;
      } else {
        const speed = 1.05;
        npc.mesh.position.x += (dx / Math.max(0.001, dist)) * speed * dt;
        npc.mesh.position.z += (dz / Math.max(0.001, dist)) * speed * dt;
        npc.mesh.rotation.y = Math.atan2(dx, dz);
      }
      // Animate limbs for humanoid NPCs
      const arms = npc.mesh.userData.arms;
      if (arms) {
        arms.phase += dt * (moving ? 4.5 : 1.2);
        const swing = moving ? 0.42 : 0.06;
        const wave = Math.sin(arms.phase) * swing;
        arms.leftArm.rotation.x  =  wave;
        arms.rightArm.rotation.x = -wave;
        arms.leftLeg.rotation.x  = -wave * 1.1;
        arms.rightLeg.rotation.x =  wave * 1.1;
      }
    });
  }

  function updateCamera(dt) {
    const horizontal = Math.cos(pitch) * cameraDistance;
    const desired = new THREE.Vector3(
      player.position.x - Math.sin(yaw) * horizontal,
      CAMERA_HEIGHT + player.position.y + Math.sin(-pitch) * cameraDistance,
      player.position.z - Math.cos(yaw) * horizontal
    );

    if (colliders.length) {
      const origin = new THREE.Vector3(player.position.x, player.position.y + 1.4, player.position.z);
      const dir = desired.clone().sub(origin);
      const len = dir.length();
      dir.normalize();
      raycaster.set(origin, dir);
      raycaster.far = len;
      const hits = raycaster.intersectObjects(colliders, true);
      if (hits.length) {
        desired.copy(origin.add(dir.multiplyScalar(Math.max(1.8, hits[0].distance - 0.35))));
      }
    }

    cameraPos.lerp(desired, Math.min(1, dt * 7));
    camera.position.copy(cameraPos);
    camera.lookAt(player.position.x, player.position.y + 1.45, player.position.z);
  }

  function animate() {
    if (disposed) return;
    try {
      const dt = Math.min(0.05, clock.getDelta());
      if (paused) {
        if (lastLoopPausedState !== true) {
          console.debug("[PAUSE] LOOP_PAUSED");
          lastLoopPausedState = true;
        }
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
        return;
      }
      if (lastLoopPausedState !== false) {
        console.debug("[PAUSE] LOOP_RUNNING");
        lastLoopPausedState = false;
      }

      const padX = joystick.state.x;
      const padY = joystick.state.y;
      const keyboardX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const keyboardY = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
      const inputX = Math.max(-1, Math.min(1, padX + keyboardX));
      const inputY = Math.max(-1, Math.min(1, -padY + keyboardY));

      const mag = Math.hypot(inputX, inputY);
      const targetSpeed = (sprintHeld ? RUN_SPEED : WALK_SPEED) * Math.min(1, mag);
      const accel = targetSpeed > currentSpeed ? ACCELERATION : DECELERATION;
      currentSpeed += (targetSpeed - currentSpeed) * Math.min(1, accel * dt);

      if (mag > 0.02 && currentSpeed > 0.02) {
        const normX = inputX / mag;
        const normY = inputY / mag;
        const moveAngle = yaw + Math.atan2(normX, normY);
        player.position.x += Math.sin(moveAngle) * currentSpeed * dt;
        player.position.z += Math.cos(moveAngle) * currentSpeed * dt;

        if (!interiorType) {
          const corrected = resolveWorldCollisions({ x: player.position.x, z: player.position.z }, PLAYER_RADIUS, model.blockedZones);
          player.position.x = corrected.x;
          player.position.z = corrected.z;
        } else {
          player.position.x = Math.max(-13.3, Math.min(13.3, player.position.x));
          player.position.z = Math.max(-13.3, Math.min(13.3, player.position.z));
        }

        const targetYaw = Math.atan2(Math.sin(moveAngle), Math.cos(moveAngle));
        const deltaYaw = Math.atan2(Math.sin(targetYaw - player.rotation.y), Math.cos(targetYaw - player.rotation.y));
        player.rotation.y += deltaYaw * Math.min(1, dt * 10);
      }

      velocityY -= GRAVITY * dt;
      player.position.y += velocityY * dt;
      if (player.position.y <= 0) {
        player.position.y = 0;
        velocityY = 0;
      }

      animatePlayer(player, currentSpeed, dt);
      updateNpcWander(dt);

      const dynamicInteractables = interiorType
        ? interiorInteractables
        : [
            ...model.buildings.map((entry) => ({
              id: entry.locationId,
              name: entry.name,
              districtId: entry.districtId,
              x: entry.door.x,
              z: entry.door.z,
              prompt: entry.enterable
                ? `${t("prompt.enter", "Enter")} ${entry.name}`
                : (entry.prompt || entry.name),
              interactionType: "door",
              enterable: entry.enterable,
              locationType: entry.locationType
            })),
            ...npcs.map((npc) => ({
              id: npc.id,
              districtId: npc.districtId,
              locationId: npc.locationId,
              x: npc.mesh.position.x,
              z: npc.mesh.position.z,
              prompt: npc.prompt,
              interactionType: "npc"
            })),
            ...interactables.filter((entry) => entry.interactionType === "vehicle" || entry.interactionType === "district-marker")
          ];

      nearest = findNearestInteraction({ x: player.position.x, z: player.position.z }, dynamicInteractables, INTERACTION_RANGE);
      const hour = String(state.time?.hour ?? 0).padStart(2, "0");
      const minute = String(state.time?.minute ?? 0).padStart(2, "0");
      // Legacy hidden nodes
      worldTimeNode.textContent = `${hour}:${minute}`;
      worldWeatherNode.textContent = weatherLabelById[state.weather?.current] || weatherLabelById.clear;

      // --- Premium HUD update ---
      const hp  = Math.round(state.player.health);
      const en  = Math.round(state.player.energy);
      const xp  = state.player.xp || 0;
      const nxp = state.player.nextLevelXp || 100;
      const lvl = state.player.level || 1;
      const wl  = state.player.wantedLevel || 0;
      const rep = state.player.reputation?.city || 0;
      const distName = (state.districts?.find(d => d.id === state.selectedDistrictId)?.name || "CITY").toUpperCase();
      const weatherLabel = weatherLabelById[state.weather?.current] || weatherLabelById.clear;
      const weatherIcon = { clear: "☀", cloudy: "⛅", rain: "🌧", fog: "🌫" }[state.weather?.current] || "☀";
      const timeLabel = `${hour}:${minute}`;

      if (hudHpFill)     hudHpFill.style.width = `${Math.min(100, hp)}%`;
      if (hudEnFill)     hudEnFill.style.width = `${Math.min(100, en)}%`;
      if (hudXpFill)     hudXpFill.style.width = `${Math.min(100, xp / Math.max(1, nxp) * 100)}%`;
      if (hudHpVal)      hudHpVal.textContent = hp;
      if (hudEnVal)      hudEnVal.textContent = en;
      if (hudLvlEl)      hudLvlEl.textContent = `LV${lvl}`;
      if (hudCashEl)     hudCashEl.textContent = `$${Math.round(state.player.money || 0).toLocaleString()}`;
      if (hudRepEl)      hudRepEl.textContent = `REP ${rep}`;
      if (hudDistrictEl) hudDistrictEl.textContent = distName;
      if (hudTimeEl)     hudTimeEl.textContent = timeLabel;
      if (hudWeatherEl)  hudWeatherEl.textContent = `${weatherIcon} ${String(state.time?.season || "SPR").slice(0,3).toUpperCase()}`;
      if (hudNameEl)     hudNameEl.textContent = state.player.name || "—";
      if (hudWantedEl) {
        hudWantedEl.innerHTML = Array.from({ length: 5 }, (_, i) =>
          `<span class="hud-wanted-star${i < wl ? " lit" : ""}">★</span>`
        ).join("");
      }

      // --- Interaction prompt update ---
      const INTERACT_ICONS = {
        door: "🚪", npc: "💬", vehicle: "🚗", "district-marker": "🗺", "interior-exit": "↩"
      };
      const INTERACT_TYPE_LABELS = {
        door: t("prompt.enter", "Enter"), npc: t("prompt.talk", "Talk to"), vehicle: t("prompt.vehicle", "Vehicle"),
        "district-marker": t("prompt.travel", "Travel to"), "interior-exit": t("prompt.exit", "Exit")
      };
      if (nearest) {
        const icon = INTERACT_ICONS[nearest.interactionType] || "🎯";
        const typeLabel = INTERACT_TYPE_LABELS[nearest.interactionType] || "";
        const keyHint = interiorType
          ? `<span class="interact-key">INTERACT</span>`
          : `<span class="interact-key">E</span>`;
        if (interactIcon)   interactIcon.textContent = icon;
        if (interactTarget) interactTarget.textContent = nearest.name || nearest.prompt || "";
        if (interactHint)   interactHint.innerHTML = `${keyHint}${typeLabel}`;
        contextButton.textContent = nearest.interactionType === "door" ? t("hud.enter", "ENTER") : t("hud.action", "ACTION");
      } else {
        const locName = LOCATIONS[state.currentLocationId]?.name || distName;
        if (interactIcon)   interactIcon.textContent = "🧭";
        if (interactTarget) interactTarget.textContent = locName;
        if (interactHint)   interactHint.textContent = t("prompt.exploreHint", "Approach marked points of interest");
        contextButton.textContent = t("hud.action", "ACTION");
      }

      updateCamera(dt);
      updateLighting();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    } catch (error) {
      disposed = true;
      onError?.(error);
    }
  }

  const onResize = () => updateSize();
  window.addEventListener("resize", onResize);
  updateLighting();
  updateSize();
  cameraPos.set(player.position.x - 4.5, CAMERA_HEIGHT + 0.8, player.position.z - 6.5);
  animate();

  return {
    destroy() {
      disposed = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      runButton.removeEventListener("pointerdown", toggleSprintOn);
      runButton.removeEventListener("pointerup", toggleSprintOff);
      runButton.removeEventListener("pointercancel", toggleSprintOff);
      actionButton.removeEventListener("click", onActionClick);
      contextButton.removeEventListener("click", onContextClick);
      pauseButton.removeEventListener("click", onPauseClick);
      fullscreenButton.removeEventListener("click", onFullscreenClick);
      zoomInButton.removeEventListener("click", onZoomInClick);
      zoomOutButton.removeEventListener("click", onZoomOutClick);
      renderer.domElement.removeEventListener("wheel", onWheelZoom);
      pauseMenu.removeEventListener("pointerdown", onPauseMenuPointerDown);
      pauseMenu.removeEventListener("click", onPauseMenuClick);
      joystick.destroy();
      look.destroy();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
          else obj.material.dispose?.();
        }
      });
      container.innerHTML = "";
    }
  };
}
