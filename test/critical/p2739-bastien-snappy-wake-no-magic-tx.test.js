'use strict';
/**
 * P2739 — Bastien diag ed627371: snappy wake must not TX magic/DP/batt
 *
 * Contre quoi (user: "boutons reconnus mais rien ne fonctionne" @ 1.0.93):
 *  1) ButtonDevice snappy wake still force-sent TuyaMagicPacket + ZclBatteryMonitor
 *  2) PhysicalButtonMixin snappy wake still force magic packet
 *  3) AutoAdaptiveDevice._forceDeviceWakeUp DP/ZCL storm on button_wireless_*
 *
 * Couples: axpdxqgu+TS0041, dzwgk7e2+TS0042, vsxvaj9i+TS0043
 * Dual-app: BOTH (+ Bastien tip)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2739 Bastien snappy wake no magic/DP TX', () => {
  it('ButtonDevice snappy wake block has no magic packet / ZclBatteryMonitor', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'devices', 'ButtonDevice.js'), 'utf8');
    assert.ok(src.includes('P2739'), 'must document P2739');
    const start = src.indexOf('if (snappySleepy)');
    assert.ok(start > 0, 'snappySleepy block missing');
    const end = src.indexOf('return;', start);
    const block = src.slice(start, end + 8);
    assert.ok(block.includes('listen-only') || block.includes('P2733'), 'snappy listen-only');
    assert.ok(!/sendTuyaMagicPacket/.test(block), 'snappy wake must not send magic packet');
    assert.ok(!/ZclBatteryMonitor\.attach/.test(block), 'snappy wake must not attach ZclBatteryMonitor');
  });

  it('PhysicalButtonMixin snappy wake skips magic packet', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'mixins', 'PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes('P2739'), 'must document P2739');
    const start = src.indexOf('P2733 snappy wake');
    assert.ok(start > 0, 'P2733 snappy wake missing');
    const end = src.indexOf('return;', start);
    const block = src.slice(start, end + 8);
    assert.ok(!/sendTuyaMagicPacket/.test(block), 'snappy wake must not force magic packet');
    assert.ok(/_setupOnOffFdBoundCluster/.test(block), 'must still re-arm 0xFD');
  });

  it('AutoAdaptiveDevice skips force wake TX on snappy/noEf00 remotes', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'dynamic', 'AutoAdaptiveDevice.js'), 'utf8');
    assert.ok(src.includes('P2739'), 'must document P2739');
    assert.ok(/skipWakeTx[\s\S]{0,120}snappyRelayFlow/.test(src)
      || /P2739 skip force wake TX/.test(src),
      'must gate _forceDeviceWakeUp on snappy/noEf00');
  });
});
