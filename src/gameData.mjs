export const SAVE_VERSION = 5;
export const TURNS_PER_DAY = 8;

export const BALANCE = {
  xpBasePerLevel: 120,
  energy: {
    travelCost: 6,
    moveCost: 3,
    socialCost: 5,
    workCost: 9,
    restRecover: 40,
    recoverEnergy: 30,
    locationRestBonus: 10
  },
  health: {
    restRecover: 22,
    medicalHeal: 28
  },
  reputation: {
    cityHelp: 3,
    streetAction: 4,
    businessAction: 3,
    factionAction: 4
  },
  wanted: {
    maxLevel: 5,
    riskyActionGain: 1,
    policeEventGain: 1,
    cooldownActionCost: 350,
    cooldownReduction: 1
  },
  travel: {
    minCost: 40,
    policeRiskBaseChance: 0.08,
    wantedRiskPerLevel: 0.08
  },
  bank: {
    depositMinimum: 50,
    withdrawMinimum: 50
  },
  credit: {
    maxCreditByLevel: 1800,
    dailyInterestRate: 0.02,
    minRequest: 300,
    minRepay: 100
  },
  casino: {
    dailyBetLimit: 2000,
    minBet: 50,
    maxBet: 500,
    payoutMultiplier: {
      coinFlip: 1,
      highLow: 1.2,
      simpleDice: 1.5
    }
  },
  rewards: {
    dailyReward: 350,
    eventCashSmall: 120,
    eventCashLarge: 320
  }
};

export const TITLE_RANKS = [
  { id: "queen", name: "Queen", level: 1, xpTotal: 0, influence: 0, reputation: 0, streetReputation: 0 },
  { id: "resident", name: "Resident", level: 2, xpTotal: 120, influence: 10, reputation: 8, streetReputation: 6 },
  { id: "street-player", name: "Street Player", level: 3, xpTotal: 280, influence: 18, reputation: 15, streetReputation: 12 },
  { id: "influencer", name: "Influencer", level: 4, xpTotal: 460, influence: 28, reputation: 24, streetReputation: 20 },
  { id: "operator", name: "Operator", level: 5, xpTotal: 700, influence: 40, reputation: 34, streetReputation: 30 },
  { id: "boss", name: "Boss", level: 6, xpTotal: 980, influence: 55, reputation: 46, streetReputation: 40 },
  { id: "crime-lord", name: "Crime Lord", level: 7, xpTotal: 1320, influence: 70, reputation: 58, streetReputation: 50 },
  { id: "kingpin", name: "Kingpin", level: 8, xpTotal: 1700, influence: 84, reputation: 72, streetReputation: 62 },
  { id: "legend", name: "Legend", level: 10, xpTotal: 2300, influence: 100, reputation: 88, streetReputation: 76 }
];

export const DISTRICTS = [
  {
    id: "downtown",
    name: "DOWNTOWN",
    description: "Luxury towers, city banks, and endless business dinners.",
    atmosphere: "Polished power with hidden leverage.",
    dangerLevel: 2,
    wealthLevel: 5,
    reputationRequirement: 0,
    travelCost: 80,
    travelTime: 1,
    locations: ["bank", "restaurant", "hotel", "shopping-area"],
    npcs: ["npc-banker-1", "npc-restaurant-owner-1", "npc-journalist-1"],
    randomEvents: ["event-business-opportunity", "event-citizen-help"],
    availableQuests: ["story-01", "story-02", "quest-first-savings"]
  },
  {
    id: "old-town",
    name: "OLD TOWN",
    description: "Historic markets where every introduction is remembered.",
    atmosphere: "Warm lights, old loyalties, and careful bargains.",
    dangerLevel: 2,
    wealthLevel: 3,
    reputationRequirement: 4,
    travelCost: 70,
    travelTime: 1,
    locations: ["market", "bar", "safehouse", "small-businesses"],
    npcs: ["npc-bartender-1", "npc-street-trader-1", "npc-hotel-manager-1"],
    randomEvents: ["event-friendly-tip", "event-supply-shortage"],
    availableQuests: ["story-03", "quest-make-contact"]
  },
  {
    id: "harbor",
    name: "HARBOR",
    description: "Cargo lanes, fog, and contacts who only trust cash.",
    atmosphere: "Cold deals and fast exits.",
    dangerLevel: 3,
    wealthLevel: 3,
    reputationRequirement: 8,
    travelCost: 95,
    travelTime: 1,
    locations: ["warehouse", "docks", "garage", "night-venue"],
    npcs: ["npc-mechanic-1", "npc-faction-member-1", "npc-police-1"],
    randomEvents: ["event-police-check", "event-smuggling-opportunity"],
    availableQuests: ["story-04", "story-05", "quest-harbor-route"]
  },
  {
    id: "industrial",
    name: "INDUSTRIAL",
    description: "Factories and workshops powering legal and gray markets.",
    atmosphere: "Steel noise and hard leverage.",
    dangerLevel: 3,
    wealthLevel: 2,
    reputationRequirement: 12,
    travelCost: 100,
    travelTime: 1,
    locations: ["factory", "garage", "warehouse", "underground-venue"],
    npcs: ["npc-security-boss-1", "npc-mechanic-2", "npc-investor-1"],
    randomEvents: ["event-equipment-failure", "event-labor-deal"],
    availableQuests: ["story-06", "quest-tools-up"]
  },
  {
    id: "rich-district",
    name: "LUXURY DISTRICT",
    description: "Private clubs and estates where influence is currency.",
    atmosphere: "Velvet luxury with strict gatekeepers.",
    dangerLevel: 2,
    wealthLevel: 5,
    reputationRequirement: 18,
    travelCost: 140,
    travelTime: 1,
    locations: ["luxury-club", "mansion", "high-end-restaurant", "private-casino"],
    npcs: ["npc-casino-manager-1", "npc-investor-2", "npc-security-boss-2"],
    randomEvents: ["event-elite-introduction", "event-expensive-night"],
    availableQuests: ["story-07", "story-08", "quest-grow-influence"]
  },
  {
    id: "underground",
    name: "NIGHTLIFE DISTRICT",
    description: "Hidden clubs, fixers, and faction headquarters.",
    atmosphere: "Dark prestige with constant risk.",
    dangerLevel: 5,
    wealthLevel: 4,
    reputationRequirement: 24,
    travelCost: 120,
    travelTime: 1,
    locations: ["underground-club", "fixer", "black-market", "faction-headquarters"],
    npcs: ["npc-fixer-1", "npc-underground-contact-1", "npc-nightclub-owner-1"],
    randomEvents: ["event-faction-offer", "event-ambush"],
    availableQuests: ["story-09", "story-10", "quest-faction-standing"]
  },
  {
    id: "residential",
    name: "RESIDENTIAL DISTRICT",
    description: "Apartments, family blocks, and low-profile side streets.",
    atmosphere: "Quiet routines with local influence beneath the surface.",
    dangerLevel: 2,
    wealthLevel: 2,
    reputationRequirement: 6,
    travelCost: 78,
    travelTime: 1,
    locations: ["residential-hub", "community-center", "market", "safehouse"],
    npcs: ["npc-street-trader-1", "npc-hotel-manager-1"],
    randomEvents: ["event-citizen-help", "event-friendly-tip"],
    availableQuests: ["quest-make-contact"]
  },
  {
    id: "safehouse-area",
    name: "SAFEHOUSE AREA",
    description: "Defensible blocks built around trusted homes and fallback routes.",
    atmosphere: "Controlled access, secure storage, and strategic calm.",
    dangerLevel: 3,
    wealthLevel: 3,
    reputationRequirement: 10,
    travelCost: 88,
    travelTime: 1,
    locations: ["safehouse-compound", "training-yard", "garage", "warehouse"],
    npcs: ["npc-underground-contact-1", "npc-security-boss-1"],
    randomEvents: ["event-police-check", "event-business-opportunity"],
    availableQuests: ["quest-tools-up"]
  }
];

