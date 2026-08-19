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
  changeOutfit,
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
  performLifeActivity,
  performPrisonAction,
  payRent,
  repayCredit,
  rentProperty,
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
  startDateWithNpc,
  hostSocialEvent,
  proposeToNpc,
  toggleDebugMode,
  travelToDistrict,
  upgradeSafehouse,
  useInventoryItem
} from "./gameLogic.mjs";
import { mountCityWorld3d } from "./cityWorld3d.js";
import { createDistrictAnchors } from "./cityWorldFoundation.mjs";
import { createAudioManager } from "./audioManager.mjs";
import { cityWorldText, DEFAULT_LANGUAGE, getLanguage, t } from "./i18n.mjs";

const STORAGE_KEY = "narcos-city-state-v7";
const APP_SETTINGS_KEY = "narcos-city-settings-v1";
const LOADING_MS = 900;

function loadState() {
  try {
    const saved =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem("narcos-city-state-v6") ||
      localStorage.getItem("narcos-city-state-v5") ||
      localStorage.getItem("narcos-city-state-v4");
    return saved ? normalizeState(JSON.parse(saved)) : createInitialState();
  } catch {
    return createInitialState();
  }
}

let state = loadState();
try {
  const savedSettings = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY) || "null");
  if (savedSettings && typeof savedSettings === "object") {
    state.settings = { ...state.settings, ...savedSettings };
  }
} catch {
  // Ignore.
}
state.settings.language = ["ru", "en"].includes(state.settings.language) ? state.settings.language : DEFAULT_LANGUAGE;
const root = document.getElementById("screen-root");
const nav = document.getElementById("bottom-nav");
const statusBar = document.getElementById("status-bar");
const audio = createAudioManager();
let cityWorldSession = null;
let loading = true;
let startedFromMenu = false;
let runtimeNotice = "";

function setGameplayMode(active) {
  document.body.classList.toggle("gameplay-mode", !!active);
  document.body.classList.toggle("no-page-scroll", !!active);
}

function applyLocalizedShell() {
  const lang = getLanguage(state);
  document.documentElement.lang = lang;
  const subtitle = document.querySelector(".subtitle");
  if (subtitle) subtitle.textContent = lang === "ru" ? "Империя шёлка, стали и теней" : "Empire of Silk, Steel, and Shadows";
  const navLabels = [
    ["city", t(state, "nav.city", "CITY")],
    ["districts", t(state, "nav.map", "MAP")],
    ["quests", t(state, "nav.quests", "QUESTS")],
    ["inventory", t(state, "nav.inventory", "INVENTORY")],
    ["profile", t(state, "nav.profile", "PROFILE")],
    ["settings", t(state, "nav.settings", "SETTINGS")]
  ];
  navLabels.forEach(([screen, label]) => {
    const button = nav.querySelector(`button[data-screen="${screen}"]`);
    if (button) button.textContent = label;
  });
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(state.settings));
  } catch {
    // Ignore storage denial and keep current runtime state.
  }
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

