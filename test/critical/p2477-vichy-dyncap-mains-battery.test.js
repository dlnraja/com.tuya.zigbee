'use strict';

/**
 * P2477 — VicHY c5165a37 residual: DCM ZCL 0x0001 must not re-inject measure_battery on mains radar.
 * Contre quoi: compose clean (P2472a) but managers/dynamic DynCap still addCapability battery.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const mgr = fs.readFileSync(path.join(ROOT, 'lib', 'managers', 'DynamicCapabilityManager.js'), 'utf8');
const dyn = fs.readFileSync(path.join(ROOT, 'lib', 'dynamic', 'DynamicCapabilityManager.js'), 'utf8');

assert.ok(mgr.includes('_isMainsPresenceRadar'), 'P2477: managers DCM mains radar helper');
assert.ok(mgr.includes('P2477'), 'P2477 marker in managers DCM');
assert.ok(/measure_battery[\s\S]{0,80}_isMainsPresenceRadar/.test(mgr)
  || /_isMainsPresenceRadar[\s\S]{0,200}measure_battery/.test(mgr),
  'P2477: managers DCM blocks battery when mains radar');

assert.ok(dyn.includes('_isMainsPresenceRadar'), 'P2477: dynamic DynCap mains radar helper');
assert.ok(dyn.includes('P2477'), 'P2477 marker in dynamic DynCap');
assert.ok(dyn.includes('clrdrnya'), 'P2477: clrdrnya mfr force-mains');

// Runtime soft check
const DCM = require(path.join(ROOT, 'lib', 'managers', 'DynamicCapabilityManager'));
const fake = {
  device: {
    driver: { id: 'presence_sensor_radar', manifest: { id: 'presence_sensor_radar', class: 'sensor' } },
    mainsPowered: true,
    _forbiddenCapabilities: [],
  },
};
fake._isIrrelevantCap = DCM.prototype._isIrrelevantCap;
fake._isMainsPresenceRadar = DCM.prototype._isMainsPresenceRadar;
assert.strictEqual(fake._isIrrelevantCap('measure_battery'), true, 'mains radar: measure_battery irrelevant');
assert.strictEqual(fake._isIrrelevantCap('alarm_battery'), true, 'mains radar: alarm_battery irrelevant');
assert.strictEqual(fake._isIrrelevantCap('alarm_motion'), false, 'mains radar: alarm_motion still allowed');

const batt = {
  device: {
    driver: { id: 'presence_sensor_radar', manifest: { id: 'presence_sensor_radar', class: 'sensor' } },
    mainsPowered: false,
    _forbiddenCapabilities: [],
    getSetting: () => 'HOBEIAN',
  },
};
batt._isIrrelevantCap = DCM.prototype._isIrrelevantCap;
batt._isMainsPresenceRadar = DCM.prototype._isMainsPresenceRadar;
assert.strictEqual(batt._isIrrelevantCap('measure_battery'), false, 'battery HOBEIAN radar may keep measure_battery');

console.log('P2477 VicHY DynCap mains battery block: PASS');
