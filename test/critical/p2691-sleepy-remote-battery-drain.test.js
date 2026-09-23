'use strict';

/**
 * P2691 — Bastien pile drain (diag 885a9901 on tip 1.0.60)
 * Contre quoi: every press → powerCfg EP1+EP2 Timeout + EF00 DP storm on TS0042.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2691 sleepy remote battery drain class skip', () => {
  it('shouldSkipSleepyRemoteBatteryTx covers sceneSwitch + TS004x', () => {
    const { shouldSkipSleepyRemoteBatteryTx } = require('../../lib/zigbee/PowerClusterPolicy');
    assert.strictEqual(shouldSkipSleepyRemoteBatteryTx({ sceneSwitch: true }), true);
    assert.strictEqual(shouldSkipSleepyRemoteBatteryTx({ productId: 'TS0042' }), true);
    assert.strictEqual(shouldSkipSleepyRemoteBatteryTx({ productId: 'TS0043' }), true);
    assert.strictEqual(shouldSkipSleepyRemoteBatteryTx({ skipBatteryReporting: true }), true);
    assert.strictEqual(shouldSkipSleepyRemoteBatteryTx({ noEf00Tx: true }), true);
    assert.strictEqual(shouldSkipSleepyRemoteBatteryTx({ mainsPowered: true, sceneSwitch: true }), false);
    assert.strictEqual(shouldSkipSleepyRemoteBatteryTx({ productId: 'TS0601' }), false);
  });

  it('button_wireless_2 forces skipBatteryReporting', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_2/device.js'), 'utf8');
    assert.match(src, /skipBatteryReporting:\s*true/);
    assert.match(src, /batteryEpOnly:\s*1/);
    assert.match(src, /P2691/);
  });

  it('ButtonDevice uses shouldSkipSleepyRemoteBatteryTx', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.match(src, /shouldSkipSleepyRemoteBatteryTx/);
    assert.match(src, /P2691/);
  });

  it('famkxci2 profile skips battery TX', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.match(src, /'_TZ3000_famkxci2'\s*:\s*\{[\s\S]*?skipBatteryReporting:\s*true/);
  });

  it('ts004RemoteFallback seals skipBatteryReporting', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.match(src, /ts004RemoteFallback[\s\S]*?skipBatteryReporting:\s*true/);
  });
});
