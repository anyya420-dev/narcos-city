import {
  ACHIEVEMENTS,
  BALANCE,
  BUSINESSES,
  DISTRICTS,
  EVENTS,
  FACTIONS,
  ITEMS,
  LOCATIONS,
  NPCS,
  PROPERTIES,
  QUESTS,
  RELATIONSHIP_STATUSES,
  SAVE_VERSION,
  STARTER_INVENTORY,
  TITLE_RANKS,
  TURNS_PER_DAY,
  VEHICLES
} from "./gameData.mjs";

export const LEVEL_THRESHOLD = BALANCE.xpBasePerLevel;

const ITEM_BY_ID = Object.fromEntries(ITEMS.map((item) => [item.id, item]));
const LOCATION_LIST = Object.values(LOCATIONS);

function clone(value) {
  return structuredClone(value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function epochDay(now = Date.now()) {
  return Math.floor(now / 86400000);
}

function getItemCategory(itemId) {
  return ITEM_BY_ID[itemId]?.category ?? "Miscellaneous";
}

function relationshipStatus(value) {
  return RELATIONSHIP_STATUSES.find((entry) => value >= entry.min && value <= entry.max)?.label ?? "Stranger";
}

function addNotification(state, category, text, type = "info") {
  state.notifications.unshift({
    id: makeId("note"),
    category,
    text,
    type,
    read: false,
    day: state.time.day,
    turn: state.time.turn,
    createdAt: Date.now()
  });
  state.notifications = state.notifications.slice(0, 250);
}

function addTransaction(state, transaction) {
  state.transactions.unshift({
    id: makeId("txn"),
    day: state.time.day,
    turn: state.time.turn,
    timestamp: Date.now(),
    ...transaction
  });
  state.transactions = state.transactions.slice(0, 500);
}

function addWallet(state, amount, source, description, txType = amount >= 0 ? "income" : "expense") {
  if (!Number.isFinite(amount) || amount === 0) return true;
  if (amount < 0 && state.player.money < Math.abs(amount)) return false;
  state.player.money += amount;
  addTransaction(state, {
    type: txType,
    amount,
    source,
    description
  });
  if (amount > 0) state.statistics.moneyEarned += amount;
  if (amount < 0) state.statistics.moneySpent += Math.abs(amount);
  return true;
}

function addXP(state, amount) {
  if (!amount || amount <= 0) return;
  state.player.totalXp += amount;
  state.player.xp += amount;
  while (state.player.xp >= state.player.nextLevelXp) {
    state.player.xp -= state.player.nextLevelXp;
    state.player.level += 1;
    state.player.nextLevelXp = Math.round(BALANCE.xpBasePerLevel + state.player.level * 38);
    state.player.strength += 1;
    state.player.intelligence += 1;
    state.player.charisma += 1;
    state.player.energy = clamp(state.player.energy + 12, 0, 100);
    state.player.health = clamp(state.player.health + 10, 0, 100);
    addNotification(state, "System", `Level up! You reached level ${state.player.level}.`, "success");
  }
  syncTitle(state);
}

function addGeneralReputation(state, category, amount) {
  if (!amount) return;
  state.player.reputation[category] = Math.max(0, state.player.reputation[category] + amount);
  if (category === "faction") {
    for (const factionId of Object.keys(state.player.factionReputation)) {
      state.player.factionReputation[factionId] = Math.max(0, state.player.factionReputation[factionId] + Math.round(amount / 2));
    }
  }
  if (category === "street") {
    state.player.streetReputation = state.player.reputation.street;
  }
  syncTitle(state);
}

function addFactionReputation(state, factionId, amount) {
  if (!factionId || !amount) return;
  if (!(factionId in state.player.factionReputation)) {
    state.player.factionReputation[factionId] = 0;
  }
  state.player.factionReputation[factionId] = Math.max(0, state.player.factionReputation[factionId] + amount);
  addGeneralReputation(state, "faction", Math.max(1, Math.round(amount / 2)));
}

function addInfluence(state, amount) {
  if (!amount) return;
  state.player.influence = Math.max(0, state.player.influence + amount);
  syncTitle(state);
}

function adjustWanted(state, delta) {
  const next = clamp((state.player.wantedLevel || 0) + delta, 0, BALANCE.wanted.maxLevel);
  state.player.wantedLevel = next;
}

function getDistrict(state, districtId) {
  return state.districts.find((entry) => entry.id === districtId);
}

function getLocation(locationId) {
  return LOCATIONS[locationId] || null;
}

function getCurrentVehicle(state) {
  const selected = state.vehicles.find((vehicle) => vehicle.id === state.player.currentVehicleId && vehicle.owned);
  return selected || state.vehicles.find((vehicle) => vehicle.owned) || state.vehicles[0];
}

function ensureRelation(state, npcId) {
  if (!state.relationships[npcId]) {
    state.relationships[npcId] = { npcId, value: 0, status: "Stranger", interactions: 0 };
  }
  return state.relationships[npcId];
}

function markLocationVisited(state, locationId) {
  if (!state.statistics.locationsVisited.includes(locationId)) {
    state.statistics.locationsVisited.push(locationId);
  }
}

function markDistrictVisited(state, districtId) {
  if (!state.statistics.districtsVisited.includes(districtId)) {
    state.statistics.districtsVisited.push(districtId);
  }
}

function hasItem(state, itemId, qty = 1) {
  return (state.inventory[itemId] || 0) >= qty;
}

function addItem(state, itemId, qty = 1) {
  if (!ITEM_BY_ID[itemId]) return;
  state.inventory[itemId] = (state.inventory[itemId] || 0) + qty;
}

function removeItem(state, itemId, qty = 1) {
  if (!hasItem(state, itemId, qty)) return false;
  state.inventory[itemId] -= qty;
  if (state.inventory[itemId] <= 0) delete state.inventory[itemId];
  return true;
}

function inventoryAsArray(state) {
  return Object.entries(state.inventory)
    .map(([id, quantity]) => ({ ...ITEM_BY_ID[id], id, quantity }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

function syncTitle(state) {
  const profile = {
    level: state.player.level,
    xpTotal: state.player.totalXp,
    influence: state.player.influence,
    reputation: state.player.reputation.city + state.player.reputation.business + state.player.reputation.faction,
    streetReputation: state.player.reputation.street
  };
  let chosen = TITLE_RANKS[0];
  for (const rank of TITLE_RANKS) {
    if (
      profile.level >= rank.level ||
      profile.xpTotal >= rank.xpTotal ||
      profile.influence >= rank.influence ||
      profile.reputation >= rank.reputation ||
      profile.streetReputation >= rank.streetReputation
    ) {
      chosen = rank;
    }
  }
  state.player.title = chosen.name;
}

function questById(state, questId) {
  return state.quests.find((entry) => entry.id === questId);
}

function getQuestMetric(state, objective) {
  const target = objective.target;
  switch (objective.type) {
    case "visit-location":
      return state.statistics.locationsVisited.includes(target) ? 1 : 0;
    case "travel-to-district":
      return state.statistics.travelHistory.filter((entry) => entry === target).length;
    case "talk-to-npc":
      if (target === "any") return state.statistics.npcsMet.length;
      return state.statistics.npcInteractionCount[target] || 0;
    case "spend-money":
      return state.statistics.actionCounts[target] || 0;
    case "earn-money":
      return state.statistics.moneyEarned;
    case "reach-reputation":
      return state.player.reputation[target] || 0;
    case "buy-item":
      return state.statistics.itemsBoughtByCategory[target] || 0;
    case "complete-action":
      if (target === "any") return state.statistics.totalActionsCompleted;
      return state.statistics.actionCounts[target] || 0;
    case "own-property":
      return state.player.ownedProperties.length;
    case "own-business":
      return state.player.ownedBusinesses.length;
    case "own-vehicle":
      return state.vehicles.filter((entry) => entry.owned).length;
    case "relationship-status":
      return state.relationships[target]?.value || 0;
    case "relationship-any": {
      const minimum = target === "friend" ? 20 : target === "trusted" ? 45 : target === "close" ? 65 : 85;
      return Object.values(state.relationships).filter((entry) => entry.value >= minimum).length;
    }
    case "business-collect":
      return state.statistics.businessCollectCount;
    case "reach-influence":
      return state.player.influence;
    default:
      return 0;
  }
}

function activateAvailableQuests(state) {
  for (const quest of state.quests) {
    if (quest.status !== "locked") continue;
    const requirements = quest.requirements || {};
    const storyComplete = (requirements.completedQuests || []).every((id) => questById(state, id)?.status === "completed");
    const requiresCharacter = !requirements.hasCreatedCharacter || state.meta.hasCreatedCharacter;
    if (storyComplete && requiresCharacter) {
      quest.status = "active";
      addNotification(state, "Quest", `New quest available: ${quest.title}.`, "info");
    }
  }
}

function applyQuestRewards(state, rewards = {}) {
  if (rewards.cash) addWallet(state, rewards.cash, "quest", "Quest reward", "income");
  if (rewards.xp) addXP(state, rewards.xp);
  if (rewards.cityReputation) addGeneralReputation(state, "city", rewards.cityReputation);
  if (rewards.streetReputation) addGeneralReputation(state, "street", rewards.streetReputation);
  if (rewards.businessReputation) addGeneralReputation(state, "business", rewards.businessReputation);
  if (rewards.factionReputation) addGeneralReputation(state, "faction", rewards.factionReputation);
  if (rewards.influence) addInfluence(state, rewards.influence);
}

function refreshQuests(state) {
  activateAvailableQuests(state);
  for (const quest of state.quests) {
    if (quest.status !== "active") continue;
    let complete = true;
    for (const objective of quest.objectives) {
      objective.progress = Math.min(objective.required, getQuestMetric(state, objective));
      if (objective.progress < objective.required) complete = false;
    }
    if (complete) {
      quest.status = "completed";
      state.player.completedQuests.push(quest.id);
      state.statistics.questsCompleted += 1;
      applyQuestRewards(state, quest.rewards);
      addNotification(state, "Quest", `Quest completed: ${quest.title}.`, "success");
    }
  }
}

function getAchievementMetric(state, requirement) {
  switch (requirement.type) {
    case "districts-visited":
      return state.statistics.districtsVisited.length;
    case "money-earned":
      return state.statistics.moneyEarned;
    case "city-reputation":
      return state.player.reputation.city;
    case "street-reputation":
      return state.player.reputation.street;
    case "business-reputation":
      return state.player.reputation.business;
    case "faction-reputation":
      return state.player.reputation.faction;
    case "npcs-met":
      return state.statistics.npcsMet.length;
    case "trusted-relationships":
      return Object.values(state.relationships).filter((entry) => entry.value >= 45).length;
    case "businesses-owned":
      return state.player.ownedBusinesses.length;
    case "level":
      return state.player.level;
    case "title-rank": {
      const current = TITLE_RANKS.findIndex((rank) => rank.name === state.player.title);
      const required = TITLE_RANKS.findIndex((rank) => rank.id === requirement.target);
      return current >= required ? 1 : 0;
    }
    case "quest-complete":
      return state.player.completedQuests.includes(requirement.target) ? 1 : 0;
    case "inventory-types":
      return Object.keys(state.inventory).length;
    case "vehicles-owned":
      return state.vehicles.filter((entry) => entry.owned).length;
    case "properties-owned":
      return state.player.ownedProperties.length;
    case "casino-plays":
      return state.statistics.casinoPlays;
    case "casino-wins":
      return state.statistics.casinoWins;
    case "days-played":
      return state.time.day;
    default:
      return 0;
  }
}

function refreshAchievements(state) {
  for (const achievement of state.achievements) {
    if (achievement.unlocked) continue;
    const value = getAchievementMetric(state, achievement.requirement);
    achievement.progress = Math.min(achievement.requirement.target ?? 1, value);
    const completed = typeof achievement.requirement.target === "number" ? value >= achievement.requirement.target : value >= 1;
    if (completed) {
      achievement.unlocked = true;
      achievement.unlockedAt = { day: state.time.day, turn: state.time.turn };
      applyQuestRewards(state, achievement.reward || {});
      state.statistics.achievementsUnlocked += 1;
      addNotification(state, "Achievement", `Achievement unlocked: ${achievement.name}.`, "success");
    }
  }
}

function dailyBusinessTick(state, days = 1) {
  if (days <= 0) return;
  for (const business of state.businesses) {
    if (!business.owned) continue;
    state.daily.pendingBusinessIncome[business.id] = (state.daily.pendingBusinessIncome[business.id] || 0) + days;
  }
}

function nextTurn(state, turns = 1) {
  let remaining = Math.max(1, turns);
  while (remaining > 0) {
    state.time.turn += 1;
    if (state.time.turn > state.time.turnsPerDay) {
      state.time.turn = 1;
      state.time.day += 1;
      state.statistics.daysPlayed = state.time.day;
      state.daily.rewardClaimedDay = Math.min(state.daily.rewardClaimedDay, state.time.day - 1);
      dailyBusinessTick(state, 1);
      addNotification(state, "System", `A new day begins in NARCOS CITY (Day ${state.time.day}).`, "info");
    }
    remaining -= 1;
  }
  state.day = state.time.day;
  state.turn = state.time.turn;
}

function eventPoolForReason(state, reason) {
  const district = getSelectedDistrict(state);
  const districtEventIds = district?.randomEvents || [];
  const location = getCurrentLocation(state);
  const locationEventIds = location?.possibleEvents || [];
  const candidateIds = new Set([...districtEventIds, ...locationEventIds]);
  if (reason === "travel") candidateIds.add("event-police-check");
  if (reason === "rest") candidateIds.add("event-friendly-tip");
  if (reason === "action") candidateIds.add("event-business-opportunity");
  const pool = EVENTS.filter((event) => candidateIds.has(event.id));
  return pool.length ? pool : EVENTS;
}

function eventAllowed(state, event) {
  const c = event.conditions || {};
  if (c.minWantedLevel && state.player.wantedLevel < c.minWantedLevel) return false;
  if (c.minStreetReputation && state.player.reputation.street < c.minStreetReputation) return false;
  if (c.minBusinessReputation && state.player.reputation.business < c.minBusinessReputation) return false;
  if (c.minFactionReputation && state.player.reputation.faction < c.minFactionReputation) return false;
  if (c.minCityReputation && state.player.reputation.city < c.minCityReputation) return false;
  return true;
}

function seededRandom(state) {
  state.meta.eventSeed = (state.meta.eventSeed * 1664525 + 1013904223) % 4294967296;
  return state.meta.eventSeed / 4294967296;
}

function triggerEvent(state, reason = "turn") {
  const baseChance = 0.22 + state.player.wantedLevel * 0.04;
  if (seededRandom(state) > baseChance) {
    state.meta.lastEvent = null;
    return null;
  }
  const candidates = eventPoolForReason(state, reason).filter((event) => eventAllowed(state, event));
  if (!candidates.length) {
    state.meta.lastEvent = null;
    return null;
  }
  const event = candidates[Math.floor(seededRandom(state) * candidates.length) % candidates.length];
  state.meta.pendingEvent = { ...clone(event), triggerReason: reason };
  state.meta.lastEvent = { id: event.id, title: event.title, description: event.description, day: state.time.day, turn: state.time.turn };
  addNotification(state, "Event", `Event triggered: ${event.title}.`, "info");
  return event;
}

function applyOutcome(state, outcome = {}) {
  if (outcome.cash) {
    if (!addWallet(state, outcome.cash, "event", "Event outcome", outcome.cash >= 0 ? "income" : "expense")) {
      addNotification(state, "Economy", "Not enough cash for event option, outcome adjusted.", "error");
    }
  }
  if (outcome.energy) state.player.energy = clamp(state.player.energy + outcome.energy, 0, 100);
  if (outcome.health) state.player.health = clamp(state.player.health + outcome.health, 0, 100);
  if (outcome.charisma) state.player.charisma = Math.max(0, state.player.charisma + outcome.charisma);
  if (outcome.intelligence) state.player.intelligence = Math.max(0, state.player.intelligence + outcome.intelligence);
  if (outcome.strength) state.player.strength = Math.max(0, state.player.strength + outcome.strength);
  if (outcome.cityReputation) addGeneralReputation(state, "city", outcome.cityReputation);
  if (outcome.streetReputation) addGeneralReputation(state, "street", outcome.streetReputation);
  if (outcome.businessReputation) addGeneralReputation(state, "business", outcome.businessReputation);
  if (outcome.factionReputation) addGeneralReputation(state, "faction", outcome.factionReputation);
  if (outcome.reputation) addGeneralReputation(state, "city", outcome.reputation);
  if (outcome.influence) addInfluence(state, outcome.influence);
  if (outcome.wanted) adjustWanted(state, outcome.wanted);
  if (outcome.xp) addXP(state, outcome.xp);
  if (outcome.relationship) {
    const npc = getNpcsAtLocation(state, state.player.currentLocation).at(0);
    if (npc) {
      const relation = ensureRelation(state, npc.id);
      relation.value = clamp(relation.value + outcome.relationship, -100, 100);
      relation.status = relationshipStatus(relation.value);
    }
  }
}

function checkRequirements(state, requirements = {}) {
  if (requirements.cityReputation && state.player.reputation.city < requirements.cityReputation) return false;
  if (requirements.streetReputation && state.player.reputation.street < requirements.streetReputation) return false;
  if (requirements.businessReputation && state.player.reputation.business < requirements.businessReputation) return false;
  if (requirements.factionReputation && state.player.reputation.faction < requirements.factionReputation) return false;
  if (requirements.charisma && state.player.charisma < requirements.charisma) return false;
  if (requirements.influence && state.player.influence < requirements.influence) return false;
  if (requirements.item && !hasItem(state, requirements.item, 1)) return false;
  return true;
}

function applyActionRewards(state, reward = {}) {
  if (reward.cash) addWallet(state, reward.cash, "action", "Location action", reward.cash >= 0 ? "income" : "expense");
  if (reward.energy) state.player.energy = clamp(state.player.energy + reward.energy, 0, 100);
  if (reward.health) state.player.health = clamp(state.player.health + reward.health, 0, 100);
  if (reward.charisma) state.player.charisma += reward.charisma;
  if (reward.intelligence) state.player.intelligence += reward.intelligence;
  if (reward.strength) state.player.strength += reward.strength;
  if (reward.cityReputation) addGeneralReputation(state, "city", reward.cityReputation);
  if (reward.streetReputation) addGeneralReputation(state, "street", reward.streetReputation);
  if (reward.businessReputation) addGeneralReputation(state, "business", reward.businessReputation);
  if (reward.factionReputation) addGeneralReputation(state, "faction", reward.factionReputation);
  if (reward.influence) addInfluence(state, reward.influence);
  if (reward.wanted) adjustWanted(state, reward.wanted);
  if (reward.relationship) {
    const npcs = getNpcsAtLocation(state, state.player.currentLocation);
    if (npcs.length) {
      const relation = ensureRelation(state, npcs[0].id);
      relation.value = clamp(relation.value + reward.relationship, -100, 100);
      relation.status = relationshipStatus(relation.value);
    }
  }
}

function evaluatePostAction(state, reason = "action") {
  refreshQuests(state);
  refreshAchievements(state);
  if (state.player.wantedLevel > 0 && seededRandom(state) < state.player.wantedLevel * 0.05) {
    triggerEvent(state, "travel");
  } else {
    triggerEvent(state, reason);
  }
}

function createFactionReputation() {
  return Object.fromEntries(FACTIONS.map((faction) => [faction.id, 0]));
}

function createRelationships() {
  return Object.fromEntries(NPCS.map((npc) => [npc.id, { npcId: npc.id, value: 0, status: "Stranger", interactions: 0 }]));
}

export function createInitialState() {
  const firstDistrict = DISTRICTS[0];
  const firstLocationId = firstDistrict.locations[0];
  const factionRep = createFactionReputation();
  const inventory = Object.fromEntries(STARTER_INVENTORY.map((entry) => [entry.id, entry.quantity]));

  const state = {
    currentScreen: "city",
    selectedDistrictId: firstDistrict.id,
    currentLocationId: firstLocationId,
    day: 1,
    turn: 1,
    player: {
      name: "",
      title: TITLE_RANKS[0].name,
      level: 1,
      xp: 0,
      totalXp: 0,
      nextLevelXp: BALANCE.xpBasePerLevel,
      money: 1000,
      bankBalance: 0,
      health: 100,
      energy: 100,
      reputation: {
        city: 0,
        street: 0,
        business: 0,
        faction: 0
      },
      influence: 0,
      strength: 10,
      intelligence: 10,
      charisma: 10,
      streetReputation: 0,
      wantedLevel: 0,
      currentDistrict: firstDistrict.id,
      currentLocation: firstLocationId,
      currentVehicleId: VEHICLES.find((entry) => entry.owned)?.id || VEHICLES[0].id,
      factionReputation: factionRep,
      relationships: [],
      ownedProperties: [],
      ownedBusinesses: [],
      inventory: inventory,
      achievements: [],
      quests: [],
      statistics: {}
    },
    time: {
      day: 1,
      turn: 1,
      turnsPerDay: TURNS_PER_DAY,
      lastLoginDay: epochDay()
    },
    districts: clone(DISTRICTS),
    inventory,
    marketCatalog: clone(ITEMS),
    vehicles: clone(VEHICLES),
    properties: clone(PROPERTIES),
    businesses: clone(BUSINESSES),
    factions: clone(FACTIONS),
    npcs: clone(NPCS),
    relationships: createRelationships(),
    quests: clone(QUESTS).map((quest) => ({
      ...quest,
      status: quest.status || "locked",
      objectives: quest.objectives.map((objective) => ({ ...objective, progress: 0 }))
    })),
    achievements: clone(ACHIEVEMENTS).map((achievement) => ({ ...achievement, unlocked: false, progress: 0, unlockedAt: null })),
    notifications: [],
    transactions: [],
    statistics: {
      districtsVisited: [firstDistrict.id],
      locationsVisited: [firstLocationId],
      travelHistory: [firstDistrict.id],
      moneyEarned: 0,
      moneySpent: 0,
      questsCompleted: 0,
      npcsMet: [],
      npcInteractionCount: {},
      relationshipsImproved: 0,
      businessesOwned: 0,
      propertiesOwned: 0,
      vehiclesOwned: 1,
      casinoWins: 0,
      casinoLosses: 0,
      casinoPlays: 0,
      travelCount: 0,
      daysPlayed: 1,
      achievementsUnlocked: 0,
      totalActionsCompleted: 0,
      actionCounts: {},
      itemsBoughtByCategory: {},
      businessCollectCount: 0
    },
    daily: {
      rewardClaimedDay: 0,
      pendingBusinessIncome: {},
      casinoBetByDay: {},
      dailyQuestRefreshDay: 1
    },
    meta: {
      hasCreatedCharacter: false,
      eventSeed: 123456789,
      saveVersion: SAVE_VERSION,
      lastEvent: null,
      pendingEvent: null,
      debugMode: false
    }
  };

  addNotification(state, "System", "Welcome to NARCOS CITY. Create your character to begin.");
  refreshQuests(state);
  return state;
}

function migrateState(rawState) {
  const base = createInitialState();
  if (!rawState || typeof rawState !== "object") return base;

  const merged = {
    ...base,
    ...rawState,
    player: {
      ...base.player,
      ...rawState.player,
      reputation: { ...base.player.reputation, ...(rawState.player?.reputation || {}) },
      factionReputation: { ...base.player.factionReputation, ...(rawState.player?.factionReputation || {}) }
    },
    time: { ...base.time, ...rawState.time },
    daily: { ...base.daily, ...rawState.daily },
    meta: { ...base.meta, ...rawState.meta },
    statistics: { ...base.statistics, ...rawState.statistics }
  };

  merged.districts = Array.isArray(rawState.districts) ? rawState.districts : clone(DISTRICTS);
  merged.marketCatalog = Array.isArray(rawState.marketCatalog) ? rawState.marketCatalog : clone(ITEMS);
  merged.vehicles = Array.isArray(rawState.vehicles) ? rawState.vehicles : clone(VEHICLES);
  merged.properties = Array.isArray(rawState.properties) ? rawState.properties : clone(PROPERTIES);
  merged.businesses = Array.isArray(rawState.businesses) ? rawState.businesses : clone(BUSINESSES);
  merged.factions = Array.isArray(rawState.factions) ? rawState.factions : clone(FACTIONS);
  merged.npcs = Array.isArray(rawState.npcs) ? rawState.npcs : clone(NPCS);
  merged.relationships = rawState.relationships && typeof rawState.relationships === "object" ? rawState.relationships : createRelationships();
  merged.quests = Array.isArray(rawState.quests)
    ? rawState.quests.map((quest) => ({ ...quest, objectives: (quest.objectives || []).map((obj) => ({ ...obj, progress: obj.progress || 0 })) }))
    : clone(base.quests);
  merged.achievements = Array.isArray(rawState.achievements)
    ? rawState.achievements.map((achievement) => ({ ...achievement, unlocked: Boolean(achievement.unlocked), progress: achievement.progress || 0 }))
    : clone(base.achievements);
  merged.notifications = Array.isArray(rawState.notifications) ? rawState.notifications.slice(0, 250) : clone(base.notifications);
  merged.transactions = Array.isArray(rawState.transactions) ? rawState.transactions.slice(0, 500) : [];

  if (!merged.inventory || Array.isArray(merged.inventory)) {
    merged.inventory = { ...base.inventory };
    if (Array.isArray(rawState.inventory)) {
      for (const item of rawState.inventory) {
        if (item?.id) merged.inventory[item.id] = item.quantity || 1;
      }
    }
  }

  if (!getDistrict(merged, merged.selectedDistrictId)) {
    merged.selectedDistrictId = DISTRICTS[0].id;
  }
  const district = getDistrict(merged, merged.selectedDistrictId);
  if (!district.locations.includes(merged.currentLocationId)) {
    merged.currentLocationId = district.locations[0];
  }

  merged.player.currentDistrict = merged.selectedDistrictId;
  merged.player.currentLocation = merged.currentLocationId;
  merged.player.currentVehicleId = merged.player.currentVehicleId || getCurrentVehicle(merged).id;
  merged.player.money = Math.max(0, merged.player.money || merged.player.wallet || 0);
  merged.player.bankBalance = Math.max(0, merged.player.bankBalance || 0);
  merged.player.reputation.street = merged.player.reputation.street || merged.player.streetReputation || 0;
  merged.player.streetReputation = merged.player.reputation.street;
  merged.player.wantedLevel = clamp(merged.player.wantedLevel || merged.meta.wantedLevel || 0, 0, BALANCE.wanted.maxLevel);
  merged.meta.saveVersion = SAVE_VERSION;

  const nowDay = epochDay();
  const elapsedDays = Math.max(0, nowDay - (merged.time.lastLoginDay || nowDay));
  if (elapsedDays > 0) {
    merged.time.day += elapsedDays;
    merged.day = merged.time.day;
    merged.statistics.daysPlayed = merged.time.day;
    dailyBusinessTick(merged, elapsedDays);
    addNotification(merged, "System", `${elapsedDays} in-game day(s) advanced while away.`, "info");
  }
  merged.time.lastLoginDay = nowDay;

  refreshQuests(merged);
  refreshAchievements(merged);
  return merged;
}

export function normalizeState(rawState) {
  return migrateState(rawState);
}

export function createPlayer(state, name) {
  const clean = String(name || "").trim();
  if (!clean) {
    addNotification(state, "System", "Enter a valid character name.", "error");
    return state;
  }
  state.player.name = clean.slice(0, 24);
  state.meta.hasCreatedCharacter = true;
  state.player.currentDistrict = state.selectedDistrictId;
  state.player.currentLocation = state.currentLocationId;
  addNotification(state, "System", `Welcome, ${state.player.name}. The city now knows your name.`, "success");
  refreshQuests(state);
  refreshAchievements(state);
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

export function getSelectedDistrict(state) {
  return getDistrict(state, state.selectedDistrictId) || state.districts[0];
}

export function getCurrentLocation(state) {
  return getLocation(state.currentLocationId) || getLocation(getSelectedDistrict(state).locations[0]);
}

export function getNpcsAtLocation(state, locationId) {
  return state.npcs.filter((npc) => npc.location === locationId);
}

export function travelToDistrict(state, districtId) {
  const district = getDistrict(state, districtId);
  if (!district) {
    addNotification(state, "System", "District not found.", "error");
    return state;
  }
  if (state.player.reputation.city < district.reputationRequirement) {
    addNotification(state, "City", `Need city reputation ${district.reputationRequirement} to enter ${district.name}.`, "error");
    return state;
  }

  const vehicle = getCurrentVehicle(state);
  const metroDiscount = hasItem(state, "metro-pass") ? ITEM_BY_ID["metro-pass"].effect.travelDiscount : 0;
  const travelCost = Math.max(BALANCE.travel.minCost, district.travelCost + vehicle.travelCost - 80 - metroDiscount);
  if (!addWallet(state, -travelCost, "travel", `Travel to ${district.name}`, "expense")) {
    addNotification(state, "Economy", "Insufficient money for travel.", "error");
    return state;
  }
  if (state.player.energy < BALANCE.energy.travelCost) {
    addWallet(state, travelCost, "travel", "Travel refund", "income");
    addNotification(state, "System", "Insufficient energy to travel.", "error");
    return state;
  }

  state.player.energy = clamp(state.player.energy - BALANCE.energy.travelCost, 0, 100);
  state.selectedDistrictId = district.id;
  state.currentLocationId = district.locations[0];
  state.player.currentDistrict = district.id;
  state.player.currentLocation = state.currentLocationId;

  markDistrictVisited(state, district.id);
  markLocationVisited(state, state.currentLocationId);
  state.statistics.travelHistory.push(district.id);
  state.statistics.travelCount += 1;
  state.statistics.actionCounts["travel"] = (state.statistics.actionCounts["travel"] || 0) + 1;
  state.statistics.totalActionsCompleted += 1;

  const turnCost = Math.max(1, Math.round(district.travelTime + vehicle.travelTimeModifier));
  nextTurn(state, turnCost);
  addXP(state, 14 + district.dangerLevel * 2);
  addGeneralReputation(state, "street", 1);

  if (seededRandom(state) < BALANCE.travel.policeRiskBaseChance + state.player.wantedLevel * BALANCE.travel.wantedRiskPerLevel) {
    adjustWanted(state, 1);
    addNotification(state, "Police", "Travel risk increased your wanted level.", "error");
  }

  evaluatePostAction(state, "travel");
  addNotification(state, "System", `Traveled to ${district.name} for $${travelCost}.`, "success");
  return state;
}

export function moveToLocation(state, districtId, locationId) {
  const district = getDistrict(state, districtId);
  const location = getLocation(locationId);
  if (!district || !location || !district.locations.includes(locationId)) {
    addNotification(state, "System", "Location unavailable in district.", "error");
    return state;
  }
  if (!checkRequirements(state, location.requirements)) {
    addNotification(state, "System", `Requirements not met for ${location.name}.`, "error");
    return state;
  }
  if (state.player.energy < BALANCE.energy.moveCost) {
    addNotification(state, "System", "Insufficient energy.", "error");
    return state;
  }

  state.player.energy = clamp(state.player.energy - BALANCE.energy.moveCost, 0, 100);
  state.selectedDistrictId = districtId;
  state.currentLocationId = locationId;
  state.player.currentDistrict = districtId;
  state.player.currentLocation = locationId;
  markDistrictVisited(state, districtId);
  markLocationVisited(state, locationId);
  state.statistics.totalActionsCompleted += 1;
  state.statistics.actionCounts["move-location"] = (state.statistics.actionCounts["move-location"] || 0) + 1;

  nextTurn(state, 1);
  addXP(state, 8);
  evaluatePostAction(state, "location");
  addNotification(state, "System", `Entered ${location.name}.`, "info");
  return state;
}

export function performLocationAction(state, districtId, locationId, actionId) {
  const district = getDistrict(state, districtId);
  const location = getLocation(locationId);
  const action = location?.actions.find((entry) => entry.id === actionId);
  if (!district || !location || !action || !district.locations.includes(locationId)) {
    addNotification(state, "System", "Action unavailable.", "error");
    return state;
  }
  if (!checkRequirements(state, location.requirements)) {
    addNotification(state, "System", `Requirements not met for ${location.name}.`, "error");
    return state;
  }
  if (state.player.energy < (action.energyCost || 0)) {
    addNotification(state, "System", "Insufficient energy.", "error");
    return state;
  }
  if (action.cost && !addWallet(state, -Math.abs(action.cost), "action", `${action.name} at ${location.name}`, "expense")) {
    addNotification(state, "Economy", "Insufficient money for action.", "error");
    return state;
  }

  state.player.energy = clamp(state.player.energy - (action.energyCost || 0), 0, 100);

  switch (action.type) {
    case "bank-deposit":
      bankDeposit(state, action.amount || 200, true);
      break;
    case "bank-withdraw":
      bankWithdraw(state, action.amount || 200, true);
      break;
    case "market-buy":
      buyMarketItem(state, action.itemId, action.cost ?? ITEM_BY_ID[action.itemId]?.price ?? 0, true);
      break;
    case "market-sell":
      sellMarketItem(state, action.itemId, action.value ?? ITEM_BY_ID[action.itemId]?.price ?? 0, true);
      break;
    case "reduce-wanted":
      coolDistrictHeat(state, districtId);
      break;
    case "rest":
      state.player.energy = clamp(state.player.energy + (action.reward?.energy || BALANCE.energy.restRecover), 0, 100);
      state.player.health = clamp(state.player.health + (action.reward?.health || BALANCE.health.restRecover), 0, 100);
      break;
    case "casino-coin":
      casinoPlay(state, "coinFlip", 100);
      break;
    case "casino-high-low":
      casinoPlay(state, "highLow", 150);
      break;
    case "casino-dice":
      casinoPlay(state, "simpleDice", 200);
      break;
    case "risky":
      adjustWanted(state, action.reward?.wanted || BALANCE.wanted.riskyActionGain);
      applyActionRewards(state, action.reward);
      break;
    default:
      applyActionRewards(state, action.reward);
  }

  addXP(state, action.xpGain || 0);
  state.statistics.actionCounts[action.id] = (state.statistics.actionCounts[action.id] || 0) + 1;
  state.statistics.totalActionsCompleted += 1;
  if (action.type === "business-action") state.statistics.actionCounts["business-action"] = (state.statistics.actionCounts["business-action"] || 0) + 1;

  nextTurn(state, 1);
  evaluatePostAction(state, "action");
  addNotification(state, "System", `${action.name} completed.`, "success");
  return state;
}

export function chooseEventChoice(state, choiceId) {
  const event = state.meta.pendingEvent;
  if (!event) {
    addNotification(state, "Event", "No active event choice.", "error");
    return state;
  }
  const choice = event.choices.find((entry) => entry.id === choiceId);
  if (!choice) {
    addNotification(state, "Event", "Invalid event choice.", "error");
    return state;
  }
  applyOutcome(state, choice.outcome);
  state.meta.pendingEvent = null;
  state.meta.lastEvent = { id: event.id, title: event.title, description: `${event.description} (${choice.label})`, day: state.time.day, turn: state.time.turn };
  refreshQuests(state);
  refreshAchievements(state);
  addNotification(state, "Event", `You chose: ${choice.label}.`, "success");
  return state;
}

export function interactWithNpc(state, npcId, interactionType = "talk", silent = false) {
  const npc = state.npcs.find((entry) => entry.id === npcId);
  if (!npc) {
    addNotification(state, "Social", "NPC unavailable.", "error");
    return state;
  }

  const energyCostMap = {
    talk: 2,
    socialize: BALANCE.energy.socialCost,
    help: 5,
    "give-gift": 2,
    "work-together": BALANCE.energy.workCost,
    "complete-quest": 4,
    leave: 0
  };
  const deltaMap = {
    talk: 4,
    socialize: 6,
    help: 8,
    "give-gift": 10,
    "work-together": 7,
    "complete-quest": 9,
    leave: -3
  };

  const energyCost = energyCostMap[interactionType] ?? 3;
  if (state.player.energy < energyCost) {
    addNotification(state, "Social", "Not enough energy to interact.", "error");
    return state;
  }

  if (interactionType === "give-gift") {
    if (!removeItem(state, "gift-box", 1)) {
      addNotification(state, "Social", "You need a Gift Box to give.", "error");
      return state;
    }
  }

  const relation = ensureRelation(state, npcId);
  relation.value = clamp(relation.value + (deltaMap[interactionType] ?? 3), -100, 100);
  relation.status = relationshipStatus(relation.value);
  relation.interactions += 1;
  npc.relationship = relation.value;

  state.player.energy = clamp(state.player.energy - energyCost, 0, 100);
  addXP(state, 10 + Math.max(0, Math.round((deltaMap[interactionType] ?? 0) / 2)));
  if (interactionType === "help") addGeneralReputation(state, "city", BALANCE.reputation.cityHelp);
  if (["work-together", "complete-quest"].includes(interactionType)) addGeneralReputation(state, "faction", BALANCE.reputation.factionAction);
  if (["socialize", "give-gift"].includes(interactionType)) state.player.charisma += 1;
  if (interactionType === "talk") addGeneralReputation(state, "street", 1);

  if (!state.statistics.npcsMet.includes(npcId)) state.statistics.npcsMet.push(npcId);
  state.statistics.npcInteractionCount[npcId] = (state.statistics.npcInteractionCount[npcId] || 0) + 1;
  state.statistics.relationshipsImproved += deltaMap[interactionType] > 0 ? 1 : 0;
  state.statistics.totalActionsCompleted += 1;
  state.statistics.actionCounts[interactionType] = (state.statistics.actionCounts[interactionType] || 0) + 1;

  addFactionReputation(state, npc.faction, 1);

  nextTurn(state, 1);
  evaluatePostAction(state, "npc");
  if (!silent) {
    addNotification(state, "Social", `${npc.name}: ${relation.status} (${relation.value}).`, "success");
  }
  return state;
}

export function safehouseRest(state, silent = false) {
  state.player.energy = clamp(state.player.energy + BALANCE.energy.restRecover, 0, 100);
  state.player.health = clamp(state.player.health + BALANCE.health.restRecover, 0, 100);
  state.player.currentLocation = "safehouse";
  state.currentLocationId = "safehouse";
  state.selectedDistrictId = "old-town";
  state.player.currentDistrict = "old-town";
  nextTurn(state, 1);
  addXP(state, 8);
  evaluatePostAction(state, "rest");
  if (!silent) addNotification(state, "System", "Recovered at safehouse.", "success");
  return state;
}

export function safehouseRecoverEnergy(state, silent = false) {
  state.player.energy = clamp(state.player.energy + BALANCE.energy.recoverEnergy, 0, 100);
  nextTurn(state, 1);
  addXP(state, 4);
  evaluatePostAction(state, "rest");
  if (!silent) addNotification(state, "System", "Energy recovered.", "success");
  return state;
}

export function upgradeSafehouse(state) {
  const property = state.properties.find((entry) => entry.id === "safehouse-harbor") || state.properties[0];
  const cost = 2200 + state.player.level * 180;
  if (!addWallet(state, -cost, "property", "Safehouse upgrade", "expense")) {
    addNotification(state, "Economy", `Need $${cost} for safehouse upgrade.`, "error");
    return state;
  }
  state.player.energy = clamp(state.player.energy + BALANCE.energy.locationRestBonus, 0, 100);
  state.player.health = clamp(state.player.health + 12, 0, 100);
  addGeneralReputation(state, "city", 1);
  property.comfort += 1;
  property.security += 1;
  addXP(state, 18);
  state.statistics.actionCounts["safehouse-upgrade"] = (state.statistics.actionCounts["safehouse-upgrade"] || 0) + 1;
  evaluatePostAction(state, "action");
  addNotification(state, "System", "Safehouse upgraded.", "success");
  return state;
}

export function coolDistrictHeat(state, districtId) {
  const district = getDistrict(state, districtId);
  if (!district) {
    addNotification(state, "System", "District not found.", "error");
    return state;
  }
  const cost = BALANCE.wanted.cooldownActionCost;
  if (!addWallet(state, -cost, "wanted", `Heat cooldown in ${district.name}`, "expense")) {
    addNotification(state, "Economy", "Insufficient money to reduce wanted level.", "error");
    return state;
  }
  adjustWanted(state, -BALANCE.wanted.cooldownReduction);
  addGeneralReputation(state, "city", 1);
  nextTurn(state, 1);
  state.statistics.actionCounts["wanted-cooldown"] = (state.statistics.actionCounts["wanted-cooldown"] || 0) + 1;
  evaluatePostAction(state, "action");
  addNotification(state, "Police", `Wanted level reduced in ${district.name}.`, "success");
  return state;
}

export function bankDeposit(state, amount = 200, silent = false) {
  const value = Math.max(BALANCE.bank.depositMinimum, Math.round(Number(amount) || 0));
  if (!addWallet(state, -value, "bank", "Bank deposit", "expense")) {
    addNotification(state, "Economy", "Insufficient funds for deposit.", "error");
    return state;
  }
  state.player.bankBalance += value;
  addXP(state, 8);
  addGeneralReputation(state, "city", 1);
  state.statistics.actionCounts["bank-deposit"] = (state.statistics.actionCounts["bank-deposit"] || 0) + 1;
  state.statistics.totalActionsCompleted += 1;
  if (!silent) addNotification(state, "Economy", `Deposited $${value}.`, "success");
  refreshQuests(state);
  refreshAchievements(state);
  return state;
}

export function bankWithdraw(state, amount = 200, silent = false) {
  const value = Math.max(BALANCE.bank.withdrawMinimum, Math.round(Number(amount) || 0));
  if (state.player.bankBalance < value) {
    addNotification(state, "Economy", "Insufficient bank balance.", "error");
    return state;
  }
  state.player.bankBalance -= value;
  addWallet(state, value, "bank", "Bank withdrawal", "income");
  addXP(state, 6);
  state.statistics.actionCounts["bank-withdraw"] = (state.statistics.actionCounts["bank-withdraw"] || 0) + 1;
  state.statistics.totalActionsCompleted += 1;
  if (!silent) addNotification(state, "Economy", `Withdrew $${value}.`, "success");
  refreshQuests(state);
  refreshAchievements(state);
  return state;
}

export function buyMarketItem(state, itemId, price, silent = false) {
  const item = ITEM_BY_ID[itemId];
  if (!item) {
    addNotification(state, "Economy", "Item unavailable.", "error");
    return state;
  }
  const cost = Math.max(1, Math.round(price || item.price || 0));
  if (!addWallet(state, -cost, "market", `Buy ${item.name}`, "expense")) {
    addNotification(state, "Economy", "Insufficient money.", "error");
    return state;
  }
  addItem(state, itemId, 1);
  const category = getItemCategory(itemId);
  state.statistics.itemsBoughtByCategory[category] = (state.statistics.itemsBoughtByCategory[category] || 0) + 1;
  addXP(state, 6);
  state.statistics.totalActionsCompleted += 1;
  state.statistics.actionCounts["buy-item"] = (state.statistics.actionCounts["buy-item"] || 0) + 1;
  refreshQuests(state);
  refreshAchievements(state);
  if (!silent) addNotification(state, "Economy", `Purchased ${item.name}.`, "success");
  return state;
}

export function sellMarketItem(state, itemId, value, silent = false) {
  const item = ITEM_BY_ID[itemId];
  if (!item || !removeItem(state, itemId, 1)) {
    addNotification(state, "Economy", "Item not available to sell.", "error");
    return state;
  }
  const price = Math.max(1, Math.round(value || Math.floor(item.price * 0.7) || 0));
  addWallet(state, price, "market", `Sell ${item.name}`, "income");
  addXP(state, 5);
  state.statistics.totalActionsCompleted += 1;
  state.statistics.actionCounts["sell-item"] = (state.statistics.actionCounts["sell-item"] || 0) + 1;
  refreshQuests(state);
  refreshAchievements(state);
  if (!silent) addNotification(state, "Economy", `Sold ${item.name}.`, "success");
  return state;
}

export function useInventoryItem(state, itemId) {
  const item = ITEM_BY_ID[itemId];
  if (!item || !hasItem(state, itemId, 1)) {
    addNotification(state, "Inventory", "Item not found.", "error");
    return state;
  }
  if (!item.usable) {
    addNotification(state, "Inventory", `${item.name} is not usable.`, "info");
    return state;
  }

  removeItem(state, itemId, 1);
  const effect = item.effect || {};
  if (effect.energy) state.player.energy = clamp(state.player.energy + effect.energy, 0, 100);
  if (effect.health) state.player.health = clamp(state.player.health + effect.health, 0, 100);
  if (effect.charisma) state.player.charisma += effect.charisma;
  if (effect.cityReputation) addGeneralReputation(state, "city", effect.cityReputation);
  if (effect.streetReputation) addGeneralReputation(state, "street", effect.streetReputation);
  if (effect.reputation) addGeneralReputation(state, "city", effect.reputation);
  if (effect.relationship) {
    const npcs = getNpcsAtLocation(state, state.currentLocationId);
    if (npcs.length) {
      const relation = ensureRelation(state, npcs[0].id);
      relation.value = clamp(relation.value + effect.relationship, -100, 100);
      relation.status = relationshipStatus(relation.value);
    }
  }

  addXP(state, 4);
  state.statistics.actionCounts["use-item"] = (state.statistics.actionCounts["use-item"] || 0) + 1;
  state.statistics.totalActionsCompleted += 1;
  refreshQuests(state);
  refreshAchievements(state);
  addNotification(state, "Inventory", `${item.name} used.`, "success");
  return state;
}

export function buyVehicle(state, vehicleId) {
  const vehicle = state.vehicles.find((entry) => entry.id === vehicleId);
  if (!vehicle) {
    addNotification(state, "Transport", "Vehicle not found.", "error");
    return state;
  }
  if (vehicle.owned) {
    addNotification(state, "Transport", `${vehicle.name} already owned.`, "info");
    return state;
  }
  if (!addWallet(state, -vehicle.price, "vehicle", `Purchase ${vehicle.name}`, "expense")) {
    addNotification(state, "Economy", "Insufficient funds.", "error");
    return state;
  }
  vehicle.owned = true;
  state.player.currentVehicleId = vehicle.id;
  state.statistics.vehiclesOwned = state.vehicles.filter((entry) => entry.owned).length;
  addGeneralReputation(state, "city", 1);
  addXP(state, 18);
  state.statistics.totalActionsCompleted += 1;
  state.statistics.actionCounts["buy-vehicle"] = (state.statistics.actionCounts["buy-vehicle"] || 0) + 1;
  refreshQuests(state);
  refreshAchievements(state);
  addNotification(state, "Transport", `Purchased ${vehicle.name}.`, "success");
  return state;
}

export function cycleVehicle(state, silent = false) {
  const owned = state.vehicles.filter((entry) => entry.owned);
  if (!owned.length) return state;
  const currentIndex = owned.findIndex((entry) => entry.id === state.player.currentVehicleId);
  const next = owned[(currentIndex + 1 + owned.length) % owned.length];
  state.player.currentVehicleId = next.id;
  if (!silent) addNotification(state, "Transport", `Selected ${next.name}.`, "info");
  return state;
}

export function buyProperty(state, propertyId) {
  const property = state.properties.find((entry) => entry.id === propertyId);
  if (!property) {
    addNotification(state, "Property", "Property not found.", "error");
    return state;
  }
  if (property.owned) {
    addNotification(state, "Property", `${property.name} already owned.`, "info");
    return state;
  }
  if (!addWallet(state, -property.price, "property", `Purchase ${property.name}`, "expense")) {
    addNotification(state, "Economy", "Insufficient funds for property.", "error");
    return state;
  }

  property.owned = true;
  state.player.ownedProperties.push(property.id);
  state.statistics.propertiesOwned = state.player.ownedProperties.length;
  addInfluence(state, property.prestige);
  addGeneralReputation(state, "city", Math.max(1, Math.floor(property.prestige / 2)));
  addXP(state, 18);
  refreshQuests(state);
  refreshAchievements(state);
  addNotification(state, "Property", `Purchased ${property.name}.`, "success");
  return state;
}

function collectBusinessIncome(state, business) {
  const pendingDays = state.daily.pendingBusinessIncome[business.id] || 0;
  if (pendingDays <= 0) {
    addNotification(state, "Business", `${business.name} has no new income yet.`, "info");
    return state;
  }
  const gross = pendingDays * (business.income + business.level * 120);
  const expenses = pendingDays * (business.expenses + business.level * 60);
  const net = Math.max(0, gross - expenses);
  addWallet(state, net, "business", `${business.name} daily income (${pendingDays}d)`, "income");
  addWallet(state, -expenses, "business", `${business.name} operating expenses (${pendingDays}d)`, "expense");
  state.daily.pendingBusinessIncome[business.id] = 0;
  business.lastCollectedDay = state.time.day;
  state.statistics.businessCollectCount += 1;
  addGeneralReputation(state, "business", 1 + Math.floor(business.level / 2));
  addInfluence(state, 1);
  addXP(state, 14);
  addNotification(state, "Business", `${business.name} settled net $${net} after expenses.`, "success");
  return state;
}

export function runBusinessAction(state, businessId, mode = "auto") {
  const business = state.businesses.find((entry) => entry.id === businessId);
  if (!business) {
    addNotification(state, "Business", "Business not found.", "error");
    return state;
  }

  if (!business.owned) {
    if (!addWallet(state, -business.purchasePrice, "business", `Purchase ${business.name}`, "expense")) {
      addNotification(state, "Economy", "Insufficient funds to purchase business.", "error");
      return state;
    }
    business.owned = true;
    state.player.ownedBusinesses.push(business.id);
    state.statistics.businessesOwned = state.player.ownedBusinesses.length;
    state.daily.pendingBusinessIncome[business.id] = 1;
    addGeneralReputation(state, "business", 3);
    addInfluence(state, 2);
    addXP(state, 24);
    addNotification(state, "Business", `You acquired ${business.name}.`, "success");
  } else if (mode === "upgrade") {
    const upgradeCost = Math.round(business.purchasePrice * 0.18 + business.level * 900);
    if (!addWallet(state, -upgradeCost, "business", `${business.name} upgrade`, "expense")) {
      addNotification(state, "Economy", "Insufficient funds for upgrade.", "error");
      return state;
    }
    business.level += 1;
    business.income += 220;
    business.expenses += 90;
    business.reputation += 3;
    addGeneralReputation(state, "business", 2);
    addInfluence(state, 1);
    addXP(state, 22);
    addNotification(state, "Business", `${business.name} upgraded to level ${business.level}.`, "success");
  } else {
    collectBusinessIncome(state, business);
  }

  state.statistics.totalActionsCompleted += 1;
  state.statistics.actionCounts["business-action"] = (state.statistics.actionCounts["business-action"] || 0) + 1;
  refreshQuests(state);
  refreshAchievements(state);
  return state;
}

export function runFactionAction(state, factionId) {
  const faction = state.factions.find((entry) => entry.id === factionId);
  if (!faction) {
    addNotification(state, "Faction", "Faction unavailable.", "error");
    return state;
  }
  if (state.player.energy < 6) {
    addNotification(state, "Faction", "Insufficient energy for faction activity.", "error");
    return state;
  }
  state.player.energy = clamp(state.player.energy - 6, 0, 100);
  addFactionReputation(state, factionId, 2);
  faction.reputation += 2;
  addGeneralReputation(state, "faction", BALANCE.reputation.factionAction);
  addInfluence(state, 1);
  addXP(state, 16);
  state.statistics.totalActionsCompleted += 1;
  state.statistics.actionCounts["faction-action"] = (state.statistics.actionCounts["faction-action"] || 0) + 1;
  nextTurn(state, 1);
  evaluatePostAction(state, "action");
  addNotification(state, "Faction", `You improved standing with ${faction.name}.`, "success");
  return state;
}

function casinoBetLimitUsed(state) {
  const key = String(state.time.day);
  return state.daily.casinoBetByDay[key] || 0;
}

function increaseCasinoBetUsed(state, amount) {
  const key = String(state.time.day);
  state.daily.casinoBetByDay[key] = (state.daily.casinoBetByDay[key] || 0) + amount;
}

export function casinoPlay(state, game = "coinFlip", desiredBet = 100) {
  const maxRemaining = BALANCE.casino.dailyBetLimit - casinoBetLimitUsed(state);
  if (maxRemaining < BALANCE.casino.minBet) {
    addNotification(state, "Economy", "Daily casino limit reached.", "error");
    return state;
  }
  const bet = clamp(Math.round(desiredBet || BALANCE.casino.minBet), BALANCE.casino.minBet, Math.min(BALANCE.casino.maxBet, maxRemaining));
  if (!addWallet(state, -bet, "casino", `${game} bet`, "expense")) {
    addNotification(state, "Economy", "Insufficient cash for bet.", "error");
    return state;
  }
  increaseCasinoBetUsed(state, bet);

  const chance = game === "simpleDice" ? 0.4 : game === "highLow" ? 0.45 : 0.5;
  const win = seededRandom(state) <= chance;
  const multiplier = BALANCE.casino.payoutMultiplier[game] || 1;
  if (win) {
    const payout = Math.round(bet * (1 + multiplier));
    addWallet(state, payout, "casino", `${game} payout`, "income");
    state.statistics.casinoWins += 1;
    addGeneralReputation(state, "city", 1);
    addNotification(state, "Economy", `${game} win: +$${payout - bet}.`, "success");
  } else {
    state.statistics.casinoLosses += 1;
    addNotification(state, "Economy", `${game} loss: -$${bet}.`, "error");
  }

  state.statistics.casinoPlays += 1;
  state.statistics.totalActionsCompleted += 1;
  state.statistics.actionCounts["casino-play"] = (state.statistics.actionCounts["casino-play"] || 0) + 1;
  addXP(state, 8);
  nextTurn(state, 1);
  refreshQuests(state);
  refreshAchievements(state);
  return state;
}

export function claimDailyReward(state) {
  if (state.daily.rewardClaimedDay >= state.time.day) {
    addNotification(state, "System", "Daily reward already claimed today.", "info");
    return state;
  }
  state.daily.rewardClaimedDay = state.time.day;
  addWallet(state, BALANCE.rewards.dailyReward, "daily", "Daily reward", "income");
  addXP(state, 14);
  addGeneralReputation(state, "city", 1);
  refreshQuests(state);
  refreshAchievements(state);
  addNotification(state, "System", `Daily reward claimed: $${BALANCE.rewards.dailyReward}.`, "success");
  return state;
}

export function markNotificationRead(state, notificationId) {
  const note = state.notifications.find((entry) => entry.id === notificationId);
  if (note) note.read = true;
  return state;
}

export function markAllNotificationsRead(state) {
  for (const note of state.notifications) note.read = true;
  return state;
}

export function inspectInventory(state) {
  const items = inventoryAsArray(state);
  if (!items.length) {
    addNotification(state, "Inventory", "Inventory empty.", "info");
    return state;
  }
  const summary = items.map((entry) => `${entry.name} x${entry.quantity}`).join(", ");
  addNotification(state, "Inventory", summary, "info");
  return state;
}

export function inspectStorage(state) {
  const properties = state.properties.filter((entry) => entry.owned);
  const summary = properties.length
    ? properties.map((entry) => `${entry.name} (Storage ${entry.storage})`).join(", ")
    : "No owned property storage yet.";
  addNotification(state, "System", summary, "info");
  return state;
}

export function returnToCity(state) {
  state.currentScreen = "city";
  addNotification(state, "System", "Returned to city overview.", "info");
  return state;
}

export function toggleDebugMode(state, enable = false) {
  state.meta.debugMode = Boolean(enable);
  return state;
}

export function debugAddMoney(state, amount = 1000) {
  if (!state.meta.debugMode) return state;
  addWallet(state, Math.max(0, Number(amount) || 0), "debug", "Debug money", "income");
  return state;
}

export function debugAddXp(state, amount = 100) {
  if (!state.meta.debugMode) return state;
  addXP(state, Math.max(0, Number(amount) || 0));
  return state;
}

export function debugChangeReputation(state, category = "city", amount = 5) {
  if (!state.meta.debugMode) return state;
  if (["city", "street", "business", "faction"].includes(category)) addGeneralReputation(state, category, Number(amount) || 0);
  return state;
}

export function debugUnlockDistrict(state, districtId) {
  if (!state.meta.debugMode) return state;
  const district = getDistrict(state, districtId);
  if (district) {
    state.player.reputation.city = Math.max(state.player.reputation.city, district.reputationRequirement);
    markDistrictVisited(state, districtId);
  }
  return state;
}

export function debugCompleteQuest(state, questId) {
  if (!state.meta.debugMode) return state;
  const quest = questById(state, questId);
  if (!quest || quest.status === "completed") return state;
  for (const objective of quest.objectives) {
    objective.progress = objective.required;
  }
  quest.status = "completed";
  applyQuestRewards(state, quest.rewards);
  state.player.completedQuests.push(quest.id);
  return state;
}

export function debugAddItem(state, itemId, qty = 1) {
  if (!state.meta.debugMode) return state;
  addItem(state, itemId, Math.max(1, Number(qty) || 1));
  return state;
}

export function debugAddVehicle(state, vehicleId) {
  if (!state.meta.debugMode) return state;
  const vehicle = state.vehicles.find((entry) => entry.id === vehicleId);
  if (vehicle) vehicle.owned = true;
  return state;
}

export function debugAddProperty(state, propertyId) {
  if (!state.meta.debugMode) return state;
  const property = state.properties.find((entry) => entry.id === propertyId);
  if (property && !property.owned) {
    property.owned = true;
    state.player.ownedProperties.push(property.id);
  }
  return state;
}

export function getInventoryEntries(state) {
  return inventoryAsArray(state);
}

export function getMarketCatalog() {
  return clone(ITEMS);
}

export function getProperties(state) {
  return state.properties;
}

export function getBusinesses(state) {
  return state.businesses;
}

export function getFactionList(state) {
  return state.factions;
}
