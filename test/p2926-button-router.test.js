'use strict';
const assert = require('assert');
const R = require('../lib/buttons/ButtonEventRouter');
const { attachButtonPaths, detachButtonPaths } = require('../lib/buttons/attachButtonPaths');

describe('P2926 ButtonEventRouter — normalizers per path', () => {
  it('zcl_onoff toggle/on/off', () => {
    assert.deepStrictEqual(R.normalize.zcl_onoff({ endpoint: 2, command: 'commandToggle' }), { button: 2, type: 'single' });
    assert.strictEqual(R.normalize.zcl_onoff({ endpoint: 1, command: 'off', mode: 'command' }).type, 'double');
    assert.strictEqual(R.normalize.zcl_onoff({ endpoint: 1, command: 'bogus' }), null);
  });
  it('tuya_fd 0/1/2', () => {
    assert.deepStrictEqual([0, 1, 2].map((v) => R.normalize.tuya_fd({ endpoint: 3, value: v }).type), ['single', 'double', 'long']);
  });
  it('scene_recall multi-endpoint and single-endpoint blocks + explicit map', () => {
    assert.deepStrictEqual(R.normalize.scene_recall({ endpoint: 4, sceneId: 1, endpointCount: 4 }), { button: 4, type: 'double' });
    assert.deepStrictEqual(R.normalize.scene_recall({ endpoint: 1, sceneId: 18, endpointCount: 1 }), { button: 2, type: 'double' });
    assert.deepStrictEqual(R.normalize.scene_recall({ endpoint: 1, sceneId: 33, endpointCount: 1 }), { button: 1, type: 'long' });
    assert.deepStrictEqual(R.normalize.scene_recall({ sceneId: 7, map: { 7: { button: 5, type: 'long' } } }), { button: 5, type: 'long' });
  });
  it('level_step rotate/move/stop', () => {
    assert.strictEqual(R.normalize.level_step({ command: 'step', stepMode: 1 }).rotate, 'rotate_left');
    assert.strictEqual(R.normalize.level_step({ command: 'move' }).type, 'long');
    assert.strictEqual(R.normalize.level_step({ command: 'stop' }).type, 'release');
  });
  it('e000 / e001 / ef00_dp / multistate / onoff_attr / raw', () => {
    assert.strictEqual(R.normalize.e000({ endpoint: 1, value: 2 }).type, 'long');
    assert.strictEqual(R.normalize.e001({ endpoint: 2, value: 1 }).button, 2);
    assert.deepStrictEqual(R.normalize.ef00_dp({ dp: 3, value: 1 }), { button: 3, type: 'double' });
    assert.strictEqual(R.normalize.ef00_dp({ dp: 101, value: 0 }), null);
    assert.deepStrictEqual(R.normalize.ef00_dp({ dp: 101, value: 0, dpMap: { 101: { button: 9 } } }), { button: 9, type: 'single' });
    assert.strictEqual(R.normalize.multistate({ endpoint: 1, value: 2 }).type, 'double');
    assert.strictEqual(R.normalize.multistate({ endpoint: 1, value: 0 }).type, 'long');
    assert.deepStrictEqual(R.normalize.onoff_attr({ endpoint: 2 }), { button: 2, type: 'single' });
    assert.strictEqual(R.normalize.raw({ endpoint: 1, commandId: 9, payload: [1] }).type, 'double');
  });
  it('scene / operating mode interpretation (0x8004, E001 0xD020, decoupled)', () => {
    assert.strictEqual(R.modeFrom8004(1), 'scene');
    assert.strictEqual(R.modeFrom8004(0), 'command');
    assert.strictEqual(R.modeFrom8004(undefined), 'unknown');
    assert.strictEqual(R.modeFromE001(1), 'scene');
    assert.strictEqual(R.isDecoupled('decoupled'), true);
    assert.strictEqual(R.isDecoupled(0), false);
  });
});

