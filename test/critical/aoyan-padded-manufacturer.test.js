'use strict';
const { describe, it } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha

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
  it('soil_sensor lists plain and exact padded AOYAN', () => {
    const mfrs = read('soil_sensor').zigbee.manufacturerName;
    assert.ok(mfrs.includes('AOYAN'));
    assert.ok(mfrs.includes('AOYAN  '));
  });

  // WHY(P2817 / forum #2258): the AOYAN x TS0601 cartesian on water_leak_sensor made Homey pair soil units as
  // leak sensors, so the brand was deliberately stripped there (see p2817-forum-t140352-images-treat.test.js).
  it('water_leak_sensor does not list AOYAN (P2817 deliberate strip)', () => {
    const mfrs = read('water_leak_sensor').zigbee.manufacturerName;
    assert.ok(!mfrs.some((m) => /^aoyan/i.test(m)));
  });

  it('runtime normalizers treat padding as the same identity', () => {
    const { includesCI, equalsCI } = require('../../lib/utils/CaseInsensitiveMatcher');
    const { normalizeMfr } = require('../../lib/utils/fingerprint-matcher');
    assert.ok(includesCI(['AOYAN'], 'AOYAN  '));
    assert.ok(equalsCI('aoyan', 'AOYAN  '));
    assert.strictEqual(normalizeMfr('AOYAN  ').key, normalizeMfr('AOYAN').key);
  });
});
