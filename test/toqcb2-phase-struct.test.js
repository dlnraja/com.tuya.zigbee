'use strict';
/* eslint-env mocha */
const assert = require('assert');
const { decodePhaseVariant2 } = require('../lib/tuya/TuyaPhaseStruct');

describe('#108 TOQCB2-80 phase struct (phaseVariant2 layout)', () => {
  it('decodes voltage, current and power', () => {
    // 230.0 V, 1.234 A, 250 W
    const r = decodePhaseVariant2(Buffer.from([0x08, 0xfc, 0x00, 0x04, 0xd2, 0x00, 0x00, 0xfa]));
    assert.deepStrictEqual(r, { voltage: 230, current: 1.234, power: 250 });
  });
  it('maps the offset-encoded negative power (Z2M #18603 capture)', () => {
    const r = decodePhaseVariant2(Buffer.from([9, 38, 0, 0, 146, 153, 153, 134]));
    assert.strictEqual(r.power, -20);
    assert.strictEqual(r.voltage, 234.2);
  });
  it('accepts base64 and rejects short payloads', () => {
    assert.ok(decodePhaseVariant2(Buffer.from([8, 252, 0, 4, 210, 0, 0, 250]).toString('base64')));
    assert.strictEqual(decodePhaseVariant2(Buffer.from([1, 2, 3])), null);
    assert.strictEqual(decodePhaseVariant2(null), null);
  });
  it('smart_breaker keeps the default map for other breakers and switches TOQCB2-80 to DP16', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../drivers/smart_breaker/device.js'), 'utf8');
    assert.ok(/kv1nvirl\|lyqazpe6/.test(src));
    assert.ok(src.includes("1: { capability: 'meter_power', divisor: 100 }"));
  });
});
