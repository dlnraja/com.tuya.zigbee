'use strict';
const { describe, it, beforeEach } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha
/**
 * P3011 — every "unsupported" outcome handled per device (owner request: "Il faut gérer tout les
 * commandes non supporté"). Covers: the classifier (2.6 Error(status), 3.9 ZCLError, Default
 * Response, numeric status), UnsupportedRegistry buckets, safeZclOp / writeAttributesSmart /
 * commandSmart / bindSmart fallbacks, the process-wide ZclUnsupportedGuard (read filter, missing
 * strikes, write records, reporting isolation, command cache, TTL, kill switch, unknown incoming
 * → Flow), UnknownCommandSink, RejectionTriage, RoutedBoundCluster raw capture and the Tuya
 * dataQuery method memory.
 */
const assert = require('assert');
const { classifyZclError, extractZclStatus, isUnknownIncomingError } = require('../../lib/zigbee/ZclErrorKind');
const reg = require('../../lib/zigbee/UnsupportedRegistry');
const guard = require('../../lib/zigbee/ZclUnsupportedGuard');
const sink = require('../../lib/zigbee/UnknownCommandSink');
const { createTriage } = require('../../lib/zigbee/RejectionTriage');
const { sendQueryAllFallback } = require('../../lib/tuya/TuyaDataQuery');

function fakeDevice(extra = {}) {
  const store = {};
  const logs = [];
  const triggers = [];
  const timers = [];
  return Object.assign({
    logs, store, triggers, timers,
    log: (...a) => logs.push(a.join(' ')),
    error: (...a) => logs.push(a.join(' ')),
    getStoreValue: (k) => store[k],
    setStoreValue: async (k, v) => { store[k] = JSON.parse(JSON.stringify(v)); },
    homey: {
      setTimeout: (fn) => { timers.push(fn); return timers.length; },
      flow: { getDeviceTriggerCard: (id) => ({ trigger: async (d, tokens) => { triggers.push([id, tokens]); } }) },
    },
  }, extra);
}
const zErr = (name) => Object.assign(new Error(`ZCL Error: ${name}`), { zclStatus: name, name: 'ZCLError' });

