'use strict';

/**
 * P2629 — `_TZ3000_vsxvaj9i`+TS0043 Bastien interview Contre quoi
 * Clusters EP1 [0,1,6,57344]; no EF00; battery EP1; hybrid 0xFD/E000; no 0x8004.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const COMPOSE = path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json');
const DEVICE = path.join(ROOT, 'drivers/button_wireless_3/device.js');

describe('P2629 vsxvaj9i+TS0043 interview clusters / RX-TX', () => {
  it('compose EP1 matches interview (0,1,6,E000) — no EF00/61184', () => {
    const c = JSON.parse(fs.readFileSync(COMPOSE, 'utf8'));
    const ep1 = c.zigbee.endpoints['1'];
    assert.deepEqual(ep1.clusters.slice().sort((a, b) => a - b), [0, 1, 6, 57344]);
    assert.deepEqual(ep1.bindings, [6]);
    const all = JSON.stringify(c.zigbee.endpoints);
    assert.ok(!all.includes('61184'), 'must not compose EF00');
    assert.ok((c.zigbee.manufacturerName || []).some((x) => /vsxvaj9i/i.test(String(x))));
    assert.ok((c.zigbee.productId || []).includes('TS0043'));
  });

  it('EP2–3 bind OnOff; EP4 present for phantom match without bind storm', () => {
    const c = JSON.parse(fs.readFileSync(COMPOSE, 'utf8'));
    for (const ep of ['2', '3']) {
      assert.ok(c.zigbee.endpoints[ep].clusters.includes(6));
      assert.ok(c.zigbee.endpoints[ep].bindings.includes(6));
    }
    assert.ok(c.zigbee.endpoints['4'].clusters.includes(6));
    assert.ok(!c.zigbee.endpoints['4'].bindings || c.zigbee.endpoints['4'].bindings.length === 0);
  });

  it('device.js locks batteryEpOnly + noEf00 + skip 0x8004 profile', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('P2629'));
    assert.ok(src.includes('batteryEpOnly: 1'));
    assert.ok(src.includes('writeSceneAttr: false'));
    assert.ok(src.includes('noEf00: true'));
    assert.ok(src.includes('installWallSceneRemoteHybrid'));
    assert.ok(src.includes('skipEf00Tx: true'));
  });

  it('app.json zigbee matches compose interview endpoints', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const d = (app.drivers || []).find((x) => x.id === 'button_wireless_3');
    assert.ok(d);
    assert.deepEqual(
      d.zigbee.endpoints['1'].clusters.slice().sort((a, b) => a - b),
      [0, 1, 6, 57344],
    );
    assert.ok((d.zigbee.manufacturerName || []).some((x) => /vsxvaj9i/i.test(String(x))));
  });

  it('npm check:p2629 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2629']);
  });
});
