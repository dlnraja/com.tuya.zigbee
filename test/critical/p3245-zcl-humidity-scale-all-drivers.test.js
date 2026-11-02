'use strict';
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const fs = require('fs');
const path = require('path');
const { scaleZclHumidity } = require('../../lib/helpers/ZclHumidityScale');

describe('P3245 GH#581 ZCL humidity x10 quirk on every driver', () => {
  it('yupc0pb7 raw 427 -> 42.7 %, standard 4270 -> 42.7 %', () => {
    assert.strictEqual(scaleZclHumidity(427, '_TZ3000_yupc0pb7'), 42.7);
    assert.strictEqual(scaleZclHumidity(4270, '_TZ3000_other'), 42.7);
    assert.strictEqual(scaleZclHumidity(427, ''), 42.7);
    assert.strictEqual(scaleZclHumidity(undefined, ''), null);
  });
  it('no driver divides ZCL humidity measuredValue by 100 directly', () => {
    const root = path.join(__dirname, '..', '..', 'drivers');
    const bad = [];
    for (const d of fs.readdirSync(root)) {
      const f = path.join(root, d, 'device.js');
      if (!fs.existsSync(f)) {continue;}
      fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
        if (/hum\w*\s*=.*measuredValue \/ 100/i.test(l)) {bad.push(`${d}:${i + 1}`);}
      });
    }
    assert.deepStrictEqual(bad, []);
  });
});