export const LOCATIONS = {
  bank: {
    id: "bank",
    districtId: "downtown",
    name: "Bank",
    description: "Secure accounts and discreet advisory rooms.",
    requirements: { cityReputation: 0 },
    actions: [
      { id: "bank-deposit", name: "Deposit $200", type: "bank-deposit", amount: 200, energyCost: 1, xpGain: 8 },
      { id: "bank-withdraw", name: "Withdraw $200", type: "bank-withdraw", amount: 200, energyCost: 1, xpGain: 6 },
      { id: "bank-invest", name: "Meet Banker", type: "social", reward: { influence: 1, cityReputation: 1 }, energyCost: 4, xpGain: 12 }
    ],
    npcs: ["npc-banker-1"],
    rewards: { cityReputation: 1 },
    possibleEvents: ["event-business-opportunity"]
  },
  restaurant: {
    id: "restaurant",
    districtId: "downtown",
    name: "Restaurant",
    description: "Business dinners shape alliances here.",
    requirements: { cityReputation: 0 },
    actions: [
      { id: "restaurant-host", name: "Host Dinner", type: "social", cost: 140, reward: { charisma: 2, relationship: 2, cityReputation: 1 }, energyCost: 5, xpGain: 14 },
      { id: "restaurant-network", name: "Network Table", type: "city-action", reward: { influence: 2, cityReputation: 2 }, energyCost: 6, xpGain: 16 }
    ],
    npcs: ["npc-restaurant-owner-1", "npc-journalist-1"],
    rewards: { cityReputation: 2 },
    possibleEvents: ["event-friendly-tip"]
  },
  hotel: {
    id: "hotel",
    districtId: "downtown",
    name: "Hotel",
    description: "High-profile suites with premium service.",
    requirements: { cityReputation: 2 },
    actions: [
      { id: "hotel-rest", name: "Premium Rest", type: "rest", cost: 180, reward: { energy: 30, health: 12 }, energyCost: 0, xpGain: 12 },
      { id: "hotel-meet", name: "Meet Manager", type: "social", reward: { relationship: 3, cityReputation: 1 }, energyCost: 3, xpGain: 10 }
    ],
    npcs: ["npc-hotel-manager-1"],
    rewards: { cityReputation: 1 },
    possibleEvents: ["event-elite-introduction"]
  },
  "shopping-area": {
    id: "shopping-area",
    districtId: "downtown",
    name: "Shopping Area",
    description: "Designer shops and discreet retailers.",
    requirements: { cityReputation: 0 },
    actions: [
      { id: "shopping-browse", name: "Browse Luxury", type: "social", reward: { charisma: 1 }, energyCost: 2, xpGain: 6 },
      { id: "shopping-buy-luxury", name: "Buy Luxury Gift", type: "market-buy", itemId: "gold-cufflinks", cost: 420, energyCost: 1, xpGain: 8 }
    ],
    npcs: ["npc-investor-1"],
    rewards: { cityReputation: 1 },
    possibleEvents: ["event-expensive-night"]
  },
  market: {
    id: "market",
    districtId: "old-town",
    name: "Market",
    description: "Open-air stalls full of consumables and tools.",
    requirements: { streetReputation: 0 },
    actions: [
      { id: "market-buy-food", name: "Buy Street Meal", type: "market-buy", itemId: "street-meal", cost: 80, energyCost: 1, xpGain: 4 },
      { id: "market-buy-med", name: "Buy Medkit", type: "market-buy", itemId: "medkit", cost: 160, energyCost: 1, xpGain: 6 },
      { id: "market-buy-tool", name: "Buy Tool Kit", type: "market-buy", itemId: "tool-kit", cost: 300, energyCost: 1, xpGain: 8 }
    ],
    npcs: ["npc-street-trader-1"],
    rewards: { streetReputation: 1 },
    possibleEvents: ["event-citizen-help"]
  },
  bar: {
    id: "bar",
    districtId: "old-town",
    name: "Bar",
    description: "Old district hotspot for rumors and introductions.",
    requirements: { streetReputation: 2 },
    actions: [
      { id: "bar-social", name: "Socialize", type: "social", cost: 90, reward: { charisma: 2, relationship: 2 }, energyCost: 4, xpGain: 12 },
      { id: "bar-help", name: "Help Citizens", type: "city-action", reward: { cityReputation: 2, streetReputation: 1 }, energyCost: 5, xpGain: 14 }
    ],
    npcs: ["npc-bartender-1", "npc-journalist-1"],
    rewards: { cityReputation: 2 },
    possibleEvents: ["event-friendly-tip"]
  },
  safehouse: {
    id: "safehouse",
    districtId: "old-town",
    name: "Safehouse",
    description: "Your secure point to recover and regroup.",
    requirements: { cityReputation: 0 },
    actions: [
      { id: "safehouse-rest", name: "Rest", type: "rest", reward: { energy: 40, health: 20 }, energyCost: 0, xpGain: 10 },
      { id: "safehouse-recover", name: "Recover Energy", type: "rest", reward: { energy: 28 }, energyCost: 0, xpGain: 6 },
      { id: "safehouse-cooldown", name: "Reduce Wanted", type: "reduce-wanted", cost: 350, energyCost: 0, xpGain: 8 }
    ],
    npcs: ["npc-underground-contact-1"],
    rewards: { cityReputation: 0 },
    possibleEvents: ["event-friendly-tip"]
  },
  "small-businesses": {
    id: "small-businesses",
    districtId: "old-town",
    name: "Small Businesses",
    description: "Family-run shops with hidden commercial potential.",
    requirements: { businessReputation: 0 },
    actions: [
      { id: "smallbiz-support", name: "Support Local Trade", type: "business-action", reward: { businessReputation: 2, influence: 1 }, cost: 120, energyCost: 4, xpGain: 14 },
      { id: "smallbiz-collect", name: "Collect Micro-Deal", type: "work", reward: { cash: 220, streetReputation: 1 }, energyCost: 6, xpGain: 16 }
    ],
    npcs: ["npc-wealthy-investor-1"],
    rewards: { businessReputation: 2 },
    possibleEvents: ["event-business-opportunity"]
  },
  warehouse: {
    id: "warehouse",
    districtId: "harbor",
    name: "Warehouse",
    description: "Storage contracts and high-risk cargo manifests.",
    requirements: { streetReputation: 8 },
    actions: [
      { id: "warehouse-contract", name: "Run Contract", type: "work", reward: { cash: 340, businessReputation: 1 }, energyCost: 8, xpGain: 20 },
      { id: "warehouse-risky", name: "Risky Shipment", type: "risky", reward: { cash: 500, streetReputation: 3, wanted: 1 }, energyCost: 9, xpGain: 24 }
    ],
    npcs: ["npc-faction-member-1"],
    rewards: { streetReputation: 2 },
    possibleEvents: ["event-police-check", "event-smuggling-opportunity"]
  },
  docks: {
    id: "docks",
    districtId: "harbor",
    name: "Docks",
    description: "Live shipments and information from every corner of the city.",
    requirements: { streetReputation: 6 },
    actions: [
      { id: "docks-info", name: "Gather Port Intel", type: "social", reward: { intelligence: 2, factionReputation: 1 }, energyCost: 5, xpGain: 14 },
      { id: "docks-delivery", name: "Delivery Run", type: "work", reward: { cash: 260, cityReputation: 1 }, energyCost: 6, xpGain: 15 }
    ],
    npcs: ["npc-police-1"],
    rewards: { factionReputation: 1 },
    possibleEvents: ["event-smuggling-opportunity"]
  },
  garage: {
    id: "garage",
    districtId: "harbor",
    name: "Garage",
    description: "Vehicle upgrades and mechanic favors.",
    requirements: { cityReputation: 0 },
    actions: [
      { id: "garage-tune", name: "Tune Vehicle", type: "transport-action", cost: 160, reward: { influence: 1, businessReputation: 1 }, energyCost: 3, xpGain: 10 },
      { id: "garage-job", name: "Mechanic Job", type: "work", reward: { cash: 230, businessReputation: 1 }, energyCost: 6, xpGain: 14 }
    ],
    npcs: ["npc-mechanic-1", "npc-mechanic-2"],
    rewards: { businessReputation: 1 },
    possibleEvents: ["event-equipment-failure"]
  },
  "night-venue": {
    id: "night-venue",
    districtId: "harbor",
    name: "Night Venue",
    description: "Music, contacts, and fast social escalation.",
    requirements: { charisma: 12 },
    actions: [
      { id: "night-venue-host", name: "Host VIP Booth", type: "social", reward: { charisma: 2, relationship: 2, cash: 180 }, energyCost: 6, xpGain: 16 },
      { id: "night-venue-faction", name: "Meet Faction Contact", type: "faction-action", reward: { factionReputation: 2, influence: 1 }, energyCost: 5, xpGain: 16 }
    ],
    npcs: ["npc-nightclub-owner-1"],
    rewards: { factionReputation: 2 },
    possibleEvents: ["event-faction-offer"]
  },
  factory: {
    id: "factory",
    districtId: "industrial",
    name: "Factory",
    description: "Large operations with stable but hard-earned gains.",
    requirements: { businessReputation: 4 },
    actions: [
      { id: "factory-shift", name: "Manage Shift", type: "business-action", reward: { cash: 360, businessReputation: 2 }, energyCost: 8, xpGain: 20 },
      { id: "factory-negotiate", name: "Negotiate Contract", type: "social", reward: { intelligence: 2, influence: 2 }, energyCost: 6, xpGain: 16 }
    ],
    npcs: ["npc-security-boss-1"],
    rewards: { businessReputation: 2 },
    possibleEvents: ["event-labor-deal"]
  },
  "underground-venue": {
    id: "underground-venue",
    districtId: "industrial",
    name: "Underground Venue",
    description: "Off-grid arena for risky opportunities.",
    requirements: { streetReputation: 12 },
    actions: [
      { id: "underground-venue-risk", name: "Risk Contract", type: "risky", reward: { cash: 520, streetReputation: 3, wanted: 1 }, energyCost: 10, xpGain: 26 },
      { id: "underground-venue-allies", name: "Recruit Allies", type: "faction-action", reward: { factionReputation: 2, relationship: 2 }, energyCost: 6, xpGain: 18 }
    ],
    npcs: ["npc-faction-member-2"],
    rewards: { streetReputation: 2 },
    possibleEvents: ["event-ambush"]
  },
  "luxury-club": {
    id: "luxury-club",
    districtId: "rich-district",
    name: "Luxury Club",
    description: "High-profile nightlife with elite gatekeepers.",
    requirements: { cityReputation: 18 },
    actions: [
      { id: "luxury-club-network", name: "Network Elite", type: "social", reward: { charisma: 3, cityReputation: 2, influence: 2 }, cost: 200, energyCost: 6, xpGain: 18 },
      { id: "luxury-club-deal", name: "Secure Sponsor", type: "business-action", reward: { cash: 400, businessReputation: 2 }, energyCost: 7, xpGain: 20 }
    ],
    npcs: ["npc-wealthy-investor-1", "npc-investor-2"],
    rewards: { cityReputation: 2 },
    possibleEvents: ["event-elite-introduction"]
  },
  mansion: {
    id: "mansion",
    districtId: "rich-district",
    name: "Mansion",
    description: "Private events where city power shifts quietly.",
    requirements: { influence: 25 },
    actions: [
      { id: "mansion-party", name: "Attend Private Party", type: "social", cost: 240, reward: { charisma: 2, relationship: 3, cityReputation: 2 }, energyCost: 6, xpGain: 18 },
      { id: "mansion-security", name: "Consult Security", type: "faction-action", reward: { factionReputation: 2, intelligence: 1 }, energyCost: 5, xpGain: 14 }
    ],
    npcs: ["npc-security-boss-2"],
    rewards: { cityReputation: 2 },
    possibleEvents: ["event-business-opportunity"]
  },
  "high-end-restaurant": {
    id: "high-end-restaurant",
    districtId: "rich-district",
    name: "High-end Restaurant",
    description: "Tasteful room for high-value partnership talks.",
    requirements: { cityReputation: 20 },
    actions: [
      { id: "high-end-host", name: "Host Investor Dinner", type: "business-action", cost: 260, reward: { businessReputation: 2, influence: 2 }, energyCost: 6, xpGain: 20 },
      { id: "high-end-journalist", name: "Talk to Journalist", type: "social", reward: { cityReputation: 2, relationship: 2 }, energyCost: 4, xpGain: 12 }
    ],
    npcs: ["npc-journalist-1"],
    rewards: { businessReputation: 2 },
    possibleEvents: ["event-friendly-tip"]
  },
  "private-casino": {
    id: "private-casino",
    districtId: "rich-district",
    name: "Private Casino",
    description: "Controlled games for carefully chosen players.",
    requirements: { cityReputation: 22 },
    actions: [
      { id: "private-casino-flip", name: "Coin Flip", type: "casino-coin", energyCost: 2, xpGain: 10 },
      { id: "private-casino-high", name: "High / Low", type: "casino-high-low", energyCost: 2, xpGain: 10 },
      { id: "private-casino-dice", name: "Simple Dice", type: "casino-dice", energyCost: 2, xpGain: 12 }
    ],
    npcs: ["npc-casino-manager-1"],
    rewards: { cityReputation: 1 },
    possibleEvents: ["event-expensive-night"]
  },
  "underground-club": {
    id: "underground-club",
    districtId: "underground",
    name: "Underground Club",
    description: "No cameras, no rules, and plenty of leverage.",
    requirements: { streetReputation: 24 },
    actions: [
      { id: "underground-club-deal", name: "Backroom Deal", type: "risky", reward: { cash: 560, streetReputation: 3, wanted: 1 }, energyCost: 9, xpGain: 24 },
      { id: "underground-club-social", name: "Build Street Ties", type: "social", reward: { relationship: 3, factionReputation: 2 }, energyCost: 6, xpGain: 18 }
    ],
    npcs: ["npc-fixer-1", "npc-underground-contact-1"],
    rewards: { streetReputation: 3 },
    possibleEvents: ["event-faction-offer", "event-ambush"]
  },
  fixer: {
    id: "fixer",
    districtId: "underground",
    name: "Fixer",
    description: "The person who can lower heat or open doors.",
    requirements: { factionReputation: 8 },
    actions: [
      { id: "fixer-cooldown", name: "Clear Heat", type: "reduce-wanted", cost: 420, energyCost: 0, xpGain: 10 },
      { id: "fixer-job", name: "Take Contract", type: "faction-action", reward: { cash: 360, factionReputation: 2, influence: 1 }, energyCost: 7, xpGain: 20 }
    ],
    npcs: ["npc-fixer-1"],
    rewards: { factionReputation: 2 },
    possibleEvents: ["event-faction-offer"]
  },
  "black-market": {
    id: "black-market",
    districtId: "underground",
    name: "Black Market",
    description: "Rare tools and luxury goods sold quietly.",
    requirements: { streetReputation: 26 },
    actions: [
      { id: "black-market-buy", name: "Buy Reputation Gift", type: "market-buy", itemId: "rare-fragrance", cost: 480, energyCost: 1, xpGain: 10 },
      { id: "black-market-trade", name: "Trade Valuable", type: "market-sell", itemId: "gold-cufflinks", value: 340, energyCost: 1, xpGain: 8 }
    ],
    npcs: ["npc-street-trader-1"],
    rewards: { streetReputation: 2 },
    possibleEvents: ["event-smuggling-opportunity"]
  },
  "faction-headquarters": {
    id: "faction-headquarters",
    districtId: "underground",
    name: "Faction Headquarters",
    description: "Where faction offers are granted and judged.",
    requirements: { factionReputation: 10 },
    actions: [
      { id: "faction-pledge", name: "Pledge Support", type: "faction-action", reward: { factionReputation: 3, influence: 2 }, energyCost: 6, xpGain: 18 },
      { id: "faction-mission", name: "Faction Mission", type: "risky", reward: { cash: 620, factionReputation: 3, wanted: 1 }, energyCost: 10, xpGain: 26 }
    ],
    npcs: ["npc-faction-member-2"],
    rewards: { factionReputation: 3 },
    possibleEvents: ["event-faction-offer", "event-police-check"]
  },
  "residential-hub": {
    id: "residential-hub",
    districtId: "residential",
    name: "Residential Hub",
    description: "Apartment lanes, local cafés, and neighborhood contacts.",
    requirements: { cityReputation: 4 },
    actions: [
      { id: "residential-patrol", name: "Neighborhood Patrol", type: "city-action", reward: { cityReputation: 2 }, energyCost: 4, xpGain: 12 },
      { id: "residential-delivery", name: "Courier Delivery", type: "work", reward: { cash: 210, streetReputation: 1 }, energyCost: 5, xpGain: 13 }
    ],
    npcs: ["npc-hotel-manager-1"],
    rewards: { cityReputation: 1 },
    possibleEvents: ["event-citizen-help", "event-friendly-tip"]
  },
  "community-center": {
    id: "community-center",
    districtId: "residential",
    name: "Community Center",
    description: "Local services, civic requests, and trusted introductions.",
    requirements: { cityReputation: 5 },
    actions: [
      { id: "community-help", name: "Help Residents", type: "city-action", reward: { cityReputation: 2, relationship: 1 }, energyCost: 5, xpGain: 14 },
      { id: "community-fund", name: "Support Fundraiser", type: "social", cost: 120, reward: { influence: 1, cityReputation: 1 }, energyCost: 3, xpGain: 10 }
    ],
    npcs: ["npc-journalist-1"],
    rewards: { cityReputation: 1 },
    possibleEvents: ["event-friendly-tip"]
  },
  "safehouse-compound": {
    id: "safehouse-compound",
    districtId: "safehouse-area",
    name: "Safehouse Compound",
    description: "Reinforced home base with storage and tactical planning room.",
    requirements: { cityReputation: 8 },
    actions: [
      { id: "compound-rest", name: "Deep Rest", type: "rest", reward: { energy: 45, health: 24 }, energyCost: 0, xpGain: 12 },
      { id: "compound-save", name: "Secure Operations", type: "city-action", reward: { influence: 1, cityReputation: 1 }, energyCost: 1, xpGain: 8 }
    ],
    npcs: ["npc-underground-contact-1"],
    rewards: { cityReputation: 1 },
    possibleEvents: ["event-friendly-tip"]
  },
  "training-yard": {
    id: "training-yard",
    districtId: "safehouse-area",
    name: "Training Yard",
    description: "Controlled zone for drills and faction preparation.",
    requirements: { streetReputation: 8 },
    actions: [
      { id: "training-drill", name: "Combat Drill", type: "work", reward: { cash: 180, streetReputation: 2 }, energyCost: 6, xpGain: 16 },
      { id: "training-strategy", name: "Strategy Session", type: "faction-action", reward: { factionReputation: 2, intelligence: 1 }, energyCost: 5, xpGain: 15 }
    ],
    npcs: ["npc-security-boss-1"],
    rewards: { streetReputation: 1 },
    possibleEvents: ["event-labor-deal", "event-ambush"]
  }
};

