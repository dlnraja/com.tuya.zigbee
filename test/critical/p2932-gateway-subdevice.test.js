'use strict';
const assert = require('assert');
const { EventEmitter } = require('events');
const hub = require('../../lib/tuya-local/TuyaGatewayHub');

class FakeClient extends EventEmitter {
  constructor(o) { super(); this.opts = o; this.calls = []; this.connects = 0; this.destroyed = false; this._connected = true; }
  async connect() { this.connects++; }
  setSubDP(cid, dp, v) { this.calls.push(['set', cid, dp, v]); return Promise.resolve(); }
  setSubDPs(cid, d) { this.calls.push(['multi', cid, d]); return Promise.resolve(); }
  refreshSub(cid) { this.calls.push(['refresh', cid]); return Promise.resolve(); }
  async destroy() { this.destroyed = true; }
}

describe('P2932 gateway sub-devices (cid)', () => {
  afterEach(() => hub._reset());
  it('shares one gateway client, routes by cid, refcounts', async () => {
    let made = 0; let last;
    const f = (o) => { made++; last = new FakeClient(o); return last; };
    const a = hub.openChannel({ id: 'gw', key: 'k' }, 'c1', f);
    const b = hub.openChannel({ id: 'gw', key: 'k' }, 'c2', f);
    assert.strictEqual(made, 1);
    const got = [];
    a.on('dp-update', (d) => got.push(['a', d])); b.on('dp-update', (d) => got.push(['b', d]));
    last.emit('dp-update-cid', 'c2', { 1: true });
    assert.deepStrictEqual(got, [['b', { 1: true }]]);
    await a.setDP(1, false); await b.setDPs({ 2: 5 }); await a.refresh();
    assert.deepStrictEqual(last.calls, [['set', 'c1', 1, false], ['multi', 'c2', { 2: 5 }], ['refresh', 'c1']]);
    await a.connect(); await b.connect();
    await a.destroy();
    assert.ok(!last.destroyed); assert.strictEqual(last.listenerCount('dp-update-cid'), 1);
    await b.destroy();
    assert.ok(last.destroyed); assert.deepStrictEqual(hub.stats(), []);
  });
  it('client sub-device methods pass cid to tuyapi', async () => {
    const C = require('../../lib/tuya-local/TuyaLocalClient');
    const c = Object.create(C.prototype);
    const sent = [];
    c._device = { set: async (o) => { sent.push(o); }, refresh: async (o) => { sent.push(o); } };
    c._connected = true; c._enqueue = (fn) => fn(); c._log = () => {};
    await c.setSubDP('cid9', 1, true); await c.setSubDPs('cid9', { 1: 1 }); await c.refreshSub('cid9');
    assert.deepStrictEqual(sent, [{ cid: 'cid9', dps: 1, set: true }, { cid: 'cid9', multiple: true, data: { 1: 1 } }, { cid: 'cid9', schema: true }]);
  });
  it('requires gateway id and cid', () => {
    assert.throws(() => hub.openChannel({}, 'c'));
    assert.throws(() => hub.openChannel({ id: 'g' }, ''));
  });
});
