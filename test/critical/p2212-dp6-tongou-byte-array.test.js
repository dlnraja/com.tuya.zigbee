'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseTongouToqSysJztDp6, toBuffer } = require('../../lib/tuya/DpByteArrayProfiles');

describe('P2212 Tongou DP6 byte_array', () => {
  it('decodes voltage/current/power from composite buffer', () => {
    // header + V=2243 (224.3V) + I=4940 (4.94A) + P=10970 (1097W) — illustrative BE u16
    const buf = Buffer.alloc(7);
    buf[0] = 0x00;
    buf.writeUInt16BE(2243, 1);
    buf.writeUInt16BE(4940, 3);
    buf.writeUInt16BE(10970, 5);
    const r = parseTongouToqSysJztDp6(buf);
    assert.equal(r.ok, true);
    assert.ok(r.decoded.measure_voltage >= 220 && r.decoded.measure_voltage <= 230);
    assert.ok(r.decoded.measure_current >= 4.9 && r.decoded.measure_current <= 5);
    assert.ok(r.decoded.measure_power >= 1090 && r.decoded.measure_power <= 1100);
  });

  it('rejects too-short buffers', () => {
    const r = parseTongouToqSysJztDp6(Buffer.from([0, 1, 2]));
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'too_short');
  });

  it('toBuffer accepts comma-separated string', () => {
    const b = toBuffer('0,8,192,19,19,136,43');
    assert.ok(Buffer.isBuffer(b));
    assert.equal(b.length, 7);
  });
});
