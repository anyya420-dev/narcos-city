import test from "node:test";
import assert from "node:assert/strict";

import { createInitialState } from "../src/gameLogic.mjs";
import {
  buildWorldModel,
  createDistrictAnchors,
  findNearestInteraction,
  getInteractables,
  getSpawnPoint,
  resolveWorldCollisions
} from "../src/cityWorldFoundation.mjs";

test("district anchors include canonical districts", () => {
  const state = createInitialState();
  const anchors = createDistrictAnchors(state.districts);
  assert.ok(anchors.downtown);
  assert.ok(anchors["old-town"]);
  assert.ok(anchors.harbor);
  assert.ok(anchors.residential);
});

test("world model builds buildings, npcs, and vehicles", () => {
  const state = createInitialState();
  const model = buildWorldModel(state);
  assert.ok(model.buildings.length >= state.districts.length * 4);
  assert.equal(model.npcs.length, state.npcs.length);
  assert.equal(model.vehicles.length, state.vehicles.length);
  assert.ok(model.blockedZones.length > 0);
});

test("spawn point maps to current location door when available", () => {
  const state = createInitialState();
  const model = buildWorldModel(state);
  const spawn = getSpawnPoint(state, model);
  const node = model.locationNodes[state.currentLocationId];
  assert.ok(node);
  assert.ok(Math.abs(spawn.x - node.door.x) < 0.001);
});

test("nearest interaction resolves expected type", () => {
  const state = createInitialState();
  const model = buildWorldModel(state);
  const interactables = getInteractables(model);
  const firstDoor = interactables.find((entry) => entry.interactionType === "door");
  const nearest = findNearestInteraction({ x: firstDoor.x, z: firstDoor.z + 0.4 }, interactables, 2.8);
  assert.ok(nearest);
  assert.equal(nearest.interactionType, "door");
});

test("collision resolver pushes player outside blocked zone", () => {
  const blocked = [{ minX: -2, maxX: 2, minZ: -2, maxZ: 2 }];
  const next = resolveWorldCollisions({ x: 0.3, z: 0.4 }, 0.7, blocked);
  const insideX = next.x > blocked[0].minX && next.x < blocked[0].maxX;
  const insideZ = next.z > blocked[0].minZ && next.z < blocked[0].maxZ;
  assert.equal(insideX && insideZ, false);
});
