'use strict';
/**
 * P2940 — additive unit tests for code that had no (or thin) tests.
 * Pure tests: they load modules and assert current behaviour; nothing in lib/ changes.
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const has = (rel) => fs.existsSync(path.join(ROOT, rel));
const req = (rel) => require(path.join(ROOT, rel));
const describeIf = (cond) => (cond ? describe : describe.skip);

/* 1. ButtonEventRouter — every press path, dedup edges */
describeIf(has('lib/buttons/ButtonEventRouter.js'))('P2940 ButtonEventRouter — paths and dedup edges', () => {
  const R = has('lib/buttons/ButtonEventRouter.js') ? req('lib/buttons/ButtonEventRouter.js') : null;
  const clock = (t0 = 1000) => { const c = { t: t0 }; c.now = () => c.t; return c; };

  it('pressFromValue: numeric 0/1/2, words, fallback single', () => {
    assert.strictEqual(R.pressFromValue(0), 'single');
    assert.strictEqual(R.pressFromValue(1), 'double');
    assert.strictEqual(R.pressFromValue(2), 'long');
    assert.strictEqual(R.pressFromValue('HOLD'), 'long');
    assert.strictEqual(R.pressFromValue('long_press'), 'long');
    assert.strictEqual(R.pressFromValue('double_click'), 'double');
    assert.strictEqual(R.pressFromValue('triple'), 'triple');
    assert.strictEqual(R.pressFromValue('release'), 'release');
    assert.strictEqual(R.pressFromValue(undefined), 'single');
    assert.strictEqual(R.pressFromValue(9), 'single');
  });

  it('every documented path has a normalizer', () => {
    for (const p of R.PATHS) { assert.strictEqual(typeof R.normalize[p], 'function', p); }
  });

  it('zcl_onoff: accepts commandOn/commandToggle, rejects unknown, command mode off = double', () => {
    assert.deepStrictEqual(R.normalize.zcl_onoff({ endpoint: 2, command: 'commandOn' }), { button: 2, type: 'single' });
    assert.deepStrictEqual(R.normalize.zcl_onoff({ endpoint: 3, command: 'TOGGLE' }), { button: 3, type: 'single' });
    assert.strictEqual(R.normalize.zcl_onoff({ endpoint: 1, command: 'offWithEffect' }), null);
    assert.deepStrictEqual(R.normalize.zcl_onoff({ command: 'off', mode: 'command' }), { button: 1, type: 'double' });
    assert.deepStrictEqual(R.normalize.zcl_onoff({ command: 'off', mode: 'scene' }), { button: 1, type: 'single' });
  });

  it('scene ids: zero/negative, block boundaries 16/17/32/33/48, beyond 48 falls back to single', () => {
    const s = (id) => R.sceneToButton(id, 1, 1);
    assert.deepStrictEqual(s(0), { button: 1, type: 'single' });
    assert.deepStrictEqual(s('x'), { button: 1, type: 'single' });
    assert.deepStrictEqual(s(16), { button: 16, type: 'single' });
    assert.deepStrictEqual(s(17), { button: 1, type: 'double' });
    assert.deepStrictEqual(s(32), { button: 16, type: 'double' });
    assert.deepStrictEqual(s(33), { button: 1, type: 'long' });
    assert.deepStrictEqual(s(48), { button: 16, type: 'long' });
    assert.deepStrictEqual(s(49), { button: 1, type: 'single' });
    assert.deepStrictEqual(R.sceneToButton(5, 3, 4), { button: 3, type: 'long' });
    assert.deepStrictEqual(R.sceneToButton(7, 1, 1, { 7: { button: '4' } }), { button: 4, type: 'single' });
  });

  it('level_step: step up/down direction, move = long, stop = release', () => {
    assert.strictEqual(R.normalize.level_step({ command: 'step', stepMode: 1 }).rotate, 'rotate_left');
    assert.strictEqual(R.normalize.level_step({ command: 'step', stepMode: 0 }).rotate, 'rotate_right');
    assert.strictEqual(R.normalize.level_step({ command: 'moveWithOnOff' }).type, 'long');
    assert.strictEqual(R.normalize.level_step({ command: 'stopWithOnOff', endpoint: 2 }).type, 'release');
  });

  it('e000 falls back to commandId when value missing; ef00_dp map, DP range 1..8, outside = null', () => {
    assert.strictEqual(R.normalize.e000({ commandId: 1 }).type, 'double');
    assert.strictEqual(R.normalize.e000({ value: 2, commandId: 1 }).type, 'long');
    assert.deepStrictEqual(R.normalize.ef00_dp({ dp: 9, value: 0 }), null);
    assert.deepStrictEqual(R.normalize.ef00_dp({ dp: 0, value: 0 }), null);
    assert.deepStrictEqual(R.normalize.ef00_dp({ dp: 8, value: 1 }), { button: 8, type: 'double' });
    assert.deepStrictEqual(R.normalize.ef00_dp({ dp: 101, value: 2, dpMap: { 101: { button: 3 } } }), { button: 3, type: 'long' });
    assert.deepStrictEqual(R.normalize.ef00_dp({ dp: 101, value: 2, dpMap: { 101: { button: 3, type: 'single' } } }), { button: 3, type: 'single' });
  });

  it('multistate 0/1/2/3/255 and raw heuristic (payload first byte, then commandId)', () => {
    const m = (v) => R.normalize.multistate({ endpoint: 1, value: v }).type;
    assert.deepStrictEqual([m(0), m(1), m(2), m(3), m(255)], ['long', 'single', 'double', 'triple', 'release']);
    assert.deepStrictEqual(R.normalize.raw({ endpoint: 2, payload: [1, 9] }), { button: 2, type: 'double', heuristic: true });
    assert.deepStrictEqual(R.heuristic({ commandId: 2 }), { button: 1, type: 'long', heuristic: true });
    assert.deepStrictEqual(R.heuristic({ payload: [7], commandId: 1 }), { button: 1, type: 'double', heuristic: true });
  });

  it('modes and decoupling helpers tolerate odd inputs', () => {
    assert.strictEqual(R.modeFrom8004('1'), 'scene');
    assert.strictEqual(R.modeFrom8004(null), 'command'); // Number(null) === 0: documents current behaviour
    assert.strictEqual(R.modeFrom8004(undefined), 'unknown');
    assert.strictEqual(R.isDecoupled(undefined), false);
    assert.strictEqual(R.isDecoupled(true), true);
    assert.strictEqual(R.isDecoupled('Decoupled'), true);
    assert.strictEqual(R.isDecoupled(0), false);
  });

  it('fixed windowMs option overrides the dynamic window', () => {
    const r = new R.ButtonRouter({ windowMs: 250 });
    assert.strictEqual(r.windowMs(), 250);
    assert.strictEqual(new R.ButtonRouter({ windowMs: -5 }).windowMs(), R.BASE_WINDOW_MS);
  });

  it('dynamic window: floor clamp at MIN and ceiling clamp at MAX', () => {
    const c = clock(); const lo = new R.ButtonRouter({ now: c.now });
    for (let i = 0; i < 5; i++) { c.t += 10000; lo.admit({ button: 1, type: 'single', path: 'a' }); c.t += 5; lo.admit({ button: 1, type: 'single', path: 'b' }); }
    assert.strictEqual(lo.windowMs(), R.MIN_WINDOW_MS);
    const c2 = clock(); const hi = new R.ButtonRouter({ now: c2.now });
    for (let i = 0; i < 5; i++) { c2.t += 10000; hi.admit({ button: 1, type: 'single', path: 'a' }); c2.t += 850; hi.admit({ button: 1, type: 'single', path: 'b' }); }
    assert.strictEqual(hi.windowMs(), R.MAX_WINDOW_MS);
  });

  it('latency ring stays bounded (16) and key map stays bounded (64)', () => {
    const c = clock(); const r = new R.ButtonRouter({ now: c.now });
    for (let i = 0; i < 40; i++) { c.t += 10000; r.admit({ button: 1, type: 'single', path: 'a' }); c.t += 50; r.admit({ button: 1, type: 'single', path: 'b' }); }
    assert.ok(r._lat.length <= 16);
    for (let b = 0; b < 200; b++) { r.admit({ button: b, type: 'single', path: 'a' }); }
    assert.ok(r._last.size <= 64);
  });

  it('different seq on the same path within the window is admitted; seq copy outside window passes', () => {
    const c = clock(); const r = new R.ButtonRouter({ now: c.now });
    assert.ok(r.admit({ button: 1, type: 'single', path: 'a', seq: 1 }).admit);
    c.t += 50; assert.ok(r.admit({ button: 1, type: 'single', path: 'a', seq: 2 }).admit);
    c.t += 5000; assert.ok(r.admit({ button: 1, type: 'single', path: 'a', seq: 2 }).admit);
  });

  it('same button different type is not deduplicated across paths', () => {
    const c = clock(); const r = new R.ButtonRouter({ now: c.now });
    r.admit({ button: 1, type: 'single', path: 'a' }); c.t += 10;
    assert.ok(r.admit({ button: 1, type: 'double', path: 'b' }).admit);
  });

  it('per-endpoint learning caps at 16 endpoints per path', () => {
    const c = clock(); const r = new R.ButtonRouter({ now: c.now });
    for (let e = 0; e < 30; e++) { c.t += 5000; r.admit({ button: e, type: 'single', path: 'a', endpoint: e }); }
    assert.strictEqual(Object.keys(r.stats.a.ep).length, 16);
    assert.strictEqual(r.stats.a.n, 30);
  });

  it('recordDp keeps at most 4 identities and 32 DPs per identity', () => {
    const r = new R.ButtonRouter();
    for (let i = 0; i < 6; i++) { r.recordDp(1, { mfr: `m${i}`, pid: 'TS0601' }); }
    assert.ok(Object.keys(r.dpSeen).length <= 5);
    for (let d = 0; d < 50; d++) { r.recordDp(d, { mfr: 'x' }); }
    assert.ok(Object.keys(r.dpSeen['x/?/?']).length <= 32);
    assert.strictEqual(r.recordDp(3, {}, []), null);
    assert.strictEqual(r.recordDp('3', {}, ['3']), null);
  });

  it('captureUnknown ring holds 20 and snapshot shows last 5', () => {
    const r = new R.ButtonRouter();
    for (let i = 0; i < 25; i++) { r.captureUnknown({ endpoint: 1, commandId: i }); }
    assert.strictEqual(r.unknown.length, 20);
    assert.strictEqual(r.snapshot().unknown.length, 5);
    assert.strictEqual(r.snapshot().mode, 'unknown');
  });

  it('routerFor / disposeRouter / pathOf', () => {
    assert.strictEqual(R.routerFor(null), null);
    const dev = {};
    const a = R.routerFor(dev); assert.strictEqual(R.routerFor(dev), a);
    R.disposeRouter(dev); assert.notStrictEqual(R.routerFor(dev), a);
    assert.doesNotThrow(() => R.disposeRouter(Object.freeze({})));
    assert.strictEqual(R.pathOf({ path: 'tuya_fd' }), 'tuya_fd');
    assert.strictEqual(R.pathOf({ rotate: 'rotate_left' }), 'level_step');
    assert.strictEqual(R.pathOf(), 'physical');
  });
});

