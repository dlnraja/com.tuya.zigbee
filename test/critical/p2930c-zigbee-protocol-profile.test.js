'use strict';
const assert = require('assert');
const Z = require('../../lib/tuya/TuyaZigbeeProtocolProfile');

describe('P2930c Tuya Zigbee protocol profile', () => {
  it('names every documented EF00 command', () => {
    for (const c of [0x01, 0x02, 0x06, 0x0B, 0x10, 0x11, 0x24, 0x25]) {assert.ok(Z.EF00_COMMANDS[c], c);}
  });
  it('decodes Tuya appVersion bits', () => {
    assert.strictEqual(Z.decodeAppVersion(0x40), '1.0.0');
    assert.strictEqual(Z.decodeAppVersion(0x4a), '1.0.10');
    assert.strictEqual(Z.decodeAppVersion(300), null);
  });
  it('classifies generations and leaves unknown prefixes as leads', () => {
    for (const p of ['_TZ3000_x', '_TZ3210_x']) {assert.strictEqual(Z.generationOf(p).ef00, false);}
    for (const p of ['_TZE200_x', '_TZE204_x', '_TZE284_x']) {assert.strictEqual(Z.generationOf(p).ef00, true);}
    assert.strictEqual(Z.generationOf('_TZQ999_x').status, 'lead');
  });
  it('profiles: HA shared by 3.0/1.2, decided by zclVersion', () => {
    assert.strictEqual(Z.profileOf({ profileId: 0x0104, zclVersion: 3 }).zigbee30, true);
    assert.strictEqual(Z.profileOf({ profileId: 0x0104, zclVersion: 1 }).zigbee30, false);
    assert.strictEqual(Z.profileOf({ profileId: 0x1234 }).status, 'lead');
  });
  it('parses standard, short-length and unknown EF00 frames', () => {
    const std = Buffer.from('0001' + '01' + '01' + '0001' + '01' + '02' + '02' + '0004' + '000000fa', 'hex');
    const r = Z.parseDpFrame(std);
    assert.strictEqual(r.format, 'standard'); assert.strictEqual(r.dps.length, 2); assert.strictEqual(r.dps[1].data.readUInt32BE(0), 250);
    const short = Buffer.from('0002' + '01' + '01' + '01' + '01', 'hex');
    assert.strictEqual(Z.parseDpFrame(short).format, 'short_len');
    assert.strictEqual(Z.parseDpFrame(Buffer.from('0003ff09aabbcc', 'hex')).format, 'lead');
  });
  it('builds a runtime profile with native first', () => {
    const p = Z.buildProfile({ manufacturerName: '_TZE284_abc', appVersion: 0x48, zclVersion: 3, profileId: 0x0104, seenCommands: [0x02, 0x24, 0x11] });
    assert.deepStrictEqual(p.chain, ['native', 'ef00:standard', 'ef00:short_len', 'raw:lead']);
    assert.ok(p.ef00.timeSync && p.ef00.mcuVersion);
    assert.deepStrictEqual(Z.buildProfile({ manufacturerName: '_TZ3000_x' }).chain, ['native', 'raw:lead']);
  });
});
