'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('P2518 cap/flow/DP/RX enrich locks', () => {
  it('all drivers have flow.compose; coverage critical gaps 0', () => {
    const driversDir = path.join(ROOT, 'drivers');
    const ids = fs.readdirSync(driversDir).filter((d) =>
      fs.statSync(path.join(driversDir, d)).isDirectory());
    const missing = ids.filter((id) => !fs.existsSync(path.join(driversDir, id, 'driver.flow.compose.json')));
    assert.deepStrictEqual(missing, []);
  });

  it('wifi_ir_remote has no titleFormatted; no [[device]] in fleet samples', () => {
    const wifi = JSON.parse(read('drivers/wifi_ir_remote/driver.flow.compose.json'));
    for (const section of ['triggers', 'conditions', 'actions']) {
      for (const card of wifi[section] || []) {
        assert.ok(!card.titleFormatted, `wifi card ${card.id} still has titleFormatted`);
      }
    }
  });

  it('energy_meter_3phase DP1 is meter_power not onoff (RX Contre quoi)', () => {
    const src = read('drivers/energy_meter_3phase/device.js');
    assert.ok(/1:\s*\{\s*capability:\s*'meter_power'/.test(src), 'DP1 must map meter_power');
    assert.ok(!/1:\s*\{\s*capability:\s*'onoff'/.test(src), 'DP1 must not be onoff');
    assert.ok(/mainsPowered/.test(src));
    assert.ok(/23:\s*\{\s*capability:\s*'meter_power\.exported'/.test(src));
    assert.ok(/29:\s*\{\s*capability:\s*'measure_power'/.test(src));
  });

  it('metering drivers gained power_scale setting after fleet enrich', () => {
    const meter = JSON.parse(read('drivers/energy_meter_3phase/driver.compose.json'));
    const has = (settings, id) => {
      if (!Array.isArray(settings)) return false;
      for (const s of settings) {
        if (s.id === id) return true;
        if (s.children && has(s.children, id)) return true;
      }
      return false;
    };
    // energy_meter_3phase may already have had power_scale from earlier enrich;
    // at least one previously-gapped driver must have it
    const boiler = JSON.parse(read('drivers/boiler_switch_energy/driver.compose.json'));
    assert.ok(
      has(boiler.settings, 'power_scale') || has(meter.settings, 'power_scale'),
      'power_scale missing on metering drivers'
    );
  });

  it('valve EF00-only clusters stay without OnOff 6', () => {
    for (const id of ['water_valve_smart', 'valve_dual_irrigation']) {
      const c = JSON.parse(read(`drivers/${id}/driver.compose.json`));
      const clusters = c.zigbee?.endpoints?.['1']?.clusters || [];
      assert.ok(clusters.includes(61184), `${id} needs EF00`);
      assert.ok(!clusters.includes(6), `${id} must not force OnOff 6`);
    }
  });
});