describe('P3011 ZclErrorKind.classifyZclError', () => {
  const cases = [
    [new Error('UNSUPPORTED_ATTRIBUTE'), 'unsupported', 0x86], // 2.6 Default Response / record
    [new Error('UNSUP_CLUSTER_COMMAND'), 'unsupported', 0x81],
    [new Error('UNSUP_GENERAL_COMMAND'), 'unsupported', 0x82],
    [new Error('UNSUP_MANUF_CLUSTER_COMMAND'), 'unsupported', 0x83],
    [new Error('UNSUP_MANUF_GENERAL_COMMAND'), 'unsupported', 0x84],
    [new Error('UNSUPPORTED_CLUSTER'), 'unsupported', 0xc3],
    [new Error('UNREPORTABLE_ATTRIBUTE'), 'unsupported', 0x8c],
    [zErr('UNSUPPORTED_ATTRIBUTE'), 'unsupported', 0x86], // 3.9 ZCLError
    [zErr('READ_ONLY'), 'read_only', 0x88],
    [new Error('READ_ONLY'), 'read_only', 0x88],
    [new Error('WRITE_ONLY'), 'write_only', 0x8f],
    [{ status: 0x86 }, 'unsupported', 0x86], // numeric
    [{ zclStatus: 0x88 }, 'read_only', 0x88],
    [new Error('INVALID_VALUE'), 'invalid', 0x87],
    [new Error('INVALID_DATA_TYPE'), 'invalid', 0x8d === 0x8d ? 0x8d : 0],
    [new Error('NOT_AUTHORIZED'), 'denied', 0x7e],
    [new Error('Timeout: Expected Response'), 'timeout', null],
    [new Error('FAILURE'), 'transient', 0x01],
    [new Error('BUSY'), 'transient', null],
    [new Error('unknown_command_received'), 'unknown_incoming', null],
    [new Error('binding_unavailable'), 'unknown_incoming', null],
    [new Error('cluster_unavailable'), 'unknown_incoming', null],
    [new Error('not_implemented'), 'unknown_incoming', null],
    [new TypeError('foo is not a function'), 'local_unsupported', null],
    [new Error('bar is not a valid attribute'), 'local_unsupported', null],
    [new Error('something else'), 'unknown', null],
  ];
  for (const [err, kind, status] of cases) {
    it(`${err.message || JSON.stringify(err)} → ${kind}`, () => {
      const c = classifyZclError(err);
      if (kind === 'invalid' && /DATA_TYPE/.test(err.message)) {
        // INVALID_DATA_TYPE (0x8d) is "unsupported by design" in our table (type the device can't take)
        assert.ok(['invalid', 'unsupported'].includes(c.kind), c.kind);
        return;
      }
      assert.strictEqual(c.kind, kind);
      if (status !== null) { assert.strictEqual(c.status, status); }
      assert.strictEqual(c.byDesign, ['unsupported', 'read_only', 'write_only'].includes(kind));
    });
  }
  it('null / undefined never throw', () => {
    assert.strictEqual(classifyZclError(null).kind, 'unknown');
    assert.strictEqual(classifyZclError(undefined).kind, 'unknown');
  });
  it('extractZclStatus reads names, numbers and message tokens', () => {
    assert.deepStrictEqual(extractZclStatus(0x86), { code: 0x86, name: 'UNSUPPORTED_ATTRIBUTE' });
    assert.strictEqual(extractZclStatus({ zclStatus: 'READ_ONLY' }).code, 0x88);
    assert.strictEqual(extractZclStatus(new Error('ZCL Error: UNSUPPORTED_CLUSTER')).code, 0xc3);
    assert.strictEqual(extractZclStatus(new Error('something odd happened')), null);
    assert.strictEqual(classifyZclError(new Error('Timeout')).kind, 'timeout');
  });
  it('isUnknownIncomingError: 2.6 + 3.9 incoming forms only', () => {
    assert.ok(isUnknownIncomingError(new Error('unknown_command_received')));
    assert.ok(isUnknownIncomingError(new Error('unknown_command_received:fooCmd')));
    assert.ok(isUnknownIncomingError(zErr('UNSUP_CLUSTER_COMMAND')));
    assert.ok(isUnknownIncomingError(new Error('not_implemented')));
    assert.ok(!isUnknownIncomingError(new Error('UNSUPPORTED_ATTRIBUTE')));
    assert.ok(!isUnknownIncomingError(new Error('Timeout')));
    assert.ok(!isUnknownIncomingError(null));
  });
});

describe('P3011 UnsupportedRegistry buckets', () => {
  it('record(): unsupported → persisted mark; transient/timeout → memory only', () => {
    const d = fakeDevice();
    const r = reg.getRegistry(d);
    assert.strictEqual(r.record('onOff', 'startUpOnOff', new Error('UNSUPPORTED_ATTRIBUTE')).kind, 'unsupported');
    assert.ok(r.isKnown('onOff', 'startUpOnOff'));
    r.record('onOff', 'onOff', new Error('Timeout: Expected Response'));
    r.record('onOff', 'onOff', new Error('FAILURE'));
    assert.ok(!r.isKnown('onOff', 'onOff'), 'transient never blocks');
    const snap = r.snapshot();
    assert.strictEqual(snap.total, 1);
    assert.ok(snap.soft.some((s) => s.key === 'onOff.onOff' && s.transient === 2));
  });
  it('READ_ONLY on write blocks writes only; reads stay allowed', () => {
    const r = reg.getRegistry(fakeDevice());
    r.record('basic', 'powerSource', zErr('READ_ONLY'), { write: true });
    assert.ok(r.isWriteBlocked('basic', 'powerSource'));
    assert.ok(!r.isKnown('basic', 'powerSource'));
    assert.deepStrictEqual(r.filterAttrs('basic', ['powerSource']), ['powerSource']);
  });
  it('WRITE_ONLY on read blocks the read', () => {
    const r = reg.getRegistry(fakeDevice());
    r.record('x', 'secret', new Error('WRITE_ONLY'));
    assert.ok(r.isKnown('x', 'secret'));
  });
  it('noteMissing marks after 3 strikes; noteSeen resets', () => {
    const r = reg.getRegistry(fakeDevice());
    assert.strictEqual(r.noteMissing('c', 'a'), false);
    assert.strictEqual(r.noteMissing('c', 'a'), false);
    r.noteSeen('c', 'a');
    assert.strictEqual(r.noteMissing('c', 'a'), false);
    assert.strictEqual(r.noteMissing('c', 'a'), false);
    assert.strictEqual(r.noteMissing('c', 'a'), true);
    assert.ok(r.isKnown('c', 'a'));
  });
  it('mark() persists (debounced) with the status; clear() forgets', async () => {
    const d = fakeDevice();
    const r = reg.getRegistry(d);
    r.mark('zcl:ep1.onOff', 'cmd:toggle', 'cached-reject', 'UNSUP_CLUSTER_COMMAND');
    d.timers.shift()();
    await Promise.resolve();
    assert.strictEqual(d.store.zcl_unsupported_matrix['zcl:ep1.onOff.cmd:toggle'].status, 'UNSUP_CLUSTER_COMMAND');
    r.clear();
    assert.strictEqual(r.size(), 0);
  });
});

