'use strict';

/**
 * P2715 — GH#550 HiepSVG residual (_TZE204_gkfbdvyx+TS0601)
 *
 * Contre quoi:
 * - DP4/101 forwarded to SmartBattery → invent measure_battery=7% after Repair
 * - P2713 blanket DP103 skip killed ceiling lux before dpMap seed
 * - Blind DP9 ÷10 turns cm frames into absurd meters
 * - Bogus sensitivity 0 (Z2M#12069) collapses Homey settings / range
 *
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MGR = path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js');
const DEVICE = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');
const CONFIGS = path.join(ROOT, 'drivers/presence_sensor_radar/configs.js');
const SCALE = path.join(ROOT, 'lib/tuya/TuyaRadarRangeScale.js');

describe('P2715 HiepSVG #550 gkfbdvyx lux/distance/battery', () => {
  it('EF00 never forwards radar DP4/10/14/15/101 to battery manager', () => {
    const src = fs.readFileSync(MGR, 'utf8');
    assert.ok(src.includes('_isPresenceRadarBatteryForbiddenDp'));
    assert.ok(src.includes('P2715'));
    assert.match(src, /batteryDPs\.includes\(dp\) && !this\._isPresenceRadarBatteryForbiddenDp\(dp\)/);
    assert.ok(src.includes('gkfbdvyx'));
  });

  it('ceiling config: DP9 dual-scale + DP103 lux + settings wire', () => {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const mod = require(CONFIGS);
    const c = (mod.SENSOR_CONFIGS || mod).ZY_M100_CEILING_24G
      || Object.values(mod.SENSOR_CONFIGS || mod).find((x) => x && x.configName === 'ZY_M100_CEILING_24G');
    assert.ok(c);
    assert.equal(c.dpMap[9].radarDistanceScale, true);
    assert.equal(c.dpMap[9].preferDivisor, 10);
    assert.equal(c.dpMap[103].cap, 'measure_luminance');
    assert.equal(c.dpMap[4].setting, 'detection_range');
    assert.ok(c.sensors.some((s) => /gkfbdvyx/i.test(String(s))));
  });

  it('normalizeRadarTargetDistanceMeters: dm + cm dual-scale', () => {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const { normalizeRadarTargetDistanceMeters } = require(SCALE);
    assert.equal(normalizeRadarTargetDistanceMeters(31, { maxMeters: 9 }), 3.1);
    assert.equal(normalizeRadarTargetDistanceMeters(300, { maxMeters: 9 }), 3);
    assert.equal(normalizeRadarTargetDistanceMeters(0), 0);
    assert.equal(normalizeRadarTargetDistanceMeters(2.7, { maxMeters: 9 }), 2.7);
  });

  it('device drops bogus sensitivity 0 + faster lux-cold', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('P2715 drop bogus sensitivity 0'));
    assert.ok(src.includes('radarDistanceScale'));
    assert.match(src, /> 45_000/);
  });

  it('npm check:p2715 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2715']);
  });
});