/* 2. ZigbeeTimeSync — ZCL Time cluster 0x000A writer (had ~4% line coverage) */
describeIf(has('lib/ZigbeeTimeSync.js'))('P2940 ZigbeeTimeSync', () => {
  const ZigbeeTimeSync = has('lib/ZigbeeTimeSync.js') ? req('lib/ZigbeeTimeSync.js') : null;
  const mk = (time, outClusters = [10]) => {
    const logs = [];
    const dev = { log: (...a) => logs.push(a.join(' ')), homey: { setTimeout: (fn) => setImmediate(fn) },
      zclNode: { endpoints: { 1: { outClusters, clusters: time ? { time } : {} } } } };
    return { dev, logs };
  };

  it('detects RTC by numeric, hex-string or name outCluster', () => {
    for (const oc of [[10], ['0x000A'], ['time']]) { assert.strictEqual(new ZigbeeTimeSync(mk(null, oc).dev).hasRtcCapability(), true); }
    assert.strictEqual(new ZigbeeTimeSync(mk(null, [6]).dev).hasRtcCapability(), false);
    assert.strictEqual(new ZigbeeTimeSync({ log() {}, homey: {} }).hasRtcCapability(), false);
  });

  it('time is seconds since 2000-01-01 UTC', () => {
    const z = new ZigbeeTimeSync(mk(null).dev);
    const expected = Math.floor(Date.now() / 1000) - 946684800;
    assert.ok(Math.abs(z.getZigbeeTime() - expected) <= 1);
  });

  it('sync binds, writes time + status=1, reads back, then throttles', async () => {
    const writes = []; let bound = 0;
    const time = { bind: async () => { bound++; }, writeAttributes: async (a) => { writes.push(a); }, readAttributes: async () => ({ time: 1, timeStatus: 1 }) };
    const z = new ZigbeeTimeSync(mk(time).dev);
    const r = await z.sync();
    assert.strictEqual(r.success, true);
    assert.strictEqual(bound, 1);
    assert.strictEqual(writes[0].timeStatus, 1);
    assert.deepStrictEqual(await z.sync(), { success: false, reason: 'throttled' });
    assert.strictEqual((await z.sync({ force: true })).success, true);
  });

  it('no RTC → no_rtc, no write', async () => {
    const z = new ZigbeeTimeSync(mk({ writeAttributes: async () => { throw new Error('must not write'); } }, [6]).dev);
    assert.deepStrictEqual(await z.sync(), { success: false, reason: 'no_rtc' });
  });

  it('retries up to maxRetries then reports max_retries; bind/readback failures are non-fatal', async () => {
    let n = 0;
    const time = { bind: async () => { throw new Error('bind'); }, writeAttributes: async () => { n++; if (n < 2) {throw new Error('busy');} }, readAttributes: async () => { throw new Error('rb'); } };
    const z = new ZigbeeTimeSync(mk(time).dev, { retryDelayMs: 1 });
    assert.strictEqual((await z.sync()).success, true);
    assert.strictEqual(n, 2);
    const bad = new ZigbeeTimeSync(mk({ writeAttributes: async () => { throw new Error('nope'); } }).dev, { retryDelayMs: 1, maxRetries: 2 });
    const r = await bad.sync();
    assert.strictEqual(r.reason, 'max_retries');
    assert.strictEqual(r.error.message, 'nope');
  });

  it('debugSync tries three attribute sets and reports each', async () => {
    const time = { writeAttributes: async (a) => { if ('timeZone' in a) {throw new Error('unsupported');} } };
    const res = await new ZigbeeTimeSync(mk(time).dev).debugSync();
    assert.deepStrictEqual(res.map((x) => x.success), [true, true, false]);
    const none = await new ZigbeeTimeSync(mk(null).dev).debugSync();
    assert.ok(none.every((x) => x.error === 'no_cluster'));
  });
});