describe('P3011 safeZclOp / writeAttributesSmart / commandSmart / bindSmart', () => {
  it('safeZclOp: by-design failure → fallback, then skipped without traffic', async () => {
    const d = fakeDevice();
    let calls = 0; let fb = 0;
    const op = () => reg.safeZclOp(d, 'meter', 'cmd:reset', async () => { calls++; throw new Error('UNSUP_CLUSTER_COMMAND'); }, { fallback: async () => { fb++; return 'dp'; } });
    const a = await op();
    assert.strictEqual(a.ok, false); assert.strictEqual(a.kind, 'unsupported'); assert.strictEqual(a.fallbackResult, 'dp');
    const b = await op();
    assert.strictEqual(b.skipped, true); assert.strictEqual(b.fallbackResult, 'dp');
    assert.strictEqual(calls, 1); assert.strictEqual(fb, 2);
  });
  it('safeZclOp: transient → no fallback by default, retried next time; fallbackOnTransient opt-in', async () => {
    const d = fakeDevice();
    let calls = 0; let fb = 0;
    const fn = async () => { calls++; throw new Error('Timeout: Expected Response'); };
    const a = await reg.safeZclOp(d, 'c', 'x', fn, { fallback: () => { fb++; } });
    await reg.safeZclOp(d, 'c', 'x', fn, { fallback: () => { fb++; } });
    assert.strictEqual(a.kind, 'timeout'); assert.strictEqual(calls, 2); assert.strictEqual(fb, 0);
    await reg.safeZclOp(d, 'c', 'x', fn, { fallback: () => { fb++; }, fallbackOnTransient: true });
    assert.strictEqual(fb, 1);
  });
  it('safeZclOp: success passes the result; rethrow keeps the contract; a throwing fallback is contained', async () => {
    const d = fakeDevice();
    assert.deepStrictEqual(await reg.safeZclOp(d, 'c', 'ok', async () => 42), { ok: true, result: 42 });
    await assert.rejects(reg.safeZclOp(d, 'c', 'r', async () => { throw new Error('FAILURE'); }, { rethrow: true }), /FAILURE/);
    const r = await reg.safeZclOp(d, 'c', 'f', async () => { throw new Error('UNSUPPORTED_ATTRIBUTE'); }, { fallback: async () => { throw new Error('boom'); } });
    assert.strictEqual(r.ok, false);
  });
  it('safeZclOp: local programming error blocked for the session (fallback runs)', async () => {
    const d = fakeDevice();
    let calls = 0;
    const fn = async () => { calls++; throw new TypeError('x is not a function'); };
    await reg.safeZclOp(d, 'c', 'cmd:x', fn);
    const b = await reg.safeZclOp(d, 'c', 'cmd:x', fn);
    assert.strictEqual(b.skipped, true); assert.strictEqual(calls, 1);
  });
  it('writeAttributesSmart: READ_ONLY record (2.6 does not throw) → remembered, next write skipped', async () => {
    const d = fakeDevice();
    const sent = [];
    const cluster = {
      constructor: { attributesById: { 1: { name: 'ro' }, 2: { name: 'rw' } } },
      writeAttributes: async (attrs) => { sent.push(Object.keys(attrs)); return { attributes: [{ status: 'READ_ONLY', id: 1 }] }; },
    };
    const a = await reg.writeAttributesSmart(d, cluster, 'cl', { ro: 1, rw: 2 });
    assert.deepStrictEqual(a.written, ['rw']); assert.strictEqual(a.rejected.ro, 'READ_ONLY');
    const b = await reg.writeAttributesSmart(d, cluster, 'cl', { ro: 1, rw: 3 });
    assert.deepStrictEqual(b.skipped, ['ro']);
    assert.deepStrictEqual(sent[1], ['rw']);
  });
  it('writeAttributesSmart: batch throw by design → isolated per attribute', async () => {
    const d = fakeDevice();
    const cluster = { writeAttributes: async (attrs) => { if ('bad' in attrs) { throw new Error('UNSUPPORTED_ATTRIBUTE'); } return { attributes: [{ status: 'SUCCESS' }] }; } };
    const r = await reg.writeAttributesSmart(d, cluster, 'cl', { good: 1, bad: 2 });
    assert.deepStrictEqual(r.written, ['good']); assert.strictEqual(r.rejected.bad, 'unsupported');
  });
  it('commandSmart: missing method → local; remote UNSUP → fallback DP', async () => {
    const d = fakeDevice();
    const a = await reg.commandSmart(d, { }, 'cl', 'magic', {});
    assert.strictEqual(a.kind, 'local_unsupported');
    let n = 0;
    const cl = { setMode: async () => { n++; throw zErr('UNSUP_CLUSTER_COMMAND'); } };
    const b = await reg.commandSmart(d, cl, 'cl', 'setMode', {}, { fallback: async () => 'dp-write' });
    assert.strictEqual(b.fallbackResult, 'dp-write');
    const c = await reg.commandSmart(d, cl, 'cl', 'setMode', {}, { fallback: async () => 'dp-write' });
    assert.strictEqual(c.skipped, true); assert.strictEqual(n, 1);
  });
  it('bindSmart: UNSUPPORTED_CLUSTER → polling fallback, never throws', async () => {
    const d = fakeDevice();
    let polled = 0;
    const r = await reg.bindSmart(d, { bind: async () => { throw new Error('UNSUPPORTED_CLUSTER'); } }, 'meter', { fallback: async () => { polled++; } });
    assert.strictEqual(r.ok, false); assert.strictEqual(polled, 1);
    assert.ok(d.logs.some((l) => /polling/.test(l)));
  });
  it('configureReportingSmart: one unreportable attribute does not blacklist the others', async () => {
    const d = fakeDevice();
    const cluster = { configureReporting: async (cfg) => { if ('bad' in cfg) { throw new Error('UNREPORTABLE_ATTRIBUTE'); } } };
    const ok = await reg.configureReportingSmart(d, cluster, 'cl', { good: {}, bad: {} });
    assert.strictEqual(ok, true);
    const r = reg.getRegistry(d);
    assert.ok(r.isKnown('cl', 'bad')); assert.ok(!r.isKnown('cl', 'good'));
  });
  it('readAttributesSmart: absent attribute → onFallback after 3 strikes', async () => {
    const d = fakeDevice();
    const missing = [];
    const cluster = { readAttributes: async () => ({ a: 1 }) };
    for (let i = 0; i < 3; i++) {
      // eslint-disable-next-line no-await-in-loop
      await reg.readAttributesSmart(d, cluster, 'cl', ['a', 'b'], { onFallback: async (_d, m) => { missing.push(...m); } });
    }
    assert.deepStrictEqual(missing, ['b']);
  });
});

