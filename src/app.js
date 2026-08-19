import {
  createInitialState,
  DISTRICTS,
  LEVEL_THRESHOLD,
  navigateTo,
  travelToDistrict,
  moveToLocation,
  performLocationAction,
  safehouseRest,
  safehouseRecoverEnergy,
  upgradeSafehouse,
  coolDistrictHeat,
  inspectInventory,
  inspectStorage,
  returnToCity,
  getSelectedDistrict,
  getCurrentLocation
} from "./gameLogic.mjs";

const STORAGE_KEY = "narcos-city-state-v1";

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createInitialState();
    const parsed = JSON.parse(saved);
    if (!parsed?.player || !Array.isArray(parsed?.districts)) return createInitialState();
    if (!parsed.selectedDistrictId) {
      parsed.selectedDistrictId = DISTRICTS[0].id;
    }
    if (!parsed.currentLocationId) {
      parsed.currentLocationId = parsed.districts[0]?.locations?.[0]?.id || DISTRICTS[0].locations[0].id;
    }
    parsed.player.title ||= "Underboss of Velvet Syndicate";
    parsed.player.status ||= "Consolidating influence";
    parsed.player.stats ||= { influence: 14, strategy: 16, force: 11 };
    parsed.inventory ||= ["Silver Passkey", "Burner Phone", "Discreet Ledger"];
    parsed.storage ||= ["Fine suits", "Secured cash bundles", "Encrypted drive"];
    if (parsed.player.nextLevelReputation == null) {
      parsed.player.nextLevelReputation = parsed.player.level * LEVEL_THRESHOLD;
      while (parsed.player.reputation >= parsed.player.nextLevelReputation) {
        parsed.player.level += 1;
        parsed.player.nextLevelReputation += LEVEL_THRESHOLD;
      }
    }
    return parsed;
  } catch {
    return createInitialState();
  }
}

let state = loadState();

