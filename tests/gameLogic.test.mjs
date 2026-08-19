import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  travelToDistrict,
  performLocationAction,
  safehouseRest,
  upgradeSafehouse,
  coolDistrictHeat,
  getSelectedDistrict
} from '../src/gameLogic.mjs';

test('initial state contains player and districts', () => {
  const state = createInitialState();
  assert.equal(state.player.alias, 'La Sombra');
  assert.equal(state.districts.length, 3);
  assert.ok(state.notifications.length >= 1);
});

test('travel changes selected district and day', () => {
  const state = createInitialState();
  const initialDay = state.day;
  travelToDistrict(state, 'iron-docks');
  assert.equal(state.selectedDistrictId, 'iron-docks');
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

test('safehouse upgrade costs cash and increases level', () => {
  const state = createInitialState();
  const cash = state.player.cash;

  upgradeSafehouse(state);

  assert.equal(state.player.safehouseLevel, 2);
  assert.equal(state.player.cash, cash - 900);
});

test('district cooling spends cash and reduces heat', () => {
  const state = createInitialState();
  const district = getSelectedDistrict(state);
  district.heat = 40;

  coolDistrictHeat(state, district.id);

  assert.equal(state.player.cash, 820);
  assert.equal(district.heat, 24);
});
