'use strict';
// WHY(P2870, 2026-10-19 "fix all bugs"): zigbee-clusters routes every command a remote sends (client -> server)
// to endpoint.bindings[cluster].handleFrame. lib/clusters/OnOffBoundCluster + LevelControlBoundCluster overrode
// handleFrame and returned early for every standard command, so their named handlers (setOn/off/toggle,
// step/move/stop...) never ran. Fix: opt-in `dispatchStandard`. Owners whose only RX path is the binding
// (remote_dimmer cards, SmartKnobRotationMixin rotation) opt in. TuyaZigbeeDevice button drivers already get
// standard commands through the raw L1 path (PhysicalButtonMixin.onZigBeeMessage), so they stay opted out and
// must not fire twice. Also: decoded step/move modes are 'up'/'down' strings; the old `=== 0` read all as down.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..', '..');
// Other suites stub 'zigbee-clusters' through Module._load; a BoundCluster first cached under
// such a stub fails endpoint.bind()'s instanceof check. Reload ours against the real module.
for (const k of Object.keys(require.cache)) {
  if (k.startsWith(ROOT) && /[\\/]lib[\\/]clusters[\\/]|SmartKnobRotationMixin|[\\/]drivers[\\/](remote_dimmer|smart_knob_rotary)[\\/]/.test(k)) { delete require.cache[k]; }
}
const { ZCLNode } = require('zigbee-clusters');
const OnOffBoundCluster = require('../../lib/clusters/OnOffBoundCluster');
const LevelControlBoundCluster = require('../../lib/clusters/LevelControlBoundCluster');

const zcl = (seq, cmd, data = []) => Buffer.from([0x01, seq, cmd, ...data]); // cluster-specific, client -> server
function makeNode(inputClusters = [0, 1, 3]) {
  const sent = [];
  const node = {
    sendFrame: async (ep, cl, buf) => { sent.push({ cl, buf: Buffer.from(buf) }); },
    endpointDescriptors: [{ endpointId: 1, inputClusters, outputClusters: [3, 4, 5, 6, 8, 25] }],
  };
  return { node, zclNode: new ZCLNode(node), sent };
}
const statuses = (sent) => sent.filter((s) => s.buf[2] === 0x0B).map((s) => s.buf[4]);

function onOffRecorder(opts = {}) {
  const calls = [];
  const bc = new OnOffBoundCluster({
    onSetOn: (p) => calls.push(['on', p]),
    onSetOff: (p) => calls.push(['off', p]),
    onToggle: (p) => calls.push(['toggle', p]),
    onWithTimedOff: (p) => calls.push(['timedOff', p]),
    ...opts,
  });
  return { bc, calls };
}
function levelRecorder(opts = {}) {
  const calls = [];
  const rec = (n) => (p) => calls.push([n, p]);
  const bc = new LevelControlBoundCluster({
    onStep: rec('step'), onStepWithOnOff: rec('stepWithOnOff'), onMove: rec('move'), onMoveWithOnOff: rec('moveWithOnOff'),
    onStop: rec('stop'), onStopWithOnOff: rec('stopWithOnOff'), onMoveToLevel: rec('moveToLevel'),
    onMoveToLevelWithOnOff: rec('moveToLevelWithOnOff'), ...opts,
  });
  return { bc, calls };
}

