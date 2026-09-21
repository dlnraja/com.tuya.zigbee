'use strict';
/**
 * P2661 — Bastien mesh / diags Contre quoi
 * WHY: Virtual Homey Zigbee stole TS0043/TS0004/SNZB-02; Time cluster must not RX-SHED.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function readCompose(driverId) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8')
  );
}

function hasMfr(compose, mfr) {
  const list = compose.zigbee?.manufacturerName || [];
  const want = String(mfr).toLowerCase();
  return list.some((x) => String(x).toLowerCase() === want);
}

function hasPid(compose, pid) {
  const list = compose.zigbee?.productId || [];
  const want = String(pid).toLowerCase();
  return list.some((x) => String(x).toLowerCase() === want);
}

describe('P2661 Bastien mesh sacred couples (no Homey Virtual)', () => {
  it('locks _TZ3000_vsxvaj9i + TS0043 on button_wireless_3', () => {
    const c = readCompose('button_wireless_3');
    assert.ok(hasMfr(c, '_TZ3000_vsxvaj9i'));
    assert.ok(hasPid(c, 'TS0043'));
  });

  it('locks _TZ3000_ltt60asa + TS0004 on switch_4gang', () => {
    const c = readCompose('switch_4gang');
    assert.ok(hasMfr(c, '_TZ3000_ltt60asa'));
    assert.ok(hasPid(c, 'TS0004'));
  });

  it('locks _TZ3000_fllyghyj + SNZB-02 on climate_sensor (mesh Sous sol / chambre)', () => {
    const c = readCompose('climate_sensor');
    assert.ok(hasMfr(c, '_TZ3000_fllyghyj'));
    assert.ok(hasPid(c, 'SNZB-02'));
  });

  it('locks HOBEIAN + ZG-301Z on switch_1gang', () => {
    const c = readCompose('switch_1gang');
    assert.ok(hasMfr(c, 'HOBEIAN'));
    assert.ok(hasPid(c, 'ZG-301Z'));
  });

  it('skips Time/OTA from RX flood shed (P2661 quietRx)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib', 'tuya', 'TuyaZigbeeDevice.js'),
      'utf8'
    );
    assert.match(src, /quietRx/);
    assert.match(src, /P2661/);
    assert.match(src, /0x000a/);
  });
});
