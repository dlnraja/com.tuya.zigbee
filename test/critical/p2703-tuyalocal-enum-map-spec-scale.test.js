'use strict';
/** P2703 — forum 154077 #433/#446/#453 (label=raw enums) and #473 (spec range + scale). */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../lib/tuya-local/OemEnumTokens');
const P = require('../../lib/tuya-local/DPValueParser');

describe('P2703 enum label=raw', () => {
  const csv = 'auto=0,cool=1,dry=2,fan=3,heat=4';
  it('maps both ways', () => {
    assert.equal(E.enumLabelToDevice('cool', csv), '1');
    assert.equal(E.enumLabelToDevice('Heat', csv), '4');
    assert.equal(E.enumDeviceToLabel(4, csv), 'heat');
    assert.equal(E.enumDeviceToLabel('9', csv), '9');
  });
  it('accepts an already-raw token (#446) and plain lists stay identity', () => {
    assert.equal(E.enumLabelToDevice('4', csv), '4');
    assert.equal(E.enumLabelToDevice('cold', 'cold,wet,wind,hot'), 'cold');
    assert.equal(E.enumLabelToDevice('nope', 'cold,hot'), null);
  });
  it('flow options use labels, never label=raw (#453)', () => {
    assert.deepEqual(E.enumFlowOptions('low=1,high=3').map((o) => o.id), ['low', 'high']);
  });
});

describe('P2703 spec range scale', () => {
  it('pir_delay 50..36000 scale 1 = 5..3600 s', () => {
    assert.deepEqual(P.specRangeToReal({ min: 50, max: 36000, step: 1, scale: 1 }), { min: 5, max: 3600, step: 0.1, factor: 10 });
    assert.equal(P.realToSpecRaw(60, { min: 50, max: 36000, scale: 1 }), 600);
    assert.equal(P.realToSpecRaw(1, { min: 50, max: 36000, scale: 1 }), 50);
    assert.equal(P.specRangeToReal({ min: 0, max: 100 }).max, 100);
  });
});