describe('P2870 OnOffBoundCluster — standard commands', () => {
  it('opted in: setOff/setOn/toggle/offWithEffect/onWithTimedOff each reach their handler once, SUCCESS responses', async () => {
    const { node, zclNode, sent } = makeNode();
    const { bc, calls } = onOffRecorder({ dispatchStandard: true });
    zclNode.endpoints[1].bind('onOff', bc);
    await node.handleFrame(1, 6, zcl(1, 0x00));
    await node.handleFrame(1, 6, zcl(2, 0x01));
    await node.handleFrame(1, 6, zcl(3, 0x02));
    await node.handleFrame(1, 6, zcl(4, 0x40, [0, 0]));
    await node.handleFrame(1, 6, zcl(5, 0x42, [0, 10, 0, 0, 0]));
    assert.deepEqual(calls.map((c) => c[0]), ['off', 'on', 'toggle', 'off', 'timedOff']);
    assert.ok(statuses(sent).length >= 5);
    assert.ok(statuses(sent).every((s) => s === 0), `statuses ${statuses(sent)}`);
  });

  it('default (not opted in): standard commands do not reach handlers (owner has another path) and are still acknowledged', async () => {
    const { node, zclNode, sent } = makeNode();
    const { bc, calls } = onOffRecorder();
    zclNode.endpoints[1].bind('onOff', bc);
    for (const [i, c] of [0x00, 0x01, 0x02, 0x42].entries()) { await node.handleFrame(1, 6, zcl(10 + i, c)); }
    assert.deepEqual(calls, []);
    assert.ok(statuses(sent).every((s) => s === 0));
  });

  it('Tuya 0xFD scene and 0xFC rotate behave exactly as before in both modes', async () => {
    for (const dispatchStandard of [false, true]) {
      const { node, zclNode } = makeNode();
      const { bc, calls } = onOffRecorder({ dispatchStandard });
      zclNode.endpoints[1].bind('onOff', bc);
      await node.handleFrame(1, 6, zcl(1, 0xFD, [1]));
      await node.handleFrame(1, 6, zcl(2, 0xFC, [1]));
      assert.equal(calls.length, 2);
      assert.equal(calls[0][0], 'on'); assert.equal(calls[0][1].cmdId, 0xFD); assert.equal(calls[0][1].scene, 1);
      assert.equal(calls[1][0], 'toggle'); assert.equal(calls[1][1].cmdId, 0xFC); assert.equal(calls[1][1].direction, 1);
    }
  });

  it('a throwing or rejecting handler never breaks the frame path', async () => {
    const { node, zclNode, sent } = makeNode();
    const bc = new OnOffBoundCluster({ dispatchStandard: true, onSetOn: () => { throw new Error('x'); }, onToggle: async () => { throw new Error('y'); } });
    zclNode.endpoints[1].bind('onOff', bc);
    await node.handleFrame(1, 6, zcl(1, 0x01));
    await node.handleFrame(1, 6, zcl(2, 0x02));
    await new Promise((r) => setImmediate(r));
    assert.ok(statuses(sent).every((s) => s === 0));
  });
});

describe('P2870 LevelControlBoundCluster — standard commands and direction', () => {
  it('opted in: step/move directions decoded right (mode 0 = up, 1 = down), all 8 commands dispatched once', async () => {
    const { node, zclNode, sent } = makeNode();
    const { bc, calls } = levelRecorder({ dispatchStandard: true });
    zclNode.endpoints[1].bind('levelControl', bc);
    await node.handleFrame(1, 8, zcl(1, 0x02, [0, 13, 1, 0])); // step up 13
    await node.handleFrame(1, 8, zcl(2, 0x02, [1, 37, 1, 0])); // step down 37
    await node.handleFrame(1, 8, zcl(3, 0x06, [0, 20, 1, 0])); // stepWithOnOff up
    await node.handleFrame(1, 8, zcl(4, 0x01, [1, 50])); // move down
    await node.handleFrame(1, 8, zcl(5, 0x05, [0, 60])); // moveWithOnOff up
    await node.handleFrame(1, 8, zcl(6, 0x03));
    await node.handleFrame(1, 8, zcl(7, 0x07));
    await node.handleFrame(1, 8, zcl(8, 0x00, [127, 5, 0]));
    await node.handleFrame(1, 8, zcl(9, 0x04, [254, 0, 0]));
    assert.deepEqual(calls.map((c) => c[0]), ['step', 'step', 'stepWithOnOff', 'move', 'moveWithOnOff', 'stop', 'stopWithOnOff', 'moveToLevel', 'moveToLevelWithOnOff']);
    assert.deepEqual([calls[0][1].mode, calls[0][1].stepSize], ['up', 13]);
    assert.deepEqual([calls[1][1].mode, calls[1][1].stepSize], ['down', 37]);
    assert.equal(calls[2][1].mode, 'up');
    assert.deepEqual([calls[3][1].moveMode, calls[3][1].rate], ['down', 50]);
    assert.equal(calls[4][1].moveMode, 'up');
    assert.equal(calls[7][1].level, 127);
    assert.ok(statuses(sent).every((s) => s === 0));
  });

  it('default (not opted in): nothing dispatched; legacy numeric callers keep their meaning', async () => {
    const { node, zclNode } = makeNode();
    const { bc, calls } = levelRecorder();
    zclNode.endpoints[1].bind('levelControl', bc);
    await node.handleFrame(1, 8, zcl(1, 0x02, [0, 13, 1, 0]));
    await node.handleFrame(1, 8, zcl(2, 0x01, [0, 50]));
    assert.deepEqual(calls, []);
    bc.step({ stepMode: 0, stepSize: 5 }); bc.move({ moveMode: 1, rate: 9 });
    assert.deepEqual(calls.map((c) => [c[0], c[1].mode || c[1].moveMode]), [['step', 'up'], ['move', 'down']]);
    assert.equal(LevelControlBoundCluster.direction('up'), 'up');
    assert.equal(LevelControlBoundCluster.direction(1), 'down');
  });
});

