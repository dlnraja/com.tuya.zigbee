'use strict';
/* eslint-env mocha */
const assert = require('assert');
const { inferSockets, subSocketPlan } = require('../lib/tuya-local/MultiSocketInference');
const { inferCover } = require('../lib/tuya-local/CoverModeInference');
const { buildSupportBundle, maskIp } = require('../lib/tuya-local/SupportBundle');

describe('P2950 multi-socket inference (forum 154077 #526)', () => {
  it('detects three outlets + usb + countdowns', () => {
    const r = inferSockets({ 1: true, 2: false, 3: true, 7: false, 9: 0, 10: 0, 11: 0 });
    assert.strictEqual(r.mode, 'multi');
    assert.deepStrictEqual(r.sockets.map((s) => s.dp), [1, 2, 3, 7]);
    assert.strictEqual(r.sockets[1].countdownDp, 10);
  });
  it('falls back to single plug when only DP1', () => {
    assert.strictEqual(inferSockets({ 1: true, 18: 120 }).mode, 'single');
    assert.strictEqual(inferSockets(null).sockets.length, 0);
  });
  it('requires contiguous boolean outlets', () => {
    assert.strictEqual(inferSockets({ 1: true, 3: true }).mode, 'single');
    assert.strictEqual(inferSockets({ 1: true, 2: 5 }).mode, 'single');
  });
  it('builds sub-socket ids', () => {
    const p = subSocketPlan('abc', { 1: true, 2: true });
    assert.deepStrictEqual(p.map((x) => x.id), ['abc:1', 'abc:2']);
    assert.deepStrictEqual(subSocketPlan('abc', { 1: true }), []);
  });
});

describe('P2950 cover inference (forum 154077 #527)', () => {
  it('reads enum range from schema with high confidence', () => {
    const r = inferCover({ 1: 'stop', 2: 40 }, { 1: { type: 'enum', range: ['open', 'stop', 'close', 'continue'] } });
    assert.strictEqual(r.controlDp, 1); assert.strictEqual(r.positionDp, 2); assert.strictEqual(r.confidence, 'high');
  });
  it('infers from value alone with low confidence', () => {
    assert.strictEqual(inferCover({ 1: 'close' }).confidence, 'low');
    assert.deepStrictEqual(inferCover({ 1: 'FZ' }).tokens, { open: 'ZZ', close: 'FZ', stop: 'STOP' });
  });
  it('does not treat a boolean plug or ambiguous on/off value as cover', () => {
    assert.strictEqual(inferCover({ 1: true }), null);
    assert.strictEqual(inferCover({ 1: 'on' }), null);
  });
});

describe('P2950 support bundle (forum 154077 #528)', () => {
  it('redacts secrets and masks ip', () => {
    const b = buildSupportBundle({ device: { id: 'd1', local_key: 'SECRET', ip: '192.168.1.42' }, settings: { localKey: 'S2', protocol_version: '3.4' }, log: ['x localKey="abc123" y'], now: new Date(0) });
    const s = JSON.stringify(b);
    assert.ok(!s.includes('SECRET') && !s.includes('S2') && !s.includes('abc123'));
    assert.strictEqual(b.device.ip, '192.168.x.42');
    assert.strictEqual(b.protocol, '3.4');
  });
  it('maskIp handles empty', () => { assert.strictEqual(maskIp(''), null); });
});
