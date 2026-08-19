import { LOCATIONS } from "./gameData.mjs";
import {
  bankDeposit,
  bankWithdraw,
  buyMarketItem,
  buyVehicle,
  coolDistrictHeat,
  createInitialState,
  createPlayer,
  cycleVehicle,
  getCurrentLocation,
  getNpcsAtLocation,
  getSelectedDistrict,
  inspectInventory,
  inspectStorage,
  interactWithNpc,
  moveToLocation,
  navigateTo,
  normalizeState,
  performLocationAction,
  resetGame,
  returnToCity,
  runBusinessAction,
  safehouseRecoverEnergy,
  safehouseRest,
  sellMarketItem,
  travelToDistrict,
  upgradeSafehouse,
  useInventoryItem
} from "./gameLogic.mjs";

const STORAGE_KEY = "narcos-city-state-v2";

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createInitialState();
    return normalizeState(JSON.parse(saved));
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

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function statBar(value) {
  return `<div class="bar"><span style="width:${Math.max(0, Math.min(100, value))}%"></span></div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getLocation(locationId) {
  return LOCATIONS[locationId];
}

function renderStatus() {
  if (!state.meta.hasCreatedCharacter) {
    statusBar.innerHTML = `<p class="muted">Create your character to start your first day.</p>`;
    return;
  }
  const district = getSelectedDistrict(state);
  const location = getCurrentLocation(state);
  statusBar.innerHTML = `
    <div class="status-grid">
      <div><span>Name</span><strong>${escapeHtml(state.player.name)}</strong></div>
      <div><span>Title</span><strong>${escapeHtml(state.player.title)}</strong></div>
      <div><span>Lvl</span><strong>${state.player.level}</strong></div>
      <div><span>Money</span><strong>${formatMoney(state.player.wallet)}</strong></div>
      <div><span>Energy</span><strong>${state.player.energy}</strong></div>
      <div><span>Health</span><strong>${state.player.health}</strong></div>
      <div><span>Rep</span><strong>${state.player.reputation}</strong></div>
      <div><span>District</span><strong>${escapeHtml(district.name)}</strong></div>
      <div><span>Location</span><strong>${escapeHtml(location.name)}</strong></div>
      <div><span>Day/Turn</span><strong>${state.time.day}/${state.time.turn}</strong></div>
    </div>
  `;
}

function renderSetup() {
  root.innerHTML = `
    <section class="card marble">
      <h2>Welcome to NARCOS CITY</h2>
      <p class="muted">Enter your character name to begin your story.</p>
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

function renderCity() {
  const district = getSelectedDistrict(state);
  const currentLocation = getCurrentLocation(state);
  const locationsMarkup = district.locations
    .map((locationId) => {
      const location = getLocation(locationId);
      if (!location) return "";
      const active = locationId === state.currentLocationId ? " active-location" : "";
      return `
        <article class="card${active}">
          <h3>${escapeHtml(location.name)}</h3>
          <p class="muted">${escapeHtml(location.description)}</p>
          <div class="actions">
            <button data-action="enter-location" data-district-id="${district.id}" data-location-id="${locationId}">Enter</button>
            <button data-action="travel" data-district-id="${district.id}">Stay in ${escapeHtml(district.name)}</button>
          </div>
        </article>
      `;
    })
    .join("");

  const actionButtons = currentLocation.actions
    .map(
      (action) => `<button data-action="location-action" data-district-id="${district.id}" data-location-id="${currentLocation.id}" data-action-id="${action.id}">${escapeHtml(action.name)}</button>`
    )
    .join("");

  const npcs = getNpcsAtLocation(state, currentLocation.id)
    .map(
      (npc) => `
      <div class="stat">
        <span>${escapeHtml(npc.name)} · ${escapeHtml(npc.role)}</span>
        <strong>Relationship ${state.relationships[npc.id]?.relationshipValue ?? 0}</strong>
        <div class="actions">
          <button data-action="npc-action" data-npc-id="${npc.id}" data-npc-interaction="talk">Talk</button>
          <button data-action="npc-action" data-npc-id="${npc.id}" data-npc-interaction="socialize">Socialize</button>
          <button data-action="npc-action" data-npc-id="${npc.id}" data-npc-interaction="help">Help</button>
          <button data-action="npc-action" data-npc-id="${npc.id}" data-npc-interaction="leave">Leave</button>
        </div>
      </div>
    `
    )
    .join("");

  const eventMarkup = state.meta.lastEvent
    ? `<div class="card"><h3>${escapeHtml(state.meta.lastEvent.title)}</h3><p class="muted">${escapeHtml(state.meta.lastEvent.description)}</p></div>`
    : `<div class="card"><p class="muted">No active event. The city is waiting for your move.</p></div>`;

  root.innerHTML = `
    <section class="card marble">
      <h2>City Overview</h2>
      <p class="muted">${escapeHtml(district.name)} · ${escapeHtml(district.atmosphere)}</p>
      <p class="muted">Current location: ${escapeHtml(currentLocation.name)} · Day ${state.time.day}, Turn ${state.time.turn}</p>
      <p class="muted">${escapeHtml(state.player.status)}</p>
    </section>
    ${eventMarkup}
    <section class="card">
      <h3>Available Locations</h3>
      ${locationsMarkup}
    </section>
    <section class="card">
      <h3>${escapeHtml(currentLocation.name)} Actions</h3>
      <p class="muted">${escapeHtml(currentLocation.description)}</p>
      <div class="actions">${actionButtons}</div>
    </section>
    <section class="card">
      <h3>People Here</h3>
      ${npcs || '<p class="muted">No contacts available in this location.</p>'}
    </section>
  `;
}

function renderDistricts() {
  const districtCards = state.districts
    .map((district) => {
      const selected = district.id === state.selectedDistrictId;
      const vehicle = state.vehicles.find((entry) => entry.id === state.selectedVehicleId) || state.vehicles[0];
      const travelCost = Math.max(20, district.travelCost + vehicle.travelCost - 90);
      return `
        <article class="card${selected ? " active-location" : ""}">
          <h3>${escapeHtml(district.name)}</h3>
          <p class="muted">${escapeHtml(district.description)}</p>
          <p class="muted">Atmosphere: ${escapeHtml(district.atmosphere)}</p>
          <div class="grid-2">
            <div class="stat">Travel Cost<strong>${formatMoney(travelCost)}</strong></div>
            <div class="stat">Turn Cost<strong>${district.travelTurns}</strong></div>
            <div class="stat">Danger Mod<strong>${district.dangerModifier}</strong></div>
            <div class="stat">Rep Mod<strong>${district.reputationModifier}</strong></div>
          </div>
          <div class="actions">
            <button data-action="travel" data-district-id="${district.id}">Travel</button>
            <button data-action="enter-location" data-district-id="${district.id}" data-location-id="${district.locations[0]}">Enter ${escapeHtml(getLocation(district.locations[0])?.name || "Location")}</button>
            <button data-action="cool-heat" data-district-id="${district.id}">Reduce Heat</button>
          </div>
        </article>
      `;
    })
    .join("");

  root.innerHTML = `
    <section class="card marble">
      <h2>District System</h2>
      <p class="muted">Move between territories and control your influence route.</p>
    </section>
    ${districtCards}
  `;
}

function renderProfile() {
  const district = getSelectedDistrict(state);
  const location = getCurrentLocation(state);
  const stats = state.player.stats;
  const completedQuests = state.quests.filter((quest) => quest.completed).length;
  const unlockedAchievements = state.achievements.filter((achievement) => achievement.unlocked).length;

  root.innerHTML = `
    <section class="card marble">
      <h2>Player Profile</h2>
      <p class="muted">${escapeHtml(state.player.name)} · ${escapeHtml(state.player.title)} · Role: ${escapeHtml(state.player.role)}</p>
      <div class="grid-2">
        <div class="stat">Level<strong>${state.player.level}</strong></div>
        <div class="stat">Experience<strong>${state.player.experience}/${state.player.nextLevelExperience}</strong></div>
        <div class="stat">Money<strong>${formatMoney(state.player.wallet)}</strong></div>
        <div class="stat">Bank<strong>${formatMoney(state.player.bankBalance)}</strong></div>
        <div class="stat">Health<strong>${state.player.health}</strong>${statBar(state.player.health)}</div>
        <div class="stat">Energy<strong>${state.player.energy}</strong>${statBar(state.player.energy)}</div>
        <div class="stat">Reputation<strong>${state.player.reputation}</strong>${statBar(Math.min(100, state.player.reputation * 4))}</div>
        <div class="stat">District/Location<strong>${escapeHtml(district.name)} / ${escapeHtml(location.name)}</strong></div>
        <div class="stat">Day/Turn<strong>${state.time.day}/${state.time.turn}</strong></div>
        <div class="stat">Quests/Achievements<strong>${completedQuests} / ${unlockedAchievements}</strong></div>
      </div>
    </section>
    <section class="card">
      <h3>Statistics</h3>
      <div class="grid-2">
        <div class="stat">Strength<strong>${stats.strength}</strong></div>
        <div class="stat">Intelligence<strong>${stats.intelligence}</strong></div>
        <div class="stat">Charisma<strong>${stats.charisma}</strong></div>
        <div class="stat">Influence<strong>${stats.influence}</strong></div>
        <div class="stat">Street Reputation<strong>${stats.streetReputation}</strong></div>
      </div>
      <div class="actions">
        <button data-action="safehouse-rest">Rest</button>
        <button data-action="safehouse-energy">Recover Energy</button>
      </div>
    </section>
  `;
}

function renderInventory() {
  const items = state.inventory
    .map(
      (item) => `
      <article class="card">
        <h4>${escapeHtml(item.name)}</h4>
        <p class="muted">${escapeHtml(item.category)} · Qty ${item.quantity}</p>
        <p class="muted">${escapeHtml(item.description)}</p>
        <div class="actions">
          <button data-action="use-item" data-item-id="${item.id}">Use</button>
        </div>
      </article>
    `
    )
    .join("");

  const vehicles = state.vehicles
    .map(
      (vehicle) => `
      <article class="card${vehicle.id === state.selectedVehicleId ? " active-location" : ""}">
        <h4>${escapeHtml(vehicle.name)}</h4>
        <p class="muted">Speed ${vehicle.speed} · Travel Cost ${formatMoney(vehicle.travelCost)} · ${vehicle.owned ? "Owned" : `Price ${formatMoney(vehicle.price)}`}</p>
        <div class="actions">
          <button data-action="select-vehicle">Cycle Owned</button>
          ${vehicle.owned ? "" : `<button data-action="buy-vehicle" data-vehicle-id="${vehicle.id}">Buy</button>`}
        </div>
      </article>
    `
    )
    .join("");

  root.innerHTML = `
    <section class="card marble">
      <h2>Inventory & Economy</h2>
      <p class="muted">Wallet ${formatMoney(state.player.wallet)} · Bank ${formatMoney(state.player.bankBalance)}</p>
      <div class="actions">
        <button data-action="bank-deposit" data-amount="200">Deposit $200</button>
        <button data-action="bank-withdraw" data-amount="200">Withdraw $200</button>
        <button data-action="inspect-inventory">Inspect Inventory</button>
        <button data-action="inspect-storage">Inspect Storage</button>
      </div>
      <div class="actions">
        <button data-action="buy-item" data-item-id="medkit" data-price="150">Buy Medkit ($150)</button>
        <button data-action="buy-item" data-item-id="energy-drink" data-price="60">Buy Energy Drink ($60)</button>
        <button data-action="sell-item" data-item-id="silver-watch" data-price="170">Sell Silver Watch (+$170)</button>
      </div>
    </section>
    <section class="card">
      <h3>Items</h3>
      ${items || '<p class="muted">Inventory is empty.</p>'}
    </section>
    <section class="card">
      <h3>Transport</h3>
      ${vehicles}
    </section>
  `;
}

function renderMore() {
  const questsMarkup = state.quests
    .map(
      (quest) => `
      <article class="card">
        <h4>${escapeHtml(quest.title)} ${quest.completed ? "✓" : ""}</h4>
        <p class="muted">${escapeHtml(quest.description)}</p>
        <p class="muted">Progress: ${quest.progress}/${quest.goal}</p>
      </article>
    `
    )
    .join("");

  const achievementsMarkup = state.achievements
    .map(
      (achievement) => `
      <article class="card">
        <h4>${escapeHtml(achievement.title)} ${achievement.unlocked ? "✓" : ""}</h4>
        <p class="muted">${escapeHtml(achievement.description)}</p>
      </article>
    `
    )
    .join("");

  const factionsMarkup = state.factions
    .map(
      (faction) => `
      <article class="card">
        <h4>${escapeHtml(faction.name)}</h4>
        <p class="muted">${escapeHtml(faction.description)}</p>
        <p class="muted">Influence ${faction.influence} · Your Reputation ${faction.playerReputation}</p>
      </article>
    `
    )
    .join("");

  const businessesMarkup = state.businesses
    .map(
      (business) => `
      <article class="card">
        <h4>${escapeHtml(business.name)} ${business.owned ? "(Owned)" : ""}</h4>
        <p class="muted">${escapeHtml(business.type)} · Value ${formatMoney(business.value)} · Income ${formatMoney(business.income)}</p>
        <p class="muted">Business Reputation: ${business.reputation}</p>
        <div class="actions">
          <button data-action="business-action" data-business-id="${business.id}">${business.owned ? "Collect Income" : "Start Operation"}</button>
        </div>
      </article>
    )
    .join("");

  const toasts = state.notifications
    .slice(0, 6)
    .map(
      (note) => `<article class="card"><span class="badge ${note.type === "error" ? "alert" : note.type === "success" ? "ok" : ""}">${escapeHtml(
        note.type.toUpperCase()
      )}</span><p>${escapeHtml(note.text)}</p></article>`
    )
    .join("");

  root.innerHTML = `
    <section class="card marble">
      <h2>More</h2>
      <p class="muted">Quests, achievements, factions, businesses, and settings.</p>
      <div class="actions">
        <button data-action="return-city">Return to City</button>
        <button data-action="reset-game">Reset Game</button>
      </div>
    </section>
    <section class="card"><h3>Quests</h3>${questsMarkup}</section>
    <section class="card"><h3>Achievements</h3>${achievementsMarkup}</section>
    <section class="card"><h3>Factions</h3>${factionsMarkup}</section>
    <section class="card"><h3>Businesses</h3>${businessesMarkup}</section>
    <section class="card"><h3>Notifications</h3>${toasts || '<p class="muted">No notifications.</p>'}</section>
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
    case "more":
      renderMore();
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

  const { action, districtId, locationId, actionId, amount, itemId, vehicleId, npcId, npcInteraction, businessId, price } = button.dataset;

  if (action === "create-player") {
    const input = document.getElementById("player-name-input");
    createPlayer(state, input?.value || "");
    if (state.meta.hasCreatedCharacter) navigateTo(state, "city");
  }

  if (!state.meta.hasCreatedCharacter && action !== "create-player") {
    return;
  }

  if (action === "travel") travelToDistrict(state, districtId);
  if (action === "enter-location") moveToLocation(state, districtId, locationId);
  if (action === "location-action") performLocationAction(state, districtId, locationId, actionId);
  if (action === "safehouse-rest") safehouseRest(state);
  if (action === "safehouse-energy") safehouseRecoverEnergy(state);
  if (action === "upgrade-safehouse") upgradeSafehouse(state);
  if (action === "cool-heat") coolDistrictHeat(state, districtId);
  if (action === "inspect-inventory") inspectInventory(state);
  if (action === "inspect-storage") inspectStorage(state);
  if (action === "return-city") returnToCity(state);
  if (action === "bank-deposit") bankDeposit(state, Number(amount));
  if (action === "bank-withdraw") bankWithdraw(state, Number(amount));
  if (action === "use-item") useInventoryItem(state, itemId);
  if (action === "buy-item") buyMarketItem(state, itemId, Number(price));
  if (action === "sell-item") sellMarketItem(state, itemId, Number(price));
  if (action === "buy-vehicle") buyVehicle(state, vehicleId);
  if (action === "select-vehicle") cycleVehicle(state);
  if (action === "npc-action") interactWithNpc(state, npcId, npcInteraction);
  if (action === "business-action") runBusinessAction(state, businessId);

  if (action === "reset-game") {
    if (window.confirm("Reset game progress? This cannot be undone.")) {
      state = resetGame();
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  persist();
  render();
});

render();
