'use strict';
// P2873: knob rotation on real hardware. Real TS004F / ZG-101ZD knobs list
// levelControl as an OUTPUT cluster only, so zigbee-clusters builds no server
// cluster for it and commands from the knob only reach endpoint.bindings.
// The knob code used to bind only when a server cluster existed.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { ZCLNode } = require('zigbee-clusters');

const ROOT = path.join(__dirname, '..', '..');
// Other suites stub 'zigbee-clusters' through Module._load; a BoundCluster first cached under
// such a stub fails endpoint.bind()'s instanceof check. Reload ours against the real module.
for (const k of Object.keys(require.cache)) {
  if (k.startsWith(ROOT) && /[\\/]lib[\\/]clusters[\\/]|SmartKnobRotationMixin|[\\/]drivers[\\/](remote_dimmer|smart_knob_rotary)[\\/]/.test(k)) { delete require.cache[k]; }
}
const zcl = (seq, cmd, data = []) => Buffer.from([0x01, seq, cmd, ...data]);
function makeNode(inputClusters, outputClusters) {
  const node = {
    sendFrame: async () => {},
    endpointDescriptors: [{ endpointId: 1, inputClusters, outputClusters }],
  };
  return { node, zclNode: new ZCLNode(node) };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
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

// Real ERS-10TZBVK-AA descriptor: in [0,1,3,4,6,0x1000], out [0x19,0x0A,3,4,5,6,8,0x1000]
const REAL_IN = [0, 1, 3, 4, 6, 0x1000];
const REAL_OUT = [0x19, 0x0A, 3, 4, 5, 6, 8, 0x1000];

async function rotateSequence(node) {
  await node.handleFrame(1, 8, zcl(1, 0x02, [0, 13, 1, 0])); // step up, slow
  await wait(30);
  await node.handleFrame(1, 8, zcl(2, 0x02, [1, 37, 1, 0])); // step down, fast
  await wait(30);
  await node.handleFrame(1, 8, zcl(3, 0x06, [0, 13, 1, 0])); // stepWithOnOff up
  await wait(30);
  await node.handleFrame(1, 8, zcl(4, 0x01, [1, 40])); // move down
}

const MIXIN = path.join(ROOT, 'lib/mixins/SmartKnobRotationMixin.js');
describe('P2873 SmartKnobRotationMixin (smart_knob / smart_knob_rotary / smart_knob_switch)', { skip: !fs.existsSync(MIXIN) }, () => {
  function rig() {
    const mod = loadWithHomeyStubs('lib/mixins/SmartKnobRotationMixin.js');
    const Mixin = typeof mod === 'function' ? mod : (mod.SmartKnobRotationMixin || mod.default);
    const K = Mixin(class { log() {} });
    const dev = Object.create(K.prototype);
    dev.steps = []; dev.moves = [];
    dev.log = () => {};
    dev._handleKnobRotationStep = (dir, size) => dev.steps.push([dir, size]);
    dev._handleKnobRotation = (dir, rate) => dev.moves.push([dir, rate]);
    return dev;
  }

  it('real hardware (levelControl output only): bound path attaches and every rotation fires once', async () => {
    const dev = rig();
    const { node, zclNode } = makeNode(REAL_IN, REAL_OUT);
    assert.equal(zclNode.endpoints[1].clusters.levelControl, undefined, 'no server cluster on a real knob');
    dev._setupKnobLevelControl(zclNode);
    assert.ok(zclNode.endpoints[1].bindings.levelControl, 'bound path attached');
    await rotateSequence(node);
    assert.deepEqual(dev.steps, [['up', 13], ['down', 37], ['up', 13]]);
    assert.deepEqual(dev.moves, [['down', 40]]);
  });

  it('a second setup call does not replace the binding or double the handlers', async () => {
    const dev = rig();
    const { node, zclNode } = makeNode(REAL_IN, REAL_OUT);
    dev._setupKnobLevelControl(zclNode);
    const first = zclNode.endpoints[1].bindings.levelControl;
    dev._setupKnobLevelControl(zclNode);
    assert.equal(zclNode.endpoints[1].bindings.levelControl, first);
    await node.handleFrame(1, 8, zcl(9, 0x02, [0, 13, 1, 0]));
    assert.deepEqual(dev.steps, [['up', 13]]);
  });

  it('server-cluster layout still attaches (unchanged), and no levelControl at all binds nothing', () => {
    const dev = rig();
    const a = makeNode([0, 1, 3, 8], [3, 6]);
    dev._setupKnobLevelControl(a.zclNode);
    assert.ok(a.zclNode.endpoints[1].bindings.levelControl);
    const b = makeNode([0, 1, 3, 6], [3, 6, 0x19]);
    rig()._setupKnobLevelControl(b.zclNode);
    assert.equal(b.zclNode.endpoints[1].bindings.levelControl, undefined);
  });

  it('an existing levelControl binding (driver-owned) is never replaced', () => {
    const LevelControlBoundCluster = require(path.join(ROOT, 'lib/clusters/LevelControlBoundCluster'));
    const { zclNode } = makeNode(REAL_IN, REAL_OUT);
    const mine = new LevelControlBoundCluster({});
    zclNode.endpoints[1].bind('levelControl', mine);
    rig()._setupKnobLevelControl(zclNode);
    assert.equal(zclNode.endpoints[1].bindings.levelControl, mine);
  });
});

const ROTARY = path.join(ROOT, 'drivers/smart_knob_rotary/device.js');
const rotaryHasOwnBound = fs.existsSync(ROTARY) && /_setupLevelControlBound/.test(fs.readFileSync(ROTARY, 'utf8'));
describe('P2873 smart_knob_rotary own bound path (stable, no mixin)', { skip: !rotaryHasOwnBound }, () => {
  it('real hardware: rotation reaches _handleRotation/_handleRotationStep once each', async () => {
    const Cls = loadWithHomeyStubs('drivers/smart_knob_rotary/device.js');
    const dev = Object.create(Cls.prototype);
    dev.steps = []; dev.moves = [];
    dev.log = () => {};
    dev._handleRotationStep = (dir, size) => dev.steps.push([dir, size]);
    dev._handleRotation = (dir, rate) => dev.moves.push([dir, rate]);
    const { node, zclNode } = makeNode(REAL_IN, REAL_OUT);
    dev._setupLevelControlBound(zclNode);
    assert.ok(zclNode.endpoints[1].bindings.levelControl);
    dev._setupLevelControlBound(zclNode); // idempotent
    await rotateSequence(node);
    assert.deepEqual(dev.steps, [['up', 13], ['down', 37], ['up', 13]]);
    assert.deepEqual(dev.moves, [['down', 40]]);
  });
});

describe('P2873 coverage per branch', () => {
  it('every branch has at least one real-hardware knob bound path', () => {
    const mixinOk = fs.existsSync(MIXIN) && /P2873/.test(fs.readFileSync(MIXIN, 'utf8'));
    assert.ok(mixinOk || rotaryHasOwnBound, 'no P2873 knob bound path on this branch');
  });
});
