'use strict';
/**
 * P2972 — "cobsyrain decoding": COBS / hex / base64 / length-prefixed / BE-LE payload normalizer
 * plus Tuya rain-sensor DP decoder (RB-SRAIN01 new layout and legacy TS0601 layout).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const N = require('../../lib/tuya/PayloadNormalizer');
const { decodeRain, detectLayout } = require('../../lib/tuya/RainDpDecoder');

// DP105 VALUE(2) len4 = 120 mV ; DP4 VALUE len4 = 87 % ; DP104 BOOL = 1
const REC = Buffer.from('6902000400000078' + '0402000400000057' + '6801000101', 'hex');

describe('P2972 PayloadNormalizer', () => {
  it('COBS round-trip, including zeros, 254+ runs and empty input', () => {
    const samples = [Buffer.alloc(0), Buffer.from([0]), Buffer.from([0, 0]), Buffer.from([1, 2, 0, 3]), REC, Buffer.alloc(300, 7)];
    for (const s of samples) {
      const enc = N.cobsEncode(s);
      assert.strictEqual(enc[enc.length - 1], 0);
      assert.ok(!enc.subarray(0, -1).includes(0));
      assert.deepStrictEqual(N.cobsDecode(enc), s);
    }
    assert.deepStrictEqual(N.cobsDecode(Buffer.from([0x03, 0x11, 0x22, 0x02, 0x33, 0x00])), Buffer.from([0x11, 0x22, 0x00, 0x33]));
    assert.strictEqual(N.cobsDecode(Buffer.from([0x05, 0x11, 0x00])), null); // truncated
  });

  it('toBuffer accepts Buffer, Uint8Array, arrays, {type:Buffer}, hex (any separators), base64, prefixes', () => {
    const want = Buffer.from([0x69, 0x02, 0x00, 0x04]);
    for (const v of [want, new Uint8Array(want), [0x69, 2, 0, 4], { type: 'Buffer', data: [0x69, 2, 0, 4] },
      '69020004', '0x69020004', '69 02 00 04', '69:02:00:04', '0x69,0x02,0x00,0x04', 'hex:69020004',
      'b64:' + want.toString('base64'), want.toString('base64')]) {
      assert.deepStrictEqual(N.toBuffer(v), want, JSON.stringify(v));
    }
    assert.strictEqual(N.toBuffer(null), null);
    assert.strictEqual(N.toBuffer([300]), null);
    assert.deepStrictEqual(N.toBuffer('cobs:' + N.cobsEncode(want).toString('hex')), want);
  });

  it('numbers: BE default, explicit LE, automatic LE fallback when BE exceeds max', () => {
    assert.strictEqual(N.readNumber(Buffer.from([0x00, 0x78])), 120);
    assert.strictEqual(N.readNumber(Buffer.from([0x78, 0x00]), { endian: 'le' }), 120);
    assert.strictEqual(N.toNumber(Buffer.from([0x57, 0, 0, 0]), { max: 100 }), 87);
    assert.strictEqual(N.toNumber('0x00000057'), 87); // digit-only strings stay decimal
    assert.strictEqual(N.toNumber('00000057'), 57);
    assert.strictEqual(N.toNumber(42), 42);
    assert.strictEqual(N.toNumber('42'), 42);
    assert.strictEqual(N.toNumber(true), 1);
    assert.strictEqual(N.toNumber('not a number!'), null);
    assert.strictEqual(N.readNumber(Buffer.from([0xFF, 0xFE]), { signed: true }), -2);
  });

  it('parses DP records from raw, hex, base64, COBS, length-prefixed (1B, 2B BE/LE) and seq-header forms', () => {
    const lp1 = Buffer.concat([Buffer.from([REC.length]), REC]);
    const lpBE = Buffer.concat([Buffer.from([0, REC.length]), REC]);
    const lpLE = Buffer.concat([Buffer.from([REC.length, 0]), REC]);
    const seq = Buffer.concat([Buffer.from([0x12, 0x34]), REC]);
    const forms = [REC, REC.toString('hex'), REC.toString('base64'), N.cobsEncode(REC), N.cobsEncode(REC).toString('hex'), lp1, lpBE, lpLE, seq,
      'cobs:' + N.cobsEncode(lp1).toString('hex')];
    for (const f of forms) {
      const r = N.normalizePayload(f);
      assert.ok(r && r.records, `no records for ${Buffer.isBuffer(f) ? f.toString('hex') : f}`);
      assert.deepStrictEqual(r.records.map((x) => [x.dp, x.value]), [[105, 120], [4, 87], [104, true]]);
    }
  });

  it('little-endian record length fallback and garbage tolerance', () => {
    const le = Buffer.from('6902040000000078', 'hex'); // len 0x0004 written LE
    assert.deepStrictEqual(N.parseDpRecords(le).map((r) => r.value), [120]);
    assert.strictEqual(N.normalizePayload('zz').records, null);
    assert.strictEqual(N.normalizePayload(undefined), null);
  });
});

describe('P2972 RainDpDecoder', () => {
  it('RB-SRAIN01 layout (Z2M): DP4 battery, DP101-103 mV, DP104 cleaning, DP105 rain mV', () => {
    const r = decodeRain(REC);
    assert.strictEqual(r.layout, 'rb_srain01');
    assert.deepStrictEqual(r.values, { rain_mv: 120, battery: 87, cleaning: true, raining: true });
    const dry = decodeRain({ 105: 20, 101: 1500 }, { mfr: '_TZ3210_tgvtvdoc' });
    assert.strictEqual(dry.values.raining, false);
    assert.strictEqual(dry.values.illuminance_mv, 1500);
  });

  it('legacy TS0601 layout: DP1 rain, DP2 level, DP15 battery; LE Buffer values; unknown DPs kept', () => {
    const r = decodeRain([{ dp: 1, value: 'rain' }, { dp: 2, data: Buffer.from([40, 0, 0, 0]) }, { dp: 15, value: '0x00000050' }, { dp: 200, value: 9 }]);
    assert.strictEqual(r.layout, 'legacy_ts0601');
    assert.strictEqual(r.values.raining, true);
    assert.strictEqual(r.values.rain_level, 40);
    assert.strictEqual(r.values.battery, 80);
    assert.deepStrictEqual(r.unknown, { 200: 9 });
    assert.strictEqual(decodeRain({ 1: 0 }).values.raining, false);
    assert.strictEqual(detectLayout([103]), 'rb_srain01');
    assert.strictEqual(decodeRain('nothing'), null);
  });

  it('rain_sensor driver uses the normalizer for numeric DPs and DP105 (additive, IAS stays)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'drivers/rain_sensor/device.js'), 'utf8');
    assert.ok(/require\('\.\.\/\.\.\/lib\/tuya\/PayloadNormalizer'\)/.test(src));
    assert.ok(/105: \{ capability: 'alarm_water', transform: rainMv\(50\) \}/.test(src));
    assert.ok(/_setupIASZone/.test(src));
    // same numbers as before for plain numeric DPs
    const { toNumber } = N;
    const rainMv = (t) => (v) => { const n = toNumber(v, { max: 100000 }); return n == null ? v !== 0 && v !== false && v !== '0' : n > t; };
    assert.strictEqual(rainMv(50)(51), true);
    assert.strictEqual(rainMv(50)(50), false);
    assert.strictEqual(rainMv(50)(Buffer.from([0, 0, 0, 0x78])), true);
    assert.strictEqual(rainMv(0)(true), true);
  });

  it('documented interpretation + credits', () => {
    const doc = fs.readFileSync(path.join(__dirname, '..', '..', 'docs/knowledge/P2972_COBS_RAIN_DECODING.md'), 'utf8');
    assert.ok(/COBS/.test(doc) && /RB-SRAIN01/.test(doc) && /interpret/i.test(doc));
    assert.ok(/P2972/.test(fs.readFileSync(path.join(__dirname, '..', '..', 'CREDITS.md'), 'utf8')));
  });
});
