import * as THREE from "./vendor/three.module.js";
import {
  buildWorldModel,
  findNearestInteraction,
  getInteractables,
  getSpawnPoint,
  resolveWorldCollisions
} from "./cityWorldFoundation.mjs";
import { LOCATIONS } from "./gameData.mjs";

const PLAYER_RADIUS = 0.58;
const WALK_SPEED = 4.8;
const RUN_SPEED = 8.9;
const ACCELERATION = 20;
const DECELERATION = 16;
const GRAVITY = 20;
const JUMP_VELOCITY = 6.2;
const CAMERA_DISTANCE = 7.8;
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
  "underground-club": "nightclub"
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
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(280, 280),
    new THREE.MeshStandardMaterial({ color: 0x1f262b, roughness: 0.92, metalness: 0.03 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x171b21, roughness: 0.82 });
  const roads = [
    { w: 220, h: 16, x: 0, z: 0, r: 0 },
    { w: 220, h: 16, x: 0, z: 0, r: Math.PI / 2 },
    { w: 150, h: 13, x: -50, z: -52, r: Math.PI / 7 },
    { w: 150, h: 13, x: 56, z: 54, r: -Math.PI / 6 }
  ];
  roads.forEach((entry) => {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(entry.w, entry.h), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = entry.r;
    road.position.set(entry.x, 0.02, entry.z);
    scene.add(road);
  });

  const sidewalk = new THREE.Mesh(
    new THREE.PlaneGeometry(255, 255),
    new THREE.MeshStandardMaterial({ color: 0x3d444b, roughness: 0.95 })
  );
  sidewalk.rotation.x = -Math.PI / 2;
  sidewalk.position.y = -0.01;
  scene.add(sidewalk);

  const treeMat = new THREE.MeshStandardMaterial({ color: 0x2f5345, roughness: 0.86 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b3428, roughness: 0.9 });
  for (let i = 0; i < 26; i += 1) {
    const angle = (i / 26) * Math.PI * 2;
    const radius = 74 + (i % 4) * 4;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 1.5, 6), trunkMat);
    trunk.position.set(x, 0.74, z);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1, 2.3, 7), treeMat);
    crown.position.set(x, 2.2, z);
    scene.add(trunk, crown);
  }

  const facadeByType = {
    safehouse: 0x534145,
    nightlife: 0x4f3559,
    finance: 0x5b5f6d,
    garage: 0x434a55,
    business: 0x66606b
  };

  model.buildings.forEach((building, index) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(building.width, building.height, building.depth),
      new THREE.MeshStandardMaterial({
        color: facadeByType[building.locationType] || (index % 2 ? 0x535d75 : 0x6f6874),
        roughness: 0.74,
        metalness: 0.12
      })
    );
    mesh.position.set(building.x, building.height * 0.5, building.z);
    mesh.castShadow = qualitySettings.shadow;
    mesh.receiveShadow = true;
    scene.add(mesh);
    colliders.push(mesh);

    if (building.enterable) {
      const portal = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 2.2, 0.25),
        new THREE.MeshStandardMaterial({ color: 0xb59a5f, emissive: 0x5b451a, emissiveIntensity: 0.45 })
      );
      portal.position.set(building.door.x, 1.1, building.door.z - 0.42);
      scene.add(portal);
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

  const lampPositions = [
    [-80, -22],
    [-56, -18],
    [-24, -20],
    [18, -17],
    [54, -17],
    [84, -20],
    [-84, 19],
    [-48, 20],
    [-16, 19],
    [20, 20],
    [54, 20],
    [86, 21],
    [-22, -78],
    [23, -78],
    [-18, 77],
    [19, 77]
  ];
  lampPositions.forEach(([x, z]) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, 4.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x555d66, metalness: 0.35, roughness: 0.5 })
    );
    post.position.set(x, 2.2, z);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xfde4ad, emissive: 0xffcc7a, emissiveIntensity: 0.2 })
    );
    bulb.position.set(x, 4.35, z);
    scene.add(post, bulb);

    const light = new THREE.PointLight(0xffd39a, 0, 16, 2);
    light.position.set(x, 4.35, z);
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

