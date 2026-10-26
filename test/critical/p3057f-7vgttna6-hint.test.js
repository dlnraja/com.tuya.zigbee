'use strict';
const { describe, it } = require('../_support/dual-runner');
/**
 * P3057(f) 26/10/2026: the broad runtime hint catalog labelled _TZ3210_7vgttna6 as `motion_sensor`
 * (a driver id that does not exist) and its upper-case variant as `bulb_rgb` TS0503A. Z2M
 * (zigbee-herdsman-converters, Tuya `TS0001_fingerbot`) lists it with the fingerbot family
 * (_TZ3210_dse8ogfy / j4pdtz9v / a04acm9s / cm9mbpr1, model TS0001). Data-only fix: the hint now says
 * fingerbot in the monolith and in its shard. Couple ownership in driver.compose.json is NOT changed
 * here (behaviour change → staged for master soak).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const FILES = ['lib/tuya/fingerprints.json', 'lib/tuya/fp-shards/TZ3210_7.json'];

describe('P3057(f) _TZ3210_7vgttna6 runtime hint is the fingerbot, not a motion sensor', () => {
  for (const rel of FILES) {
    it(`${rel}: both case variants say fingerbot / TS0001 / battery`, () => {
      const j = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
      for (const k of ['_TZ3210_7vgttna6', '_TZ3210_7VGTTNA6']) {
        const e = j[k];
        assert.ok(e, `${k} missing in ${rel}`);
        assert.strictEqual(e.driverId, 'fingerbot', `${k} ${JSON.stringify(e)}`);
        assert.strictEqual(e.type, 'fingerbot');
        assert.strictEqual(e.powerSource, 'battery');
        assert.deepStrictEqual(e.modelIds, ['TS0001']);
      }
    });
  }
  it('the hinted driver id exists in source', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'drivers', 'fingerbot', 'driver.compose.json')));
  });
  it('no fingerprint catalog hint still names a non-existent motion_sensor driver for it', () => {
    for (const rel of FILES) {
      const s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.ok(!/"_TZ3210_7vgttna6":\s*\{"driverId":\s*"motion_sensor"/i.test(s), rel);
    }
  });
});
