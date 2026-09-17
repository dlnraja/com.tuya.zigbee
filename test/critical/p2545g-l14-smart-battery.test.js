'use strict';

/**
 * P2545g — Contre quoi: SmartBatteryManager must route through L14 safe writers
 * and must not invent 100% from alarm_battery alone (P115).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SBM = path.join(ROOT, 'lib', 'managers', 'SmartBatteryManager.js');
const GATE = path.join(ROOT, 'tools', 'ci', 'l14-capability-writers-gate.js');

describe('P2545g L14 SmartBatteryManager', () => {
  it('source includes async _safeSet( and safeSetCapabilityValue', () => {
    const src = fs.readFileSync(SBM, 'utf8');
    assert.ok(src.includes('async _safeSet('), 'missing async _safeSet(');
    assert.ok(src.includes('safeSetCapabilityValue'), 'missing safeSetCapabilityValue');
    assert.ok(!/setBatteryDirect\(100,\s*\{\s*source:\s*'smart-alarm-ok-estimate'/.test(src),
      'must not invent 100% from alarm-ok estimate');
  });

  it('P216 no blind /2 on Tuya battery hot paths', () => {
    for (const rel of [
      'lib/tuya/TuyaUnifiedParser.js',
      'lib/tuya/DataRecoveryManager.js',
      'lib/tuya/TuyaSyncManager.js',
    ]) {
      const s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.ok(s.includes('normalizeZclBatteryPercent'), rel + ' missing normalizeZclBatteryPercent');
      assert.ok(!/batteryPercentageRemaining\s*\/\s*2/.test(s), rel + ' still blind /2');
    }
  });

  it('l14-capability-writers-gate.js still locks SmartBatteryManager', () => {
    const gate = fs.readFileSync(GATE, 'utf8');
    assert.ok(gate.includes('SmartBatteryManager.js'));
    assert.ok(gate.includes('safeSetCapabilityValue'));
    assert.ok(gate.includes('async _safeSet('));
  });
});