export function mountCityWorld3d({ container, state, onInteract, onError, settings = {} }) {
  if (!container) return { destroy() {} };
  if (typeof window === "undefined" || !window.WebGLRenderingContext) {
    container.innerHTML = `<section class="card"><h3>3D Unsupported</h3><p class="muted">WebGL is unavailable on this device. Use City/District panels.</p></section>`;
    return { destroy() {} };
  }

  const model = buildWorldModel(state);
  const qualitySettings = QUALITY[settings.graphicsQuality] || QUALITY.medium;
  const interactables = getInteractables(model);
  const spawn = getSpawnPoint(state, model);

  container.innerHTML = `
    <div class="city-world-stage">
      <div class="city-world-canvas"></div>
      <div class="city-world-overlay">
        <div class="city-world-heads-up">
          <p><strong>${state.player.name || "La Reina"}</strong> · ${state.player.title} · ${state.player.status || "Active"}</p>
          <p>${(state.selectedDistrictId || "").toUpperCase()} · ${state.currentLocationId}</p>
          <p>Move: Left Stick/WASD · Look: Right Pad/Mouse · [E] Interact</p>
        </div>
        <div class="interaction-prompt" id="interaction-prompt">Explore the city...</div>
        <div class="city-world-controls" aria-hidden="true">
          <div class="left-controls">
            <div class="stick-base" id="move-stick"><div class="stick-knob" id="move-knob"></div></div>
          </div>
          <div class="right-controls">
            <div class="look-pad" id="look-pad">CAMERA</div>
            <button class="world-button run" id="run-button" type="button">RUN</button>
            <button class="world-button action" id="action-button" type="button">INTERACT</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const canvasHost = container.querySelector(".city-world-canvas");
  const promptNode = container.querySelector("#interaction-prompt");
  const moveStick = container.querySelector("#move-stick");
  const moveKnob = container.querySelector("#move-knob");
  const lookPad = container.querySelector("#look-pad");
  const runButton = container.querySelector("#run-button");
  const actionButton = container.querySelector("#action-button");

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
    model.npcs.slice(0, npcLimit).forEach((npc, index) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.32, 0.85, 4, 8),
        new THREE.MeshStandardMaterial({ color: index % 2 ? 0xd57d64 : 0x74a6d6 })
      );
      body.castShadow = qualitySettings.shadow;
      body.position.y = 0.88;
      group.add(body);
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
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.8, 3.2),
        new THREE.MeshStandardMaterial({ color: vehicle.owned ? 0x49a7e3 : 0x7a7f85, metalness: 0.35, roughness: 0.45 })
      );
      mesh.position.set(vehicle.x, 0.45, vehicle.z);
      mesh.castShadow = qualitySettings.shadow;
      scene.add(mesh);
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
  const cameraPos = new THREE.Vector3();

  const sensitivity = BASE_LOOK_SENSITIVITY * (settings.cameraSensitivity || 1);

  const updateLighting = () => {
    const phase = getDayPhase(state);
    const config = {
      morning: { bg: 0x28334d, fog: 0x2a3650, hemi: 0.62, sun: 0.9, lamp: 0.1 },
      day: { bg: 0x687893, fog: 0x667890, hemi: 0.75, sun: 1.2, lamp: 0 },
      evening: { bg: 0x31293f, fog: 0x372c44, hemi: 0.5, sun: 0.66, lamp: 0.6 },
      night: { bg: 0x12141d, fog: 0x141826, hemi: 0.35, sun: 0.25, lamp: 1.2 }
    }[phase];

    scene.background.setHex(config.bg);
    scene.fog.color.setHex(config.fog);
    hemi.intensity = config.hemi;
    sun.intensity = config.sun;
    streetLights.forEach(({ bulb, light }) => {
      bulb.material.emissiveIntensity = 0.22 + config.lamp * 0.9;
      light.intensity = config.lamp;
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
    if (event.code === "KeyW" || event.code === "ArrowUp") keys.up = true;
    if (event.code === "KeyS" || event.code === "ArrowDown") keys.down = true;
    if (event.code === "KeyA" || event.code === "ArrowLeft") keys.left = true;
    if (event.code === "KeyD" || event.code === "ArrowRight") keys.right = true;
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") sprintHeld = true;
    if (event.code === "Space" && Math.abs(player.position.y) < 0.001) velocityY = JUMP_VELOCITY;
    if (event.code === "KeyE") {
      event.preventDefault();
      triggerInteraction();
    }
  };

  const keyUp = (event) => {
    if (event.code === "KeyW" || event.code === "ArrowUp") keys.up = false;
    if (event.code === "KeyS" || event.code === "ArrowDown") keys.down = false;
    if (event.code === "KeyA" || event.code === "ArrowLeft") keys.left = false;
    if (event.code === "KeyD" || event.code === "ArrowRight") keys.right = false;
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") sprintHeld = false;
  };

  const onMouseDown = (event) => {
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
  actionButton.addEventListener("click", () => triggerInteraction());

  function triggerInteraction() {
    if (!nearest || !onInteract) return;
    onInteract(nearest);
  }

  function updateNpcWander(dt) {
    npcs.forEach((npc) => {
      const dx = npc.targetX - npc.mesh.position.x;
      const dz = npc.targetZ - npc.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.2) {
        npc.wanderPhase += dt * 0.6;
        npc.targetX = npc.homeX + Math.cos(npc.wanderPhase) * 2.2;
        npc.targetZ = npc.homeZ + Math.sin(npc.wanderPhase * 1.1) * 2.2;
        return;
      }
      const speed = 1.05;
      npc.mesh.position.x += (dx / Math.max(0.001, dist)) * speed * dt;
      npc.mesh.position.z += (dz / Math.max(0.001, dist)) * speed * dt;
      npc.mesh.rotation.y = Math.atan2(dx, dz);
    });
  }

  function updateCamera(dt) {
    const horizontal = Math.cos(pitch) * CAMERA_DISTANCE;
    const desired = new THREE.Vector3(
      player.position.x - Math.sin(yaw) * horizontal,
      CAMERA_HEIGHT + player.position.y + Math.sin(-pitch) * CAMERA_DISTANCE,
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
              prompt: entry.prompt,
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
      if (nearest) {
        const buttonPrompt = interiorType ? "Tap INTERACT" : "[E] or Tap INTERACT";
        promptNode.textContent = `${nearest.prompt} · ${buttonPrompt}`;
      } else {
        const districtName = state.districts.find((d) => d.id === state.selectedDistrictId)?.name || "CITY";
        const locationName = LOCATIONS[state.currentLocationId]?.name || state.currentLocationId;
        promptNode.textContent = `${districtName} · ${locationName} · Explore and approach highlighted points`;
      }

      updateCamera(dt);
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
