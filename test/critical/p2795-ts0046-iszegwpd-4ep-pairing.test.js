'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2795 stable backport — #554 4-EP pairing', () => {
  it('wall_remote_6_gang compose declares only EP1–4', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/wall_remote_6_gang/driver.compose.json'), 'utf8'));
    assert.deepStrictEqual(Object.keys(c.zigbee.endpoints).sort(), ['1', '2', '3', '4']);
    assert.ok(c.zigbee.manufacturerName.some((m) => /iszegwpd/i.test(m)));
    assert.ok(c.zigbee.productId.includes('TS0046'));
  });

  it('app id stays stable channel', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    assert.equal(app.id, 'com.dlnraja.tuya.zigbee.stable');
    const d = app.drivers.find((x) => x.id === 'wall_remote_6_gang');
    assert.deepStrictEqual(Object.keys(d.zigbee.endpoints).sort(), ['1', '2', '3', '4']);
  });

  it('device.js soft-fails EF00 TX (reliability)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/wall_remote_6_gang/device.js'), 'utf8');
    assert.ok(src.includes('P2795'));
    assert.ok(src.includes('skipEf00Tx'));
  });
});
