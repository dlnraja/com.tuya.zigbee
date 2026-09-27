'use strict';

/**
 * P2755 — Bastien Battery Instabilities & Consumption Optimization + HiepSVG #550 Flicker & Leave Clear
 *
 * Verifies:
 * 1. smoothBatteryPercent handles EMA smoothing, anti-sag filtering, deadband jitter suppression,
 *    and detects fresh battery replacement (jumps >= 15%).
 * 2. shouldSkipSleepyRemoteBatteryTx detects sleepy remotes generically (TS0042, TS0043, button classes)
 *    and skips battery TX to preserve coin cells.
 * 3. ButtonDevice skips awake readAttributes when UI sample is fresh (<24h), and refuses to let
 *    voltage overwrite valid ZCL percentage.
 * 4. presence_sensor_radar refuses phantom capabilities (button.1, onoff, zone1-3) on ceiling radars (gkfbdvyx),
 *    and _commitPresenceAndFlows(false) clears BOTH alarm_human AND alarm_motion.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2755 Bastien Battery Stability + HiepSVG #550 Flicker & Clear', () => {

  const { smoothBatteryPercent } = require(path.join(ROOT, 'lib', 'battery', 'SmartBatteryAdaptivePrecision'));
  const { shouldSkipSleepyRemoteBatteryTx } = require(path.join(ROOT, 'lib', 'zigbee', 'PowerClusterPolicy'));

  it('smoothBatteryPercent applies deadband, EMA smoothing, anti-sag and replacement jump', () => {
    // 1. Initial sample
    assert.equal(smoothBatteryPercent(100, null), 100);

    // 2. Deadband (<= 2% change holds steady to eliminate UI jitter)
    assert.equal(smoothBatteryPercent(99, 100), 100);
    assert.equal(smoothBatteryPercent(98, 100), 100);

    // 3. EMA gradual discharge (e.g. from 100% down to 92%)
    const smoothedGradual = smoothBatteryPercent(92, 100);
    assert.ok(smoothedGradual < 100 && smoothedGradual > 92, `EMA should smooth between 100 and 92, got ${smoothedGradual}`);

    // 4. Anti-sag: momentary drop during button click TX (e.g. 90% drops to 65% on load)
    const sagResult = smoothBatteryPercent(65, 90, { isWakeSag: true });
    assert.ok(sagResult >= 85, `Wake sag drop must be heavily dampened, got ${sagResult}`);

    // 5. Fresh battery replacement (jump >= 15% accepted immediately)
    const replacement = smoothBatteryPercent(100, 30);
    assert.equal(replacement, 100, 'Fresh battery insertion must be accepted immediately');
  });

  it('shouldSkipSleepyRemoteBatteryTx generic detection protects sleepy buttons', () => {
    // TS0042 / TS0043 by pid
    assert.equal(shouldSkipSleepyRemoteBatteryTx({ productId: 'TS0042' }), true);
    assert.equal(shouldSkipSleepyRemoteBatteryTx({ productId: 'TS0043' }), true);

    // By device mock
    const fakeRemote = {
      driver: { manifest: { class: 'button' }, id: 'button_wireless_2' },
      getSetting: (k) => (k === 'zb_model_id' ? 'TS0042' : null),
      getData: () => ({ productId: 'TS0042' }),
    };
    assert.equal(shouldSkipSleepyRemoteBatteryTx({}, { device: fakeRemote }), true);

    // Mains device must not skip
    assert.equal(shouldSkipSleepyRemoteBatteryTx({ mainsPowered: true }), false);
  });

  it('ButtonDevice preserves battery with 24h freshness gate and blocks voltage overwrite', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'devices', 'ButtonDevice.js'), 'utf8');
    assert.ok(src.includes('P2755'), 'must document P2755 in ButtonDevice');
    assert.ok(src.includes('24 * 3600 * 1000'), 'must enforce 24h freshness check for sleepy remotes');
    assert.ok(src.includes('!profile?.skipBatteryReporting && !hasUi'), 'must prevent voltage from overwriting painted UI');
  });

  it('presence_sensor_radar guards phantom capabilities and clears both alarms on leave', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers', 'presence_sensor_radar', 'device.js'), 'utf8');
    assert.ok(src.includes('P2755 refused addCapability'), 'must refuse phantom capabilities on ceiling radars');
    assert.ok(src.includes("this.safeSetCapabilityValue('alarm_human', false)"), 'must clear alarm_human on leave');
    assert.ok(src.includes("this.safeSetCapabilityValue('alarm_motion', false)"), 'must clear alarm_motion on leave');
    assert.ok(src.includes('this._lastPresenceFlowEdge = true'), 'must properly set presence flow edge to true when present');
  });

});
