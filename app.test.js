const test = require("node:test");
const assert = require("node:assert/strict");
const { baseState, startGame, travelTo, performAction } = require("./game");

test("startGame opens the profile screen with active status", () => {
  const state = startGame("La Reina");
  assert.equal(state.currentScreen, "profile");
  assert.equal(state.status, "active");
  assert.equal(state.playerName, "La Reina");
});

test("travelTo changes the active location", () => {
  const state = travelTo(startGame("La Reina"), "nightclub");
  assert.equal(state.currentScreen, "city");
  assert.equal(state.activeLocation, "nightclub");
});

test("resting in the safehouse advances the turn and restores energy", () => {
  const state = startGame("La Reina");
  const tiredState = { ...state, energy: 40, heat: 25 };
  const nextState = performAction(tiredState, "rest");
  assert.equal(nextState.turn, tiredState.turn + 1);
  assert.equal(nextState.energy, 70);
  assert.equal(nextState.heat, 19);
});

test("shipment requires enough supplies", () => {
  const state = { ...baseState("La Reina"), supplies: 1, currentScreen: "city" };
  const nextState = performAction(state, "shipment");
  assert.equal(nextState.turn, state.turn);
  assert.equal(nextState.lastMessage, "You need at least 2 supplies for a dock shipment.");
});

test("winning condition triggers once the cash target is reached", () => {
  const state = { ...startGame("La Reina"), cash: 1450, supplies: 3, currentScreen: "city" };
  const nextState = performAction(state, "shipment");
  assert.equal(nextState.status, "won");
  assert.equal(nextState.currentScreen, "profile");
});