/* 2b. Time sync opt-out policy */
describeIf(has('lib/tuya/TimeSyncPolicy.js'))('P2940 TimeSyncPolicy edge values', () => {
  it('only explicit false/off/0 disables; throwing getSetting allows', () => {
    const { timeSyncAllowed } = req('lib/tuya/TimeSyncPolicy.js');
    const d = (v) => ({ getSetting: () => v });
    assert.deepStrictEqual([false, 'false', 'off', 0].map((v) => timeSyncAllowed(d(v))), [false, false, false, false]);
    assert.deepStrictEqual([true, undefined, null, 'on', 1].map((v) => timeSyncAllowed(d(v))), [true, true, true, true, true]);
    assert.strictEqual(timeSyncAllowed({ getSetting() { throw new Error('x'); } }), true);
    assert.strictEqual(timeSyncAllowed(null), true);
  });
});

/* 4. ZclCodec — raw frame parser */
describeIf(has('lib/zigbee/cluster/ZclCodec.js'))('P2940 ZclCodec — data types and global commands', () => {
  const Z = has('lib/zigbee/cluster/ZclCodec.js') ? req('lib/zigbee/cluster/ZclCodec.js') : null;
  const rv = (type, bytes) => Z.readValue(Buffer.from(bytes), 0, type);

  it('integers, signed and unsigned, incl. 24/40/48/64 bit', () => {
    assert.strictEqual(rv(Z.T.INT8, [0xff]).value, -1);
    assert.strictEqual(rv(Z.T.INT16, [0xfe, 0xff]).value, -2);
    assert.strictEqual(rv(Z.T.INT24, [0xff, 0xff, 0xff]).value, -1);
    assert.strictEqual(rv(Z.T.INT32, [1, 0, 0, 0]).value, 1);
    assert.strictEqual(rv(Z.T.INT48, [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]).value, -1);
    assert.strictEqual(rv(Z.T.INT64, [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]).value, '-1');
    assert.strictEqual(rv(Z.T.UINT24, [1, 2, 3]).value, 0x030201);
    assert.strictEqual(rv(Z.T.UINT40, [0, 0, 0, 0, 1]).value, 2 ** 32);
    assert.strictEqual(rv(Z.T.UINT64, [1, 0, 0, 0, 0, 0, 0, 0]).value, '1');
    assert.strictEqual(rv(Z.T.ENUM8, [4]).value, 4);
    assert.strictEqual(rv(Z.T.KEY128, new Array(16).fill(0xab)).value, 'ab'.repeat(16));
  });

  it('bool incl. invalid 0xff, floats incl. semi precision', () => {
    assert.strictEqual(rv(Z.T.BOOL, [1]).value, true);
    assert.strictEqual(rv(Z.T.BOOL, [0]).value, false);
    assert.strictEqual(rv(Z.T.BOOL, [0xff]).value, null);
    assert.strictEqual(rv(Z.T.SEMI, [0x00, 0x3c]).value, 1);
    assert.strictEqual(rv(Z.T.SEMI, [0x00, 0xbc]).value, -1);
    assert.strictEqual(rv(Z.T.SEMI, [0x00, 0x7c]).value, Infinity);
    assert.ok(Number.isNaN(rv(Z.T.SEMI, [0x01, 0x7c]).value));
    assert.ok(rv(Z.T.SEMI, [0x01, 0x00]).value > 0);
    const f = Buffer.alloc(4); f.writeFloatLE(21.5); assert.strictEqual(rv(Z.T.SINGLE, [...f]).value, 21.5);
    const d = Buffer.alloc(8); d.writeDoubleLE(-3.25); assert.strictEqual(rv(Z.T.DOUBLE, [...d]).value, -3.25);
  });

  it('strings (short/long, invalid length = null), IEEE reversed', () => {
    assert.deepStrictEqual(rv(Z.T.CHARSTR, [2, 0x68, 0x69]), { value: 'hi', next: 3 });
    assert.strictEqual(rv(Z.T.OCTSTR, [2, 0xde, 0xad]).value, 'dead');
    assert.deepStrictEqual(rv(Z.T.CHARSTR, [0xff]), { value: null, next: 1 });
    assert.strictEqual(rv(Z.T.LONGCHARSTR, [2, 0, 0x6f, 0x6b]).value, 'ok');
    assert.strictEqual(rv(Z.T.LONGOCTSTR, [0xff, 0xff]).value, null);
    assert.strictEqual(rv(Z.T.IEEE, [1, 2, 3, 4, 5, 6, 7, 8]).value, '0807060504030201');
  });

  it('array / set / struct, invalid count, depth limit, item cap', () => {
    assert.deepStrictEqual(rv(Z.T.ARRAY, [Z.T.UINT8, 2, 0, 5, 6]).value, [5, 6]);
    assert.deepStrictEqual(rv(Z.T.SET, [Z.T.UINT8, 1, 0, 9]).value, [9]);
    assert.strictEqual(rv(Z.T.ARRAY, [Z.T.UINT8, 0xff, 0xff]).value, null);
    assert.deepStrictEqual(rv(Z.T.STRUCT, [1, 0, Z.T.UINT8, 7]).value, [{ type: Z.T.UINT8, value: 7 }]);
    assert.strictEqual(rv(Z.T.STRUCT, [0xff, 0xff]).value, null);
    const many = [Z.T.UINT8, 100, 0, ...new Array(100).fill(1)];
    const r = rv(Z.T.ARRAY, many);
    assert.strictEqual(r.value.length, Z.MAX_ITEMS);
    assert.strictEqual(r.next, many.length);
    const nested = [Z.T.ARRAY, 1, 0, Z.T.ARRAY, 1, 0, Z.T.ARRAY, 1, 0, Z.T.ARRAY, 1, 0, Z.T.UINT8, 1, 0, 1];
    assert.throws(() => Z.readValue(Buffer.from(nested), 0, Z.T.ARRAY), /zcl_depth/);
  });

  it('unknown type and truncation throw RangeError from readValue', () => {
    assert.throws(() => rv(0x99, [0]), /zcl_type_unknown:0x99/);
    assert.throws(() => rv(Z.T.UINT32, [1, 2]), /zcl_truncated/);
    assert.strictEqual(rv(Z.T.NODATA, []).value, null);
  });

  it('header: manufacturer specific, direction, disable default response', () => {
    const h = Z.parseHeader(Buffer.from([0x1d, 0x02, 0x10, 0x42, 0x0a]));
    assert.strictEqual(h.clusterSpecific, true);
    assert.strictEqual(h.manufacturerSpecific, true);
    assert.strictEqual(h.manufacturerId, 0x1002);
    assert.strictEqual(h.directionToClient, true);
    assert.strictEqual(h.disableDefaultResponse, true);
    assert.strictEqual(h.seq, 0x42);
    assert.strictEqual(h.cmdId, 0x0a);
    assert.strictEqual(h.payloadOffset, 5);
  });

  it('parseFrame: report, read response with failed status, write/configure responses, default resp, discover', () => {
    const rep = Z.parseFrame(Buffer.from([0x18, 1, 0x0a, 0x00, 0x00, Z.T.UINT8, 7, 0x01, 0x00, Z.T.BOOL, 1]));
    assert.deepStrictEqual(rep.payload.attributes.map((a) => a.value), [7, true]);
    const rr = Z.parseFrame([0x18, 2, 0x01, 0x04, 0x00, 0x86, 0x05, 0x00, 0x00, Z.T.CHARSTR, 1, 0x41]);
    assert.deepStrictEqual(rr.payload.attributes, [{ id: 4, status: 0x86 }, { id: 5, status: 0, type: Z.T.CHARSTR, value: 'A' }]);
    assert.deepStrictEqual(Z.parseFrame([0x18, 3, 0x04, 0x00]).payload, { records: [{ status: 0 }] });
    assert.deepStrictEqual(Z.parseFrame([0x18, 3, 0x04, 0x86, 0x01, 0x00]).payload, { records: [{ status: 0x86, id: 1 }] });
    assert.deepStrictEqual(Z.parseFrame([0x18, 4, 0x07, 0x8c, 0x00, 0x00, 0x00]).payload, { records: [{ status: 0x8c, direction: 0, id: 0 }] });
    assert.deepStrictEqual(Z.parseFrame([0x18, 5, 0x0b, 0x02, 0x81]).payload, { cmdId: 2, status: 0x81 });
    assert.deepStrictEqual(Z.parseFrame([0x18, 6, 0x0d, 1, 0x00, 0x00, Z.T.UINT8]).payload, { complete: true, attributes: [{ id: 0, type: Z.T.UINT8 }] });
    assert.strictEqual(Z.parseFrame([0x10, 7, 0x0e, 0xaa]).command, 'global_0xe');
    assert.deepStrictEqual(Z.parseFrame([0x11, 8, 0x02, 0xab]).payload, { raw: 'ab' });
  });

  it('parseFrame never throws on garbage', () => {
    assert.strictEqual(Z.parseFrame(null).ok, false);
    assert.strictEqual(Z.parseFrame([0x18]).ok, false);
    assert.strictEqual(Z.parseFrame([0x18, 1, 0x0a, 0x00, 0x00, Z.T.UINT32, 1]).ok, false);
  });

  it('buildDefaultResponse flips direction, mirrors mfr code and seq', () => {
    const h = Z.parseHeader(Buffer.from([0x05, 0x02, 0x10, 0x09, 0x01]));
    assert.deepStrictEqual([...Z.buildDefaultResponse(h, 0x81)], [0x1c, 0x02, 0x10, 0x09, 0x0b, 0x01, 0x81]);
    const h2 = Z.parseHeader(Buffer.from([0x18, 0x07, 0x0a]));
    assert.deepStrictEqual([...Z.buildDefaultResponse(h2)], [0x10, 0x07, 0x0b, 0x0a, 0x00]);
  });
});

