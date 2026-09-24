'use strict';

/**
 * P2710 — Battery chemistry precision curves Contre quoi
 *
 * Contre quoi:
 * - linear (V-2.5)/0.5
 * - missing LiFePO4 / NiMH / Li-SOCl2 / Homey 1.5V_AA
 * - cr2032_curve algos falling through to "direct" on millivolt DP
 * - ZCL batteryVoltage 30 not becoming 3.0 V
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const Curves = require('../../lib/battery/BatteryChemistryCurves');
const UBH = require('../../lib/battery/UnifiedBatteryHandler');

describe('P2710 battery chemistry precision curves', () => {
  it('EXTRA_SPECS merges into UnifiedBatteryHandler.BATTERY_SPECS', () => {
    assert.ok(UBH.BATTERY_SPECS.LiFePO4?.curve?.length >= 8);
    assert.ok(UBH.BATTERY_SPECS.NiMH?.curve?.length >= 8);
    assert.ok(UBH.BATTERY_SPECS['Li-SOCl2']?.curve?.length >= 6);
    assert.ok(UBH.BATTERY_SPECS['1.5V_AA']?.curve?.length >= 8);
  });

  it('normalizeVoltagePrecise: Zigbee 100mV units + millivolts', () => {
    assert.equal(Curves.normalizeVoltagePrecise(30), 3.0);
    assert.equal(Curves.normalizeVoltagePrecise(3000), 3.0);
    assert.equal(Curves.normalizeVoltagePrecise(42), 4.2);
    assert.equal(Curves.normalizeVoltagePrecise(2.95), 2.95);
  });

  it('no linear voltage formula implementation', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/battery/BatteryChemistryCurves.js'), 'utf8');
    // Contre quoi: actual formula code — not the ban comment
    assert.doesNotMatch(src, /return\s*\(?\s*\(?voltage\s*-\s*2\.5\)/);
    assert.ok(src.includes('interpolateCurve'));
    assert.ok(src.includes('Banned'));
  });

  it('CR2032 / Li-ion / LiFePO4 / NiMH distinct SOC at same mid voltage family', () => {
    const cr = UBH.calculateFromVoltage(2.80, 'CR2032');
    const li = UBH.calculateFromVoltage(3.70, 'Li-ion');
    const lfp = UBH.calculateFromVoltage(3.30, 'LiFePO4');
    const nimh = UBH.calculateFromVoltage(1.25, 'NiMH');
    assert.ok(cr >= 50 && cr <= 75, `CR2032@2.8V got ${cr}`);
    assert.ok(li >= 45 && li <= 55, `Li-ion@3.7V got ${li}`);
    assert.ok(lfp >= 50 && lfp <= 70, `LiFePO4@3.3V got ${lfp}`);
    assert.ok(nimh >= 45 && nimh <= 65, `NiMH@1.25V got ${nimh}`);
  });

  it('calculateFromTuyaDP routes curve algorithms to voltage curves (not direct)', () => {
    // 2900 mV on CR2032 → ~85%
    const p = UBH.calculateFromTuyaDP(2900, 'cr2032_curve', { batteryType: 'CR2032' });
    assert.ok(p != null && p >= 70 && p <= 95, `cr2032_curve 2900mV got ${p}`);
    const alk = UBH.calculateFromTuyaDP(2800, 'alkaline_curve', { batteryType: '2xAAA' });
    assert.ok(alk != null && alk >= 60 && alk <= 85, `alkaline_curve 2.8V got ${alk}`);
  });

  it('estimateSocFromVoltage returns precise + rounded percent', () => {
    const est = Curves.estimateSocFromVoltage(3.30, 'LiFePO4', {
      specs: Curves.EXTRA_SPECS.LiFePO4,
    });
    assert.ok(est);
    assert.equal(est.voltageV, 3.3);
    assert.equal(est.chemistry, 'LiFePO4');
    assert.equal(est.chemistryClass, 'rechargeable');
    assert.ok(Number.isFinite(est.percentPrecise));
    assert.equal(est.percent, Math.round(est.percentPrecise));
  });

  it('npm check:p2710 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2710']);
  });
});
