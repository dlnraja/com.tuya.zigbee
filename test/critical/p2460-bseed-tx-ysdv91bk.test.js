'use strict';

/**
 * P2460 — GH#546 BSEED TX setOn/setOff + GH#545 ysdv91bk wall_1gang match
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');

const ROOT = path.join(__dirname, '..', '..');
const DeviceFingerprintDB = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));

describe('P2460 BSEED TX + ysdv91bk pairing', () => {
  it('switch_2gang ZCL-only TX prefers setOn/setOff over writeAttributes', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/switch_2gang/device.js'), 'utf8');
    assert.ok(src.includes('P2460'), 'P2460 marker');
    assert.ok(src.includes('setOn'), 'uses setOn');
    assert.ok(src.includes('setOff'), 'uses setOff');
    // writeAttributes must not be preferred before setOn in the TX block
    const txBlock = src.slice(src.indexOf('async _setGangOnOff'), src.indexOf('return super._setGangOnOff'));
    assert.ok(txBlock.includes('typeof onOff.setOn'), 'TX prefers setOn command');
    assert.ok(txBlock.includes('typeof onOff.setOff'), 'TX prefers setOff command');
    assert.ok(/P2460.*writeAttributes|writeAttributes.*BSEED|setOn\/setOff/i.test(src), 'documents writeAttributes anti-pattern');
  });

  it('ysdv91bk+TS0001 routes to wall_switch_1gang_1way', () => {
    const hit = DeviceFingerprintDB.lookup('_TZ3000_ysdv91bk', 'TS0001');
    assert.ok(hit);
    assert.strictEqual(hit.driver, 'wall_switch_1gang_1way');
    const compose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/wall_switch_1gang_1way/driver.compose.json'), 'utf8'));
    assert.ok(compose.zigbee.manufacturerName.some((m) => /ysdv91bk/i.test(m)));
    const s1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/switch_1gang/driver.compose.json'), 'utf8'));
    assert.ok(!s1.zigbee.manufacturerName.some((m) => /ysdv91bk/i.test(m)), 'must leave switch_1gang');
  });

  it('l9brjwau+TS0002 stays on wall_switch_2gang_1way + sacred-keep', () => {
    const hit = DeviceFingerprintDB.lookup('_TZ3000_l9brjwau', 'TS0002');
    assert.strictEqual(hit.driver, 'wall_switch_2gang_1way');
    const keep = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8'));
    const pin = (keep.couples || []).find((c) => /l9brjwau/i.test(c.mfr) && c.pid === 'TS0002');
    assert.ok(pin);
    assert.strictEqual(pin.driverId, 'wall_switch_2gang_1way');
  });

  it('blhvsaqf+TS0001 routes to wall_switch_1gang_1way (P2462)', () => {
    const hit = DeviceFingerprintDB.lookup('_TZ3000_blhvsaqf', 'TS0001');
    assert.ok(hit);
    assert.strictEqual(hit.driver, 'wall_switch_1gang_1way');
    const compose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/wall_switch_1gang_1way/driver.compose.json'), 'utf8'));
    assert.ok(compose.zigbee.manufacturerName.some((m) => /blhvsaqf/i.test(m)));
    const s1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/switch_1gang/driver.compose.json'), 'utf8'));
    assert.ok(!s1.zigbee.manufacturerName.some((m) => /blhvsaqf/i.test(m)), 'must leave switch_1gang');
  });

  it('app.json mirrors compose for ysdv91bk and l9brjwau', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const w1 = app.drivers.find((d) => d.id === 'wall_switch_1gang_1way');
    const w2 = app.drivers.find((d) => d.id === 'wall_switch_2gang_1way');
    const s1 = app.drivers.find((d) => d.id === 'switch_1gang');
    assert.ok(w1.zigbee.manufacturerName.some((m) => /ysdv91bk/i.test(m)));
    assert.ok(w2.zigbee.manufacturerName.some((m) => /l9brjwau/i.test(m)));
    assert.ok(!s1.zigbee.manufacturerName.some((m) => /ysdv91bk/i.test(m)));
  });
});
