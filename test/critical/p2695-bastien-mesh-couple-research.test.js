'use strict';

/**
 * P2695 — Bastien mesh couple research Contre quoi (2026-09-23 DevTools)
 * Locks mfr+pid → driver for every house couple + no invent on Node18 IEEE.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  lookupBastienIeee,
  isNeedInterviewIeee,
} = require('../../lib/zigbee/BastienIeeeIdentity');

function compose(id) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'),
  );
}

function hasCouple(driverId, mfr, pid) {
  const j = compose(driverId);
  const mfrs = [].concat(j.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
  const pids = [].concat(j.zigbee?.productId || []).map(String);
  return mfrs.includes(String(mfr).toLowerCase()) && pids.includes(pid);
}

describe('P2695 Bastien mesh couple research locks', () => {
  it('compose locks every live mesh sacred couple', () => {
    assert.ok(hasCouple('button_wireless_1', '_TZ3000_axpdxqgu', 'TS0041'));
    assert.ok(hasCouple('button_wireless_2', '_TZ3000_dzwgk7e2', 'TS0042'));
    assert.ok(hasCouple('button_wireless_3', '_TZ3000_vsxvaj9i', 'TS0043'));
    assert.ok(hasCouple('switch_4gang', '_TZ3000_ltt60asa', 'TS0004'));
    assert.ok(hasCouple('switch_1gang', 'HOBEIAN', 'ZG-301Z'));
    assert.ok(hasCouple('climate_sensor', '_TZ3000_fllyghyj', 'SNZB-02'));
    // WHY(P2695): Homey may show SNZB-02; Z2M fingerprint is TS0201 — both must stay
    assert.ok(hasCouple('climate_sensor', '_TZ3000_fllyghyj', 'TS0201'));
    const clim = compose('climate_sensor');
    const pids = [].concat(clim.zigbee.productId || []);
    assert.ok(pids.some((p) => String(p).includes('7014')));
    assert.ok(
      [].concat(clim.zigbee.manufacturerName || []).some((m) => /ewelink/i.test(m)),
    );
  });

  it('IEEE map matches live dump + Node18 NEED_INTERVIEW (no invent)', () => {
    assert.equal(lookupBastienIeee('7c:c6:b6:ff:fe:a3:e1:58').driver, 'button_wireless_1');
    assert.equal(lookupBastienIeee('a4:c1:38:e6:69:60:4a:6f').pid, 'TS0042');
    assert.equal(lookupBastienIeee('a4:c1:38:f6:3d:2d:c9:79').status, 'OFF_MESH');
    assert.equal(lookupBastienIeee('a4:c1:38:f7:14:92:cb:c8').driver, 'switch_4gang');
    assert.equal(lookupBastienIeee('a4:c1:38:c1:17:76:42:f4').driver, 'climate_sensor');
    assert.equal(lookupBastienIeee('a4:c1:38:e6:74:3a:00:da'), null);
    assert.equal(isNeedInterviewIeee('a4:c1:38:e6:74:3a:00:da'), true);
  });

  it('research report + couple profiles exist', () => {
    const report = path.join(
      ROOT,
      'reports/bastien-mesh-couple-research-2026-09-23/MESH_COUPLE_RESEARCH.md',
    );
    assert.ok(fs.existsSync(report));
    const body = fs.readFileSync(report, 'utf8');
    assert.ok(body.includes('dzwgk7e2'));
    assert.ok(body.includes('vsxvaj9i'));
    assert.ok(body.includes('fllyghyj'));
    assert.ok(body.includes('ltt60asa'));
    assert.ok(body.includes('ZG-301Z'));
    assert.ok(body.includes('NEED_INTERVIEW'));
    assert.ok(body.includes('885a9901'));
    for (const f of [
      '_TZ3000_dzwgk7e2_TS0042.md',
      '_TZ3000_ltt60asa_TS0004.md',
      '_TZ3000_fllyghyj_SNZB-02.md',
      'HOBEIAN_ZG-301Z.md',
      '_TZ3000_vsxvaj9i_TS0043.md',
      '_TZ3000_axpdxqgu_TS0041.md',
    ]) {
      assert.ok(
        fs.existsSync(path.join(ROOT, 'docs/knowledge/profiles/couples', f)),
        f,
      );
    }
  });

  it('npm check:p2695 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2695']);
  });
});
