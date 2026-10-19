'use strict';
// P2872: the raw OnOff path (PhysicalButtonMixin.onZigBeeMessage, cmd 0/1/2)
// used to collapse off/on/toggle into one 'single' press. Drivers that declare
// RAW_ONOFF_PRESS_MAP now get distinct press types; all others keep 'single'.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..', '..');

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

const PhysicalButtonMixin = loadWithHomeyStubs('lib/mixins/PhysicalButtonMixin.js');

class Base { log() {} error() {} onZigBeeMessage() { return false; } }

function rig(Cls, settings = {}) {
  const dev = Object.create(Cls.prototype);
  dev.log = () => {};
  dev.error = () => {};
  dev.getSetting = (k) => settings[k];
  dev.presses = [];
  dev._triggerPhysicalFlow = (gang, type) => { dev.presses.push([gang, type]); };
  return dev;
}

// ZCL cluster-specific frame header: frameControl, seq, commandId
const frame = (cmd, seq = 1) => ({ data: [0x11, seq, cmd] });

describe('P2872 raw OnOff press types', () => {
  it('default (no map): off/on/toggle all stay single', () => {
    class Plain extends PhysicalButtonMixin(Base) {}
    const dev = rig(Plain);
    for (const cmd of [0, 1, 2]) { assert.equal(dev.onZigBeeMessage(1, 6, frame(cmd, cmd)), true); }
    assert.deepEqual(dev.presses, [[1, 'single'], [1, 'single'], [1, 'single']]);
  });

  it('a driver map gives distinct press types, toggle stays single', () => {
    class Mapped extends PhysicalButtonMixin(Base) {}
    Mapped.RAW_ONOFF_PRESS_MAP = { 2: 'single', 1: 'double', 0: 'long' };
    const dev = rig(Mapped);
    dev.onZigBeeMessage(1, 6, frame(2, 1));
    dev.onZigBeeMessage(1, 6, frame(1, 2));
    dev.onZigBeeMessage(1, 6, frame(0, 3));
    assert.deepEqual(dev.presses, [[1, 'single'], [1, 'double'], [1, 'long']]);
  });

  it('button_mode=dimmer keeps single; bad map values fall back to single', () => {
    class Mapped extends PhysicalButtonMixin(Base) {}
    Mapped.RAW_ONOFF_PRESS_MAP = { 2: 'single', 1: 'double', 0: 'bogus' };
    const dim = rig(Mapped, { button_mode: 'dimmer' });
    assert.equal(dim._rawOnOffPressType(1), 'single');
    const auto = rig(Mapped, { button_mode: 'auto' });
    assert.equal(auto._rawOnOffPressType(1), 'double');
    assert.equal(auto._rawOnOffPressType(0), 'single');
  });

  it('the per-command debounce still drops a resend, one press per frame', () => {
    class Mapped extends PhysicalButtonMixin(Base) {}
    Mapped.RAW_ONOFF_PRESS_MAP = { 2: 'single', 1: 'double', 0: 'long' };
    const dev = rig(Mapped);
    dev.onZigBeeMessage(1, 6, frame(1, 1));
    dev.onZigBeeMessage(1, 6, frame(1, 1));
    assert.deepEqual(dev.presses, [[1, 'double']]);
  });

  it('attribute reports (len > 3) are still not presses', () => {
    class Mapped extends PhysicalButtonMixin(Base) {}
    Mapped.RAW_ONOFF_PRESS_MAP = { 2: 'single', 1: 'double', 0: 'long' };
    const dev = rig(Mapped);
    dev.onZigBeeMessage(1, 6, { data: [0x18, 1, 0x0A, 0, 0, 0x10, 1] });
    assert.deepEqual(dev.presses, []);
  });

  for (const d of ['remote_button_wireless_smart', 'remote_button_wireless_wall']) {
    it(`${d} opts in with toggle=single, on=double, off=long`, () => {
      const Cls = loadWithHomeyStubs(`drivers/${d}/device.js`);
      assert.deepEqual({ ...Cls.RAW_ONOFF_PRESS_MAP }, { 2: 'single', 1: 'double', 0: 'long' });
      assert.equal(typeof Cls.prototype._rawOnOffPressType, 'function');
      const dev = rig(Cls, { button_mode: 'auto' });
      assert.equal(dev._rawOnOffPressType(2), 'single');
      assert.equal(dev._rawOnOffPressType(1), 'double');
      assert.equal(dev._rawOnOffPressType(0), 'long');
    });
  }

  it('multi-gang scene families do not opt in (each gang press stays single)', () => {
    for (const d of ['scene_switch_4', 'button_wireless_scene', 'remote_dimmer']) {
      let Cls;
      try { Cls = loadWithHomeyStubs(`drivers/${d}/device.js`); } catch (_e) { continue; }
      assert.equal(Cls.RAW_ONOFF_PRESS_MAP, undefined, d);
    }
  });
});