export const ITEMS = [
  { id: "street-meal", name: "Street Meal", description: "Quick hot meal.", price: 80, category: "Food", usable: true, effect: { energy: 16 } },
  { id: "fine-meal", name: "Fine Meal", description: "Elegant dinner boost.", price: 170, category: "Food", usable: true, effect: { energy: 24, charisma: 1 } },
  { id: "tailored-jacket", name: "Tailored Jacket", description: "Premium social appearance.", price: 300, category: "Clothing", usable: true, effect: { charisma: 2 } },
  { id: "street-outfit", name: "Street Outfit", description: "Low-profile mobility.", price: 220, category: "Clothing", usable: true, effect: { streetReputation: 1 } },
  { id: "energy-drink", name: "Energy Drink", description: "Restores focus.", price: 70, category: "Consumables", usable: true, effect: { energy: 20 } },
  { id: "medkit", name: "Medkit", description: "Patch up after rough turns.", price: 160, category: "Consumables", usable: true, effect: { health: 28 } },
  { id: "gold-cufflinks", name: "Gold Cufflinks", description: "Gift-quality luxury accessory.", price: 420, category: "Luxury", usable: true, effect: { charisma: 1, cityReputation: 2 } },
  { id: "rare-fragrance", name: "Rare Fragrance", description: "High status social boost.", price: 480, category: "Luxury", usable: true, effect: { charisma: 2, reputation: 2 } },
  { id: "tool-kit", name: "Tool Kit", description: "Unlocks mechanic and factory options.", price: 300, category: "Tools", usable: false, effect: { unlockTag: "tools" } },
  { id: "encrypted-ledger", name: "Encrypted Ledger", description: "Critical operational data.", price: 560, category: "Tools", usable: false, effect: { unlockTag: "intel" } },
  { id: "metro-pass", name: "Metro Pass", description: "Reduced local travel costs.", price: 190, category: "Miscellaneous", usable: true, effect: { travelDiscount: 10 } },
  { id: "gift-box", name: "Gift Box", description: "Improves relationships when given.", price: 210, category: "Miscellaneous", usable: true, effect: { relationship: 6 } }
];

