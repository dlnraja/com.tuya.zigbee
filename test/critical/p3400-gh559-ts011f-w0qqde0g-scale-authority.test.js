'use strict';
// P3400 (issue #559, _TZ3210_w0qqde0g TS011F): interview rmsVoltage 241 (plain V), currentSummationDelivered 2224
// (1/100 kWh, no multiplier/divisor attributes). The user saw 22.3 V, 0 W, 0 A: generic ZCL writers with
// hardcoded divisors (hybrid /10, universal handler TS011F voltage x0.1) overwrote the correct value.
require('../_support/homey-stub');
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const { EventEmitter } = require('events');
const fs = require('fs');

const { ZclScaleAuthority, scaleRaw, repairVoltage } = require(path.join(__dirname, '..', '..', 'lib', 'energy', 'ZclScaleAuthority.js'));
const DIRECT = { power: 1, voltage: 1, current: 1000, energy: 100 };

function rig() {
  const values = {};
  const clock = { t: 1000 };
  const elec = new EventEmitter();
  const meter = new EventEmitter();
  const auth = new ZclScaleAuthority(null, () => clock.t);
  const dev = {
    zclEnergyDivisors: DIRECT,
    hasCapability: () => true,
    async safeSetCapabilityValue(c, v) { values[c] = auth.correct(c, v); return true; },
  };
  auth.device = dev;
  auth.attach({ endpoints: { 1: { clusters: { electricalMeasurement: elec, metering: meter } } } });
  // the legacy writers with hardcoded divisors, registered AFTER the authority (as in the app)
  elec.on('attr.rmsVoltage', (v) => dev.safeSetCapabilityValue('measure_voltage', v / 10));
  elec.on('attr.activePower', (v) => dev.safeSetCapabilityValue('measure_power', Math.round(v / 10)));
  elec.on('attr.rmsCurrent', (v) => dev.safeSetCapabilityValue('measure_current', v / 1000));
  meter.on('attr.currentSummationDelivered', (v) => dev.safeSetCapabilityValue('meter_power', v / 1000));
  return { values, clock, elec, meter, dev, auth };
}

describe('P3400 #559 _TZ3210_w0qqde0g scale authority', () => {
  it('scaleRaw uses plain V / W, mA and 1/100 kWh', () => {
    assert.strictEqual(scaleRaw('measure_voltage', 241, DIRECT), 241);
    assert.strictEqual(scaleRaw('measure_power', 46, DIRECT), 46);
    assert.strictEqual(scaleRaw('measure_current', 210, DIRECT), 0.21);
    assert.strictEqual(scaleRaw('meter_power', 2735, DIRECT), 27.35);
    assert.strictEqual(scaleRaw('meter_power', [0, 2735], DIRECT), 27.35);
    assert.strictEqual(scaleRaw('measure_voltage', 22, DIRECT), null);
  });

  it('fail-before: legacy /10 writers alone give 22.3 V and 0 W; pass-after: authority wins', () => {
    const r = rig();
    r.elec.emit('attr.rmsVoltage', 223);
    r.elec.emit('attr.activePower', 4);
    r.elec.emit('attr.rmsCurrent', 25);
    r.meter.emit('attr.currentSummationDelivered', 2735);
    assert.strictEqual(r.values.measure_voltage, 223);
    assert.strictEqual(r.values.measure_power, 4);
    assert.strictEqual(r.values.measure_current, 0.025);
    assert.strictEqual(r.values.meter_power, 27.35);
    // without the authority the same writers would have produced:
    assert.strictEqual(223 / 10, 22.3);
    assert.strictEqual(Math.round(4 / 10), 0);
  });

  it('keeps later genuine writes (poll) outside the report window', () => {
    const r = rig();
    r.elec.emit('attr.activePower', 40);
    r.clock.t += 60000;
    assert.strictEqual(r.auth.correct('measure_power', 42), 42);
  });

  it('voltage plausibility fallback lifts a /10 voltage when nothing is cached', () => {
    assert.strictEqual(repairVoltage(22.4), 224);
    assert.strictEqual(repairVoltage(231), 231);
    assert.strictEqual(repairVoltage(3.3), 3.3);
    const auth = new ZclScaleAuthority({}, () => 1);
    assert.strictEqual(auth.correct('measure_voltage', 22.6), 226);
    assert.strictEqual(auth.correct('measure_power', 0), 0);
  });

  it('is wired for the exact couple only and hybrid listeners honour device divisors', () => {
    const dev = fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', 'plug_energy_monitor', 'device.js'), 'utf8');
    assert.match(dev, /_includesCI\(\['_TZ3210_xzhnra8x', '_TZ3210_w0qqde0g'\], mfr\)/);
    assert.match(dev, /_zclAuthority/);
    const base = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'devices', 'BaseUnifiedDevice.js'), 'utf8');
    assert.match(base, /value \/ \(this\.zclEnergyDivisors\?\.voltage \|\| 10\)/);
    assert.match(base, /value \/ \(this\.zclEnergyDivisors\?\.power \|\| 10\)/);
  });
});
