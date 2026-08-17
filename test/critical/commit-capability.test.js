'use strict';

/**
 * P212 — commitCapability funnel: production RX must hit confirmInbound / L14.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { commitCapability, commitCapabilityCatch } = require('../../lib/layers/commitCapability');

const ROOT = path.join(__dirname, '..', '..');
function src(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P212 commitCapability', () => {
  it('prefers ingestBatteryPercent for measure_battery', async () => {
    const calls = [];
    const device = {
      ingestBatteryPercent: async (value, opts) => {
        calls.push({ value, opts });
        return { ok: true, via: 'ingest' };
      },
      confirmInbound: async () => ({ ok: true, via: 'confirm' }),
    };
    const r = await commitCapability(device, 'measure_battery', 84, 'zcl');
    assert.equal(r.via, 'ingest');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].opts.protocol, 'zcl');
  });

  it('uses confirmInbound for non-battery capabilities', async () => {
    const device = {
      confirmInbound: async (cap, value, source) => ({ ok: true, via: 'confirm', cap, value, source }),
    };
    const r = await commitCapability(device, 'alarm_motion', true, 'ias');
    assert.equal(r.via, 'confirm');
    assert.equal(r.cap, 'alarm_motion');
    assert.equal(r.source, 'ias');
  });

  it('falls back to safeSetCapabilityValue', async () => {
    const device = {
      safeSetCapabilityValue: async (cap, value, meta) => {
        assert.equal(cap, 'onoff');
        assert.equal(value, true);
        assert.equal(meta.source, 'tuya-dp');
        return true;
      },
    };
    const r = await commitCapability(device, 'onoff', true, 'tuya-dp');
    assert.equal(r.ok, true);
    assert.equal(r.via, 'tuya-dp');
  });

  it('guards destroyed devices', async () => {
    const r = await commitCapability({ _destroyed: true }, 'onoff', true, 'zcl');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'guard');
  });

  it('commitCapabilityCatch never throws', async () => {
    const r = await commitCapabilityCatch({
      confirmInbound: async () => { throw new Error('boom'); },
    }, 'alarm_contact', true, 'ias');
    assert.equal(r.ok, false);
  });

  it('EF00 / IAS / mixin / battery reporter route through the funnel', () => {
    assert.match(src('lib/tuya/TuyaEF00Manager.js'), /commitCapabilityCatch/);
    assert.match(src('lib/managers/IASZoneManager.js'), /commitCapabilityCatch\(device, 'alarm_motion'/);
    assert.match(src('lib/managers/IASZoneManager.js'), /commitCapabilityCatch\(device, 'alarm_contact'/);
    assert.match(src('lib/mixins/TuyaDeviceMixin.js'), /commitCapability\(this, 'onoff'/);
    assert.match(src('lib/utils/battery-reporting-manager.js'), /_writeBatteryPercent/);
    assert.doesNotMatch(src('lib/mixins/TuyaDeviceMixin.js'), /Setting default battery \(100%\)/);
    assert.doesNotMatch(src('lib/managers/IASZoneManager.js'), /Battery set to 15%/);
    assert.doesNotMatch(src('lib/utils/battery-reporting-manager.js'), /setCapabilityValue\('measure_battery'/);
    assert.doesNotMatch(src('lib/managers/IASZoneManager.js'), /setCapabilityValue\('alarm_/);
  });
});