export const STARTER_INVENTORY = [
  { id: "energy-drink", quantity: 2 },
  { id: "street-meal", quantity: 1 },
  { id: "gift-box", quantity: 1 }
];

export const VEHICLES = [
  { id: "motorcycle-starter", name: "City Motorcycle", category: "Motorcycle", price: 0, speed: 3, travelCost: 60, status: "Operational", owned: true, travelTimeModifier: -0.2 },
  { id: "sedan-classic", name: "Classic Sedan", category: "Sedan", price: 6200, speed: 2, travelCost: 70, status: "Operational", owned: false, travelTimeModifier: 0 },
  { id: "suv-urban", name: "Urban SUV", category: "SUV", price: 9400, speed: 2, travelCost: 62, status: "Operational", owned: false, travelTimeModifier: -0.1 },
  { id: "sports-raven", name: "Raven Sports", category: "Sports", price: 14000, speed: 4, travelCost: 54, status: "Operational", owned: false, travelTimeModifier: -0.3 },
  { id: "luxury-aurum", name: "Aurum Luxury", category: "Luxury", price: 22000, speed: 4, travelCost: 48, status: "Operational", owned: false, travelTimeModifier: -0.35 }
];

export const PROPERTIES = [
  { id: "apt-oldtown", name: "Apartment", type: "Apartment", price: 4500, district: "old-town", comfort: 2, security: 2, storage: 2, prestige: 1, owned: false },
  { id: "safehouse-harbor", name: "Safehouse", type: "Safehouse", price: 8200, district: "harbor", comfort: 3, security: 4, storage: 3, prestige: 2, owned: false },
  { id: "lux-apt-rich", name: "Luxury Apartment", type: "Luxury Apartment", price: 16000, district: "rich-district", comfort: 4, security: 4, storage: 4, prestige: 4, owned: false },
  { id: "mansion-rich", name: "Mansion", type: "Mansion", price: 36000, district: "rich-district", comfort: 5, security: 5, storage: 5, prestige: 5, owned: false },
  { id: "commercial-core", name: "Commercial Property", type: "Commercial Property", price: 22000, district: "downtown", comfort: 2, security: 3, storage: 4, prestige: 3, owned: false }
];

export const BUSINESSES = [
  { id: "biz-nightclub", name: "Nightclub", type: "Nightclub", purchasePrice: 28000, income: 1800, expenses: 600, reputation: 0, level: 1, employees: 6, owned: false, lastCollectedDay: 0 },
  { id: "biz-restaurant", name: "Restaurant", type: "Restaurant", purchasePrice: 22000, income: 1450, expenses: 520, reputation: 0, level: 1, employees: 5, owned: false, lastCollectedDay: 0 },
  { id: "biz-garage", name: "Garage", type: "Garage", purchasePrice: 19000, income: 1200, expenses: 460, reputation: 0, level: 1, employees: 4, owned: false, lastCollectedDay: 0 },
  { id: "biz-casino", name: "Casino", type: "Casino", purchasePrice: 52000, income: 3200, expenses: 1200, reputation: 0, level: 1, employees: 10, owned: false, lastCollectedDay: 0 },
  { id: "biz-security", name: "Security Company", type: "Security Company", purchasePrice: 26000, income: 1500, expenses: 620, reputation: 0, level: 1, employees: 5, owned: false, lastCollectedDay: 0 },
  { id: "biz-warehouse", name: "Warehouse", type: "Warehouse", purchasePrice: 24000, income: 1650, expenses: 640, reputation: 0, level: 1, employees: 5, owned: false, lastCollectedDay: 0 },
  { id: "biz-luxury-shop", name: "Luxury Shop", type: "Luxury Shop", purchasePrice: 30000, income: 2100, expenses: 820, reputation: 0, level: 1, employees: 6, owned: false, lastCollectedDay: 0 }
];

