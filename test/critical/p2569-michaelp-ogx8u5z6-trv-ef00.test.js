'use strict';

/**
 * P2569 — Michaelp #2244 forum: ZG253 TRV `_TZE284_ogx8u5z6`+TS0601 paired Unknown
 *
 * Contre quoi:
 * - device_radiator_valve compose requires OnOff(6) (interview is EF00-only)
 * - ogx8u5z6 missing from compose / sacred-keep
 * - me167 cal ÷10 path regresses
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  TUYA_EF00_ONLY_CLUSTERS,
  composeForbidsOnOffCluster,
  composeCompatibleWithEf00Interview,
  isEf00OnlyCompatibleInterview,
  isKnownEf00OnlyManufacturer,
} = require(path.join(ROOT, 'lib/zigbee/Ef00OnlyInterview.js'));

describe('P2569 Michaelp ogx8u5z6 TRV EF00 pair', () => {
  it('device_radiator_valve compose matches EF00 interview (no OnOff 6)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/device_radiator_valve/driver.compose.json'),
      'utf8',
    ));
    const clusters = compose.zigbee?.endpoints?.['1']?.clusters || [];
    assert.ok(composeForbidsOnOffCluster(clusters), `clusters still have OnOff: ${clusters}`);
    for (const need of TUYA_EF00_ONLY_CLUSTERS) {
      assert.ok(clusters.map(Number).includes(need), `missing cluster ${need}`);
    }
    const mfrs = compose.zigbee?.manufacturerName || [];
    assert.ok(mfrs.some((m) => /_TZE284_ogx8u5z6/i.test(m)));
    assert.ok(mfrs.some((m) => /_TZE204_ogx8u5z6/i.test(m)));
    assert.ok((compose.zigbee?.productId || []).includes('TS0601'));
  });

  it('ogx8u5z6 is known EF00-only + me167 cal ÷10', () => {
    assert.ok(isKnownEf00OnlyManufacturer('_TZE284_ogx8u5z6'));
    const src = fs.readFileSync(path.join(ROOT, 'drivers/device_radiator_valve/device.js'), 'utf8');
    assert.ok(src.includes('ogx8u5z6'));
    assert.ok(src.includes('calDivisor = /ogx8u5z6/i.test(mfr) ? 10 : 1'));
  });

  it('sacred-keep pins ogx8u5z6+TS0601 → device_radiator_valve', () => {
    const keep = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'),
      'utf8',
    ));
    const hit = (keep.couples || []).find(
      (c) => /ogx8u5z6/i.test(c.mfr) && c.pid === 'TS0601' && c.driverId === 'device_radiator_valve',
    );
    assert.ok(hit, 'missing sacred-keep for ogx8u5z6');
  });

  it('Michaelp interview shape is EF00-compatible (no OnOff)', () => {
    // Live #2244 interview clusters (± proprietary 0xED00)
    const interview = [4, 5, 61184, 0, 60672];
    assert.ok(!interview.includes(6));
    for (const need of TUYA_EF00_ONLY_CLUSTERS) {
      assert.ok(interview.includes(need), `interview missing ${need}`);
    }
    assert.ok(isEf00OnlyCompatibleInterview(interview));
    assert.ok(composeCompatibleWithEf00Interview(TUYA_EF00_ONLY_CLUSTERS, interview));
  });
});
