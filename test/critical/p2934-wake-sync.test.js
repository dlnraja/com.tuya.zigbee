'use strict';
const assert = require('assert');
const { EventEmitter } = require('events');
const T = require('../../lib/tuya/TuyaMcuTimeService');

function cl() { const c = new EventEmitter(); c.sent = []; for (const n of ['timeSync', 'dataQuery', 'mcuGatewayConnectionStatus', 'mcuVersionRequest']) {c[n] = async (a) => { c.sent.push([n, a]); };} return c; }
const store = {};
const dev = (caps = ['measure_battery'], extra = {}) => ({ log() {}, homey: { clock: { getTimezone: () => 'Europe/Paris' } }, getSettings: () => ({}), hasCapability: (c) => caps.includes(c), setStoreValue: async (k, v) => { store[k] = v; }, driver: { manifest: { class: 'sensor' } }, ...extra });
// ZCL cluster-specific frame: fc=0x09 (cluster, server->client), seq, cmd
const f = (cmd) => Buffer.from([0x09, 0x01, cmd, 0x00, 0x01]);

describe('P2934 time requests on every path + wake flush', () => {
  it('raw EF00 0x24 frame is answered with UTC+local', async () => {
    const c = cl(); const s = new T.TuyaMcuTimeService(dev(), c);
    const r = await s.onFrame(0xEF00, f(0x24));
    assert.ok(r.request.sent);
    const b = c.sent[0][1].payload; assert.strictEqual(b.readUInt32BE(6) - b.readUInt32BE(2), T.tzOffsetMinutes('Europe/Paris') * 60);
  });
  it('event + raw duplicate of one request answers once', async () => {
    const c = cl(); const s = new T.TuyaMcuTimeService(dev(), c).start();
    c.emit('timeSync', {}); await s.onFrame(0xEF00, f(0x24));
    assert.strictEqual(c.sent.filter((x) => x[0] === 'timeSync').length, 1); s.stop();
  });
  it('0x28 and E000 are leads, not answered', async () => {
    const c = cl(); const s = new T.TuyaMcuTimeService(dev([]), c);
    await s.onFrame(0xEF00, f(0x28)); await s.onFrame(0xE000, f(0x01));
    assert.strictEqual(c.sent.length, 0); assert.strictEqual(s.leads.length, 2);
  });
  it('wake sign flushes queued writes then pushes time, throttled', async () => {
    const c = cl(); const s = new T.TuyaMcuTimeService(dev(), c);
    const done = [];
    s.enqueue('target', async () => done.push('a1')); s.enqueue('target', async () => done.push('a2')); s.enqueue('mode', async () => done.push('m'));
    const r = await s.onFrame(0x0402, f(0x0a));
    assert.deepStrictEqual(done, ['a2', 'm']); assert.strictEqual(r.wake.flush.flushed, 2);
    assert.ok(r.wake.time.sent);
    const r2 = await s.onWake('frame');
    assert.strictEqual(r2.time.skipped, 'wake_throttled');
    assert.ok(s.diag.some((d) => d.kind === 'flush') && s.diag.some((d) => d.kind === 'time'));
    assert.ok(store.tuya_time_sync_diag);
  });
  it('pollControl check-in is a wake sign; failed writes are kept', async () => {
    const s = new T.TuyaMcuTimeService(dev(), cl());
    s.enqueue('x', async () => { throw new Error('asleep'); });
    const r = await s.onFrame(0x0020, f(0x00));
    assert.strictEqual(r.wake.flush.kept, 1);
  });
  it('pending queue and diag are bounded', async () => {
    const s = new T.TuyaMcuTimeService(dev(), cl());
    for (let i = 0; i < 50; i++) {s.enqueue(`k${i}`, async () => {});}
    assert.strictEqual(s.pending.length, 20);
    for (let i = 0; i < 50; i++) {s._diag('t');}
    assert.strictEqual(s.diag.length, 20);
  });
  it('remotes only flush, no time push', async () => {
    const s = new T.TuyaMcuTimeService(dev([], { driver: { manifest: { class: 'button' } } }), cl());
    const r = await s.onWake('frame'); assert.strictEqual(r.time, null);
  });
  it('rejoin flushes, re-queries DPs and pushes time even with an existing path', async () => {
    const c = cl(); const s = new T.TuyaMcuTimeService(dev(['measure_battery'], { tuyaEF00Manager: {} }), c);
    s.enqueue('w', async () => {});
    const r = await s.onRejoin();
    assert.ok(r.dataQuery && r.time.sent && r.flush.flushed === 1);
  });
});