export const FACTIONS = [
  { id: "royals", name: "Old Money", description: "Generational capital controlling elite contracts.", influence: 80, reputation: 0, members: ["npc-investor-2", "npc-security-boss-2"], headquarters: "faction-headquarters" },
  { id: "black-harbor", name: "Harbor Crew", description: "Dock authority in all but name.", influence: 66, reputation: 0, members: ["npc-faction-member-1", "npc-mechanic-1"], headquarters: "docks" },
  { id: "velvet-syndicate", name: "Black Roses", description: "Luxury-night influence network.", influence: 72, reputation: 0, members: ["npc-nightclub-owner-1", "npc-casino-manager-1"], headquarters: "luxury-club" },
  { id: "iron-wolves", name: "The Kings", description: "Industrial enforcers and security operators.", influence: 64, reputation: 0, members: ["npc-security-boss-1", "npc-faction-member-2"], headquarters: "factory" },
  { id: "old-guard", name: "La Familia", description: "Traditionalists with deep political ties.", influence: 70, reputation: 0, members: ["npc-banker-1", "npc-journalist-1"], headquarters: "bank" }
];

export const NPCS = [
  {
    id: "npc-bartender-1",
    name: "Silas Kane",
    role: "bartender",
    district: "old-town",
    location: "bar",
    personality: "charming",
    relationship: 0,
    faction: "old-guard",
    dialogue: ["The city hears everything before sunrise.", "You buy trust one conversation at a time."],
    availableActions: ["talk", "socialize", "help", "give-gift", "work-together"]
  },
  {
    id: "npc-mechanic-1",
    name: "Noah Vex",
    role: "mechanic",
    district: "harbor",
    location: "garage",
    personality: "pragmatic",
    relationship: 0,
    faction: "black-harbor",
    dialogue: ["Speed is expensive. Reliability is priceless."],
    availableActions: ["talk", "help", "work-together", "give-gift"]
  },
  {
    id: "npc-banker-1",
    name: "Helena Ward",
    role: "banker",
    district: "downtown",
    location: "bank",
    personality: "calm",
    relationship: 0,
    faction: "old-guard",
    dialogue: ["A ledger never forgets.", "Keep your cash moving with intent."],
    availableActions: ["talk", "socialize", "work-together", "complete-quest"]
  },
  {
    id: "npc-restaurant-owner-1",
    name: "Alina Costa",
    role: "restaurant owner",
    district: "downtown",
    location: "restaurant",
    personality: "warm",
    relationship: 0,
    faction: "velvet-syndicate",
    dialogue: ["Good food opens more doors than threats."],
    availableActions: ["talk", "socialize", "help", "work-together"]
  },
  {
    id: "npc-nightclub-owner-1",
    name: "Marek Noir",
    role: "nightclub owner",
    district: "underground",
    location: "underground-club",
    personality: "ambitious",
    relationship: 0,
    faction: "velvet-syndicate",
    dialogue: ["In this city, rhythm is power."],
    availableActions: ["talk", "socialize", "work-together", "complete-quest"]
  },
  {
    id: "npc-fixer-1",
    name: "Victor Shade",
    role: "fixer",
    district: "underground",
    location: "fixer",
    personality: "calculating",
    relationship: 0,
    faction: "iron-wolves",
    dialogue: ["I solve problems before they become headlines."],
    availableActions: ["talk", "help", "work-together", "complete-quest"]
  },
  {
    id: "npc-journalist-1",
    name: "Elara Quinn",
    role: "journalist",
    district: "downtown",
    location: "restaurant",
    personality: "curious",
    relationship: 0,
    faction: "old-guard",
    dialogue: ["Everyone has a story. Few can afford mine."],
    availableActions: ["talk", "socialize", "help", "give-gift"]
  },
  {
    id: "npc-police-1",
    name: "Officer Grant",
    role: "police officer",
    district: "harbor",
    location: "docks",
    personality: "strict",
    relationship: 0,
    faction: "old-guard",
    dialogue: ["Keep your name clean or keep moving."],
    availableActions: ["talk", "help", "complete-quest"]
  },
  {
    id: "npc-faction-member-1",
    name: "Rex Morrow",
    role: "faction member",
    district: "harbor",
    location: "warehouse",
    personality: "bold",
    relationship: 0,
    faction: "black-harbor",
    dialogue: ["Prove yourself and doors open."],
    availableActions: ["talk", "work-together", "complete-quest"]
  },
  {
    id: "npc-wealthy-investor-1",
    name: "Bianca Vale",
    role: "wealthy investor",
    district: "rich-district",
    location: "luxury-club",
    personality: "strategic",
    relationship: 0,
    faction: "royals",
    dialogue: ["Risk is acceptable when it is priced correctly."],
    availableActions: ["talk", "socialize", "work-together", "give-gift"]
  },
  {
    id: "npc-street-trader-1",
    name: "Marta Rios",
    role: "street trader",
    district: "old-town",
    location: "market",
    personality: "resourceful",
    relationship: 0,
    faction: "black-harbor",
    dialogue: ["Need something? I can find it."],
    availableActions: ["talk", "socialize", "help", "give-gift"]
  },
  {
    id: "npc-casino-manager-1",
    name: "Dorian Pike",
    role: "casino manager",
    district: "rich-district",
    location: "private-casino",
    personality: "precise",
    relationship: 0,
    faction: "velvet-syndicate",
    dialogue: ["Balance the odds, never your emotions."],
    availableActions: ["talk", "socialize", "work-together", "complete-quest"]
  },
  {
    id: "npc-hotel-manager-1",
    name: "Serena Holt",
    role: "hotel manager",
    district: "downtown",
    location: "hotel",
    personality: "professional",
    relationship: 0,
    faction: "royals",
    dialogue: ["A city of secrets requires excellent hospitality."],
    availableActions: ["talk", "help", "work-together"]
  },
  {
    id: "npc-security-boss-1",
    name: "Ivor Stone",
    role: "security boss",
    district: "industrial",
    location: "factory",
    personality: "disciplined",
    relationship: 0,
    faction: "iron-wolves",
    dialogue: ["Control your perimeter, control your future."],
    availableActions: ["talk", "help", "work-together", "complete-quest"]
  },
  {
    id: "npc-underground-contact-1",
    name: "Nyx Calder",
    role: "underground contact",
    district: "underground",
    location: "underground-club",
    personality: "mysterious",
    relationship: 0,
    faction: "velvet-syndicate",
    dialogue: ["You are one favor away from power."],
    availableActions: ["talk", "socialize", "help", "work-together", "complete-quest"]
  },
  {
    id: "npc-investor-1",
    name: "Galen Ward",
    role: "wealthy investor",
    district: "industrial",
    location: "small-businesses",
    personality: "analytical",
    relationship: 0,
    faction: "royals",
    dialogue: ["Growth starts with disciplined spending."],
    availableActions: ["talk", "socialize", "work-together"]
  },
  {
    id: "npc-investor-2",
    name: "Celeste Armand",
    role: "wealthy investor",
    district: "rich-district",
    location: "mansion",
    personality: "elite",
    relationship: 0,
    faction: "royals",
    dialogue: ["Influence compounds, just like capital."],
    availableActions: ["talk", "socialize", "give-gift", "complete-quest"]
  },
  {
    id: "npc-security-boss-2",
    name: "Ronan Creed",
    role: "security boss",
    district: "rich-district",
    location: "mansion",
    personality: "guarded",
    relationship: 0,
    faction: "iron-wolves",
    dialogue: ["Respect is measured in preparation."],
    availableActions: ["talk", "help", "work-together"]
  },
  {
    id: "npc-mechanic-2",
    name: "Tessa Flint",
    role: "mechanic",
    district: "industrial",
    location: "garage",
    personality: "direct",
    relationship: 0,
    faction: "black-harbor",
    dialogue: ["Tools first, ego last."],
    availableActions: ["talk", "help", "work-together"]
  },
  {
    id: "npc-faction-member-2",
    name: "Kael Draven",
    role: "faction member",
    district: "underground",
    location: "faction-headquarters",
    personality: "fierce",
    relationship: 0,
    faction: "iron-wolves",
    dialogue: ["Loyalty is the only accepted currency here."],
    availableActions: ["talk", "work-together", "complete-quest"]
  }
];

