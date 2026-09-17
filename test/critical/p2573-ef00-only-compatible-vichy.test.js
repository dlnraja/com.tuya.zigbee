'use strict';

/**
 * P2573 — EF00-only even with proprietary extras + VicHY reinforce
 *
 * Contre quoi:
 * - isEf00OnlyInterviewShape rejects Michaelp #2244 interview with 0xED00 (60672)
 * - compose still demands OnOff 6 while interview is EF00-compatible
 * - VicHY clrdrnya not marked pure Tuya DP / known EF00-only
 * - presence_sensor_radar compose gains OnOff or measure_battery again
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  TUYA_EF00_ONLY_CLUSTERS,
  isEf00OnlyCompatibleInterview,
  composeCompatibleWithEf00Interview,
  composeForbidsOnOffCluster,
  isKnownEf00OnlyManufacturer,
  forcePureTuyaDp,
} = require(path.join(ROOT, 'lib/zigbee/Ef00OnlyInterview.js'));

describe('P2573 EF00-only + VicHY reinforce', () => {
  it('Michaelp #2244 interview with 0xED00 is EF00-compatible', () => {
    const interview = [4, 5, 61184, 0, 60672];
    assert.ok(isEf00OnlyCompatibleInterview(interview));
    assert.ok(composeCompatibleWithEf00Interview(TUYA_EF00_ONLY_CLUSTERS, interview));
  });

  it('device_radiator_valve compose pairs against #2244 interview (no OnOff)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/device_radiator_valve/driver.compose.json'),
      'utf8',
    ));
    const clusters = compose.zigbee?.endpoints?.['1']?.clusters || [];
    assert.ok(composeForbidsOnOffCluster(clusters));
    assert.ok(composeCompatibleWithEf00Interview(clusters, [4, 5, 61184, 0, 60672]));
    const src = fs.readFileSync(path.join(ROOT, 'drivers/device_radiator_valve/device.js'), 'utf8');
    assert.ok(src.includes('forcePureTuyaDp'));
    assert.ok(/forcePureTuyaDp[\s\S]*await super\.onNodeInit/.test(src)
      || /forcePureTuyaDp\(this\);[\s\S]*super\.onNodeInit/.test(src),
    'forcePureTuyaDp must run before super.onNodeInit');
  });

  it('VicHY clrdrnya is known EF00-only + forcePureTuyaDp on radar', () => {
    assert.ok(isKnownEf00OnlyManufacturer('_TZE204_clrdrnya'));
    assert.ok(isKnownEf00OnlyManufacturer('_TZE284_ogx8u5z6'));
    const fake = {};
    assert.ok(forcePureTuyaDp(fake, { mfr: '_TZE204_clrdrnya' }));
    assert.strictEqual(fake._isPureTuyaDP, true);

    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'),
      'utf8',
    ));
    const clusters = compose.zigbee?.endpoints?.['1']?.clusters || [];
    assert.ok(composeForbidsOnOffCluster(clusters), `radar clusters: ${clusters}`);
    assert.ok(clusters.map(Number).includes(61184), 'radar must keep EF00');
    assert.ok(!compose.capabilities.includes('measure_battery'));
    assert.ok(!compose.energy?.batteries?.length);

    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/device.js'),
      'utf8',
    );
    assert.ok(src.includes('forcePureTuyaDp'), 'VicHY radar forcePureTuyaDp');
    assert.ok(src.includes('P2573') || src.includes('forcePureTuyaDp(this)'), 'P2573 marker path');
    assert.ok(src.includes('_scheduleRadarPhantomReheal'));
    assert.ok(src.includes('windowcoverings_set'));
  });

  it('lean radar [0,61184] stays compatible; OnOff poison is rejected', () => {
    assert.ok(isEf00OnlyCompatibleInterview([0, 61184]));
    assert.ok(composeCompatibleWithEf00Interview([0, 61184], [0, 61184]));
    assert.ok(!composeCompatibleWithEf00Interview([0, 6, 61184], [0, 61184]));
  });
});
