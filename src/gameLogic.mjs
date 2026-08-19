export const DISTRICTS = [
  {
    id: "gold-coast",
    name: "Gold Coast",
    vibe: "Luxury towers and discreet clubs.",
    heat: 12,
    control: 18,
    locations: [
      {
        id: "velvet-casino",
        name: "Velvet Casino",
        description: "High rollers, silent deals, and private rooms.",
        actions: [
          { id: "run-cards", name: "Rig VIP tables", energy: 10, cash: 220, reputation: 5, heat: 4 },
          { id: "launder-chips", name: "Launder chip stacks", energy: 8, cash: 170, reputation: 3, heat: 3 }
        ]
      },
      {
        id: "obsidian-lounge",
        name: "Obsidian Lounge",
        description: "Deep burgundy booths for whispered alliances.",
        actions: [
          { id: "host-gala", name: "Host hidden gala", energy: 12, cash: 260, reputation: 8, heat: 6 }
        ]
      }
    ]
  },
  {
    id: "iron-docks",
    name: "Iron Docks",
    vibe: "Cargo cranes, cold rain, and silver ships.",
    heat: 18,
    control: 12,
    locations: [
      {
        id: "night-pier",
        name: "Night Pier",
        description: "Midnight shipments through black water.",
        actions: [
          { id: "secure-cargo", name: "Secure hidden cargo", energy: 11, cash: 240, reputation: 4, heat: 5 },
          { id: "bribe-customs", name: "Bribe customs", energy: 7, cash: 120, reputation: 2, heat: -2 }
        ]
      },
      {
        id: "dry-dock-7",
        name: "Dry Dock VII",
        description: "Silent refits and armored convoys.",
        actions: [
          { id: "escort-convoy", name: "Escort luxury convoy", energy: 13, cash: 300, reputation: 7, heat: 6 }
        ]
      }
    ]
  },
  {
    id: "violet-heights",
    name: "Violet Heights",
    vibe: "Dark plum rooftops and old-money estates.",
    heat: 10,
    control: 20,
    locations: [
      {
        id: "marble-manor",
        name: "Marble Manor",
        description: "Where alliances are sealed over crystal glasses.",
        actions: [
          { id: "broker-truce", name: "Broker faction truce", energy: 9, cash: 150, reputation: 10, heat: 1 }
        ]
      },
      {
        id: "crown-garden",
        name: "Crown Garden",
        description: "Private auctions for rare influence.",
        actions: [
          { id: "shadow-auction", name: "Run shadow auction", energy: 12, cash: 280, reputation: 6, heat: 4 }
        ]
      }
    ]
  }
];

const LEVEL_THRESHOLD = 120;

export function createInitialState() {
  return {
    currentScreen: "city",
    selectedDistrictId: DISTRICTS[0].id,
    day: 1,
    player: {
      alias: "La Sombra",
      level: 1,
      reputation: 20,
      cash: 1000,
      health: 90,
      energy: 100,
      safehouseLevel: 1
    },
    districts: structuredClone(DISTRICTS),
    notifications: [
      {
        id: makeId(),
        type: "info",
        text: "Welcome to NARCOS CITY. Build your empire quietly.",
        createdAt: Date.now()
      }
    ]
  };
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function addNotification(state, text, type = "info") {
  state.notifications.unshift({ id: makeId(), type, text, createdAt: Date.now() });
  state.notifications = state.notifications.slice(0, 40);
}

function applyLeveling(player, state) {
  while (player.reputation >= player.level * LEVEL_THRESHOLD) {
    player.level += 1;
    player.health = Math.min(100, player.health + 12);
    player.energy = Math.min(100, player.energy + 20);
    addNotification(state, `Level up. You are now level ${player.level}.`, "success");
  }
}

export function navigateTo(state, screen) {
  state.currentScreen = screen;
  return state;
}

export function travelToDistrict(state, districtId) {
  const district = state.districts.find((d) => d.id === districtId);
  if (!district) {
    addNotification(state, "District not found.", "error");
    return state;
  }
  state.selectedDistrictId = districtId;
  state.day += 1;
  state.player.energy = Math.max(0, state.player.energy - 2);
  addNotification(state, `Arrived in ${district.name}.`, "info");
  return state;
}

export function performLocationAction(state, districtId, locationId, actionId) {
  const district = state.districts.find((d) => d.id === districtId);
  const location = district?.locations.find((l) => l.id === locationId);
  const action = location?.actions.find((a) => a.id === actionId);

  if (!action) {
    addNotification(state, "Action unavailable.", "error");
    return state;
  }

  if (state.player.energy < action.energy) {
    addNotification(state, "Not enough energy. Recover in safehouse.", "error");
    return state;
  }

  state.player.energy -= action.energy;
  state.player.cash += action.cash;
  state.player.reputation += action.reputation;
  district.heat = Math.max(0, district.heat + action.heat);
  district.control = Math.min(100, district.control + Math.max(1, Math.round(action.reputation / 2)));
  state.day += 1;

  if (district.heat > 75) {
    state.player.health = Math.max(20, state.player.health - 10);
    addNotification(state, `${district.name} is too hot. You took damage avoiding authorities.`, "error");
  }

  applyLeveling(state.player, state);
  addNotification(state, `${action.name} completed in ${location.name}. +$${action.cash}`, "success");
  return state;
}

export function safehouseRest(state) {
  state.day += 1;
  const energyBoost = 24 + state.player.safehouseLevel * 6;
  const healthBoost = 10 + state.player.safehouseLevel * 3;
  state.player.energy = Math.min(100, state.player.energy + energyBoost);
  state.player.health = Math.min(100, state.player.health + healthBoost);
  addNotification(state, "You recovered at the safehouse.", "success");
  return state;
}

export function upgradeSafehouse(state) {
  const cost = state.player.safehouseLevel * 900;
  if (state.player.cash < cost) {
    addNotification(state, `Need $${cost} to upgrade safehouse.`, "error");
    return state;
  }
  state.player.cash -= cost;
  state.player.safehouseLevel += 1;
  state.player.health = Math.min(100, state.player.health + 8);
  addNotification(state, `Safehouse upgraded to level ${state.player.safehouseLevel}.`, "success");
  return state;
}

export function coolDistrictHeat(state, districtId) {
  const district = state.districts.find((d) => d.id === districtId);
  if (!district) {
    addNotification(state, "District not found.", "error");
    return state;
  }
  if (state.player.cash < 180) {
    addNotification(state, "Need $180 for cleanup operation.", "error");
    return state;
  }
  state.player.cash -= 180;
  district.heat = Math.max(0, district.heat - 16);
  state.day += 1;
  addNotification(state, `Cleanup in ${district.name} lowered heat.`, "success");
  return state;
}

export function getSelectedDistrict(state) {
  return state.districts.find((d) => d.id === state.selectedDistrictId) || state.districts[0];
}