export const RELATIONSHIP_STATUSES = [
  { id: "hostile", min: -100, max: -41, label: "Hostile" },
  { id: "stranger", min: -40, max: 4, label: "Stranger" },
  { id: "acquaintance", min: 5, max: 19, label: "Acquaintance" },
  { id: "friend", min: 20, max: 44, label: "Friend" },
  { id: "trusted", min: 45, max: 64, label: "Trusted" },
  { id: "close", min: 65, max: 84, label: "Close" },
  { id: "partner", min: 85, max: 100, label: "Partner" }
];

export const QUESTS = [
  {
    id: "story-queen-arrives",
    title: "THE QUEEN ARRIVES",
    description: "Leave Downtown, explore the city, visit Nightlife District, and return to the Safehouse.",
    category: "story",
    chapter: "THE CITY KNOWS YOUR NAME",
    requirements: { hasCreatedCharacter: true },
    objectives: [
      { id: "leave-start", type: "travel-to-district", target: "old-town", required: 1 },
      { id: "explore-city", type: "districts-visited", target: "all", required: 3 },
      { id: "visit-nightlife", type: "travel-to-district", target: "underground", required: 1 },
      { id: "safehouse-return", type: "visit-location", target: "safehouse", required: 1 }
    ],
    rewards: { cash: 750, xp: 55, cityReputation: 2, influence: 2 },
    status: "active"
  },
  {
    id: "story-01",
    title: "Arrival in NARCOS CITY",
    description: "Arrive in the city and enter Downtown.",
    category: "story",
    chapter: "THE CITY KNOWS YOUR NAME",
    requirements: { hasCreatedCharacter: true },
    objectives: [{ id: "visit-downtown", type: "travel-to-district", target: "downtown", required: 1 }],
    rewards: { cash: 300, xp: 25, cityReputation: 2 },
    status: "active"
  },
  {
    id: "story-02",
    title: "First Steps",
    description: "Visit any Downtown location and complete one action.",
    category: "story",
    chapter: "THE CITY KNOWS YOUR NAME",
    requirements: { completedQuests: ["story-01"] },
    objectives: [
      { id: "visit-location", type: "visit-location", target: "bank", required: 1 },
      { id: "action-complete", type: "complete-action", target: "any", required: 1 }
    ],
    rewards: { cash: 350, xp: 30, cityReputation: 2 },
    status: "locked"
  },
  {
    id: "story-03",
    title: "City Conversation",
    description: "Talk to the bartender in Old Town.",
    category: "story",
    chapter: "THE CITY KNOWS YOUR NAME",
    requirements: { completedQuests: ["story-02"] },
    objectives: [
      { id: "travel-old-town", type: "travel-to-district", target: "old-town", required: 1 },
      { id: "talk-bartender", type: "talk-to-npc", target: "npc-bartender-1", required: 1 }
    ],
    rewards: { cash: 420, xp: 36, streetReputation: 2 },
    status: "locked"
  },
  {
    id: "story-04",
    title: "Harbor Shadows",
    description: "Reach Harbor and complete a contract action.",
    category: "story",
    chapter: "THE CITY KNOWS YOUR NAME",
    requirements: { completedQuests: ["story-03"] },
    objectives: [
      { id: "travel-harbor", type: "travel-to-district", target: "harbor", required: 1 },
      { id: "harbor-work", type: "complete-action", target: "warehouse-contract", required: 1 }
    ],
    rewards: { cash: 520, xp: 44, streetReputation: 3 },
    status: "locked"
  },
  {
    id: "story-05",
    title: "An Important Name",
    description: "Meet the fixer and improve relationship.",
    category: "story",
    chapter: "THE CITY KNOWS YOUR NAME",
    requirements: { completedQuests: ["story-04"] },
    objectives: [
      { id: "talk-fixer", type: "talk-to-npc", target: "npc-fixer-1", required: 1 },
      { id: "relationship-fixer", type: "relationship-status", target: "npc-fixer-1", required: 20 }
    ],
    rewards: { cash: 620, xp: 50, factionReputation: 2 },
    status: "locked"
  },
  {
    id: "story-06",
    title: "Serious Money",
    description: "Earn at least $1500 from actions and contracts.",
    category: "story",
    chapter: "THE CITY KNOWS YOUR NAME",
    requirements: { completedQuests: ["story-05"] },
    objectives: [{ id: "earn-money", type: "earn-money", target: "wallet", required: 1500 }],
    rewards: { cash: 800, xp: 60, businessReputation: 2 },
    status: "locked"
  },
  {
    id: "story-07",
    title: "First Ally",
    description: "Reach Friend status with any NPC.",
    category: "story",
    chapter: "THE CITY KNOWS YOUR NAME",
    requirements: { completedQuests: ["story-06"] },
    objectives: [{ id: "friend-any", type: "relationship-any", target: "friend", required: 1 }],
    rewards: { cash: 700, xp: 58, cityReputation: 2, factionReputation: 1 },
    status: "locked"
  },
  {
    id: "story-08",
    title: "Faction Door",
    description: "Gain 8 faction reputation and visit faction headquarters.",
    category: "story",
    chapter: "THE CITY KNOWS YOUR NAME",
    requirements: { completedQuests: ["story-07"] },
    objectives: [
      { id: "faction-rep", type: "reach-reputation", target: "faction", required: 8 },
      { id: "visit-hq", type: "visit-location", target: "faction-headquarters", required: 1 }
    ],
    rewards: { cash: 900, xp: 66, influence: 3 },
    status: "locked"
  },
  {
    id: "story-09",
    title: "Opportunity Offered",
    description: "Purchase a vehicle or property.",
    category: "story",
    chapter: "THE CITY KNOWS YOUR NAME",
    requirements: { completedQuests: ["story-08"] },
    objectives: [
      { id: "own-vehicle", type: "own-vehicle", target: "any", required: 2 },
      { id: "own-property", type: "own-property", target: "any", required: 1 }
    ],
    rewards: { cash: 1000, xp: 70, cityReputation: 3 },
    status: "locked"
  },
  {
    id: "story-10",
    title: "First Position",
    description: "Own a business and complete one business collection.",
    category: "story",
    chapter: "THE CITY KNOWS YOUR NAME",
    requirements: { completedQuests: ["story-09"] },
    objectives: [
      { id: "own-business", type: "own-business", target: "any", required: 1 },
      { id: "business-collect", type: "business-collect", target: "any", required: 1 }
    ],
    rewards: { cash: 1400, xp: 84, businessReputation: 4, influence: 4 },
    status: "locked"
  },
  {
    id: "quest-first-savings",
    title: "First Savings",
    description: "Deposit money at the bank once.",
    category: "economy",
    requirements: { hasCreatedCharacter: true },
    objectives: [{ id: "deposit", type: "spend-money", target: "bank-deposit", required: 1 }],
    rewards: { cash: 250, xp: 22, cityReputation: 1 },
    status: "active"
  },
  {
    id: "quest-make-contact",
    title: "Make Contact",
    description: "Talk with 3 different NPCs.",
    category: "social",
    requirements: { hasCreatedCharacter: true },
    objectives: [{ id: "meet-npcs", type: "talk-to-npc", target: "any", required: 3 }],
    rewards: { cash: 350, xp: 26, cityReputation: 1 },
    status: "active"
  },
  {
    id: "quest-harbor-route",
    title: "Harbor Route",
    description: "Travel to Harbor 2 times.",
    category: "exploration",
    requirements: { hasCreatedCharacter: true },
    objectives: [{ id: "harbor-travel", type: "travel-to-district", target: "harbor", required: 2 }],
    rewards: { cash: 420, xp: 30, streetReputation: 2 },
    status: "active"
  },
  {
    id: "quest-tools-up",
    title: "Tools Up",
    description: "Buy a Tool category item.",
    category: "collection",
    requirements: { hasCreatedCharacter: true },
    objectives: [{ id: "buy-tool", type: "buy-item", target: "Tools", required: 1 }],
    rewards: { cash: 400, xp: 34, businessReputation: 2 },
    status: "active"
  },
  {
    id: "quest-grow-influence",
    title: "Grow Influence",
    description: "Reach 25 influence.",
    category: "reputation",
    requirements: { hasCreatedCharacter: true },
    objectives: [{ id: "reach-influence", type: "reach-influence", target: "influence", required: 25 }],
    rewards: { cash: 600, xp: 42, cityReputation: 2 },
    status: "active"
  },
  {
    id: "quest-faction-standing",
    title: "Faction Standing",
    description: "Reach faction reputation 12.",
    category: "faction",
    requirements: { hasCreatedCharacter: true },
    objectives: [{ id: "reach-faction", type: "reach-reputation", target: "faction", required: 12 }],
    rewards: { cash: 780, xp: 48, factionReputation: 3 },
    status: "active"
  }
];

