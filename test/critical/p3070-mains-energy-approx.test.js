'use strict';
// P3070-energy: light/socket drivers without measure_power/meter_power and without energy.approximation.
// Mains devices of drivers that also declare batteries get the PowerSourceResolver default at runtime
// (no manifest growth); battery-only/sensor drivers (curve none) get nothing.
require('../_support/homey-stub').install();
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { mainsEnergyFor } = require('../../lib/energy/mainsEnergy');
const R = require('../../lib/energy/PowerSourceResolver');

const ROOT = path.resolve(__dirname, '../..');
const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const dev = (d, caps, settings = {}) => ({
  driver: { id: d.id, manifest: d }, getClass: () => d.class,
  hasCapability: (c) => caps.includes(c), getSetting: (k) => settings[k] || null, getStoreValue: () => null,
});

describe('P3070 mains energy approximation', () => {
  const gaps = app.drivers.filter((d) => ['light', 'socket'].includes(d.class)
    && !(d.capabilities || []).some((c) => /^(measure_power|meter_power)/.test(c)) && !d.energy?.approximation);
  it('every on/off mains switch/dimmer gap driver gets a native estimate at runtime', () => {
    let covered = 0;
    for (const d of gaps) {
      const e = mainsEnergyFor(dev(d, d.capabilities || []));
      assert.strictEqual(e.mains, true, d.id);
      assert.strictEqual(e.batteries, null, d.id);
      const def = R.defaultFor({ driverId: d.id, deviceClass: d.class });
      if (['constant', 'linear_dim'].includes(def.curve) && (d.capabilities || []).includes('onoff')) {
        assert.ok(e.approximation && e.approximation.usageOn > 0, d.id);
        covered++;
      } else {
        assert.ok(!e.approximation, d.id);
      }
    }
    assert.ok(covered >= 20, `covered ${covered}`);
  });
  it('dimmer 40/0.5, relay 40/0.4 (same defaults as the manifest policy)', () => {
    const dim = app.drivers.find((d) => d.id === 'dimmer_1_gang');
    assert.deepStrictEqual(mainsEnergyFor(dev(dim, ['onoff', 'dim'])).approximation, { usageOn: 40, usageOff: 0.5 });
    const sw = app.drivers.find((d) => d.id === 'switch_1_gang');
    assert.deepStrictEqual(mainsEnergyFor(dev(sw, ['onoff'])).approximation, { usageOn: 40, usageOff: 0.4 });
  });
  it('no estimate for metered devices, devices without onoff, or sensors classed socket', () => {
    const sw = app.drivers.find((d) => d.id === 'switch_1_gang');
    assert.ok(!mainsEnergyFor(dev(sw, ['onoff', 'measure_power'])).approximation);
    assert.ok(!mainsEnergyFor(dev(sw, ['alarm_contact'])).approximation);
    const sensor = app.drivers.find((d) => d.id === 'switch_temp_sensor');
    assert.ok(!mainsEnergyFor(dev(sensor, sensor.capabilities || [])).approximation);
  });
  it('never throws on a bare device', () => {
    assert.deepStrictEqual(mainsEnergyFor({}), { batteries: null, mains: true });
  });
  it('both mains paths keep the batteries:null call and add the estimate', () => {
    for (const f of ['lib/managers/SmartBatteryManager.js', 'lib/resilience/FirmwareQuirkCompensator.js']) {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      assert.ok(src.includes('batteries: null, mains: true') && src.includes('mainsEnergyFor('), f);
    }
  });
});
