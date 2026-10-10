'use strict';
const assert = require('assert');
const { decodePhase, spmVariant } = require('../lib/tuya/SpmPhaseDecoder');
const { check } = require('../tools/ci/couple-pin-gate');

describe('SPM01/SPM02 energy monitors', () => {
  it('decodes packed phase DP (Z2M #18603 sample: -20 W)', () => {
    const r = decodePhase([9, 38, 0, 0, 146, 153, 153, 134]);
    assert.deepStrictEqual(r, { ok: true, voltage: 234.2, current: 0.146, power: -20 });
  });
  it('decodes positive power and >65 A current', () => {
    const r = decodePhase(Buffer.from([0x09, 0x10, 0x01, 0x11, 0x70, 0x00, 0x04, 0x4c]));
    assert.strictEqual(r.voltage, 232); assert.strictEqual(r.current, 70); assert.strictEqual(r.power, 1100);
  });
  it('rejects short payloads', () => assert.strictEqual(decodePhase([1, 2]).ok, false));
  it('detects variant case-insensitively', () => {
    assert.strictEqual(spmVariant('_TZE200_BCUSNQT8'), 'spm01');
    assert.strictEqual(spmVariant('_tze284_ves1ycwx'), 'spm02');
    assert.strictEqual(spmVariant('_TZE200_other'), null);
  });
  it('couples are pinned to meter drivers, never curtain_motor', () => {
    const { violations, missing } = check();
    assert.deepStrictEqual(violations, []); assert.deepStrictEqual(missing, []);
  });
});
