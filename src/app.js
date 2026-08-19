import {
  createInitialState,
  navigateTo,
  travelToDistrict,
  performLocationAction,
  safehouseRest,
  upgradeSafehouse,
  coolDistrictHeat,
  getSelectedDistrict
} from "./gameLogic.mjs";

const STORAGE_KEY = "narcos-city-state-v1";

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createInitialState();
    const parsed = JSON.parse(saved);
    if (!parsed?.player || !Array.isArray(parsed?.districts)) return createInitialState();
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

function renderCity() {
  const districtCards = state.districts
    .map(
      (d) => `
      <div class="card">
        <h3>${d.name}</h3>
        <p class="muted">${d.vibe}</p>
        <div class="grid-2">
          <div class="stat">Heat<strong>${d.heat}</strong>${statBar(d.heat)}</div>
          <div class="stat">Control<strong>${d.control}%</strong>${statBar(d.control)}</div>
        </div>
        <div class="actions">
          <button data-action="travel" data-district-id="${d.id}">Travel</button>
          <button data-action="cool" data-district-id="${d.id}">Lower Heat ($180)</button>
        </div>
      </div>`
    )
    .join("");

  root.innerHTML = `
    <section class="card marble">
      <h2>Main City Screen</h2>
      <p class="muted">Day ${state.day} · Current District: ${getSelectedDistrict(state).name}</p>
      <div class="grid-2">
        <div class="stat">Cash<strong>$${state.player.cash}</strong></div>
        <div class="stat">Reputation<strong>${state.player.reputation}</strong></div>
        <div class="stat">Health<strong>${state.player.health}</strong>${statBar(state.player.health)}</div>
        <div class="stat">Energy<strong>${state.player.energy}</strong>${statBar(state.player.energy)}</div>
      </div>
    </section>
    ${districtCards}
  `;
}

function renderDistricts() {
  const selected = getSelectedDistrict(state);
  const districtButtons = state.districts
    .map(
      (d) => `<button data-action="travel" data-district-id="${d.id}" ${d.id === selected.id ? "disabled" : ""}>${d.name}</button>`
    )
    .join("");

  const locations = selected.locations
    .map(
      (location) => `
      <div class="card">
        <h4>${location.name}</h4>
        <p class="muted">${location.description}</p>
        <div class="actions">
          ${location.actions
            .map(
              (a) => `<button data-action="location" data-district-id="${selected.id}" data-location-id="${location.id}" data-action-id="${a.id}">${a.name} (-${a.energy}⚡ / +$${a.cash})</button>`
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
      <h3>${selected.name}</h3>
      <p class="muted">Heat ${selected.heat} · Control ${selected.control}%</p>
    </section>
    ${locations}
  `;
}

function renderProfile() {
  root.innerHTML = `
    <section class="card marble">
      <h2>Player Profile</h2>
      <p class="muted">Alias: ${state.player.alias}</p>
      <div class="grid-2">
        <div class="stat">Level<strong>${state.player.level}</strong></div>
        <div class="stat">Safehouse<strong>${state.player.safehouseLevel}</strong></div>
        <div class="stat">Reputation<strong>${state.player.reputation}</strong>${statBar((state.player.reputation % 120) / 1.2)}</div>
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
    </section>
  `;
}

function renderSafehouse() {
  const upgradeCost = state.player.safehouseLevel * 900;
  root.innerHTML = `
    <section class="card marble">
      <h2>Safehouse</h2>
      <p class="muted">Black marble bunker with silver vault doors.</p>
      <p>Level <strong>${state.player.safehouseLevel}</strong></p>
      <div class="actions">
        <button data-action="rest">Rest & Recover</button>
        <button data-action="upgrade">Upgrade ($${upgradeCost})</button>
      </div>
    </section>
    <section class="card">
      <h3>Activities</h3>
      <p class="muted">Rest restores health and energy. Upgrades improve recovery.</p>
    </section>
  `;
}

function renderNotifications() {
  const items = state.notifications
    .map((n) => {
      const label = n.type === "error" ? "alert" : n.type === "success" ? "ok" : "";
      return `<div class="card"><span class="badge ${label}">${n.type.toUpperCase()}</span><p>${n.text}</p></div>`;
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
  if (action === "location") performLocationAction(state, districtId, locationId, actionId);
  if (action === "rest") safehouseRest(state);
  if (action === "upgrade") upgradeSafehouse(state);
  if (action === "cool") coolDistrictHeat(state, districtId);

  persist();
  render();
});

render();
