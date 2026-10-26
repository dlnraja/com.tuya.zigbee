'use strict';
/* eslint-env mocha */
const assert = require('assert');
const { signedPower24 } = require('../lib/tuya/TuyaNegPower24');
const { decodePhaseVariant2 } = require('../lib/tuya/TuyaPhaseStruct');
const { decodePhase } = require('../lib/tuya/SpmPhaseDecoder');

describe('P3060 24-bit phase power: offset and two\'s complement negatives', () => {
  it('keeps positive and offset-encoded values unchanged', () => {
    assert.strictEqual(signedPower24(0), 0);
    assert.strictEqual(signedPower24(250), 250);
    assert.strictEqual(signedPower24(0x7fffff), 0x7fffff);
    assert.strictEqual(signedPower24(0x999986), -20);
    assert.strictEqual(signedPower24(0x99999a), 0);
  });
  it('decodes plain two\'s complement above the offset (0xfffff7 = -9 W)', () => {
    assert.strictEqual(signedPower24(0xfffff7), -9);
    assert.strictEqual(signedPower24(0xffffff), -1);
    assert.strictEqual(signedPower24(0x99999b), 0x99999b - 0x1000000);
  });
  it('phase struct decoder handles both captures', () => {
    assert.strictEqual(decodePhaseVariant2(Buffer.from([9, 38, 0, 0, 146, 153, 153, 134])).power, -20);
    const r = decodePhaseVariant2(Buffer.from([9, 38, 0, 0, 29, 255, 255, 247]));
    assert.strictEqual(r.power, -9);
    assert.strictEqual(r.voltage, 234.2);
  });
  it('SPM decoder handles both captures', () => {
    assert.strictEqual(decodePhase(Buffer.from([9, 38, 0, 0, 146, 153, 153, 134])).power, -20);
    assert.strictEqual(decodePhase(Buffer.from([9, 38, 0, 0, 29, 255, 255, 247])).power, -9);
  });
});
