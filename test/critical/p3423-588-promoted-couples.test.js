'use strict';
/* global describe, it */
// P3423 (2026-11-28 Paris): the 3 issue #588 provisional couples with an exact zhc definition (@ed29f80) leave the
// generic host universal_zigbee for their exact driver, as bastien-home already does (P3038c); acv1biec is recorded
// as unconfirmed on ir_blaster and never removed.
const assert = require('assert');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const mfrs = (id) => new Set(require(path.join(ROOT, 'drivers', id, 'driver.compose.json')).zigbee.manufacturerName.map((m) => m.toLowerCase()));
const app = require(path.join(ROOT, 'app.json'));
const appMfrs = (id) => new Set(app.drivers.find((d) => d.id === id).zigbee.manufacturerName.map((m) => m.toLowerCase()));
const prov = require(path.join(ROOT, 'data', 'leads', 'provisional-couples.json')).entries;
const MOVES = { _tze204_zajeikkt: 'led_controller_rgb', _tze20c_ycab9txf: 'siren', _tze284_xr5yfele: 'wall_thermostat' };

describe('P3423 issue #588 couples on their exact driver', () => {
  for (const [m, d] of Object.entries(MOVES)) {
    it(`${m} is on ${d} (compose + app.json), not on universal_zigbee`, () => {
      assert.ok(mfrs(d).has(m) && appMfrs(d).has(m));
      assert.ok(!mfrs('universal_zigbee').has(m) && !appMfrs('universal_zigbee').has(m));
      const tp = require(path.join(ROOT, 'drivers', d, 'driver.compose.json')).zigbee.productId;
      assert.ok(tp.includes('TS0601'));
      const e = prov.find((x) => x.mfr.toLowerCase() === m);
      assert.strictEqual(e.status, 'promoted');
      assert.strictEqual(e.driver, d);
    });
  }
  it('acv1biec stays on ir_blaster and is recorded as unconfirmed', () => {
    assert.ok(mfrs('ir_blaster').has('_tz3290_acv1biec'));
    const e = prov.find((x) => x.mfr.toLowerCase() === '_tz3290_acv1biec');
    assert.strictEqual(e.status, 'unconfirmed');
  });
});
