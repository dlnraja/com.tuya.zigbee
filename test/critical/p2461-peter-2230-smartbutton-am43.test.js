'use strict';

/**
 * P2461 — Peter #2230 / diag 048cff91 (follow-up to P2440)
 * - 4s cross-path window for SH-SC07 firmware retransmit ~3.4s
 * - button_wireless_1 compose-only flow candidates (no invent)
 * - battery: skip EF00 query + force UI when capability null
 * - MIAMO AM43: no ZCL windowCovering fallback / no tilt invent
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');

describe('P2461 Peter #2230 smartbutton + MIAMO AM43 harden', () => {
  it('mrpevh8p family uses 4s crossPathDedupMs', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes('P2461'), 'P2461 WHY present');
    const block = src.match(/'_TZ3000_mrpevh8p':\s*\{[\s\S]*?\n\s*\},/);
    assert.ok(block, 'mrpevh8p profile block');
    assert.ok(/crossPathDedupMs:\s*4000/.test(block[0]), 'crossPathDedupMs 4000');
    assert.ok(/debounceMs:\s*4000/.test(block[0]), 'debounceMs 4000');
  });

  it('button_wireless_1 heuristics do not invent short *_button_pressed', () => {
    const { buildPhysicalFlowCandidates } = require(path.join(ROOT, 'lib/flow/FlowCardHeuristics'));
    const c = buildPhysicalFlowCandidates('button_wireless_1', 1, 'single', {
      gangCount: 1,
      isButtonDevice: true,
    });
    assert.ok(c.some((id) => /button_1gang_button_pressed$/i.test(id)), '1gang compose id');
    assert.ok(!c.some((id) => /^button_wireless_1_button_pressed$/i.test(id)), 'no short invent');
    assert.ok(!c.some((id) => /^button_wireless_1_button_1_pressed$/i.test(id)), 'no button_1 invent');
  });

  it('ButtonDevice skips EF00 battery query for noEf00 profiles', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(src.includes('noEf00Battery'), 'noEf00Battery gate');
    assert.ok(src.includes('skipThrottle'), 'skipThrottle for UI ?');
    assert.ok(src.includes('tryOnce'), 'flow tryOnce dedupe');
    assert.ok(src.includes('bw1Strict'), 'button_wireless_1 strict legacy');
  });

  it('MFR-ENSURE soft-fills TS0041 for mrpevh8p when pid ABSENT', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/helpers/ManufacturerNameHelper.js'), 'utf8');
    assert.ok(/mrpevh8p[\s\S]*TS0041/.test(src), 'mrpevh8p → TS0041 soft-fill');
  });

  it('AM43 never invents tilt; ZCL cover fallback skipped', () => {
    const mvm = fs.readFileSync(path.join(ROOT, 'lib/ManufacturerVariationManager.js'), 'utf8');
    assert.ok(mvm.includes('am43_battery_tubular_ef00'), 'AM43 specialHandling');
    assert.ok(!/equalsCI\(manufacturerName, '_TZE200_icka1clh'\)[\s\S]{0,120}windowcoverings_tilt_set/.test(mvm),
      'no tilt invent on icka1clh');
    const cover = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedCoverBase.js'), 'utf8');
    assert.ok(/icka1clh\|zah67ekd/.test(cover), 'ZCL fallback skip list');
    const curtain = fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/device.js'), 'utf8');
    assert.ok(curtain.includes('P2461') || curtain.includes('_isPureTuyaDP = true'), 'force pure EF00');
  });

  it('wake skips powerConfiguration reporting for skipBatteryReporting (Z2M#8072)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    assert.ok(src.includes('skipBatteryReporting'), 'profile gate');
    assert.ok(/Z2M#8072|Z2M #8072/.test(src), 'Z2M#8072 citation');
  });

  it('DeviceOperatingMode labels mrpevh8p as ts0041 not ts0044', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/zigbee/DeviceOperatingMode.js'), 'utf8');
    assert.ok(/mrpevh8p[\s\S]{0,200}family:\s*'ts0041'/.test(src), 'family ts0041');
  });
});
