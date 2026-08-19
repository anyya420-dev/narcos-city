import test from "node:test";
import assert from "node:assert/strict";

import {
  bankDeposit,
  buyMarketItem,
  buyProperty,
  buyVehicle,
  casinoPlay,
  changeOutfit,
  claimDailyReward,
  claimDailyQuestReward,
  coolDistrictHeat,
  createInitialState,
  createPlayer,
  debugChangeReputation,
  debugUnlockDistrict,
  interactWithNpc,
  moveToLocation,
  normalizeState,
  performLocationAction,
  performPrisonAction,
  repayCredit,
  requestCredit,
  rentProperty,
  runBusinessAction,
  runCrimeOperation,
  runFactionAction,
  runJobAction,
  startDateWithNpc,
  hostSocialEvent,
  proposeToNpc,
  safehouseRest,
  performLifeActivity,
  payRent,
  travelToDistrict,
  useInventoryItem
} from "../src/gameLogic.mjs";

test("initial state has stage2 structures", () => {
  const state = createInitialState();
  assert.equal(state.meta.saveVersion, 7);
  assert.ok(state.districts.length >= 10);
  assert.ok(state.marketCatalog.length >= 10);
  assert.equal(state.player.wantedLevel, 0);
  assert.ok(state.player.money >= 10000);
  assert.equal(state.player.title, "Queen");
  assert.equal(state.settings.language, "ru");
  assert.ok(["clear", "cloudy", "rain", "fog"].includes(state.weather.current));
  assert.equal(typeof state.time.hour, "number");
  assert.ok(Array.isArray(state.transactions));
  assert.ok(Array.isArray(state.jobs));
  assert.ok(Array.isArray(state.crimeOperations));
  assert.ok(Array.isArray(state.daily.quests));
  assert.ok(state.life);
  assert.equal(typeof state.life.age, "number");
  assert.equal(typeof state.player.hunger, "number");
  assert.equal(state.settings.language, "ru");
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
  assert.ok(state.transactions.some((tx) => tx.source === "travel" && tx.amount < 0));
  assert.notEqual(state.player.money, startMoney);
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
  assert.ok(state.transactions.some((tx) => tx.source === "market" && tx.amount < 0));
  assert.notEqual(state.player.money, moneyBefore);
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
  assert.ok(migrated.meta.saveVersion === 7);
  assert.ok(migrated.life?.needs);
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

test("jobs and operations drive progression loops", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  state.player.level = 5;
  state.player.energy = 100;
  state.player.reputation.street = 20;
  const moneyBefore = state.player.money;
  runJobAction(state, "job-office");
  assert.ok(state.player.money > moneyBefore);
  runCrimeOperation(state, "op-intel-job");
  assert.ok(state.statistics.actionCounts["crime-operation"] >= 1);
});

test("credit and prison systems are actionable", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  requestCredit(state, 500);
  assert.ok(state.credit.debt >= 500);
  const moneyBeforeRepay = state.player.money;
  repayCredit(state, 300);
  assert.ok(state.player.money < moneyBeforeRepay);

  state.prison.active = true;
  state.prison.remainingTurns = 2;
  performPrisonAction(state, "serve-turn");
  assert.ok(state.prison.remainingTurns <= 1);
});

test("daily quest rewards can be claimed once completed", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  const dailyQuest = state.daily.quests.find((entry) => entry.id === "daily-talk-two");
  interactWithNpc(state, "npc-banker-1", "talk");
  interactWithNpc(state, "npc-bartender-1", "talk");
  claimDailyQuestReward(state, dailyQuest.id);
  assert.equal(dailyQuest.claimed, true);
});

test("life activities change needs and time", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  const hungerBefore = state.player.hunger;
  const turnBefore = state.time.turn;
  performLifeActivity(state, "eat");
  assert.ok(state.player.hunger >= hungerBefore);
  assert.notEqual(state.time.turn, turnBefore);
});

test("renting and rent payment affect residence and finance", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  state.player.money = 10000;
  rentProperty(state, "apt-oldtown", "weekly");
  assert.equal(state.life.residence.ownership, "Rented");
  const dueBefore = state.life.residence.rentDueDay;
  payRent(state);
  assert.ok(state.life.residence.rentDueDay > dueBefore);
});

test("wardrobe, dating, proposal, and wedding flows update relationship state", () => {
  const state = createInitialState();
  createPlayer(state, "Rico");
  state.player.money = 100000;
  changeOutfit(state, "Elegant");
  assert.equal(state.life.wardrobe.currentPreset, "Elegant");

  const npcId = "npc-restaurant-owner-1";
  for (let i = 0; i < 8; i += 1) {
    interactWithNpc(state, npcId, "flirt", true);
  }
  startDateWithNpc(state, npcId, "restaurant");
  const relation = state.relationships[npcId];
  relation.romance = 90;
  relation.trust = 80;
  relation.value = 92;
  proposeToNpc(state, npcId);
  hostSocialEvent(state, "wedding");
  assert.equal(state.life.relationshipStatus, "Married");
});