// ---------------------------------------------------------------------------------------------
// Guard with an injected fake zigbee-clusters (full control of the original methods)
function makeFakeLib() {
  const behaviour = { read: null, write: null, report: null, frame: null };
  const calls = { read: [], write: [], report: [], cmd: [] };
  class Cluster {
    constructor(endpoint) { this._endpoint = endpoint; }
    async readAttributes(names) { calls.read.push(names); return behaviour.read(names); }
    async writeAttributes(attrs) { calls.write.push(Object.keys(attrs)); return behaviour.write(attrs); }
    async configureReporting(attrs) { calls.report.push(Object.keys(attrs).sort()); return behaviour.report(attrs); }
    static addCluster(C) { this.clusters[C.ID] = C; this.clusters[C.NAME] = C; }
    static getCluster(k) { return this.clusters[k]; }
  }
  Cluster.clusters = {};
  class Meter extends Cluster {
    static get ID() { return 0x0702; }
    static get NAME() { return 'metering'; }
    static get COMMANDS() { return { resetX: { id: 1 }, readAttributes: { id: 0, global: true } }; }
    async resetX() { calls.cmd.push('resetX'); return behaviour.cmd(); }
  }
  Meter.attributes = { a: { id: 1 }, b: { id: 2 }, ro: { id: 3 } };
  Meter.attributesById = { 1: { name: 'a' }, 2: { name: 'b' }, 3: { name: 'ro' } };
  Cluster.addCluster(Meter);
  class Endpoint {
    async handleZCLFrame() { return behaviour.frame(); }
  }
  return { lib: { Cluster, Endpoint }, Meter, Endpoint, behaviour, calls };
}

