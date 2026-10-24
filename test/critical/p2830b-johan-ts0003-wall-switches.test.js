'use strict';
const { describe, it } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha

// P2830b — five Tuya TS0003 3-gang mains wall switches (credit: Johan Bendz, issues #55 and #254,
// plus his supported-device list) were claimed by the 2-button remote driver button_wireless_2.
// Exact couple (maker + TS0003) is pinned to switch_3gang; the remote driver must never claim it again.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const compose = (id) => readJson(`drivers/${id}/driver.compose.json`).zigbee;
const MAKERS = ['cdamjqm9', '2dlwlvex', 'qcdqw8nf', 'vvlivusi', 'w05exif3'];
const has = (list, v) => (list || []).some((x) => String(x).trim().toLowerCase() === v.toLowerCase());
const claims = (z, mfr, pid) => has(z.manufacturerName, mfr) && has(z.productId, pid);

describe('P2830b TS0003 wall switches (Johan #55/#254 family)', () => {
  for (const m of MAKERS) {
    it(`_TZ3000_${m} + TS0003 is owned by switch_3gang only`, () => {
      assert.ok(claims(compose('switch_3gang'), `_TZ3000_${m}`, 'TS0003'));
      const owners = fs.readdirSync(path.join(ROOT, 'drivers'))
        .filter((id) => fs.existsSync(path.join(ROOT, 'drivers', id, 'driver.compose.json')))
        .filter((id) => { try { return claims(compose(id), `_TZ3000_${m}`, 'TS0003'); } catch (_e) { return false; } });
      assert.deepStrictEqual(owners, ['switch_3gang']);
    });

    it(`button_wireless_2 no longer lists _TZ3000_${m} in any case form`, () => {
      assert.ok(!(compose('button_wireless_2').manufacturerName || []).some((x) => x.toLowerCase() === `_tz3000_${m}`));
    });

    it(`switch_3gang keeps canonical + lowercase + uppercase forms of ${m}`, () => {
      const list = compose('switch_3gang').manufacturerName;
      for (const f of [`_TZ3000_${m}`, `_tz3000_${m}`, `_TZ3000_${m.toUpperCase()}`]) { assert.ok(list.includes(f), f); }
    });
  }

  it('button_wireless_2 stays a real remote driver (other TS0042 makers untouched)', () => {
    const z = compose('button_wireless_2');
    assert.ok(has(z.productId, 'TS0042'));
    assert.ok(z.manufacturerName.length > 100);
  });

  it('automation cannot undo it: pin, curated removal and registry case exist', () => {
    const pins = readJson('config/architecture/couple-driver-pins.json').pins;
    assert.ok(pins.some((p) => p.driver === 'switch_3gang' && p.pid === 'TS0003' && MAKERS.every((m) => p.mfr.some((x) => x.toLowerCase() === `_tz3000_${m}`))));
    const rem = readJson('config/architecture/curated-couple-removals.json').removals;
    assert.ok(rem.some((r) => r.driver === 'button_wireless_2' && MAKERS.every((m) => (r.mfr || []).some((x) => x.toLowerCase() === `_tz3000_${m}`))));
    const reg = readJson('data/user-misattribution-registry.json').cases;
    const c = reg.find((x) => x.id === 'p2830b-johan-ts0003-wall-switches');
    assert.ok(c && c.canonicalDriver === 'switch_3gang' && c.forbiddenDrivers.includes('button_wireless_2'));
  });
});