/* 5. WiFi: tinytuya import + version fallback */
describeIf(has('lib/tuya-local/TinyTuyaImport.js'))('P2940 TinyTuyaImport edge cases', () => {
  const T = has('lib/tuya-local/TinyTuyaImport.js') ? req('lib/tuya-local/TinyTuyaImport.js') : null;
  it('accepts array, {devices}, {result}, Buffer; rejects bad JSON; ignores other shapes', () => {
    const e = { id: 'a1', key: '0123456789abcdef' };
    assert.strictEqual(T.parseImport([e]).devices.length, 1);
    assert.strictEqual(T.parseImport({ devices: [e] }).devices.length, 1);
    assert.strictEqual(T.parseImport({ result: [e] }).devices.length, 1);
    assert.strictEqual(T.parseImport(Buffer.from(JSON.stringify([e]))).devices.length, 1);
    assert.deepStrictEqual(T.parseImport('{oops'), { devices: [], error: 'invalid_json' });
    assert.deepStrictEqual(T.parseImport({ foo: 1 }), { devices: [], error: null });
  });
  it('alias fields, trims id, drops 0.0.0.0, short key = needsKey, dedups, caps at 1000', () => {
    const d = T.normalizeEntry({ devId: ' x ', local_key: 'short', ip: '0.0.0.0', ver: 3.4, productKey: 'p' });
    assert.deepStrictEqual([d.id, d.key, d.ip, d.version, d.productId, d.needsKey], ['x', null, null, '3.4', 'p', true]);
    assert.strictEqual(T.normalizeEntry({ id: 5 }), null);
    assert.strictEqual(T.normalizeEntry('x'), null);
    const list = Array.from({ length: 1200 }, (_, i) => ({ id: `d${i % 1100}` }));
    assert.strictEqual(T.parseImport(list).devices.length, 1000);
  });
  it('sub-devices inherit the gateway transport; orphan sub-device has none', () => {
    const r = T.parseImport([{ id: 'gw', key: '0123456789abcdef', ip: '10.0.0.2', version: '3.3' },
      { id: 's1', node_id: 'n1', parent: 'gw' }, { id: 's2', cid: 'n2', parent: 'missing' }]);
    const [gw, s1, s2] = r.devices;
    assert.strictEqual(gw.subDevice, false);
    assert.deepStrictEqual(s1.gateway, { id: 'gw', key: '0123456789abcdef', ip: '10.0.0.2', version: '3.3' });
    assert.strictEqual(s1.needsKey, false);
    assert.strictEqual(s2.gateway, undefined);
  });
});

