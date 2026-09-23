'use strict';

/**
 * P2689 — Smart Battery Adaptive Precision
 * Contre quoi:
 *  - fixed 2%/5min throttle hides low-SOC 1% drops
 *  - fixed poll / minChange drains coin cells or floods mesh
 *  - proactive poll on button chemistry
 *  - linear (V-2.5)/0.5 invent
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  chemistryClass,
  resolveSocBand,
  buildAdaptiveReportingConfig,
  resolvePollIntervalMs,
  shouldAcceptBatterySample,
  fusePercentAndVoltage,
  shouldPiggybackBatteryRead,
} = require('../../lib/battery/SmartBatteryAdaptivePrecision');

describe('P2689 smart battery adaptive precision', () => {
  it('chemistry classes map coin vs rechargeable', () => {
    assert.strictEqual(chemistryClass('CR2032'), 'coin');
    assert.strictEqual(chemistryClass('CR2450'), 'coin');
    assert.strictEqual(chemistryClass('Li-ion'), 'rechargeable');
    assert.strictEqual(chemistryClass('2xAA'), 'alkaline');
  });

  it('SOC bands tighten minChange when low/critical', () => {
    assert.strictEqual(resolveSocBand(10).id, 'critical');
    assert.strictEqual(resolveSocBand(10).minChange, 1);
    assert.strictEqual(resolveSocBand(25).id, 'low');
    assert.strictEqual(resolveSocBand(50).minChange, 2);
    assert.strictEqual(resolveSocBand(95).minChange, 5);
  });

  it('reporting config is finer at low SOC and parks mains', () => {
    const low = buildAdaptiveReportingConfig({ chemistry: 'CR2032', percent: 12 });
    assert.strictEqual(low.minChange, 1);
    assert.ok(low.minInterval >= 1800);
    const high = buildAdaptiveReportingConfig({ chemistry: 'CR2032', percent: 90 });
    assert.strictEqual(high.minChange, 5);
    const mains = buildAdaptiveReportingConfig({ chemistry: 'MAINS', mains: true });
    assert.strictEqual(mains.minChange, 65534);
  });

  it('poll interval null for button coin; scales with SOC otherwise', () => {
    assert.strictEqual(resolvePollIntervalMs({
      chemistry: 'CR2032', deviceClass: 'button', baseIntervalSec: 14400,
    }), null);
    const mid = resolvePollIntervalMs({
      chemistry: '2xAA', percent: 50, baseIntervalSec: 14400, deviceClass: 'sensor_climate',
    });
    const crit = resolvePollIntervalMs({
      chemistry: '2xAA', percent: 10, baseIntervalSec: 14400, deviceClass: 'sensor_climate',
    });
    assert.ok(mid > 0 && crit > 0);
    assert.ok(crit < mid, 'critical polls more often than mid');
  });

  it('shouldAcceptBatterySample allows 1% at critical within short window', () => {
    const now = Date.now();
    const low = shouldAcceptBatterySample({
      prev: 12, next: 11, lastTs: now - 90 * 1000, now,
    });
    assert.strictEqual(low.accept, true);
    assert.strictEqual(low.band, 'critical');

    const high = shouldAcceptBatterySample({
      prev: 90, next: 89, lastTs: now - 90 * 1000, now,
    });
    assert.strictEqual(high.accept, false);
    assert.strictEqual(high.reason, 'throttled');
  });

  it('fuse prefers voltage when ZCL stuck at 100 on coin', () => {
    const f = fusePercentAndVoltage({
      zclPercent: 100,
      voltagePercent: 72,
      chemistry: 'CR2032',
      preferVoltageOnFlatZcl: true,
    });
    assert.strictEqual(f.percent, 72);
    assert.match(f.source, /voltage/);
  });

  it('piggyback skipped when fresh; required when stale', () => {
    assert.strictEqual(shouldPiggybackBatteryRead({
      lastTs: Date.now() - 60 * 1000,
      percent: 80,
    }), false);
    assert.strictEqual(shouldPiggybackBatteryRead({
      lastTs: Date.now() - 25 * 60 * 60 * 1000,
      percent: 80,
    }), true);
    assert.strictEqual(shouldPiggybackBatteryRead({
      skipBatteryReporting: true,
      lastTs: 0,
    }), false);
  });

  it('runtime wires AdaptivePrecision into handler / reporting / button', () => {
    const ubh = fs.readFileSync(path.join(ROOT, 'lib/battery/UnifiedBatteryHandler.js'), 'utf8');
    assert.match(ubh, /SmartBatteryAdaptivePrecision/);
    assert.match(ubh, /P2689/);
    const brm = fs.readFileSync(path.join(ROOT, 'lib/utils/battery-reporting-manager.js'), 'utf8');
    assert.match(brm, /buildAdaptiveReportingConfig/);
    const btn = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.match(btn, /shouldPiggybackBatteryRead/);
    const policy = fs.readFileSync(path.join(ROOT, 'lib/zigbee/PowerClusterPolicy.js'), 'utf8');
    assert.match(policy, /getAdaptivePowerCfgReporting/);
    const ssot = fs.readFileSync(path.join(ROOT, 'docs/architecture/BATTERY_SSOT.md'), 'utf8');
    assert.match(ssot, /P2689/);
  });

  it('machine SSOT + three-app tip map exist', () => {
    const ssotPath = path.join(ROOT, 'config/architecture/battery-adaptive-precision-ssot.json');
    assert.ok(fs.existsSync(ssotPath));
    const ssot = JSON.parse(fs.readFileSync(ssotPath, 'utf8'));
    assert.strictEqual(ssot._meta.classify, 'BOTH');
    assert.strictEqual(ssot.tipsMin.universal, '9.0.1195');
    assert.strictEqual(ssot.tipsMin.bastien, '1.0.66');
    assert.strictEqual(ssot.tipsMin.stable, '5.12.308');
    const tips = fs.readFileSync(path.join(ROOT, 'docs/architecture/THREE_APP_RECENT_TIPS.md'), 'utf8');
    assert.match(tips, /P2689/);
    assert.match(tips, /5\.12\.308/);
  });
});
