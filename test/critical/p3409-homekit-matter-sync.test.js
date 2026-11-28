'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const { MatterCompatibilityLayer } = require(path.join(ROOT, 'lib/zigbee/MatterCompatibilityLayer'));

test('P3409: Homey <-> Matter 1.5 conversions for lights, covers, thermostats, locks, sensors & battery', () => {
  // Dim & Color Temperature (Apple Adaptive Lighting mireds)
  assert.equal(MatterCompatibilityLayer.convertHomeyToMatter('dim', 0.5), 127);
  assert.equal(MatterCompatibilityLayer.convertMatterToHomey('dim', 127), 0.5);
  assert.equal(MatterCompatibilityLayer.convertHomeyToMatter('light_temperature', 0), 153);
  assert.equal(MatterCompatibilityLayer.convertHomeyToMatter('light_temperature', 1), 500);
  assert.equal(MatterCompatibilityLayer.convertMatterToHomey('light_temperature', 500), 1);

  // Thermostat 0.5 C precision & systemMode
  assert.equal(MatterCompatibilityLayer.convertHomeyToMatter('target_temperature', 21.5), 2150);
  assert.equal(MatterCompatibilityLayer.convertMatterToHomey('target_temperature', 2150), 21.5);
  assert.equal(MatterCompatibilityLayer.convertHomeyToMatter('thermostat_mode', 'heat'), 4);
  assert.equal(MatterCompatibilityLayer.convertMatterToHomey('thermostat_mode', 3), 'cool');

  // Window Covering inverted lift percentage (Homey 1=open <-> Matter 0=open, 10000=closed)
  assert.equal(MatterCompatibilityLayer.convertHomeyToMatter('windowcoverings_set', 1), 0);
  assert.equal(MatterCompatibilityLayer.convertHomeyToMatter('windowcoverings_set', 0), 10000);
  assert.equal(MatterCompatibilityLayer.convertMatterToHomey('windowcoverings_set', 2500), 0.75);

  // Contact sensor inverted BooleanState (Homey alarm_contact=true open <-> Matter stateValue=false open)
  assert.equal(MatterCompatibilityLayer.convertHomeyToMatter('alarm_contact', true), false);
  assert.equal(MatterCompatibilityLayer.convertMatterToHomey('alarm_contact', false), true);

  // Lock (1=locked, 2=unlocked) & Battery (0..100 -> 0..200)
  assert.equal(MatterCompatibilityLayer.convertHomeyToMatter('locked', true), 1);
  assert.equal(MatterCompatibilityLayer.convertHomeyToMatter('locked', false), 2);
  assert.equal(MatterCompatibilityLayer.convertMatterToHomey('locked', 1), true);
  assert.equal(MatterCompatibilityLayer.convertHomeyToMatter('measure_battery', 85), 170);
  assert.equal(MatterCompatibilityLayer.convertMatterToHomey('measure_battery', 170), 85);
});

test('P3409: getAppleHomeKitProfile identifies Adaptive Lighting, 0.5C thermostats, inverted covers & stateless buttons', () => {
  const light = { getClass: () => 'light', getCapabilities: () => ['onoff', 'dim', 'light_temperature'] };
  const lp = MatterCompatibilityLayer.getAppleHomeKitProfile(light);
  assert.equal(lp.homeKitService, 'Lightbulb');
  assert.equal(lp.appleAdaptiveLighting, true);
  assert.equal(lp.matterBridgeReady, true);

  const cover = { getClass: () => 'windowcoverings', getCapabilities: () => ['windowcoverings_set'] };
  const cp = MatterCompatibilityLayer.getAppleHomeKitProfile(cover);
  assert.equal(cp.homeKitService, 'WindowCovering');
  assert.ok(cp.invertedCapabilities.includes('windowcoverings_set'));

  const trv = { getClass: () => 'thermostat', getCapabilities: () => ['measure_temperature', 'target_temperature', 'thermostat_mode'] };
  const tp = MatterCompatibilityLayer.getAppleHomeKitProfile(trv);
  assert.equal(tp.homeKitService, 'Thermostat');
  assert.equal(tp.halfDegreeThermostat, true);

  const btn = { getClass: () => 'button', getCapabilities: () => ['measure_battery'] };
  const bp = MatterCompatibilityLayer.getAppleHomeKitProfile(btn);
  assert.equal(bp.homeKitService, 'StatelessProgrammableSwitch');
  assert.equal(bp.requiresVirtualSwitchForHomeKit, true);
});