describeIf(has('lib/tuya-local/TuyaProtocolVersions.js'))('P2940 TuyaProtocolVersions fallback chain', () => {
  const V = has('lib/tuya-local/TuyaProtocolVersions.js') ? req('lib/tuya-local/TuyaProtocolVersions.js') : null;
  it('chain starts at the label, then neighbours, then the probe order, no duplicates', () => {
    assert.deepStrictEqual(V.resolve('3.4').chain, ['3.4', '3.5', '3.3', '3.1', '3.2']);
    assert.deepStrictEqual(V.resolve('v3.1').chain, ['3.1', '3.2', '3.3', '3.4', '3.5']);
    assert.deepStrictEqual(V.resolve(null).chain, [...V.PROBE]);
  });
  it('1.x / 2.x are cloud labels, 3.22 alias, future 3.x lead, others lead', () => {
    assert.strictEqual(V.resolve('1.0').status, 'non_lan');
    assert.strictEqual(V.resolve(2.2).status, 'non_lan');
    assert.deepStrictEqual([V.resolve('3.22').lan, V.resolve('3.22').variant], ['3.3', 'device22']);
    assert.deepStrictEqual([V.resolve('3.6').status, V.resolve('3.6').lan], ['lead', '3.5']);
    assert.deepStrictEqual([V.resolve('3.0').status, V.resolve('3.0').lan], ['lead', '3.3']);
    assert.deepStrictEqual([V.resolve('4.0').status, V.resolve('4.0').lan], ['lead', null]);
    assert.strictEqual(V.resolve('auto').status, 'auto');
  });
  it('detectFromFrame: 6699, 55AA with/without tag, short or non-buffer input', () => {
    assert.strictEqual(V.detectFromFrame(Buffer.from([0, 0, 0x66, 0x99])), '3.5');
    const f = Buffer.alloc(24); f.writeUInt32BE(0x55aa, 0); f.write('3.3', 20, 'latin1');
    assert.strictEqual(V.detectFromFrame(f), '3.3');
    f.write('9.9', 20, 'latin1'); assert.strictEqual(V.detectFromFrame(f), null);
    assert.strictEqual(V.detectFromFrame(Buffer.from([0, 0, 0x55, 0xaa])), null);
    assert.strictEqual(V.detectFromFrame(Buffer.from([1, 2, 3, 4])), null);
    assert.strictEqual(V.detectFromFrame([0, 0, 0x66, 0x99]), null);
    assert.strictEqual(V.detectFromFrame(Buffer.from([0, 0])), null);
  });
});

