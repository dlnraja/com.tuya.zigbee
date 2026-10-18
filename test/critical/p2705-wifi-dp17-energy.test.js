'use strict';
/**
 * P2705 — DP17 energy auto-detection (incremental Wh vs cumulative), no-drop migration.
 * Sources: make-all/tuya-local plug yaml (DP17 Wh, measurement), forum 154077 #385/#419.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { feed, emptyState } = require('../../lib/energy/WifiDp17Energy');

const MIN = 60000;

describe('P2705 DP17 energy', () => {
  it('incremental: detected from power×time, accumulates from the existing meter, never drops', () => {
    const st = emptyState();
    const meter = 123.456; // existing paired plug value
    let t = 0; let out = null;
    // 600 W, report every 10 min → 100 Wh per report, with occasional smaller values
    const raws = [100, 98, 101, 40, 100];
    const results = [];
    for (const raw of raws) {
      t += 10 * MIN;
      out = feed(st, { raw, t, powerW: 600, currentMeter: meter, legacyKwh: raw / 100 });
      results.push(out);
    }
    assert.equal(st.detected, 'incremental');
    const written = results.filter((r) => r.kwh != null).map((r) => r.kwh);
    assert.ok(written.length >= 1);
    for (const k of written) assert.ok(k >= meter, 'never below existing meter');
    const total = raws.reduce((a, r) => a + r, 0) / 1000;
    assert.ok(Math.abs(written.at(-1) - (meter + total)) < 1e-9, 'all reported Wh counted once');
    for (let i = 1; i < written.length; i++) assert.ok(written[i] >= written[i - 1]);
  });

  it('cumulative: detected from Δraw ≈ power×time, keeps legacy value, absorbs a reset', () => {
    const st = emptyState();
    let t = 0; let raw = 50000; let last = null;
    for (let i = 0; i < 5; i++) {
      t += 10 * MIN; raw += 100; // 600 W × 10 min = 100 Wh
      const r = feed(st, { raw, t, powerW: 600, currentMeter: 500, legacyKwh: raw / 100 });
      if (r.kwh != null) last = r.kwh;
    }
    assert.equal(st.detected, 'cumulative');
    assert.equal(last, 505); // legacy value unchanged (50500/100)
    const r = feed(st, { raw: 10, t: t + MIN, powerW: 600, currentMeter: last, legacyKwh: 0.1 });
    assert.ok(r.kwh >= last, 'device reset never drops the counter');
  });

  it('no-drop migration: while undecided the meter is left untouched', () => {
    const st = emptyState();
    const r = feed(st, { raw: 3, t: 1, powerW: null, currentMeter: 900, legacyKwh: 0.03 });
    assert.equal(r.kwh, null);
  });

  it('override incremental starts from current meter immediately', () => {
    const st = emptyState();
    const r1 = feed(st, { raw: 250, t: 1, currentMeter: 10, override: 'incremental' });
    assert.equal(r1.kwh, 10.25);
    const r2 = feed(st, { raw: 750, t: 2, currentMeter: 10.25, override: 'incremental' });
    assert.equal(r2.kwh, 11);
  });

  it('without power data: falls back to monotonicity after enough samples', () => {
    const st = emptyState();
    const vals = [5, 0, 3, 0, 2, 4];
    for (const [i, raw] of vals.entries()) feed(st, { raw, t: i * MIN, currentMeter: 1, legacyKwh: raw / 100 });
    assert.equal(st.detected, 'incremental');
  });

  it('wifi_plug / wifi_power_strip route DP17 to the handler, not smartDivisor', () => {
    const fs = require('fs'); const path = require('path');
    for (const d of ['wifi_plug', 'wifi_power_strip']) {
      const src = fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', d, 'device.js'), 'utf8');
      assert.match(src, /'17': \{ capability: null \}/);
      assert.match(src, /handleDp17\(this, dps\)/);
      const comp = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', d, 'driver.compose.json'), 'utf8'));
      assert.ok(comp.settings.some((s) => s.id === 'dp17_energy_mode' && s.value === 'auto'));
    }
  });
});
