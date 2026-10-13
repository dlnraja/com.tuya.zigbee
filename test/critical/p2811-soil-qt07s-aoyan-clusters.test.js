'use strict';

/**
 * Contre quoi (#571 / #570): QT-07S `_TZE284_myd45weu`+TS0601 and AOYAN AY-303Z
 * stay on soil_sensor; interview clusters include groups/scenes (4,5) + EF00.
 * Never invent pid. Homey Unknown with FP present → tip+re-pair; clusters must not
 * force OnOff(6).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const compose = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'drivers', 'soil_sensor', 'driver.compose.json'), 'utf8'),
);

describe('P2811 soil QT-07S / AOYAN clusters + couples', () => {
  it('locks myd45weu + TS0601 and AOYAN + AY-303Z on soil_sensor', () => {
    const mfr = (compose.zigbee.manufacturerName || []).map(String);
    const pid = (compose.zigbee.productId || []).map(String);
    assert.ok(mfr.some((m) => /_tze284_myd45weu/i.test(m)));
    assert.ok(mfr.some((m) => /^aoyan$/i.test(m)));
    assert.ok(pid.some((p) => /^ts0601$/i.test(p)));
    assert.ok(pid.some((p) => /^ay-303z$/i.test(p)));
  });

  it('endpoint 1 clusters include 0,4,5,61184 and never OnOff 6', () => {
    const clusters = (compose.zigbee.endpoints?.['1']?.clusters || []).map(Number);
    for (const c of [0, 4, 5, 61184]) {
      assert.ok(clusters.includes(c), `missing cluster ${c}`);
    }
    assert.ok(!clusters.includes(6), 'must not force OnOff 6 (Unknown risk)');
  });
});