/* 6. lazyRequire */
const LZ = has('lib/utils/lazyRequire.js') ? req('lib/utils/lazyRequire.js') : {};
describeIf(typeof LZ.lazyRequire === 'function')('P2940 lazyRequire (P2830 form)', () => {
  it('defers the require until first use, then forwards new/call/get/has/set/prototype', () => {
    let loads = 0;
    class K { constructor(v) { this.v = v; } }
    K.flag = 1;
    const fakeRequire = (r) => { loads++; assert.strictEqual(r, './k'); return K; };
    const P = LZ.lazyRequire(fakeRequire, './k');
    assert.strictEqual(P.__lazyRequirePath, './k');
    assert.strictEqual(P.__lazyRequireLoaded, false);
    assert.strictEqual(loads, 0);
    assert.strictEqual(new P(4).v, 4);
    assert.ok('flag' in P);
    P.extra = 5; assert.strictEqual(K.extra, 5);
    assert.strictEqual(Object.getPrototypeOf(P), Object.getPrototypeOf(K));
    assert.strictEqual(P.__lazyRequireLoaded, true);
    assert.strictEqual(loads, 1);
    const f = LZ.lazyRequire(() => (a) => a * 2, 'f');
    assert.strictEqual(f(4), 8);
  });
  it('a load failure surfaces at the use site, not at creation', () => {
    const P = LZ.lazyRequire(() => { throw new Error('gone'); }, './missing');
    assert.throws(() => P.x, /gone/);
  });
});

