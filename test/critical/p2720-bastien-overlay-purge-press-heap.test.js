'use strict';
/**
 * P2720 — Bastien residual after P2718: tip ≤1.0.82 left live_data_overlay in
 * Homey settings; P2718 skip-only left it in RAM. Remotes still dead after
 * upgrade if BootBudget skips LiveDataUpdater (!allowHeavy after OOM).
 *
 * Contre quoi:
 *  1) Bastien skip must PURGE live_data_overlay / live_data_version
 *  2) Bastien app boot always starts LiveDataUpdater (purge path) even if !heavy
 *  3) ButtonDevice skipBatteryReporting returns before “reading battery” log
 *
 * Dual-app: BOTH (+ Bastien house). Latest diag: 27b0bd04 @ 1.0.82.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2720 Bastien overlay purge + press heap', () => {
  it('LiveDataUpdater Bastien path unsets leftover overlay', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'dynamic', 'LiveDataUpdater.js'), 'utf8');
    assert.ok(src.includes('P2720'), 'must document P2720');
    assert.ok(src.includes("unset('live_data_overlay')"), 'must unset overlay');
    assert.ok(src.includes("unset('live_data_version')"), 'must unset version');
    assert.ok(/\.bastien\b/i.test(src), 'Bastien id gate required');
  });

  it('LiveDataUpdater purge runs before return on Bastien', async () => {
    const LiveDataUpdater = require('../../lib/dynamic/LiveDataUpdater');
    const unsetKeys = [];
    const settings = {
      get(k) {
        if (k === 'live_data_overlay') return { version: 'junk', devices: { x: {} } };
        return null;
      },
      unset(k) { unsetKeys.push(k); },
      set() {},
    };
    const homey = {
      settings,
      manifest: { id: 'com.dlnraja.tuya.zigbee.bastien' },
      setTimeout: (fn) => { fn(); return 1; },
      setInterval: () => ({ unref() {} }),
    };
    const logs = [];
    const u = new LiveDataUpdater(homey, (...a) => logs.push(a.join(' ')));
    await u.start();
    assert.ok(unsetKeys.includes('live_data_overlay'), 'must purge overlay');
    assert.ok(unsetKeys.includes('live_data_version'), 'must purge version');
    assert.strictEqual(u._overlay, null, 'in-memory overlay cleared');
    assert.ok(logs.some((l) => /P2720|P2718/.test(l)), 'must log Bastien skip/purge');
  });

  it('ButtonDevice skipBatteryReporting before reading-battery log', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'devices', 'ButtonDevice.js'), 'utf8');
    assert.ok(src.includes('P2720'), 'must document P2720');
    const skipIdx = src.indexOf('WHY(P2720 Bastien 27b0bd04)');
    const logIdx = src.indexOf("Button pressed - reading battery");
    assert.ok(skipIdx > 0 && logIdx > skipIdx, 'P2720 skip block must precede reading-battery log');
  });
});