function setRuntimeNotice(message) {
  runtimeNotice = String(message || "").trim();
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
    statusBar.innerHTML = `
      <p class="muted">Create your character and enter NARCOS CITY.</p>
      ${runtimeNotice ? `<p class="badge alert">${escapeHtml(runtimeNotice)}</p>` : ""}
    `;
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
      <div><span>Hunger / Hygiene / Mood</span><strong>${Math.round(state.player.hunger || 0)} / ${Math.round(state.player.hygiene || 0)} / ${Math.round(state.player.mood || 0)}</strong></div>
      <div><span>Health</span><strong>${state.player.health}</strong></div>
      <div><span>Respect / Influence</span><strong>${state.player.respect || 0} / ${state.player.influence}</strong></div>
      <div><span>Status</span><strong>${escapeHtml(state.player.status || "Active")}</strong></div>
      <div><span>Wanted</span><strong>${state.player.wantedLevel}/5</strong></div>
      <div><span>Rep Total</span><strong>${totalRep}</strong></div>
      <div><span>District</span><strong>${escapeHtml(district.name)}</strong></div>
      <div><span>Location</span><strong>${escapeHtml(location.name)}</strong></div>
      <div><span>Date / Time</span><strong>Y${state.time.year} M${state.time.month} D${state.time.monthDay} · ${String(state.time.hour).padStart(2, "0")}:${String(state.time.minute).padStart(2, "0")}</strong></div>
      <div><span>Lifestyle / Status</span><strong>${escapeHtml(state.life?.lifestyle || "Comfortable")} / ${escapeHtml(state.life?.socialStatus || "Unknown")}</strong></div>
    </div>
    ${runtimeNotice ? `<p class="badge alert">${escapeHtml(runtimeNotice)}</p>` : ""}
  `;
}

function renderSetup() {
  const isRu = getLanguage(state) === "ru";
  root.innerHTML = `
    <section class="card marble">
      <h2>NARCOS CITY — CHAPTER 1</h2>
      <p class="muted">${isRu ? "Город узнает ваше имя." : "The City Knows Your Name."}</p>
      <label class="field">
        <span>${isRu ? "Имя персонажа" : "Character Name"}</span>
        <input id="player-name-input" maxlength="24" placeholder="${isRu ? "Введите имя" : "Enter your name"}" />
      </label>
      <div class="actions">
        <button data-action="create-player">${t(state, "menu.enter", "Enter City")}</button>
      </div>
    </section>
  `;
}

function renderLoading() {
  root.innerHTML = `
    <section class="card marble loading-card">
      <h2>NARCOS CITY</h2>
      <p class="muted">Empire of Silk, Steel, and Shadows</p>
      <div class="loading-line"><span></span></div>
    </section>
  `;
}

function renderMainMenu() {
  const hasSave = !!state?.meta?.hasCreatedCharacter;
  const isRu = getLanguage(state) === "ru";
  root.innerHTML = `
    <section class="card marble menu-card">
      <h2>NARCOS CITY</h2>
      <p class="muted">${isRu ? "Империя шёлка, стали и теней" : "Empire of Silk, Steel, and Shadows"}</p>
      <div class="actions menu-actions">
        <button data-action="menu-new-game">${t(state, "menu.play", "PLAY")}</button>
        <button data-action="menu-continue" ${hasSave ? "" : "disabled"}>${t(state, "menu.continue", "CONTINUE")}</button>
        <button data-action="menu-profile">${t(state, "menu.profile", "PROFILE")}</button>
        <button data-action="menu-settings">${t(state, "menu.settings", "SETTINGS")}</button>
      </div>
    </section>
    ${
      !state.meta.hasCreatedCharacter
        ? `<section class="card">
        <h3>${t(state, "menu.create", "Create Character")}</h3>
        <p class="muted">Start as La Reina · Queen · Active</p>
        <label class="field">
          <span>${isRu ? "Имя персонажа" : "Character Name"}</span>
          <input id="player-name-input" maxlength="24" value="${escapeHtml(state.player.name || "La Reina")}" />
        </label>
        <div class="actions">
          <button data-action="create-player">${t(state, "menu.enter", "Enter City")}</button>
        </div>
      </section>`
        : ""
    }
  `;
}

function renderSettings() {
  const s = state.settings || {};
  const isRu = getLanguage(state) === "ru";
  root.innerHTML = `
    <section class="card marble">
      <h2>${t(state, "settings.title", "Settings")}</h2>
      <p class="muted">${isRu ? "Настройте производительность и управление для мобильной игры." : "Tune performance and control feel for mobile play."}</p>
      <label class="field"><span>${t(state, "settings.language", "Language")}</span>
        <select id="setting-language">
          <option value="ru" ${getLanguage(state) === "ru" ? "selected" : ""}>Русский</option>
          <option value="en" ${getLanguage(state) === "en" ? "selected" : ""}>English</option>
        </select>
      </label>
      <label class="field"><span>${t(state, "settings.graphics", "Graphics Quality")}</span>
        <select id="setting-graphics">
          <option value="low" ${s.graphicsQuality === "low" ? "selected" : ""}>LOW</option>
          <option value="medium" ${s.graphicsQuality === "medium" ? "selected" : ""}>MEDIUM</option>
          <option value="high" ${s.graphicsQuality === "high" ? "selected" : ""}>HIGH</option>
        </select>
      </label>
      <label class="field"><span>${t(state, "settings.controls", "Controls Sensitivity")} (${Number(s.controlsSensitivity || 1).toFixed(2)})</span>
        <input id="setting-controls" type="range" min="0.6" max="1.8" step="0.05" value="${s.controlsSensitivity || 1}" />
      </label>
      <label class="field"><span>${t(state, "settings.camera", "Camera Sensitivity")} (${Number(s.cameraSensitivity || 1).toFixed(2)})</span>
        <input id="setting-camera" type="range" min="0.6" max="1.8" step="0.05" value="${s.cameraSensitivity || 1}" />
      </label>
      <div class="actions">
        <button data-action="toggle-sound">${isRu ? "Звук" : "Sound"}: ${s.soundEnabled ? t(state, "common.on", "ON") : t(state, "common.off", "OFF")}</button>
        <button data-action="toggle-music">${isRu ? "Музыка" : "Music"}: ${s.musicEnabled ? t(state, "common.on", "ON") : t(state, "common.off", "OFF")}</button>
        <button data-action="save-settings">${t(state, "settings.save", "Save Settings")}</button>
      </div>
    </section>
  `;
}

function renderDistrictMap() {
  const anchors = createDistrictAnchors(state.districts);
  const entries = state.districts
    .map((district) => {
      const anchor = anchors[district.id] || { x: 0, z: 0 };
      const x = 120 + anchor.x * 2;
      const y = 120 + anchor.z * 2;
      const active = district.id === state.selectedDistrictId;
      return `<button class="district-map-point ${active ? "active" : ""}" data-action="travel" data-district-id="${district.id}" style="left:${x}px;top:${y}px;">${escapeHtml(
        district.name
      )}</button>`;
    })
    .join("");
  return `<section class="card">
    <h3>City Map</h3>
    <div class="district-map">${entries}</div>
  </section>`;
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
  if (cityWorldSession) {
    cityWorldSession.destroy();
    cityWorldSession = null;
  }
  const district = getSelectedDistrict(state);

  root.innerHTML = `
    <section class="city-gameplay-shell">
      ${
        state.world?.currentInteriorId
          ? `<div class="city-interior-pill">INTERIOR · ${escapeHtml(LOCATIONS[state.world.currentInteriorId]?.name || state.world.currentInteriorId)}</div>`
          : ""
      }
      <div id="city-world-3d-container" class="city-world-3d-container"></div>
    </section>
    <section class="city-quick-actions">
      <button data-action="claim-daily">DAILY</button>
      <button data-action="safehouse-rest">REST</button>
      <button data-action="safehouse-energy">ENERGY</button>
      <button data-action="menu-map">MAP</button>
    </section>
  `;

  const worldContainer = document.getElementById("city-world-3d-container");
  const mountFallbackWorld = () => {
    state.meta.disable3dWorld = true;
    setRuntimeNotice(t(state, "notices.worldUnavailable", "3D world unavailable in this browser. Use map, quests, inventory, and profile panels."));
    if (worldContainer) {
      worldContainer.innerHTML = `
        <div class="city-world-stage">
          <div class="city-world-overlay">
            <div class="city-world-heads-up">
              <p>3D world preview unavailable on this device/browser.</p>
              <p>Use the city panels to travel, enter locations, interact, and progress.</p>
            </div>
          </div>
        </div>
      `;
    }
  };

  if (state.meta.disable3dWorld) {
    mountFallbackWorld();
    return;
  }

  try {
    cityWorldSession = mountCityWorld3d({
      container: worldContainer,
      state,
      settings: state.settings,
      text: cityWorldText(state),
      onMenuAction: (menuAction) => {
        if (menuAction === "resume") return;
        if (menuAction === "map") navigateTo(state, "districts");
        if (menuAction === "quests") navigateTo(state, "quests");
        if (menuAction === "inventory") navigateTo(state, "inventory");
        if (menuAction === "profile") navigateTo(state, "profile");
        if (menuAction === "settings") navigateTo(state, "settings");
        if (menuAction === "save") setRuntimeNotice(t(state, "notices.saved", "Progress saved."));
        if (menuAction === "main-menu") navigateTo(state, "main-menu");
        persist();
        render();
      },
      onError: () => {
        cityWorldSession = null;
        mountFallbackWorld();
        persist();
        render();
      },
      onInteract: (target) => {
        if (!target) return;
        if (state.settings?.soundEnabled) audio.interact();

        if (target.interactionType === "interior-exit") {
          state.world.currentInteriorId = null;
          persist();
          render();
          return;
        }

        if (target.interactionType === "district-marker") {
          state.world.currentInteriorId = null;
          travelToDistrict(state, target.id);
        }

        if (target.interactionType === "door") {
          if (target.districtId !== state.selectedDistrictId) {
            travelToDistrict(state, target.districtId);
          }
          if ((target.districtId || state.selectedDistrictId) === state.selectedDistrictId) {
            moveToLocation(state, target.districtId || state.selectedDistrictId, target.id);
            state.world.currentInteriorId = target.enterable ? target.id : null;
          }
        }

        if (target.interactionType === "npc") {
          state.world.currentInteriorId = null;
          if (target.districtId !== state.selectedDistrictId) {
            travelToDistrict(state, target.districtId);
          }
          if (
            (target.districtId || state.selectedDistrictId) === state.selectedDistrictId &&
            target.locationId &&
            state.currentLocationId !== target.locationId
          ) {
            moveToLocation(state, target.districtId || state.selectedDistrictId, target.locationId);
          }
          if ((target.districtId || state.selectedDistrictId) === state.selectedDistrictId) {
            interactWithNpc(state, target.id, "talk");
          }
        }

        if (target.interactionType === "vehicle") {
          state.world.currentInteriorId = null;
          const owned = state.vehicles.find((entry) => entry.id === target.id)?.owned;
          if (owned) {
            state.player.currentVehicleId = target.id;
          } else {
            navigateTo(state, "inventory");
          }
        }

        persist();
        render();
      }
    });
  } catch (error) {
    cityWorldSession = null;
    console.error("Failed to mount 3D city world:", error);
    mountFallbackWorld();
  }
}

function renderDistricts() {
  if (cityWorldSession) {
    cityWorldSession.destroy();
    cityWorldSession = null;
  }
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
    ${renderDistrictMap()}
    ${cards}
  `;
}

