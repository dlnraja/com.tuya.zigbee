'use strict';

/**
 * P3080 batch B — reset_dpids (idea from rospogrigio/localtuya + xZetsubou/hass-localtuya, own code).
 * Contre quoi: some firmwares answer a full status request with an error but do answer explicit DP ids.
 * Opt-in only (device setting/store key `reset_dpids`); absent = previous behaviour. Bounded list + cooldown.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const { EventEmitter } = require('events');

class FakeTuyAPI extends EventEmitter {
  constructor(cfg) { super(); this.cfg = cfg; this.device = { ip: cfg.ip }; this.calls = []; FakeTuyAPI.last = this; }
  connect() { setImmediate(() => this.emit('connected')); return Promise.resolve(); }
  disconnect() { return Promise.resolve(); }
  refresh(opts) {
    this.calls.push(opts);
    return opts && opts.schema ? Promise.reject(new Error('json obj data unvalid')) : Promise.resolve({});
  }
  set() { return Promise.resolve(); }
}

const origLoad = Module._load;
Module._load = function (req, ...rest) { return req === 'tuyapi' ? FakeTuyAPI : origLoad.call(this, req, ...rest); };
const clientPath = require.resolve('../../lib/tuya-local/TuyaLocalClient');
const cachedClient = require.cache[clientPath];
delete require.cache[clientPath];
const TuyaLocalClient = require(clientPath);
if (cachedClient) {require.cache[clientPath] = cachedClient;} else {delete require.cache[clientPath];}
Module._load = origLoad;
TuyaLocalClient.__TuyAPI = FakeTuyAPI;

const { parseDpList, ResetDpidsGuard, readOpt, MAX_DPS } = require('../../lib/tuya-local/LocalTuyaOptions');
const tick = () => new Promise((r) => setImmediate(r));

async function connected(extra) {
  const c = new TuyaLocalClient({ id: 'x', key: '0123456789abcdef', ip: '10.0.0.2', version: '3.3', pollIntervalMs: 0 });
  c.on('error', () => {});
  c._scheduleReconnect = () => {};
  if (extra) {extra(c);}
  await c.connect(); await tick();
  return c;
}

describe('P3080 reset_dpids', () => {
  it('parses a bounded, unique, valid DP list', () => {
    assert.deepEqual(parseDpList('1, 2,20;2 x 0 256'), ['1', '2', '20']);
    assert.deepEqual(parseDpList([18, '19']), ['18', '19']);
    assert.deepEqual(parseDpList(undefined), []);
    assert.equal(parseDpList(Array.from({ length: 99 }, (_, i) => i + 1)).length, MAX_DPS);
  });

  it('reads the opt-in from settings, then store, else undefined', () => {
    const dev = (s, st) => ({ getSetting: (k) => s[k], getStoreValue: (k) => st[k] });
    assert.equal(readOpt(dev({ reset_dpids: '18' }, { reset_dpids: '1' }), 'reset_dpids'), '18');
    assert.equal(readOpt(dev({}, { reset_dpids: '1' }), 'reset_dpids'), '1');
    assert.equal(readOpt(dev({}, {}), 'reset_dpids'), undefined);
  });

  it('default (no list): a failed status sends nothing more', async () => {
    const c = await connected();
    await c.refresh();
    assert.deepEqual(FakeTuyAPI.last.calls.map((o) => !!o.schema), [true]);
    await c.destroy();
  });

  it('opt-in: a failed status re-asks the listed DPs once per cooldown', async () => {
    const c = await connected((cl) => cl.setResetDpids('18,19,20'));
    await c.refresh();
    await c.refresh();
    const extra = FakeTuyAPI.last.calls.filter((o) => o.requestedDPS);
    assert.equal(extra.length, 1, 'cooldown blocks the second re-query');
    assert.deepEqual(extra[0].requestedDPS, [18, 19, 20]);
    await c.destroy();
  });

  it('guard honours its cooldown window', () => {
    let t = 1000;
    const g = new ResetDpidsGuard({ cooldownMs: 100, now: () => t });
    assert.equal(g.allow(), true);
    t += 50; assert.equal(g.allow(), false);
    t += 60; assert.equal(g.allow(), true);
  });
});
