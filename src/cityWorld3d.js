import * as THREE from "https://unpkg.com/three@0.167.1/build/three.module.js";
import {
  buildWorldModel,
  findNearestInteraction,
  getInteractables,
  getSpawnPoint,
  resolveWorldCollisions
} from "./cityWorldFoundation.mjs";

const PLAYER_RADIUS = 0.6;
const WALK_SPEED = 5.2;
const RUN_SPEED = 8.6;
const CAMERA_DISTANCE = 7.6;
const CAMERA_HEIGHT = 3.2;
const LOOK_SENSITIVITY = 0.0038;
const INTERACTION_RANGE = 3.4;

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
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.9, 8), new THREE.MeshStandardMaterial({ color }));
  cone.position.y = 2.1;
  group.add(cone);

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createLabelTexture(text),
      depthTest: false,
      depthWrite: false
    })
  );
  sprite.scale.set(3.4, 1.25, 1);
  sprite.position.y = 3.15;
  group.add(sprite);

  return group;
}

function createPlayerMesh() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.48, 1.1, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x6f95f8, roughness: 0.5 })
  );
  body.castShadow = true;
  body.position.y = 1.15;
  group.add(body);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.34), new THREE.MeshStandardMaterial({ color: 0x2f3f5f }));
  chest.position.set(0, 1.42, 0.28);
  chest.castShadow = true;
  group.add(chest);

  return group;
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