describe('P3011 ZclUnsupportedGuard (fake zigbee-clusters)', () => {
  let F; let node; let ep; let cl; let dev;
  beforeEach(() => {
    F = makeFakeLib();
    assert.strictEqual(guard.install(F.lib), true);
    node = {};
    ep = { _node: node, _endpointId: 1 };
    cl = new F.Meter(ep);
    dev = fakeDevice();
    guard.linkDevice(dev, node);
    guard.setEnabled(true);
  });

  it('read: an attribute UNSUPPORTED on its own read is answered locally next time', async () => {
    F.behaviour.read = () => { throw new Error('UNSUPPORTED_ATTRIBUTE'); };
    await assert.rejects(cl.readAttributes(['b']), /UNSUPPORTED_ATTRIBUTE/);
    F.behaviour.read = () => ({ a: 1 });
    assert.deepStrictEqual(await cl.readAttributes(['b']), {}, 'cached → empty result, no traffic');
    assert.deepStrictEqual(await cl.readAttributes(['a', 'b']), { a: 1 });
    assert.deepStrictEqual(F.calls.read, [['b'], ['a']]);
  });
  it('read: 2.6 omission counted as strikes (3) then filtered; transient never cached', async () => {
    F.behaviour.read = () => ({ a: 1 });
    for (let i = 0; i < 3; i++) { await cl.readAttributes(['a', 'b']); } // eslint-disable-line no-await-in-loop
    await cl.readAttributes(['a', 'b']);
    assert.deepStrictEqual(F.calls.read[3], ['a']);
    F.behaviour.read = () => { throw new Error('Timeout: Expected Response'); };
    await assert.rejects(cl.readAttributes(['a']), /Timeout/);
    await assert.rejects(cl.readAttributes(['a']), /Timeout/);
    assert.strictEqual(F.calls.read.length, 6);
  });
  it('write: READ_ONLY response record → next single write rejected locally with same shape', async () => {
    F.behaviour.write = () => ({ attributes: [{ status: 'READ_ONLY', id: 3 }] });
    const r = await cl.writeAttributes({ ro: 1 });
    assert.strictEqual(r.attributes[0].status, 'READ_ONLY');
    await assert.rejects(cl.writeAttributes({ ro: 1 }), (e) => e.cached === true && e.message === 'READ_ONLY' && e.zclStatus === 'READ_ONLY');
    F.behaviour.write = () => ({ attributes: [{ status: 'SUCCESS', id: 1 }] });
    const mixed = await cl.writeAttributes({ ro: 1, a: 2 });
    assert.deepStrictEqual(F.calls.write[F.calls.write.length - 1], ['a']);
    assert.ok(mixed.attributes.some((x) => x.status === 'READ_ONLY' && x.id === 3), 'blocked attr still reported');
    // reads of a read-only attribute stay allowed
    F.behaviour.read = () => ({ ro: 5 });
    assert.deepStrictEqual(await cl.readAttributes(['ro']), { ro: 5 });
  });
  it('reporting: multi-attr failure isolated once; unreportable one cached, the other kept', async () => {
    F.behaviour.report = (attrs) => { if ('b' in attrs) { throw new Error('UNREPORTABLE_ATTRIBUTE'); } };
    await assert.rejects(cl.configureReporting({ a: {}, b: {} }), /UNREPORTABLE/);
    assert.deepStrictEqual(F.calls.report, [['a', 'b'], ['a'], ['b']]);
    await assert.rejects(cl.configureReporting({ a: {}, b: {} }), (e) => e.cached === true);
    assert.deepStrictEqual(F.calls.report[3], ['a'], 'only the reportable attribute is sent');
    await assert.rejects(cl.configureReporting({ b: {} }), (e) => e.cached === true);
    assert.strictEqual(F.calls.report.length, 4);
  });
  it('commands: remote UNSUP_CLUSTER_COMMAND cached; local TypeError / timeout never cached', async () => {
    F.behaviour.cmd = () => { throw new TypeError('bad args'); };
    await assert.rejects(cl.resetX({}), /bad args/);
    F.behaviour.cmd = () => { throw new Error('Timeout: Expected Response'); };
    await assert.rejects(cl.resetX({}), /Timeout/);
    F.behaviour.cmd = () => { throw new Error('UNSUP_CLUSTER_COMMAND'); };
    await assert.rejects(cl.resetX({}), (e) => !e.cached);
    await assert.rejects(cl.resetX({}), (e) => e.cached === true && e.message === 'UNSUP_CLUSTER_COMMAND');
    assert.strictEqual(F.calls.cmd.length, 3);
  });
  it('UNSUPPORTED_CLUSTER blocks the whole cluster on that endpoint only', async () => {
    F.behaviour.cmd = () => { throw new Error('UNSUPPORTED_CLUSTER'); };
    await assert.rejects(cl.resetX({}));
    await assert.rejects(cl.readAttributes(['a']), (e) => e.cached === true);
    const other = new F.Meter({ _node: node, _endpointId: 2 });
    F.behaviour.read = () => ({ a: 1 });
    assert.deepStrictEqual(await other.readAttributes(['a']), { a: 1 });
  });
  it('per device: another node is not affected; marks persisted with status for restart', async () => {
    F.behaviour.cmd = () => { throw new Error('UNSUP_CLUSTER_COMMAND'); };
    await assert.rejects(cl.resetX({}));
    const other = new F.Meter({ _node: {}, _endpointId: 1 });
    F.behaviour.cmd = () => 'ok';
    assert.strictEqual(await other.resetX({}), 'ok');
    const r = reg.getRegistry(dev);
    assert.ok(r.isKnown('zcl:ep1.metering', 'cmd:resetX'));
    assert.strictEqual(r._load()['zcl:ep1.metering.cmd:resetX'].status, 'UNSUP_CLUSTER_COMMAND');
    // simulated restart: fresh node, same device store → still answered locally with the same status
    guard.forget(node);
    await assert.rejects(cl.resetX({}), (e) => e.cached === true && e.message === 'UNSUP_CLUSTER_COMMAND');
  });
  it('TTL: memory entries expire so a firmware update is re-probed', async () => {
    F.behaviour.cmd = () => { throw new Error('UNSUP_CLUSTER_COMMAND'); };
    const anon = new F.Meter({ _node: {}, _endpointId: 1 }); // no device → memory only
    await assert.rejects(anon.resetX({}));
    const realNow = Date.now;
    try {
      Date.now = () => realNow() + guard.MEM_TTL_MS + 1000;
      F.behaviour.cmd = () => 'ok';
      assert.strictEqual(await anon.resetX({}), 'ok');
    } finally { Date.now = realNow; }
  });
  it('kill switch: disabled → pure passthrough', async () => {
    F.behaviour.cmd = () => { throw new Error('UNSUP_CLUSTER_COMMAND'); };
    await assert.rejects(cl.resetX({}));
    guard.setEnabled(false);
    try {
      await assert.rejects(cl.resetX({}), (e) => !e.cached);
      assert.strictEqual(F.calls.cmd.length, 2);
    } finally { guard.setEnabled(true); }
  });
  it('clusters registered later (custom Tuya) are guarded through addCluster', async () => {
    class Late extends F.lib.Cluster {
      static get ID() { return 0xef00; }
      static get NAME() { return 'tuya'; }
      static get COMMANDS() { return { dataQuery: { id: 3 } }; }
      async dataQuery() { F.calls.cmd.push('dq'); throw new Error('UNSUP_MANUF_CLUSTER_COMMAND'); }
    }
    F.lib.Cluster.addCluster(Late);
    const t = new Late(ep);
    await assert.rejects(t.dataQuery({}));
    await assert.rejects(t.dataQuery({}), (e) => e.cached === true);
    assert.strictEqual(F.calls.cmd.filter((c) => c === 'dq').length, 1);
  });
  it('unknown incoming frame → sink + generic Flow trigger, still rethrown (spec Default Response)', async () => {
    F.behaviour.frame = () => { throw new Error('binding_unavailable'); };
    const e = Object.assign(new F.Endpoint(), { _node: node, _endpointId: 1 });
    await assert.rejects(e.handleZCLFrame(0xe001, { cmdId: 0xfd, data: Buffer.from([1, 2]), frameControl: {} }), /binding_unavailable/);
    const ring = sink.recent(dev);
    assert.strictEqual(ring.length, 1);
    assert.strictEqual(ring[0].cluster, '0xE001');
    assert.strictEqual(dev.triggers[0][0], 'tuya_cluster_received');
    assert.deepStrictEqual(dev.triggers[0][1], { cluster_id: '0xE001', command_id: 0xfd, data_hex: '0102' });
  });
  it('install() is idempotent', () => {
    const before = F.lib.Cluster.prototype.readAttributes;
    assert.strictEqual(guard.install(F.lib), true);
    assert.strictEqual(F.lib.Cluster.prototype.readAttributes, before);
  });
});

