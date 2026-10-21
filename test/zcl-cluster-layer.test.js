'use strict';

const assert = require('assert');
const { Cluster, BoundCluster } = require('zigbee-clusters');
const R = require('../lib/zigbee/cluster/ClusterRegistry');
const { makeRoutedBoundCluster, bindAll } = require('../lib/zigbee/cluster/RoutedBoundCluster');
const Z = require('../lib/zigbee/cluster/ZclCodec');
const { BindingPlanner, MAX_ATTEMPTS } = require('../lib/zigbee/cluster/BindingPlanner');
const { planFor, ReportingManager, MAX_POLLERS } = require('../lib/zigbee/cluster/ReportingPlan');
const AIO = require('../lib/zigbee/cluster/AttributeIO');
const EA = require('../lib/zigbee/cluster/EndpointAdapter');

describe('P2931 cluster layer', () => {
  describe('ClusterRegistry', () => {
    before(() => R.install());
    it('install is idempotent', () => assert.strictEqual(R.install(), false));
    it('legacy EF00 cannot replace canonical (any order)', () => {
      const canon = require('../lib/clusters/TuyaSpecificCluster');
      const legacyMod = require('../lib/TuyaSpecificCluster');
      const legacy = legacyMod.TuyaSpecificCluster || legacyMod;
      Cluster.addCluster(canon); Cluster.addCluster(legacy); Cluster.addCluster(canon);
      const c = Cluster.getCluster(0xEF00);
      for (const k of ['mcuSyncTime', 'sceneWakeup', 'dpStatusUpdate', 'cmd0B']) assert.ok(c.COMMANDS[k], k);
      assert.deepStrictEqual(c.commandsById[36].map(x => x.name), ['mcuSyncTime']);
      assert.strictEqual(typeof c.prototype.timeSync, 'function');
      assert.strictEqual(Cluster.getCluster('tuya'), c);
    });
    it('legacy timeSync event still emitted', () => {
      const c = Cluster.getCluster(0xEF00);
      const fake = { timeSync: async () => {}, emit(n) { this.got = (this.got || []).concat(n); }, listenerCount: () => 1 };
      c.prototype.onMcuSyncTime.call(fake, { payloadSize: 0 });
      assert.ok(fake.got.includes('timeSync'));
    });
    it('grafts pollControl checkIn + ota client commands', () => {
      assert.ok(Cluster.getCluster('pollControl').COMMANDS.checkIn);
      assert.ok(Cluster.getCluster('ota').COMMANDS.queryNextImageRequest);
      assert.ok(Cluster.getCluster('pollControl').COMMANDS.fastPollStop);
    });
    it('same class twice is a skip, bounded log', () => {
      const before = R.stats().skips;
      Cluster.addCluster(Cluster.getCluster('onOff'));
      assert.ok(R.stats().skips > before);
      assert.ok(R.stats().log.length <= R.MAX_LOG);
    });
  });

  describe('RoutedBoundCluster', () => {
    it('routes every known command of each standard client cluster', () => {
      for (const name of ['onOff', 'levelControl', 'scenes', 'colorControl', 'windowCovering', 'groups', 'pollControl', 'ota']) {
        const evts = []; const K = makeRoutedBoundCluster(name, { route: e => evts.push(e) });
        assert.ok(K, name); const b = new K(2);
        assert.ok(b instanceof BoundCluster);
        const cmds = Object.entries(Cluster.getCluster(name).COMMANDS).filter(([, d]) => !d.isResponse);
        for (const [cmd] of cmds) b[cmd]({});
        assert.strictEqual(evts.length, cmds.length, name);
        if (evts.length) assert.strictEqual(evts[0].endpoint, 2);
      }
    });
    it('unknown command is captured, not rejected', async () => {
      const evts = []; const K = makeRoutedBoundCluster('onOff', { route: e => evts.push(e) });
      const b = new K(1); b.endpoint = { ID: 1, getLogId: () => '' };
      b.cluster = Cluster.getCluster('onOff');
      await b.handleFrame({ cmdId: 0xfd, frameControl: { clusterSpecific: true, manufacturerSpecific: false, directionToClient: false }, data: Buffer.from([1]) }, {}, Buffer.alloc(0));
      assert.strictEqual(evts[0].command, 'raw'); assert.strictEqual(evts[0].cmdId, 0xfd);
    });
    it('bindAll is additive', () => {
      const bound = {};
      const ep = { bindings: { onOff: {} }, bind: (n, i) => { bound[n] = i; } };
      const done = bindAll({ endpoints: { 1: ep } }, { route() {} });
      assert.ok(!bound.onOff); assert.ok(bound.scenes); assert.ok(done.includes('1:levelControl'));
    });
    it('route errors are swallowed', () => {
      const K = makeRoutedBoundCluster('onOff', { route: () => { throw new Error('x'); } });
      const b = new K(1); b.toggle({}); assert.strictEqual(b.stats.errors, 1);
    });
  });

  describe('ZclCodec', () => {
    it('decodes types incl. Tuya struct/array', () => {
      const v = (hex, t) => Z.readValue(Buffer.from(hex, 'hex'), 0, t).value;
      assert.strictEqual(v('ffffff', Z.T.INT24), -1);
      assert.strictEqual(v('feff7f', Z.T.UINT24), 0x7ffffe);
      assert.strictEqual(v('03', Z.T.ENUM8), 3);
      assert.strictEqual(v('0f', Z.T.BITMAP8), 15);
      assert.ok(Math.abs(v('0000c03f', Z.T.SINGLE) - 1.5) < 1e-9);
      assert.strictEqual(v('03616263', Z.T.CHARSTR), 'abc');
      assert.strictEqual(v('02beef', Z.T.OCTSTR), 'beef');
      assert.deepStrictEqual(v('200200 0102'.replace(' ', ''), Z.T.ARRAY), [1, 2]);
      assert.deepStrictEqual(v('020020052107 00'.replace(/ /g, ''), Z.T.STRUCT), [{ type: 0x20, value: 5 }, { type: 0x21, value: 7 }]);
      assert.strictEqual(v('ff', Z.T.CHARSTR), null);
    });
    it('parses report, read response, default response, discover', () => {
      const rep = Z.parseFrame(Buffer.from('18010a0000290a00', 'hex'));
      assert.strictEqual(rep.command, 'reportAttributes'); assert.strictEqual(rep.payload.attributes[0].value, 10);
      const rr = Z.parseFrame(Buffer.from('180201 0400 00 42 03 5a 42 4b 0500 86'.replace(/ /g, ''), 'hex'));
      assert.strictEqual(rr.payload.attributes[0].value, 'ZBK'); assert.strictEqual(rr.payload.attributes[1].status, 0x86);
      const dr = Z.parseFrame(Buffer.from('18030b0100', 'hex'));
      assert.deepStrictEqual(dr.payload, { cmdId: 1, status: 0 });
      const da = Z.parseFrame(Buffer.from('18040d01000020010030', 'hex'));
      assert.strictEqual(da.payload.complete, true); assert.strictEqual(da.payload.attributes[1].type, 0x30);
    });
    it('mfr-specific header and never throws', () => {
      const f = Z.parseFrame(Buffer.from('1d02100501', 'hex'));
      assert.strictEqual(f.header.manufacturerId, 0x1002); assert.strictEqual(f.header.cmdId, 1);
      assert.strictEqual(Z.parseFrame(Buffer.from('18', 'hex')).ok, false);
      assert.strictEqual(Z.parseFrame(Buffer.from('18010a0000ee', 'hex')).ok, false);
    });
    it('builds default response mirroring mfr code', () => {
      const h = Z.parseHeader(Buffer.from('0502100701', 'hex'));
      assert.strictEqual(Z.buildDefaultResponse(h).toString('hex'), '1c0210070b0100');
    });
  });

  describe('BindingPlanner', () => {
    const nd = { endpoints: [{ endpointId: 1, outputClusters: [6, 8] }, { endpointId: 2, outputClusters: [6] }] };
    it('binds every endpoint, retries on wake, bounded', async () => {
      let fail = true; const calls = [];
      const mk = k => ({ bind: async () => { calls.push(k); if (fail) throw new Error('sleep'); } });
      const z = { endpoints: { 1: { clusters: { onOff: mk('1on'), levelControl: mk('1lv') } }, 2: { clusters: { onOff: mk('2on') } } } };
      const p = new BindingPlanner({ now: () => 0 });
      const r1 = await p.run(z, nd); assert.strictEqual(r1.failed.length, 3);
      const r2 = await p.run(z, nd); assert.strictEqual(r2.skipped.length, 3); // cooldown: no storm
      fail = false; const r3 = await p.onWake(z, nd); assert.strictEqual(r3.bound.length, 3);
      const r4 = await p.onWake(z, nd); assert.strictEqual(r4.skipped.length, 3);
      assert.ok(calls.length <= 3 * MAX_ATTEMPTS);
    });
  });

  describe('ReportingPlan', () => {
    it('defaults per capability and bounded polling fallback', async () => {
      const entries = planFor(['onoff', 'measure_temperature', 'measure_humidity', 'measure_power', 'measure_voltage', 'measure_battery', 'foo']);
      assert.strictEqual(entries.length, 6);
      const timers = []; const m = new ReportingManager({ setInterval: (f, ms) => { timers.push(ms); return { ms }; }, clearInterval: () => {} });
      const bad = { configureReporting: async () => { throw new Error('UNSUPPORTED'); }, readAttributes: async () => ({}) };
      const ep = { clusters: { onOff: bad, temperatureMeasurement: bad, relativeHumidity: bad, electricalMeasurement: bad, powerConfiguration: bad } };
      const r = await m.apply(ep, entries, { pollMs: 1000 });
      assert.ok(m.pollerCount <= MAX_POLLERS); assert.ok(r.dropped.length >= 1);
      assert.ok(timers.every(ms => ms >= 5 * 60 * 1000));
      m.onReport('onOff', 'onOff'); assert.strictEqual(m.pollerCount, MAX_POLLERS - 1);
      m.destroy(); assert.strictEqual(m.pollerCount, 0);
    });
  });

  describe('AttributeIO', () => {
    it('falls back without mfr code, then per attribute', async () => {
      const seen = [];
      const c = { readAttributes: async (a, o) => { seen.push([a.join(), o && o.manufacturerId]); if (a.length > 1) throw new Error('x'); return { [a[0]]: 1 }; } };
      const r = await AIO.readAttributes(c, ['a', 'b'], { manufacturerId: 0x1002, retries: 0, timeout: 50 });
      assert.deepStrictEqual(r, { a: 1, b: 1 });
      assert.deepStrictEqual(seen[1], ['a,b', undefined]);
    });
    it('times out', async () => {
      const c = { readAttributes: () => new Promise(() => {}) };
      await assert.rejects(AIO.readAttributes(c, ['a'], { timeout: 20, retries: 0 }), /attr_timeout/);
    });
    it('write retries without mfr code', async () => {
      const c = { writeAttributes: async (v, o) => { if (o) throw new Error('UNSUP'); return 'ok'; } };
      assert.strictEqual(await AIO.writeAttributes(c, { x: 1 }, { manufacturerId: 0x1002, retries: 0, timeout: 50 }), 'ok');
    });
  });

  describe('EndpointAdapter', () => {
    it('additive plan from node descriptor', () => {
      const plan = EA.diff({ 1: { clusters: [0, 6], bindings: [6] } },
        { endpoints: [{ endpointId: 1, inputClusters: [0, 6, 0xef00], outputClusters: [6, 8] }, { endpointId: 2, inputClusters: [6], outputClusters: [6] }, { endpointId: 242, inputClusters: [], outputClusters: [33] }] });
      assert.deepStrictEqual(plan.extraEndpoints, [2]);
      assert.ok(plan.addListen.some(x => x.ep === 1 && x.cluster === 0xef00));
      assert.ok(plan.addBind.some(x => x.ep === 1 && x.cluster === 8));
      assert.ok(!plan.addBind.some(x => x.ep === 242));
      assert.strictEqual(plan.missing.length, 0);
    });
  });
});