// ---------- per driver family ----------
function loadWithHomeyStubs(rel) {
  const orig = Module._load;
  Module._load = function stubbed(req, parent, isMain) {
    if (req === 'homey') { return { Device: class {}, Driver: class {}, App: class {}, SimpleClass: class {}, FlowCard: class {} }; }
    if (req === 'homey-zigbeedriver') {
      class ZigBeeDevice { registerCapability() {} log() {} error() {} }
      return { ZigBeeDevice, ZigBeeDriver: class {}, ZigBeeLightDevice: class extends ZigBeeDevice {}, ZigBeeXYLightDevice: class extends ZigBeeDevice {}, debug() {}, Util: {} };
    }
    return orig.call(this, req, parent, isMain);
  };
  try { return require(path.join(ROOT, rel)); } finally { Module._load = orig; }
}

describe('P2870 remote_dimmer — its own cards finally fire, once per press', () => {
  it('on/off/toggle/step/move/stop reach remote_dimmer_* cards through real zigbee-clusters', async () => {
    const Dev = loadWithHomeyStubs('drivers/remote_dimmer/device.js');
    const parent = Object.getPrototypeOf(Dev.prototype);
    const had = Object.prototype.hasOwnProperty.call(parent, 'onNodeInit');
    const prev = parent.onNodeInit;
    parent.onNodeInit = async function noop() {};
    try {
      const { node, zclNode, sent } = makeNode();
      zclNode.endpoints[1].clusters.powerConfiguration.configureReporting = async () => {};
      const fired = [];
      const dev = Object.create(Dev.prototype);
      Object.assign(dev, {
        log() {}, error() {}, getSetting() { return ''; }, getData() { return {}; }, setSettings: async () => {},
        configureAttributeReporting: async () => {}, safeSetCapabilityValue: async () => {},
        homey: { flow: { getDeviceTriggerCard: (id) => ({ trigger: async (_d, tokens) => { fired.push([id, tokens]); } }) } },
      });
      await dev.onNodeInit({ zclNode });
      const wait = () => new Promise((r) => setTimeout(r, 210)); // driver's own 200 ms same-action guard
      await node.handleFrame(1, 6, zcl(1, 0x01)); await wait();
      await node.handleFrame(1, 6, zcl(2, 0x00)); await wait();
      await node.handleFrame(1, 6, zcl(3, 0x02)); await wait();
      await node.handleFrame(1, 8, zcl(4, 0x02, [0, 20, 1, 0])); await wait();
      await node.handleFrame(1, 8, zcl(5, 0x06, [1, 20, 1, 0])); await wait();
      await node.handleFrame(1, 8, zcl(6, 0x05, [0, 50])); await wait();
      await node.handleFrame(1, 8, zcl(7, 0x03));
      assert.deepEqual(fired.map((f) => f[0]), [
        'remote_dimmer_button_on', 'remote_dimmer_button_off', 'remote_dimmer_button_toggle',
        'remote_dimmer_brightness_up', 'remote_dimmer_brightness_down', 'remote_dimmer_brightness_up',
        'remote_dimmer_brightness_stop',
      ]);
      assert.equal(fired[3][1].step_size, 20);
      assert.ok(statuses(sent).every((s) => s === 0));
      // a resend of the same press inside 200 ms does not fire twice
      fired.length = 0;
      await node.handleFrame(1, 6, zcl(8, 0x02)); await node.handleFrame(1, 6, zcl(8, 0x02));
      assert.equal(fired.length, 1);
      // the raw L1 path (generic physical-button flow) never fires remote_dimmer_* cards: no double fire
      fired.length = 0;
      dev._triggerPhysicalFlow = () => {};
      await wait();
      dev.onZigBeeMessage(1, 6, zcl(9, 0x01), {});
      assert.equal(fired.length, 0);
      const flow = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/remote_dimmer/driver.flow.compose.json'), 'utf8'));
      const ids = new Set((flow.triggers || []).map((t) => t.id));
      for (const id of ['remote_dimmer_button_on', 'remote_dimmer_button_off', 'remote_dimmer_button_toggle', 'remote_dimmer_brightness_up', 'remote_dimmer_brightness_down', 'remote_dimmer_brightness_stop']) {
        assert.ok(ids.has(id) || ids.has(id.replace(/^remote_dimmer_/, '')), `card ${id} declared`);
      }
    } finally {
      if (had) { parent.onNodeInit = prev; } else { delete parent.onNodeInit; }
    }
  });
});

