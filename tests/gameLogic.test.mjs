import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
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
} from '../src/gameLogic.mjs';

test('initial state contains player and districts', () => {
  const state = createInitialState();
  assert.equal(state.player.alias, 'Isabella Voss');
  assert.equal(state.districts.length, 3);
  assert.ok(state.currentLocationId);
  assert.ok(state.notifications.length >= 1);
});

test('travel changes selected district and day', () => {
  const state = createInitialState();
  const initialDay = state.day;
  travelToDistrict(state, 'iron-docks');
  assert.equal(state.selectedDistrictId, 'iron-docks');
  assert.equal(state.currentLocationId, 'night-pier');
  assert.equal(state.day, initialDay + 1);
});

test('move to location updates active location and day', () => {
  const state = createInitialState();
  const initialDay = state.day;
  moveToLocation(state, 'gold-coast', 'obsidian-lounge');
  assert.equal(state.currentLocationId, 'obsidian-lounge');
  assert.equal(state.day, initialDay + 1);
});

test('location action consumes energy and grants cash', () => {
  const state = createInitialState();
  const district = getSelectedDistrict(state);
  const location = district.locations[0];
  const action = location.actions[0];
  const startCash = state.player.cash;
  const startEnergy = state.player.energy;

  performLocationAction(state, district.id, location.id, action.id);

  assert.equal(state.player.cash, startCash + action.cash);
  assert.equal(state.player.energy, startEnergy - action.energy);
});

test('safehouse rest recovers health and energy', () => {
  const state = createInitialState();
  state.player.energy = 30;
  state.player.health = 40;

  safehouseRest(state);

  assert.ok(state.player.energy > 30);
  assert.ok(state.player.health > 40);
});

test('safehouse recover energy recovers energy quickly', () => {
  const state = createInitialState();
  state.player.energy = 20;
  safehouseRecoverEnergy(state);
  assert.ok(state.player.energy > 20);
});

test('safehouse upgrade costs cash and increases level', () => {
  const state = createInitialState();
  state.player.cash = 2400;
  const level = state.player.safehouseLevel;
  const cash = state.player.cash;

  upgradeSafehouse(state);

  assert.equal(state.player.safehouseLevel, 2);
  assert.equal(state.player.cash, cash - level * 900);
});

test('district cooling spends cash and reduces heat', () => {
  const state = createInitialState();
  const district = getSelectedDistrict(state);
  district.heat = 40;
  const startCash = state.player.cash;

  coolDistrictHeat(state, district.id);

  assert.equal(state.player.cash, startCash - 180);
  assert.equal(district.heat, 24);
});

test('inventory and storage inspections add notifications', () => {
  const state = createInitialState();
  const baseline = state.notifications.length;
  inspectInventory(state);
  inspectStorage(state);
  assert.equal(state.notifications.length, baseline + 2);
});

test('return to city sets city screen', () => {
  const state = createInitialState();
  state.currentScreen = 'safehouse';
  returnToCity(state);
  assert.equal(state.currentScreen, 'city');
});

test('current location helper returns selected location', () => {
  const state = createInitialState();
  moveToLocation(state, 'gold-coast', 'obsidian-lounge');
  const location = getCurrentLocation(state);
  assert.equal(location.id, 'obsidian-lounge');
});
