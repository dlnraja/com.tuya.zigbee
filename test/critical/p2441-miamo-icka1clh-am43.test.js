'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2441 MIAMO AM43 icka1clh → curtain_motor', () => {
  it('compose locks couple on curtain_motor not shutter', () => {
    const motor = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8'));
    const shutter = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor_shutter/driver.compose.json'), 'utf8'));
    const has = (list, v) => (list || []).some((x) => String(x).toLowerCase() === v.toLowerCase());
    assert.ok(has(motor.zigbee.manufacturerName, '_TZE200_icka1clh'));
    assert.ok(has(motor.zigbee.productId, 'TS0601'));
    assert.ok(!has(shutter.zigbee.manufacturerName, '_TZE200_icka1clh'));
  });

  it('device treats icka1clh as battery tubular / AM43 family', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/device.js'), 'utf8');
    assert.ok(src.includes('icka1clh'));
    assert.ok(src.includes('zah67ekd'));
    assert.ok(src.includes('P2441'));
  });

  it('registry forbids shutter for the couple', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const row = (reg.cases || []).find((c) => c.id === 'p2441-miamo-icka1clh-am43-curtain');
    assert.ok(row);
    assert.strictEqual(row.canonicalDriver, 'curtain_motor');
    assert.ok((row.forbiddenDrivers || []).includes('curtain_motor_shutter'));
  });
});
