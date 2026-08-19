export const TURNS_PER_DAY = 6;
export const LEVEL_XP_BASE = 120;

export const DISTRICTS = [
  {
    id: "downtown",
    name: "Downtown",
    description: "Glass towers, velvet rooftops, and endless after-hours deals.",
    atmosphere: "Luxury skyline wrapped in danger.",
    travelCost: 120,
    travelTurns: 1,
    dangerModifier: 1,
    reputationModifier: 0,
    locations: ["nightclub", "casino", "bank", "restaurant"]
  },
  {
    id: "old-town",
    name: "Old Town",
    description: "Stone alleys where every favor has a memory.",
    atmosphere: "Historic glamour and quiet grudges.",
    travelCost: 80,
    travelTurns: 1,
    dangerModifier: 0,
    reputationModifier: 1,
    locations: ["market", "safehouse", "restaurant"]
  },
  {
    id: "harbor",
    name: "Harbor",
    description: "Foggy docks, private shipments, and cash-only arrangements.",
    atmosphere: "Cold air and hidden cargo.",
    travelCost: 100,
    travelTurns: 1,
    dangerModifier: 1,
    reputationModifier: 0,
    locations: ["garage", "market", "underground-club"]
  },
  {
    id: "industrial-district",
    name: "Industrial District",
    description: "Factories by day, covert operations by night.",
    atmosphere: "Steel, smoke, and opportunity.",
    travelCost: 90,
    travelTurns: 1,
    dangerModifier: 1,
    reputationModifier: 0,
    locations: ["garage", "police-station", "market"]
  },
  {
    id: "rich-district",
    name: "Rich District",
    description: "Black marble villas and heavily guarded wealth.",
    atmosphere: "Expensive, elegant, and unforgiving.",
    travelCost: 150,
    travelTurns: 1,
    dangerModifier: 0,
    reputationModifier: 1,
    locations: ["casino", "nightclub", "bank"]
  },
  {
    id: "underground-district",
    name: "Underground District",
    description: "Hidden lounges and dangerous power brokers.",
    atmosphere: "Dark plum shadows and whispered threats.",
    travelCost: 110,
    travelTurns: 1,
    dangerModifier: 2,
    reputationModifier: 2,
    locations: ["underground-club", "nightclub", "safehouse"]
  }
];