const KNOB_MIXIN = path.join(ROOT, 'lib/mixins/SmartKnobRotationMixin.js');
describe('P2870 SmartKnobRotationMixin (smart_knob / smart_knob_rotary / smart_knob_switch)', { skip: !fs.existsSync(KNOB_MIXIN) || !/LevelControlBoundCluster/.test(fs.existsSync(KNOB_MIXIN) ? fs.readFileSync(KNOB_MIXIN, 'utf8') : '') }, () => {
  it('command-mode rotation reaches the knob handlers once, with the right direction (server listeners never see client frames)', async () => {
    const mod = require(KNOB_MIXIN);
    const Mixin = typeof mod === 'function' ? mod : (mod.SmartKnobRotationMixin || mod.default);
    const K = Mixin(class { log() {} });
    const dev = Object.create(K.prototype);
    const steps = []; const moves = [];
    dev.log = () => {};
    dev._handleKnobRotationStep = (dir, size) => steps.push([dir, size]);
    dev._handleKnobRotation = (dir, rate) => moves.push([dir, rate]);
    // Server-cluster layout; the output-only layout of real knobs is covered by P2873.
    const { node, zclNode } = makeNode([0, 1, 3, 8]);
    dev._setupKnobLevelControl(zclNode);
    assert.ok(zclNode.endpoints[1].bindings.levelControl, 'bound path attached');
    await node.handleFrame(1, 8, zcl(1, 0x02, [0, 13, 1, 0]));
    await new Promise((r) => setTimeout(r, 30));
    await node.handleFrame(1, 8, zcl(2, 0x02, [1, 37, 1, 0]));
    await new Promise((r) => setTimeout(r, 30));
    await node.handleFrame(1, 8, zcl(3, 0x01, [0, 40]));
    assert.deepEqual(steps, [['up', 13], ['down', 37]]);
    assert.deepEqual(moves, [['up', 40]]);
  });
});

const BUTTON_FAMILIES = ['scene_switch_4', 'button_wireless_scene', 'button_wireless_valve', 'button_wireless_wall',
  'remote_button_wireless_scene', 'remote_button_wireless_smart', 'remote_button_wireless_valve', 'remote_button_wireless_wall']
  .filter((d) => fs.existsSync(path.join(ROOT, 'drivers', d, 'device.js')));

describe('P2870 TuyaZigbeeDevice button families — standard commands handled once (raw L1), binding stays opted out', () => {
  it('none of the button families opts in (they would double-fire), and all sit on the ButtonDevice -> TuyaZigbeeDevice chain', () => {
    assert.ok(BUTTON_FAMILIES.length >= 4);
    for (const d of BUTTON_FAMILIES) {
      const src = fs.readFileSync(path.join(ROOT, 'drivers', d, 'device.js'), 'utf8');
      assert.doesNotMatch(src, /dispatchStandard\s*:\s*true/, `${d} must not opt in`);
      assert.match(src, /extends\s+ButtonDevice\b|extends\s+\w*\(?.*TuyaZigbeeDevice/, `${d} base`);
    }
    const chain = fs.readFileSync(path.join(ROOT, 'lib/devices/BaseUnifiedDevice.js'), 'utf8');
    assert.match(chain, /class BaseUnifiedDevice extends TuyaZigbeeDevice/);
    assert.match(fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8'), /this\._setupRawFrameFallback\(\)/);
  });

  it('raw L1 (PhysicalButtonMixin.onZigBeeMessage) turns on/off/toggle and level step into exactly one press each', () => {
    const PBM = require('../../lib/mixins/PhysicalButtonMixin');
    const B = PBM(class { log() {} });
    const dev = Object.create(B.prototype);
    const fired = [];
    dev.log = () => {};
    dev._triggerPhysicalFlow = (g, p) => fired.push([g, p]);
    for (const [i, c] of [0x00, 0x01, 0x02].entries()) { assert.equal(dev.onZigBeeMessage(1, 6, zcl(20 + i, c), {}), true); }
    dev.onZigBeeMessage(1, 8, zcl(30, 0x02, [0, 13, 1, 0]), {});
    assert.equal(fired.length, 4);
  });

  it('their opted-out bindings ignore standard frames, so a press is not fired a second time', async () => {
    const { node, zclNode } = makeNode();
    const { bc, calls } = onOffRecorder();
    zclNode.endpoints[1].bind('onOff', bc);
    await node.handleFrame(1, 6, zcl(1, 0x01));
    await node.handleFrame(1, 6, zcl(2, 0x02));
    assert.equal(calls.length, 0);
  });
});
