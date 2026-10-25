'use strict';

/**
 * P3045 — data/driver-mapping-database.json driver profiles mirror the real driver.compose.json.
 * IntelligentDriverHotSwap.applyDriverProfile adds a profile's capabilities to a live device, so a
 * profile that lists a capability its driver never declares (e.g. measure_battery on a mains switch or
 * bulb) or the wrong class (button_wireless_* as "sensor") creates phantoms. The two health
 * capabilities added to every device by ZigbeeHealthMixin are allowed. The detector indexes
 * (mfr_index / pid_index) are not part of this check and were not edited.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DB = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/driver-mapping-database.json'), 'utf8'));
const UNIVERSAL = new Set(['measure_radio_stability', 'measure_maintenance_score']);

test('every profile with a driver.compose.json has the same class and only declared capabilities', () => {
  const bad = [];
  let checked = 0;
  for (const [id, prof] of Object.entries(DB.drivers)) {
    const f = path.join(ROOT, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(f)) { continue; }
    checked++;
    const compose = JSON.parse(fs.readFileSync(f, 'utf8'));
    const declared = new Set(compose.capabilities || []);
    if (prof.class !== compose.class) { bad.push(`${id}: class ${prof.class} != ${compose.class}`); }
    for (const cap of prof.capabilities || []) {
      if (!declared.has(cap) && !UNIVERSAL.has(cap)) { bad.push(`${id}: ${cap} not declared`); }
    }
    assert.ok(Array.isArray(prof.capabilities) && prof.capabilities.length, `${id}: empty profile`);
  }
  assert.ok(checked > 250, `only ${checked} profiles checked`);
  assert.deepStrictEqual(bad, []);
});

test('named examples are fixed (no battery on mains drivers, button class on wireless buttons)', () => {
  for (const id of ['switch_1gang', 'switch_2gang', 'switch_3gang', 'light_bulb_rgb_led', 'gas_sensor', 'motion_sensor']) {
    const compose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
    if (!(compose.capabilities || []).includes('measure_battery')) {
      assert.ok(!DB.drivers[id].capabilities.includes('measure_battery'), `${id} measure_battery`);
    }
  }
  assert.strictEqual(DB.drivers.button_wireless_1.class, 'button');
  assert.strictEqual(DB.drivers.plug_energy_monitor.class, 'socket');
});

test('detector indexes are still present', () => {
  assert.ok(Object.keys(DB.mfr_index).length > 1000);
  assert.ok(Object.keys(DB.pid_index).length > 10);
});