const root = document.getElementById("screen-root");
const nav = document.getElementById("bottom-nav");

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function statBar(value) {
  return `<div class="bar"><span style="width:${Math.max(0, Math.min(value, 100))}%"></span></div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function renderCity() {
  const district = getSelectedDistrict(state);
  const location = getCurrentLocation(state);
  const districtCards = state.districts
    .map(
      (d) => `
      <div class="card">
        <h3>${escapeHtml(d.name)}</h3>
        <p class="muted">${escapeHtml(d.vibe)}</p>
        <div class="grid-2">
          <div class="stat">Heat<strong>${d.heat}</strong>${statBar(d.heat)}</div>
          <div class="stat">Control<strong>${d.control}%</strong>${statBar(d.control)}</div>
        </div>
        <div class="actions">
          <button data-action="travel" data-district-id="${d.id}">Travel</button>
          <button data-action="goto-location" data-district-id="${d.id}" data-location-id="${d.locations[0].id}">Enter ${escapeHtml(d.locations[0].name)}</button>
          <button data-action="cool" data-district-id="${d.id}">Lower Heat ($180)</button>
        </div>
      </div>`
    )
    .join("");

  root.innerHTML = `
    <section class="card marble">
      <h2>City Command</h2>
      <p class="muted">Day ${state.day} · District: ${escapeHtml(district.name)} · Location: ${escapeHtml(location.name)}</p>
      <div class="grid-2">
        <div class="stat">Cash<strong>$${state.player.cash}</strong></div>
        <div class="stat">Reputation<strong>${state.player.reputation}</strong></div>
        <div class="stat">Level<strong>${state.player.level}</strong></div>
        <div class="stat">Status<strong>${escapeHtml(state.player.status)}</strong></div>
        <div class="stat">Health<strong>${state.player.health}</strong>${statBar(state.player.health)}</div>
        <div class="stat">Energy<strong>${state.player.energy}</strong>${statBar(state.player.energy)}</div>
      </div>
    </section>
    <section class="card">
      <h3>Interactive Locations</h3>
      <p class="muted">${escapeHtml(location.description)}</p>
      <div class="actions">
        ${location.actions
          .map(
            (a) => `<button data-action="location" data-district-id="${district.id}" data-location-id="${location.id}" data-action-id="${a.id}">${escapeHtml(a.name)} (-${a.energy}⚡ / +$${a.cash})</button>`
          )
          .join("")}
      </div>
    </section>
    ${districtCards}
  `;
}

function renderDistricts() {
  const selected = getSelectedDistrict(state);
  const districtButtons = state.districts
    .map(
      (d) => `<button data-action="travel" data-district-id="${d.id}" ${d.id === selected.id ? "disabled" : ""}>${escapeHtml(d.name)}</button>`
    )
    .join("");

  const locations = selected.locations
    .map(
      (location) => `
      <div class="card">
        <h4>${escapeHtml(location.name)}</h4>
        <p class="muted">${escapeHtml(location.description)}</p>
        <div class="actions">
          <button data-action="goto-location" data-district-id="${selected.id}" data-location-id="${location.id}">Move Here</button>
          ${location.actions
            .map(
              (a) => `<button data-action="location" data-district-id="${selected.id}" data-location-id="${location.id}" data-action-id="${a.id}">${escapeHtml(a.name)} (-${a.energy}⚡ / +$${a.cash})</button>`
            )
            .join("")}
        </div>
      </div>`
    )
    .join("");

  root.innerHTML = `
    <section class="card">
      <h2>City Districts</h2>
      <p class="muted">Select territory and run premium operations.</p>
      <div class="actions">${districtButtons}</div>
    </section>
    <section class="card marble">
      <h3>${escapeHtml(selected.name)}</h3>
      <p class="muted">Heat ${selected.heat} · Control ${selected.control}% · Active: ${escapeHtml(getCurrentLocation(state).name)}</p>
    </section>
    ${locations}
  `;
}

function renderProfile() {
  const district = getSelectedDistrict(state);
  const location = getCurrentLocation(state);
  root.innerHTML = `
    <section class="card marble">
      <h2>Player Profile</h2>
      <p class="muted">${escapeHtml(state.player.alias)} · ${escapeHtml(state.player.title)}</p>
      <div class="grid-2">
        <div class="stat">Level<strong>${state.player.level}</strong></div>
        <div class="stat">Safehouse<strong>${state.player.safehouseLevel}</strong></div>
        <div class="stat">Reputation<strong>${state.player.reputation}</strong>${statBar((state.player.reputation % LEVEL_THRESHOLD) * (100 / LEVEL_THRESHOLD))}</div>
        <div class="stat">Cash<strong>$${state.player.cash}</strong></div>
      </div>
    </section>
    <section class="card">
      <h3>Player Stats</h3>
      <p class="muted">Health ${state.player.health}</p>
      ${statBar(state.player.health)}
      <p class="muted">Energy ${state.player.energy}</p>
      ${statBar(state.player.energy)}
      <p class="muted">Empire day: ${state.day}</p>
      <p class="muted">Influence ${state.player.stats.influence} · Strategy ${state.player.stats.strategy} · Force ${state.player.stats.force}</p>
      <p class="muted">Current location: ${escapeHtml(location.name)}, ${escapeHtml(district.name)}</p>
      <p class="muted">Current status: ${escapeHtml(state.player.status)}</p>
    </section>
  `;
}

function renderSafehouse() {
  const upgradeCost = state.player.safehouseLevel * 900;
  const inventoryItems = state.inventory.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const storageItems = state.storage.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  root.innerHTML = `
    <section class="card marble">
      <h2>Safehouse</h2>
      <p class="muted">Black marble bunker with silver vault doors.</p>
      <p>Level <strong>${state.player.safehouseLevel}</strong></p>
      <div class="actions">
        <button data-action="rest">Rest</button>
        <button data-action="recover-energy">Recover Energy</button>
        <button data-action="view-inventory">View Inventory</button>
        <button data-action="view-storage">View Storage</button>
        <button data-action="upgrade">Upgrade ($${upgradeCost})</button>
        <button data-action="return-city">Return to City</button>
      </div>
    </section>
    <section class="card">
      <h3>Activities</h3>
      <p class="muted">Rest restores health and energy. Upgrades improve recovery.</p>
      <div class="grid-2">
        <div class="stat">
          <span>Inventory</span>
          <ul>${inventoryItems}</ul>
        </div>
        <div class="stat">
          <span>Storage</span>
          <ul>${storageItems}</ul>
        </div>
      </div>
    </section>
  `;
}

function renderNotifications() {
  const items = state.notifications
    .map((n) => {
      const label = n.type === "error" ? "alert" : n.type === "success" ? "ok" : "";
      return `<div class="card"><span class="badge ${label}">${escapeHtml(n.type.toUpperCase())}</span><p>${escapeHtml(n.text)}</p></div>`;
    })
    .join("");

  root.innerHTML = `
    <section class="card marble">
      <h2>Notifications</h2>
      <p class="muted">Operational updates from across the city.</p>
    </section>
    ${items || '<div class="card"><p class="muted">No notifications yet.</p></div>'}
  `;
}

function render() {
  root.classList.remove("screen-enter");
  void root.offsetWidth;
  root.classList.add("screen-enter");
  nav.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === state.currentScreen);
  });

  switch (state.currentScreen) {
    case "districts":
      renderDistricts();
      break;
    case "profile":
      renderProfile();
      break;
    case "safehouse":
      renderSafehouse();
      break;
    case "notifications":
      renderNotifications();
      break;
    default:
      renderCity();
  }
}

nav.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-screen]");
  if (!button) return;
  navigateTo(state, button.dataset.screen);
  persist();
  render();
});

root.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { action, districtId, locationId, actionId } = button.dataset;

  if (action === "travel") travelToDistrict(state, districtId);
  if (action === "goto-location") moveToLocation(state, districtId, locationId);
  if (action === "location") performLocationAction(state, districtId, locationId, actionId);
  if (action === "rest") safehouseRest(state);
  if (action === "recover-energy") safehouseRecoverEnergy(state);
  if (action === "view-inventory") inspectInventory(state);
  if (action === "view-storage") inspectStorage(state);
  if (action === "upgrade") upgradeSafehouse(state);
  if (action === "return-city") returnToCity(state);
  if (action === "cool") coolDistrictHeat(state, districtId);

  persist();
  render();
});

render();
