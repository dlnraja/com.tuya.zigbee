'use strict';
// P3067 (decided by homey 2026-10-26 under dlnraja t561u/t555u delegation):
// 1) _TZ3210_09hzmirw is the EcoDim ED-10032 CCT bulb (Z2M TS0502B whiteLabel), paired by light_cct_ts0502b;
//    its smoke_sensor combos (TS0205/TS0601/SMD9300) were cartesian parasites and are removed, with
//    baseline exemptions (approvedBy) so the P3024b gate stays green.
// 2) stable-v5: _TZE284_6ycgarab has no double claim (only smoke_sensor3 lists it) — left as is (data-safe).
// Manifest removal does not unpair devices already on a driver (Homey keeps the paired driver id).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const zig = (d) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', d, 'driver.compose.json'), 'utf8')).zigbee;
const has = (z, re) => (z.manufacturerName || []).some((m) => re.test(m));

describe('P3067 smoke parasite cleanup', () => {
  it('smoke_sensor no longer lists the EcoDim bulb; the CCT light still does', () => {
    assert.ok(!has(zig('smoke_sensor'), /09hzmirw/i));
    const cct = zig('light_cct_ts0502b');
    assert.ok(cct.manufacturerName.includes('_TZ3210_09hzmirw'));
    assert.ok(cct.productId.includes('TS0502B'));
  });
  it('baseline exemptions carry approvedBy for every removed EcoDim smoke combo', () => {
    const b = require(path.join(ROOT, 'test/fixtures/athom-last-test-package-couples.json'));
    const removed = (b.drivers.smoke_sensor ? b.drivers.smoke_sensor.m : []).filter((m) => /09hzmirw/i.test(m));
    for (const m of removed) {
      for (const p of ['TS0205', 'TS0601', 'SMD9300']) {
        const e = b.exemptions.find((x) => x.mfr === m && x.pid === p);
        assert.ok(e && e.approvedBy && e.reason, `exemption for ${m}+${p}`);
      }
    }
  });
  it('_TZE284_6ycgarab keeps exactly one owner on stable (smoke_sensor3, unchanged)', () => {
    const owners = fs.readdirSync(path.join(ROOT, 'drivers')).filter((d) => {
      const f = path.join(ROOT, 'drivers', d, 'driver.compose.json');
      if (!fs.existsSync(f)) { return false; }
      const z = JSON.parse(fs.readFileSync(f, 'utf8')).zigbee;
      return z && has(z, /^_tze284_6ycgarab$/i);
    });
    assert.deepStrictEqual(owners, ['smoke_sensor3']);
  });
});
