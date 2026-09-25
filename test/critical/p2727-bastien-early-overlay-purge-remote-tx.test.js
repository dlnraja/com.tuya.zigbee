'use strict';
/**
 * P2727 — Bastien tip-lag heal (Homey stuck ≤1.0.93 while Athom tip ≥1.0.98).
 * Contre quoi:
 *  1) app.js must call _purgeBastienHeapSettingsEarly at onInit start (sync)
 *  2) purge unsets live_data_overlay before deferred LiveDataUpdater
 *  3) bastien_skip_battery_tx forces shouldSkipSleepyRemoteBatteryTx
 *
 * Dual-app: Bastien house (+ BOTH PowerClusterPolicy gate safe on Universal).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2727 Bastien early overlay purge + remote TX gate', () => {
  it('app.js onInit calls early purge before deferred heavy features', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.ok(src.includes('P2727'), 'must document P2727');
    assert.ok(src.includes('_purgeBastienHeapSettingsEarly'), 'must define early purge');
    const onInitIdx = src.indexOf('async onInit()');
    const purgeCallIdx = src.indexOf('this._purgeBastienHeapSettingsEarly()');
    const scheduleIdx = src.indexOf('_scheduleDeferredMasterFeatures()');
    assert.ok(onInitIdx > 0 && purgeCallIdx > onInitIdx, 'purge call inside onInit');
    assert.ok(scheduleIdx > purgeCallIdx, 'early purge before deferred schedule');
    assert.ok(src.includes("unset(key)") || src.includes("settings.unset"), 'must unset settings');
    assert.ok(src.includes("bastien_skip_battery_tx"), 'must set boot TX skip marker');
    // Contre quoi duplicate method bodies (syntax / last-wins confusion)
    const defs = src.match(/_purgeBastienHeapSettingsEarly\s*\(/g) || [];
    assert.ok(defs.length >= 2, 'definition + call');
    assert.strictEqual(
      (src.match(/Contre quoi: tip-lag Homey stays/g) || []).length,
      1,
      'exactly one method body (no duplicate)',
    );
  });

  it('PowerClusterPolicy respects bastien_skip_battery_tx without profile', () => {
    const { shouldSkipSleepyRemoteBatteryTx } = require('../../lib/zigbee/PowerClusterPolicy');
    const homey = {
      settings: {
        get(k) { return k === 'bastien_skip_battery_tx' ? true : null; },
      },
    };
    assert.strictEqual(
      shouldSkipSleepyRemoteBatteryTx(null, { homey }),
      true,
      'null profile + Bastien gate → skip TX',
    );
    assert.strictEqual(
      shouldSkipSleepyRemoteBatteryTx({ mainsPowered: true }, { homey }),
      false,
      'mains never skipped by Bastien gate',
    );
    assert.strictEqual(
      shouldSkipSleepyRemoteBatteryTx({ productId: 'TS0041' }, { homey: { settings: { get: () => false } } }),
      true,
      'TS0041 still skipped via productId',
    );
  });

  it('ButtonDevice + PhysicalButtonMixin pass homey into skip helper', () => {
    const btn = fs.readFileSync(path.join(ROOT, 'lib', 'devices', 'ButtonDevice.js'), 'utf8');
    const phys = fs.readFileSync(path.join(ROOT, 'lib', 'mixins', 'PhysicalButtonMixin.js'), 'utf8');
    assert.ok(/shouldSkipSleepyRemoteBatteryTx\(profile,\s*\{\s*homey:\s*this\.homey\s*\}\)/.test(btn), 'ButtonDevice P2727 homey arg');
    assert.ok(/shouldSkipSleepyRemoteBatteryTx\(profile,\s*\{\s*homey:\s*this\.homey\s*\}\)/.test(phys), 'PhysicalButtonMixin P2727 homey arg');
  });
});
