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
    assert.ok((c.zigbee.manufacturerName || []).length >= 566);
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
