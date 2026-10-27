'use strict';

/**
 * P3080 batch E — passive start (idea from xZetsubou/hass-localtuya, own code).
 * Contre quoi: sleepy/battery WiFi devices refuse TCP until they wake and broadcast on UDP.
 * Opt-in only (`passive_start` key); absent = connect at once as before. One listener and one
 * 10 min fallback timer, both removed on connect or teardown.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const { EventEmitter } = require('events');
const { PASSIVE_FALLBACK_MS } = require('../../lib/tuya-local/LocalTuyaOptions');

const devPath = require.resolve('../../lib/tuya-local/TuyaLocalDevice');
const prev = require.cache[devPath];
delete require.cache[devPath];
const orig = Module._load;
Module._load = function (req, ...rest) {
  return req === 'homey' ? { Device: class {}, Driver: class {}, App: class {} } : orig.call(this, req, ...rest);
};
let TuyaLocalDevice;
try { TuyaLocalDevice = require(devPath); } finally {
  Module._load = orig;
  if (prev) {require.cache[devPath] = prev;} else {delete require.cache[devPath];}
}
const P = TuyaLocalDevice.prototype;

function fake(settings, { known = false, noDisc = false } = {}) {
  const disc = new EventEmitter();
  disc.getDevice = () => known ? { ip: '1.2.3.4' } : null;
  const timers = [];
  const client = { connects: 0, connect: async () => { client.connects++; } };
  const d = {
    _destroyed: false, _client: client,
    safeApp: noDisc ? {} : { _tuyaUDPDiscovery: disc },
    getSetting: (k) => settings[k], getStoreValue: () => undefined, log() {}, error() {},
    homey: {
      setTimeout: (fn, ms) => { const t = { fn, ms }; timers.push(t); return t; },
      clearTimeout: (t) => { const i = timers.indexOf(t); if (i >= 0) {timers.splice(i, 1);} },
    },
    _disarmPassiveStart: P._disarmPassiveStart,
  };
  return { d, disc, timers, client };
}

describe('P3080 passive start', () => {
  it('default (no key): not deferred, nothing armed', () => {
    const { d, disc, timers } = fake({});
    assert.equal(P._armPassiveStart.call(d, 'abc'), false);
    assert.equal(disc.listenerCount('device-advertising'), 0);
    assert.equal(timers.length, 0);
  });

  it('opt-in but already advertised or no discovery: connect as before', () => {
    assert.equal(P._armPassiveStart.call(fake({ passive_start: true }, { known: true }).d, 'abc'), false);
    assert.equal(P._armPassiveStart.call(fake({ passive_start: true }, { noDisc: true }).d, 'abc'), false);
  });

  it('opt-in: waits for its own broadcast, ignores others, then connects once and cleans up', async () => {
    const { d, disc, timers, client } = fake({ passive_start: 'on' });
    assert.equal(P._armPassiveStart.call(d, 'abc'), true);
    assert.equal(timers[0].ms, PASSIVE_FALLBACK_MS);
    disc.emit('device-advertising', { gwId: 'other' });
    assert.equal(client.connects, 0);
    disc.emit('device-advertising', { gwId: 'abc' });
    disc.emit('device-advertising', { gwId: 'abc' });
    await new Promise((r) => setImmediate(r));
    assert.equal(client.connects, 1);
    assert.equal(disc.listenerCount('device-advertising'), 0);
    assert.equal(timers.length, 0);
  });

  it('fallback timer connects when no broadcast comes; teardown disarms', async () => {
    const a = fake({ passive_start: true });
    P._armPassiveStart.call(a.d, 'abc');
    a.timers[0].fn();
    await new Promise((r) => setImmediate(r));
    assert.equal(a.client.connects, 1);
    const b = fake({ passive_start: true });
    P._armPassiveStart.call(b.d, 'abc');
    b.d._destroyed = true;
    P._disarmPassiveStart.call(b.d);
    b.disc.emit('device-advertising', { gwId: 'abc' });
    assert.equal(b.client.connects, 0);
    assert.equal(b.disc.listenerCount('device-advertising'), 0);
  });

  it('_destroyDevice disarms passive start', () => {
    const src = require('fs').readFileSync(devPath, 'utf8');
    assert.match(src, /_destroyDevice\(\) \{[\s\S]{0,600}this\._disarmPassiveStart\(\); \/\/ P3080/);
    assert.match(src, /if \(this\._armPassiveStart\(deviceId\)\) \{return;\}\s+await this\._client\.connect\(\);/);
  });
});