describe('P2926 ButtonEventRouter — dedup + learning', () => {
  const mk = () => { let t = 1000; const r = new R.ButtonRouter({ now: () => t }); return { r, at: (ms) => { t = ms; } }; };
  it('same press via two paths fires once', () => {
    const { r, at } = mk();
    assert.ok(r.admit({ button: 1, type: 'single', path: 'tuya_fd' }).admit);
    at(1080);
    assert.strictEqual(r.admit({ button: 1, type: 'single', path: 'scene_recall' }).admit, false);
  });
  it('same path repeats pass (double-click owned upstream); other buttons pass', () => {
    const { r, at } = mk();
    r.admit({ button: 1, type: 'single', path: 'tuya_fd' }); at(1100);
    assert.ok(r.admit({ button: 1, type: 'single', path: 'tuya_fd' }).admit);
    assert.ok(r.admit({ button: 2, type: 'single', path: 'scene_recall' }).admit);
  });
  it('after window, other path passes', () => {
    const { r, at } = mk();
    r.admit({ button: 1, type: 'single', path: 'a' }); at(1000 + R.BASE_WINDOW_MS + 1);
    assert.ok(r.admit({ button: 1, type: 'single', path: 'b' }).admit);
  });
  it('same transaction sequence on any path is a copy', () => {
    const { r, at } = mk();
    r.admit({ button: 1, type: 'single', path: 'a', seq: 7 }); at(1010);
    assert.strictEqual(r.admit({ button: 1, type: 'single', path: 'a', seq: 7 }).reason, 'same-seq');
  });
  it('window adapts to observed cross-path latency and stays clamped', () => {
    const { r, at } = mk();
    let t = 1000;
    for (let i = 0; i < 10; i++) { at(t); r.admit({ button: 1, type: 'single', path: 'a' }); at(t + 40); r.admit({ button: 1, type: 'single', path: 'b' }); t += 5000; }
    assert.strictEqual(r.windowMs(), R.MIN_WINDOW_MS);
    assert.ok(r._lat.length <= 16);
  });
  it('learns preferred paths, emulation only when not native, bounded unknown ring', () => {
    const { r, at } = mk();
    let t = 1000;
    for (let i = 0; i < 3; i++) { at(t += 5000); r.admit({ button: 1, type: 'single', path: 'tuya_fd' }); }
    at(t += 5000); r.admit({ button: 1, type: 'single', path: 'multistate' });
    assert.strictEqual(r.preferredPaths()[0], 'tuya_fd');
    assert.ok(r.shouldEmulate('double'));
    r.admit({ button: 1, type: 'double', path: 'tuya_fd' });
    assert.strictEqual(r.shouldEmulate('double'), false);
    for (let i = 0; i < 50; i++) { r.captureUnknown({ endpoint: 1, clusterId: 0xFC11, payload: [2] }); }
    assert.strictEqual(r.unknown.length, 20);
    assert.ok(r._last.size <= 64);
  });
});

describe('P2926 attachButtonPaths — optional listeners', () => {
  function fakeDevice(caps = []) {
    const calls = []; const cards = [];
    const dev = {
      log() {}, getCapabilities: () => caps, driver: { id: 'button_wireless_4', manifest: { class: 'button' } },
      setStoreValue: async () => {}, _triggerPhysicalFlow: (g, t, tok) => { calls.push([g, t, tok.path]); return Promise.resolve(true); },
      _tryCard: async (id, tok) => { cards.push([id, tok]); return true; },
    };
    return { dev, calls, cards };
  }
  function cluster() { const h = {}; return { h, on: (e, fn) => { h[e] = fn; } }; }
  it('wires multistate + onOff attr + mode + raw E000/unknown and cleans up', () => {
    const { dev, calls, cards } = fakeDevice(['button.1']);
    const ms = cluster(); const oo = cluster();
    const node = { endpoints: { 1: { clusters: { multistateInput: ms, onOff: oo } }, 2: { clusters: {} } }, handleFrame: () => 'root' };
    const rep = attachButtonPaths(dev, node);
    assert.strictEqual(rep.multistate, 1); assert.strictEqual(rep.onoff_attr, 1); assert.ok(rep.raw);
    ms.h['attr.presentValue'](2); oo.h['attr.onOff'](true);
    const OM = require('../lib/zigbee/DeviceOperatingMode'); const o = OM.classifyOperatingFamily;
    OM.classifyOperatingFamily = () => ({ writeSceneAttr: true }); oo.h['attr.tuyaOperationMode'](1); OM.classifyOperatingFamily = o;
    assert.deepStrictEqual(calls[0], [1, 'double', 'multistate']);
    assert.deepStrictEqual(calls[1], [1, 'single', 'onoff_attr']);
    assert.strictEqual(dev._buttonEventRouter.mode, 'scene');
    assert.strictEqual(node.handleFrame(2, 0xE000, { cmdId: 0xFD, data: Buffer.from([1]) }), 'root');
    assert.deepStrictEqual(calls[2], [2, 'double', 'e000']);
    node.handleFrame(1, 0xFC77, { cmdId: 0, data: Buffer.from([2]) });
    assert.strictEqual(cards[0][1].button, 'any:1');
    assert.strictEqual(attachButtonPaths(dev, node), null, 'idempotent');
    detachButtonPaths(dev);
    assert.strictEqual(dev._buttonEventRouter, undefined);
  });
  it('switches with onoff capability never get onOff-attr or E000 presses', () => {
    const { dev, calls } = fakeDevice(['onoff']);
    const oo = cluster();
    const node = { endpoints: { 1: { clusters: { onOff: oo } } }, handleFrame: () => 0 };
    const rep = attachButtonPaths(dev, node);
    assert.strictEqual(rep.onoff_attr, 0);
    node.handleFrame(1, 0xE000, { cmdId: 0xFD, data: Buffer.from([0]) });
    assert.strictEqual(calls.length, 0);
  });
});