export const EVENTS = [
  {
    id: "event-citizen-help",
    title: "A Citizen Needs Help",
    category: "social",
    description: "A local asks for quick assistance.",
    conditions: { minWantedLevel: 0 },
    choices: [
      { id: "talk", label: "Talk", outcome: { cityReputation: 2, relationship: 1, xp: 8 } },
      { id: "ignore", label: "Ignore", outcome: { streetReputation: -1, xp: 2 } },
      { id: "leave", label: "Leave", outcome: { energy: 2 } }
    ]
  },
  {
    id: "event-police-check",
    title: "Police Encounter",
    category: "police",
    description: "Officers stop you for questioning.",
    conditions: { minWantedLevel: 1 },
    choices: [
      { id: "cooperate", label: "Cooperate", outcome: { wanted: -1, cityReputation: 1, cash: -80 } },
      { id: "bribe", label: "Bribe", outcome: { cash: -180, wanted: -1, streetReputation: 1 } },
      { id: "run", label: "Run", outcome: { wanted: 1, energy: -10, streetReputation: 1 } }
    ]
  },
  {
    id: "event-business-opportunity",
    title: "Business Opportunity",
    category: "business",
    description: "A short-term contract appears.",
    conditions: { minBusinessReputation: 0 },
    choices: [
      { id: "take", label: "Take Deal", outcome: { cash: 240, businessReputation: 2, xp: 12 } },
      { id: "pass", label: "Pass", outcome: { cityReputation: 1 } },
      { id: "negotiate", label: "Negotiate", outcome: { cash: 160, influence: 2, businessReputation: 1 } }
    ]
  },
  {
    id: "event-faction-offer",
    title: "Faction Offer",
    category: "faction",
    description: "A faction member offers a favor exchange.",
    conditions: { minFactionReputation: 4 },
    choices: [
      { id: "accept", label: "Accept", outcome: { factionReputation: 2, cash: 220, wanted: 1 } },
      { id: "decline", label: "Decline", outcome: { factionReputation: -1, cityReputation: 1 } },
      { id: "delay", label: "Delay", outcome: { influence: 1 } }
    ]
  },
  {
    id: "event-ambush",
    title: "Street Ambush",
    category: "negative",
    description: "A sudden ambush tests your readiness.",
    conditions: { minWantedLevel: 2 },
    choices: [
      { id: "fight", label: "Fight", outcome: { health: -18, streetReputation: 3, xp: 18 } },
      { id: "pay", label: "Pay Off", outcome: { cash: -220, health: -4, wanted: -1 } },
      { id: "retreat", label: "Retreat", outcome: { energy: -12, streetReputation: -1 } }
    ]
  },
  {
    id: "event-friendly-tip",
    title: "Friendly Tip",
    category: "positive",
    description: "A contact shares profitable information.",
    conditions: { minWantedLevel: 0 },
    choices: [
      { id: "act", label: "Act On Tip", outcome: { cash: 180, intelligence: 1, xp: 10 } },
      { id: "share", label: "Share Tip", outcome: { relationship: 2, cityReputation: 1 } },
      { id: "ignore", label: "Ignore", outcome: { energy: 2 } }
    ]
  },
  {
    id: "event-smuggling-opportunity",
    title: "Smuggling Opportunity",
    category: "opportunity",
    description: "A high risk route opens for one turn.",
    conditions: { minStreetReputation: 8 },
    choices: [
      { id: "join", label: "Join", outcome: { cash: 300, streetReputation: 2, wanted: 1 } },
      { id: "report", label: "Report", outcome: { cityReputation: 2, factionReputation: -1 } },
      { id: "watch", label: "Watch", outcome: { intelligence: 1, xp: 6 } }
    ]
  },
  {
    id: "event-supply-shortage",
    title: "Supply Shortage",
    category: "negative",
    description: "Market prices spike unexpectedly.",
    conditions: { minWantedLevel: 0 },
    choices: [
      { id: "buy", label: "Buy Anyway", outcome: { cash: -140, businessReputation: 1 } },
      { id: "wait", label: "Wait", outcome: { energy: 3 } },
      { id: "trade", label: "Trade Contacts", outcome: { influence: 1, streetReputation: 1 } }
    ]
  },
  {
    id: "event-equipment-failure",
    title: "Equipment Failure",
    category: "business",
    description: "A key machine fails during operations.",
    conditions: { minBusinessReputation: 2 },
    choices: [
      { id: "repair", label: "Repair", outcome: { cash: -200, businessReputation: 2 } },
      { id: "delay", label: "Delay", outcome: { businessReputation: -1 } },
      { id: "outsource", label: "Outsource", outcome: { cash: -120, influence: 1 } }
    ]
  },
  {
    id: "event-labor-deal",
    title: "Labor Deal",
    category: "neutral",
    description: "Workers request improved terms.",
    conditions: { minBusinessReputation: 1 },
    choices: [
      { id: "accept", label: "Accept", outcome: { cash: -150, businessReputation: 2, cityReputation: 1 } },
      { id: "negotiate", label: "Negotiate", outcome: { businessReputation: 1, influence: 1 } },
      { id: "reject", label: "Reject", outcome: { businessReputation: -2, streetReputation: 1 } }
    ]
  },
  {
    id: "event-elite-introduction",
    title: "Elite Introduction",
    category: "social",
    description: "An elite host invites a private conversation.",
    conditions: { minCityReputation: 15 },
    choices: [
      { id: "accept", label: "Accept", outcome: { cityReputation: 2, influence: 2, relationship: 2 } },
      { id: "decline", label: "Decline", outcome: { energy: 4 } },
      { id: "counter", label: "Counter Offer", outcome: { cash: 140, cityReputation: 1 } }
    ]
  },
  {
    id: "event-expensive-night",
    title: "Expensive Night",
    category: "negative",
    description: "A social evening gets costly.",
    conditions: { minCityReputation: 6 },
    choices: [
      { id: "pay", label: "Pay", outcome: { cash: -180, charisma: 1 } },
      { id: "leave", label: "Leave", outcome: { cityReputation: -1 } },
      { id: "network", label: "Network", outcome: { cash: -80, influence: 1, relationship: 1 } }
    ]
  }
];

