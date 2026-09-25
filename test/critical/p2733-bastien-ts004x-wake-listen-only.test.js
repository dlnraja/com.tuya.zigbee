'use strict';
/**
 * P2733 — Bastien Instagram + Zigbee tools: TS004x wake listen-only
 *
 * Contre quoi:
 *  1) ButtonDevice onEndDeviceAnnounce awaits multi-EP cluster.bind (TX err 40–59%)
 *  2) BaseUnifiedDevice scans all EPs for battery on snappy remotes
 *  3) PhysicalButtonMixin still schedules press-path battery for 1-btn snappy
 *  4) UBE TSN still 5000ms (felt like Bastien ~7s dead window)
 *
 * Couples: axpdxqgu+TS0041, dzwgk7e2+TS0042, vsxvaj9i+TS0043
 * Dual-app: BOTH (+ Bastien)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2733 Bastien TS004x wake listen-only', () => {
  it('ButtonDevice snappy wake skips mass await bind', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'devices', 'ButtonDevice.js'), 'utf8');
    assert.ok(src.includes('P2733'), 'must document P2733');
    assert.ok(/snappySleepy[\s\S]{0,200}listen-only/.test(src), 'snappy wake listen-only');
    assert.ok(!/if \(cluster\?\.bind\) \{await cluster\.bind\(\);\}/.test(src),
      'must not await cluster.bind on wake');
  });

  it('PhysicalButtonMixin snappy wake skips mass bind loop', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'mixins', 'PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes('P2733 snappy wake'), 'must document snappy wake early return');
    assert.ok(src.includes('snappyRelayFlow || profile.skipBatteryReporting || profile.noEf00Tx'),
      'press path must gate battery read on snappy');
  });

  it('BaseUnifiedDevice skips announce battery scan for snappy', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'devices', 'BaseUnifiedDevice.js'), 'utf8');
    assert.ok(src.includes('P2733 skip battery endpoint scan'), 'must skip batt scan');
    assert.ok(src.includes('P2733 skip scene-mode wake write'), 'must skip 0x8004 wake write');
  });

  it('UBE TSN window ≤400ms', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'mixins', 'UnifiedButtonEngine.js'), 'utf8');
    assert.ok(/TSN_WINDOW:\s*400/.test(src), 'UBE TSN must be 400');
  });

  it('sacred couples still snappy in DEVICE_PROFILES', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'mixins', 'PhysicalButtonMixin.js'), 'utf8');
    for (const mfr of ['_TZ3000_axpdxqgu', '_TZ3000_dzwgk7e2', '_TZ3000_vsxvaj9i']) {
      const idx = src.indexOf(`'${mfr}'`);
      assert.ok(idx > 0, `${mfr} profile missing`);
      const slice = src.slice(idx, idx + 900);
      assert.ok(slice.includes('snappyRelayFlow: true'), `${mfr} must be snappy`);
      assert.ok(slice.includes('skipBatteryReporting: true'), `${mfr} must skipBatt`);
    }
  });
});
