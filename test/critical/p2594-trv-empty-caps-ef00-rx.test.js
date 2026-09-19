'use strict';

/**
 * P2594 — Michaelp #2253: TRV empty/null capabilities (RX path)
 *
 * Contre quoi:
 * - UnifiedThermostatBase skips TuyaZigbeeDevice super.onNodeInit → no EF00 manager
 * - `_setupTuyaDPMode` was a no-op when `tuyaEF00Manager` missing → all caps stay null
 * - ManufacturerVariationManager wiped me167/ogx8u5z6 driver DP maps
 * - smart TRV dpProfile always returned me167 (self-includesCI bug) or missed ogx8u5z6
 *
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const THERMO = path.join(ROOT, 'lib/devices/UnifiedThermostatBase.js');
const DEVICE = path.join(ROOT, 'drivers/device_radiator_valve/device.js');
const SMART = path.join(ROOT, 'drivers/device_radiator_valve_smart/device.js');

describe('P2594 TRV empty caps — EF00 RX attach', () => {
  it('UnifiedThermostatBase soft-creates EF00 manager like Cover (attachPrimary+launchOnce)', () => {
    const src = fs.readFileSync(THERMO, 'utf8');
    assert.ok(src.includes('P2594'));
    assert.ok(src.includes('attachPrimary'));
    assert.ok(src.includes('launchOnce'));
    assert.ok(src.includes('_thermoEf00DpHooked'));
    assert.ok(/async\s+_setupTuyaDPMode\s*\(/.test(src));
    // Contre quoi: never leave setup as empty if-manager-only hook
    assert.ok(!/^\s*_setupTuyaDPMode\(\)\s*\{\s*if\s*\(this\.tuyaEF00Manager\)\s*\{/m.test(src));
  });

  it('me167/ogx8u5z6 driver maps win over ManufacturerVariation wipe', () => {
    const src = fs.readFileSync(THERMO, 'utf8');
    assert.ok(src.includes('ogx8u5z6'));
    assert.ok(src.includes('me167/driver DP maps win'));
    assert.ok(/_dynamicDpMappings\s*=\s*\{\s*\.\.\.config\.dpMappings\s*,\s*\.\.\.driverMaps\s*\}/.test(src));
  });

  it('device_radiator_valve re-locks me167 maps and re-arms EF00 after identity', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('P2594'));
    assert.ok(src.includes('me167 DP maps re-locked'));
    assert.ok(src.includes('_setupTuyaDPMode'));
    assert.ok(src.includes('ogx8u5z6'));
    assert.ok(/13:\s*\{\s*capability:\s*'measure_battery'/.test(src));
  });

  it('device_radiator_valve_smart uses tail match + ogx8u5z6 (not self-includesCI)', () => {
    const src = fs.readFileSync(SMART, 'utf8');
    assert.ok(src.includes('ogx8u5z6'));
    assert.ok(src.includes('me167Tails'));
    assert.ok(src.includes('forcePureTuyaDp'));
    assert.ok(src.includes('_scheduleTrvDpRefresh'));
    assert.ok(!/me167Ids\.some\(id\s*=>\s*includesCI\(me167Ids/.test(src));
  });
});
