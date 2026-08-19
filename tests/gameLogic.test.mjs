import test from "node:test";
import assert from "node:assert/strict";

import {
  bankDeposit,
  bankWithdraw,
  createInitialState,
  createPlayer,
  getCurrentLocation,
  getNpcsAtLocation,
  getSelectedDistrict,
  interactWithNpc,
  moveToLocation,
  performLocationAction,
  safehouseRest,
  travelToDistrict,
  useInventoryItem
} from "../src/gameLogic.mjs";

test("initial state bootstraps required structures", () => {
  const state = createInitialState();
  assert.equal(state.player.wallet, 10000);
  assert.equal(state.player.role, "player");
  assert.equal(state.districts.length, 6);
  assert.ok(Array.isArray(state.quests));
  assert.ok(Array.isArray(state.achievements));
  assert.equal(state.meta.hasCreatedCharacter, false);
});

test("player creation sets name and unlocks gameplay", () => {
  const state = createInitialState();
  createPlayer(state, "Valentina");
  assert.equal(state.player.name, "Valentina");
  assert.equal(state.meta.hasCreatedCharacter, true);
});

test("travel updates district, location, and time", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  const startDay = state.time.day;
  travelToDistrict(state, "harbor");
  assert.equal(state.selectedDistrictId, "harbor");
  assert.equal(getSelectedDistrict(state).locations.includes(state.currentLocationId), true);
  assert.ok(state.time.day >= startDay);
});

test("location action changes economy and energy", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  moveToLocation(state, "downtown", "nightclub");
  const cash = state.player.wallet;
  const energy = state.player.energy;
  performLocationAction(state, "downtown", "nightclub", "nightclub-work");
  assert.ok(state.player.wallet >= cash);
  assert.ok(state.player.energy < energy);
});

test("bank deposit and withdraw enforce wallet and bank balance", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  const wallet = state.player.wallet;
  bankDeposit(state, 200);
  assert.equal(state.player.wallet, wallet - 200);
  assert.equal(state.player.bankBalance, 200);

  bankWithdraw(state, 200);
  assert.equal(state.player.wallet, wallet);
  assert.equal(state.player.bankBalance, 0);
});

test("safehouse rest recovers resources and advances turn", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  state.player.energy = 20;
  state.player.health = 25;
  const previousTurn = state.time.turn;
  safehouseRest(state);
  assert.ok(state.player.energy > 20);
  assert.ok(state.player.health > 25);
  assert.notEqual(state.time.turn, previousTurn);
});

test("npc interaction updates relationship and quest progress", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  moveToLocation(state, "downtown", "nightclub");
  const npcs = getNpcsAtLocation(state, getCurrentLocation(state).id);
  assert.ok(npcs.length > 0);
  interactWithNpc(state, npcs[0].id, "talk");
  assert.ok(state.relationships[npcs[0].id].relationshipValue > 0);
  const connectionsQuest = state.quests.find((quest) => quest.id === "quest-connections");
  assert.ok(connectionsQuest.progress >= 1);
});

test("using consumable item applies effect and decrements quantity", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  state.player.energy = 50;
  const item = state.inventory.find((entry) => entry.id === "energy-drink");
  assert.ok(item && item.quantity > 0);
  const quantityBefore = item.quantity;
  useInventoryItem(state, "energy-drink");
  assert.ok(state.player.energy > 50);
  const updated = state.inventory.find((entry) => entry.id === "energy-drink");
  assert.equal(updated?.quantity ?? 0, quantityBefore - 1);
});