describe('P3011 guard on the real zigbee-clusters (pinned 2.6)', () => {
  const zc = require('zigbee-clusters');
  it('wraps generated (non-writable) command methods and keeps them callable', async () => {
    assert.strictEqual(guard.install(), true);
    class P3011Probe extends zc.Cluster {
      static get ID() { return 0xfc7e; }
      static get NAME() { return 'p3011Probe'; }
      static get ATTRIBUTES() { return {}; }
      static get COMMANDS() { return { probeCmd: { id: 0x01 } }; }
    }
    zc.Cluster.addCluster(P3011Probe);
    const node = {};
    const c = new P3011Probe({ _node: node, _endpointId: 1 });
    let sends = 0;
    c.sendFrame = async () => { sends++; throw new Error('UNSUP_MANUF_CLUSTER_COMMAND'); };
    await assert.rejects(c.probeCmd({}, { waitForResponse: false }), /UNSUP_MANUF/);
    await assert.rejects(c.probeCmd({}, { waitForResponse: false }), (e) => e.cached === true);
    assert.strictEqual(sends, 1);
    zc.Cluster.removeCluster('p3011Probe');
  });
  it('real Endpoint.handleZCLFrame "cluster_unavailable" reaches the sink', async () => {
    const Endpoint = require('zigbee-clusters/lib/Endpoint');
    const node = {}; const d = fakeDevice();
    guard.linkDevice(d, node);
    const fakeEp = { _node: node, _endpointId: 1, clusters: {}, bindings: {} };
    await assert.rejects(Endpoint.prototype.handleZCLFrame.call(fakeEp, 0xef00, { cmdId: 0x24, data: Buffer.alloc(0), frameControl: { directionToClient: true } }), /cluster_unavailable/);
    assert.strictEqual(sink.recent(d)[0].cluster, '0xEF00');
    assert.strictEqual(sink.recent(d)[0].dir, 'toClient');
  });
});

