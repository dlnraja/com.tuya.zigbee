'use strict';
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const { reviewDiff, reviewCouples } = require('../../scripts/ci/autonomous-review.cjs');

function drv(id, mfr, pid) {
  return { id, class: 'sensor', zigbee: { manufacturerName: [mfr], productId: [pid] } };
}

describe('P3323 autonomous review duplicate order', () => {
  it('does not flag a historical duplicate when the touched driver loads first at base', () => {
    const a = drv('pir_sensor_2', '_TZ3000_mcxw5ehu', 'TS0202');
    const b = drv('sensor_motion_presence', '_TZ3000_mcxw5ehu', 'TS0202');
    const verdict = reviewDiff([b, a], [a, b], {});
    assert.strictEqual(verdict.ok, true, verdict.problems.join('\n'));
  });

  it('still flags a duplicate that the diff introduces', () => {
    const a = drv('pir_sensor_2', '_TZ3000_newdup', 'TS0202');
    const b = drv('sensor_motion_presence', '_TZ3000_other', 'TS0202');
    const b2 = drv('sensor_motion_presence', '_TZ3000_newdup', 'TS0202');
    const verdict = reviewDiff([b, a], [a, b2], {});
    assert.strictEqual(verdict.ok, false);
    assert.ok(verdict.problems.some((p) => p.includes('is in 2 drivers: pir_sensor_2, sensor_motion_presence')));
  });

  it('lists duplicate driver ids in sorted order', () => {
    const a = drv('zz_driver', '_TZ3000_x', 'TS0202');
    const b = drv('aa_driver', '_TZ3000_x', 'TS0202');
    const r = reviewCouples({ before: [a, b], after: [a, b], sources: {} });
    assert.ok(r.problems.includes('couple _tz3000_x|ts0202 is in 2 drivers: aa_driver, zz_driver'));
  });
});
