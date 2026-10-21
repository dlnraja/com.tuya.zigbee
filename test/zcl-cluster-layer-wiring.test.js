'use strict';

const assert = require('assert');
const L = require('../lib/zigbee/cluster/ClusterLayerAttach');
const OTAUpdateManager = require('../lib/ota/OTAUpdateManager');

function fakeDevice({ caps = [], settings = {}, appFlag, descriptors, cls = 'button', id = 'd1' } = {}) {
  const fired = []; const logs = [];
  return {
    fired, logs,
    homey: {
      settings: { get: k => (k === 'zcl_cluster_layer_disabled' ? appFlag : undefined) },
      setInterval: () => ({}), clearInterval: () => {},
      app: { _ensureOTAManager() { return this.m; } },
    },
    driver: { id: 'scene_remote', manifest: { class: cls } },
    node: descriptors ? { endpointDescriptors: descriptors } : undefined,
    getData: () => ({ id }),
    getCapabilities: () => caps,
    getSetting: k => settings[k],
    log: (...a) => logs.push(a.join(' ')),
    _triggerPhysicalFlow: (b, t, tok) => { fired.push([b, t, tok.path]); return Promise.resolve(true); },
  };
}

function fakeNode() {
  const mk = () => ({ bindings: {}, clusters: {}, bind(n, i) { this.bindings[n] = i; } });
  const e1 = mk(); const e2 = mk();
  e1.clusters.onOff = { bound: 0, bind: async function () { this.bound++; }, on() {} };
  e1.clusters.pollControl = {};
  return { endpoints: { 1: e1, 2: e2 }, handleFrame: async () => 'root' };
}

describe('P2935 cluster layer wiring', () => {
  before(() => require('../lib/zigbee/cluster/ClusterRegistry').install());
  it('kill switches: device setting and app flag', async () => {
    assert.strictEqual(L.enabled(fakeDevice()), true);
    assert.strictEqual(L.enabled(fakeDevice({ settings: { zcl_cluster_layer: false } })), false);
    assert.strictEqual(L.enabled(fakeDevice({ appFlag: true })), false);
    const d = fakeDevice({ appFlag: true }); const z = fakeNode();
    assert.strictEqual(await L.attach(d, z), null);
    assert.deepStrictEqual(Object.keys(z.endpoints[1].bindings), []);
  });

  it('attach is additive, idempotent, routes remote presses', async () => {
    const d = fakeDevice({ descriptors: [{ endpointId: 1, outputClusters: [6] }] });
    const z = fakeNode();
    const own = {}; z.endpoints[1].bindings.onOff = own;
    const st = await L.attach(d, z);
    assert.strictEqual(z.endpoints[1].bindings.onOff, own, 'driver binding kept');
    assert.ok(z.endpoints[2].bindings.onOff, 'missing binding added');
    assert.strictEqual(await L.attach(d, z), st, 'idempotent');
    assert.strictEqual(z.endpoints[1].clusters.onOff.bound, 1, 'bound once');
    z.endpoints[2].bindings.onOff.toggle({});
    z.endpoints[2].bindings.scenes.recall({ sceneId: 1 });
    assert.ok(require('zigbee-clusters').Cluster.getCluster('scenes').COMMANDS.recall, 'scenes grafted');
    assert.strictEqual(d.fired.length, 2);
    assert.strictEqual(d.fired[0][0], 2);
    assert.strictEqual(typeof z.endpoints[1].clusters.pollControl.onCheckIn, 'function');
    L.detach(d); assert.strictEqual(d._p2935, null);
  });

  it('no ghost presses on switches (onoff capability, not scene mode)', async () => {
    const d = fakeDevice({ caps: ['onoff'], cls: 'socket', id: 'sw1' }); d.driver.id = 'switch_1gang';
    const z = fakeNode(); await L.attach(d, z);
    z.endpoints[2].bindings.onOff.toggle({});
    assert.strictEqual(d.fired.length, 0);
    L.detach(d);
  });

  it('never binds without a real descriptor', async () => {
    const d = fakeDevice(); const z = fakeNode(); await L.attach(d, z);
    assert.strictEqual(z.endpoints[1].clusters.onOff.bound, 0);
    L.detach(d);
  });

  it('OTA client frames reach the OTA manager passively', async () => {
    const homey = { notifications: { createNotification: async () => {} }, settings: { get() {}, set() {} }, setInterval() {}, clearInterval() {}, setTimeout() {}, clearTimeout() {} };
    let m; try { m = new OTAUpdateManager(homey); } catch (e) { m = Object.create(OTAUpdateManager.prototype); m.activeUpdates = new Map(); m.updateHistory = []; }
    const d = fakeDevice({ id: 'ota1' }); d.homey.app.m = m;
    const z = fakeNode(); await L.attach(d, z);
    // queryNextImageRequest: fc=0x01 (cluster, client->server), seq, cmd 0x01, fieldCtl, mfr 0x1141, type 0x0001, ver 0x00000042
    const f = Buffer.from('010501' + '00' + '4111' + '0100' + '42000000', 'hex');
    assert.strictEqual(await z.handleFrame(1, 0x0019, f, {}), 'root', 'frame still reaches native');
    const r = m.getClientReport('ota1');
    assert.strictEqual(r.fileVersion, 0x42); assert.strictEqual(r.manufacturerCode, 0x1141);
    const end = Buffer.from('010606' + '00' + '4111' + '0100' + '43000000', 'hex');
    await z.handleFrame(1, 0x0019, end, {});
    assert.strictEqual(m.getClientReport('ota1').lastEndStatus, 0);
    for (let i = 0; i < 260; i++) m.noteClientRequest({ getData: () => ({ id: `x${i}` }) }, 'queryNextImageRequest', { fileVersion: i });
    assert.ok(m.clientReports.size <= 200);
    L.detach(d);
  });
});
