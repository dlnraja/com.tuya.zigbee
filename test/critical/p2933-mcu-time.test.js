'use strict';
const assert = require('assert');
const { EventEmitter } = require('events');
const T = require('../../lib/tuya/TuyaMcuTimeService');
const overlay = require('../../lib/tuya/TuyaZigbeeProfileOverlay');

function fakeCluster() {
  const c = new EventEmitter(); c.sent = [];
  for (const n of ['timeSync', 'mcuGatewayConnectionStatus', 'mcuVersionRequest', 'dataQuery']) {c[n] = async (a) => { c.sent.push([n, a]); };}
  return c;
}
const dev = (extra = {}) => ({ log() {}, homey: { clock: { getTimezone: () => 'Europe/Paris' } }, getSettings: () => ({}), ...extra });

describe('P2933 MCU / time', () => {
  it('Paris offset follows DST', () => {
    assert.strictEqual(T.tzOffsetMinutes('Europe/Paris', new Date('2026-07-01T12:00:00Z')), 120);
    assert.strictEqual(T.tzOffsetMinutes('Europe/Paris', new Date('2026-01-15T12:00:00Z')), 60);
    assert.strictEqual(T.tzOffsetMinutes('UTC', new Date()), 0);
  });
  it('builds 4+4 BE payload with size prefix, epoch 1970 and 2000', () => {
    const now = Date.parse('2026-07-01T12:00:00Z');
    const a = T.buildEf00TimePayload({ now, timeZone: 'Europe/Paris' });
    assert.strictEqual(a.buffer.length, 10); assert.strictEqual(a.buffer.readUInt16BE(0), 8);
    assert.strictEqual(a.buffer.readUInt32BE(2), now / 1000);
    assert.strictEqual(a.buffer.readUInt32BE(6), now / 1000 + 7200);
    const b = T.buildEf00TimePayload({ now, timeZone: 'UTC', epoch: 2000 });
    assert.strictEqual(b.utc, now / 1000 - T.EPOCH_2000);
  });
  it('parses requests and MCU version', () => {
    assert.deepStrictEqual(T.parseTimeRequest({ payload: Buffer.from([0, 7]) }), { seq: 7, variant: 'seq' });
    assert.strictEqual(T.parseMcuVersion({ payload: Buffer.from([0, 1, 0x48]) }).version, '1.0.8');
    assert.deepStrictEqual([...T.buildGatewayStatusPayload()], [0, 1, 1]);
  });
  it('ZCL time values: 2000 epoch, std zone + DST shift', () => {
    const v = T.zclTimeValues({ now: Date.parse('2026-07-01T12:00:00Z'), timeZone: 'Europe/Paris' });
    assert.strictEqual(v.timeZone, 3600); assert.strictEqual(v.dstShift, 3600);
    assert.strictEqual(v.localTime - v.time, 7200);
  });
  it('answers 0x24 once per throttle window, skips when an existing path owns it', async () => {
    const c = fakeCluster(); const s = new T.TuyaMcuTimeService(dev(), c).start();
    const r1 = await s.onTimeRequest({}); const r2 = await s.onTimeRequest({});
    assert.ok(r1.sent); assert.strictEqual(r2.skipped, 'throttled');
    s.stop(); assert.strictEqual(c.listenerCount('timeSync'), 0);
    const s2 = new T.TuyaMcuTimeService(dev({ tuyaEF00Manager: {} }), fakeCluster());
    assert.strictEqual((await s2.onTimeRequest({})).skipped, 'existing_path');
  });
  it('respects the per-device time sync opt-out', async () => {
    const s = new T.TuyaMcuTimeService(dev({ getSetting: (k) => (k === 'tuya_time_sync' ? false : undefined) }), fakeCluster());
    assert.strictEqual((await s.push('request')).skipped, 'disabled');
  });
  it('0x25 answered connected; 0x12 is a lead; rejoin re-queries DPs bounded', async () => {
    const c = fakeCluster(); const s = new T.TuyaMcuTimeService(dev(), c).start();
    c.emit('mcuGatewayConnectionStatus', {}); await new Promise((r) => setImmediate(r));
    assert.strictEqual(c.sent[0][0], 'mcuGatewayConnectionStatus');
    c.emit('mcuOtaNotify', { payload: Buffer.from([1]) }); assert.strictEqual(s.leads.length, 1);
    for (let i = 0; i < 6; i++) {await s.onRejoin();}
    assert.strictEqual(c.sent.filter((x) => x[0] === 'dataQuery').length, 4);
    s.stop();
  });
  it('overlay wires MCU service, version request and short-length fallback', async () => {
    const tuya = fakeCluster();
    const d = dev({ zclNode: { endpoints: { 1: { clusters: { tuya, basic: { readAttributes: async () => ({}) } } } } }, setStoreValue: async () => {} });
    overlay.attach(d, { delayMs: 60000, timeServer: false });
    tuya.emit('dataReport', {});
    await overlay.refresh(d);
    assert.ok(tuya.sent.some((x) => x[0] === 'mcuVersionRequest'));
    tuya.emit('mcuVersionResponse', { payload: Buffer.from([0, 1, 0x40]) });
    const r = overlay.parseFallback(d, Buffer.from('0002' + '01' + '01' + '01' + '01', 'hex'));
    assert.strictEqual(r.format, 'short_len');
    const p = await overlay.refresh(d);
    assert.strictEqual(p.dpFormat, 'short_len'); assert.strictEqual(p.firmware.mcu, '1.0.0');
    overlay.detach(d);
    assert.strictEqual(tuya.listenerCount('timeSync'), 0);
  });
  it('ZCL time server binds only when free', () => {
    const { bindTimeServer, TimeServerBoundCluster } = require('../../lib/zigbee/TimeServerBoundCluster');
    const ep = { bindings: {}, bind(n, impl) { this.bindings[n] = impl; } };
    const d = dev({ zclNode: { endpoints: { 1: ep } } });
    assert.ok(bindTimeServer(d)); assert.ok(ep.bindings.time instanceof TimeServerBoundCluster);
    assert.ok(!bindTimeServer(d));
    assert.ok(Number.isInteger(ep.bindings.time.time));
  });
});