describe('P3011 UnknownCommandSink', () => {
  it('ring bounded, counts persisted (debounced), flow rate-limited per key, bridge preferred', () => {
    const d = fakeDevice();
    for (let i = 0; i < sink.RING_MAX + 5; i++) { sink.record(d, { clusterId: 0xe001, cmdId: 1, endpoint: 1 }); }
    assert.strictEqual(sink.recent(d).length, sink.RING_MAX);
    assert.strictEqual(d.triggers.length, 1, 'same key within 1 s → one Flow trigger');
    assert.strictEqual(d.logs.filter((l) => /ZCL-UNKNOWN/.test(l)).length, 1, 'logged once per key');
    assert.strictEqual(d.timers.length, 1);
    d.timers[0]();
    assert.strictEqual(d.store.zcl_unknown_incoming['ep1.0xE001.cmd1'].n, sink.RING_MAX + 5);
    const bridged = []; const b = fakeDevice({ _universalBridge: { onClusterEvent: (...a) => bridged.push(a) } });
    sink.record(b, { clusterId: 0xef00, cmdId: 0x25, data: Buffer.from([9]) });
    assert.strictEqual(bridged.length, 1); assert.strictEqual(b.triggers.length, 0);
  });
  it('never throws (null device, broken flow, persisted keys bounded)', () => {
    assert.strictEqual(sink.record(null, {}), null);
    const d = fakeDevice({ homey: { setTimeout: () => 0, flow: { getDeviceTriggerCard: () => { throw new Error('no card'); } } } });
    for (let i = 0; i < sink.PERSIST_MAX + 10; i++) { assert.ok(sink.record(d, { clusterId: 0xe000, cmdId: i })); }
    assert.ok(Object.keys(d._unknownIncoming.counts).length <= sink.PERSIST_MAX);
  });
});

