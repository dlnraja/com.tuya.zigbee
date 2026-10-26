'use strict';
// P3066: _TZ3210_09hzmirw is the EcoDim ED-10032 dimmable CCT filament bulb (Z2M tuya.ts, TS0502B
// whiteLabel, colorTemp 153-500). Its real couple pairs on the CCT light driver; the old smoke_sensor
// combos stay untouched (additive move, no existing device re-paired, P3024b baseline unchanged).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const compose = (id) => require(path.join(ROOT, 'drivers', id, 'driver.compose.json'));

describe('P3066 EcoDim ED-10032 CCT bulb', () => {
  it('_TZ3210_09hzmirw + TS0502B pairs on light_cct_ts0502b only', () => {
    const cct = compose('light_cct_ts0502b');
    assert.ok(cct.zigbee.manufacturerName.includes('_TZ3210_09hzmirw'));
    assert.ok(cct.zigbee.productId.includes('TS0502B'));
    assert.ok(cct.capabilities.includes('light_temperature'));
    const fs = require('fs');
    for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      if (d === 'light_cct_ts0502b') {continue;}
      const f = path.join(ROOT, 'drivers', d, 'driver.compose.json');
      if (!fs.existsSync(f)) {continue;}
      const z = JSON.parse(fs.readFileSync(f, 'utf8')).zigbee || {};
      const holds = (z.manufacturerName || []).some((m) => m.toLowerCase() === '_tz3210_09hzmirw');
      assert.ok(!(holds && (z.productId || []).includes('TS0502B')), `${d} must not also claim the TS0502B couple`);
    }
  });
  it('fingerprint DB routes the bulb to the CCT light driver', () => {
    const fp = require(path.join(ROOT, 'lib/tuya/fingerprints.json'));
    assert.strictEqual(fp._TZ3210_09hzmirw.driverId, 'light_cct_ts0502b');
    assert.deepStrictEqual(fp._TZ3210_09hzmirw.modelIds, ['TS0502B']);
  });
});
