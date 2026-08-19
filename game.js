(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.NarcosCityGame = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const TARGET_CASH = 1500;

  const LOCATION_DEFINITIONS = [
    {
      id: "market",
      name: "Barrio Market",
      type: "Street Corner",
      description: "Pick up fast cash from local runners and barter for supplies.",
      actions: ["hustle", "buySupplies"]
    },
    {
      id: "docks",
      name: "Moonlit Docks",
      type: "Transit Route",
      description: "Take a risky shipment run for bigger profit and more heat.",
      actions: ["shipment", "layLow"]
    },
    {
      id: "nightclub",
      name: "Velvet Nightclub",
      type: "Hot Zone",
      description: "Move product to VIPs and build respect under neon lights.",
      actions: ["clubDeal", "bribe"]
    },
    {
      id: "safehouse",
      name: "Safehouse",
      type: "Interior Hub",
      description: "A hidden apartment where you can recover, stash supplies, and plan.",
      actions: ["rest", "intel", "enterSafehouse"],
      enterable: true
    }
  ];

  const ACTION_DEFINITIONS = {
    hustle: {
      label: "Run a corner hustle",
      effect: (state) => applyOutcome(state, {
        cash: 120,
        energy: -15,
        heat: 7,
        respect: 5,
        supplies: -1,
        log: "You worked the Barrio Market and pocketed quick cash."
      }, "Not enough supplies to work the market.", { requiresSupplies: 1 })
    },
    buySupplies: {
      label: "Buy supplies",
      effect: (state) => applyOutcome(state, {
        cash: -90,
        energy: -5,
        supplies: 2,
        log: "You restocked your operation at the market."
      }, "You need more cash to buy supplies.", { requiresCash: 90 })
    },
    shipment: {
      label: "Run a dock shipment",
      effect: (state) => applyOutcome(state, {
        cash: 260,
        energy: -25,
        heat: 16,
        respect: 9,
        supplies: -2,
        log: "You slipped cargo through the docks before sunrise."
      }, "You need at least 2 supplies for a dock shipment.", { requiresSupplies: 2 })
    },
    layLow: {
      label: "Lay low at the docks",
      effect: (state) => applyOutcome(state, {
        energy: 10,
        heat: -12,
        log: "You let the harbor fog cover your tracks."
      })
    },
    clubDeal: {
      label: "Broker a nightclub deal",
      effect: (state) => applyOutcome(state, {
        cash: 210,
        energy: -20,
        heat: 11,
        respect: 12,
        supplies: -1,
        log: "You closed a VIP deal at Velvet Nightclub."
      }, "You need supplies to close a nightclub deal.", { requiresSupplies: 1 })
    },
    bribe: {
      label: "Pay a bouncer for cover",
      effect: (state) => applyOutcome(state, {
        cash: -110,
        heat: -18,
        respect: 4,
        log: "A paid-off doorman warned you before trouble arrived."
      }, "You need more cash to pay for cover.", { requiresCash: 110 })
    },
    rest: {
      label: "Rest and recover",
      effect: (state) => applyOutcome(state, {
        energy: 30,
        heat: -6,
        log: "You recovered in the safehouse and kept the lights low."
      })
    },
    intel: {
      label: "Plan the next route",
      effect: (state) => applyOutcome(state, {
        respect: 6,
        heat: -4,
        log: "You mapped safer routes and strengthened your network."
      })
    },
    enterSafehouse: {
      label: "Enter the safehouse",
      effect: (state) => ({
        ...state,
        currentScreen: "interior",
        activeLocation: "safehouse",
        lastMessage: "You stepped inside the safehouse.",
        log: appendLog(state.log, state.turn, "You slipped into the safehouse interior.")
      })
    },
    leaveInterior: {
      label: "Head back to the city",
      effect: (state) => ({
        ...state,
        currentScreen: "city",
        lastMessage: "Back on the city map.",
        log: appendLog(state.log, state.turn, "You returned to the city streets.")
      })
    }
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function appendLog(log, turn, text) {
    return [{ turn, text }, ...log].slice(0, 8);
  }

  function baseState(playerName) {
    return {
      playerName: playerName || "El Jefe",
      currentScreen: "menu",
      activeLocation: "market",
      day: 1,
      turn: 1,
      cash: 320,
      energy: 80,
      heat: 18,
      respect: 10,
      supplies: 2,
      targetCash: TARGET_CASH,
      status: "active",
      objective: "Grow your network to $1,500 before the city locks down.",
      lastMessage: "Start your rise from the barrio.",
      log: [{ turn: 1, text: "You arrived in Narcos City with a small crew and limited supplies." }]
    };
  }

  function startGame(playerName) {
    const state = baseState(playerName);
    return {
      ...state,
      currentScreen: "profile",
      lastMessage: "Your operation is live."
    };
  }

  function travelTo(state, locationId) {
    return {
      ...state,
      currentScreen: "city",
      activeLocation: locationId,
      lastMessage: `You moved to ${getLocation(locationId).name}.`
    };
  }

  function applyOutcome(state, delta, errorMessage, requirements) {
    const requirementsError = validateRequirements(state, requirements);
    if (requirementsError) {
      return {
        ...state,
        lastMessage: errorMessage || requirementsError
      };
    }

    const nextTurn = state.turn + 1;
    const nextState = {
      ...state,
      turn: nextTurn,
      day: 1 + Math.floor((nextTurn - 1) / 3),
      cash: Math.max(0, state.cash + (delta.cash || 0)),
      energy: clamp(state.energy + (delta.energy || 0), 0, 100),
      heat: clamp(state.heat + (delta.heat || 0), 0, 100),
      respect: clamp(state.respect + (delta.respect || 0), 0, 100),
      supplies: Math.max(0, state.supplies + (delta.supplies || 0)),
      lastMessage: delta.log || state.lastMessage,
      log: appendLog(state.log, nextTurn, delta.log || "The city shifted around you.")
    };

    return resolveStatus(nextState);
  }

  function validateRequirements(state, requirements) {
    if (!requirements) return "";
    if (requirements.requiresCash && state.cash < requirements.requiresCash) {
      return "Not enough cash.";
    }
    if (requirements.requiresSupplies && state.supplies < requirements.requiresSupplies) {
      return "Not enough supplies.";
    }
    return "";
  }

  function resolveStatus(state) {
    if (state.cash >= state.targetCash) {
      return {
        ...state,
        status: "won",
        currentScreen: "profile",
        lastMessage: "You took control of the city routes."
      };
    }
    if (state.heat >= 100) {
      return {
        ...state,
        status: "lost",
        currentScreen: "profile",
        lastMessage: "The city cracked down and your run is over."
      };
    }
    if (state.energy <= 0) {
      return {
        ...state,
        status: "lost",
        currentScreen: "profile",
        lastMessage: "Your crew burned out before the empire could grow."
      };
    }
    return state;
  }

  function performAction(state, actionId) {
    const action = ACTION_DEFINITIONS[actionId];
    if (!action) {
      return {
        ...state,
        lastMessage: "That move is not available."
      };
    }
    return action.effect(state);
  }

  function getLocation(locationId) {
    return LOCATION_DEFINITIONS.find((location) => location.id === locationId) || LOCATION_DEFINITIONS[0];
  }

  return {
    LOCATION_DEFINITIONS,
    ACTION_DEFINITIONS,
    TARGET_CASH,
    baseState,
    startGame,
    travelTo,
    performAction,
    getLocation
  };
});
