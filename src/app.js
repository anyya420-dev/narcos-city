import { DISTRICTS, LOCATIONS, TITLE_RANKS } from "./gameData.mjs";
import {
  bankDeposit,
  bankWithdraw,
  buyMarketItem,
  buyProperty,
  buyVehicle,
  casinoPlay,
  chooseEventChoice,
  claimDailyReward,
  claimDailyQuestReward,
  coolDistrictHeat,
  createInitialState,
  createPlayer,
  cycleVehicle,
  debugAddItem,
  debugAddMoney,
  debugAddProperty,
  debugAddVehicle,
  debugAddXp,
  debugChangeReputation,
  debugCompleteQuest,
  debugUnlockDistrict,
  getBusinesses,
  getCurrentLocation,
  getCrimeOperations,
  getFactionList,
  getInventoryEntries,
  getJobs,
  getNpcsAtLocation,
  getProperties,
  getSelectedDistrict,
  interactWithNpc,
  markAllNotificationsRead,
  markNotificationRead,
  moveToLocation,
  navigateTo,
  normalizeState,
  performLocationAction,
  performPrisonAction,
  repayCredit,
  requestCredit,
  resetGame,
  returnToCity,
  runBusinessAction,
  runCrimeOperation,
  runFactionAction,
  runJobAction,
  safehouseRecoverEnergy,
  safehouseRest,
  sellMarketItem,
  toggleDebugMode,
  travelToDistrict,
  upgradeSafehouse,
  useInventoryItem
} from "./gameLogic.mjs";

const STORAGE_KEY = "narcos-city-state-v4";

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeState(JSON.parse(saved)) : createInitialState();
  } catch {
    return createInitialState();
  }
}

