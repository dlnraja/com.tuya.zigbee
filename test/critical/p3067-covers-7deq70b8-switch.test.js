'use strict';
// P3067 covers family (2026-10-26): _TZE200_7deq70b8 is a 2-gang TS0601 wall switch
// (Z2M TS0601_switch — same entry as _TZE200_nkjintbl; ZHA TuyaDoubleSwitchGP;
// blakadder "ZY-US 2 Wall Switch 2 Gang"). It was wrongly claimed by curtain_motor
// (never published there). One couple, one driver: switch_2gang, pinned.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const MFR = '_tze200_7deq70b8';

describe('P3067 covers — _TZE200_7deq70b8 is a switch, not a cover', () => {
  it('only switch_2gang claims it (any casing) with TS0601', () => {
    const owners = fs.readdirSync(path.join(root, 'drivers')).filter((d) => {
      const f = path.join(root, 'drivers', d, 'driver.compose.json');
      if (!fs.existsSync(f)) return false;
      const z = (JSON.parse(fs.readFileSync(f, 'utf8')).zigbee) || {};
      return (z.manufacturerName || []).some((m) => String(m).toLowerCase() === MFR);
    });
    assert.deepStrictEqual(owners, ['switch_2gang']);
    const z = read('drivers/switch_2gang/driver.compose.json').zigbee;
    assert.ok(z.productId.includes('TS0601'));
    const forms = z.manufacturerName.filter((m) => String(m).toLowerCase() === MFR);
    assert.deepStrictEqual(forms.sort(), ['_TZE200_7deq70b8', '_tze200_7deq70b8']);
  });

  it('is pinned sacred-keep on switch_2gang so the budget cut cannot drop it', () => {
    const pins = read('config/architecture/publish-sacred-keep-couples.json').couples;
    const hit = pins.filter((c) => String(c.mfr).toLowerCase() === MFR);
    assert.strictEqual(hit.length, 1);
    assert.strictEqual(hit[0].pid, 'TS0601');
    assert.strictEqual(hit[0].driverId, 'switch_2gang');
  });
});
