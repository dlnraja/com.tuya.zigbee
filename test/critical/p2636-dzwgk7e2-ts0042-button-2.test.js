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
    // 552a5736a4/d638073cb7 moved verified TS011F plug/breaker mfrs (jak16dll, cayepv1a, lepzuhto,
    // 4ux0ondb, b28wrpvx) to plug drivers; floor tracks that, still guards mass purges.
    // 2026-10-18: raw floor follows the deliberate wrong-class moves P2819/P2820/d09e9531cf (486 -> 410 raw forms, unique makers 104 -> 103:
    // only dfgbtub0 left, to button_wireless_4, W4) — verified 0 orphaned couples; the unique-maker floor is the real mass-purge guard.
    // 2026-10-19: b919e24e92 (P2830b) moved 5 TS0003 3-gang wall-switch makers to switch_3gang (exact pid, pinned); 0 orphans, raw 410 -> 390, unique makers 103 -> 98.
    // 2026-10-20 (P2910): Lidl HG06338 3-socket strip makers vmpbygs5 + wzauvbcs (Z2M lidl.ts, TS011F) moved to socket_power_strip and
    // LoraTap SS6400ZB ee8nrt2l (Z2M TS0044 4-button) to button_wireless_4 — dual-couple-legacy, 0 orphans, raw 390 -> 378, unique 98 -> 95.
    assert.ok((c.zigbee.manufacturerName || []).length >= 375);
    assert.ok(new Set((c.zigbee.manufacturerName || []).map((x) => String(x).toLowerCase())).size >= 95);
    // 2026-10-11 second-source round: 9 TS0003/TS0013 3-gang + r0pmi2p3 TS0014 moved to switch_3_gang/switch_4gang (curated removals). 2026-10-11 johan-only round: key8kk7r+rrjr1q0u (3-btn) and zl1kmjqx (temp sensor) moved out (curated removals); qewo8dlz TS0013 3-gang moved to switch_3_gang (W4). 2026-10-11: _TZ3000_yw5tvzsk (TS0043, Johan+deCONZ) moved to button_wireless_3 (curated removal)
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
