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
});
