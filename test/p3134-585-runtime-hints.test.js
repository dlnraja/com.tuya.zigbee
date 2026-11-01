'use strict';
/* eslint-env mocha */
// P3134 (#585): runtime hints / SSOT tables follow the P3131 removals (exact mfr, Z2M tuya.ts pid).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..');
const j = (f) => JSON.parse(fs.readFileSync(path.join(R, f), 'utf8'));
const want = { _tz3000_46vasa5h: 'double_power_point_2', _tz3000_cehuw1lw: 'smartplug', _tze284_xpq2rzhq: 'presence_sensor_radar', _tz3000_dfgbtub0: 'button_wireless_2' };
const old = { _tz3000_46vasa5h: ['switch_1gang'], _tz3000_cehuw1lw: ['button_wireless_plug', 'gas_sensor'], _tze284_xpq2rzhq: ['climate_sensor'], _tz3000_dfgbtub0: ['button_wireless_3', 'switch_1gang'] };
// Hints must not point to a removed/wrong driver; fingerprints/sacred tables must name the right one.
const check = (obj, field, where, strict = true) => {
  for (const [k, e] of Object.entries(obj || {})) {
    const d = want[k.toLowerCase()];
    if (!d || !e || !e[field]) continue;
    assert.ok(!old[k.toLowerCase()].includes(e[field]), `${where} ${k} still ${e[field]}`);
    if (strict) assert.strictEqual(e[field], d, `${where} ${k}`);
  }
};
describe('P3134 #585 runtime hints follow the right drivers', function () {
  it('fingerprints.json and shards', function () {
    check(j('lib/tuya/fingerprints.json'), 'driverId', 'fingerprints');
    for (const f of fs.readdirSync(path.join(R, 'lib/tuya/fp-shards')).filter((x) => x.endsWith('.json'))) check(j('lib/tuya/fp-shards/' + f), 'driverId', f);
  });
  it('mfs_db sacredCouples/devices and product-reference', function () {
    const m = j('data/mfs_db.json');
    check(m.sacredCouples, 'driverId', 'sacred');
    check(m.devices, 'driverHint', 'devices', false);
    const p = path.join(R, 'data/product-reference.json');
    if (fs.existsSync(p)) check(j('data/product-reference.json').reference, 'driverId', 'product-reference', false);
  });
});
