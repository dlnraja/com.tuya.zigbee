'use strict';
// P3066 (stable-v5): _TZE284_6ycgarab is the Tuya TS0601 dual smoke + CO alarm (Z2M TS0601_smoke_co).
// On this branch its TS0601 couple is owned by smoke_sensor3 (P3018b one-couple-one-driver); the
// fingerprint hint pointed at smoke_detector_advanced, which does not list it. The hint (monolith +
// runtime shard) must name the single compose owner. Pairing is unchanged.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

function ownersOf(mfr, pid) {
  const out = [];
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const f = path.join(ROOT, 'drivers', d, 'driver.compose.json');
    if (!fs.existsSync(f)) {continue;}
    const z = JSON.parse(fs.readFileSync(f, 'utf8')).zigbee || {};
    if ((z.manufacturerName || []).includes(mfr) && (z.productId || []).includes(pid)) {out.push(d);}
  }
  return out;
}

describe('P3066 _TZE284_6ycgarab fingerprint hint (stable)', () => {
  it('hint names the single TS0601 compose owner in monolith and shard', () => {
    const owners = ownersOf('_TZE284_6ycgarab', 'TS0601');
    assert.deepStrictEqual(owners, ['smoke_sensor3']);
    const fp = require(path.join(ROOT, 'lib/tuya/fingerprints.json'));
    const shard = require(path.join(ROOT, 'lib/tuya/fp-shards/TZE284_6.json'));
    for (const db of [fp, shard]) {
      assert.strictEqual(db._TZE284_6ycgarab.driverId, owners[0]);
      assert.deepStrictEqual(db._TZE284_6ycgarab.modelIds, ['TS0601']);
    }
  });
});
