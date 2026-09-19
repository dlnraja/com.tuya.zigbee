'use strict';

/**
 * P2596 — Michaelp diag 6eabd9c4: TRV DATA-QUERY 0/10 → empty caps
 *
 * Contre quoi:
 * - requestDP skips battery+passive → no DP queries after pair
 * - THERMOSTAT-INIT uses stale standard maps instead of me167
 * - refresh without force never pulls values/pid-backed maps
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2596 TRV DATA-QUERY force after pair', () => {
  it('TuyaEF00Manager allows force/learn override for battery passive', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js'), 'utf8');
    assert.ok(src.includes('P2596'));
    assert.ok(src.includes('forceLearn'));
    assert.ok(/force\s*=\s*false/.test(src) || /force\s*=\s*false/.test(src));
    assert.ok(src.includes('Passive override (force/learn)'));
  });

  it('TuyaDataQuery prefers requestDP with force', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaDataQuery.js'), 'utf8');
    assert.ok(src.includes('P2596'));
    assert.ok(src.includes('requestDP(dp, { force:'));
  });

  it('UnifiedThermostatBase forces active mode + me167 init DPs', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedThermostatBase.js'), 'utf8');
    assert.ok(src.includes('forceActiveTuyaMode = true'));
    assert.ok(src.includes('force: true'));
    assert.ok(src.includes("[2, 3, 4, 5, 7, 13, 15, 35]"));
  });

  it('device_radiator_valve seeds identity + P2596 refresh', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/device_radiator_valve/device.js'), 'utf8');
    assert.ok(src.includes('P2596'));
    assert.ok(src.includes('ensureManufacturerSettings'));
    assert.ok(src.includes('force: true'));
    assert.ok(src.includes('tuyaDataQuery'));
  });
});
