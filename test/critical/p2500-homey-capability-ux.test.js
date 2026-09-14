'use strict';

/**
 * P2500 — Homey Capability UX (T43287 + Athom)
 * Contre quoi: getable:false on measure_* / generic flow filtered to onoff-only
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  mustNeverGetableFalse,
  isButtonMaintenanceCap,
  healSensorCapabilityGetable,
} = require('../../lib/utils/HomeyCapabilityUx');

const ROOT = path.join(__dirname, '..', '..');

describe('P2500 Homey Capability UX', () => {
  it('SSOT + human doc exist and forbid measure_ getable:false', () => {
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/homey-capability-ux-ssot.json'),
      'utf8',
    ));
    assert.ok(ssot.athomRules.getableFalseForbiddenPrefixes.includes('measure_'));
    assert.equal(
      ssot.deviceCapabilitiesLessons.genericCapabilityChanged.deviceFilter,
      'none — all app devices (not capabilities=onoff)',
    );
    const human = fs.readFileSync(
      path.join(ROOT, 'docs/architecture/HOMEY_CAPABILITY_UX_SSOT.md'),
      'utf8',
    );
    assert.match(human, /43287|Device Capabilities/i);
    assert.match(human, /getable/i);
  });

  it('sensor prefixes never getable:false; button.N OK', () => {
    assert.equal(mustNeverGetableFalse('measure_battery'), true);
    assert.equal(mustNeverGetableFalse('alarm_motion'), true);
    assert.equal(mustNeverGetableFalse('meter_power'), true);
    assert.equal(mustNeverGetableFalse('button.1'), false);
    assert.equal(isButtonMaintenanceCap('button.3'), true);
  });

  it('capability_value_changed_generic allows all devices (no onoff filter)', () => {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, '.homeycompose/flow/triggers/capability_value_changed_generic.json'),
      'utf8',
    ));
    const deviceArg = (flow.args || []).find((a) => a.type === 'device');
    assert.ok(deviceArg);
    assert.ok(
      !deviceArg.filter || !/capabilities=onoff/i.test(deviceArg.filter),
      'must not restrict to onoff devices',
    );
  });

  it('healSensorCapabilityGetable restores measure_battery getable', async () => {
    const calls = [];
    const device = {
      _homeyCapabilityUxHealed: false,
      getCapabilities: () => ['measure_battery', 'button.1'],
      getCapabilityOptions: (cap) => (cap === 'measure_battery' ? { getable: false } : { getable: false }),
      setCapabilityOptions: async (cap, opts) => { calls.push({ cap, opts }); },
      log: () => {},
    };
    const r = await healSensorCapabilityGetable(device);
    assert.deepEqual(r.healed, ['measure_battery']);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].opts.getable, true);
    // button.1 must not be healed as sensor
    assert.ok(!calls.some((c) => c.cap === 'button.1'));
  });

  it('button_wireless_1 compose stays getable (P2499 lock)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'),
      'utf8',
    ));
    const opts = compose.capabilitiesOptions?.measure_battery || {};
    assert.notEqual(opts.getable, false);
  });
});
