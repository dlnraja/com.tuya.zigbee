'use strict';

// WHY: AOYAN AY-303Z/AY-302Z soil and AY222Z leak units send Basic
// manufacturerName as "AOYAN  " (Z2M hobeian.ts / tuya.ts, PR #12488).
// Homey pairing compares manifest strings, so the exact padded form is listed;
// runtime identity helpers must treat it as the plain brand.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));

describe('AOYAN padded manufacturerName', () => {
  for (const id of ['soil_sensor', 'water_leak_sensor']) {
    it(`${id} lists plain and exact padded AOYAN`, () => {
      const mfrs = read(id).zigbee.manufacturerName;
      assert.ok(mfrs.includes('AOYAN'));
      assert.ok(mfrs.includes('AOYAN  '));
    });
  }

  it('runtime normalizers treat padding as the same identity', () => {
    const { includesCI, equalsCI } = require('../../lib/utils/CaseInsensitiveMatcher');
    const { normalizeMfr } = require('../../lib/utils/fingerprint-matcher');
    assert.ok(includesCI(['AOYAN'], 'AOYAN  '));
    assert.ok(equalsCI('aoyan', 'AOYAN  '));
    assert.strictEqual(normalizeMfr('AOYAN  ').key, normalizeMfr('AOYAN').key);
  });
});
