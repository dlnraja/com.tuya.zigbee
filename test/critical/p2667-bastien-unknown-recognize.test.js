'use strict';

/**
 * P2667 — Bastien Unknown Nodes + HOBEIAN recognition Contre quoi
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  lookupBastienIeee,
  listUnknownNodeActions,
  isNeedInterviewIeee,
} = require('../../lib/zigbee/BastienIeeeIdentity');

function compose(id) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'),
  );
}

function hasMfr(j, mfr) {
  return [].concat(j.zigbee?.manufacturerName || []).some(
    (m) => String(m).toLowerCase() === String(mfr).toLowerCase(),
  );
}

describe('P2667 Bastien Unknown recognize + HOBEIAN light class', () => {
  it('IEEE 7c:c6:b6… → axpdxqgu+TS0041 → button_wireless_1', () => {
    const hit = lookupBastienIeee('7c:c6:b6:ff:fe:a3:e1:58');
    assert.ok(hit);
    assert.equal(hit.driver, 'button_wireless_1');
    assert.equal(hit.pid, 'TS0041');
    const j = compose('button_wireless_1');
    assert.ok(hasMfr(j, '_TZ3000_axpdxqgu'));
    assert.ok([].concat(j.zigbee.productId || []).includes('TS0041'));
  });

  it('IEEE a4:c1:38:bb:8f… → dzwgk7e2+TS0042 → button_wireless_2', () => {
    const hit = lookupBastienIeee('a4:c1:38:bb:8f:37:ee:17');
    assert.ok(hit);
    assert.equal(hit.driver, 'button_wireless_2');
    const j = compose('button_wireless_2');
    assert.ok(hasMfr(j, '_TZ3000_dzwgk7e2'));
    assert.ok([].concat(j.zigbee.productId || []).includes('TS0042'));
  });

  it('Hobeian heal sets light class (P2667)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/tuya/HobeianZg301zHeal.js'),
      'utf8',
    );
    assert.ok(src.includes("setClass('light')"));
    assert.ok(src.includes('P2667'));
  });

  it('Unknown Node action list non-empty', () => {
    assert.ok(listUnknownNodeActions().length >= 2);
  });

  it('npm check:p2667 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2667']);
  });

  // WHY(P2694 / Bastien DevTools 2026-09-23): live TS0042 IEEE moved; 3-btn may be OFF_MESH or Homey Appareil Zigbee
  it('P2694/P2703 live mesh IEEE: TS0042 e6:69 OK + vsxvaj9i map + Node19 NEED_INTERVIEW', () => {
    const liveTs0042 = lookupBastienIeee('a4:c1:38:e6:69:60:4a:6f');
    assert.equal(liveTs0042.mfr, '_TZ3000_dzwgk7e2');
    assert.equal(liveTs0042.pid, 'TS0042');
    assert.equal(liveTs0042.status, 'OK_LIVE');
    const stale = lookupBastienIeee('a4:c1:38:bb:8f:37:ee:17');
    assert.equal(stale.status, 'STALE_GHOST');
    const th = lookupBastienIeee('a4:c1:38:c1:17:76:42:f4');
    assert.equal(th.driver, 'climate_sensor');
    assert.equal(th.status, 'UNKNOWN_LIVE');
    const ts0043Prior = lookupBastienIeee('a4:c1:38:f6:3d:2d:c9:79');
    assert.equal(ts0043Prior.driver, 'button_wireless_3');
    const ts0043Live = lookupBastienIeee('a4:c1:38:5b:91:98:dd:55');
    assert.equal(ts0043Live.status, 'WRONG_APP_HOMEY');
    assert.equal(lookupBastienIeee('a4:c1:38:e6:74:3a:00:da'), null);
    assert.equal(isNeedInterviewIeee('a4:c1:38:e6:74:3a:00:da'), true);
  });
});
