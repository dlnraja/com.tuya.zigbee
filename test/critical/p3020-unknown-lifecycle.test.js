'use strict';

// P3020: P3011/P3016/P3017 per-device state is released on onUninit/onDeleted (bounded + cleaned).
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { releaseDevice } = require('../../lib/zigbee/UnknownLifecycle');
const Engine = require('../../lib/zigbee/UnknownCommandEngine');

function fakeDevice(id) {
  const writes = [];
  const cleared = [];
  return {
    writes,
    cleared,
    getData: () => ({ id }),
    setStoreValue: async (k, v) => { writes.push([k, v]); },
    homey: { clearTimeout: (t) => cleared.push(t) },
  };
}

describe('P3020 unknown-command lifecycle release', () => {
  it('onUninit: clears timers and flushes dirty state once', () => {
    const d = fakeDevice('u1');
    d._unsupportedRegistry = { _persistTimer: 't-reg', _dirty: true, _map: { a: 1 } };
    d._unknownIncoming = { ring: [1], lastFlow: new Map(), timer: 't-sink', counts: { x: 2 } };
    const { released } = releaseDevice(d, { deleted: false });
    assert.deepStrictEqual(d.cleared.sort(), ['t-reg', 't-sink']);
    assert.ok(released.includes('registry.flush') && released.includes('sink.flush'), released.join(','));
    assert.deepStrictEqual(d.writes.map((w) => w[0]).sort(), ['zcl_unknown_incoming', 'zcl_unsupported_matrix']);
    assert.strictEqual(d._unsupportedRegistry._persistTimer, null);
    // idempotent: a second call writes nothing more
    releaseDevice(d, { deleted: false });
    assert.strictEqual(d.writes.length, 2);
  });

  it('onDeleted: clears timers, drops state, never writes to the deleted store', () => {
    const d = fakeDevice('d1');
    d._unsupportedRegistry = { _persistTimer: 't-reg', _dirty: true, _map: { a: 1 } };
    d._unknownIncoming = { ring: [1], lastFlow: new Map(), timer: 't-sink', counts: { x: 2 } };
    d._unknownLearn = { map: { k: {} }, dirty: true, lastWrite: 0 };
    d._unknownEngine = { recent: [] };
    releaseDevice(d, { deleted: true });
    assert.strictEqual(d.writes.length, 0);
    assert.strictEqual(d._unsupportedRegistry, null);
    assert.strictEqual(d._unknownIncoming, undefined);
    assert.strictEqual(d._unknownEngine, undefined);
    assert.strictEqual(d._unknownLearn, undefined);
  });

  it('removes the module-level UnknownCommandEngine entry for the device', () => {
    const d = fakeDevice('e1');
    Engine.handleDp(d, { dp: 201, value: 1 });
    releaseDevice(d, { deleted: true });
    assert.strictEqual(Engine.lastAction(d), null);
  });

  it('never throws on null / bare objects', () => {
    assert.doesNotThrow(() => releaseDevice(null));
    assert.doesNotThrow(() => releaseDevice({}, { deleted: true }));
  });

  it('TuyaZigbeeDevice onDeleted and onUninit both call releaseDevice', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    const del = src.slice(src.indexOf('async onDeleted()'), src.indexOf('async onUninit()'));
    const un = src.slice(src.indexOf('async onUninit()'));
    assert.match(del, /UnknownLifecycle'\)\.releaseDevice\(this, \{ deleted: true \}\)/);
    assert.match(un.slice(0, 2500), /UnknownLifecycle'\)\.releaseDevice\(this, \{ deleted: false \}\)/);
  });
});