describe('P2926 coverage report', () => {
  it('lists every ButtonDevice driver with the router paths', () => {
    const { rows } = require('../scripts/ci/button-path-coverage');
    assert.ok(rows.length >= 50);
    const b = rows.filter((r) => r.base === 'ButtonDevice');
    assert.ok(b.length >= 30);
    b.forEach((r) => ['multistate', 'onoff_attr', 'e000', 'e001', 'raw'].forEach((p) => assert.ok(r.paths.includes(p), `${r.driver} ${p}`)));
  });
});

describe('P2926b — remaining items', () => {
  const A = require('../lib/buttons/attachButtonPaths');
  it('emulated presses never mark native multi; native double disables emulation', () => {
    const r = new R.ButtonRouter();
    r.admit({ button: 1, type: 'double', path: 'emulated' });
    assert.ok(r.shouldEmulate('double'));
    r.admit({ button: 2, type: 'double', path: 'tuya_fd' });
    assert.strictEqual(r.shouldEmulate('double'), false);
  });
  it('DP cross-check is bounded and reports unexpected DPs', () => {
    const r = new R.ButtonRouter();
    assert.strictEqual(r.recordDp(1, { mfr: 'm', pid: 'TS0601', fw: '1' }, [1, 2]), null);
    assert.match(r.recordDp(9, { mfr: 'm', pid: 'TS0601', fw: '1' }, [1, 2]), /DP9 not in profile/);
    for (let i = 0; i < 10; i++) { r.recordDp(1, { mfr: `m${i}` }); }
    assert.ok(Object.keys(r.dpSeen).length <= 5);
  });
  function dev(extra = {}) {
    const store = {}; const settings = {};
    return Object.assign({ log() {}, getCapabilities: () => ['button.1'], driver: { id: 'button_wireless_4', manifest: { class: 'button', zigbee: { endpoints: { 1: { bindings: [6] } } } } },
      getStoreValue: (k) => store[k], setStoreValue: async (k, v) => { store[k] = v; }, setSettings: async (o) => Object.assign(settings, o),
      getSettings: () => ({ zb_model_id: 'TS004F' }), getSetting: (k) => settings[k], store, settings }, extra);
  }
  it('wake window binds onOff on extra endpoints once (throttled), only with native binding', async () => {
    const d = dev(); let binds = 0;
    const node = { endpoints: { 1: { clusters: { onOff: { bind: async () => { binds++; } } } }, 2: { clusters: { onOff: { bind: async () => { binds++; } } } } } };
    assert.ok(A.onWake(d, node)); await new Promise((r) => setImmediate(r));
    assert.strictEqual(binds, 1);
    assert.strictEqual(A.onWake(d, node), false);
    const d2 = dev({ driver: { id: 'button_wireless_4', manifest: { class: 'button' } } });
    assert.strictEqual(A.bindExtraEndpoints(d2, node), 0);
  });
  it('new TS004F device: button_mode follows the read 0x8004; failure keeps fallback', async () => {
    const OM = require('../lib/zigbee/DeviceOperatingMode');
    const orig = OM.classifyOperatingFamily; OM.classifyOperatingFamily = () => ({ writeSceneAttr: true });
    try {
      const d = dev(); d.store.p2926_new_device = true;
      const node = { endpoints: { 1: { clusters: { onOff: { readAttributes: async () => ({ tuyaOperationMode: 0 }) } } } } };
      assert.strictEqual(await A.initModeForNewDevice(d, node), 'dimmer');
      assert.strictEqual(d.settings.button_mode, 'dimmer');
      assert.strictEqual(d.store.p2926_new_device, false);
      const d2 = dev(); d2.store.p2926_new_device = true;
      const bad = { endpoints: { 1: { clusters: { onOff: { readAttributes: async () => { throw new Error('asleep'); } } } } } };
      assert.strictEqual(await A.initModeForNewDevice(d2, bad), null);
      assert.strictEqual(d2.settings.button_mode, undefined);
      assert.strictEqual(d2.store.p2926_new_device, true, 'retry on next wake');
    } finally { OM.classifyOperatingFamily = orig; }
  });
  it('E001 switchMode=1 marks scene mode and relay decoupled', () => {
    const d = dev(); const h = {};
    const node = { endpoints: { 1: { clusters: { tuyaE001: { on: (e, f) => { h[e] = f; } } } } }, handleFrame: () => 0 };
    A.attachButtonPaths(d, node); h['attr.switchMode'](1);
    assert.strictEqual(d._buttonEventRouter.mode, 'scene');
    assert.strictEqual(d.store.relay_decoupled, true);
  });
  it('legacy PhysicalButtonMixin call sites are all path-tagged', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    const calls = src.split('\n').filter((l) => /_triggerPhysicalFlow\(/.test(l) && !/^\s*(\*|\/\/)|_triggerPhysicalFlow\(gang, pressType, tokens = \{\}\)/.test(l));
    const untagged = calls.filter((l) => !/path:/.test(l));
    assert.deepStrictEqual(untagged, []);
  });
});
