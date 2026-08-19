(function () {
  if (typeof window === "undefined" || !window.NarcosCityGame) {
    return;
  }

  const { LOCATION_DEFINITIONS, ACTION_DEFINITIONS, baseState, startGame, travelTo, performAction, getLocation } = window.NarcosCityGame;
  const app = document.getElementById("app");
  const menuButton = document.getElementById("menuButton");
  let state = baseState("La Reina");

  function getProfileStatus() {
    if (state.status === "won") {
      return { tone: "tag", text: "City controlled" };
    }
    if (state.status === "lost") {
      return { tone: "danger", text: "Operation burned" };
    }
    return { tone: "tag", text: "Operation active" };
  }

  function render() {
    if (!app) return;

    if (state.currentScreen === "menu") {
      app.innerHTML = renderMenu();
    } else if (state.currentScreen === "profile") {
      app.innerHTML = renderShell(renderProfile(), renderLogPanel());
    } else if (state.currentScreen === "interior") {
      app.innerHTML = renderShell(renderInterior(), renderLogPanel());
    } else {
      app.innerHTML = renderShell(renderCity(), renderLogPanel());
    }

    wireButtons();
  }

  function renderShell(mainContent, sideContent) {
    return `
      <section class="main-column">${mainContent}</section>
      <aside class="side-column">${renderStatusPanel()}${sideContent}</aside>
    `;
  }

  function renderMenu() {
    return `
      <section class="menu-hero">
        <div class="screen-header">
          <p class="eyebrow">Vertical slice</p>
          <h2>Own the routes before the city locks down.</h2>
          <p>Build cash, manage heat, and keep your crew energized across a small but fully playable city loop.</p>
        </div>
        <div class="hero-stats">
          <div class="stat-chip"><span class="label">Goal</span><span class="value">$${state.targetCash}</span></div>
          <div class="stat-chip"><span class="label">Turns per day</span><span class="value">3</span></div>
          <div class="stat-chip"><span class="label">Enterable interior</span><span class="value">Safehouse</span></div>
          <div class="stat-chip"><span class="label">Starting route</span><span class="value">Barrio Market</span></div>
        </div>
        <div class="menu-actions">
          <button class="primary-button" data-action="start">Start new game</button>
          <button class="secondary-button" data-screen="profile">View profile</button>
          <button class="secondary-button" data-screen="city">Jump to city</button>
        </div>
      </section>
    `;
  }

  function renderStatusPanel() {
    return `
      <section class="panel">
        <div class="screen-header">
          <p class="eyebrow">Crew status</p>
          <h2>${state.playerName}</h2>
          <p class="muted">${state.objective}</p>
        </div>
        <div class="resource-grid">
          ${metricCard("Cash", `$${state.cash}`)}
          ${metricCard("Energy", `${state.energy}`)}
          ${metricCard("Heat", `${state.heat}`)}
          ${metricCard("Respect", `${state.respect}`)}
        </div>
        <div class="panel">
          <div class="action-row">
            <span>Supplies</span>
            <strong>${state.supplies}</strong>
          </div>
          <div class="action-row">
            <span>Day / Turn</span>
            <strong>${state.day} / ${state.turn}</strong>
          </div>
          <div class="action-row">
            <span>Message</span>
            <strong>${state.lastMessage}</strong>
          </div>
        </div>
      </section>
    `;
  }

  function renderProfile() {
    const status = getProfileStatus();
    const winProgress = Math.min(100, Math.round((state.cash / state.targetCash) * 100));
    return `
      <section class="panel">
        <div class="screen-header">
          <p class="eyebrow">Player profile</p>
          <h2>${state.playerName}</h2>
          <span class="${status.tone}">${status.text}</span>
        </div>
        <div class="status-grid">
          ${metricCard("Daily objective", `$${state.targetCash - state.cash > 0 ? state.targetCash - state.cash : 0} remaining`)}
          ${metricCard("Home base", "Safehouse")}
          ${metricCard("Current turf", getLocation(state.activeLocation).name)}
          ${metricCard("Interior access", "Unlocked")}
        </div>
        <div class="panel">
          <div class="action-row">
            <span>Cash progress</span>
            <strong>${winProgress}%</strong>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${winProgress}%"></div></div>
        </div>
        <div class="menu-actions">
          <button class="primary-button" data-screen="city">Enter the city</button>
          <button class="secondary-button" data-screen="interior">Visit safehouse</button>
          <button class="ghost-button" data-action="start">Reset run</button>
        </div>
      </section>
    `;
  }

  function renderCity() {
    return `
      <section class="panel">
        <div class="screen-header">
          <p class="eyebrow">City screen</p>
          <h2>Interactive districts</h2>
          <p class="muted">Tap a district, travel there, then trigger one of its location actions.</p>
        </div>
        <div class="location-grid">
          ${LOCATION_DEFINITIONS.map((location) => {
            const selected = state.activeLocation === location.id;
            return `
              <article class="card ${selected ? "active" : ""}">
                <div class="card-header">
                  <div class="location-header">
                    <h3>${location.name}</h3>
                    <span class="tag">${location.type}</span>
                  </div>
                  <p>${location.description}</p>
                </div>
                <div class="action-stack">
                  <button class="secondary-button" data-travel="${location.id}">${selected ? "Current district" : "Travel here"}</button>
                  ${location.actions.map((actionId) => `<button class="action-button" data-location-action="${actionId}">${ACTION_DEFINITIONS[actionId].label}</button>`).join("")}
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function renderInterior() {
    return `
      <section class="panel">
        <div class="screen-header">
          <p class="eyebrow">Enterable interior</p>
          <h2>Safehouse apartment</h2>
          <p class="muted">Recover your crew, reduce heat, and plan your next push from inside the building.</p>
        </div>
        <div class="card">
          <div class="card-header">
            <h3>Interior actions</h3>
            <p>Every interior move keeps the game loop going by advancing turns and changing your stats.</p>
          </div>
          <div class="action-stack">
            <button class="action-button" data-location-action="rest">${ACTION_DEFINITIONS.rest.label}</button>
            <button class="action-button" data-location-action="intel">${ACTION_DEFINITIONS.intel.label}</button>
            <button class="secondary-button" data-location-action="leaveInterior">${ACTION_DEFINITIONS.leaveInterior.label}</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderLogPanel() {
    return `
      <section class="panel log-panel">
        <div class="screen-header">
          <p class="eyebrow">Street log</p>
          <h2>Latest turns</h2>
        </div>
        <div class="log-list">
          ${state.log.map((entry) => `
            <article class="log-item">
              <span class="log-turn">Turn ${entry.turn}</span>
              <p>${entry.text}</p>
            </article>
          `).join("")}
        </div>
      </section>
      <p class="footer-note">Win by reaching $${state.targetCash} before heat or fatigue ends the run.</p>
    `;
  }

  function metricCard(label, value) {
    return `
      <div class="resource-chip">
        <span class="label">${label}</span>
        <span class="value">${value}</span>
      </div>
    `;
  }

  function wireButtons() {
    document.querySelectorAll("[data-action='start']").forEach((button) => {
      button.addEventListener("click", () => {
        state = startGame(state.playerName);
        render();
      });
    });

    document.querySelectorAll("[data-screen]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextScreen = button.getAttribute("data-screen");
        state = {
          ...state,
          currentScreen: nextScreen
        };
        render();
      });
    });

    document.querySelectorAll("[data-travel]").forEach((button) => {
      button.addEventListener("click", () => {
        const locationId = button.getAttribute("data-travel");
        state = travelTo(state, locationId);
        render();
      });
    });

    document.querySelectorAll("[data-location-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const actionId = button.getAttribute("data-location-action");
        state = performAction(state, actionId);
        render();
      });
    });
  }

  menuButton?.addEventListener("click", () => {
    state = {
      ...state,
      currentScreen: "menu"
    };
    render();
  });

  render();
})();
