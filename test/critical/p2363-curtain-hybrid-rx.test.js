'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('P2363 curtain hybrid + cover hardening', () => {
  it('HybridProtocolManager skips optimize-disable for cover drivers', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../lib/protocol/HybridProtocolManager.js'), 'utf8');
    assert.match(src, /isCoverish/);
    assert.match(src, /curtain\|cover\|shutter\|blind/);
    assert.match(src, /Skip protocol disable on sleepy\/IAS-only\/button\/cover device/);
  });

  it('UnifiedCoverBase creates EF00 manager and optimistic UI updates', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../lib/devices/UnifiedCoverBase.js'), 'utf8');
    assert.match(src, /TuyaEF00Manager created \(P2363\)/);
    assert.match(src, /_optimisticCoverUpdate/);
    assert.ok(src.includes('_optimisticCoverUpdate({'), 'optimistic calls after TX');
  });

  it('curtain_motor has Z2M-verified cover couples without switch bleed', () => {
    const compose = JSON.parse(fs.readFileSync(path.join(__dirname, '../../drivers/curtain_motor/driver.compose.json'), 'utf8'));
    const mfrs = (compose.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
    for (const need of [
      '_tze204_a2jcoyuk',
      '_tze200_libht6ua',
      '_tze284_libht6ua',
      '_tze200_yia0p3tr',
      '_tze200_2jwrgrro',
      '_tze284_zofmmt9s',
    ]) {
      assert.ok(mfrs.includes(need), `missing ${need}`);
    }
    assert.ok(!mfrs.includes('_tz3000_qxcnwv26'), 'must not steal 3gang switch qxcnwv26');
    assert.ok(!mfrs.some((m) => /_tze204_r0jdjrvi/i.test(m)), 'tilt couple TZE204_r0jdjrvi must not sit on curtain_motor');
    assert.ok((compose.zigbee.productId || []).includes('TS0601'));
  });
});