describeIf(typeof LZ.lazy === 'function')('P2940 lazyRequire proxy traps', () => {
  const L = LZ;
  it('loads once on first use, forwards get/set/has/call/new/instanceof/keys', () => {
    let loads = 0;
    class K { constructor(v) { this.v = v; } static s() { return 's'; } }
    K.flag = 1;
    const P = L.lazy(() => { loads++; return K; }, { name: 'p2940-k' });
    assert.strictEqual(P.__lazyLoaded, false);
    assert.strictEqual(loads, 0);
    const o = new P(3);
    assert.strictEqual(o.v, 3);
    assert.ok(o instanceof K);
    assert.strictEqual(P.s(), 's');
    assert.ok('flag' in P);
    P.extra = 2; assert.strictEqual(K.extra, 2);
    assert.ok(Object.keys(P).includes('flag'));
    assert.ok(L.LOADED.has('p2940-k'));
    assert.strictEqual(loads, 1);
    const f = L.lazy(() => (a, b) => a + b);
    assert.strictEqual(f(2, 3), 5);
  });
  it('optional + failing resolve returns null without loading; null module reads undefined', () => {
    let loaded = false;
    assert.strictEqual(L.lazy(() => { loaded = true; }, { optional: true, resolve: () => { throw new Error('missing'); } }), null);
    assert.strictEqual(loaded, false);
    const n = L.lazy(() => null);
    assert.strictEqual(n.anything, undefined);
  });
});

