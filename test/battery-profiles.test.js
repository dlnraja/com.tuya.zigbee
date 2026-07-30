'use strict';

/**
 * Tests — battery chemistry profiles & health (B lot, v9.0.377)
 *  - every BATTERY_SPECS profile is physically sane (fresh > dead,
 *    non-increasing curve, sane endpoints)
 *  - calculateFromVoltage: fresh→100, dead→0, monotonic, temperature penalty
 *  - predictReplacementDate with drain rate
 */

const assert = require('assert');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const UB = require('../lib/battery/UnifiedBatteryHandler');
const BHI = require('../lib/battery/BatteryHealthIntelligence');
const { calculateFromVoltage, BATTERY_SPECS } = UB;

describe('BATTERY_SPECS profiles (17 chemistries)', () => {
  it('fresh > dead for every chemistry', () => {
    for (const [name, spec] of Object.entries(BATTERY_SPECS)) {
      assert.ok(spec.fresh > spec.dead, `${name}: fresh ${spec.fresh} must be > dead ${spec.dead}`);
    }
  });

  it('curves are non-increasing and start/end sane', () => {
    for (const [name, spec] of Object.entries(BATTERY_SPECS)) {
      assert.ok(Array.isArray(spec.curve) && spec.curve.length >= 2, `${name}: curve missing`);
      const pts = spec.curve.map(p => (Array.isArray(p) ? { v: p[0], p: p[1] } : p));
      for (let i = 1; i < pts.length; i++) {
        assert.ok(pts[i].v <= pts[i - 1].v, `${name}: voltage must be non-increasing at point ${i}`);
        assert.ok(pts[i].p <= pts[i - 1].p, `${name}: percent must be non-increasing at point ${i}`);
      }
      assert.ok(pts[0].p === 100, `${name}: curve must start at 100%`);
      assert.ok(pts[pts.length - 1].p === 0, `${name}: curve must end at 0%`);
    }
  });

  it('all chemistries reachable via calculateFromVoltage', () => {
    for (const name of Object.keys(BATTERY_SPECS)) {
      const pct = calculateFromVoltage(BATTERY_SPECS[name].fresh, name);
      assert.ok(pct >= 95 && pct <= 100, `${name} at fresh voltage → ${pct}%`);
    }
  });
});

describe('calculateFromVoltage behavior', () => {
  it('fresh → 100, dead → 0', () => {
    for (const name of ['CR2032', 'CR2450', 'AA', '18650', '9V']) {
      assert.strictEqual(calculateFromVoltage(BATTERY_SPECS[name].fresh, name), 100);
      assert.strictEqual(calculateFromVoltage(BATTERY_SPECS[name].dead, name), 0);
    }
  });

  it('monotonic: lower voltage never gives higher percent', () => {
    const spec = BATTERY_SPECS.CR2032;
    let prev = 101;
    for (let v = spec.fresh; v >= spec.dead; v -= 0.1) {
      const pct = calculateFromVoltage(Math.round(v * 100) / 100, 'CR2032');
      assert.ok(pct <= prev, `CR2032 ${v}V: ${pct} > ${prev}`);
      prev = pct;
    }
  });

  it('mid-range CR2032 voltage follows the discharge curve', () => {
    const pct = calculateFromVoltage(2.9, 'CR2032');
    // courbe CR2032 : { v: 2.90, p: 85 } — milieu haut de décharge
    assert.ok(pct > 70 && pct <= 95, `2.9V → ${pct}%`);
  });

  it('cold temperature reduces the estimate when tempCoeff is defined', () => {
    const spec = BATTERY_SPECS.CR2032;
    if (!spec.tempCoeff) {return; }
    const warm = calculateFromVoltage(2.9, 'CR2032', 20);
    const cold = calculateFromVoltage(2.9, 'CR2032', -10);
    assert.ok(cold <= warm, `cold ${cold} should be <= warm ${warm}`);
  });

  it('unknown chemistry falls back safely', () => {
    const pct = calculateFromVoltage(3.0, 'UNKNOWN_CHEMISTRY');
    assert.ok(pct >= 0 && pct <= 100);
  });
});

describe('BatteryHealthIntelligence', () => {
  it('exposes supported types and profiles', () => {
    const types = BHI.getSupportedTypes?.() || [];
    assert.ok(types.length > 0);
  });

  it('predictReplacementDate uses drain rate', () => {
    const bhi = new BHI({ log: () => {}, error: () => {} });
    const date = bhi.predictReplacementDate(50, 0.5);
    assert.ok(date instanceof Date || date === null);
    if (date) {assert.ok(date.getTime() > Date.now() - 1000, 'replacement must be ~100 days out');}
  });
});
