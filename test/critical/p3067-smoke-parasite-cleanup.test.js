'use strict';
// P3067 (decided by homey 2026-10-26 under dlnraja t561u/t555u delegation):
// 1) _TZ3210_09hzmirw is the EcoDim ED-10032 CCT bulb (Z2M TS0502B whiteLabel), paired by light_cct_ts0502b;
//    its smoke_sensor combos (TS0205/TS0601/SMD9300) were cartesian parasites and are removed, with
//    baseline exemptions (approvedBy) so the P3024b gate stays green.
// 2) _TZE284_6ycgarab is TS0601 only (Z2M TS0601_smoke_co, ZHA #4181, Tasmota TZE284_6ycgarab.zb):
//    smoke_sensor3 claimed it only through TS0205 (parasite double claim) and drops it; smoke_sensor keeps it.
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
  it('_TZE284_6ycgarab has a single owner (smoke_sensor, TS0601)', () => {
    assert.ok(!has(zig('smoke_sensor3'), /^_tze284_6ycgarab$/i));
    const smoke = zig('smoke_sensor');
    assert.ok(smoke.manufacturerName.includes('_TZE284_6ycgarab'));
    assert.ok(smoke.productId.includes('TS0601'));
  });
});