export const LOCATIONS = {
  nightclub: {
    id: "nightclub",
    name: "Nightclub",
    description: "Muted gold lighting, velvet corners, and the city's hottest rumors.",
    actions: [
      { id: "nightclub-socialize", name: "Socialize", type: "socialize", energyCost: 8, xpGain: 24, reputationGain: 3, cashDelta: 0 },
      { id: "nightclub-work", name: "Work VIP Floor", type: "work", energyCost: 12, xpGain: 30, reputationGain: 4, cashDelta: 380 },
      { id: "nightclub-meet", name: "Meet NPC", type: "meet-npc", energyCost: 6, xpGain: 18, reputationGain: 2, cashDelta: 0 },
      { id: "location-leave", name: "Leave", type: "leave", energyCost: 0, xpGain: 0, reputationGain: 0, cashDelta: 0 }
    ]
  },
  casino: {
    id: "casino",
    name: "Casino",
    description: "Silver chips, private tables, and high-stakes confidence.",
    actions: [
      { id: "casino-play", name: "Play High Table", type: "casino-play", energyCost: 7, xpGain: 20, reputationGain: 2, cashDelta: 0 },
      { id: "casino-host", name: "Host Big Spender", type: "work", energyCost: 10, xpGain: 22, reputationGain: 3, cashDelta: 260 },
      { id: "location-leave", name: "Leave", type: "leave", energyCost: 0, xpGain: 0, reputationGain: 0, cashDelta: 0 }
    ]
  },
  bank: {
    id: "bank",
    name: "Bank",
    description: "Secure vaults and polished counters. Money never sleeps here.",
    actions: [
      { id: "bank-view", name: "View Balance", type: "bank-view", energyCost: 0, xpGain: 6, reputationGain: 0, cashDelta: 0 },
      { id: "bank-deposit", name: "Deposit $200", type: "bank-deposit", energyCost: 1, xpGain: 10, reputationGain: 1, cashDelta: -200 },
      { id: "bank-withdraw", name: "Withdraw $200", type: "bank-withdraw", energyCost: 1, xpGain: 8, reputationGain: 0, cashDelta: 200 },
      { id: "location-leave", name: "Leave", type: "leave", energyCost: 0, xpGain: 0, reputationGain: 0, cashDelta: 0 }
    ]
  },
  safehouse: {
    id: "safehouse",
    name: "Safehouse",
    description: "Your secured home base with reinforced doors and quiet rooms.",
    actions: [
      { id: "safehouse-rest", name: "Rest", type: "safehouse-rest", energyCost: 0, xpGain: 12, reputationGain: 0, cashDelta: 0 },
      { id: "safehouse-recover", name: "Recover Energy", type: "safehouse-recover", energyCost: 0, xpGain: 6, reputationGain: 0, cashDelta: 0 },
      { id: "safehouse-inventory", name: "View Inventory", type: "inventory-view", energyCost: 0, xpGain: 0, reputationGain: 0, cashDelta: 0 },
      { id: "location-leave", name: "Leave", type: "leave", energyCost: 0, xpGain: 0, reputationGain: 0, cashDelta: 0 }
    ]
  },
  market: {
    id: "market",
    name: "Market",
    description: "A crowded exchange of goods, gossip, and quick bargains.",
    actions: [
      { id: "market-buy-medkit", name: "Buy Medkit ($150)", type: "market-buy", itemId: "medkit", energyCost: 1, xpGain: 8, reputationGain: 0, cashDelta: -150 },
      { id: "market-buy-snack", name: "Buy Energy Drink ($60)", type: "market-buy", itemId: "energy-drink", energyCost: 1, xpGain: 6, reputationGain: 0, cashDelta: -60 },
      { id: "market-sell-watch", name: "Sell Silver Watch (+$170)", type: "market-sell", itemId: "silver-watch", energyCost: 1, xpGain: 6, reputationGain: 0, cashDelta: 170 },
      { id: "location-leave", name: "Leave", type: "leave", energyCost: 0, xpGain: 0, reputationGain: 0, cashDelta: 0 }
    ]
  },
  garage: {
    id: "garage",
    name: "Garage",
    description: "Your transport options and custom rides line the dark bay.",
    actions: [
      { id: "garage-view", name: "View Transport", type: "garage-view", energyCost: 0, xpGain: 4, reputationGain: 0, cashDelta: 0 },
      { id: "garage-select", name: "Select Next Vehicle", type: "garage-cycle", energyCost: 0, xpGain: 4, reputationGain: 0, cashDelta: 0 },
      { id: "location-leave", name: "Leave", type: "leave", energyCost: 0, xpGain: 0, reputationGain: 0, cashDelta: 0 }
    ]
  },
  "police-station": {
    id: "police-station",
    name: "Police Station",
    description: "Watchlists, wanted boards, and controlled tension.",
    actions: [
      { id: "police-status", name: "View Wanted Status", type: "police-status", energyCost: 2, xpGain: 8, reputationGain: -1, cashDelta: 0 },
      { id: "location-leave", name: "Leave", type: "leave", energyCost: 0, xpGain: 0, reputationGain: 0, cashDelta: 0 }
    ]
  },
  restaurant: {
    id: "restaurant",
    name: "Restaurant",
    description: "Fine dining where alliances are served with rare vintages.",
    actions: [
      { id: "restaurant-host", name: "Host Dinner", type: "socialize", energyCost: 6, xpGain: 18, reputationGain: 2, cashDelta: -120 },
      { id: "restaurant-owner", name: "Meet Business Owner", type: "meet-owner", energyCost: 5, xpGain: 16, reputationGain: 2, cashDelta: 0 },
      { id: "location-leave", name: "Leave", type: "leave", energyCost: 0, xpGain: 0, reputationGain: 0, cashDelta: 0 }
    ]
  },
  "underground-club": {
    id: "underground-club",
    name: "Underground Club",
    description: "No cameras, no records, and every deal has a cost.",
    actions: [
      { id: "underground-deal", name: "Run Backroom Deal", type: "risky-deal", energyCost: 10, xpGain: 28, reputationGain: 5, cashDelta: 420 },
      { id: "underground-fixer", name: "Talk to Fixer", type: "talk", energyCost: 4, xpGain: 12, reputationGain: 2, cashDelta: 0 },
      { id: "location-leave", name: "Leave", type: "leave", energyCost: 0, xpGain: 0, reputationGain: 0, cashDelta: 0 }
    ]
  }
};

export const STARTER_ITEMS = [
  {
    id: "burner-phone",
    name: "Burner Phone",
    category: "utility",
    quantity: 1,
    description: "Untraceable line for quiet deals.",
    usable: false
  },
  {
    id: "energy-drink",
    name: "Energy Drink",
    category: "consumable",
    quantity: 2,
    description: "Restores 20 energy.",
    usable: true,
    effects: { energy: 20 }
  },
  {
    id: "silver-watch",
    name: "Silver Watch",
    category: "valuable",
    quantity: 1,
    description: "A tradable luxury item.",
    usable: false
  }
];

export const VEHICLES = [
  { id: "old-sedan", name: "Old Sedan", price: 0, travelCost: 90, speed: 1, owned: true },
  { id: "sport-coupe", name: "Sport Coupe", price: 7000, travelCost: 70, speed: 2, owned: false },
  { id: "luxury-suv", name: "Luxury SUV", price: 12000, travelCost: 55, speed: 2, owned: false },
  { id: "motorcycle", name: "Motorcycle", price: 4000, travelCost: 60, speed: 3, owned: false }
];

