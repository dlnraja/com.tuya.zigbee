'use strict';

/**
 * P2769 — Tuya DP type VALUE is a signed big-endian int32.
 * A negative temperature (raw -22 = -2.2 °C) must not decode as 4294967274.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const { decodeTuyaValue, toSigned32 } = require('../../lib/tuya/TuyaDpValue');

const be32 = (n) => { const b = Buffer.alloc(4); b.writeInt32BE(n, 0); return b; };

describe('P2769 signed DP VALUE decoding', () => {
  it('decodes negative int32', () => {
    assert.equal(decodeTuyaValue(be32(-22)), -22);
    assert.equal(decodeTuyaValue(be32(-1)), -1);
    assert.equal(decodeTuyaValue(be32(-400)) / 10, -40);
  });

  it('keeps positive values and short buffers unchanged', () => {
    assert.equal(decodeTuyaValue(be32(235)), 235);
    assert.equal(decodeTuyaValue(be32(2147483647)), 2147483647);
    assert.equal(decodeTuyaValue(Buffer.from([0x01, 0x2c])), 300);
    assert.equal(decodeTuyaValue(Buffer.from([0x07])), 7);
  });

  it('reads only the first 4 bytes of a compound frame', () => {
    assert.equal(decodeTuyaValue(Buffer.concat([be32(-5), Buffer.from([1, 2, 3])])), -5);
  });

  it('toSigned32 re-interprets an unsigned decode', () => {
    assert.equal(toSigned32(4294967274), -22);
    assert.equal(toSigned32(100), 100);
    assert.equal(toSigned32(-3), -3);
  });

  it('UniversalDPReceiver decodes 4-byte VALUE as signed by default', () => {
    const src = fs.readFileSync(path.join(root, 'lib/tuya/UniversalDPReceiver.js'), 'utf8');
    assert.match(src, /opts\.signed === undefined \? data\.length >= 4 : signed/);
  });

  it('no type-2 path reads VALUE as unsigned', () => {
    const a = fs.readFileSync(path.join(root, 'lib/TuyaSpecificClusterDevice.js'), 'utf8');
    const b = fs.readFileSync(path.join(root, 'lib/tuya/TuyaSpecificClusterDevice.js'), 'utf8');
    assert.doesNotMatch(a, /datatype === 2\) \{value = data\.readUInt32BE/);
    assert.doesNotMatch(b, /datatype === 2 && data\.length >= 4\) \{value = data\.readUInt32BE/);
    const c = fs.readFileSync(path.join(root, 'lib/devices/TuyaUnifiedDevice.js'), 'utf8');
    const seg = c.slice(c.indexOf('case dataTypes.value:'), c.indexOf('case dataTypes.string:'));
    assert.match(seg, /readInt32BE\(0\)/);
    assert.doesNotMatch(seg, /readUInt32BE\(0\)/);
  });
});
