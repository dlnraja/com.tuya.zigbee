'use strict';

/**
 * P3080 batch D — manual_dps (idea from rospogrigio/localtuya + xZetsubou/hass-localtuya, own code).
 * Contre quoi: some firmwares never put a DP (energy counters, extra sensors) in their status answer.
 * Opt-in only (`manual_dps` key, "18,19,20"); absent = previous behaviour. Max 32 ids, one request
 * per connection after 5 s, 3 s timeout, timer cleared on teardown.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const { EventEmitter } = require('events');

class FakeTuyAPI extends EventEmitter {
  constructor(cfg) { super(); this.device = { ip: cfg.ip }; this.calls = []; FakeTuyAPI.last = this; }
  connect() { setImmediate(() => this.emit('connected')); return Promise.resolve(); }
  disconnect() { return Promise.resolve(); }
  refresh(opts) { this.calls.push(opts); return Promise.resolve({}); }
  set() { return Promise.resolve(); }
}

function freshLoad(rel, stubs) {
  const p = require.resolve(rel);
  const prev = require.cache[p];
  delete require.cache[p];
  const orig = Module._load;
  Module._load = function (req, ...rest) { return req in stubs ? stubs[req] : orig.call(this, req, ...rest); };
  try { return require(p); } finally {
    Module._load = orig;
    if (prev) {require.cache[p] = prev;} else {delete require.cache[p];}
  }
}

const TuyaLocalClient = freshLoad('../../lib/tuya-local/TuyaLocalClient', { tuyapi: FakeTuyAPI });
TuyaLocalClient.__TuyAPI = FakeTuyAPI;
const TuyaLocalDevice = freshLoad('../../lib/tuya-local/TuyaLocalDevice', { homey: { Device: class {}, Driver: class {}, App: class {} } });
const tick = () => new Promise((r) => setImmediate(r));

function fakeDevice(settings, client) {
  const timers = [];
  return {
    timers,
    d: {
      _connected: true, _destroyed: false, _client: client,
      getSetting: (k) => settings[k], getStoreValue: () => undefined, log() {},
      homey: { setTimeout: (fn, ms) => { const t = { fn, ms }; timers.push(t); return t; }, clearTimeout() {} },
    },
  };
}

describe('P3080 manual_dps', () => {
  it('client.requestDps sends a bounded explicit DP request', async () => {
    const c = new TuyaLocalClient({ id: 'x', key: '0123456789abcdef', ip: '10.0.0.3', version: '3.3', pollIntervalMs: 0 });
    c.on('error', () => {}); c._scheduleReconnect = () => {};
    await c.connect(); await tick();
    assert.equal(await c.requestDps(''), false);
    assert.equal(await c.requestDps('18, 19,abc,19,300'), true);
    assert.deepEqual(FakeTuyAPI.last.calls.filter((o) => o.requestedDPS).map((o) => o.requestedDPS), [[18, 19]]);
    await c.destroy();
  });

  it('default (no key): nothing is scheduled', () => {
    const { d, timers } = fakeDevice({}, { requestDps: async () => true });
    TuyaLocalDevice.prototype._scheduleManualDps.call(d);
    assert.equal(timers.length, 0);
  });

  it('opt-in: one timer per connection, then the listed DPs are asked for', async () => {
    const asked = [];
    const { d, timers } = fakeDevice({ manual_dps: '18,19,20' }, { requestDps: async (ids) => { asked.push(ids); return true; } });
    TuyaLocalDevice.prototype._scheduleManualDps.call(d);
    TuyaLocalDevice.prototype._scheduleManualDps.call(d);
    assert.equal(timers.length, 1, 'a pending timer is not doubled');
    await timers[0].fn();
    assert.deepEqual(asked, [['18', '19', '20']]);
  });

  it('teardown clears a pending request', () => {
    const src = require('fs').readFileSync(require.resolve('../../lib/tuya-local/TuyaLocalDevice'), 'utf8');
    assert.match(src, /if \(this\._manualDpsTimer\) \{ \/\/ P3080\s+safeClearTimeout\(this, this\._manualDpsTimer\)/);
  });
});
