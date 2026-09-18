'use strict';

/**
 * P2579 — MTG075 / MTG235 (clrdrnya) deep research harden
 *
 * Contre quoi (Z2M MTG075-ZB-RL + #18677 + VicHY bathrooms):
 * - sensor_mode=occupied forces permanent presence (DP115)
 * - quantized target_distance never soft-clears
 * - duplicate onSettings dropped DP sync / DynCap heal
 * - missing healForcedOccupied / quantizedDistance flags on MTG config
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2579 MTG075/MTG235 deep harden', () => {
  it('MTG075 config: heal occupied + quantized soft-clear + anti-FP', () => {
    const { getSensorConfig } = require(path.join(ROOT, 'drivers/presence_sensor_radar/configs.js'));
    const cfg = getSensorConfig('_TZE204_clrdrnya', 'TS0601');
    assert.ok(cfg);
    assert.strictEqual(cfg.antiFalsePositive, true);
    assert.strictEqual(cfg.healForcedOccupiedOnSoftClear, true);
    assert.strictEqual(cfg.quantizedDistanceSoftClear, true);
    assert.ok(cfg.mtg24gMinDetectionRangeM >= 2.5);
    assert.ok(cfg.dpMap[115]?.setting === 'sensor_mode');
    assert.ok(cfg.dpMap[115]?.reverseEnumMap?.on === 0);
  });

  it('device.js heals occupied, quantized stagnant, merged onSettings', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/device.js'),
      'utf8',
    );
    assert.ok(src.includes('_healForcedOccupiedSensorMode'));
    assert.ok(src.includes('_isQuantizedDistanceStagnant'));
    assert.ok(src.includes('P2579 heal DP115 occupied'));
    assert.ok(src.includes('quantized distance stagnation'));
    assert.ok(src.includes('WHY(P2579): single onSettings'));
    // Contre quoi: two async onSettings methods (second overwrote first)
    const matches = src.match(/async onSettings\s*\(/g) || [];
    assert.strictEqual(matches.length, 1, 'exactly one onSettings');
  });

  it('compose warns occupied sensor mode; departure delay hint ≥15s', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'),
      'utf8',
    ));
    const settings = compose.settings || [];
    const mode = settings.find((s) => s.id === 'sensor_mode');
    assert.ok(mode);
    assert.ok(/permanent|force present|éviter|vermijden/i.test(JSON.stringify(mode)));
    const dep = settings.find((s) => s.id === 'departure_delay');
    assert.ok(dep?.hint);
    assert.ok(/15/.test(JSON.stringify(dep.hint)));

    // settings.compose must stay string units (Contre quoi: 0 [object Object])
    const slim = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.settings.compose.json'),
      'utf8',
    ));
    const slimDep = slim.find((s) => s.id === 'departure_delay');
    assert.ok(slimDep?.hint && /15/.test(JSON.stringify(slimDep.hint)));
    assert.strictEqual(typeof slimDep.units, 'string');
    const slimMode = slim.find((s) => s.id === 'sensor_mode');
    assert.ok(slimMode);
    assert.ok(/permanent|éviter|vermijden/i.test(JSON.stringify(slimMode)));
    const slimRange = slim.find((s) => s.id === 'detection_range');
    assert.strictEqual(typeof slimRange.units, 'string');
  });

  it('SensorConfigs + TuyaSensorDatabase mirror P2579 flags', () => {
    const sc = require('../../lib/data/SensorConfigs').MTG075_ZB_RL_RELAY;
    assert.strictEqual(sc.healForcedOccupiedOnSoftClear, true);
    assert.strictEqual(sc.quantizedDistanceSoftClear, true);
    const tuya = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaSensorDatabase.js'), 'utf8');
    assert.ok(tuya.includes('healForcedOccupiedOnSoftClear: true'));
    assert.ok(tuya.includes('quantizedDistanceSoftClear: true'));
  });

  it('couple profile documents MTG075/MTG235 known bugs', () => {
    const md = fs.readFileSync(
      path.join(ROOT, 'docs/knowledge/profiles/couples/_TZE204_clrdrnya_TS0601.md'),
      'utf8',
    );
    assert.ok(md.includes('occupied'));
    assert.ok(md.includes('quantized') || md.includes('2.8'));
    assert.ok(md.includes('MTG235') || md.includes('MTG075'));
  });
});
