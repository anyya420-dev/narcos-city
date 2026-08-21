import { DISTRICTS, LOCATIONS, TITLE_RANKS } from "./gameData.mjs";
import {
  bankDeposit,
  bankTransfer,
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
  getContacts,
  getFactionList,
  getFamilyOverview,
  getInventoryEntries,
  getJobs,
  getNpcsAtLocation,
  getProperties,
  getSelectedDistrict,
  getTerritories,
  interactWithNpc,
  markAllNotificationsRead,
  markNotificationRead,
  moveToLocation,
  navigateTo,
  normalizeState,
  performLocationAction,
  performLifeActivity,
  performFamilyInteraction,
  performPrisonAction,
  payRent,
  repayCredit,
  repairVehicle,
  rentProperty,
  requestCredit,
  resetGame,
  returnToCity,
  runBusinessAction,
  runCrimeOperation,
  runFactionAction,
  runTerritoryAction,
  runJobAction,
  safehouseRecoverEnergy,
  safehouseRest,
  sellMarketItem,
  sellVehicle,
  storeVehicle,
  startDateWithNpc,
  upgradeProperty,
  upgradeVehicle,
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

const STORAGE_KEY = "narcos-city-state-v8";
const APP_SETTINGS_KEY = "narcos-city-settings-v1";
const LOADING_MS = 900;

function loadState() {
  try {
    const saved =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem("narcos-city-state-v7") ||
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
state.settings.soundEnabled = state.settings.soundEnabled !== false;
state.settings.musicEnabled = state.settings.musicEnabled !== false;
state.settings.muted = Boolean(state.settings.muted);
state.settings.sfxVolume = Number.isFinite(state.settings.sfxVolume) ? Math.max(0, Math.min(1, state.settings.sfxVolume)) : 0.7;
state.settings.musicVolume = Number.isFinite(state.settings.musicVolume) ? Math.max(0, Math.min(1, state.settings.musicVolume)) : 0.5;
state.settings.ambientVolume = Number.isFinite(state.settings.ambientVolume) ? Math.max(0, Math.min(1, state.settings.ambientVolume)) : 0.55;
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

function syncAudioSettings() {
  audio.applySettings({
    muted: !!state.settings.muted || state.settings.soundEnabled === false,
    sfxVolume: state.settings.sfxVolume,
    musicVolume: state.settings.musicEnabled === false ? 0 : state.settings.musicVolume,
    ambientVolume: state.settings.ambientVolume
  });
}

syncAudioSettings();

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
    ["family", t(state, "nav.family", "FAMILY")],
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
      <p class="muted">${t(state, "notices.setupHint", "Create your character and enter NARCOS CITY.")}</p>
      ${runtimeNotice ? `<p class="badge alert">${escapeHtml(runtimeNotice)}</p>` : ""}
    `;
    return;
  }

  const district = getSelectedDistrict(state);
  const location = getCurrentLocation(state);
  const totalRep = state.player.reputation.city + state.player.reputation.street + state.player.reputation.business + state.player.reputation.faction;
  const isRu = getLanguage(state) === "ru";
  const L = isRu
    ? { name: "Имя", title: "Титул", level: "Уровень", xp: "Опыт", cash: "Нал / Банк", energy: "Энергия", needs: "Голод / Гигиена / Настроение", health: "Здоровье", respect: "Уважение / Влияние", status: "Статус", wanted: "Розыск", rep: "Репутация", district: "Район", location: "Локация", datetime: "Дата / Время", lifestyle: "Образ жизни / Статус" }
    : { name: "Name", title: "Title", level: "Level", xp: "XP", cash: "Cash / Bank", energy: "Energy", needs: "Hunger / Hygiene / Mood", health: "Health", respect: "Respect / Influence", status: "Status", wanted: "Wanted", rep: "Rep Total", district: "District", location: "Location", datetime: "Date / Time", lifestyle: "Lifestyle / Status" };
  statusBar.innerHTML = `
    <div class="status-grid">
      <div><span>${L.name}</span><strong>${escapeHtml(state.player.name)}</strong></div>
      <div><span>${L.title}</span><strong>${escapeHtml(state.player.title)}</strong></div>
      <div><span>${L.level}</span><strong>${state.player.level}</strong></div>
      <div><span>${L.xp}</span><strong>${state.player.xp}/${state.player.nextLevelXp}</strong></div>
      <div><span>${L.cash}</span><strong>${currency(state.player.money)} / ${currency(state.player.bankBalance)}</strong></div>
      <div><span>${L.energy}</span><strong>${state.player.energy}</strong></div>
      <div><span>${L.needs}</span><strong>${Math.round(state.player.hunger || 0)} / ${Math.round(state.player.hygiene || 0)} / ${Math.round(state.player.mood || 0)}</strong></div>
      <div><span>${L.health}</span><strong>${state.player.health}</strong></div>
      <div><span>${L.respect}</span><strong>${state.player.respect || 0} / ${state.player.influence}</strong></div>
      <div><span>${L.status}</span><strong>${escapeHtml(state.player.status || (isRu ? "Активен" : "Active"))}</strong></div>
      <div><span>${L.wanted}</span><strong>${state.player.wantedLevel}/5</strong></div>
      <div><span>${L.rep}</span><strong>${totalRep}</strong></div>
      <div><span>${L.district}</span><strong>${escapeHtml(district.name)}</strong></div>
      <div><span>${L.location}</span><strong>${escapeHtml(location.name)}</strong></div>
      <div><span>${L.datetime}</span><strong>Y${state.time.year} M${state.time.month} D${state.time.monthDay} · ${String(state.time.hour).padStart(2, "0")}:${String(state.time.minute).padStart(2, "0")}</strong></div>
      <div><span>${L.lifestyle}</span><strong>${escapeHtml(state.life?.lifestyle || (isRu ? "Комфортный" : "Comfortable"))} / ${escapeHtml(state.life?.socialStatus || (isRu ? "Неизвестно" : "Unknown"))}</strong></div>
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
        <span>${t(state, "ui.characterName", "Character Name")}</span>
        <input id="player-name-input" maxlength="24" placeholder="${t(state, "ui.enterName", "Enter your name")}" />
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
          <span>${t(state, "ui.characterName", "Character Name")}</span>
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
        <button data-action="toggle-sound">${t(state, "settings.sound", "Sound")}: ${s.soundEnabled ? t(state, "common.on", "ON") : t(state, "common.off", "OFF")}</button>
        <button data-action="toggle-music">${t(state, "settings.music", "Music")}: ${s.musicEnabled ? t(state, "common.on", "ON") : t(state, "common.off", "OFF")}</button>
        <button data-action="toggle-mute">${t(state, "settings.mute", "Mute")}: ${s.muted ? t(state, "common.on", "ON") : t(state, "common.off", "OFF")}</button>
        <button data-action="save-settings">${t(state, "settings.save", "Save Settings")}</button>
      </div>
      <label class="field"><span>${t(state, "settings.sfxVolume", "SFX Volume")} (${Math.round((s.sfxVolume ?? 0.7) * 100)}%)</span>
        <input id="setting-sfx-volume" type="range" min="0" max="1" step="0.05" value="${s.sfxVolume ?? 0.7}" />
      </label>
      <label class="field"><span>${t(state, "settings.musicVolume", "Music Volume")} (${Math.round((s.musicVolume ?? 0.5) * 100)}%)</span>
        <input id="setting-music-volume" type="range" min="0" max="1" step="0.05" value="${s.musicVolume ?? 0.5}" />
      </label>
      <label class="field"><span>${t(state, "settings.ambientVolume", "Ambient Volume")} (${Math.round((s.ambientVolume ?? 0.55) * 100)}%)</span>
        <input id="setting-ambient-volume" type="range" min="0" max="1" step="0.05" value="${s.ambientVolume ?? 0.55}" />
      </label>
    </section>
  `;
}

function renderDistrictMap() {
  const anchors = createDistrictAnchors(state.districts);
  const currentDistrictId = state.selectedDistrictId;

  // World bounds (with padding)
  const PX = 12, PZ = 12;
  const minX = -55 - PX, maxX = 56 + PX;
  const minZ = -42 - PZ, maxZ = 52 + PZ;
  const rangeX = maxX - minX;
  const rangeZ = maxZ - minZ;

  // World-to-percent helpers for button overlay
  const toPercX = (x) => (((x - minX) / rangeX) * 100).toFixed(2);
  const toPercY = (z) => (((z - minZ) / rangeZ) * 100).toFixed(2);

  // District visual identity
  const districtMeta = {
    downtown:          { color: "#c4a96a", icon: "⬡", label: "DOWNTOWN" },
    "old-town":        { color: "#9b7c5c", icon: "⌛", label: "OLD TOWN" },
    harbor:            { color: "#4d8aae", icon: "⚓", label: "HARBOR" },
    industrial:        { color: "#7a7d52", icon: "⚙", label: "INDUSTRIAL" },
    "rich-district":   { color: "#a0507a", icon: "♦", label: "LUXURY" },
    underground:       { color: "#8050b8", icon: "◆", label: "UNDERGROUND" },
    residential:       { color: "#4a8c5c", icon: "⌂", label: "RESIDENTIAL" },
    "safehouse-area":  { color: "#5a5898", icon: "◈", label: "SAFEHOUSE" },
    "business-district": { color: "#5878a0", icon: "◉", label: "BUSINESS" },
    outskirts:         { color: "#a04040", icon: "⚡", label: "OUTSKIRTS" }
  };

  // Build road lines between nearby districts (distance < 58)
  const roadLines = [];
  const dists = state.districts;
  for (let i = 0; i < dists.length; i++) {
    for (let j = i + 1; j < dists.length; j++) {
      const a = anchors[dists[i].id];
      const b = anchors[dists[j].id];
      if (!a || !b) continue;
      const d = Math.hypot(a.x - b.x, a.z - b.z);
      if (d < 58) {
        roadLines.push([a.x, a.z, b.x, b.z]);
      }
    }
  }

  // Generate SVG road lines
  const roadSvg = roadLines.map(([x1, z1, x2, z2]) =>
    `<line x1="${x1}" y1="${z1}" x2="${x2}" y2="${z2}"
       stroke="rgba(80,96,112,0.45)" stroke-width="2.5" stroke-dasharray="5,4"
       stroke-linecap="round"/>`
  ).join("");

  // Generate district zone blobs in SVG
  const zoneSvg = state.districts.map((district) => {
    const anchor = anchors[district.id];
    if (!anchor) return "";
    const meta = districtMeta[district.id] || { color: "#6a6a8a", icon: "•" };
    const isCurrent = district.id === currentDistrictId;
    const isLocked = state.player.reputation.city < (district.reputationRequirement || 0);
    const r = isCurrent ? 18 : 14;
    const fillOp = isLocked ? "0.08" : isCurrent ? "0.22" : "0.12";
    const strokeOp = isLocked ? "0.25" : isCurrent ? "0.85" : "0.45";
    const sw = isCurrent ? "1.8" : "0.9";
    return `
      <g opacity="${isLocked ? 0.45 : 1}">
        <circle cx="${anchor.x}" cy="${anchor.z}" r="${r + 8}"
          fill="${meta.color}" fill-opacity="${fillOp}"/>
        <circle cx="${anchor.x}" cy="${anchor.z}" r="${r}"
          fill="${meta.color}" fill-opacity="${parseFloat(fillOp) + 0.06}"
          stroke="${meta.color}" stroke-width="${sw}" stroke-opacity="${strokeOp}"/>
        ${isCurrent ? `
          <circle cx="${anchor.x}" cy="${anchor.z}" r="${r + 3}"
            fill="none" stroke="${meta.color}" stroke-width="0.7"
            stroke-opacity="0.5" stroke-dasharray="4,3"/>
          <circle cx="${anchor.x}" cy="${anchor.z}" r="4.5"
            fill="${meta.color}" fill-opacity="0.95"/>
          <circle cx="${anchor.x}" cy="${anchor.z}" r="7.5"
            fill="none" stroke="${meta.color}" stroke-width="1.4"
            stroke-opacity="0.55" class="map-player-ring"/>
        ` : ""}
      </g>`;
  }).join("");

  // SVG grid
  const gridLines = [];
  for (let gx = minX; gx <= maxX; gx += 20) {
    gridLines.push(`<line x1="${gx}" y1="${minZ}" x2="${gx}" y2="${maxZ}" stroke="rgba(50,60,75,0.28)" stroke-width="0.3"/>`);
  }
  for (let gz = minZ; gz <= maxZ; gz += 20) {
    gridLines.push(`<line x1="${minX}" y1="${gz}" x2="${maxX}" y2="${gz}" stroke="rgba(50,60,75,0.28)" stroke-width="0.3"/>`);
  }

  const svgBg = `
    <svg viewBox="${minX} ${minZ} ${rangeX} ${rangeZ}"
         xmlns="http://www.w3.org/2000/svg"
         class="city-map-svg"
         preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="ncMapBg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="#14172a"/>
          <stop offset="100%" stop-color="#09090f"/>
        </radialGradient>
        <filter id="ncGlow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <!-- Background -->
      <rect x="${minX}" y="${minZ}" width="${rangeX}" height="${rangeZ}" fill="url(#ncMapBg)"/>
      <!-- Grid -->
      ${gridLines.join("")}
      <!-- Roads -->
      ${roadSvg}
      <!-- District zones -->
      ${zoneSvg}
      <!-- Map title watermark -->
      <text x="${minX + 3}" y="${maxZ - 3}"
        font-size="6" fill="rgba(196,169,106,0.45)"
        font-weight="bold" font-family="Inter,sans-serif" letter-spacing="0.12em">NARCOS CITY</text>
      <!-- Compass rose -->
      <text x="${maxX - 10}" y="${minZ + 11}"
        font-size="7" fill="rgba(168,178,196,0.55)" text-anchor="middle"
        font-family="Inter,sans-serif">N</text>
      <line x1="${maxX - 10}" y1="${minZ + 12}" x2="${maxX - 10}" y2="${minZ + 18}"
        stroke="rgba(168,178,196,0.4)" stroke-width="0.8"/>
    </svg>`;

  // Clickable district buttons overlaid on top
  const buttons = state.districts.map((district) => {
    const anchor = anchors[district.id];
    if (!anchor) return "";
    const isCurrent = district.id === currentDistrictId;
    const isLocked = state.player.reputation.city < (district.reputationRequirement || 0);
    const meta = districtMeta[district.id] || { color: "#6a6a8a" };
    const shortName = district.name.split(" ").slice(0, 2).join(" ");
    return `<button
      class="map-district-btn${isCurrent ? " active" : ""}${isLocked ? " locked" : ""}"
      data-action="travel" data-district-id="${district.id}"
      style="left:${toPercX(anchor.x)}%;top:${toPercY(anchor.z)}%;border-color:${isCurrent ? meta.color : ""};"
      ${isLocked ? "disabled" : ""}
      title="${escapeHtml(district.name)}${isLocked ? " (LOCKED)" : ""}"
    >${escapeHtml(shortName)}</button>`;
  }).join("");

  // Legend
  const legend = state.districts.map((district) => {
    const meta = districtMeta[district.id] || { color: "#6a6a8a", label: district.name };
    const isCurrent = district.id === currentDistrictId;
    return `<span class="map-legend-item">
      <span class="map-legend-dot" style="background:${meta.color};${isCurrent ? `box-shadow:0 0 4px ${meta.color};` : ""}"></span>
      <span style="${isCurrent ? `color:${meta.color};font-weight:700;` : ""}">${escapeHtml(district.name)}</span>
    </span>`;
  }).join("");

  return `
    <div class="city-map-panel">
      <div class="city-map-title">
        ${t(state, "nav.map", "CITY MAP")}
        <span style="float:right;font-size:0.65rem;color:var(--silver);font-weight:400;letter-spacing:0.04em;">
          ${t(state, "ui.currentDistrict", "Current")}: <strong style="color:var(--gold)">${escapeHtml(state.districts.find(d => d.id === currentDistrictId)?.name || "—")}</strong>
        </span>
      </div>
      <div class="city-map-svg-wrap">
        ${svgBg}
        ${buttons}
      </div>
      <div class="map-legend">${legend}</div>
    </div>`;
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
  const isRu = getLanguage(state) === "ru";

  root.innerHTML = `
    <section class="city-gameplay-shell">
      ${
        state.world?.currentInteriorId
          ? `<div class="city-interior-banner">INTERIOR · ${escapeHtml(LOCATIONS[state.world.currentInteriorId]?.name || state.world.currentInteriorId)}</div>`
          : ""
      }
      <div id="city-world-3d-container" class="city-world-3d-container"></div>
    </section>
    <section class="city-quick-actions">
      <button data-action="claim-daily">🎁 ${t(state, "hud.daily", "DAILY")}</button>
      <button data-action="safehouse-rest">🛌 ${t(state, "hud.rest", "REST")}</button>
      <button data-action="safehouse-energy">⚡ ${t(state, "hud.energy", "ENERGY")}</button>
      <button data-action="menu-map">🗺 ${t(state, "nav.map", "MAP")}</button>
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
        if (menuAction === "family") navigateTo(state, "family");
        if (menuAction === "business" || menuAction === "vehicles") navigateTo(state, "inventory");
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
  const isRu = getLanguage(state) === "ru";

  // District visual identity (synced with map)
  const districtColor = {
    downtown: "#c4a96a", "old-town": "#9b7c5c", harbor: "#4d8aae",
    industrial: "#7a7d52", "rich-district": "#a0507a", underground: "#8050b8",
    residential: "#4a8c5c", "safehouse-area": "#5a5898", "business-district": "#5878a0",
    outskirts: "#a04040"
  };
  const dangerBars = (n) => Array.from({length: 5}, (_, i) =>
    `<span style="color:${i < n ? "#e03048" : "rgba(255,255,255,0.12)"};font-size:0.65rem;">■</span>`
  ).join("");
  const wealthBars = (n) => Array.from({length: 5}, (_, i) =>
    `<span style="color:${i < n ? "#c4a96a" : "rgba(255,255,255,0.12)"};font-size:0.65rem;">■</span>`
  ).join("");

  const cards = DISTRICTS.map((district) => {
    const isCurrent = district.id === state.selectedDistrictId;
    const travelCost = Math.max(40, district.travelCost + (currentVehicle?.travelCost || 60) - 80);
    const locked = state.player.reputation.city < district.reputationRequirement;
    const col = districtColor[district.id] || "#8888aa";
    return `
      <article class="card${isCurrent ? " active-location" : ""}" style="border-left: 3px solid ${col}20;${isCurrent ? `border-color:${col}60;` : ""}">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;">
          <span style="width:10px;height:10px;border-radius:50%;background:${col};flex-shrink:0;${isCurrent ? `box-shadow:0 0 6px ${col};` : ""}"></span>
          <h3 style="margin:0;${isCurrent ? `color:${col};` : ""}">${escapeHtml(district.name)}</h3>
          ${locked ? `<span style="font-size:0.6rem;color:#e03048;margin-left:auto;font-weight:700;">🔒 ${isRu ? "ЗАКРЫТ" : "LOCKED"}</span>` : ""}
          ${isCurrent ? `<span style="font-size:0.6rem;color:${col};margin-left:auto;font-weight:700;">📍 ${isRu ? "ВЫ ЗДЕСЬ" : "YOU ARE HERE"}</span>` : ""}
        </div>
        <p class="muted" style="font-size:0.7rem;margin-bottom:0.45rem;">${escapeHtml(district.description)}</p>
        <div style="display:flex;gap:0.6rem;margin-bottom:0.5rem;align-items:center;flex-wrap:wrap;">
          <span style="font-size:0.62rem;color:var(--silver);">${isRu ? "Опасность" : "Danger"} ${dangerBars(district.dangerLevel)}</span>
          <span style="font-size:0.62rem;color:var(--silver);">${isRu ? "Богатство" : "Wealth"} ${wealthBars(district.wealthLevel)}</span>
          <span style="font-size:0.62rem;color:var(--silver);">${isRu ? "Репутация" : "Rep"}: <strong style="color:${locked ? "#e03048" : "var(--gold)"};">${district.reputationRequirement}</strong></span>
          <span style="font-size:0.62rem;color:var(--silver);">${currency(travelCost)}</span>
        </div>
        <div class="actions">
          <button data-action="travel" data-district-id="${district.id}"
            ${locked ? "disabled" : ""}
            style="${isCurrent ? `border-color:${col};color:${col};` : ""}">
            ${isCurrent ? (isRu ? "ЗДЕСЬ" : "HERE") : (isRu ? "Поехать" : "Travel")}
          </button>
          <button data-action="cool-heat" data-district-id="${district.id}">${isRu ? "Снизить розыск" : "Reduce Wanted"}</button>
        </div>
      </article>`;
  }).join("");

  root.innerHTML = `
    <section class="card marble" style="padding-bottom:0.6rem;">
      <h2>${t(state, "ui.districts", "District Network")}</h2>
      <p class="muted" style="margin-bottom:0;">${isRu ? "Путешествия меняют репутацию, риски и возможности." : "Travel reshapes reputation, risk and opportunity."}</p>
    </section>
    ${renderDistrictMap()}
    <div style="display:grid;gap:0.6rem;">
      ${cards}
    </div>`;
}

function renderProfile() {
  if (cityWorldSession) {
    cityWorldSession.destroy();
    cityWorldSession = null;
  }
  const rep = state.player.reputation;
  const titleIndex = TITLE_RANKS.findIndex((rank) => rank.name === state.player.title);
  const life = state.life || {};
  const isRu = getLanguage(state) === "ru";
  const PL = isRu ? {
    title: "Профиль", rank: "Ранг",
    level: "Уровень", influence: "Влияние", health: "Здоровье", energy: "Энергия",
    hunger: "Голод", hygiene: "Гигиена", mood: "Настроение", strength: "Сила",
    intelligence: "Интеллект", charisma: "Харизма", wanted: "Розыск",
    lifeCore: "Жизнь", age: "Возраст", birthday: "День рождения",
    occupation: "Занятие", career: "Карьера", education: "Образование",
    residence: "Жильё", relationship: "Отношения", lifestyle: "Образ жизни / Статус",
    reputation: "Репутация", city: "Город", street: "Улица", business: "Бизнес", faction: "Фракция",
    topRelationships: "Топ отношений", statistics: "Статистика",
    districtsVisited: "Районов посещено", locationsVisited: "Локаций посещено",
    moneyEarned: "Заработано", moneySpent: "Потрачено", questsCompleted: "Квестов выполнено",
    npcsMet: "NPC встречено", businessesOwned: "Бизнесов", propertiesOwned: "Собственности",
    vehiclesOwned: "Транспорт", casinoWL: "Казино W/L", travelCount: "Путешествий",
    achievements: "Достижений",
    unemployed: "Безработный", single: "Свободен", none: "Нет", school: "Школа", entry: "Начальный"
  } : {
    title: "Profile", rank: "Rank",
    level: "Level", influence: "Influence", health: "Health", energy: "Energy",
    hunger: "Hunger", hygiene: "Hygiene", mood: "Mood", strength: "Strength",
    intelligence: "Intelligence", charisma: "Charisma", wanted: "Wanted",
    lifeCore: "Life Core", age: "Age", birthday: "Birthday",
    occupation: "Occupation", career: "Career", education: "Education",
    residence: "Residence", relationship: "Relationship", lifestyle: "Lifestyle / Social",
    reputation: "Reputation", city: "City", street: "Street", business: "Business", faction: "Faction",
    topRelationships: "Top Relationships", statistics: "Lifetime Statistics",
    districtsVisited: "Districts Visited", locationsVisited: "Locations Visited",
    moneyEarned: "Money Earned", moneySpent: "Money Spent", questsCompleted: "Quests Completed",
    npcsMet: "NPCs Met", businessesOwned: "Businesses Owned", propertiesOwned: "Properties Owned",
    vehiclesOwned: "Vehicles Owned", casinoWL: "Casino W/L", travelCount: "Travel Count",
    achievements: "Achievements",
    unemployed: "Unemployed", single: "Single", none: "None", school: "School", entry: "Entry"
  };

  root.innerHTML = `
    <section class="card marble">
      <h2>${PL.title}</h2>
      <p class="muted">${escapeHtml(state.player.name)} · ${escapeHtml(state.player.title)} (${PL.rank} ${titleIndex + 1}/${TITLE_RANKS.length})</p>
      <div class="grid-2">
        <div class="stat">${PL.level}<strong>${state.player.level}</strong>${progressBar(state.player.xp, state.player.nextLevelXp)}</div>
        <div class="stat">${PL.influence}<strong>${state.player.influence}</strong>${progressBar(state.player.influence, 100)}</div>
        <div class="stat">${PL.health}<strong>${state.player.health}</strong>${progressBar(state.player.health)}</div>
        <div class="stat">${PL.energy}<strong>${state.player.energy}</strong>${progressBar(state.player.energy)}</div>
        <div class="stat">${PL.hunger}<strong>${Math.round(state.player.hunger || 0)}</strong>${progressBar(state.player.hunger || 0)}</div>
        <div class="stat">${PL.hygiene}<strong>${Math.round(state.player.hygiene || 0)}</strong>${progressBar(state.player.hygiene || 0)}</div>
        <div class="stat">${PL.mood}<strong>${Math.round(state.player.mood || 0)}</strong>${progressBar(state.player.mood || 0)}</div>
        <div class="stat">${PL.strength}<strong>${state.player.strength}</strong></div>
        <div class="stat">${PL.intelligence}<strong>${state.player.intelligence}</strong></div>
        <div class="stat">${PL.charisma}<strong>${state.player.charisma}</strong></div>
        <div class="stat">${PL.wanted}<strong>${state.player.wantedLevel}/5</strong>${progressBar(state.player.wantedLevel, 5)}</div>
      </div>
    </section>
    <section class="card">
      <h3>${PL.lifeCore}</h3>
      <div class="grid-2">
        <div class="stat">${PL.age}<strong>${life.age || 0}</strong></div>
        <div class="stat">${PL.birthday}<strong>${life.birthday ? `${life.birthday.day}/${life.birthday.month}` : "—"}</strong></div>
        <div class="stat">${PL.occupation}<strong>${escapeHtml(life.occupation || PL.unemployed)}</strong></div>
        <div class="stat">${PL.career}<strong>${escapeHtml(life.career?.level || PL.entry)} · XP ${life.career?.xp || 0}</strong></div>
        <div class="stat">${PL.education}<strong>${escapeHtml(life.education?.level || PL.school)} · ${life.education?.points || 0} pts</strong></div>
        <div class="stat">${PL.residence}<strong>${escapeHtml(life.residence?.type || PL.none)} (${escapeHtml(life.residence?.ownership || PL.none)})</strong></div>
        <div class="stat">${PL.relationship}<strong>${escapeHtml(life.relationshipStatus || PL.single)}</strong></div>
        <div class="stat">${PL.lifestyle}<strong>${escapeHtml(life.lifestyle || (isRu ? "Комфортный" : "Comfortable"))} / ${escapeHtml(life.socialStatus || (isRu ? "Неизвестно" : "Unknown"))}</strong></div>
      </div>
    </section>
    <section class="card">
      <h3>${PL.reputation}</h3>
      <div class="grid-2">
        <div class="stat">${PL.city}<strong>${rep.city}</strong>${progressBar(rep.city, 60)}</div>
        <div class="stat">${PL.street}<strong>${rep.street}</strong>${progressBar(rep.street, 60)}</div>
        <div class="stat">${PL.business}<strong>${rep.business}</strong>${progressBar(rep.business, 60)}</div>
        <div class="stat">${PL.faction}<strong>${rep.faction}</strong>${progressBar(rep.faction, 60)}</div>
      </div>
    </section>
    <section class="card">
      <h3>${t(state, "stage4.status", isRu ? "Состояние империи" : "Empire Status")}</h3>
      <div class="grid-2">
        <div class="stat">${t(state, "stage4.wealth", isRu ? "Состояние" : "Wealth")}<strong>${currency(state.economy?.netWorth || 0)}</strong></div>
        <div class="stat">${t(state, "stage4.businessPortfolio", isRu ? "Портфель бизнесов" : "Business Portfolio")}<strong>${state.player.ownedBusinesses.length}</strong></div>
        <div class="stat">${isRu ? "Репутация улица/город" : "Street / City Rep"}<strong>${rep.street}/${rep.city}</strong></div>
        <div class="stat">${t(state, "stage4.gangRank", isRu ? "Ранг в группировке" : "Gang Rank")}<strong>${escapeHtml(state.gang?.rank || (isRu ? "Новобранец" : "Recruit"))}</strong></div>
        <div class="stat">${PL.influence}<strong>${state.player.influence}</strong></div>
        <div class="stat">${t(state, "ui.wantedStatus", "Wanted Status")}<strong>${state.player.wantedLevel}/5</strong></div>
        <div class="stat">${isRu ? "Образ жизни" : "Lifestyle"}<strong>${escapeHtml(state.life?.lifestyle || (isRu ? "Комфортный" : "Comfortable"))}</strong></div>
        <div class="stat">${t(state, "stage4.familyWealth", isRu ? "Богатство семьи" : "Family Wealth")}<strong>${currency(state.family?.legacy?.wealth || 0)}</strong></div>
      </div>
    </section>
    <section class="card">
      <h3>${PL.topRelationships}</h3>
      <div class="grid-2">${relationshipSnippet()}</div>
    </section>
    <section class="card">
      <h3>${PL.statistics}</h3>
      <div class="grid-2">
        <div class="stat">${PL.districtsVisited}<strong>${state.statistics.districtsVisited.length}</strong></div>
        <div class="stat">${PL.locationsVisited}<strong>${state.statistics.locationsVisited.length}</strong></div>
        <div class="stat">${PL.moneyEarned}<strong>${currency(state.statistics.moneyEarned)}</strong></div>
        <div class="stat">${PL.moneySpent}<strong>${currency(state.statistics.moneySpent)}</strong></div>
        <div class="stat">${PL.questsCompleted}<strong>${state.statistics.questsCompleted}</strong></div>
        <div class="stat">${PL.npcsMet}<strong>${state.statistics.npcsMet.length}</strong></div>
        <div class="stat">${PL.businessesOwned}<strong>${state.player.ownedBusinesses.length}</strong></div>
        <div class="stat">${PL.propertiesOwned}<strong>${state.player.ownedProperties.length}</strong></div>
        <div class="stat">${PL.vehiclesOwned}<strong>${state.vehicles.filter((v) => v.owned).length}</strong></div>
        <div class="stat">${PL.casinoWL}<strong>${state.statistics.casinoWins}/${state.statistics.casinoLosses}</strong></div>
        <div class="stat">${PL.travelCount}<strong>${state.statistics.travelCount}</strong></div>
        <div class="stat">${PL.achievements}<strong>${state.statistics.achievementsUnlocked}</strong></div>
      </div>
    </section>
  `;
}

function renderFamily() {
  if (cityWorldSession) {
    cityWorldSession.destroy();
    cityWorldSession = null;
  }
  const overview = getFamilyOverview(state);
  const members = (overview.members || [])
    .map(
      (member) => `
      <article class="card${member.status === "Deceased" ? "" : " active-location"}">
        <h4>${escapeHtml(member.name)} · ${escapeHtml(member.relationship)}</h4>
        <p class="muted">${escapeHtml(member.lifeStage)} · ${member.age} · ${escapeHtml(member.occupation || "—")}</p>
        <p class="muted">${escapeHtml(member.location || "—")} · ${escapeHtml(member.status || "Active")} · Gen ${member.generation}</p>
        ${member.relationship === "Player" || member.status === "Deceased" ? "" : `<div class="actions">
          <button data-action="family-interaction" data-family-member-id="${member.id}" data-family-interaction="talk">${t(state, "family.actions.talk", "Talk")}</button>
          <button data-action="family-interaction" data-family-member-id="${member.id}" data-family-interaction="visit">${t(state, "family.actions.visit", "Visit")}</button>
          <button data-action="family-interaction" data-family-member-id="${member.id}" data-family-interaction="call">${t(state, "family.actions.call", "Call")}</button>
          <button data-action="family-interaction" data-family-member-id="${member.id}" data-family-interaction="family-dinner">${t(state, "family.actions.dinner", "Family Dinner")}</button>
          <button data-action="family-interaction" data-family-member-id="${member.id}" data-family-interaction="gift">${t(state, "family.actions.gift", "Gift")}</button>
          <button data-action="family-interaction" data-family-member-id="${member.id}" data-family-interaction="comfort">${t(state, "family.actions.comfort", "Comfort")}</button>
          <button data-action="family-interaction" data-family-member-id="${member.id}" data-family-interaction="apologize">${t(state, "family.actions.apologize", "Apologize")}</button>
          <button data-action="family-interaction" data-family-member-id="${member.id}" data-family-interaction="reconcile">${t(state, "family.actions.reconcile", "Reconcile")}</button>
        </div>`}
      </article>
    `
    )
    .join("");
  const events = (overview.events || [])
    .slice(0, 10)
    .map((entry) => `<p class="muted">• [D${entry.day}] ${escapeHtml(entry.type)} — ${escapeHtml(entry.title)}</p>`)
    .join("");
  const memories = (overview.memories || [])
    .slice(0, 8)
    .map((entry) => `<p class="muted">• ${escapeHtml(entry.type)} — ${escapeHtml(entry.title)}</p>`)
    .join("");
  const pregnancy = overview.pregnancy?.active
    ? `<div class="grid-2">
        <div class="stat">${t(state, "family.pregnancy", "Pregnancy")}<strong>${escapeHtml(overview.pregnancy.stage)}</strong></div>
        <div class="stat">${t(state, "family.progress", "Progress")}<strong>${overview.pregnancy.progressDays}/${overview.pregnancy.totalDays}</strong></div>
        <div class="stat">${t(state, "family.health", "Health")}<strong>${overview.pregnancy.health}</strong>${progressBar(overview.pregnancy.health)}</div>
        <div class="stat">${t(state, "family.mood", "Mood")}<strong>${overview.pregnancy.mood}</strong>${progressBar(overview.pregnancy.mood)}</div>
      </div>`
    : `<p class="muted">${t(state, "family.noActivePregnancy", "No active pregnancy")}</p>`;
  root.innerHTML = `
    <section class="card marble">
      <h2>${t(state, "family.title", "Family & Generations")}</h2>
      <p class="muted">${t(state, "family.profile", "Family Profile")}: ${escapeHtml(overview.familyName)}</p>
      <div class="grid-2">
        <div class="stat">${t(state, "family.generation", "Generation")}<strong>${overview.generation || 1}</strong></div>
        <div class="stat">${t(state, "family.wealth", "Family Wealth")}<strong>${currency(overview.familyWealth || 0)}</strong></div>
        <div class="stat">${t(state, "family.reputation", "Family Reputation")}<strong>${overview.familyReputation || 0}</strong></div>
        <div class="stat">${t(state, "family.mainResidence", "Main Residence")}<strong>${escapeHtml(String(overview.mainResidence || "None"))}</strong></div>
      </div>
    </section>
    <section class="card"><h3>${t(state, "family.pregnancy", "Pregnancy")}</h3>${pregnancy}</section>
    <section class="card"><h3>${t(state, "family.finances", "Family Finances")}</h3>
      <div class="grid-2">
        <div class="stat">${t(state, "family.income", "Income")}<strong>${currency(overview.finances?.income || 0)}</strong></div>
        <div class="stat">${t(state, "family.expenses", "Expenses")}<strong>${currency(overview.finances?.expenses || 0)}</strong></div>
        <div class="stat">${t(state, "family.housing", "Housing")}<strong>${currency(overview.finances?.housing || 0)}</strong></div>
        <div class="stat">${t(state, "family.food", "Food")}<strong>${currency(overview.finances?.food || 0)}</strong></div>
        <div class="stat">${t(state, "family.education", "Education")}<strong>${currency(overview.finances?.education || 0)}</strong></div>
        <div class="stat">${t(state, "family.healthcare", "Healthcare")}<strong>${currency(overview.finances?.healthcare || 0)}</strong></div>
        <div class="stat">${t(state, "family.childcare", "Childcare")}<strong>${currency(overview.finances?.child || 0)}</strong></div>
        <div class="stat">${t(state, "family.luxury", "Luxury")}<strong>${currency(overview.finances?.luxury || 0)}</strong></div>
      </div>
    </section>
    <section class="card"><h3>${t(state, "family.tree", "Family Tree")}</h3>${members || `<p class="muted">${t(state, "family.noMembers", "No family members yet.")}</p>`}</section>
    <section class="card"><h3>${t(state, "family.events", "Family Events")}</h3>${events || `<p class="muted">${t(state, "family.noEvents", "No family events yet.")}</p>`}</section>
    <section class="card"><h3>${t(state, "family.history", "Family History")}</h3>${memories || `<p class="muted">${t(state, "family.noHistory", "No family history yet.")}</p>`}</section>
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
          <button data-action="buy-item" data-item-id="${item.id}" data-price="${item.price}">${t(state, "inventory.buy", "Buy")}</button>
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
        <p class="muted">${escapeHtml(vehicle.category)} · Speed ${vehicle.speed} · Handling ${vehicle.handling || 0} · Durability ${vehicle.durability || 0}</p>
        <p class="muted">Luxury ${vehicle.luxury || 0} · Storage ${vehicle.storage || 0} · Prestige ${vehicle.prestige || 0}</p>
        <div class="actions">
          ${vehicle.owned ? "" : `<button data-action="buy-vehicle" data-vehicle-id="${vehicle.id}">${t(state, "inventory.buy", "Buy")} ${currency(vehicle.price)}</button>`}
          ${vehicle.owned ? `<button data-action="select-vehicle" data-vehicle-id="${vehicle.id}">Select</button>` : ""}
          ${vehicle.owned ? `<button data-action="repair-vehicle" data-vehicle-id="${vehicle.id}">${t(state, "stage4.repair", "Repair")}</button>` : ""}
          ${vehicle.owned ? `<button data-action="vehicle-upgrade" data-vehicle-id="${vehicle.id}" data-upgrade-category="engine">${t(state, "stage4.engineUp", "Engine+")}</button>` : ""}
          ${vehicle.owned ? `<button data-action="vehicle-upgrade" data-vehicle-id="${vehicle.id}" data-upgrade-category="luxury">${t(state, "stage4.luxuryUp", "Luxury+")}</button>` : ""}
          ${vehicle.owned ? `<button data-action="store-vehicle" data-vehicle-id="${vehicle.id}">${t(state, "stage4.store", "Store")}</button>` : ""}
          ${vehicle.owned ? `<button data-action="sell-vehicle" data-vehicle-id="${vehicle.id}">${t(state, "stage4.sell", "Sell")}</button>` : ""}
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
        <p class="muted">${escapeHtml(property.type)} · ${escapeHtml(property.district)} · ${property.owned ? t(state, "inventory.owned", "Owned") : currency(property.price)}</p>
        <p class="muted">Comfort ${property.comfort} · Security ${property.security} · Storage ${property.storage} · Prestige ${property.prestige}</p>
        <p class="muted">${t(state, "inventory.rentWeeklyLabel", "Rent Weekly")} ${currency(property.rentWeekly || 0)} · ${t(state, "inventory.rentMonthlyLabel", "Rent Monthly")} ${currency(property.rentMonthly || 0)}</p>
        <div class="actions">
          ${property.owned ? "" : `<button data-action="buy-property" data-property-id="${property.id}">${t(state, "inventory.buy", "Buy")}</button>`}
          ${property.owned ? "" : `<button data-action="rent-property" data-property-id="${property.id}" data-rent-mode="weekly">${t(state, "inventory.rentWeekly", "Rent Weekly")}</button>`}
          ${property.owned ? `<button data-action="upgrade-property" data-property-id="${property.id}" data-property-upgrade="security">${t(state, "inventory.securityUpgrade", "Security+")}</button>` : ""}
          ${property.owned ? `<button data-action="upgrade-property" data-property-id="${property.id}" data-property-upgrade="luxury">${t(state, "inventory.luxuryUpgrade", "Luxury+")}</button>` : ""}
        </div>
      </article>
    `
    )
    .join("");

  root.innerHTML = `
    <section class="card marble">
      <h2>${t(state, "inventory.title", "Inventory · Market · Assets")}</h2>
      <p class="muted">Cash ${currency(state.player.money)} · Bank ${currency(state.player.bankBalance)}</p>
      <p class="muted">${t(state, "stage4.garage", "Garage")} ${state.garage?.storedVehicleIds?.length || 0}/${state.garage?.capacity || 2} · ${t(state, "stage4.netWorth", "Net Worth")} ${currency(state.economy?.netWorth || 0)}</p>
      <div class="actions">
        <button data-action="bank-deposit" data-amount="200">${t(state, "inventory.depositAmount", "Deposit $200")}</button>
        <button data-action="bank-withdraw" data-amount="200">${t(state, "inventory.withdrawAmount", "Withdraw $200")}</button>
        <button data-action="bank-transfer" data-transfer-target="family" data-amount="150">${t(state, "stage4.transferFamily", "Transfer Family")} $150</button>
        <button data-action="bank-transfer" data-transfer-target="business" data-amount="200">${t(state, "stage4.transferBusiness", "Transfer Business")} $200</button>
        <button data-action="pay-rent">${t(state, "inventory.payRent", "Pay Rent")}</button>
        <button data-action="select-vehicle">${t(state, "inventory.cycleVehicle", "Cycle Vehicle")}</button>
      </div>
    </section>
    <section class="card">
      <h3>${t(state, "inventory.dailyLife", "Daily Life")}</h3>
      <div class="actions">
        <button data-action="life-activity" data-life-activity="eat">${t(state, "life.eat", "Eat")}</button>
        <button data-action="life-activity" data-life-activity="sleep">${t(state, "life.sleep", "Sleep")}</button>
        <button data-action="life-activity" data-life-activity="rest">${t(state, "life.rest", "Rest")}</button>
        <button data-action="life-activity" data-life-activity="shower">${t(state, "life.shower", "Shower")}</button>
        <button data-action="life-activity" data-life-activity="study">${t(state, "life.study", "Study")}</button>
        <button data-action="life-activity" data-life-activity="exercise">${t(state, "life.exercise", "Exercise")}</button>
      </div>
      <div class="actions">
        <button data-action="outfit" data-outfit-preset="Casual">${t(state, "ui.outfitCasual", "Casual")}</button>
        <button data-action="outfit" data-outfit-preset="Elegant">${t(state, "ui.outfitElegant", "Elegant")}</button>
        <button data-action="outfit" data-outfit-preset="Luxury">${t(state, "ui.outfitLuxury", "Luxury")}</button>
        <button data-action="outfit" data-outfit-preset="Street">${t(state, "ui.outfitStreet", "Street")}</button>
        <button data-action="outfit" data-outfit-preset="Business">${t(state, "ui.outfitBusiness", "Business")}</button>
        <button data-action="outfit" data-outfit-preset="Nightlife">${t(state, "ui.outfitNightlife", "Nightlife")}</button>
        <button data-action="outfit" data-outfit-preset="Sport">${t(state, "ui.outfitSport", "Sport")}</button>
      </div>
      <p class="muted">Current outfit: ${escapeHtml(state.life?.wardrobe?.currentPreset || "Casual")} · Residence: ${escapeHtml(state.life?.residence?.type || "None")} (${escapeHtml(state.life?.residence?.ownership || "None")})</p>
    </section>
    <section class="card"><h3>${t(state, "inventory.section", "Inventory")}</h3>${inventoryCards || `<p class="muted">${t(state, "inventory.empty", "Inventory empty.")}</p>`}</section>
    <section class="card"><h3>${t(state, "inventory.marketSection", "Market")}</h3>${marketCards}</section>
    <section class="card"><h3>${t(state, "inventory.vehicleMarket", "Vehicles")}</h3>${vehicleCards}</section>
    <section class="card"><h3>${t(state, "inventory.propertyMarket", "Property Market")}</h3>${propertyCards}</section>
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
        <p class="muted">Income ${currency(business.income)} · Expenses ${currency(business.expenses)} · Employees ${business.employees} · Security ${business.security || 0}</p>
        <div class="actions">
          <button data-action="business-action" data-business-id="${business.id}">${business.owned ? "Collect Income" : `Purchase ${currency(business.purchasePrice)}`}</button>
          ${business.owned ? `<button data-action="business-upgrade" data-business-id="${business.id}">${t(state, "inventory.upgradeBtn", "Upgrade")}</button>` : ""}
          ${business.owned ? `<button data-action="business-hire" data-business-id="${business.id}">${t(state, "stage4.hire", "Hire")}</button>` : ""}
          ${business.owned ? `<button data-action="business-fire" data-business-id="${business.id}">${t(state, "stage4.fire", "Fire")}</button>` : ""}
          ${business.owned ? `<button data-action="business-security" data-business-id="${business.id}">${t(state, "stage4.security", "Security")}</button>` : ""}
          ${business.owned ? `<button data-action="business-sell" data-business-id="${business.id}">${t(state, "stage4.sell", "Sell")}</button>` : ""}
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
        <p class="muted">Influence ${faction.influence} · Your Rep ${state.player.factionReputation[faction.id] || 0} · Rank ${escapeHtml(state.gang?.currentFactionId === faction.id ? state.gang.rank : "—")}</p>
        <div class="actions">
          <button data-action="faction-action" data-faction-id="${faction.id}">Faction Activity</button>
          <button data-action="faction-join" data-faction-id="${faction.id}">${t(state, "stage4.join", "Join")}</button>
          <button data-action="faction-leave" data-faction-id="${faction.id}">${t(state, "stage4.leave", "Leave")}</button>
        </div>
      </article>
    `
    )
    .join("");

  const territoryCards = getTerritories(state)
    .map(
      (territory) => `
      <article class="card">
        <h4>${escapeHtml(territory.districtId.toUpperCase())}</h4>
        <p class="muted">Owner ${escapeHtml(territory.ownerFactionId || "none")} · Influence ${territory.influence} · Danger ${territory.danger} · Wealth ${territory.wealth}</p>
        <div class="actions">
          <button data-action="territory-action" data-district-id="${territory.districtId}" data-territory-mode="scout">${t(state, "stage4.scout", "Scout")}</button>
          <button data-action="territory-action" data-district-id="${territory.districtId}" data-territory-mode="build-influence">${t(state, "stage4.buildInfluence", "Build Influence")}</button>
          <button data-action="territory-action" data-district-id="${territory.districtId}" data-territory-mode="support-faction">${t(state, "stage4.support", "Support")}</button>
          <button data-action="territory-action" data-district-id="${territory.districtId}" data-territory-mode="challenge-rival">${t(state, "stage4.challenge", "Challenge")}</button>
        </div>
      </article>
    `
    )
    .join("");

  const contacts = Object.values(getContacts(state))
    .slice(0, 10)
    .map(
      (contact) => `
      <article class="card">
        <h4>${escapeHtml(contact.name)}</h4>
        <p class="muted">${escapeHtml(contact.role)} · ${escapeHtml(contact.district)} · Trust ${contact.trust} · Influence ${contact.influence}</p>
        <p class="muted">${escapeHtml((contact.services || []).join(", "))}</p>
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
        <p class="muted">${t(state, "ui.progress", "Progress")}: ${quest.progress}/${quest.objective.required} · ${quest.claimed ? t(state, "ui.claimed", "Claimed") : quest.completed ? t(state, "ui.ready", "Ready") : t(state, "ui.inProgress", "In Progress")}</p>
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
      <p class="muted">${t(state, "stage4.creditRep", "Credit Reputation")} ${state.credit.creditReputation || 0} · Borrowed ${currency(state.credit.totalBorrowed || 0)} · Repaid ${currency(state.credit.totalRepaid || 0)}</p>
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
      <p class="muted">${t(state, "ui.socialInfo", "Social")}: ${state.social.friends.length} ${t(state, "ui.friends", "friends")} / ${state.social.followers} ${t(state, "ui.followers", "followers")} · ${t(state, "ui.romanticPartner", "Romantic Partner")}: ${state.relationshipsFoundation.partnerId || "—"}</p>
      <p class="muted">${t(state, "ui.districtPopulation", "District Population")}: ${(state.backgroundPopulation[state.selectedDistrictId] || []).map((entry) => entry.role).join(", ") || "—"}</p>
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
          <button data-action="npc-action" data-npc-id="${npc.id}" data-npc-interaction="chat">${t(state, "npc.chat", "Chat")}</button>
          <button data-action="npc-action" data-npc-id="${npc.id}" data-npc-interaction="hang-out">${t(state, "npc.hangOut", "Hang Out")}</button>
          <button data-action="npc-action" data-npc-id="${npc.id}" data-npc-interaction="flirt">${t(state, "npc.flirt", "Flirt")}</button>
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
        <button data-action="casino-play" data-game="dice">Dice</button>
        <button data-action="casino-play" data-game="roulette">Roulette</button>
        <button data-action="casino-play" data-game="blackjack">Blackjack</button>
        <button data-action="casino-play" data-game="slots">Slots</button>
        <button data-action="mark-all-notes">Mark Notifications Read</button>
        <button data-action="return-city">Return City</button>
        <button data-action="upgrade-safehouse">${t(state, "inventory.upgradeSafehouse", "Upgrade Safehouse")}</button>
        <button data-action="reset-game">Reset Game</button>
        ${debugActive ? "" : '<button data-action="debug-on">Enable Debug</button>'}
      </div>
      <p class="muted">${t(state, "stage4.vip", "Casino VIP")}: ${escapeHtml(state.casinoProgress?.vipLevel || "Regular")} · ${t(state, "stage4.bet", "Bet")} ${currency(state.casinoProgress?.totalBet || 0)} · ${t(state, "stage4.net", "Net")} ${currency((state.casinoProgress?.totalWon || 0) - (state.casinoProgress?.totalLost || 0))}</p>
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
      <h3>${t(state, "ui.financeSummary", "Finance Summary")}</h3>
      <div class="grid-2">
        <div class="stat">${t(state, "ui.weeklyIncome", "Weekly Income")}<strong>${currency(financeSummary.weeklyIncome || 0)}</strong></div>
        <div class="stat">${t(state, "ui.weeklyExpenses", "Weekly Expenses")}<strong>${currency(financeSummary.weeklyExpenses || 0)}</strong></div>
        <div class="stat">${t(state, "ui.monthlyIncome", "Monthly Income")}<strong>${currency(financeSummary.monthlyIncome || 0)}</strong></div>
        <div class="stat">${t(state, "ui.monthlyExpenses", "Monthly Expenses")}<strong>${currency(financeSummary.monthlyExpenses || 0)}</strong></div>
        <div class="stat">${t(state, "ui.housingCosts", "Housing Costs")}<strong>${currency(financeSummary.housingCosts || 0)}</strong></div>
        <div class="stat">${t(state, "ui.avgSpend", "Avg Spend")}<strong>${currency(financeSummary.averageSpending || 0)}</strong></div>
      </div>
    </section>
    <section class="card"><h3>${t(state, "ui.calendar", "Calendar")}</h3>${lifeCalendar || `<p class="muted">${t(state, "ui.noCalendar", "No planned events yet.")}</p>`}</section>
    <section class="card"><h3>${t(state, "ui.dailyQuests", "Daily Quests")}</h3>${dailyQuests || `<p class="muted">${t(state, "ui.noDailyQuests", "No daily quests.")}</p>`}</section>
    <section class="card"><h3>${t(state, "ui.quests", "Quests")}</h3>${quests}</section>
    <section class="card"><h3>${t(state, "ui.achievements", "Achievements")}</h3>${achievements}</section>
    <section class="card"><h3>${t(state, "ui.work", "Work")}</h3>${jobs}</section>
    <section class="card"><h3>${t(state, "ui.operations", "Operations")}</h3>${operations}</section>
    <section class="card"><h3>${t(state, "ui.businesses", "Businesses")}</h3>${businesses}</section>
    <section class="card"><h3>${t(state, "ui.factions", "Factions")}</h3>${factions}</section>
    <section class="card"><h3>${t(state, "stage4.territories", "Territories")}</h3>${territoryCards}</section>
    <section class="card"><h3>${t(state, "stage4.contacts", "Contacts")}</h3>${contacts}</section>
    <section class="card"><h3>${t(state, "ui.bankTransactions", "Bank Transactions")}</h3>${transactions || `<p class="muted">${t(state, "ui.noTransactions", "No transactions yet.")}</p>`}</section>
    <section class="card"><h3>${t(state, "ui.notifications", "Notification Center")}</h3>${notifications || `<p class="muted">${t(state, "ui.noNotifications", "No notifications.")}</p>`}</section>
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

    const navVisible = state.meta.hasCreatedCharacter && ["districts", "profile", "inventory", "quests", "family", "settings"].includes(state.currentScreen);
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
      case "family":
        renderFamily();
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
        <h2>${t(state, "ui.errorTitle", "Temporary UI Error")}</h2>
        <p class="muted">${t(state, "ui.errorBody", "The interface recovered safely. Use the actions below to continue playing.")}</p>
        <div class="actions">
          <button data-action="menu-new-game">${t(state, "ui.returnMenu", "Return to Main Menu")}</button>
          <button data-action="menu-settings">${t(state, "ui.openSettings", "Open Settings")}</button>
          <button data-action="reset-game">${t(state, "ui.resetSave", "Reset Save")}</button>
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
    eventType,
    familyMemberId,
    familyInteraction,
    transferTarget,
    upgradeCategory,
    propertyUpgrade,
    territoryMode
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
    if (action === "toggle-mute") state.settings.muted = !state.settings.muted;
    if (action === "save-settings") {
      const controlsSensitivity = Number(document.getElementById("setting-controls")?.value || state.settings.controlsSensitivity || 1);
      const cameraSensitivity = Number(document.getElementById("setting-camera")?.value || state.settings.cameraSensitivity || 1);
      const graphicsQuality = document.getElementById("setting-graphics")?.value || state.settings.graphicsQuality || "medium";
      const language = document.getElementById("setting-language")?.value || state.settings.language || DEFAULT_LANGUAGE;
      const sfxVolume = Number(document.getElementById("setting-sfx-volume")?.value ?? state.settings.sfxVolume ?? 0.7);
      const musicVolume = Number(document.getElementById("setting-music-volume")?.value ?? state.settings.musicVolume ?? 0.5);
      const ambientVolume = Number(document.getElementById("setting-ambient-volume")?.value ?? state.settings.ambientVolume ?? 0.55);
      state.settings.controlsSensitivity = Math.max(0.6, Math.min(1.8, controlsSensitivity));
      state.settings.cameraSensitivity = Math.max(0.6, Math.min(1.8, cameraSensitivity));
      state.settings.graphicsQuality = ["low", "medium", "high"].includes(graphicsQuality) ? graphicsQuality : "medium";
      state.settings.language = ["ru", "en"].includes(language) ? language : DEFAULT_LANGUAGE;
      state.settings.sfxVolume = Math.max(0, Math.min(1, Number.isFinite(sfxVolume) ? sfxVolume : 0.7));
      state.settings.musicVolume = Math.max(0, Math.min(1, Number.isFinite(musicVolume) ? musicVolume : 0.5));
      state.settings.ambientVolume = Math.max(0, Math.min(1, Number.isFinite(ambientVolume) ? ambientVolume : 0.55));
      syncAudioSettings();
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
    if (action === "bank-transfer") bankTransfer(state, transferTarget || "family", Number(amount || 150));
    if (action === "use-item") useInventoryItem(state, itemId);
    if (action === "buy-item") buyMarketItem(state, itemId, Number(price));
    if (action === "sell-item") sellMarketItem(state, itemId, Number(price));
    if (action === "buy-vehicle") buyVehicle(state, vehicleId);
    if (action === "repair-vehicle") repairVehicle(state, vehicleId);
    if (action === "vehicle-upgrade") upgradeVehicle(state, vehicleId, upgradeCategory || "engine");
    if (action === "sell-vehicle") sellVehicle(state, vehicleId);
    if (action === "store-vehicle") storeVehicle(state, vehicleId);
    if (action === "select-vehicle" && vehicleId) state.player.currentVehicleId = vehicleId;
    if (action === "select-vehicle" && !vehicleId) cycleVehicle(state);
    if (action === "npc-action") interactWithNpc(state, npcId, npcInteraction);
    if (action === "business-action") runBusinessAction(state, businessId);
    if (action === "business-upgrade") runBusinessAction(state, businessId, "upgrade");
    if (action === "business-hire") runBusinessAction(state, businessId, "hire");
    if (action === "business-fire") runBusinessAction(state, businessId, "fire");
    if (action === "business-security") runBusinessAction(state, businessId, "security");
    if (action === "business-sell") runBusinessAction(state, businessId, "sell");
    if (action === "buy-property") buyProperty(state, propertyId);
    if (action === "rent-property") rentProperty(state, propertyId, rentMode || "weekly");
    if (action === "upgrade-property") upgradeProperty(state, propertyId, propertyUpgrade || "security");
    if (action === "pay-rent") payRent(state);
    if (action === "life-activity") performLifeActivity(state, lifeActivity);
    if (action === "outfit") changeOutfit(state, outfitPreset);
    if (action === "faction-action") runFactionAction(state, factionId);
    if (action === "faction-join") runFactionAction(state, factionId, "join");
    if (action === "faction-leave") runFactionAction(state, factionId, "leave");
    if (action === "territory-action") runTerritoryAction(state, districtId || state.selectedDistrictId, territoryMode || "scout");
    if (action === "job-action") runJobAction(state, jobId);
    if (action === "date-npc") startDateWithNpc(state, npcId, locationId || "restaurant");
    if (action === "propose-npc") proposeToNpc(state, npcId);
    if (action === "social-event") hostSocialEvent(state, eventType || "party");
    if (action === "family-interaction") performFamilyInteraction(state, familyMemberId, familyInteraction || "talk");
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
      if (window.confirm(t(state, "notices.resetConfirm", "Reset all progress?"))) {
        state = resetGame();
        localStorage.removeItem(STORAGE_KEY);
        syncAudioSettings();
      }
    }

    syncAudioSettings();
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
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
window.setTimeout(() => {
  loading = false;
  if (!startedFromMenu) {
    navigateTo(state, "main-menu");
  }
  render();
}, LOADING_MS);
