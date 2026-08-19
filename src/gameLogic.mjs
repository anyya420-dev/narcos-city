import {
  ACHIEVEMENTS,
  BUSINESSES,
  DISTRICTS,
  FACTIONS,
  LEVEL_XP_BASE,
  LOCATIONS,
  NPCS,
  QUESTS,
  RANDOM_EVENTS,
  STARTER_ITEMS,
  TURNS_PER_DAY,
  VEHICLES
} from "./gameData.mjs";

export const LEVEL_THRESHOLD = LEVEL_XP_BASE;

const ITEM_CATALOG = {
  medkit: {
    id: "medkit",
    name: "Medkit",
    category: "consumable",
    description: "Restores 25 health.",
    usable: true,
    effects: { health: 25 }
  },
  "energy-drink": {
    id: "energy-drink",
    name: "Energy Drink",
    category: "consumable",
    description: "Restores 20 energy.",
    usable: true,
    effects: { energy: 20 }
  },
  "silver-watch": {
    id: "silver-watch",
    name: "Silver Watch",
    category: "valuable",
    description: "A tradable luxury item.",
    usable: false
  }
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function clone(value) {
  return structuredClone(value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeRelationships() {
  return Object.fromEntries(NPCS.map((npc) => [npc.id, { npcId: npc.id, relationshipValue: 0, status: "neutral" }]));
}

function updateRelationshipStatus(relationship) {
  const score = relationship.relationshipValue;
  if (score >= 25) relationship.status = "trusted";
  else if (score >= 10) relationship.status = "friendly";
  else if (score <= -10) relationship.status = "hostile";
  else relationship.status = "neutral";
}

export function createInitialState() {
  const firstDistrict = DISTRICTS[0];
  return {
    currentScreen: "city",
    selectedDistrictId: firstDistrict.id,
    currentLocationId: firstDistrict.locations[0],
    player: {
      name: "",
      alias: "",
      title: "Rookie of Velvet Syndicate",
      role: "player",
      level: 1,
      experience: 0,
      nextLevelExperience: LEVEL_XP_BASE,
      money: 10000,
      wallet: 10000,
      bankBalance: 0,
      health: 100,
      energy: 100,
      reputation: 0,
      status: "A new name in NARCOS CITY",
      stats: {
        strength: 10,
        intelligence: 10,
        charisma: 10,
        influence: 10,
        streetReputation: 0
      }
    },
    time: {
      day: 1,
      turn: 1,
      turnsPerDay: TURNS_PER_DAY
    },
    day: 1,
    turn: 1,
    districts: clone(DISTRICTS),
    inventory: clone(STARTER_ITEMS),
    storage: ["Encrypted ledger", "Luxury suit", "Emergency cash"],
    vehicles: clone(VEHICLES),
    selectedVehicleId: VEHICLES.find((v) => v.owned)?.id || VEHICLES[0].id,
    npcs: clone(NPCS),
    relationships: makeRelationships(),
    factions: clone(FACTIONS),
    businesses: clone(BUSINESSES),
    quests: clone(QUESTS),
    achievements: ACHIEVEMENTS.map((achievement) => ({ ...achievement, unlocked: false, unlockedAt: null })),
    notifications: [
      {
        id: makeId(),
        type: "info",
        text: "Welcome to NARCOS CITY. Create your character and make your first move.",
        createdAt: Date.now()
      }
    ],
    meta: {
      hasCreatedCharacter: false,
      visitedDistrictIds: [firstDistrict.id],
      visitedLocationIds: [],
      npcInteractions: 0,
      businessActions: 0,
      bankDeposits: 0,
      eventSeed: 0,
      lastEvent: null,
      wantedLevel: 0
    }
  };
}

function addNotification(state, text, type = "info") {
  state.notifications.unshift({ id: makeId(), type, text, createdAt: Date.now() });
  state.notifications = state.notifications.slice(0, 60);
}

function syncLegacyDayTurn(state) {
  state.day = state.time.day;
  state.turn = state.time.turn;
}

function advanceTurns(state, turns = 1) {
  const total = state.time.turn + turns;
  const dayIncrease = Math.floor((total - 1) / state.time.turnsPerDay);
  state.time.day += dayIncrease;
  state.time.turn = ((total - 1) % state.time.turnsPerDay) + 1;
  syncLegacyDayTurn(state);
}

function getOwnedVehicle(state) {
  const selected = state.vehicles.find((v) => v.id === state.selectedVehicleId);
  if (selected?.owned) return selected;
  return state.vehicles.find((v) => v.owned) || state.vehicles[0];
}

function getDistrictById(state, districtId) {
  return state.districts.find((district) => district.id === districtId);
}

function getLocationData(locationId) {
  return LOCATIONS[locationId] || null;
}

function getActionFromLocation(locationId, actionId) {
  const location = getLocationData(locationId);
  return location?.actions.find((action) => action.id === actionId) || null;
}

function updateTitle(state) {
  const { level, reputation } = state.player;
  if (level >= 8 || reputation >= 45) state.player.title = "Shadow Baron";
  else if (level >= 5 || reputation >= 25) state.player.title = "City Operator";
  else if (level >= 3 || reputation >= 12) state.player.title = "Rising Earner";
}

function applyExperience(state, xpGain) {
  if (xpGain <= 0) return;
  state.player.experience += xpGain;
  while (state.player.experience >= state.player.nextLevelExperience) {
    state.player.experience -= state.player.nextLevelExperience;
    state.player.level += 1;
    state.player.nextLevelExperience += LEVEL_XP_BASE + state.player.level * 10;
    state.player.stats.strength += 1;
    state.player.stats.intelligence += 1;
    state.player.stats.charisma += 1;
    state.player.health = clamp(state.player.health + 8, 0, 100);
    state.player.energy = clamp(state.player.energy + 12, 0, 100);
    addNotification(state, `Level up! You reached level ${state.player.level}.`, "success");
  }
  updateTitle(state);
}

function applyReputation(state, amount) {
  if (!amount) return;
  state.player.reputation = Math.max(0, state.player.reputation + amount);
  state.player.stats.streetReputation = state.player.reputation;
  state.factions.forEach((faction) => {
    faction.playerReputation = Math.max(0, faction.playerReputation + Math.max(0, Math.round(amount / 2)));
  });
  updateTitle(state);
}

function applyWalletDelta(state, delta) {
  if (delta < 0 && state.player.wallet < Math.abs(delta)) {
    return false;
  }
  state.player.wallet += delta;
  state.player.money = state.player.wallet;
  return true;
}

function markDistrictVisited(state, districtId) {
  if (!state.meta.visitedDistrictIds.includes(districtId)) {
    state.meta.visitedDistrictIds.push(districtId);
  }
}

function markLocationVisited(state, locationId) {
  if (!state.meta.visitedLocationIds.includes(locationId)) {
    state.meta.visitedLocationIds.push(locationId);
  }
}

function updateQuestProgress(state) {
  let completedAny = false;
  for (const quest of state.quests) {
    if (quest.completed) continue;

    if (quest.objectiveType === "visit-location") {
      quest.progress = state.meta.visitedLocationIds.includes(quest.target) ? 1 : 0;
    }
    if (quest.objectiveType === "visit-districts") {
      quest.progress = state.meta.visitedDistrictIds.length;
    }
    if (quest.objectiveType === "npc-interaction") {
      quest.progress = state.meta.npcInteractions;
    }
    if (quest.objectiveType === "bank-deposit") {
      quest.progress = state.meta.bankDeposits;
    }
    if (quest.objectiveType === "reach-reputation") {
      quest.progress = state.player.reputation;
    }

    if (quest.progress >= quest.goal) {
      quest.completed = true;
      quest.progress = quest.goal;
      applyWalletDelta(state, quest.reward.cash);
      applyExperience(state, quest.reward.xp);
      applyReputation(state, quest.reward.reputation);
      addNotification(state, `Quest completed: ${quest.title}.`, "success");
      completedAny = true;
    }
  }
  return completedAny;
}

function updateAchievements(state) {
  const metrics = {
    "enter-location": state.meta.visitedLocationIds.length,
    wallet: state.player.wallet,
    "districts-visited": state.meta.visitedDistrictIds.length,
    "npc-interaction": state.meta.npcInteractions,
    "business-action": state.meta.businessActions,
    reputation: state.player.reputation
  };

  for (const achievement of state.achievements) {
    if (achievement.unlocked) continue;
    const value = metrics[achievement.type] ?? 0;
    if (value >= achievement.target) {
      achievement.unlocked = true;
      achievement.unlockedAt = Date.now();
      addNotification(state, `Achievement unlocked: ${achievement.title}.`, "success");
    }
  }
}

function applyEventEffects(state, event) {
  if (!event) return;
  if (event.effect.cash) {
    if (event.effect.cash < 0) {
      applyWalletDelta(state, -Math.min(state.player.wallet, Math.abs(event.effect.cash)));
    } else {
      applyWalletDelta(state, event.effect.cash);
    }
  }
  if (event.effect.energy) {
    state.player.energy = clamp(state.player.energy + event.effect.energy, 0, 100);
  }
  if (event.effect.health) {
    state.player.health = clamp(state.player.health + event.effect.health, 0, 100);
  }
  if (event.effect.reputation) {
    applyReputation(state, event.effect.reputation);
  }
}

function maybeTriggerRandomEvent(state, reason) {
  state.meta.eventSeed += 1;
  const shouldTrigger = ["travel", "rest", "location", "npc"].includes(reason) && (state.meta.eventSeed + state.time.turn) % 3 === 0;
  if (!shouldTrigger) {
    state.meta.lastEvent = null;
    return;
  }
  const eventIndex = (state.meta.eventSeed + state.time.day + state.time.turn) % RANDOM_EVENTS.length;
  const event = RANDOM_EVENTS[eventIndex];
  applyEventEffects(state, event);
  state.meta.lastEvent = event;
  addNotification(state, `${event.title}: ${event.description}`, event.effect.cash && event.effect.cash < 0 ? "error" : "info");
}

function applyCommonActionRewards(state, action) {
  if (!action) return true;
  if (state.player.energy < action.energyCost) {
    addNotification(state, "Insufficient energy.", "error");
    return false;
  }
  if (action.cashDelta < 0 && state.player.wallet < Math.abs(action.cashDelta)) {
    addNotification(state, "Insufficient money.", "error");
    return false;
  }

  state.player.energy = clamp(state.player.energy - action.energyCost, 0, 100);
  applyWalletDelta(state, action.cashDelta || 0);
  applyExperience(state, action.xpGain || 0);
  applyReputation(state, action.reputationGain || 0);
  return true;
}

function ensureItem(state, itemId) {
  return state.inventory.find((item) => item.id === itemId);
}

function addItemToInventory(state, itemId, quantity = 1) {
  const template = ITEM_CATALOG[itemId];
  if (!template) return;
  const existing = ensureItem(state, itemId);
  if (existing) {
    existing.quantity += quantity;
    return;
  }
  state.inventory.push({ ...template, quantity });
}

function removeInventoryItem(state, itemId, quantity = 1) {
  const item = ensureItem(state, itemId);
  if (!item || item.quantity < quantity) return false;
  item.quantity -= quantity;
  if (item.quantity === 0) {
    state.inventory = state.inventory.filter((entry) => entry.id !== itemId);
  }
  return true;
}

function autoNpcInteraction(state, preferredRole) {
  const choices = getNpcsAtLocation(state, state.currentLocationId);
  if (!choices.length) {
    addNotification(state, "No one interesting is here right now.", "info");
    return;
  }
  const npc = choices.find((entry) => entry.role.includes(preferredRole)) || choices[0];
  interactWithNpc(state, npc.id, "talk", true);
}

function applyLocationSpecialAction(state, action) {
  switch (action.type) {
    case "leave":
      state.player.status = "Returned to city streets";
      navigateTo(state, "city");
      addNotification(state, `You leave the ${getLocationData(state.currentLocationId)?.name || "location"}.`, "info");
      return;
    case "safehouse-rest":
      safehouseRest(state, true);
      return;
    case "safehouse-recover":
      safehouseRecoverEnergy(state, true);
      return;
    case "inventory-view":
      inspectInventory(state);
      return;
    case "bank-view":
      addNotification(state, `Wallet: $${state.player.wallet} · Bank: $${state.player.bankBalance}`, "info");
      return;
    case "bank-deposit":
      bankDeposit(state, 200, true);
      return;
    case "bank-withdraw":
      bankWithdraw(state, 200, true);
      return;
    case "market-buy":
      buyMarketItem(state, action.itemId, Math.abs(action.cashDelta), true);
      return;
    case "market-sell":
      sellMarketItem(state, action.itemId, Math.abs(action.cashDelta), true);
      return;
    case "garage-view":
      addNotification(state, `Selected transport: ${getOwnedVehicle(state).name}`, "info");
      return;
    case "garage-cycle":
      cycleVehicle(state, true);
      return;
    case "police-status":
      addNotification(state, `Wanted level: ${state.meta.wantedLevel}/100`, "info");
      return;
    case "casino-play": {
      const bet = state.player.wallet >= 200 ? 200 : state.player.wallet >= 50 ? 50 : 0;
      if (!bet) {
        addNotification(state, "You need cash to play at the casino.", "error");
        return;
      }
      const win = (state.time.day + state.time.turn + state.meta.eventSeed) % 2 === 0;
      if (win) {
        applyWalletDelta(state, bet);
        applyReputation(state, 1);
        addNotification(state, `Casino win: +$${bet}.`, "success");
      } else {
        applyWalletDelta(state, -bet);
        applyReputation(state, -1);
        addNotification(state, `Casino loss: -$${bet}.`, "error");
      }
      return;
    }
    case "meet-npc":
    case "talk":
      autoNpcInteraction(state, "");
      return;
    case "meet-owner":
      autoNpcInteraction(state, "business owner");
      state.meta.businessActions += 1;
      return;
    case "risky-deal":
      state.meta.wantedLevel = clamp(state.meta.wantedLevel + 8, 0, 100);
      if ((state.time.turn + state.meta.eventSeed) % 4 === 0) {
        state.player.health = clamp(state.player.health - 8, 0, 100);
        addNotification(state, "Risky deal turned tense. You took minor damage.", "error");
      }
      return;
    default:
      if (["work", "socialize"].includes(action.type)) {
        state.meta.businessActions += 1;
      }
  }
}

export function normalizeState(rawState) {
  const base = createInitialState();
  if (!rawState || typeof rawState !== "object") return base;

  const state = { ...base, ...rawState };
  state.player = { ...base.player, ...rawState.player, stats: { ...base.player.stats, ...rawState.player?.stats } };
  state.time = { ...base.time, ...rawState.time };
  state.day = state.time.day;
  state.turn = state.time.turn;
  state.districts = Array.isArray(rawState.districts) ? rawState.districts : clone(DISTRICTS);
  state.inventory = Array.isArray(rawState.inventory) ? rawState.inventory : clone(STARTER_ITEMS);
  state.storage = Array.isArray(rawState.storage) ? rawState.storage : clone(base.storage);
  state.vehicles = Array.isArray(rawState.vehicles) ? rawState.vehicles : clone(VEHICLES);
  state.npcs = Array.isArray(rawState.npcs) ? rawState.npcs : clone(NPCS);
  state.relationships = rawState.relationships && typeof rawState.relationships === "object" ? rawState.relationships : makeRelationships();
  state.factions = Array.isArray(rawState.factions) ? rawState.factions : clone(FACTIONS);
  state.businesses = Array.isArray(rawState.businesses) ? rawState.businesses : clone(BUSINESSES);
  state.quests = Array.isArray(rawState.quests) ? rawState.quests : clone(QUESTS);
  state.achievements = Array.isArray(rawState.achievements)
    ? rawState.achievements
    : ACHIEVEMENTS.map((achievement) => ({ ...achievement, unlocked: false, unlockedAt: null }));
  state.notifications = Array.isArray(rawState.notifications) ? rawState.notifications.slice(0, 60) : clone(base.notifications);
  state.meta = { ...base.meta, ...rawState.meta };

  if (!state.selectedDistrictId || !getDistrictById(state, state.selectedDistrictId)) {
    state.selectedDistrictId = state.districts[0]?.id || DISTRICTS[0].id;
  }

  const selectedDistrict = getDistrictById(state, state.selectedDistrictId);
  if (!state.currentLocationId || !selectedDistrict?.locations.includes(state.currentLocationId)) {
    state.currentLocationId = selectedDistrict?.locations[0] || DISTRICTS[0].locations[0];
  }

  if (!state.player.name && state.player.alias) {
    state.player.name = state.player.alias;
  }
  state.player.alias = state.player.name;
  state.player.money = state.player.wallet;
  state.meta.visitedDistrictIds = Array.isArray(state.meta.visitedDistrictIds) ? state.meta.visitedDistrictIds : [state.selectedDistrictId];
  state.meta.visitedLocationIds = Array.isArray(state.meta.visitedLocationIds) ? state.meta.visitedLocationIds : [];
  return state;
}

export function createPlayer(state, name) {
  const cleanName = String(name || "").trim();
  if (!cleanName) {
    addNotification(state, "Enter a valid character name.", "error");
    return state;
  }
  state.player.name = cleanName.slice(0, 24);
  state.player.alias = state.player.name;
  state.player.status = "Entered NARCOS CITY";
  state.meta.hasCreatedCharacter = true;
  addNotification(state, `Welcome, ${state.player.name}. Your empire starts now.`, "success");
  updateQuestProgress(state);
  updateAchievements(state);
  return state;
}

export function resetGame() {
  return createInitialState();
}

export function navigateTo(state, screen) {
  const allowed = ["city", "districts", "profile", "inventory", "more"];
  state.currentScreen = allowed.includes(screen) ? screen : "city";
  return state;
}

export function travelToDistrict(state, districtId) {
  const district = getDistrictById(state, districtId);
  if (!district) {
    addNotification(state, "District not found.", "error");
    return state;
  }
  const vehicle = getOwnedVehicle(state);
  const travelCost = Math.max(20, district.travelCost + vehicle.travelCost - 90);
  if (state.player.wallet < travelCost) {
    addNotification(state, "Insufficient money for travel.", "error");
    return state;
  }
  if (state.player.energy < 4) {
    addNotification(state, "Insufficient energy to travel.", "error");
    return state;
  }

  applyWalletDelta(state, -travelCost);
  state.player.energy = clamp(state.player.energy - 4, 0, 100);
  state.selectedDistrictId = district.id;
  state.currentLocationId = district.locations[0];
  state.player.status = `Traveling through ${district.name}`;
  markDistrictVisited(state, district.id);
  markLocationVisited(state, state.currentLocationId);
  advanceTurns(state, Math.max(1, district.travelTurns));
  maybeTriggerRandomEvent(state, "travel");
  updateQuestProgress(state);
  updateAchievements(state);
  addNotification(state, `Travel completed to ${district.name}. Cost: $${travelCost}.`, "info");
  return state;
}

export function moveToLocation(state, districtId, locationId) {
  const district = getDistrictById(state, districtId);
  if (!district || !district.locations.includes(locationId)) {
    addNotification(state, "Location not found in selected district.", "error");
    return state;
  }
  if (state.player.energy < 2) {
    addNotification(state, "Insufficient energy.", "error");
    return state;
  }

  state.selectedDistrictId = district.id;
  state.currentLocationId = locationId;
  state.player.energy = clamp(state.player.energy - 2, 0, 100);
  state.player.status = `At ${getLocationData(locationId)?.name || "location"}`;
  markDistrictVisited(state, district.id);
  markLocationVisited(state, locationId);
  advanceTurns(state, 1);
  maybeTriggerRandomEvent(state, "location");
  updateQuestProgress(state);
  updateAchievements(state);
  addNotification(state, `Entered ${getLocationData(locationId)?.name || "location"}.`, "info");
  return state;
}

export function performLocationAction(state, districtId, locationId, actionId) {
  const district = getDistrictById(state, districtId);
  if (!district || !district.locations.includes(locationId)) {
    addNotification(state, "Location action failed: invalid location.", "error");
    return state;
  }
  const action = getActionFromLocation(locationId, actionId);
  if (!action) {
    addNotification(state, "Action unavailable.", "error");
    return state;
  }

  state.selectedDistrictId = district.id;
  state.currentLocationId = locationId;
  if (!applyCommonActionRewards(state, action)) {
    return state;
  }

  applyLocationSpecialAction(state, action);
  if (!["safehouse-rest", "safehouse-recover"].includes(action.type)) {
    advanceTurns(state, 1);
  }

  state.player.status = `Action: ${action.name}`;
  markDistrictVisited(state, district.id);
  markLocationVisited(state, locationId);
  maybeTriggerRandomEvent(state, "location");
  updateQuestProgress(state);
  updateAchievements(state);
  addNotification(state, `${action.name} completed at ${getLocationData(locationId)?.name || "location"}.`, "success");
  return state;
}

export function safehouseRest(state, silent = false) {
  advanceTurns(state, 1);
  state.player.energy = clamp(state.player.energy + 45, 0, 100);
  state.player.health = clamp(state.player.health + 28, 0, 100);
  state.player.status = "Rested at safehouse";
  maybeTriggerRandomEvent(state, "rest");
  updateQuestProgress(state);
  updateAchievements(state);
  if (!silent) {
    addNotification(state, "You rested and recovered health and energy.", "success");
  }
  return state;
}

export function safehouseRecoverEnergy(state, silent = false) {
  advanceTurns(state, 1);
  state.player.energy = clamp(state.player.energy + 35, 0, 100);
  state.player.status = "Recovered energy at safehouse";
  maybeTriggerRandomEvent(state, "rest");
  updateQuestProgress(state);
  updateAchievements(state);
  if (!silent) {
    addNotification(state, "Energy restored at safehouse.", "success");
  }
  return state;
}

export function upgradeSafehouse(state) {
  const upgradeCost = 1500 + state.player.level * 200;
  if (state.player.wallet < upgradeCost) {
    addNotification(state, `Need $${upgradeCost} to improve your safehouse.`, "error");
    return state;
  }
  applyWalletDelta(state, -upgradeCost);
  state.storage.unshift(`Safehouse upgrade package day ${state.time.day}`);
  state.storage = state.storage.slice(0, 10);
  state.player.health = clamp(state.player.health + 10, 0, 100);
  state.player.energy = clamp(state.player.energy + 10, 0, 100);
  applyExperience(state, 18);
  addNotification(state, "Safehouse upgraded with better recovery facilities.", "success");
  return state;
}

export function coolDistrictHeat(state, districtId) {
  const district = getDistrictById(state, districtId);
  if (!district) {
    addNotification(state, "District not found.", "error");
    return state;
  }
  const cost = 220;
  if (state.player.wallet < cost) {
    addNotification(state, "Insufficient money for cleanup operation.", "error");
    return state;
  }
  applyWalletDelta(state, -cost);
  state.meta.wantedLevel = clamp(state.meta.wantedLevel - 12, 0, 100);
  state.player.status = `Cooling heat in ${district.name}`;
  advanceTurns(state, 1);
  applyExperience(state, 10);
  addNotification(state, `Heat reduced in ${district.name}.`, "success");
  return state;
}

export function bankDeposit(state, amount = 200, silent = false) {
  const value = Math.max(0, Number(amount) || 0);
  if (!value) {
    addNotification(state, "Deposit amount invalid.", "error");
    return state;
  }
  if (state.player.wallet < value) {
    addNotification(state, "Insufficient wallet funds.", "error");
    return state;
  }
  applyWalletDelta(state, -value);
  state.player.bankBalance += value;
  state.meta.bankDeposits += 1;
  applyExperience(state, 10);
  applyReputation(state, 1);
  updateQuestProgress(state);
  updateAchievements(state);
  if (!silent) {
    addNotification(state, `Deposited $${value}.`, "success");
  }
  return state;
}

export function bankWithdraw(state, amount = 200, silent = false) {
  const value = Math.max(0, Number(amount) || 0);
  if (!value) {
    addNotification(state, "Withdraw amount invalid.", "error");
    return state;
  }
  if (state.player.bankBalance < value) {
    addNotification(state, "Insufficient bank balance.", "error");
    return state;
  }
  state.player.bankBalance -= value;
  applyWalletDelta(state, value);
  applyExperience(state, 8);
  if (!silent) {
    addNotification(state, `Withdrew $${value}.`, "success");
  }
  return state;
}

export function buyMarketItem(state, itemId, price, silent = false) {
  const item = ITEM_CATALOG[itemId];
  if (!item) {
    addNotification(state, "Item unavailable.", "error");
    return state;
  }
  if (state.player.wallet < price) {
    addNotification(state, "Insufficient money.", "error");
    return state;
  }
  applyWalletDelta(state, -price);
  addItemToInventory(state, itemId, 1);
  applyExperience(state, 8);
  if (!silent) {
    addNotification(state, `Purchased ${item.name}.`, "success");
  }
  return state;
}

export function sellMarketItem(state, itemId, value, silent = false) {
  const item = ITEM_CATALOG[itemId] || ensureItem(state, itemId);
  if (!removeInventoryItem(state, itemId, 1)) {
    addNotification(state, "Item not available to sell.", "error");
    return state;
  }
  applyWalletDelta(state, value);
  applyExperience(state, 6);
  if (!silent) {
    addNotification(state, `Sold ${item?.name || itemId}.`, "success");
  }
  return state;
}

export function useInventoryItem(state, itemId) {
  const item = ensureItem(state, itemId);
  if (!item) {
    addNotification(state, "Item not found.", "error");
    return state;
  }
  if (!item.usable) {
    addNotification(state, `${item.name} cannot be used right now.`, "info");
    return state;
  }
  const effect = item.effects || {};
  if (effect.health) {
    state.player.health = clamp(state.player.health + effect.health, 0, 100);
  }
  if (effect.energy) {
    state.player.energy = clamp(state.player.energy + effect.energy, 0, 100);
  }
  removeInventoryItem(state, itemId, 1);
  addNotification(state, `${item.name} used.`, "success");
  updateAchievements(state);
  return state;
}

export function buyVehicle(state, vehicleId) {
  const vehicle = state.vehicles.find((entry) => entry.id === vehicleId);
  if (!vehicle) {
    addNotification(state, "Vehicle not found.", "error");
    return state;
  }
  if (vehicle.owned) {
    addNotification(state, `${vehicle.name} is already owned.`, "info");
    return state;
  }
  if (state.player.wallet < vehicle.price) {
    addNotification(state, "Insufficient money for vehicle purchase.", "error");
    return state;
  }
  applyWalletDelta(state, -vehicle.price);
  vehicle.owned = true;
  state.selectedVehicleId = vehicle.id;
  applyExperience(state, 18);
  addNotification(state, `Purchased ${vehicle.name}.`, "success");
  return state;
}

export function cycleVehicle(state, silent = false) {
  const owned = state.vehicles.filter((vehicle) => vehicle.owned);
  if (!owned.length) return state;
  const current = owned.findIndex((vehicle) => vehicle.id === state.selectedVehicleId);
  const next = owned[(current + 1) % owned.length];
  state.selectedVehicleId = next.id;
  if (!silent) {
    addNotification(state, `Selected transport: ${next.name}.`, "info");
  }
  return state;
}

export function getNpcsAtLocation(state, locationId) {
  return state.npcs.filter((npc) => npc.locationId === locationId);
}

export function interactWithNpc(state, npcId, interactionType = "talk", silent = false) {
  const npc = state.npcs.find((entry) => entry.id === npcId);
  if (!npc) {
    addNotification(state, "NPC unavailable.", "error");
    return state;
  }
  const relationship = state.relationships[npc.id] || { npcId: npc.id, relationshipValue: 0, status: "neutral" };
  const deltaMap = { talk: 2, socialize: 3, help: 4, leave: -1 };
  const delta = deltaMap[interactionType] ?? 1;

  relationship.relationshipValue += delta;
  updateRelationshipStatus(relationship);
  state.relationships[npc.id] = relationship;
  npc.relationshipValue = relationship.relationshipValue;

  state.meta.npcInteractions += 1;
  state.player.energy = clamp(state.player.energy - 3, 0, 100);
  applyExperience(state, 12);
  applyReputation(state, delta > 0 ? 1 : 0);
  maybeTriggerRandomEvent(state, "npc");
  updateQuestProgress(state);
  updateAchievements(state);
  advanceTurns(state, 1);
  if (!silent) {
    addNotification(state, `${npc.name} (${npc.role}) interaction: ${relationship.status}.`, "success");
  }
  return state;
}

export function runBusinessAction(state, businessId) {
  const business = state.businesses.find((entry) => entry.id === businessId);
  if (!business) {
    addNotification(state, "Business not found.", "error");
    return state;
  }

  if (!business.owned) {
    const entryCost = Math.round(business.value * 0.05);
    if (state.player.wallet < entryCost) {
      addNotification(state, `Need $${entryCost} to start operating ${business.name}.`, "error");
      return state;
    }
    applyWalletDelta(state, -entryCost);
    business.owned = true;
    business.reputation += 2;
    addNotification(state, `You secured initial ownership in ${business.name}.`, "success");
  } else {
    applyWalletDelta(state, business.income);
    business.reputation += 1;
    addNotification(state, `${business.name} generated $${business.income} income.`, "success");
  }

  state.meta.businessActions += 1;
  applyExperience(state, 16);
  applyReputation(state, 2);
  updateQuestProgress(state);
  updateAchievements(state);
  return state;
}

export function inspectInventory(state) {
  if (!state.inventory.length) {
    addNotification(state, "Inventory is empty.", "info");
    return state;
  }
  const summary = state.inventory.map((item) => `${item.name} x${item.quantity}`).join(", ");
  addNotification(state, `Inventory: ${summary}`, "info");
  return state;
}

export function inspectStorage(state) {
  const summary = state.storage.join(", ");
  addNotification(state, `Storage: ${summary}`, "info");
  return state;
}

export function returnToCity(state) {
  state.currentScreen = "city";
  state.player.status = "Back on city watch";
  addNotification(state, "Returned to city command.", "info");
  return state;
}

export function getSelectedDistrict(state) {
  return getDistrictById(state, state.selectedDistrictId) || state.districts[0];
}

export function getCurrentLocation(state) {
  const district = getSelectedDistrict(state);
  const locationId = district.locations.includes(state.currentLocationId) ? state.currentLocationId : district.locations[0];
  return getLocationData(locationId) || getLocationData(district.locations[0]);
}