export const NPCS = [
  { id: "npc-citizen-1", name: "Marta Rios", role: "citizen", locationId: "market", relationshipValue: 0 },
  { id: "npc-bartender-1", name: "Silas Kane", role: "bartender", locationId: "nightclub", relationshipValue: 0 },
  { id: "npc-dealer-1", name: "Niko Vale", role: "dealer", locationId: "underground-club", relationshipValue: 0 },
  { id: "npc-owner-1", name: "Alina Costa", role: "business owner", locationId: "restaurant", relationshipValue: 0 },
  { id: "npc-fixer-1", name: "Victor Shade", role: "fixer", locationId: "underground-club", relationshipValue: 0 },
  { id: "npc-police-1", name: "Officer Grant", role: "police officer", locationId: "police-station", relationshipValue: 0 },
  { id: "npc-gang-1", name: "Rex Morrow", role: "gang member", locationId: "garage", relationshipValue: 0 }
];

export const FACTIONS = [
  { id: "velvet-syndicate", name: "Velvet Syndicate", description: "Elegant influence with ruthless execution.", influence: 68, playerReputation: 0 },
  { id: "iron-union", name: "Iron Union", description: "Dock and industry network with deep reach.", influence: 54, playerReputation: 0 },
  { id: "midnight-circle", name: "Midnight Circle", description: "Underground brokers and information traders.", influence: 61, playerReputation: 0 }
];

export const BUSINESSES = [
  { id: "biz-nightclub", name: "Nightclub", type: "entertainment", value: 60000, income: 1200, reputation: 0, owned: false },
  { id: "biz-restaurant", name: "Restaurant", type: "hospitality", value: 40000, income: 800, reputation: 0, owned: false },
  { id: "biz-garage", name: "Garage", type: "transport", value: 35000, income: 700, reputation: 0, owned: false },
  { id: "biz-casino", name: "Casino", type: "gaming", value: 90000, income: 1800, reputation: 0, owned: false },
  { id: "biz-security", name: "Security Company", type: "services", value: 50000, income: 950, reputation: 0, owned: false }
];

export const QUESTS = [
  {
    id: "quest-first-night",
    title: "First Night",
    description: "Visit the Nightclub.",
    objectiveType: "visit-location",
    target: "nightclub",
    progress: 0,
    goal: 1,
    reward: { cash: 500, xp: 30, reputation: 3 },
    completed: false
  },
  {
    id: "quest-know-city",
    title: "Know the City",
    description: "Visit three different districts.",
    objectiveType: "visit-districts",
    target: 3,
    progress: 0,
    goal: 3,
    reward: { cash: 700, xp: 45, reputation: 4 },
    completed: false
  },
  {
    id: "quest-connections",
    title: "Connections",
    description: "Interact with one NPC.",
    objectiveType: "npc-interaction",
    target: 1,
    progress: 0,
    goal: 1,
    reward: { cash: 400, xp: 25, reputation: 3 },
    completed: false
  },
  {
    id: "quest-investment",
    title: "First Investment",
    description: "Deposit money in the bank.",
    objectiveType: "bank-deposit",
    target: 1,
    progress: 0,
    goal: 1,
    reward: { cash: 600, xp: 30, reputation: 2 },
    completed: false
  },
  {
    id: "quest-influence",
    title: "Building Influence",
    description: "Reach reputation 20.",
    objectiveType: "reach-reputation",
    target: 20,
    progress: 0,
    goal: 20,
    reward: { cash: 1000, xp: 55, reputation: 5 },
    completed: false
  }
];

export const ACHIEVEMENTS = [
  { id: "ach-first-visit", title: "First Visit", description: "Enter your first location.", type: "enter-location", target: 1 },
  { id: "ach-first-thousand", title: "First Thousand", description: "Hold at least $1,000 wallet cash.", type: "wallet", target: 1000 },
  { id: "ach-first-district", title: "First District", description: "Travel to a new district.", type: "districts-visited", target: 2 },
  { id: "ach-first-interaction", title: "First Interaction", description: "Complete an NPC interaction.", type: "npc-interaction", target: 1 },
  { id: "ach-first-business", title: "First Business", description: "Perform a business operation.", type: "business-action", target: 1 },
  { id: "ach-rising-reputation", title: "Rising Reputation", description: "Reach reputation 15.", type: "reputation", target: 15 }
];

export const RANDOM_EVENTS = [
  {
    id: "event-customer",
    title: "Unexpected Customer",
    description: "A wealthy newcomer paid for priority access.",
    effect: { cash: 120, reputation: 1 }
  },
  {
    id: "event-inspection",
    title: "Police Inspection",
    description: "Routine checks slowed your operations.",
    effect: { cash: -90, reputation: -1 }
  },
  {
    id: "event-opportunity",
    title: "Business Opportunity",
    description: "A quick contract boosted your standing.",
    effect: { cash: 160, reputation: 2 }
  },
  {
    id: "event-encounter",
    title: "Street Encounter",
    description: "A tense encounter cost you extra focus.",
    effect: { energy: -8 }
  },
  {
    id: "event-small-reward",
    title: "Small Reward",
    description: "A grateful contact sent a small reward.",
    effect: { cash: 80 }
  },
  {
    id: "event-minor-expense",
    title: "Minor Expense",
    description: "Unexpected maintenance reduced your cash.",
    effect: { cash: -70 }
  }
];
