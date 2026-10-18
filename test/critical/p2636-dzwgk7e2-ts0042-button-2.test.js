'use strict';

/**
 * P2636 — _TZ3000_dzwgk7e2 + TS0042 Contre quoi
 * Unrecognized Zigbee → button_wireless_2; phantom EP3/4 must not steal btn1.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2636 dzwgk7e2+TS0042 2-btn (phantom 4EP)', () => {
  it('button_wireless_2 locks dzwgk7e2 + TS0042 (UNION)', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_2/driver.compose.json'),
      'utf8',
    ));
    assert.ok((c.zigbee.manufacturerName || []).some((x) => /dzwgk7e2/i.test(String(x))));
    assert.ok((c.zigbee.productId || []).includes('TS0042'));
    // WHY(1e301a5fcc + W4 9c32d98180, 2026-10-11): TS011F plugs 4ux0ondb/b28wrpvx and other misplaced
    // couples moved out on purpose — anti-purge floor lowered accordingly (still catches mass loss).
    // 2026-10-18: raw floor follows deliberate moves of 18 makers (13 -> switch_1gang, 3 -> switch_2gang, 1 plug strip, 1 TRV; 0 orphaned couples,
    // verified against 9594b58449). The unique-maker floor is the real mass-purge guard.
    assert.ok((c.zigbee.manufacturerName || []).length >= 420);
    assert.ok(new Set((c.zigbee.manufacturerName || []).map((x) => String(x).toLowerCase())).size >= 100);
    // 2026-10-11 second-source round: TS0003/TS0013 3-gang + r0pmi2p3 TS0014 moved to switch_3_gang/switch_4gang (curated removals). 2026-10-11 W4: qewo8dlz TS0013 (wired 3-gang, deCONZ) moved to switch_3_gang (curated removal)
  });

  it('device.js forces 2 buttons + P2636 dzwgk7e2 / skipEf00', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_2/device.js'), 'utf8');
    assert.ok(src.includes('P2636'));
    assert.ok(src.includes('dzwgk7e2'));
    assert.ok(src.includes('buttonCount = 2'));
    assert.ok(src.includes('skipEf00Tx: true'));
    assert.ok(src.includes('_stripPhantomButtonCapsBeyond2'));
  });

  it('WallSceneRemoteHybridInit ignores EP beyond maxButtons (P2636)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/WallSceneRemoteHybridInit.js'), 'utf8');
    assert.ok(src.includes('P2636'));
    assert.ok(src.includes('epId < 1 || epId > maxButtons'));
    assert.ok(!/const gang = \(epId >= 1 && epId <= maxButtons\) \? epId : 1/.test(src));
  });

  it('misattribution canonical button_wireless_2', () => {
    const reg = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'data/user-misattribution-registry.json'),
      'utf8',
    ));
    const hit = (reg.cases || []).find((c) => c.id === 'p2636-tz3000-dzwgk7e2-ts0042-button-2');
    assert.ok(hit);
    assert.equal(hit.canonicalDriver, 'button_wireless_2');
    assert.ok((hit.productId || []).includes('TS0042'));
    assert.ok((hit.forbiddenDrivers || []).includes('button_wireless_4'));
  });

  it('npm check:p2636 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2636']);
  });
});