export function mountCityWorld3d({ container, state, onInteract }) {
  if (!container) return { destroy() {} };

  const model = buildWorldModel(state);
  const interactables = getInteractables(model);
  const spawn = getSpawnPoint(state, model);

  container.innerHTML = `
    <div class="city-world-stage">
      <div class="city-world-canvas"></div>
      <div class="city-world-overlay">
        <div class="city-world-heads-up">
          <p><strong>${state.player.name || "Operator"}</strong> · ${state.player.title}</p>
          <p>${state.selectedDistrictId.toUpperCase()} · ${state.currentLocationId}</p>
          <p>Move: Left Stick · Camera: Right Pad · Run + Action buttons</p>
        </div>
        <div class="interaction-prompt" id="interaction-prompt">Explore the city...</div>
        <div class="city-world-controls" aria-hidden="true">
          <div class="left-controls">
            <div class="stick-base" id="move-stick"><div class="stick-knob" id="move-knob"></div></div>
          </div>
          <div class="right-controls">
            <div class="look-pad" id="look-pad">CAMERA</div>
            <button class="world-button run" id="run-button" type="button">RUN</button>
            <button class="world-button action" id="action-button" type="button">ACTION</button>
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

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasHost.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x13151c);
  scene.fog = new THREE.Fog(0x13151c, 35, 120);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 220);
  const clock = new THREE.Clock();
  let disposed = false;

  const hemi = new THREE.HemisphereLight(0xe9f0ff, 0x282018, 0.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff3d2, 1.08);
  sun.position.set(24, 34, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220),
    new THREE.MeshStandardMaterial({ color: 0x2c3436, roughness: 0.95, metalness: 0.02 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 24),
    new THREE.MeshStandardMaterial({ color: 0x1f2228, roughness: 0.85 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  scene.add(road);

  const road2 = road.clone();
  road2.rotation.z = Math.PI / 2;
  scene.add(road2);

  const sidewalk = new THREE.Mesh(
    new THREE.PlaneGeometry(190, 190),
    new THREE.MeshStandardMaterial({ color: 0x4d5358, roughness: 0.92 })
  );
  sidewalk.rotation.x = -Math.PI / 2;
  sidewalk.position.y = -0.01;
  scene.add(sidewalk);

  const player = createPlayerMesh();
  player.position.set(spawn.x, 0, spawn.z);
  scene.add(player);

  const npcEntities = [];
  const doorMarkers = [];
  const districtMarkers = [];

  model.buildings.forEach((building, index) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(building.width, building.height, building.depth),
      new THREE.MeshStandardMaterial({ color: index % 2 ? 0x535d75 : 0x6f6874, roughness: 0.76, metalness: 0.06 })
    );
    mesh.position.set(building.x, building.height * 0.5, building.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const marker = makeMarker(building.name, 0xf4c35c);
    marker.position.set(building.door.x, 0, building.door.z);
    scene.add(marker);
    doorMarkers.push(marker);
  });

  model.districtMarkers.forEach((markerData) => {
    const marker = makeMarker(markerData.name, markerData.districtId === state.selectedDistrictId ? 0x5bd37d : 0x9ec9ff);
    marker.position.set(markerData.x, 0, markerData.z);
    scene.add(marker);
    districtMarkers.push(marker);
  });

  model.npcs.forEach((npc, index) => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.9, 4, 8),
      new THREE.MeshStandardMaterial({ color: index % 2 ? 0xd57d64 : 0x74a6d6 })
    );
    body.castShadow = true;
    body.position.y = 0.92;
    group.add(body);
    group.position.set(npc.x, 0, npc.z);

    const badge = makeMarker(npc.name.split(" ")[0], 0x89d9a1);
    badge.scale.setScalar(0.62);
    badge.position.y = 0.1;
    group.add(badge);

    scene.add(group);
    npcEntities.push({ ...npc, mesh: group, wanderPhase: Math.random() * Math.PI * 2, targetX: npc.homeX, targetZ: npc.homeZ });
  });

  model.vehicles.forEach((vehicle, index) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.8, 3.2),
      new THREE.MeshStandardMaterial({ color: vehicle.owned ? 0x49a7e3 : 0x7a7f85, metalness: 0.35, roughness: 0.45 })
    );
    mesh.position.set(vehicle.x, 0.45, vehicle.z);
    mesh.castShadow = true;
    scene.add(mesh);

    const marker = makeMarker(vehicle.name.replace(/\s+.*/, ""), vehicle.owned ? 0x8fd9ff : 0xbdbdbd);
    marker.position.set(vehicle.x, 0, vehicle.z);
    scene.add(marker);
  });

  const keys = { up: false, down: false, left: false, right: false };
  let yaw = Math.PI;
  let pitch = -0.28;
  let sprintHeld = false;
  let nearest = null;

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
    if (event.code === "KeyE" || event.code === "Space") {
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

  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);

  const joystick = createJoystick(moveStick, moveKnob);
  const look = createLookPad(lookPad, (dx, dy) => {
    yaw -= dx * LOOK_SENSITIVITY;
    pitch = Math.max(-0.95, Math.min(-0.08, pitch - dy * LOOK_SENSITIVITY * 0.8));
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
    npcEntities.forEach((npc) => {
      const dx = npc.targetX - npc.mesh.position.x;
      const dz = npc.targetZ - npc.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.2) {
        npc.wanderPhase += dt * 0.65;
        npc.targetX = npc.homeX + Math.cos(npc.wanderPhase) * 2.2;
        npc.targetZ = npc.homeZ + Math.sin(npc.wanderPhase * 1.1) * 2.2;
        return;
      }
      const speed = 1.1;
      npc.mesh.position.x += (dx / Math.max(0.001, dist)) * speed * dt;
      npc.mesh.position.z += (dz / Math.max(0.001, dist)) * speed * dt;
      npc.mesh.rotation.y = Math.atan2(dx, dz);
    });
  }

  function animate() {
    if (disposed) return;
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, clock.getDelta());

    const padX = joystick.state.x;
    const padY = joystick.state.y;
    const keyboardX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const keyboardY = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
    const inputX = Math.max(-1, Math.min(1, padX + keyboardX));
    const inputY = Math.max(-1, Math.min(1, -padY + keyboardY));

    const mag = Math.hypot(inputX, inputY);
    if (mag > 0.03) {
      const normX = inputX / mag;
      const normY = inputY / mag;
      const moveAngle = yaw + Math.atan2(normX, normY);
      const speed = (sprintHeld ? RUN_SPEED : WALK_SPEED) * Math.min(1, mag);
      player.position.x += Math.sin(moveAngle) * speed * dt;
      player.position.z += Math.cos(moveAngle) * speed * dt;

      const corrected = resolveWorldCollisions(
        { x: player.position.x, z: player.position.z },
        PLAYER_RADIUS,
        model.blockedZones
      );
      player.position.x = corrected.x;
      player.position.z = corrected.z;

      const targetYaw = Math.atan2(Math.sin(moveAngle), Math.cos(moveAngle));
      const deltaYaw = Math.atan2(Math.sin(targetYaw - player.rotation.y), Math.cos(targetYaw - player.rotation.y));
      player.rotation.y += deltaYaw * Math.min(1, dt * 9);
    }

    updateNpcWander(dt);

    const dynamicInteractables = [
      ...model.buildings.map((entry) => ({
        id: entry.locationId,
        name: entry.name,
        districtId: entry.districtId,
        x: entry.door.x,
        z: entry.door.z,
        prompt: entry.prompt,
        interactionType: "door"
      })),
      ...npcEntities.map((npc) => ({
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
    promptNode.textContent = nearest ? `${nearest.prompt} · Tap ACTION` : "Move near doors, NPCs, vehicles, or district markers";

    const horizontal = Math.cos(pitch) * CAMERA_DISTANCE;
    const targetCamera = new THREE.Vector3(
      player.position.x - Math.sin(yaw) * horizontal,
      CAMERA_HEIGHT + Math.sin(-pitch) * CAMERA_DISTANCE,
      player.position.z - Math.cos(yaw) * horizontal
    );

    camera.position.lerp(targetCamera, Math.min(1, dt * 7));
    camera.lookAt(player.position.x, 1.45, player.position.z);

    renderer.render(scene, camera);
  }

  const onResize = () => updateSize();
  window.addEventListener("resize", onResize);
  updateSize();
  animate();

  return {
    destroy() {
      disposed = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
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