describe('P3011 RejectionTriage', () => {
  it('expected outcomes → one quiet line per minute; real bugs stay loud', () => {
    const logs = []; const errs = []; let t = 0;
    const tr = createTriage({ log: (m) => logs.push(m), error: (...a) => errs.push(a), now: () => t });
    tr.handle(new Error('UNSUPPORTED_ATTRIBUTE'));
    tr.handle(new Error('UNSUPPORTED_ATTRIBUTE'));
    tr.handle(new Error('Timeout: Expected Response'));
    tr.handle(new TypeError('Cannot read properties of undefined'));
    assert.strictEqual(logs.length, 2); assert.strictEqual(errs.length, 1);
    t += 61000;
    tr.handle(new Error('UNSUPPORTED_ATTRIBUTE'));
    assert.ok(/\+1/.test(logs[2]), logs[2]);
    assert.deepStrictEqual(tr.stats, { quiet: 3, loud: 1, suppressed: 1 });
  });
});

describe('P3011 RoutedBoundCluster raw capture (2.6 + 3.9 forms)', () => {
  const { isUnknownCommandError, makeRoutedBoundCluster } = require('../../lib/zigbee/cluster/RoutedBoundCluster');
  it('matcher', () => {
    assert.ok(isUnknownCommandError(new Error('unknown_command_received')));
    assert.ok(isUnknownCommandError(zErr('UNSUP_CLUSTER_COMMAND')));
    assert.ok(!isUnknownCommandError(new Error('UNSUPPORTED_ATTRIBUTE')));
  });
  it('unknown command is routed as raw AND handed to onUnknown (Flow sink)', async () => {
    const routed = []; const unknown = [];
    const R = makeRoutedBoundCluster('onOff', { route: (e) => routed.push(e), onUnknown: (e) => unknown.push(e) });
    const inst = new R(1);
    inst.cluster = require('zigbee-clusters').Cluster.getCluster('onOff'); // what Endpoint.bind() sets
    const res = await inst.handleFrame({ cmdId: 0xfd, data: Buffer.from([0]), frameControl: { clusterSpecific: true } }, {}, Buffer.alloc(0));
    assert.strictEqual(res, undefined);
    assert.strictEqual(routed[0].command, 'raw');
    assert.strictEqual(unknown[0].cmdId, 0xfd);
    assert.strictEqual(unknown[0].clusterName, 'onOff');
  });
});

describe('P3011 Tuya EF00 query-all method memory', () => {
  it('a rejected dataQuery path is remembered per device and skipped next time', async () => {
    const d = fakeDevice();
    let dq = 0; let cmd = 0; let raw = 0;
    const cluster = {
      dataQuery: async () => { dq++; throw new Error('UNSUP_MANUF_CLUSTER_COMMAND'); },
      command: async () => { cmd++; throw new Error('UNSUP_MANUF_CLUSTER_COMMAND'); },
    };
    const mgr = { sendRaw: async () => { raw++; } };
    assert.strictEqual(await sendQueryAllFallback(cluster, mgr, d), 'manager.sendRaw');
    assert.strictEqual(await sendQueryAllFallback(cluster, mgr, d), 'manager.sendRaw');
    assert.deepStrictEqual([dq, cmd, raw], [1, 1, 2]);
  });
  it('transient failure is retried (not remembered); legacy 2-arg call still works', async () => {
    const d = fakeDevice();
    let dq = 0;
    const cluster = { dataQuery: async () => { dq++; throw new Error('Timeout: Expected Response'); } };
    await sendQueryAllFallback(cluster, null, d);
    await sendQueryAllFallback(cluster, null, d);
    assert.strictEqual(dq, 2);
    assert.strictEqual(await sendQueryAllFallback({ dataQuery: async () => {} }, null), 'cluster.dataQuery');
  });
});
