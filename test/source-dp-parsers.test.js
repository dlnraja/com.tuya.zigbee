'use strict';
/* eslint-env mocha */
// #99 W10: per-source DP parsers return facts only (couples, DP ids, names), never throw.
const assert = require('assert');
const { parseZ2M, parseZHA, parseTuyaLocal, forCouple } = require('../tools/sources/dp-parsers');

const Z2M = `
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_r6kfl9ta"]),
        model: "ZY-N1",
        vendor: "Tuya",
        description: "Sound level sensor",
        meta: {
            tuyaDatapoints: [
                [1, "noise", tuya.valueConverter.raw],
                // dp 2: not implemented
                [8, "noise_status", tuya.valueConverterBasic.lookup({a: tuya.enum(0)})],
                [101, null, {from: (v) => v}],
            ],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE28C1000000_jlbsptkl", "_TZE284_xxxxxxxx"]),
        model: "X",
        vendor: "Tuya",
        description: "Long name",
    },`;

describe('source dp-parsers (#99)', () => {
  it('parses Z2M couples and tuyaDatapoints', () => {
    const defs = parseZ2M(Z2M);
    const zy = forCouple(defs, '_tze204_r6kfl9ta')[0];
    assert.strictEqual(zy.model, 'ZY-N1');
    assert.deepStrictEqual(zy.dps.map((d) => d.dp), [1, 8, 101]);
    assert.strictEqual(zy.dps[0].name, 'noise');
    assert.strictEqual(zy.dps[2].name, null);
  });
  it('keeps verified long Tuya names (R16 exception)', () => {
    const defs = parseZ2M(Z2M);
    assert.strictEqual(forCouple(defs, '_TZE28C1000000_jlbsptkl').length, 1);
  });
  it('parses ZHA v2 builder and tuya-local YAML', () => {
    const zha = parseZHA(`(TuyaQuirkBuilder("_TZE204_abcdefgh", "TS0601")
      .applies_to("_TZE284_abcdefgh", "TS0601")
      .tuya_switch(dp_id=1, attribute_name="on_off")
      .add_to_registry())`);
    assert.deepStrictEqual(zha[0].couples.map((c) => c.mfr), ['_TZE204_abcdefgh', '_TZE284_abcdefgh']);
    assert.deepStrictEqual(zha[0].dps, [{ dp: 1, name: 'on_off', converter: 'tuya_switch' }]);
    const tl = parseTuyaLocal('name: Plug\nproducts:\n  - id: _TZ3000_abcdefgh\nprimary_entity:\n  dps:\n    - id: 1\n      name: switch\n      type: boolean\n');
    assert.strictEqual(tl[0].dps[0].dp, 1);
    assert.strictEqual(tl[0].couples[0].mfr, '_TZ3000_abcdefgh');
  });
  it('never throws on junk', () => {
    assert.deepStrictEqual(parseZ2M(null), []);
    assert.deepStrictEqual(parseZHA(undefined), []);
    assert.deepStrictEqual(parseTuyaLocal(42), []);
  });
});
