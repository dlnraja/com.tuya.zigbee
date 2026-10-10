'use strict';
const assert = require('assert');
const M = require('../lib/xiaomi/XiaomiSpecialHandler.js');
const H = M.XiaomiSpecialHandler || M;
const h = new H({ log() {}, error() {}, zclNode: { endpoints: {} } });
describe('lumi tag/type/value decoder (0xFF01 / 0xFCC0:0x00F7)', () => {
  it('decodes battery mV and device temperature', () => {
    const d = h.parseXiaomiData(Buffer.from('0121d10b0328190421a8130521090006240100000000', 'hex'));
    assert.strictEqual(d.voltage, 3025);
    assert.strictEqual(d.deviceTemperature, 25);
  });
  it('returns {} from parseLumiF7 on garbage, legacy path untouched', () => {
    assert.deepStrictEqual(h.parseLumiF7(Buffer.from('01ff', 'hex')), {});
  });
});
