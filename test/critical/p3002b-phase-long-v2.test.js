'use strict';
// P3002b — 18-byte V2 phase datapoint (Powbay JGQW01 DP6), layout from make-all/tuya-local
// commit 8b12d78806 (issue #5776). 8-byte payloads keep the historical decoding.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { decodePhaseLongV2, isPhaseLongV2 } = require('../../lib/tuya/TuyaPhaseLongV2');
const { decodePhaseVariant2 } = require('../../lib/tuya/TuyaPhaseStruct');
const { decodePhase } = require('../../lib/tuya/SpmPhaseDecoder');

const LONG = Buffer.from([0x02, 0x0f, 0x08, 0xfe, 0x00, 0x04, 0xd2, 0x00, 0x00, 0xfa,
  0x00, 0x00, 0x32, 0x00, 0x01, 0x04, 0x60, 0x00]);

describe('P3002b phase_a 18-byte V2', () => {
  it('decodes voltage/current/power/reactive/apparent/PF', () => {
    assert.deepEqual(decodePhaseLongV2(LONG), {
      voltage: 230.2, current: 1.234, power: 250, reactivePower: 50, apparentPower: 260, powerFactor: 0.96,
    });
  });

  it('direction flags make the matching values negative', () => {
    const b = Buffer.from(LONG); b[17] = 0x0f;
    const r = decodePhaseLongV2(b);
    assert.equal(r.current, -1.234); assert.equal(r.power, -250);
    assert.equal(r.reactivePower, -50); assert.equal(r.powerFactor, -0.96);
    assert.equal(r.apparentPower, 260);
  });

  it('both existing decoders route the long payload (base64 too) and keep 8-byte behaviour', () => {
    assert.equal(decodePhaseVariant2(LONG).voltage, 230.2);
    assert.equal(decodePhaseVariant2(LONG.toString('base64')).power, 250);
    const spm = decodePhase(LONG); assert.equal(spm.ok, true); assert.equal(spm.current, 1.234);
    const short = Buffer.from([0x08, 0xfc, 0x00, 0x04, 0xd2, 0x00, 0x00, 0xfa]);
    assert.deepEqual(decodePhaseVariant2(short), { voltage: 230, current: 1.234, power: 250 });
    assert.equal(decodePhase(short).voltage, 230);
  });

  it('only exact V2 shape is accepted', () => {
    assert.equal(isPhaseLongV2(LONG.subarray(0, 17)), false);
    const v1 = Buffer.from(LONG); v1[0] = 0x01; assert.equal(isPhaseLongV2(v1), false);
    assert.equal(decodePhaseLongV2(null), null);
  });
});