function renderProfile() {
  if (cityWorldSession) {
    cityWorldSession.destroy();
    cityWorldSession = null;
  }
  const rep = state.player.reputation;
  const titleIndex = TITLE_RANKS.findIndex((rank) => rank.name === state.player.title);
  const life = state.life || {};

  root.innerHTML = `
    <section class="card marble">
      <h2>Profile</h2>
      <p class="muted">${escapeHtml(state.player.name)} · ${escapeHtml(state.player.title)} (Rank ${titleIndex + 1}/${TITLE_RANKS.length})</p>
      <div class="grid-2">
        <div class="stat">Level<strong>${state.player.level}</strong>${progressBar(state.player.xp, state.player.nextLevelXp)}</div>
        <div class="stat">Influence<strong>${state.player.influence}</strong>${progressBar(state.player.influence, 100)}</div>
        <div class="stat">Health<strong>${state.player.health}</strong>${progressBar(state.player.health)}</div>
        <div class="stat">Energy<strong>${state.player.energy}</strong>${progressBar(state.player.energy)}</div>
        <div class="stat">Hunger<strong>${Math.round(state.player.hunger || 0)}</strong>${progressBar(state.player.hunger || 0)}</div>
        <div class="stat">Hygiene<strong>${Math.round(state.player.hygiene || 0)}</strong>${progressBar(state.player.hygiene || 0)}</div>
        <div class="stat">Mood<strong>${Math.round(state.player.mood || 0)}</strong>${progressBar(state.player.mood || 0)}</div>
        <div class="stat">Strength<strong>${state.player.strength}</strong></div>
        <div class="stat">Intelligence<strong>${state.player.intelligence}</strong></div>
        <div class="stat">Charisma<strong>${state.player.charisma}</strong></div>
        <div class="stat">Wanted<strong>${state.player.wantedLevel}/5</strong>${progressBar(state.player.wantedLevel, 5)}</div>
      </div>
    </section>
    <section class="card">
      <h3>Life Core</h3>
      <div class="grid-2">
        <div class="stat">Age<strong>${life.age || 0}</strong></div>
        <div class="stat">Birthday<strong>${life.birthday ? `${life.birthday.day}/${life.birthday.month}` : "—"}</strong></div>
        <div class="stat">Occupation<strong>${escapeHtml(life.occupation || "Unemployed")}</strong></div>
        <div class="stat">Career<strong>${escapeHtml(life.career?.level || "Entry")} · XP ${life.career?.xp || 0}</strong></div>
        <div class="stat">Education<strong>${escapeHtml(life.education?.level || "School")} · ${life.education?.points || 0} pts</strong></div>
        <div class="stat">Residence<strong>${escapeHtml(life.residence?.type || "None")} (${escapeHtml(life.residence?.ownership || "None")})</strong></div>
        <div class="stat">Relationship<strong>${escapeHtml(life.relationshipStatus || "Single")}</strong></div>
        <div class="stat">Lifestyle / Social<strong>${escapeHtml(life.lifestyle || "Comfortable")} / ${escapeHtml(life.socialStatus || "Unknown")}</strong></div>
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
  if (cityWorldSession) {
    cityWorldSession.destroy();
    cityWorldSession = null;
  }
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
        <p class="muted">Rent Weekly ${currency(property.rentWeekly || 0)} · Rent Monthly ${currency(property.rentMonthly || 0)}</p>
        <div class="actions">
          ${property.owned ? "" : `<button data-action="buy-property" data-property-id="${property.id}">Buy</button>`}
          ${property.owned ? "" : `<button data-action="rent-property" data-property-id="${property.id}" data-rent-mode="weekly">Rent Weekly</button>`}
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
        <button data-action="pay-rent">Pay Rent</button>
        <button data-action="select-vehicle">Cycle Vehicle</button>
      </div>
    </section>
    <section class="card">
      <h3>Daily Life</h3>
      <div class="actions">
        <button data-action="life-activity" data-life-activity="eat">Eat</button>
        <button data-action="life-activity" data-life-activity="sleep">Sleep</button>
        <button data-action="life-activity" data-life-activity="rest">Rest</button>
        <button data-action="life-activity" data-life-activity="shower">Shower</button>
        <button data-action="life-activity" data-life-activity="study">Study</button>
        <button data-action="life-activity" data-life-activity="exercise">Exercise</button>
      </div>
      <div class="actions">
        <button data-action="outfit" data-outfit-preset="Casual">Casual</button>
        <button data-action="outfit" data-outfit-preset="Elegant">Elegant</button>
        <button data-action="outfit" data-outfit-preset="Luxury">Luxury</button>
        <button data-action="outfit" data-outfit-preset="Street">Street</button>
        <button data-action="outfit" data-outfit-preset="Business">Business</button>
        <button data-action="outfit" data-outfit-preset="Nightlife">Nightlife</button>
        <button data-action="outfit" data-outfit-preset="Sport">Sport</button>
      </div>
      <p class="muted">Current outfit: ${escapeHtml(state.life?.wardrobe?.currentPreset || "Casual")} · Residence: ${escapeHtml(state.life?.residence?.type || "None")} (${escapeHtml(state.life?.residence?.ownership || "None")})</p>
    </section>
    <section class="card"><h3>Inventory</h3>${inventoryCards || '<p class="muted">Inventory empty.</p>'}</section>
    <section class="card"><h3>Market</h3>${marketCards}</section>
    <section class="card"><h3>Vehicle Shop</h3>${vehicleCards}</section>
    <section class="card"><h3>Property Market</h3>${propertyCards}</section>
  `;
}

