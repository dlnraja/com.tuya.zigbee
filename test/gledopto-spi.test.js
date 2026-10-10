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
  });
  it('maps dim to DP3 10-1000', () => {
    assert.strictEqual(dimToDp(0), 10);
    assert.strictEqual(dimToDp(0.5), 500);
    assert.strictEqual(dimToDp(1), 1000);
  });
  it('exact driver carries the couples, switch_1gang keeps them (reviewed exception)', () => {
    const j = compose('led_controller_spi_tuya');
    assert.deepStrictEqual(j.zigbee.manufacturerName.filter((m) => m.startsWith('_TZE')).sort(), ['_TZE204_8fffc3kb', '_TZE284_gt5al3bl']);
    assert.strictEqual(j.class, 'light');
    assert.ok(compose('switch_1gang').zigbee.manufacturerName.includes('_TZE204_8fffc3kb'));
    const rev = JSON.parse(fs.readFileSync(path.join(root, 'data/native-matrix-reviewed-duals.json'), 'utf8')).entries;
    for (const c of ['_TZE204_8fffc3kb|TS0601', '_TZE284_gt5al3bl|TS0601']) {
      assert.ok(rev.some((e) => e.couple === c && e.drivers.includes('led_controller_spi_tuya')), c);
    }
  });
});

describe('Tuya multi-DP single frame (GL-SPI-206P burst guard)', () => {
  const { toRecords, fullFrame, sendMultiDp } = require('../lib/tuya/TuyaMultiDpFrame');
  it('packs DP1 + DP3 in one TY_DATA_REQUEST', () => {
    const r = toRecords([{ dp: 1, value: true, type: 'bool' }, { dp: 3, value: 500, type: 'value' }]);
    assert.strictEqual(fullFrame(r, 0x0102).toString('hex'), '0102' + '01010001' + '01' + '03020004' + '000001f4');
  });
  it('uses the datapoint command once with the tail records appended', async () => {
    const calls = [];
    const dev = { zclNode: { endpoints: { 1: { clusters: { tuya: { datapoint: async (a) => calls.push(a) } } } } } };
    assert.strictEqual(await sendMultiDp(dev, [{ dp: 2, value: 1, type: 'enum' }, { dp: 61, value: Buffer.from([0xaa]), type: 'raw' }]), true);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].data.toString('hex'), '01' + '3d000001' + 'aa');
  });
  it('colour frame keeps the given brightness', () => {
    assert.strictEqual(colourPayload(0, 1, 300).toString('hex').slice(-4), '012c');
  });
});