/* 7. Transient network retry (app side of retry policy v2) */
describeIf(has('lib/utils/transientNetRetry.js'))('P2940 transientNetRetry', () => {
  const N = has('lib/utils/transientNetRetry.js') ? req('lib/utils/transientNetRetry.js') : null;
  const sleeps = []; const sleep = async (ms) => { sleeps.push(ms); };
  it('classifies transient errors from strings, codes and messages', () => {
    assert.strictEqual(N.isTransientNetError('socket hang up'), true);
    assert.strictEqual(N.isTransientNetError({ code: 'ECONNRESET' }), true);
    assert.strictEqual(N.isTransientNetError({ msg: 'getaddrinfo EAI_AGAIN' }), true);
    assert.strictEqual(N.isTransientNetError(new Error('timeout after 15000ms')), false);
    assert.strictEqual(N.isTransientNetError(null), false);
  });
  it('GET retries twice with 400/1200 ms backoff, then throws', async () => {
    sleeps.length = 0; let n = 0;
    await assert.rejects(N.withTransientRetry(async () => { n++; throw new Error('socket hang up'); }, { method: 'get', sleep }), /socket hang up/);
    assert.strictEqual(n, 3);
    assert.deepStrictEqual(sleeps, [400, 1200]);
  });
  it('POST/undefined method never retries; non-transient never retries', async () => {
    for (const method of ['POST', undefined]) {
      let n = 0;
      await assert.rejects(N.withTransientRetry(async () => { n++; throw new Error('ECONNRESET'); }, { method, sleep }));
      assert.strictEqual(n, 1);
    }
    let m = 0;
    await assert.rejects(N.withTransientRetry(async () => { m++; throw new Error('401'); }, { method: 'GET', sleep }));
    assert.strictEqual(m, 1);
  });
  it('retries are clamped to 3, baseMs override, resultIsTransient path', async () => {
    sleeps.length = 0; let n = 0;
    await assert.rejects(N.withTransientRetry(async () => { n++; throw new Error('EPIPE'); }, { method: 'HEAD', retries: 9, baseMs: 5, sleep }));
    assert.strictEqual(n, 4);
    assert.deepStrictEqual(sleeps, [5, 5, 5]);
    let k = 0;
    const r = await N.withTransientRetry(async () => { k++; return k < 2 ? { err: 'socket hang up' } : { ok: true }; }, { method: 'GET', sleep, resultIsTransient: (x) => !!x.err });
    assert.deepStrictEqual(r, { ok: true });
    const last = await N.withTransientRetry(async () => ({ err: 1 }), { method: 'GET', retries: 0, sleep, resultIsTransient: () => true });
    assert.deepStrictEqual(last, { err: 1 });
  });
});

/* EF00 datapoint argument filling (P2866) */
describeIf(has('lib/utils/TuyaDatapointArgs.js'))('P2940 TuyaDatapointArgs', () => {
  const { normalizeDatapointArgs } = has('lib/utils/TuyaDatapointArgs.js') ? req('lib/utils/TuyaDatapointArgs.js') : {};
  it('fills status/transid/length, converts arrays, leaves explicit fields and non-objects alone', () => {
    const o = normalizeDatapointArgs({ dp: 1, datatype: 1, data: [1] });
    assert.strictEqual(o.status, 0); assert.strictEqual(o.length, 1); assert.ok(Buffer.isBuffer(o.data));
    assert.ok(o.transid >= 0 && o.transid <= 255);
    const full = { dp: 1, status: 3, transid: 9, length: 4, data: Buffer.from([1]) };
    assert.deepStrictEqual(normalizeDatapointArgs(full), full);
    assert.strictEqual(normalizeDatapointArgs(null), null);
    assert.strictEqual(normalizeDatapointArgs('x'), 'x');
    assert.strictEqual(normalizeDatapointArgs({ dp: 1 }).length, undefined);
  });
  it('transid increments and wraps within one byte', () => {
    const seen = new Set();
    for (let i = 0; i < 300; i++) { seen.add(normalizeDatapointArgs({ data: [] }).transid); }
    assert.ok([...seen].every((t) => t >= 0 && t <= 255));
    assert.strictEqual(seen.size, 256);
  });
});
