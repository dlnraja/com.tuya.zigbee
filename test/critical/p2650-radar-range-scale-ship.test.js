'use strict';

/**
 * P2650 — TuyaRadarRangeScale must ship in Homey bundle (stable crash mail)
 *
 * Contre quoi (Homey crash 5.12.288 + 5.12.290 build #209/#211):
 * Error: Cannot find module '../../lib/tuya/TuyaRadarRangeScale'
 * at PresenceSensorRadarDevice._convertRadarSettingValue
 *
 * Soft-require alone is not enough — module + TuyaUnsignedValue must exist.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2650 TuyaRadarRangeScale ship + soft-require', () => {
  it('lib/tuya/TuyaRadarRangeScale.js + TuyaUnsignedValue.js exist and load', () => {
    const scalePath = path.join(ROOT, 'lib/tuya/TuyaRadarRangeScale.js');
    const uintPath = path.join(ROOT, 'lib/tuya/TuyaUnsignedValue.js');
    assert.ok(fs.existsSync(scalePath), 'TuyaRadarRangeScale.js must exist');
    assert.ok(fs.existsSync(uintPath), 'TuyaUnsignedValue.js must exist');
    const scale = require(scalePath);
    assert.equal(typeof scale.normalizeRadarRangeMeters, 'function');
    assert.equal(typeof scale.toRadarRangeTuyaValue, 'function');
    assert.equal(scale.normalizeRadarRangeMeters(600, { maxMeters: 12 }), 6);
    assert.equal(scale.normalizeRadarRangeMeters(60, { maxMeters: 12 }), 6);
  });

  it('presence_sensor_radar soft-requires scale (no hard crash on missing)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/device.js'),
      'utf8',
    );
    assert.ok(src.includes('TuyaRadarRangeScale'));
    assert.ok(/try\s*\{[\s\S]*TuyaRadarRangeScale[\s\S]*\}\s*catch/.test(src));
    assert.ok(src.includes('fallback divisor TX') || src.includes('missing/soft-fail'));
  });

  it('clrdrnya couple profile documents occupied + quantized (P2579)', () => {
    const md = fs.readFileSync(
      path.join(ROOT, 'docs/knowledge/profiles/couples/_TZE204_clrdrnya_TS0601.md'),
      'utf8',
    );
    assert.ok(md.includes('occupied'));
    assert.ok(md.includes('quantized') || md.includes('2.8'));
    assert.ok(md.includes('MTG075') || md.includes('MTG235'));
  });
});