export const ACHIEVEMENTS = [
  { id: "ach-first-steps", name: "First Steps", description: "Visited your first non-start district.", category: "Exploration", requirement: { type: "districts-visited", target: 2 }, reward: { xp: 12 } },
  { id: "ach-city-explorer", name: "City Explorer", description: "Visited 5 districts.", category: "Exploration", requirement: { type: "districts-visited", target: 5 }, reward: { xp: 30 } },
  { id: "ach-queen-arrival", name: "Queen's Arrival", description: "Reached level 2.", category: "Progression", requirement: { type: "level", target: 2 }, reward: { cash: 180 } },
  { id: "ach-business-woman", name: "Business Woman", description: "Purchased your first business.", category: "Business", requirement: { type: "businesses-owned", target: 1 }, reward: { xp: 20 } },
  { id: "ach-nightlife", name: "Nightlife", description: "Visited a nightclub location.", category: "Story", requirement: { type: "visit-location", target: "luxury-club" }, reward: { cityReputation: 1 } },
  { id: "ach-explore-1", name: "City Entry", description: "Visit 2 districts.", category: "Exploration", requirement: { type: "districts-visited", target: 2 }, reward: { xp: 15 } },
  { id: "ach-explore-2", name: "Urban Mapper", description: "Visit all 6 districts.", category: "Exploration", requirement: { type: "districts-visited", target: 6 }, reward: { xp: 45 } },
  { id: "ach-money-1", name: "First Big Stack", description: "Earn $2,000 lifetime.", category: "Money", requirement: { type: "money-earned", target: 2000 }, reward: { cityReputation: 1 } },
  { id: "ach-money-2", name: "Cash Architect", description: "Earn $10,000 lifetime.", category: "Money", requirement: { type: "money-earned", target: 10000 }, reward: { xp: 55 } },
  { id: "ach-rep-1", name: "Known Face", description: "Reach city reputation 10.", category: "Reputation", requirement: { type: "city-reputation", target: 10 }, reward: { influence: 1 } },
  { id: "ach-rep-2", name: "Street Voice", description: "Reach street reputation 20.", category: "Reputation", requirement: { type: "street-reputation", target: 20 }, reward: { xp: 35 } },
  { id: "ach-rep-3", name: "Boardroom Pull", description: "Reach business reputation 15.", category: "Reputation", requirement: { type: "business-reputation", target: 15 }, reward: { cash: 250 } },
  { id: "ach-rep-4", name: "Faction Cred", description: "Reach faction reputation 15.", category: "Reputation", requirement: { type: "faction-reputation", target: 15 }, reward: { cash: 250 } },
  { id: "ach-social-1", name: "Introduced", description: "Talk to 5 NPCs.", category: "Social", requirement: { type: "npcs-met", target: 5 }, reward: { xp: 20 } },
  { id: "ach-social-2", name: "Trusted Circle", description: "Have 3 trusted relationships.", category: "Social", requirement: { type: "trusted-relationships", target: 3 }, reward: { influence: 2 } },
  { id: "ach-business-1", name: "Owner", description: "Own your first business.", category: "Business", requirement: { type: "businesses-owned", target: 1 }, reward: { xp: 25 } },
  { id: "ach-business-2", name: "Portfolio", description: "Own 3 businesses.", category: "Business", requirement: { type: "businesses-owned", target: 3 }, reward: { cityReputation: 2 } },
  { id: "ach-progression-1", name: "Rising Power", description: "Reach level 5.", category: "Progression", requirement: { type: "level", target: 5 }, reward: { cash: 400 } },
  { id: "ach-progression-2", name: "City Name", description: "Unlock title Boss or above.", category: "Progression", requirement: { type: "title-rank", target: "boss" }, reward: { xp: 50 } },
  { id: "ach-story-1", name: "Chapter Begun", description: "Complete Story Mission 3.", category: "Story", requirement: { type: "quest-complete", target: "story-03" }, reward: { cash: 250 } },
  { id: "ach-story-2", name: "Chapter One Complete", description: "Complete Story Mission 10.", category: "Story", requirement: { type: "quest-complete", target: "story-10" }, reward: { cash: 900 } },
  { id: "ach-collection-1", name: "Collector", description: "Own 5 different item types.", category: "Collection", requirement: { type: "inventory-types", target: 5 }, reward: { xp: 24 } },
  { id: "ach-collection-2", name: "Garage Starter", description: "Own 2 vehicles.", category: "Collection", requirement: { type: "vehicles-owned", target: 2 }, reward: { cash: 300 } },
  { id: "ach-collection-3", name: "Property Holder", description: "Own a property.", category: "Collection", requirement: { type: "properties-owned", target: 1 }, reward: { cityReputation: 1 } },
  { id: "ach-casino-1", name: "First Bet", description: "Play 1 casino game.", category: "Money", requirement: { type: "casino-plays", target: 1 }, reward: { xp: 10 } },
  { id: "ach-casino-2", name: "Cold Streak", description: "Win 5 casino games.", category: "Money", requirement: { type: "casino-wins", target: 5 }, reward: { cash: 220 } },
  { id: "ach-endurance", name: "Long Week", description: "Play 7 in-game days.", category: "Progression", requirement: { type: "days-played", target: 7 }, reward: { influence: 2 } }
];

export const JOBS = [
  { id: "job-restaurant", name: "Restaurant Worker", minLevel: 1, energyCost: 8, timeCost: 1, income: 220, xp: 14, reputation: { city: 1 } },
  { id: "job-driver", name: "Driver", minLevel: 2, energyCost: 10, timeCost: 1, income: 280, xp: 16, reputation: { street: 1 } },
  { id: "job-mechanic", name: "Mechanic", minLevel: 3, energyCost: 11, timeCost: 1, income: 340, xp: 18, reputation: { business: 1 } },
  { id: "job-security", name: "Security", minLevel: 4, energyCost: 12, timeCost: 1, income: 410, xp: 20, reputation: { city: 1, faction: 1 } },
  { id: "job-bartender", name: "Bartender", minLevel: 2, energyCost: 9, timeCost: 1, income: 260, xp: 15, reputation: { city: 1 } },
  { id: "job-office", name: "Office Worker", minLevel: 5, energyCost: 13, timeCost: 1, income: 500, xp: 24, reputation: { business: 2 } }
];

export const CRIME_OPERATIONS = [
  { id: "op-smuggling", name: "Smuggling Mission", minStreetRep: 8, energyCost: 12, risk: 0.45, rewardCash: 520, rewardXp: 28, wantedOnFail: 1, healthOnFail: -10, reputationOnSuccess: { street: 2 } },
  { id: "op-heist-prep", name: "Heist Preparation", minStreetRep: 12, energyCost: 11, risk: 0.4, rewardCash: 460, rewardXp: 24, wantedOnFail: 1, healthOnFail: -8, reputationOnSuccess: { faction: 1, business: 1 } },
  { id: "op-underground-delivery", name: "Underground Delivery", minStreetRep: 14, energyCost: 13, risk: 0.5, rewardCash: 620, rewardXp: 30, wantedOnFail: 2, healthOnFail: -14, reputationOnSuccess: { street: 3, faction: 1 } },
  { id: "op-intel-job", name: "Intelligence Job", minStreetRep: 6, energyCost: 9, risk: 0.3, rewardCash: 340, rewardXp: 18, wantedOnFail: 1, healthOnFail: -6, reputationOnSuccess: { city: 1, faction: 1 } },
  { id: "op-protection", name: "Protection Job", minStreetRep: 10, energyCost: 10, risk: 0.35, rewardCash: 400, rewardXp: 21, wantedOnFail: 1, healthOnFail: -8, reputationOnSuccess: { business: 1, faction: 1 } },
  { id: "op-black-market", name: "Black Market Deal", minStreetRep: 16, energyCost: 14, risk: 0.55, rewardCash: 760, rewardXp: 34, wantedOnFail: 2, healthOnFail: -15, reputationOnSuccess: { street: 3, business: 1 } }
];

export const PRISON_ACTIONS = [
  { id: "serve-turn", name: "Serve Time", turnsReduced: 1, energyChange: 4, reputation: { street: -1 } },
  { id: "legal-call", name: "Legal Call", turnsReduced: 2, cost: 250, reputation: { city: 1 } },
  { id: "quiet-deal", name: "Quiet Deal", turnsReduced: 1, cost: 180, reputation: { faction: 1, street: 1 }, wantedDelta: -1 }
];

export const DAILY_QUEST_TEMPLATES = [
  {
    id: "daily-talk-two",
    title: "Daily Network",
    description: "Talk to 2 NPCs today.",
    objective: { type: "talk-to-npc", target: "any", required: 2 },
    rewards: { cash: 180, xp: 16 }
  },
  {
    id: "daily-action-three",
    title: "Daily Hustle",
    description: "Complete 3 actions today.",
    objective: { type: "complete-action", target: "any", required: 3 },
    rewards: { cash: 220, xp: 18, cityReputation: 1 }
  },
  {
    id: "daily-work-once",
    title: "Daily Shift",
    description: "Complete one legal job today.",
    objective: { type: "daily-job", target: "any", required: 1 },
    rewards: { cash: 240, xp: 18, businessReputation: 1 }
  }
];

export const BACKGROUND_POPULATION_TEMPLATES = {
  downtown: ["Pedestrians", "Investors", "Hotel Guests", "Security"],
  "old-town": ["Market Vendors", "Street Characters", "Bar Guests", "Drivers"],
  harbor: ["Dock Workers", "Cargo Drivers", "Club Guests", "Security"],
  industrial: ["Factory Workers", "Mechanics", "Logistics Staff", "Inspectors"],
  "rich-district": ["Club Members", "Private Staff", "Luxury Customers", "Security"],
  underground: ["Fixers", "Runners", "Faction Scouts", "Underground Guests"],
  residential: ["Residents", "Vendors", "Courier Riders", "Families"],
  "safehouse-area": ["Guards", "Mechanics", "Operators", "Drivers"]
};
