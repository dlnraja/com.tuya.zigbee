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
  it('led_controller_rgb carries every GL-SPI-206P couple (separate SPI driver removed 20/10/2026)', () => {
    // WHY: Athom AggregateError 9/9 with led_controller_spi_tuya in the master payload (bisect doc
    // docs/knowledge/SPI_ATHOM_BISECT_2026-10-19.md); the published fold host keeps all 12 spellings.
    assert.ok(!fs.existsSync(path.join(root, 'drivers/led_controller_spi_tuya')));
    const rgb = compose('led_controller_rgb');
    assert.strictEqual(rgb.class, 'light');
    assert.deepStrictEqual([...new Set(rgb.zigbee.manufacturerName.filter((m) => /8fffc3kb|gt5al3bl/i.test(m)).map((m) => m.toLowerCase()))].sort(),
      ['_tze204_8fffc3kb', '_tze284_gt5al3bl', '_tze28c1000000_gt5al3bl']);
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
    const ok = await sendMultiDp(dev, [{ dp: 2, value: 1, type: 'enum' }, { dp: 61, value: Buffer.from([0xaa]), type: 'raw' }]);
    assert.strictEqual(ok, true);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].dp, 2);
    assert.strictEqual(calls[0].data.toString('hex'), '01' + '3d000001' + 'aa');
  });
  it('returns false without any EF00 path (caller falls back per DP)', async () => {
    assert.strictEqual(await sendMultiDp({ zclNode: { endpoints: {} } }, [{ dp: 1, value: true, type: 'bool' }]), false);
  });
  it('SPI boot profile keeps colour temperature and light mode (no remove/re-add on the rgb host)', () => {
    const src = fs.readFileSync(path.join(root, 'lib/devices/LedControllerSpiTuyaDevice.js'), 'utf8');
    const caps = JSON.parse(src.match(/const CAPS = (\[[^\]]+\])/)[1].replace(/'/g, '"'));
    assert.ok(/capabilities: CAPS/.test(src));
    for (const c of ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode']) {
      assert.ok(caps.includes(c), c);
      assert.ok(compose('led_controller_rgb').capabilities.includes(c), c);
    }
  });
});
