'use strict';

/**
 * P2839 Contre quoi: driver.js must not register flow cards absent from
 * driver.flow.compose.json (hollow / creux) — ID mismatch = dead actions.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');

function hollowFor(driverId) {
  const df = path.join(DRIVERS, driverId, 'driver.js');
  const ff = path.join(DRIVERS, driverId, 'driver.flow.compose.json');
  if (!fs.existsSync(df) || !fs.existsSync(ff)) return [];
  const code = fs.readFileSync(df, 'utf8');
  const flow = JSON.parse(fs.readFileSync(ff, 'utf8'));
  const defined = new Set([
    ...(flow.actions || []).map((a) => a.id),
    ...(flow.triggers || []).map((t) => t.id),
    ...(flow.conditions || []).map((c) => c.id),
  ]);
  const hollow = [];
  const re = /get(Action|Trigger|Condition)Card\(['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(code))) {
    if (!defined.has(m[2])) hollow.push(m[2]);
  }
  return hollow;
}

describe('P2839 hollow flow card wire', () => {
  it('hotspot drivers have zero hollow registrations', () => {
    for (const id of [
      'boiler_switch_energy',
      'bulb_rgb_led',
      'device_din_rail',
      'plug_smart',
      'sensor_contact_zigbee',
      'sensor_presence_radar',
    ]) {
      const h = hollowFor(id);
      assert.deepEqual(h, [], `${id} hollow: ${h.join(', ')}`);
    }
  });

  it('device_din_rail no longer registers doorbell_* cards', () => {
    const code = fs.readFileSync(path.join(DRIVERS, 'device_din_rail', 'driver.js'), 'utf8');
    assert.equal(/get(?:Action|Condition|Trigger)Card\(['"]doorbell_/.test(code), false);
    assert.ok(/device_din_rail_is_on/.test(code));
  });

  it('boiler power/temperature conditions exist in compose', () => {
    const flow = JSON.parse(
      fs.readFileSync(path.join(DRIVERS, 'boiler_switch_energy', 'driver.flow.compose.json'), 'utf8')
    );
    const ids = (flow.conditions || []).map((c) => c.id);
    assert.ok(ids.includes('boiler_switch_energy_power_above'));
    assert.ok(ids.includes('boiler_switch_energy_temperature_above'));
  });

  // Contre quoi: driver + .homeycompose/flow/conditions/* same id → flow-card-dup-gate red
  it('boiler conditions are not duplicated under .homeycompose/flow/conditions', () => {
    const condDir = path.join(ROOT, '.homeycompose', 'flow', 'conditions');
    for (const id of [
      'boiler_switch_energy_power_above',
      'boiler_switch_energy_temperature_above',
    ]) {
      assert.equal(
        fs.existsSync(path.join(condDir, `${id}.json`)),
        false,
        `duplicate global condition ${id}.json`
      );
    }
  });

  it('fleet scan: no hollow get*Card vs compose (drivers with both files)', () => {
    const bad = [];
    for (const d of fs.readdirSync(DRIVERS)) {
      const h = hollowFor(d);
      if (h.length) bad.push({ d, h });
    }
    assert.equal(bad.length, 0, JSON.stringify(bad.slice(0, 10), null, 2));
  });
});
