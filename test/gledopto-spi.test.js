'use strict';
/* eslint-env mocha */
// Gledopto GL-SPI-206P exact-pair driver (DP layout from zigbee-herdsman-converters gledopto.ts).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { colourPayload, dimToDp } = require('../lib/tuya/SpiPixelColour');

const root = path.join(__dirname, '..');
const compose = (d) => JSON.parse(fs.readFileSync(path.join(root, 'drivers', d, 'driver.compose.json'), 'utf8'));

describe('Gledopto GL-SPI-206P', () => {
  it('builds the DP61 colour frame (hue, saturation 0-1000, value 1000)', () => {
    assert.strictEqual(colourPayload(0.5, 0.5).toString('hex'), '0001011400' + '00b4' + '01f4' + '03e8');
    assert.strictEqual(colourPayload(2, -1).toString('hex'), '0001011400' + '0000' + '0000' + '03e8');
    assert.strictEqual(colourPayload(1, 1, 300).toString('hex'), '0001011400' + '0000' + '03e8' + '012c');
  });
  it('maps dim to DP3 10-1000', () => {
    assert.strictEqual(dimToDp(0), 10);
    assert.strictEqual(dimToDp(0.5), 500);
    assert.strictEqual(dimToDp(1), 1000);
  });
  it('exact driver carries the couples, switch_1gang keeps them (reviewed exception)', () => {
    const j = compose('led_controller_spi_tuya');
    assert.deepStrictEqual([...new Set(j.zigbee.manufacturerName.filter((m) => /^_tze/i.test(m)).map((m) => m.toLowerCase()))].sort(), ['_tze204_8fffc3kb', '_tze284_gt5al3bl', '_tze28c1000000_gt5al3bl']);
    assert.strictEqual(j.class, 'light');
    assert.ok(compose('switch_1gang').zigbee.manufacturerName.includes('_TZE204_8fffc3kb'));
    const rev = JSON.parse(fs.readFileSync(path.join(root, 'data/native-matrix-reviewed-duals.json'), 'utf8')).entries;
    for (const c of ['_TZE204_8fffc3kb|TS0601', '_TZE284_gt5al3bl|TS0601']) {
      assert.ok(rev.some((e) => e.couple === c && e.drivers.includes('led_controller_spi_tuya')), c);
    }
  });
});
