import {
  ACHIEVEMENTS,
  BACKGROUND_POPULATION_TEMPLATES,
  BALANCE,
  BUSINESSES,
  CRIME_OPERATIONS,
  DAILY_QUEST_TEMPLATES,
  DISTRICTS,
  EVENTS,
  FACTIONS,
  ITEMS,
  JOBS,
  LOCATIONS,
  NPCS,
  PRISON_ACTIONS,
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
const DAY_PART_MINUTES = 24 * 60;
const MONTH_DAYS = 30;
const WEEK_DAYS = 7;
const MONTHS_PER_YEAR = 12;
const START_YEAR = 2026;
const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SEASONS = ["spring", "summer", "autumn", "winter"];
const WEATHER_TYPES = ["clear", "cloudy", "rain", "fog"];
const LIFESTYLE_LEVELS = ["Poor", "Comfortable", "Wealthy", "Luxury", "Elite"];
const SOCIAL_STATUS_LEVELS = ["Unknown", "Local", "Recognized", "Influential", "Elite", "VIP", "Legendary"];
const CAREER_LEVELS = ["Entry", "Junior", "Experienced", "Senior", "Manager", "Executive"];
const OUTFIT_PRESETS = ["Casual", "Elegant", "Luxury", "Street", "Business", "Nightlife", "Sport"];

function clone(value) {
  return structuredClone(value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function stateCreditLimitForLevel(level = 1) {
  return Math.max(BALANCE.credit.maxCreditByLevel, Math.round((BALANCE.credit.maxCreditByLevel || 1000) + (Math.max(1, level) - 1) * 420));
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

function travelTransactionCategory(source = "") {
  if (["property", "rent", "housing"].includes(source)) return "Housing";
  if (["market-food", "food", "restaurant", "bar", "cafe"].includes(source)) return "Food";
  if (["market-clothing", "wardrobe", "clothing"].includes(source)) return "Clothing";
  if (["travel", "vehicle"].includes(source)) return "Transportation";
  if (["casino", "date", "entertainment", "event"].includes(source)) return "Entertainment";
  if (["work", "salary"].includes(source)) return "Work";
  if (["business"].includes(source)) return "Business";
  return "Other";
}

function ensureLifeState(state) {
  if (!state.life || typeof state.life !== "object") state.life = {};
  state.life.age = Number.isFinite(state.life.age) ? state.life.age : 27;
  state.life.birthday = state.life.birthday || { day: 1, month: 1, year: START_YEAR - state.life.age };
  state.life.needs = {
    hunger: 72,
    hygiene: 74,
    mood: 70,
    ...(state.life.needs || {})
  };
  state.life.occupation = state.life.occupation || "Unemployed";
  state.life.education = state.life.education || {
    level: "School",
    completed: ["School"],
    activeCourse: null,
    points: 0
  };
  state.life.residence = state.life.residence || {
    propertyId: null,
    type: "None",
    district: "None",
    ownership: "None",
    rentDueDay: null,
    rentOverdueDays: 0
  };
  state.life.relationshipStatus = state.life.relationshipStatus || "Single";
  state.life.lifestyle = LIFESTYLE_LEVELS.includes(state.life.lifestyle) ? state.life.lifestyle : "Comfortable";
  state.life.socialStatus = SOCIAL_STATUS_LEVELS.includes(state.life.socialStatus) ? state.life.socialStatus : "Unknown";
  state.life.wardrobe = state.life.wardrobe || {
    appearance: {
      hair: "Classic",
      top: "Urban Shirt",
      bottom: "Tailored Pants",
      shoes: "Street Shoes",
      outerwear: "Light Jacket",
      accessories: "Silver Ring"
    },
    currentPreset: "Casual",
    unlockedPresets: ["Casual", "Street", "Business"]
  };
  state.life.career = state.life.career || {
    level: "Entry",
    xp: 0,
    occupation: "Unemployed",
    currentJobId: null
  };
  state.life.finance = state.life.finance || {
    weeklyIncome: 0,
    weeklyExpenses: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    housingCosts: 0,
    averageSpending: 0
  };
  state.life.calendar = state.life.calendar || { events: [], appointments: [] };
}

function updateLifestyle(state) {
  const wealth = state.player.money + state.player.bankBalance;
  const prestige = state.player.ownedProperties.reduce((sum, id) => sum + (state.properties.find((p) => p.id === id)?.prestige || 0), 0);
  const influence = state.player.influence;
  let lifestyle = "Poor";
  if (wealth >= 4000 || influence >= 10) lifestyle = "Comfortable";
  if (wealth >= 15000 || prestige >= 3 || influence >= 25) lifestyle = "Wealthy";
  if (wealth >= 32000 || prestige >= 6 || influence >= 45) lifestyle = "Luxury";
  if (wealth >= 70000 || prestige >= 10 || influence >= 75) lifestyle = "Elite";
  state.life.lifestyle = lifestyle;
}

function updateSocialStatus(state) {
  const rep = state.player.reputation.city + state.player.reputation.business + state.player.reputation.faction + state.player.reputation.street;
  const influence = state.player.influence;
  let value = "Unknown";
  if (rep >= 10 || influence >= 10) value = "Local";
  if (rep >= 30 || influence >= 22) value = "Recognized";
  if (rep >= 55 || influence >= 35) value = "Influential";
  if (rep >= 80 || influence >= 55) value = "Elite";
  if (rep >= 120 || influence >= 70) value = "VIP";
  if (rep >= 170 || influence >= 90) value = "Legendary";
  state.life.socialStatus = value;
}

function updateFinanceSummary(state) {
  const nowDay = state.time.day;
  const weekly = state.transactions.filter((tx) => tx.day >= nowDay - 6);
  const monthly = state.transactions.filter((tx) => tx.day >= nowDay - 29);
  const sumByType = (list, sign) =>
    list.filter((tx) => (sign > 0 ? tx.amount > 0 : tx.amount < 0)).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  state.life.finance.weeklyIncome = sumByType(weekly, 1);
  state.life.finance.weeklyExpenses = sumByType(weekly, -1);
  state.life.finance.monthlyIncome = sumByType(monthly, 1);
  state.life.finance.monthlyExpenses = sumByType(monthly, -1);
  state.life.finance.housingCosts = monthly.filter((tx) => tx.category === "Housing" && tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const monthlyExpenseTx = monthly.filter((tx) => tx.amount < 0).length;
  state.life.finance.averageSpending = monthlyExpenseTx ? Math.round(state.life.finance.monthlyExpenses / monthlyExpenseTx) : 0;
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
    category: transaction.category || travelTransactionCategory(transaction.source),
    ...transaction
  });
  state.transactions = state.transactions.slice(0, 500);
  if (state.life?.finance) updateFinanceSummary(state);
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
  if (state.life?.finance) {
    updateLifestyle(state);
    updateSocialStatus(state);
  }
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
  if (next >= BALANCE.wanted.maxLevel && !state.prison.active) {
    state.prison.active = true;
    state.prison.reason = "Wanted level reached maximum";
    state.prison.remainingTurns = 3;
    state.player.wantedLevel = Math.max(2, BALANCE.wanted.maxLevel - 2);
    addNotification(state, "Police", "You were arrested and sent to prison.", "error");
  }
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
    state.relationships[npcId] = { npcId, value: 0, status: "Stranger", friendship: 0, trust: 0, romance: 0, romanceStage: "none", interactions: 0, history: [] };
  }
  const rel = state.relationships[npcId];
  rel.friendship = Number.isFinite(rel.friendship) ? rel.friendship : Math.max(0, rel.value || 0);
  rel.trust = Number.isFinite(rel.trust) ? rel.trust : Math.max(0, Math.round((rel.value || 0) / 2));
  rel.romance = Number.isFinite(rel.romance) ? rel.romance : 0;
  rel.romanceStage = rel.romanceStage || "none";
  rel.history = Array.isArray(rel.history) ? rel.history : [];
  return rel;
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
    case "districts-visited":
      return state.statistics.districtsVisited.length;
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
    case "daily-job":
      return state.daily.dailyJobCount || 0;
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
    case "visit-location":
      return state.statistics.locationsVisited.includes(requirement.target) ? 1 : 0;
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

function applyCreditInterest(state, days = 1) {
  if (!state.credit?.debt || days <= 0) return;
  const rate = BALANCE.credit.dailyInterestRate || 0;
  for (let i = 0; i < days; i += 1) {
    const interest = Math.max(0, Math.round(state.credit.debt * rate));
    state.credit.debt += interest;
    state.credit.interestAccrued += interest;
  }
}

function tickPrison(state, turns = 1) {
  if (!state.prison?.active) return;
  state.prison.remainingTurns = Math.max(0, state.prison.remainingTurns - turns);
  if (state.prison.remainingTurns === 0) {
    state.prison.active = false;
    addNotification(state, "System", "You were released from prison.", "success");
  }
}

function refreshDailyQuests(state) {
  if (state.daily.lastQuestRefreshDay === state.time.day && state.daily.quests.length) return;
  state.daily.lastQuestRefreshDay = state.time.day;
  state.daily.dailyJobCount = 0;
  state.daily.quests = clone(DAILY_QUEST_TEMPLATES).map((entry) => ({
    ...entry,
    completed: false,
    claimed: false,
    progress: 0
  }));
}

function seasonForMonth(month) {
  if (month === 12 || month <= 2) return "winter";
  if (month <= 5) return "spring";
  if (month <= 8) return "summer";
  return "autumn";
}

function syncWorldClock(state) {
  const turnsPerDay = Math.max(1, state.time.turnsPerDay || 8);
  const turnIndex = Math.max(0, (state.time.turn || 1) - 1);
  const minutesPerTurn = DAY_PART_MINUTES / turnsPerDay;
  const totalMinutes = Math.round(turnIndex * minutesPerTurn);
  state.time.hour = Math.floor(totalMinutes / 60) % 24;
  state.time.minute = totalMinutes % 60;
  state.time.weekDay = ((state.time.day - 1) % WEEK_DAYS) + 1;
  state.time.week = Math.floor((state.time.day - 1) / WEEK_DAYS) + 1;
  const dayOfYear = Math.max(1, state.time.day);
  state.time.month = Math.floor((dayOfYear - 1) / MONTH_DAYS) % MONTHS_PER_YEAR + 1;
  state.time.monthDay = ((dayOfYear - 1) % MONTH_DAYS) + 1;
  state.time.year = START_YEAR + Math.floor((dayOfYear - 1) / (MONTH_DAYS * MONTHS_PER_YEAR));
  state.time.season = seasonForMonth(state.time.month);
}

function maybeShiftWeather(state) {
  const chance = state.weather?.current === "clear" ? 0.16 : 0.28;
  if (seededRandom(state) > chance) return;
  const seasonBias = state.time?.season;
  const weighted = WEATHER_TYPES.flatMap((entry) => {
    if (entry === "rain" && seasonBias === "autumn") return [entry, entry];
    if (entry === "fog" && seasonBias === "winter") return [entry, entry];
    if (entry === "clear" && seasonBias === "summer") return [entry, entry];
    return [entry];
  });
  const next = weighted[Math.floor(seededRandom(state) * weighted.length) % weighted.length];
  state.weather.current = next;
  state.weather.lastChangeDay = state.time.day;
  state.weather.lastChangeTurn = state.time.turn;
  addNotification(state, "Weather", `Weather shifted to ${next}.`, "info");
}

function setNeeds(state, changes = {}) {
  ensureLifeState(state);
  state.life.needs.hunger = clamp(state.life.needs.hunger + (changes.hunger || 0), 0, 100);
  state.life.needs.hygiene = clamp(state.life.needs.hygiene + (changes.hygiene || 0), 0, 100);
  state.life.needs.mood = clamp(state.life.needs.mood + (changes.mood || 0), 0, 100);
  state.player.hunger = state.life.needs.hunger;
  state.player.hygiene = state.life.needs.hygiene;
  state.player.mood = state.life.needs.mood;
}

function applyNeedsConsequences(state) {
  const hunger = state.life?.needs?.hunger ?? 70;
  const hygiene = state.life?.needs?.hygiene ?? 70;
  const mood = state.life?.needs?.mood ?? 70;
  if (hunger < 20) state.player.energy = clamp(state.player.energy - 2, 0, 100);
  if (mood < 20) state.player.energy = clamp(state.player.energy - 1, 0, 100);
  if (hygiene < 20) addGeneralReputation(state, "street", -1);
  if (state.player.energy < 20) state.player.health = clamp(state.player.health - 1, 0, 100);
}

function addCalendarEvent(state, entry) {
  ensureLifeState(state);
  state.life.calendar.events.unshift({
    id: makeId("cal"),
    day: state.time.day,
    week: state.time.week,
    month: state.time.month,
    year: state.time.year,
    ...entry
  });
  state.life.calendar.events = state.life.calendar.events.slice(0, 120);
}

function updateNpcRoutines(state) {
  const hour = state.time.hour;
  const isWeekend = state.time.weekDay === 6 || state.time.weekDay === 7;
  for (const npc of state.npcs) {
    if (hour >= 0 && hour < 7) {
      npc.location = npc.role.includes("security") ? npc.location : "safehouse";
      continue;
    }
    if (hour >= 7 && hour < 16) {
      if (npc.role.includes("driver")) npc.location = "driver-hub";
      else if (npc.role.includes("mechanic")) npc.location = "garage";
      else if (npc.role.includes("banker")) npc.location = "bank";
      else if (npc.role.includes("restaurant")) npc.location = "restaurant";
      else if (npc.role.includes("office") || npc.role.includes("assistant") || npc.role.includes("lawyer")) npc.location = "office-complex";
      continue;
    }
    if (hour >= 16 && hour < 22) {
      npc.location = isWeekend ? "luxury-club" : npc.location;
      if (npc.role.includes("bartender")) npc.location = "bar";
      if (npc.role.includes("nightclub")) npc.location = "underground-club";
      continue;
    }
  }
}

function handleRentAndBills(state) {
  ensureLifeState(state);
  const residence = state.life.residence;
  if (!residence?.propertyId || residence.ownership !== "Rented") return;
  if (residence.rentDueDay == null) residence.rentDueDay = state.time.day + 7;
  if (state.time.day >= residence.rentDueDay) {
    const property = state.properties.find((p) => p.id === residence.propertyId);
    const rent = property?.rentWeekly || 400;
    const paid = addWallet(state, -rent, "rent", `Weekly rent · ${property?.name || "Residence"}`, "expense");
    if (paid) {
      residence.rentDueDay += 7;
      residence.rentOverdueDays = 0;
      addNotification(state, "Housing", `Rent paid: $${rent}.`, "success");
    } else {
      residence.rentOverdueDays += 1;
      setNeeds(state, { mood: -4 });
      addGeneralReputation(state, "city", -1);
      addNotification(state, "Housing", "Rent due and unpaid. Resolve it soon.", "error");
      if (residence.rentOverdueDays >= 3) {
        state.player.energy = clamp(state.player.energy - 6, 0, 100);
        state.player.health = clamp(state.player.health - 3, 0, 100);
      }
    }
  } else if (state.time.day + 1 >= residence.rentDueDay) {
    addNotification(state, "Housing", "Rent due soon.", "info");
  }
}

function trackBirthday(state) {
  ensureLifeState(state);
  const b = state.life.birthday;
  if (state.time.month === b.month && state.time.monthDay === b.day && state.life.lastBirthdayDay !== state.time.day) {
    state.life.age += 1;
    state.life.lastBirthdayDay = state.time.day;
    setNeeds(state, { mood: 10 });
    addCalendarEvent(state, { type: "Birthday", title: `${state.player.name} birthday` });
    addNotification(state, "Social", "Birthday event! Mood boosted.", "success");
  }
}

function nextTurn(state, turns = 1) {
  ensureLifeState(state);
  let remaining = Math.max(1, turns);
  while (remaining > 0) {
    state.time.turn += 1;
    setNeeds(state, { hunger: -2, hygiene: -1, mood: -1 });
    applyNeedsConsequences(state);
    if (state.time.turn > state.time.turnsPerDay) {
      state.time.turn = 1;
      state.time.day += 1;
      state.statistics.daysPlayed = state.time.day;
      state.daily.rewardClaimedDay = Math.min(state.daily.rewardClaimedDay, state.time.day - 1);
      dailyBusinessTick(state, 1);
      applyCreditInterest(state, 1);
      refreshDailyQuests(state);
      handleRentAndBills(state);
      trackBirthday(state);
      addNotification(state, "System", `A new day begins in NARCOS CITY (Day ${state.time.day}).`, "info");
    }
    syncWorldClock(state);
    if (state.life?.career?.currentJobId) {
      const activeJob = state.jobs.find((j) => j.id === state.life.career.currentJobId);
      if (activeJob?.schedule?.startHour != null && state.time.hour === ((activeJob.schedule.startHour + 23) % 24) && state.time.minute === 0) {
        addNotification(state, "Work", `${activeJob.name} starts soon.`, "info");
      }
    }
    updateNpcRoutines(state);
    if (!state.weather) {
      state.weather = {
        current: "clear",
        lastChangeDay: state.time.day,
        lastChangeTurn: state.time.turn
      };
    }
    maybeShiftWeather(state);
    tickPrison(state, 1);
    if (state.life.needs.hunger <= 22) addNotification(state, "Needs", "You are hungry.", "info");
    if (state.player.energy <= 22) addNotification(state, "Needs", "You are tired.", "info");
    if (state.life.needs.hygiene <= 20) addNotification(state, "Needs", "Your hygiene is low.", "info");
    if (state.life.needs.mood <= 20) addNotification(state, "Needs", "Your mood is low.", "info");
    remaining -= 1;
  }
  state.day = state.time.day;
  state.turn = state.time.turn;
  updateLifestyle(state);
  updateSocialStatus(state);
}

function advanceByMinutes(state, minutes = 60) {
  const m = Math.max(1, Math.round(minutes || 60));
  const turnMinutes = Math.max(1, Math.floor((24 * 60) / Math.max(1, state.time.turnsPerDay || TURNS_PER_DAY)));
  const turns = Math.max(1, Math.ceil(m / turnMinutes));
  nextTurn(state, turns);
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

function blockedByPrison(state) {
  if (!state.prison?.active) return false;
  addNotification(state, "System", `You are in prison for ${state.prison.remainingTurns} more turn(s).`, "error");
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

function refreshDailyQuestProgress(state) {
  for (const quest of state.daily.quests || []) {
    if (quest.completed) continue;
    quest.progress = Math.min(quest.objective.required, getQuestMetric(state, quest.objective));
    if (quest.progress >= quest.objective.required) {
      quest.completed = true;
      addNotification(state, "Quest", `Daily quest complete: ${quest.title}.`, "success");
    }
  }
}

function evaluatePostAction(state, reason = "action") {
  refreshQuests(state);
  refreshAchievements(state);
  refreshDailyQuestProgress(state);
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
  return Object.fromEntries(
    NPCS.map((npc) => [
      npc.id,
      {
        npcId: npc.id,
        value: 0,
        status: "Stranger",
        friendship: 0,
        trust: 0,
        romance: 0,
        romanceStage: "none",
        interactions: 0,
        history: []
      }
    ])
  );
}

export function createInitialState() {
  const firstDistrict = DISTRICTS[0];
  const firstLocationId = firstDistrict.locations[0];
  const factionRep = createFactionReputation();
  const inventory = Object.fromEntries(STARTER_INVENTORY.map((entry) => [entry.id, entry.quantity]));
  const backgroundPopulation = Object.fromEntries(
    Object.entries(BACKGROUND_POPULATION_TEMPLATES).map(([districtId, roles]) => [
      districtId,
      roles.map((role, index) => ({
        id: `${districtId}-${role.toLowerCase().replace(/\s+/g, "-")}-${index + 1}`,
        role,
        mood: "neutral",
        location: DISTRICTS.find((d) => d.id === districtId)?.locations[index % 4] || DISTRICTS[0].locations[0]
      }))
    ])
  );

  const state = {
    currentScreen: "main-menu",
    selectedDistrictId: firstDistrict.id,
    currentLocationId: firstLocationId,
    day: 1,
    turn: 1,
    player: {
      name: "La Reina",
      title: TITLE_RANKS[0].name,
      level: 1,
      xp: 0,
      totalXp: 0,
      nextLevelXp: BALANCE.xpBasePerLevel,
      money: 10000,
      bankBalance: 0,
      health: 100,
      energy: 100,
      hunger: 72,
      hygiene: 74,
      mood: 70,
      reputation: {
        city: 0,
        street: 0,
        business: 0,
        faction: 0
      },
      influence: 5,
      respect: 10,
      status: "Active",
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
      completedQuests: [],
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
      lastLoginDay: epochDay(),
      hour: 7,
      minute: 0,
      weekDay: 1,
      week: 1,
      month: 1,
      monthDay: 1,
      year: START_YEAR,
      season: "winter"
    },
    weather: {
      current: "clear",
      lastChangeDay: 1,
      lastChangeTurn: 1
    },
    districts: clone(DISTRICTS),
    inventory,
    marketCatalog: clone(ITEMS),
    vehicles: clone(VEHICLES),
    properties: clone(PROPERTIES),
    businesses: clone(BUSINESSES),
    factions: clone(FACTIONS),
    npcs: clone(NPCS),
    jobs: clone(JOBS),
    crimeOperations: clone(CRIME_OPERATIONS),
    prisonActions: clone(PRISON_ACTIONS),
    backgroundPopulation,
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
      dailyQuestRefreshDay: 1,
      lastQuestRefreshDay: 0,
      dailyJobCount: 0,
      quests: []
    },
    prison: {
      active: false,
      reason: null,
      remainingTurns: 0
    },
    credit: {
      enabled: true,
      debt: 0,
      creditLimit: BALANCE.credit.maxCreditByLevel,
      interestAccrued: 0
    },
    social: {
      friends: [],
      followers: 0,
      messages: [],
      gifts: [],
      trades: []
    },
    relationshipsFoundation: {
      romance: {},
      partnerId: null,
      marriage: null,
      family: {
        children: []
      }
    },
    life: {
      age: 27,
      birthday: { day: 1, month: 1, year: START_YEAR - 27 },
      occupation: "Unemployed",
      education: {
        level: "School",
        completed: ["School"],
        activeCourse: null,
        points: 0
      },
      residence: {
        propertyId: null,
        type: "None",
        district: "None",
        ownership: "None",
        rentDueDay: null,
        rentOverdueDays: 0
      },
      relationshipStatus: "Single",
      lifestyle: "Comfortable",
      socialStatus: "Unknown",
      needs: {
        hunger: 72,
        hygiene: 74,
        mood: 70
      },
      wardrobe: {
        appearance: {
          hair: "Classic",
          top: "Urban Shirt",
          bottom: "Tailored Pants",
          shoes: "Street Shoes",
          outerwear: "Light Jacket",
          accessories: "Silver Ring"
        },
        currentPreset: "Casual",
        unlockedPresets: ["Casual", "Street", "Business"]
      },
      career: {
        level: "Entry",
        xp: 0,
        occupation: "Unemployed",
        currentJobId: null
      },
      calendar: {
        events: [],
        appointments: []
      },
      finance: {
        weeklyIncome: 0,
        weeklyExpenses: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        housingCosts: 0,
        averageSpending: 0
      }
    },
    telegram: {
      adapter: "none",
      userId: null,
      username: null,
      firstName: null,
      avatarUrl: null,
      premiumStatus: false,
      starsBalance: 0
    },
    premium: {
      membership: "standard",
      cosmeticsOwned: [],
      vipUnlocked: false
    },
    admin: {
      role: "PLAYER",
      maintenanceMode: false
    },
    meta: {
      hasCreatedCharacter: false,
      eventSeed: 123456789,
      saveVersion: SAVE_VERSION,
      lastEvent: null,
      pendingEvent: null,
      debugMode: false
    },
    world: {
      currentInteriorId: null
    },
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      graphicsQuality: "medium",
      controlsSensitivity: 1,
      cameraSensitivity: 1,
      language: "ru"
    }
  };

  syncWorldClock(state);
  ensureLifeState(state);
  updateLifestyle(state);
  updateSocialStatus(state);
  updateFinanceSummary(state);
  addNotification(state, "System", "Welcome to NARCOS CITY. Create your character to begin.");
  refreshDailyQuests(state);
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
    weather: { ...base.weather, ...rawState.weather },
    daily: { ...base.daily, ...rawState.daily },
    prison: { ...base.prison, ...rawState.prison },
    credit: { ...base.credit, ...rawState.credit },
    social: { ...base.social, ...rawState.social },
    relationshipsFoundation: {
      ...base.relationshipsFoundation,
      ...rawState.relationshipsFoundation,
      family: { ...base.relationshipsFoundation.family, ...(rawState.relationshipsFoundation?.family || {}) }
    },
    life: {
      ...base.life,
      ...rawState.life,
      needs: { ...base.life.needs, ...(rawState.life?.needs || {}) },
      education: { ...base.life.education, ...(rawState.life?.education || {}) },
      residence: { ...base.life.residence, ...(rawState.life?.residence || {}) },
      wardrobe: { ...base.life.wardrobe, ...(rawState.life?.wardrobe || {}) },
      calendar: { ...base.life.calendar, ...(rawState.life?.calendar || {}) },
      career: { ...base.life.career, ...(rawState.life?.career || {}) },
      finance: { ...base.life.finance, ...(rawState.life?.finance || {}) }
    },
    telegram: { ...base.telegram, ...rawState.telegram },
    premium: { ...base.premium, ...rawState.premium },
    admin: { ...base.admin, ...rawState.admin },
    meta: { ...base.meta, ...rawState.meta },
    statistics: { ...base.statistics, ...rawState.statistics },
    world: { ...base.world, ...rawState.world },
    settings: { ...base.settings, ...rawState.settings }
  };

  merged.districts = Array.isArray(rawState.districts) ? rawState.districts : clone(DISTRICTS);
  merged.marketCatalog = Array.isArray(rawState.marketCatalog) ? rawState.marketCatalog : clone(ITEMS);
  merged.vehicles = Array.isArray(rawState.vehicles) ? rawState.vehicles : clone(VEHICLES);
  merged.properties = Array.isArray(rawState.properties) ? rawState.properties : clone(PROPERTIES);
  merged.businesses = Array.isArray(rawState.businesses) ? rawState.businesses : clone(BUSINESSES);
  merged.factions = Array.isArray(rawState.factions) ? rawState.factions : clone(FACTIONS);
  merged.npcs = Array.isArray(rawState.npcs) ? rawState.npcs : clone(NPCS);
  merged.jobs = Array.isArray(rawState.jobs) ? rawState.jobs : clone(JOBS);
  merged.crimeOperations = Array.isArray(rawState.crimeOperations) ? rawState.crimeOperations : clone(CRIME_OPERATIONS);
  merged.prisonActions = Array.isArray(rawState.prisonActions) ? rawState.prisonActions : clone(PRISON_ACTIONS);
  merged.backgroundPopulation = rawState.backgroundPopulation && typeof rawState.backgroundPopulation === "object" ? rawState.backgroundPopulation : clone(base.backgroundPopulation);
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
  merged.player.respect = Number.isFinite(merged.player.respect) ? merged.player.respect : 10;
  merged.player.status = merged.player.status || "Active";
  merged.player.completedQuests = Array.isArray(merged.player.completedQuests) ? merged.player.completedQuests : [];
  merged.player.money = Math.max(0, merged.player.money || merged.player.wallet || 0);
  merged.player.bankBalance = Math.max(0, merged.player.bankBalance || 0);
  merged.player.hunger = clamp(Number.isFinite(merged.player.hunger) ? merged.player.hunger : merged.life?.needs?.hunger ?? 72, 0, 100);
  merged.player.hygiene = clamp(Number.isFinite(merged.player.hygiene) ? merged.player.hygiene : merged.life?.needs?.hygiene ?? 74, 0, 100);
  merged.player.mood = clamp(Number.isFinite(merged.player.mood) ? merged.player.mood : merged.life?.needs?.mood ?? 70, 0, 100);
  merged.player.reputation.street = merged.player.reputation.street || merged.player.streetReputation || 0;
  merged.player.streetReputation = merged.player.reputation.street;
  merged.player.wantedLevel = clamp(merged.player.wantedLevel || merged.meta.wantedLevel || 0, 0, BALANCE.wanted.maxLevel);
  merged.meta.saveVersion = SAVE_VERSION;
  merged.settings.language = ["ru", "en"].includes(merged.settings.language) ? merged.settings.language : "ru";
  merged.credit.creditLimit = Math.max(BALANCE.credit.maxCreditByLevel, stateCreditLimitForLevel(merged.player.level));
  ensureLifeState(merged);
  merged.life.needs.hunger = merged.player.hunger;
  merged.life.needs.hygiene = merged.player.hygiene;
  merged.life.needs.mood = merged.player.mood;

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
  syncWorldClock(merged);
  applyCreditInterest(merged, elapsedDays);
  refreshDailyQuests(merged);

  refreshQuests(merged);
  refreshAchievements(merged);
  updateLifestyle(merged);
  updateSocialStatus(merged);
  updateFinanceSummary(merged);
  return merged;
}

export function normalizeState(rawState) {
  return migrateState(rawState);
}

export function createPlayer(state, name) {
  const clean = String(name || "").trim();
  state.player.name = (clean || state.player.name || "La Reina").slice(0, 24);
  state.meta.hasCreatedCharacter = true;
  state.player.currentDistrict = state.selectedDistrictId;
  state.player.currentLocation = state.currentLocationId;
  state.credit.creditLimit = stateCreditLimitForLevel(state.player.level);
  addNotification(state, "System", `Welcome, ${state.player.name}. The city now knows your name.`, "success");
  refreshQuests(state);
  refreshAchievements(state);
  return state;
}

export function resetGame() {
  return createInitialState();
}

export function navigateTo(state, screen) {
  const allowed = ["main-menu", "city", "districts", "profile", "inventory", "quests", "settings"];
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
  if (blockedByPrison(state)) return state;
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
  if (vehicle.category === "Luxury" || vehicle.category === "Sports") addInfluence(state, 1);

  if (seededRandom(state) < BALANCE.travel.policeRiskBaseChance + state.player.wantedLevel * BALANCE.travel.wantedRiskPerLevel) {
    adjustWanted(state, 1);
    addNotification(state, "Police", "Travel risk increased your wanted level.", "error");
  }

  evaluatePostAction(state, "travel");
  addNotification(state, "System", `Traveled to ${district.name} for $${travelCost}.`, "success");
  return state;
}

export function moveToLocation(state, districtId, locationId) {
  if (blockedByPrison(state)) return state;
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
  if (blockedByPrison(state)) return state;
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
  if (action.type === "social") setNeeds(state, { hunger: -2, hygiene: -1, mood: 4 });
  if (action.type === "work" || action.type === "business-action") setNeeds(state, { hunger: -4, hygiene: -2, mood: -1 });
  if (action.type === "rest") setNeeds(state, { hunger: -2, hygiene: 2, mood: 4 });
  if (action.type === "market-buy") setNeeds(state, { mood: 1 });
  if (action.type === "risky") setNeeds(state, { mood: -2, hygiene: -1 });

  addXP(state, action.xpGain || 0);
  state.statistics.actionCounts[action.id] = (state.statistics.actionCounts[action.id] || 0) + 1;
  state.statistics.totalActionsCompleted += 1;
  if (action.type === "business-action") state.statistics.actionCounts["business-action"] = (state.statistics.actionCounts["business-action"] || 0) + 1;

  const activityMinutesByType = {
    social: 120,
    "market-buy": 45,
    "market-sell": 30,
    work: 240,
    rest: 180,
    "business-action": 210,
    "city-action": 120,
    risky: 180,
    "transport-action": 60,
    "faction-action": 150
  };
  advanceByMinutes(state, activityMinutesByType[action.type] || 60);
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
  if (blockedByPrison(state)) return state;
  ensureLifeState(state);
  const npc = state.npcs.find((entry) => entry.id === npcId);
  if (!npc) {
    addNotification(state, "Social", "NPC unavailable.", "error");
    return state;
  }

  const energyCostMap = {
    talk: 2,
    chat: 2,
    "hang-out": 4,
    flirt: 4,
    "ask-out": 5,
    "go-shopping": 4,
    visit: 3,
    invite: 3,
    argument: 3,
    reconcile: 4,
    socialize: BALANCE.energy.socialCost,
    help: 5,
    "give-gift": 2,
    "work-together": BALANCE.energy.workCost,
    "complete-quest": 4,
    leave: 0
  };
  const deltaMap = {
    talk: 4,
    chat: 3,
    "hang-out": 6,
    flirt: 5,
    "ask-out": 4,
    "go-shopping": 5,
    visit: 4,
    invite: 4,
    argument: -8,
    reconcile: 7,
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
  let delta = deltaMap[interactionType] ?? 3;
  if ((state.life.needs.hygiene || 0) < 25 && ["socialize", "flirt", "ask-out", "hang-out"].includes(interactionType)) {
    delta -= 2;
  }
  if ((state.life.needs.mood || 0) < 25 && ["socialize", "flirt", "ask-out", "hang-out", "visit"].includes(interactionType)) {
    delta -= 2;
  }
  if (state.life.wardrobe.currentPreset === "Elegant" || state.life.wardrobe.currentPreset === "Luxury") {
    if (["socialize", "flirt", "ask-out"].includes(interactionType)) delta += 1;
  }
  relation.value = clamp(relation.value + delta, -100, 100);
  relation.status = relationshipStatus(relation.value);
  relation.interactions += 1;
  relation.friendship = clamp(relation.friendship + Math.max(-4, Math.round(delta)), 0, 100);
  relation.trust = clamp(relation.trust + (delta >= 0 ? 2 : -2), 0, 100);
  if (["flirt", "ask-out", "give-gift"].includes(interactionType)) relation.romance = clamp(relation.romance + (delta >= 0 ? 4 : -3), 0, 100);
  if (relation.romance >= 65) relation.romanceStage = "relationship";
  else if (relation.romance >= 45) relation.romanceStage = "dating";
  else if (relation.romance >= 25) relation.romanceStage = "interest";
  relation.history.unshift({
    id: makeId("rel"),
    interactionType,
    delta,
    day: state.time.day,
    turn: state.time.turn
  });
  relation.history = relation.history.slice(0, 30);
  npc.relationship = relation.value;

  state.player.energy = clamp(state.player.energy - energyCost, 0, 100);
  setNeeds(state, {
    hunger: -1,
    hygiene: ["exercise", "hang-out", "go-shopping"].includes(interactionType) ? -2 : -1,
    mood: delta >= 0 ? 2 : -3
  });
  addXP(state, 10 + Math.max(0, Math.round(delta / 2)));
  if (interactionType === "help") addGeneralReputation(state, "city", BALANCE.reputation.cityHelp);
  if (["work-together", "complete-quest"].includes(interactionType)) addGeneralReputation(state, "faction", BALANCE.reputation.factionAction);
  if (["socialize", "give-gift"].includes(interactionType)) state.player.charisma += 1;
  if (interactionType === "talk") addGeneralReputation(state, "street", 1);

  if (!state.statistics.npcsMet.includes(npcId)) state.statistics.npcsMet.push(npcId);
  state.statistics.npcInteractionCount[npcId] = (state.statistics.npcInteractionCount[npcId] || 0) + 1;
  state.statistics.relationshipsImproved += delta > 0 ? 1 : 0;
  state.statistics.totalActionsCompleted += 1;
  state.statistics.actionCounts[interactionType] = (state.statistics.actionCounts[interactionType] || 0) + 1;

  addFactionReputation(state, npc.faction, 1);

  if (interactionType === "hang-out") advanceByMinutes(state, 120);
  else if (interactionType === "go-shopping") advanceByMinutes(state, 75);
  else if (interactionType === "visit") advanceByMinutes(state, 90);
  else if (interactionType === "ask-out") advanceByMinutes(state, 60);
  else nextTurn(state, 1);
  evaluatePostAction(state, "npc");
  if (!silent) {
    addNotification(state, "Social", `${npc.name}: ${relation.status} (${relation.value}).`, "success");
  }
  if (relation.status === "Friend" || relation.status === "Close Friend") state.life.relationshipStatus = "Social";
  if (relation.romanceStage === "dating" || relation.romanceStage === "relationship") state.life.relationshipStatus = "Dating";
  if (relation.status === "Spouse") state.life.relationshipStatus = "Married";
  return state;
}

export function safehouseRest(state, silent = false) {
  if (blockedByPrison(state)) return state;
  ensureLifeState(state);
  state.player.energy = clamp(state.player.energy + BALANCE.energy.restRecover, 0, 100);
  state.player.health = clamp(state.player.health + BALANCE.health.restRecover, 0, 100);
  setNeeds(state, { hunger: -4, hygiene: 6, mood: 8 });
  state.player.currentLocation = "safehouse";
  state.currentLocationId = "safehouse";
  state.selectedDistrictId = "old-town";
  state.player.currentDistrict = "old-town";
  advanceByMinutes(state, 420);
  addXP(state, 8);
  evaluatePostAction(state, "rest");
  if (!silent) addNotification(state, "System", "Recovered at safehouse.", "success");
  return state;
}

export function safehouseRecoverEnergy(state, silent = false) {
  if (blockedByPrison(state)) return state;
  ensureLifeState(state);
  state.player.energy = clamp(state.player.energy + BALANCE.energy.recoverEnergy, 0, 100);
  setNeeds(state, { hunger: -2, hygiene: 2, mood: 4 });
  advanceByMinutes(state, 120);
  addXP(state, 4);
  evaluatePostAction(state, "rest");
  if (!silent) addNotification(state, "System", "Energy recovered.", "success");
  return state;
}

export function upgradeSafehouse(state) {
  if (blockedByPrison(state)) return state;
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
  if (blockedByPrison(state)) return state;
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
  if (blockedByPrison(state)) return state;
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
  if (blockedByPrison(state)) return state;
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
  if (blockedByPrison(state)) return state;
  const item = ITEM_BY_ID[itemId];
  if (!item) {
    addNotification(state, "Economy", "Item unavailable.", "error");
    return state;
  }
  const cost = Math.max(1, Math.round(price || item.price || 0));
  const source = item.category === "Food" ? "market-food" : item.category === "Clothing" ? "market-clothing" : "market";
  if (!addWallet(state, -cost, source, `Buy ${item.name}`, "expense")) {
    addNotification(state, "Economy", "Insufficient money.", "error");
    return state;
  }
  addItem(state, itemId, 1);
  if (item.category === "Food") setNeeds(state, { hunger: 8, mood: 1 });
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
  if (blockedByPrison(state)) return state;
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
  if (blockedByPrison(state)) return state;
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
  if (effect.mood) setNeeds(state, { mood: effect.mood });
  if (effect.hunger) setNeeds(state, { hunger: effect.hunger });
  if (effect.hygiene) setNeeds(state, { hygiene: effect.hygiene });
  if (effect.charisma) state.player.charisma += effect.charisma;
  if (effect.influence) addInfluence(state, effect.influence);
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
  if (blockedByPrison(state)) return state;
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
  if (blockedByPrison(state)) return state;
  ensureLifeState(state);
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
  property.rented = false;
  state.player.ownedProperties.push(property.id);
  state.life.residence = {
    propertyId: property.id,
    type: property.type,
    district: property.district,
    ownership: "Owned",
    rentDueDay: null,
    rentOverdueDays: 0
  };
  state.statistics.propertiesOwned = state.player.ownedProperties.length;
  addInfluence(state, property.prestige);
  addGeneralReputation(state, "city", Math.max(1, Math.floor(property.prestige / 2)));
  setNeeds(state, { mood: 5 });
  addCalendarEvent(state, { type: "Property", title: `Purchased ${property.name}` });
  addXP(state, 18);
  refreshQuests(state);
  refreshAchievements(state);
  addNotification(state, "Property", `Purchased ${property.name}.`, "success");
  return state;
}

export function rentProperty(state, propertyId, mode = "weekly") {
  if (blockedByPrison(state)) return state;
  ensureLifeState(state);
  const property = state.properties.find((entry) => entry.id === propertyId);
  if (!property) {
    addNotification(state, "Housing", "Property not found.", "error");
    return state;
  }
  if (property.owned) {
    addNotification(state, "Housing", "You already own this property.", "info");
    return state;
  }
  const rent = mode === "monthly" ? property.rentMonthly || property.rentWeekly * 4 : property.rentWeekly || 400;
  if (!addWallet(state, -rent, "rent", `${mode === "monthly" ? "Monthly" : "Weekly"} rent · ${property.name}`, "expense")) {
    addNotification(state, "Housing", "Insufficient cash for rent.", "error");
    return state;
  }
  state.life.residence = {
    propertyId: property.id,
    type: property.type,
    district: property.district,
    ownership: "Rented",
    rentDueDay: state.time.day + (mode === "monthly" ? 30 : 7),
    rentOverdueDays: 0
  };
  property.rented = true;
  setNeeds(state, { mood: 4 });
  addCalendarEvent(state, { type: "Housing", title: `Rented ${property.name}` });
  addNotification(state, "Housing", `Residence set: ${property.name} (${mode}).`, "success");
  return state;
}

export function payRent(state) {
  ensureLifeState(state);
  const residence = state.life.residence;
  if (!residence?.propertyId || residence.ownership !== "Rented") {
    addNotification(state, "Housing", "No active rent contract.", "info");
    return state;
  }
  const property = state.properties.find((entry) => entry.id === residence.propertyId);
  const rent = property?.rentWeekly || 400;
  if (!addWallet(state, -rent, "rent", `Manual rent payment · ${property?.name || "Residence"}`, "expense")) {
    addNotification(state, "Housing", "Insufficient cash for rent payment.", "error");
    return state;
  }
  residence.rentDueDay = Math.max(state.time.day + 7, (residence.rentDueDay || state.time.day) + 7);
  residence.rentOverdueDays = 0;
  setNeeds(state, { mood: 2 });
  addNotification(state, "Housing", `Rent paid for ${property?.name || "residence"}.`, "success");
  return state;
}

export function changeOutfit(state, preset = "Casual") {
  ensureLifeState(state);
  if (!OUTFIT_PRESETS.includes(preset)) {
    addNotification(state, "Style", "Outfit preset unavailable.", "error");
    return state;
  }
  if (!state.life.wardrobe.unlockedPresets.includes(preset)) {
    const unlockCost = preset === "Luxury" ? 1200 : preset === "Elegant" ? 600 : 380;
    if (!addWallet(state, -unlockCost, "wardrobe", `Unlock ${preset} outfit`, "expense")) {
      addNotification(state, "Style", "Insufficient cash to unlock outfit.", "error");
      return state;
    }
    state.life.wardrobe.unlockedPresets.push(preset);
  }
  state.life.wardrobe.currentPreset = preset;
  if (["Elegant", "Luxury", "Business"].includes(preset)) {
    state.player.charisma += 1;
    addGeneralReputation(state, "city", 1);
  }
  if (preset === "Street") addGeneralReputation(state, "street", 1);
  if (preset === "Sport") state.player.energy = clamp(state.player.energy + 6, 0, 100);
  setNeeds(state, { mood: 3, hygiene: -1 });
  advanceByMinutes(state, 20);
  addNotification(state, "Style", `${preset} outfit equipped.`, "success");
  return state;
}

export function performLifeActivity(state, activityId, payload = {}) {
  if (blockedByPrison(state)) return state;
  ensureLifeState(state);
  const activities = {
    eat: { minutes: 30, cost: 80, source: "food", needs: { hunger: 24, mood: 3 }, energy: 6, health: 2 },
    sleep: { minutes: 480, needs: { hunger: -8, hygiene: 6, mood: 10 }, energy: 48, health: 16 },
    rest: { minutes: 120, needs: { hunger: -2, mood: 5 }, energy: 24, health: 6 },
    shower: { minutes: 25, needs: { hygiene: 26, mood: 2 }, energy: -1 },
    study: { minutes: 180, needs: { hunger: -4, hygiene: -2, mood: -1 }, intelligence: 2, educationPoints: 6 },
    exercise: { minutes: 90, needs: { hunger: -6, hygiene: -6, mood: 4 }, energy: -12, strength: 2 },
    socialize: { minutes: 120, cost: 110, source: "entertainment", needs: { hunger: -3, hygiene: -2, mood: 7 }, charisma: 1 },
    "manage-home": { minutes: 60, cost: 40, source: "housing", needs: { mood: 4, hygiene: -1 }, influence: 1 },
    "manage-property": { minutes: 90, cost: 120, source: "property", needs: { mood: 2 }, influence: 1, cityRep: 1 }
  };
  const activity = activities[activityId];
  if (!activity) {
    addNotification(state, "Life", "Activity unavailable.", "error");
    return state;
  }
  if (activity.cost && !addWallet(state, -activity.cost, activity.source || "other", `Activity: ${activityId}`, "expense")) {
    addNotification(state, "Life", "Insufficient cash for activity.", "error");
    return state;
  }
  setNeeds(state, activity.needs || {});
  if (activity.energy) state.player.energy = clamp(state.player.energy + activity.energy, 0, 100);
  if (activity.health) state.player.health = clamp(state.player.health + activity.health, 0, 100);
  if (activity.intelligence) state.player.intelligence += activity.intelligence;
  if (activity.strength) state.player.strength += activity.strength;
  if (activity.charisma) state.player.charisma += activity.charisma;
  if (activity.influence) addInfluence(state, activity.influence);
  if (activity.cityRep) addGeneralReputation(state, "city", activity.cityRep);
  if (activity.educationPoints) state.life.education.points += activity.educationPoints;
  addCalendarEvent(state, { type: "Activity", title: activityId });
  advanceByMinutes(state, activity.minutes);
  evaluatePostAction(state, "action");
  addNotification(state, "Life", `${activityId} completed.`, "success");
  return state;
}

export function startDateWithNpc(state, npcId, venue = "restaurant") {
  if (blockedByPrison(state)) return state;
  ensureLifeState(state);
  const npc = state.npcs.find((entry) => entry.id === npcId);
  if (!npc) {
    addNotification(state, "Social", "Date target unavailable.", "error");
    return state;
  }
  const relation = ensureRelation(state, npcId);
  const baseCostMap = { restaurant: 180, cafe: 90, park: 30, nightclub: 230, "luxury-venue": 360, entertainment: 140 };
  const cost = baseCostMap[venue] ?? 120;
  if (!addWallet(state, -cost, "date", `Date with ${npc.name} at ${venue}`, "expense")) {
    addNotification(state, "Social", "Insufficient cash for date.", "error");
    return state;
  }
  const personalityBonus = ["charming", "warm", "confident"].includes(npc.personality) ? 2 : 0;
  const styleBonus = ["Elegant", "Luxury", "Nightlife"].includes(state.life.wardrobe.currentPreset) ? 2 : 0;
  const charismaFactor = Math.floor(state.player.charisma / 10);
  const venueBonus = venue === "luxury-venue" && state.life.lifestyle !== "Poor" ? 2 : venue === "park" ? 1 : 0;
  const delta = clamp(3 + personalityBonus + styleBonus + charismaFactor + venueBonus + Math.floor((relation.value - 20) / 20), -2, 16);
  relation.value = clamp(relation.value + delta, -100, 100);
  relation.romance = clamp(relation.romance + Math.max(1, Math.round(delta / 2)), 0, 100);
  relation.friendship = clamp(relation.friendship + Math.max(1, Math.round(delta / 2)), 0, 100);
  relation.trust = clamp(relation.trust + Math.max(1, Math.round(delta / 3)), 0, 100);
  if (relation.romance >= 25) relation.romanceStage = "interest";
  if (relation.romance >= 45) relation.romanceStage = "dating";
  if (relation.romance >= 65) relation.romanceStage = "relationship";
  relation.status = relationshipStatus(relation.value);
  relation.history.unshift({ id: makeId("date"), interactionType: "date", venue, delta, day: state.time.day, turn: state.time.turn });
  relation.history = relation.history.slice(0, 30);
  if (state.relationshipsFoundation.marriage?.partnerId && state.relationshipsFoundation.marriage.partnerId !== npcId) {
    const spouseRel = ensureRelation(state, state.relationshipsFoundation.marriage.partnerId);
    spouseRel.trust = clamp(spouseRel.trust - 8, 0, 100);
    spouseRel.value = clamp(spouseRel.value - 6, -100, 100);
    spouseRel.history.unshift({
      id: makeId("conflict"),
      interactionType: "jealousy",
      day: state.time.day,
      turn: state.time.turn,
      delta: -6
    });
    spouseRel.history = spouseRel.history.slice(0, 30);
    addGeneralReputation(state, "city", -1);
    addNotification(state, "Social", "Relationship conflict triggered by external romance.", "error");
  }
  setNeeds(state, { hunger: -5, hygiene: -2, mood: Math.max(2, Math.round(delta / 2)) });
  addCalendarEvent(state, { type: "Date", title: `${npc.name} · ${venue}` });
  advanceByMinutes(state, 180);
  state.life.relationshipStatus = relation.romance >= 45 ? "Dating" : state.life.relationshipStatus;
  addNotification(state, "Social", `Date with ${npc.name} complete (${delta >= 0 ? "+" : ""}${delta}).`, delta >= 0 ? "success" : "error");
  return state;
}

export function proposeToNpc(state, npcId) {
  ensureLifeState(state);
  const npc = state.npcs.find((entry) => entry.id === npcId);
  const relation = ensureRelation(state, npcId);
  if (!npc) {
    addNotification(state, "Social", "NPC unavailable.", "error");
    return state;
  }
  if (relation.romance < 70 || relation.trust < 55 || relation.value < 75) {
    addNotification(state, "Social", "Relationship not ready for proposal.", "error");
    return state;
  }
  if (!addWallet(state, -700, "event", `Engagement ring for ${npc.name}`, "expense")) {
    addNotification(state, "Social", "Insufficient money for proposal.", "error");
    return state;
  }
  relation.romanceStage = "engaged";
  state.relationshipsFoundation.partnerId = npcId;
  state.life.relationshipStatus = "Engaged";
  addCalendarEvent(state, { type: "Engagement", title: `Engaged to ${npc.name}` });
  addNotification(state, "Social", `Proposal accepted by ${npc.name}.`, "success");
  return state;
}

export function hostSocialEvent(state, eventType = "party") {
  ensureLifeState(state);
  const eventCost = {
    birthday: 180,
    dinner: 220,
    party: 320,
    "club-night": 360,
    wedding: 1800,
    engagement: 700,
    "house-party": 260,
    "business-event": 500
  }[eventType] ?? 200;
  if (!addWallet(state, -eventCost, "event", `Host ${eventType}`, "expense")) {
    addNotification(state, "Social", "Insufficient funds for event.", "error");
    return state;
  }
  let moodBoost = 5;
  let repBoost = 1;
  if (eventType === "wedding") {
    const partnerId = state.relationshipsFoundation.partnerId;
    const partner = partnerId ? state.npcs.find((entry) => entry.id === partnerId) : null;
    if (!partner || ensureRelation(state, partnerId).romance < 70) {
      addNotification(state, "Social", "Wedding requires an engaged partner.", "error");
      addWallet(state, eventCost, "event", "Refund wedding", "income");
      return state;
    }
    const rel = ensureRelation(state, partnerId);
    rel.status = "Spouse";
    rel.romanceStage = "married";
    state.relationshipsFoundation.marriage = {
      partnerId,
      day: state.time.day,
      month: state.time.month,
      year: state.time.year
    };
    state.life.relationshipStatus = "Married";
    moodBoost = 12;
    repBoost = 3;
  }
  if (eventType === "business-event") repBoost = 2;
  setNeeds(state, { mood: moodBoost, hygiene: -3, hunger: -4 });
  addGeneralReputation(state, "city", repBoost);
  addInfluence(state, 1 + Math.floor(repBoost / 2));
  addCalendarEvent(state, { type: "Event", title: eventType });
  advanceByMinutes(state, eventType === "wedding" ? 420 : 180);
  addNotification(state, "Social", `${eventType} completed.`, "success");
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
  if (blockedByPrison(state)) return state;
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
  if (blockedByPrison(state)) return state;
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
  if (blockedByPrison(state)) return state;
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

export function runJobAction(state, jobId) {
  if (blockedByPrison(state)) return state;
  ensureLifeState(state);
  const job = state.jobs.find((entry) => entry.id === jobId);
  if (!job) {
    addNotification(state, "Work", "Job not found.", "error");
    return state;
  }
  if (state.player.level < job.minLevel) {
    addNotification(state, "Work", `${job.name} unlocks at level ${job.minLevel}.`, "error");
    return state;
  }
  if (state.player.energy < job.energyCost) {
    addNotification(state, "Work", "Insufficient energy for this shift.", "error");
    return state;
  }

  const schedule = job.schedule || { startHour: 9, endHour: 17 };
  const inSchedule = schedule.startHour <= schedule.endHour
    ? state.time.hour >= schedule.startHour && state.time.hour < schedule.endHour
    : state.time.hour >= schedule.startHour || state.time.hour < schedule.endHour;
  const hungerPenalty = state.life.needs.hunger < 30 ? 0.8 : 1;
  const moodPenalty = state.life.needs.mood < 30 ? 0.85 : 1;
  const offSchedulePenalty = inSchedule ? 1 : 0.7;
  const payoutFactor = hungerPenalty * moodPenalty * offSchedulePenalty;
  const payout = Math.max(80, Math.round(job.income * payoutFactor));
  const careerGain = Math.max(8, Math.round((job.careerXp || job.xp || 10) * payoutFactor));

  state.player.energy = clamp(state.player.energy - job.energyCost, 0, 100);
  addWallet(state, payout, "work", `${job.name} shift income`, "income");
  addXP(state, job.xp);
  setNeeds(state, { hunger: -8, hygiene: -4, mood: inSchedule ? 2 : -2 });
  state.life.career.occupation = job.name;
  state.life.occupation = job.name;
  state.life.career.currentJobId = job.id;
  state.life.career.xp += careerGain;
  addCalendarEvent(state, { type: "Work", title: `${job.name} shift` });
  if (job.reputation?.city) addGeneralReputation(state, "city", job.reputation.city);
  if (job.reputation?.street) addGeneralReputation(state, "street", job.reputation.street);
  if (job.reputation?.business) addGeneralReputation(state, "business", job.reputation.business);
  if (job.reputation?.faction) addGeneralReputation(state, "faction", job.reputation.faction);
  state.statistics.actionCounts["job-action"] = (state.statistics.actionCounts["job-action"] || 0) + 1;
  state.statistics.totalActionsCompleted += 1;
  state.daily.dailyJobCount = (state.daily.dailyJobCount || 0) + 1;
  const thresholds = [0, 60, 150, 290, 470, 700];
  let levelIndex = 0;
  for (let i = 0; i < thresholds.length; i += 1) {
    if (state.life.career.xp >= thresholds[i]) levelIndex = i;
  }
  state.life.career.level = CAREER_LEVELS[Math.min(CAREER_LEVELS.length - 1, levelIndex)];
  advanceByMinutes(state, job.durationMinutes || (job.timeCost || 1) * 60);
  evaluatePostAction(state, "action");
  addNotification(state, "Work", `${job.name} completed for $${payout}.`, "success");
  if (!inSchedule) addNotification(state, "Work", "Worked outside schedule: lower effectiveness.", "info");
  return state;
}

export function runCrimeOperation(state, operationId) {
  if (blockedByPrison(state)) return state;
  const operation = state.crimeOperations.find((entry) => entry.id === operationId);
  if (!operation) {
    addNotification(state, "Event", "Operation not found.", "error");
    return state;
  }
  if (state.player.reputation.street < operation.minStreetRep) {
    addNotification(state, "Event", `Need street reputation ${operation.minStreetRep} for ${operation.name}.`, "error");
    return state;
  }
  if (state.player.energy < operation.energyCost) {
    addNotification(state, "Event", "Insufficient energy for operation.", "error");
    return state;
  }

  state.player.energy = clamp(state.player.energy - operation.energyCost, 0, 100);
  const success = seededRandom(state) > operation.risk;
  if (success) {
    addWallet(state, operation.rewardCash, "operation", operation.name, "income");
    addXP(state, operation.rewardXp);
    addGeneralReputation(state, "street", operation.reputationOnSuccess?.street || 0);
    addGeneralReputation(state, "city", operation.reputationOnSuccess?.city || 0);
    addGeneralReputation(state, "business", operation.reputationOnSuccess?.business || 0);
    addGeneralReputation(state, "faction", operation.reputationOnSuccess?.faction || 0);
    addNotification(state, "Event", `${operation.name} succeeded.`, "success");
  } else {
    adjustWanted(state, operation.wantedOnFail || 1);
    state.player.health = clamp(state.player.health + (operation.healthOnFail || -8), 0, 100);
    addXP(state, Math.max(6, Math.round(operation.rewardXp * 0.35)));
    addNotification(state, "Event", `${operation.name} failed. Heat increased.`, "error");
  }

  state.statistics.actionCounts["crime-operation"] = (state.statistics.actionCounts["crime-operation"] || 0) + 1;
  state.statistics.totalActionsCompleted += 1;
  nextTurn(state, 1);
  evaluatePostAction(state, "action");
  return state;
}

export function performPrisonAction(state, actionId) {
  if (!state.prison.active) {
    addNotification(state, "System", "You are not in prison.", "info");
    return state;
  }
  const action = state.prisonActions.find((entry) => entry.id === actionId);
  if (!action) {
    addNotification(state, "System", "Prison action not available.", "error");
    return state;
  }
  if (action.cost && !addWallet(state, -action.cost, "prison", action.name, "expense")) {
    addNotification(state, "Economy", "Insufficient cash for prison action.", "error");
    return state;
  }
  if (action.energyChange) state.player.energy = clamp(state.player.energy + action.energyChange, 0, 100);
  if (action.reputation?.city) addGeneralReputation(state, "city", action.reputation.city);
  if (action.reputation?.street) addGeneralReputation(state, "street", action.reputation.street);
  if (action.reputation?.faction) addGeneralReputation(state, "faction", action.reputation.faction);
  if (action.wantedDelta) adjustWanted(state, action.wantedDelta);
  state.prison.remainingTurns = Math.max(0, state.prison.remainingTurns - (action.turnsReduced || 1));
  if (state.prison.remainingTurns === 0) {
    state.prison.active = false;
    state.prison.reason = null;
    addNotification(state, "System", "Prison sentence completed.", "success");
  } else {
    addNotification(state, "System", `${action.name} used. ${state.prison.remainingTurns} turn(s) remain.`, "info");
  }
  nextTurn(state, 1);
  refreshQuests(state);
  refreshAchievements(state);
  return state;
}

export function requestCredit(state, amount = BALANCE.credit.minRequest) {
  const min = BALANCE.credit.minRequest;
  const requestAmount = Math.max(min, Math.round(Number(amount) || min));
  state.credit.creditLimit = stateCreditLimitForLevel(state.player.level);
  const available = Math.max(0, state.credit.creditLimit - state.credit.debt);
  if (requestAmount > available) {
    addNotification(state, "Economy", `Credit request denied. Available: $${available}.`, "error");
    return state;
  }
  state.credit.debt += requestAmount;
  addWallet(state, requestAmount, "credit", "Credit payout", "income");
  addNotification(state, "Economy", `Credit approved: $${requestAmount}.`, "success");
  return state;
}

export function repayCredit(state, amount = BALANCE.credit.minRepay) {
  if (!state.credit.debt) {
    addNotification(state, "Economy", "No outstanding debt.", "info");
    return state;
  }
  const repay = Math.max(BALANCE.credit.minRepay, Math.round(Number(amount) || BALANCE.credit.minRepay));
  const payment = Math.min(repay, state.credit.debt);
  if (!addWallet(state, -payment, "credit", "Credit repayment", "expense")) {
    addNotification(state, "Economy", "Insufficient cash for repayment.", "error");
    return state;
  }
  state.credit.debt = Math.max(0, state.credit.debt - payment);
  addNotification(state, "Economy", `Debt repaid: $${payment}.`, "success");
  return state;
}

export function claimDailyQuestReward(state, questId) {
  const quest = (state.daily.quests || []).find((entry) => entry.id === questId);
  if (!quest) {
    addNotification(state, "Quest", "Daily quest not found.", "error");
    return state;
  }
  if (!quest.completed) {
    addNotification(state, "Quest", "Daily quest not yet complete.", "info");
    return state;
  }
  if (quest.claimed) {
    addNotification(state, "Quest", "Daily quest reward already claimed.", "info");
    return state;
  }
  quest.claimed = true;
  applyQuestRewards(state, quest.rewards || {});
  addNotification(state, "Quest", `Daily reward claimed: ${quest.title}.`, "success");
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
  if (state.world) state.world.currentInteriorId = null;
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

export function getJobs(state) {
  return state.jobs;
}

export function getCrimeOperations(state) {
  return state.crimeOperations;
}
