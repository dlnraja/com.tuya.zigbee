'use strict';

/**
 * P3080 batch C — restore_on_reconnect (idea from rospogrigio/localtuya + xZetsubou/hass-localtuya, own code).
 * Contre quoi: a WiFi device that reboots on power loss comes back in its default state.
 * Opt-in only (`restore_on_reconnect` key); absent = previous behaviour. Mapped DPs only, max 16,
 * one delayed setDPs, 60 s cooldown, timer cleared on teardown, nothing on the first connect.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isOptOn, pickRestoreDps, RESTORE_MAX_DPS } = require('../../lib/tuya-local/LocalTuyaOptions');
const Module = require('module');

// Load the device class under a stub `homey` (fresh copy, previous cache entry put back).
const devPath = require.resolve('../../lib/tuya-local/TuyaLocalDevice');
const prevDev = require.cache[devPath];
delete require.cache[devPath];
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  return req === 'homey' ? { Device: class {}, Driver: class {}, App: class {} } : origLoad.call(this, req, ...rest);
};
let TuyaLocalDevice;
try { TuyaLocalDevice = require(devPath); } finally {
  Module._load = origLoad;
  if (prevDev) {require.cache[devPath] = prevDev;} else {delete require.cache[devPath];}
}

const proto = TuyaLocalDevice.prototype;
const map = [{ capability: 'onoff', dp: 1 }, { capability: 'dim', dp: 2 }, { capability: 'measure_power', dp: 19, readOnly: true }];

function fake(opts = {}) {
  const timers = [];
  const sent = [];
  const d = {
    _connected: true, _destroyed: false, _lastKnownDps: opts.snap,
    capabilityMap: map,
    getSetting: (k) => (opts.settings || {})[k],
    getStoreValue: () => undefined,
    log() {},
    homey: {
      setTimeout: (fn, ms) => { const t = { fn, ms }; timers.push(t); return t; },
      clearTimeout: (t) => { const i = timers.indexOf(t); if (i >= 0) {timers.splice(i, 1);} },
    },
    _client: { setDPs: async (p) => { sent.push(p); } },
  };
  return { d, timers, sent };
}

describe('P3080 restore_on_reconnect', () => {
  it('opt-in flag parsing', () => {
    for (const v of [true, 1, '1', 'on', 'YES', 'true']) {assert.equal(isOptOn(v), true);}
    for (const v of [undefined, null, false, 0, '', 'off', 'no']) {assert.equal(isOptOn(v), false);}
  });

  it('keeps mapped, writable, plain DPs only, bounded', () => {
    assert.deepEqual(pickRestoreDps({ 1: true, 2: 500, 19: 12, 99: 'x', 3: { a: 1 } }, map), { 1: true, 2: 500 });
    const big = Array.from({ length: 40 }, (_, i) => ({ capability: `c${i}`, dp: i + 1 }));
    const snap = Object.fromEntries(big.map((e) => [String(e.dp), 1]));
    assert.equal(Object.keys(pickRestoreDps(snap, big)).length, RESTORE_MAX_DPS);
  });

  it('default (no key): nothing is scheduled', () => {
    const { d, timers } = fake({ snap: { 1: true } });
    proto._maybeRestoreOnReconnect.call(d);
    assert.equal(timers.length, 0);
  });

  it('first connect (no snapshot): nothing is scheduled even when opted in', () => {
    const { d, timers } = fake({ settings: { restore_on_reconnect: true } });
    proto._maybeRestoreOnReconnect.call(d);
    assert.equal(timers.length, 0);
  });

  it('opt-in reconnect: one delayed setDPs, then cooldown', async () => {
    const { d, timers, sent } = fake({ snap: { 1: true, 2: 300, 19: 5 }, settings: { restore_on_reconnect: 'on' } });
    proto._maybeRestoreOnReconnect.call(d);
    assert.equal(timers.length, 1);
    await timers[0].fn();
    assert.deepEqual(sent, [{ 1: true, 2: 300 }]);
    proto._maybeRestoreOnReconnect.call(d);
    assert.equal(timers.length, 1, 'cooldown: no second timer');
  });

  it('teardown clears a pending restore', () => {
    const src = require('fs').readFileSync(require.resolve('../../lib/tuya-local/TuyaLocalDevice'), 'utf8');
    assert.match(src, /if \(this\._restoreTimer\) \{ \/\/ P3080\s+safeClearTimeout\(this, this\._restoreTimer\)/);
    assert.match(src, /this\._maybeRestoreOnReconnect\(\);/);
  });
});