function renderQuests() {
  if (cityWorldSession) {
    cityWorldSession.destroy();
    cityWorldSession = null;
  }
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

  const socialCandidates = state.npcs
    .slice(0, 6)
    .map((npc) => {
      const rel = state.relationships[npc.id] || { value: 0, status: "Stranger", romance: 0 };
      return `<article class="card">
        <h4>${escapeHtml(npc.name)}</h4>
        <p class="muted">${escapeHtml(npc.role)} · ${rel.value} (${escapeHtml(rel.status)}) · Romance ${rel.romance || 0}</p>
        <div class="actions">
          <button data-action="npc-action" data-npc-id="${npc.id}" data-npc-interaction="chat">Chat</button>
          <button data-action="npc-action" data-npc-id="${npc.id}" data-npc-interaction="hang-out">Hang Out</button>
          <button data-action="npc-action" data-npc-id="${npc.id}" data-npc-interaction="flirt">Flirt</button>
          <button data-action="date-npc" data-npc-id="${npc.id}" data-location-id="restaurant">Date</button>
          <button data-action="propose-npc" data-npc-id="${npc.id}">Propose</button>
        </div>
      </article>`;
    })
    .join("");

  const lifeCalendar = (state.life?.calendar?.events || [])
    .slice(0, 8)
    .map((entry) => `<p class="muted">• [D${entry.day}] ${escapeHtml(entry.type)} — ${escapeHtml(entry.title)}</p>`)
    .join("");

  const financeSummary = state.life?.finance || {};

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
    <section class="card">
      <h3>Social Life</h3>
      <div class="actions">
        <button data-action="social-event" data-event-type="dinner">Dinner</button>
        <button data-action="social-event" data-event-type="party">Party</button>
        <button data-action="social-event" data-event-type="club-night">Club Night</button>
        <button data-action="social-event" data-event-type="engagement">Engagement Event</button>
        <button data-action="social-event" data-event-type="wedding">Wedding</button>
      </div>
      ${socialCandidates || '<p class="muted">No social contacts available.</p>'}
    </section>
    <section class="card">
      <h3>Finance Summary</h3>
      <div class="grid-2">
        <div class="stat">Weekly Income<strong>${currency(financeSummary.weeklyIncome || 0)}</strong></div>
        <div class="stat">Weekly Expenses<strong>${currency(financeSummary.weeklyExpenses || 0)}</strong></div>
        <div class="stat">Monthly Income<strong>${currency(financeSummary.monthlyIncome || 0)}</strong></div>
        <div class="stat">Monthly Expenses<strong>${currency(financeSummary.monthlyExpenses || 0)}</strong></div>
        <div class="stat">Housing Costs<strong>${currency(financeSummary.housingCosts || 0)}</strong></div>
        <div class="stat">Avg Spend<strong>${currency(financeSummary.averageSpending || 0)}</strong></div>
      </div>
    </section>
    <section class="card"><h3>Calendar</h3>${lifeCalendar || '<p class="muted">No planned events yet.</p>'}</section>
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
  try {
    applyLocalizedShell();
    const gameplayMode = !loading && state.meta.hasCreatedCharacter && state.currentScreen === "city";
    setGameplayMode(gameplayMode);
    root.classList.remove("screen-enter");
    void root.offsetWidth;
    root.classList.add("screen-enter");

    if (loading) {
      nav.style.display = "none";
      if (cityWorldSession) {
        cityWorldSession.destroy();
        cityWorldSession = null;
      }
      renderStatus();
      renderLoading();
      return;
    }

    const navVisible = state.meta.hasCreatedCharacter && ["districts", "profile", "inventory", "quests", "settings"].includes(state.currentScreen);
    nav.style.display = navVisible ? "grid" : "none";
    nav.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.screen === state.currentScreen);
      button.disabled = !state.meta.hasCreatedCharacter && button.dataset.screen !== "settings";
    });

    if (!state.meta.hasCreatedCharacter && state.currentScreen !== "settings") {
      if (cityWorldSession) {
        cityWorldSession.destroy();
        cityWorldSession = null;
      }
      if (gameplayMode) {
        statusBar.innerHTML = "";
      } else {
        if (cityWorldSession) {
          cityWorldSession.destroy();
          cityWorldSession = null;
        }
        renderStatus();
      }
      renderMainMenu();
      return;
    }

    renderStatus();

    switch (state.currentScreen) {
      case "main-menu":
        renderMainMenu();
        break;
      case "settings":
        renderSettings();
        break;
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
  } catch (error) {
    console.error("Render failure:", error);
    if (cityWorldSession) {
      cityWorldSession.destroy();
      cityWorldSession = null;
    }
    nav.style.display = "none";
    setGameplayMode(false);
    setRuntimeNotice(t(state, "notices.uiError", "A UI error occurred. You can continue by returning to the main menu."));
    renderStatus();
    root.innerHTML = `
      <section class="card marble">
        <h2>Temporary UI Error</h2>
        <p class="muted">The interface recovered safely. Use the actions below to continue playing.</p>
        <div class="actions">
          <button data-action="menu-new-game">Return to Main Menu</button>
          <button data-action="menu-settings">Open Settings</button>
          <button data-action="reset-game">Reset Save</button>
        </div>
      </section>
    `;
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
  if (state.settings?.soundEnabled) audio.button();

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
    questId,
    rentMode,
    lifeActivity,
    outfitPreset,
    eventType
  } = button.dataset;
  try {
    if (action === "create-player") {
      const input = document.getElementById("player-name-input");
      createPlayer(state, input?.value || "");
      if (state.meta.hasCreatedCharacter) {
        startedFromMenu = true;
        navigateTo(state, "city");
      }
      setRuntimeNotice("");
      persist();
      render();
      return;
    }

    if (action === "menu-new-game") {
      startedFromMenu = true;
      if (state.meta.hasCreatedCharacter) {
        state = resetGame();
      }
      setRuntimeNotice("");
      navigateTo(state, "main-menu");
      persist();
      render();
      return;
    }
    if (action === "menu-continue") {
      startedFromMenu = true;
      setRuntimeNotice("");
      navigateTo(state, "city");
      persist();
      render();
      return;
    }
    if (action === "menu-profile") {
      if (state.meta.hasCreatedCharacter) {
        navigateTo(state, "profile");
        setRuntimeNotice("");
      } else {
        setRuntimeNotice(t(state, "notices.createFirst", "Create a character first to view the full profile."));
      }
      persist();
      render();
      return;
    }
    if (action === "menu-settings") {
      navigateTo(state, "settings");
      setRuntimeNotice("");
      persist();
      render();
      return;
    }
    if (action === "menu-map") {
      navigateTo(state, "districts");
      setRuntimeNotice("");
      persist();
      render();
      return;
    }

    if (action === "toggle-sound") state.settings.soundEnabled = !state.settings.soundEnabled;
    if (action === "toggle-music") state.settings.musicEnabled = !state.settings.musicEnabled;
    if (action === "save-settings") {
      const controlsSensitivity = Number(document.getElementById("setting-controls")?.value || state.settings.controlsSensitivity || 1);
      const cameraSensitivity = Number(document.getElementById("setting-camera")?.value || state.settings.cameraSensitivity || 1);
      const graphicsQuality = document.getElementById("setting-graphics")?.value || state.settings.graphicsQuality || "medium";
      const language = document.getElementById("setting-language")?.value || state.settings.language || DEFAULT_LANGUAGE;
      state.settings.controlsSensitivity = Math.max(0.6, Math.min(1.8, controlsSensitivity));
      state.settings.cameraSensitivity = Math.max(0.6, Math.min(1.8, cameraSensitivity));
      state.settings.graphicsQuality = ["low", "medium", "high"].includes(graphicsQuality) ? graphicsQuality : "medium";
      state.settings.language = ["ru", "en"].includes(language) ? language : DEFAULT_LANGUAGE;
      setRuntimeNotice("");
      persist();
      render();
      return;
    }

    if (!state.meta.hasCreatedCharacter && !["settings", "main-menu"].includes(state.currentScreen)) return;

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
    if (action === "rent-property") rentProperty(state, propertyId, rentMode || "weekly");
    if (action === "pay-rent") payRent(state);
    if (action === "life-activity") performLifeActivity(state, lifeActivity);
    if (action === "outfit") changeOutfit(state, outfitPreset);
    if (action === "faction-action") runFactionAction(state, factionId);
    if (action === "job-action") runJobAction(state, jobId);
    if (action === "date-npc") startDateWithNpc(state, npcId, locationId || "restaurant");
    if (action === "propose-npc") proposeToNpc(state, npcId);
    if (action === "social-event") hostSocialEvent(state, eventType || "party");
    if (action === "crime-operation") runCrimeOperation(state, operationId);
    if (action === "prison-action") performPrisonAction(state, prisonActionId);
    if (action === "credit-request") requestCredit(state, Number(amount || 500));
    if (action === "credit-repay") repayCredit(state, Number(amount || 300));
    if (action === "casino-play") casinoPlay(state, game, 150);
    if (action === "claim-daily") claimDailyReward(state);
    if (action === "claim-daily-quest") claimDailyQuestReward(state, questId);
    if (action === "exit-interior") state.world.currentInteriorId = null;
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

    setRuntimeNotice("");
    persist();
    render();
  } catch (error) {
    console.error("Action failed:", action, error);
    setRuntimeNotice(t(state, "notices.actionFailed", "The last action failed safely. Please try again."));
    render();
  }
});

if (localStorage.getItem("narcos-city-debug") === "1") {
  toggleDebugMode(state, true);
}

render();
window.setTimeout(() => {
  loading = false;
  if (!startedFromMenu) {
    navigateTo(state, "main-menu");
  }
  render();
}, LOADING_MS);