let state = loadState();
const root = document.getElementById("screen-root");
const nav = document.getElementById("bottom-nav");
const statusBar = document.getElementById("status-bar");

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currency(v) {
  return `$${Math.round(v || 0).toLocaleString()}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function progressBar(value, max = 100) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return `<div class="bar"><span style="width:${pct}%"></span></div>`;
}

function relationshipSnippet() {
  const top = Object.entries(state.relationships)
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 3)
    .map(([npcId, rel]) => {
      const npc = state.npcs.find((n) => n.id === npcId);
      return npc ? `<div class="stat"><span>${escapeHtml(npc.name)}</span><strong>${rel.value} (${escapeHtml(rel.status)})</strong></div>` : "";
    })
    .join("");
  return top || '<p class="muted">No relationships yet.</p>';
}

function renderStatus() {
  if (!state.meta.hasCreatedCharacter) {
    statusBar.innerHTML = `<p class="muted">Create your character and enter NARCOS CITY.</p>`;
    return;
  }

  const district = getSelectedDistrict(state);
  const location = getCurrentLocation(state);
  const totalRep = state.player.reputation.city + state.player.reputation.street + state.player.reputation.business + state.player.reputation.faction;
  statusBar.innerHTML = `
    <div class="status-grid">
      <div><span>Name</span><strong>${escapeHtml(state.player.name)}</strong></div>
      <div><span>Title</span><strong>${escapeHtml(state.player.title)}</strong></div>
      <div><span>Level</span><strong>${state.player.level}</strong></div>
      <div><span>XP</span><strong>${state.player.xp}/${state.player.nextLevelXp}</strong></div>
      <div><span>Cash / Bank</span><strong>${currency(state.player.money)} / ${currency(state.player.bankBalance)}</strong></div>
      <div><span>Energy</span><strong>${state.player.energy}</strong></div>
      <div><span>Health</span><strong>${state.player.health}</strong></div>
      <div><span>Wanted</span><strong>${state.player.wantedLevel}/5</strong></div>
      <div><span>Rep Total</span><strong>${totalRep}</strong></div>
      <div><span>District</span><strong>${escapeHtml(district.name)}</strong></div>
      <div><span>Location</span><strong>${escapeHtml(location.name)}</strong></div>
      <div><span>Day/Turn</span><strong>${state.time.day}/${state.time.turn}</strong></div>
    </div>
  `;
}

function renderSetup() {
  root.innerHTML = `
    <section class="card marble">
      <h2>NARCOS CITY — CHAPTER 1</h2>
      <p class="muted">The City Knows Your Name.</p>
      <label class="field">
        <span>Character Name</span>
        <input id="player-name-input" maxlength="24" placeholder="Enter your name" />
      </label>
      <div class="actions">
        <button data-action="create-player">Enter City</button>
      </div>
    </section>
  `;
}

function renderEventPanel() {
  const event = state.meta.pendingEvent;
  if (!event) {
    return `<section class="card"><h3>Event</h3><p class="muted">No active event choices.</p></section>`;
  }
  const choices = event.choices
    .map((choice) => `<button data-action="event-choice" data-choice-id="${choice.id}">${escapeHtml(choice.label)}</button>`)
    .join("");
  return `
    <section class="card">
      <h3>${escapeHtml(event.title)}</h3>
      <p class="muted">${escapeHtml(event.description)}</p>
      <div class="actions">${choices}</div>
    </section>
  `;
}

function renderCity() {
  const district = getSelectedDistrict(state);
  const location = getCurrentLocation(state);

  const locationsMarkup = district.locations
    .map((locationId) => {
      const loc = LOCATIONS[locationId];
      const active = locationId === state.currentLocationId ? " active-location" : "";
      return `
        <article class="card${active}">
          <h4>${escapeHtml(loc.name)}</h4>
          <p class="muted">${escapeHtml(loc.description)}</p>
          <div class="actions">
            <button data-action="enter-location" data-district-id="${district.id}" data-location-id="${locationId}">Enter</button>
          </div>
        </article>
      `;
    })
    .join("");

  const actionButtons = location.actions
    .map((action) => `<button data-action="location-action" data-district-id="${district.id}" data-location-id="${location.id}" data-action-id="${action.id}">${escapeHtml(action.name)}</button>`)
    .join("");

  const npcCards = getNpcsAtLocation(state, location.id)
    .map((npc) => {
      const rel = state.relationships[npc.id] || { value: 0, status: "Stranger" };
      return `
        <article class="stat">
          <span>${escapeHtml(npc.name)} · ${escapeHtml(npc.role)}</span>
          <strong>${rel.value} · ${escapeHtml(rel.status)}</strong>
          <p class="muted">${escapeHtml(npc.dialogue[0] || "")}</p>
          <div class="actions">
            <button data-action="npc-action" data-npc-id="${npc.id}" data-npc-interaction="talk">Talk</button>
            <button data-action="npc-action" data-npc-id="${npc.id}" data-npc-interaction="socialize">Socialize</button>
            <button data-action="npc-action" data-npc-id="${npc.id}" data-npc-interaction="help">Help</button>
            <button data-action="npc-action" data-npc-id="${npc.id}" data-npc-interaction="give-gift">Gift</button>
            <button data-action="npc-action" data-npc-id="${npc.id}" data-npc-interaction="work-together">Work Together</button>
          </div>
        </article>
      `;
    })
    .join("");

  root.innerHTML = `
    <section class="card marble">
      <h2>${escapeHtml(district.name)}</h2>
      <p class="muted">${escapeHtml(district.description)}</p>
      <p class="muted">Atmosphere: ${escapeHtml(district.atmosphere)} · Danger ${district.dangerLevel}/5 · Wealth ${district.wealthLevel}/5</p>
      <div class="actions">
        <button data-action="claim-daily">Claim Daily Reward</button>
        <button data-action="safehouse-rest">Rest</button>
        <button data-action="safehouse-energy">Recover Energy</button>
      </div>
    </section>
    ${renderEventPanel()}
    <section class="card">
      <h3>District Locations</h3>
      ${locationsMarkup}
    </section>
    <section class="card">
      <h3>${escapeHtml(location.name)} Actions</h3>
      <div class="actions">${actionButtons}</div>
    </section>
    <section class="card">
      <h3>People Here</h3>
      ${npcCards || '<p class="muted">No contacts at this location.</p>'}
    </section>
  `;
}

function renderDistricts() {
  const currentVehicle = state.vehicles.find((entry) => entry.id === state.player.currentVehicleId);
  const cards = DISTRICTS.map((district) => {
    const selected = district.id === state.selectedDistrictId ? " active-location" : "";
    const travelCost = Math.max(40, district.travelCost + (currentVehicle?.travelCost || 60) - 80);
    const locked = state.player.reputation.city < district.reputationRequirement;
    return `
      <article class="card${selected}">
        <h3>${escapeHtml(district.name)}</h3>
        <p class="muted">${escapeHtml(district.description)}</p>
        <div class="grid-2">
          <div class="stat">Reputation Req<strong>${district.reputationRequirement}</strong></div>
          <div class="stat">Travel Cost<strong>${currency(travelCost)}</strong></div>
          <div class="stat">Travel Time<strong>${district.travelTime}</strong></div>
          <div class="stat">Danger/Wealth<strong>${district.dangerLevel}/${district.wealthLevel}</strong></div>
        </div>
        <div class="actions">
          <button data-action="travel" data-district-id="${district.id}" ${locked ? "disabled" : ""}>Travel</button>
          <button data-action="cool-heat" data-district-id="${district.id}">Reduce Wanted</button>
        </div>
      </article>
    `;
  }).join("");

  root.innerHTML = `
    <section class="card marble">
      <h2>District Network</h2>
      <p class="muted">Travel reshapes reputation, risk, and opportunities.</p>
    </section>
    ${cards}
  `;
}

function renderProfile() {
  const rep = state.player.reputation;
  const titleIndex = TITLE_RANKS.findIndex((rank) => rank.name === state.player.title);

  root.innerHTML = `
    <section class="card marble">
      <h2>Profile</h2>
      <p class="muted">${escapeHtml(state.player.name)} · ${escapeHtml(state.player.title)} (Rank ${titleIndex + 1}/${TITLE_RANKS.length})</p>
      <div class="grid-2">
        <div class="stat">Level<strong>${state.player.level}</strong>${progressBar(state.player.xp, state.player.nextLevelXp)}</div>
        <div class="stat">Influence<strong>${state.player.influence}</strong>${progressBar(state.player.influence, 100)}</div>
        <div class="stat">Health<strong>${state.player.health}</strong>${progressBar(state.player.health)}</div>
        <div class="stat">Energy<strong>${state.player.energy}</strong>${progressBar(state.player.energy)}</div>
        <div class="stat">Strength<strong>${state.player.strength}</strong></div>
        <div class="stat">Intelligence<strong>${state.player.intelligence}</strong></div>
        <div class="stat">Charisma<strong>${state.player.charisma}</strong></div>
        <div class="stat">Wanted<strong>${state.player.wantedLevel}/5</strong>${progressBar(state.player.wantedLevel, 5)}</div>
      </div>
    </section>
    <section class="card">
      <h3>Reputation</h3>
      <div class="grid-2">
        <div class="stat">City<strong>${rep.city}</strong>${progressBar(rep.city, 60)}</div>
        <div class="stat">Street<strong>${rep.street}</strong>${progressBar(rep.street, 60)}</div>
        <div class="stat">Business<strong>${rep.business}</strong>${progressBar(rep.business, 60)}</div>
        <div class="stat">Faction<strong>${rep.faction}</strong>${progressBar(rep.faction, 60)}</div>
      </div>
    </section>
    <section class="card">
      <h3>Top Relationships</h3>
      <div class="grid-2">${relationshipSnippet()}</div>
    </section>
    <section class="card">
      <h3>Lifetime Statistics</h3>
      <div class="grid-2">
        <div class="stat">Districts Visited<strong>${state.statistics.districtsVisited.length}</strong></div>
        <div class="stat">Locations Visited<strong>${state.statistics.locationsVisited.length}</strong></div>
        <div class="stat">Money Earned<strong>${currency(state.statistics.moneyEarned)}</strong></div>
        <div class="stat">Money Spent<strong>${currency(state.statistics.moneySpent)}</strong></div>
        <div class="stat">Quests Completed<strong>${state.statistics.questsCompleted}</strong></div>
        <div class="stat">NPCs Met<strong>${state.statistics.npcsMet.length}</strong></div>
        <div class="stat">Businesses Owned<strong>${state.player.ownedBusinesses.length}</strong></div>
        <div class="stat">Properties Owned<strong>${state.player.ownedProperties.length}</strong></div>
        <div class="stat">Vehicles Owned<strong>${state.vehicles.filter((v) => v.owned).length}</strong></div>
        <div class="stat">Casino W/L<strong>${state.statistics.casinoWins}/${state.statistics.casinoLosses}</strong></div>
        <div class="stat">Travel Count<strong>${state.statistics.travelCount}</strong></div>
        <div class="stat">Achievements<strong>${state.statistics.achievementsUnlocked}</strong></div>
      </div>
    </section>
  `;
}

function renderInventory() {
  const inventoryCards = getInventoryEntries(state)
    .map(
      (item) => `
      <article class="card">
        <h4>${escapeHtml(item.name)}</h4>
        <p class="muted">${escapeHtml(item.category)} · Qty ${item.quantity} · ${currency(item.price)}</p>
        <p class="muted">${escapeHtml(item.description)}</p>
        <div class="actions">
          ${item.usable ? `<button data-action="use-item" data-item-id="${item.id}">Use</button>` : ""}
          <button data-action="sell-item" data-item-id="${item.id}" data-price="${Math.floor(item.price * 0.65)}">Sell</button>
        </div>
      </article>
    `
    )
    .join("");

  const marketCards = state.marketCatalog
    .map(
      (item) => `
      <article class="card">
        <h4>${escapeHtml(item.name)}</h4>
        <p class="muted">${escapeHtml(item.category)} · ${currency(item.price)}</p>
        <div class="actions">
          <button data-action="buy-item" data-item-id="${item.id}" data-price="${item.price}">Buy</button>
        </div>
      </article>
    `
    )
    .join("");

  const vehicleCards = state.vehicles
    .map(
      (vehicle) => `
      <article class="card${vehicle.id === state.player.currentVehicleId ? " active-location" : ""}">
        <h4>${escapeHtml(vehicle.name)}</h4>
        <p class="muted">${escapeHtml(vehicle.category)} · Speed ${vehicle.speed} · Travel ${currency(vehicle.travelCost)}</p>
        <div class="actions">
          ${vehicle.owned ? "" : `<button data-action="buy-vehicle" data-vehicle-id="${vehicle.id}">Buy ${currency(vehicle.price)}</button>`}
          ${vehicle.owned ? `<button data-action="select-vehicle" data-vehicle-id="${vehicle.id}">Select</button>` : ""}
        </div>
      </article>
    `
    )
    .join("");

  const propertyCards = getProperties(state)
    .map(
      (property) => `
      <article class="card${property.owned ? " active-location" : ""}">
        <h4>${escapeHtml(property.name)}</h4>
        <p class="muted">${escapeHtml(property.type)} · ${escapeHtml(property.district)} · ${property.owned ? "Owned" : currency(property.price)}</p>
        <p class="muted">Comfort ${property.comfort} · Security ${property.security} · Storage ${property.storage} · Prestige ${property.prestige}</p>
        <div class="actions">
          ${property.owned ? "" : `<button data-action="buy-property" data-property-id="${property.id}">Buy</button>`}
        </div>
      </article>
    `
    )
    .join("");

  root.innerHTML = `
    <section class="card marble">
      <h2>Inventory · Market · Assets</h2>
      <p class="muted">Cash ${currency(state.player.money)} · Bank ${currency(state.player.bankBalance)}</p>
      <div class="actions">
        <button data-action="bank-deposit" data-amount="200">Deposit $200</button>
        <button data-action="bank-withdraw" data-amount="200">Withdraw $200</button>
        <button data-action="select-vehicle">Cycle Vehicle</button>
      </div>
    </section>
    <section class="card"><h3>Inventory</h3>${inventoryCards || '<p class="muted">Inventory empty.</p>'}</section>
    <section class="card"><h3>Market</h3>${marketCards}</section>
    <section class="card"><h3>Vehicle Shop</h3>${vehicleCards}</section>
    <section class="card"><h3>Property Market</h3>${propertyCards}</section>
  `;
}

function renderQuests() {
  const quests = state.quests
    .map(
      (quest) => `
      <article class="card">
        <h4>${escapeHtml(quest.title)} ${quest.status === "completed" ? "✓" : ""}</h4>
        <p class="muted">${escapeHtml(quest.category.toUpperCase())} · ${escapeHtml(quest.description)}</p>
        <p class="muted">Status: ${escapeHtml(quest.status)}</p>
        ${quest.objectives
          .map((obj) => `<p class="muted">• ${escapeHtml(obj.type)}: ${obj.progress}/${obj.required}</p>`)
          .join("")}
      </article>
    `
    )
    .join("");

  const achievements = state.achievements
    .map(
      (achievement) => `
      <article class="card">
        <h4>${escapeHtml(achievement.name)} ${achievement.unlocked ? "✓" : ""}</h4>
        <p class="muted">${escapeHtml(achievement.category)} · ${escapeHtml(achievement.description)}</p>
        <p class="muted">Progress: ${achievement.progress}/${achievement.requirement.target ?? 1}</p>
      </article>
    `
    )
    .join("");

  const businesses = getBusinesses(state)
    .map(
      (business) => `
      <article class="card">
        <h4>${escapeHtml(business.name)} ${business.owned ? "(Owned)" : ""}</h4>
        <p class="muted">${escapeHtml(business.type)} · Level ${business.level} · Rep ${business.reputation}</p>
        <p class="muted">Income ${currency(business.income)} · Expenses ${currency(business.expenses)} · Employees ${business.employees}</p>
        <div class="actions">
          <button data-action="business-action" data-business-id="${business.id}">${business.owned ? "Collect Income" : `Purchase ${currency(business.purchasePrice)}`}</button>
          ${business.owned ? `<button data-action="business-upgrade" data-business-id="${business.id}">Upgrade</button>` : ""}
        </div>
      </article>
    `
    )
    .join("");

  const factions = getFactionList(state)
    .map(
      (faction) => `
      <article class="card">
        <h4>${escapeHtml(faction.name)}</h4>
        <p class="muted">${escapeHtml(faction.description)}</p>
        <p class="muted">Influence ${faction.influence} · Your Rep ${state.player.factionReputation[faction.id] || 0}</p>
        <div class="actions">
          <button data-action="faction-action" data-faction-id="${faction.id}">Faction Activity</button>
        </div>
      </article>
    `
    )
    .join("");

  const notifications = state.notifications
    .slice(0, 20)
    .map(
      (note) => `
      <article class="card${note.read ? "" : " active-location"}">
        <span class="badge ${note.type === "error" ? "alert" : note.type === "success" ? "ok" : ""}">${escapeHtml(note.category)}</span>
        <p>${escapeHtml(note.text)}</p>
        <p class="muted">Day ${note.day} Turn ${note.turn}</p>
        <div class="actions">
          ${note.read ? "" : `<button data-action="mark-note" data-note-id="${note.id}">Mark Read</button>`}
        </div>
      </article>
    `
    )
    .join("");

  const transactions = state.transactions
    .slice(0, 12)
    .map(
      (tx) => `
      <article class="card">
        <h4>${escapeHtml(tx.type.toUpperCase())} ${tx.amount >= 0 ? "▲" : "▼"}</h4>
        <p class="muted">${currency(tx.amount)} · ${escapeHtml(tx.source)} · Day ${tx.day} Turn ${tx.turn}</p>
        <p class="muted">${escapeHtml(tx.description)}</p>
      </article>
    `
    )
    .join("");

  const dailyQuests = (state.daily.quests || [])
    .map(
      (quest) => `
      <article class="card${quest.completed && !quest.claimed ? " active-location" : ""}">
        <h4>${escapeHtml(quest.title)}</h4>
        <p class="muted">${escapeHtml(quest.description)}</p>
        <p class="muted">Progress: ${quest.progress}/${quest.objective.required} · ${quest.claimed ? "Claimed" : quest.completed ? "Ready" : "In Progress"}</p>
        <div class="actions">
          ${quest.completed && !quest.claimed ? `<button data-action="claim-daily-quest" data-quest-id="${quest.id}">Claim Reward</button>` : ""}
        </div>
      </article>`
    )
    .join("");

  const jobs = getJobs(state)
    .map(
      (job) => `
      <article class="card">
        <h4>${escapeHtml(job.name)}</h4>
        <p class="muted">Level ${job.minLevel}+ · Energy ${job.energyCost} · Income ${currency(job.income)} · XP ${job.xp}</p>
        <div class="actions">
          <button data-action="job-action" data-job-id="${job.id}" ${state.player.level < job.minLevel ? "disabled" : ""}>Work Shift</button>
        </div>
      </article>`
    )
    .join("");

  const operations = getCrimeOperations(state)
    .map(
      (operation) => `
      <article class="card">
        <h4>${escapeHtml(operation.name)}</h4>
        <p class="muted">Req Street Rep ${operation.minStreetRep} · Risk ${Math.round(operation.risk * 100)}% · Reward ${currency(operation.rewardCash)}</p>
        <div class="actions">
          <button data-action="crime-operation" data-operation-id="${operation.id}" ${state.player.reputation.street < operation.minStreetRep ? "disabled" : ""}>Run Operation</button>
        </div>
      </article>`
    )
    .join("");

  const prisonActions = (state.prisonActions || [])
    .map(
      (entry) => `
      <button data-action="prison-action" data-prison-action-id="${entry.id}">${escapeHtml(entry.name)}</button>
    `
    )
    .join("");

  const prisonPanel = state.prison.active
    ? `<section class="card active-location">
      <h3>Prison Status</h3>
      <p class="muted">${escapeHtml(state.prison.reason || "Detained")} · Remaining turns: ${state.prison.remainingTurns}</p>
      <div class="actions">${prisonActions}</div>
    </section>`
    : `<section class="card"><h3>Prison Status</h3><p class="muted">No active prison sentence.</p></section>`;

  const creditPanel = `
    <section class="card">
      <h3>Credit / Loan Foundation</h3>
      <p class="muted">Debt ${currency(state.credit.debt)} · Limit ${currency(state.credit.creditLimit)} · Interest accrued ${currency(state.credit.interestAccrued)}</p>
      <div class="actions">
        <button data-action="credit-request" data-amount="500">Request $500</button>
        <button data-action="credit-repay" data-amount="300">Repay $300</button>
      </div>
    </section>
  `;

  const foundationPanel = `
    <section class="card">
      <h3>Future Systems Foundation</h3>
      <p class="muted">Telegram: ${state.telegram.adapter} · Premium: ${state.premium.membership} · Admin Role: ${state.admin.role}</p>
      <p class="muted">Social: ${state.social.friends.length} friends / ${state.social.followers} followers · Romance partner: ${state.relationshipsFoundation.partnerId || "None"}</p>
      <p class="muted">Background population in district: ${(state.backgroundPopulation[state.selectedDistrictId] || []).map((entry) => entry.role).join(", ") || "None"}</p>
    </section>
  `;

  const debugActive = state.meta.debugMode;
  const debugPanel = debugActive
    ? `<section class="card"><h3>Debug Mode</h3><div class="actions">
      <button data-action="debug-money">+Money</button><button data-action="debug-xp">+XP</button><button data-action="debug-rep">+City Rep</button>
      <button data-action="debug-district">Unlock Underground</button><button data-action="debug-quest">Complete Story-01</button>
      <button data-action="debug-item">Add Medkit</button><button data-action="debug-vehicle">Add Sedan</button>
      <button data-action="debug-property">Add Apartment</button><button data-action="debug-off">Disable Debug</button>
    </div></section>`
    : "";

  root.innerHTML = `
    <section class="card marble">
      <h2>Systems Hub</h2>
      <div class="actions">
        <button data-action="casino-play" data-game="coinFlip">Coin Flip</button>
        <button data-action="casino-play" data-game="highLow">High / Low</button>
        <button data-action="casino-play" data-game="simpleDice">Simple Dice</button>
        <button data-action="mark-all-notes">Mark Notifications Read</button>
        <button data-action="return-city">Return City</button>
        <button data-action="upgrade-safehouse">Upgrade Safehouse</button>
        <button data-action="reset-game">Reset Game</button>
        ${debugActive ? "" : '<button data-action="debug-on">Enable Debug</button>'}
      </div>
    </section>
    ${prisonPanel}
    ${creditPanel}
    ${foundationPanel}
    <section class="card"><h3>Daily Quests</h3>${dailyQuests || '<p class="muted">No daily quests.</p>'}</section>
    <section class="card"><h3>Quests</h3>${quests}</section>
    <section class="card"><h3>Achievements</h3>${achievements}</section>
    <section class="card"><h3>Work</h3>${jobs}</section>
    <section class="card"><h3>Operations</h3>${operations}</section>
    <section class="card"><h3>Businesses</h3>${businesses}</section>
    <section class="card"><h3>Factions</h3>${factions}</section>
    <section class="card"><h3>Bank Transactions</h3>${transactions || '<p class="muted">No transactions yet.</p>'}</section>
    <section class="card"><h3>Notification Center</h3>${notifications || '<p class="muted">No notifications.</p>'}</section>
    ${debugPanel}
  `;
}

function render() {
  root.classList.remove("screen-enter");
  void root.offsetWidth;
  root.classList.add("screen-enter");

  nav.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === state.currentScreen);
    button.disabled = !state.meta.hasCreatedCharacter;
  });

  if (!state.meta.hasCreatedCharacter) {
    renderStatus();
    renderSetup();
    return;
  }

  renderStatus();

  switch (state.currentScreen) {
    case "districts":
      renderDistricts();
      break;
    case "profile":
      renderProfile();
      break;
    case "inventory":
      renderInventory();
      break;
    case "quests":
      renderQuests();
      break;
    default:
      renderCity();
  }
}

nav.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-screen]");
  if (!button || !state.meta.hasCreatedCharacter) return;
  navigateTo(state, button.dataset.screen);
  persist();
  render();
});

root.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const {
    action,
    districtId,
    locationId,
    actionId,
    amount,
    itemId,
    vehicleId,
    npcId,
    npcInteraction,
    businessId,
    propertyId,
    price,
    game,
    factionId,
    noteId,
    choiceId,
    jobId,
    operationId,
    prisonActionId,
    questId
  } = button.dataset;

  if (action === "create-player") {
    const input = document.getElementById("player-name-input");
    createPlayer(state, input?.value || "");
    if (state.meta.hasCreatedCharacter) navigateTo(state, "city");
    persist();
    render();
    return;
  }

  if (!state.meta.hasCreatedCharacter) return;

  if (action === "travel") travelToDistrict(state, districtId);
  if (action === "enter-location") moveToLocation(state, districtId, locationId);
  if (action === "location-action") performLocationAction(state, districtId, locationId, actionId);
  if (action === "safehouse-rest") safehouseRest(state);
  if (action === "safehouse-energy") safehouseRecoverEnergy(state);
  if (action === "upgrade-safehouse") upgradeSafehouse(state);
  if (action === "cool-heat") coolDistrictHeat(state, districtId || state.selectedDistrictId);
  if (action === "bank-deposit") bankDeposit(state, Number(amount || 200));
  if (action === "bank-withdraw") bankWithdraw(state, Number(amount || 200));
  if (action === "use-item") useInventoryItem(state, itemId);
  if (action === "buy-item") buyMarketItem(state, itemId, Number(price));
  if (action === "sell-item") sellMarketItem(state, itemId, Number(price));
  if (action === "buy-vehicle") buyVehicle(state, vehicleId);
  if (action === "select-vehicle" && vehicleId) state.player.currentVehicleId = vehicleId;
  if (action === "select-vehicle" && !vehicleId) cycleVehicle(state);
  if (action === "npc-action") interactWithNpc(state, npcId, npcInteraction);
  if (action === "business-action") runBusinessAction(state, businessId);
  if (action === "business-upgrade") runBusinessAction(state, businessId, "upgrade");
  if (action === "buy-property") buyProperty(state, propertyId);
  if (action === "faction-action") runFactionAction(state, factionId);
  if (action === "job-action") runJobAction(state, jobId);
  if (action === "crime-operation") runCrimeOperation(state, operationId);
  if (action === "prison-action") performPrisonAction(state, prisonActionId);
  if (action === "credit-request") requestCredit(state, Number(amount || 500));
  if (action === "credit-repay") repayCredit(state, Number(amount || 300));
  if (action === "casino-play") casinoPlay(state, game, 150);
  if (action === "claim-daily") claimDailyReward(state);
  if (action === "claim-daily-quest") claimDailyQuestReward(state, questId);
  if (action === "event-choice") chooseEventChoice(state, choiceId);
  if (action === "mark-note") markNotificationRead(state, noteId);
  if (action === "mark-all-notes") markAllNotificationsRead(state);
  if (action === "return-city") returnToCity(state);

  if (action === "debug-on") {
    toggleDebugMode(state, true);
    localStorage.setItem("narcos-city-debug", "1");
  }
  if (action === "debug-off") {
    toggleDebugMode(state, false);
    localStorage.removeItem("narcos-city-debug");
  }
  if (action === "debug-money") debugAddMoney(state, 5000);
  if (action === "debug-xp") debugAddXp(state, 240);
  if (action === "debug-rep") debugChangeReputation(state, "city", 8);
  if (action === "debug-district") debugUnlockDistrict(state, "underground");
  if (action === "debug-quest") debugCompleteQuest(state, "story-01");
  if (action === "debug-item") debugAddItem(state, "medkit", 3);
  if (action === "debug-vehicle") debugAddVehicle(state, "sedan-classic");
  if (action === "debug-property") debugAddProperty(state, "apt-oldtown");

  if (action === "reset-game") {
    if (window.confirm("Reset all progress?")) {
      state = resetGame();
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  persist();
  render();
});

if (localStorage.getItem("narcos-city-debug") === "1") {
  toggleDebugMode(state, true);
}

render();
