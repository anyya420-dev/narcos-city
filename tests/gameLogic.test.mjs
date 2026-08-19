import test from "node:test";
import assert from "node:assert/strict";

import {
  bankDeposit,
  buyMarketItem,
  buyProperty,
  buyVehicle,
  casinoPlay,
  claimDailyReward,
  coolDistrictHeat,
  createInitialState,
  createPlayer,
  debugChangeReputation,
  debugUnlockDistrict,
  interactWithNpc,
  moveToLocation,
  normalizeState,
  performLocationAction,
  runBusinessAction,
  runFactionAction,
  safehouseRest,
  travelToDistrict,
  useInventoryItem
} from "../src/gameLogic.mjs";

test("initial state has stage2 structures", () => {
  const state = createInitialState();
  assert.equal(state.meta.saveVersion, 3);
  assert.equal(state.districts.length, 6);
  assert.ok(state.marketCatalog.length >= 10);
  assert.equal(state.player.wantedLevel, 0);
  assert.ok(Array.isArray(state.transactions));
});

test("character creation unlocks gameplay", () => {
  const state = createInitialState();
  createPlayer(state, "Valentina");
  assert.equal(state.meta.hasCreatedCharacter, true);
  assert.equal(state.player.name, "Valentina");
});

test("travel requires reputation and works after unlock", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  const startMoney = state.player.money;
  travelToDistrict(state, "old-town");
  assert.equal(state.selectedDistrictId, "downtown");

  state.meta.debugMode = true;
  debugChangeReputation(state, "city", 10);
  travelToDistrict(state, "old-town");
  assert.equal(state.selectedDistrictId, "old-town");
  assert.ok(state.player.money < startMoney);
});

test("location action and event hooks modify progression", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  const xpBefore = state.player.totalXp;
  performLocationAction(state, "downtown", "bank", "bank-invest");
  assert.ok(state.player.totalXp > xpBefore);
  assert.ok(state.statistics.totalActionsCompleted >= 1);
});

test("npc interaction changes relationship and social stats", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  moveToLocation(state, "downtown", "restaurant");
  const before = state.relationships["npc-restaurant-owner-1"].value;
  interactWithNpc(state, "npc-restaurant-owner-1", "talk");
  assert.ok(state.relationships["npc-restaurant-owner-1"].value > before);
  assert.ok(state.statistics.npcsMet.includes("npc-restaurant-owner-1"));
});

test("market buy and use item affects inventory and health/energy", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  const moneyBefore = state.player.money;
  buyMarketItem(state, "medkit", 160);
  assert.ok(state.inventory.medkit >= 1);
  state.player.health = 50;
  useInventoryItem(state, "medkit");
  assert.ok(state.player.health > 50);
  assert.ok(state.player.money < moneyBefore);
});

test("transport/property/business systems connect to economy", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  state.player.money = 100000;
  buyVehicle(state, "sedan-classic");
  buyProperty(state, "apt-oldtown");
  runBusinessAction(state, "biz-garage");
  assert.ok(state.vehicles.find((v) => v.id === "sedan-classic")?.owned);
  assert.ok(state.player.ownedProperties.includes("apt-oldtown"));
  assert.ok(state.player.ownedBusinesses.includes("biz-garage"));
});

test("faction and wanted systems are actionable", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  state.player.energy = 100;
  runFactionAction(state, "royals");
  assert.ok(state.player.reputation.faction > 0);

  state.player.wantedLevel = 3;
  state.player.money = 1000;
  coolDistrictHeat(state, "downtown");
  assert.ok(state.player.wantedLevel <= 2);
});

test("daily reward and casino transactions persist in state", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  claimDailyReward(state);
  const txCount = state.transactions.length;
  state.player.money = 5000;
  casinoPlay(state, "coinFlip", 100);
  assert.ok(state.transactions.length > txCount);
  assert.ok(state.statistics.casinoPlays >= 1);
});

test("normalize migrates old saves and keeps safe defaults", () => {
  const migrated = normalizeState({ player: { name: "Old", money: 200 }, time: { day: 3, turn: 2 }, inventory: [{ id: "medkit", quantity: 1 }] });
  assert.equal(migrated.player.name, "Old");
  assert.equal(typeof migrated.inventory, "object");
  assert.ok(migrated.meta.saveVersion === 3);
});

test("safehouse rest restores resources and advances time", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  state.player.energy = 10;
  state.player.health = 20;
  const dayBefore = state.time.day;
  safehouseRest(state);
  assert.ok(state.player.energy > 10);
  assert.ok(state.player.health > 20);
  assert.ok(state.time.day >= dayBefore);
});
