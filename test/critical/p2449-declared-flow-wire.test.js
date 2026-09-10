'use strict';

/**
 * P2449 — Declared flow card wiring (fleet) — fast unit checks
 * Full tree arity scan lives in tools/ci/p2449-declared-flow-wire-gate.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '../..');

describe('P2449 — declared flow card wiring', () => {
  it('DeclaredFlowCardAutoWire exports + normalizeDim + cache hook', () => {
    const mod = require('../../lib/flow/DeclaredFlowCardAutoWire');
    assert.strictEqual(typeof mod.autoWireDeclaredFlowCards, 'function');
    assert.strictEqual(typeof mod.emitBrightnessChanged, 'function');
    assert.strictEqual(mod.normalizeDim(50), 0.5);
    assert.strictEqual(mod.normalizeDim(0.25), 0.25);
    assert.strictEqual(mod.normalizeDim(NaN), null);
    const src = fs.readFileSync(path.join(ROOT, 'lib/flow/DeclaredFlowCardAutoWire.js'), 'utf8');
    assert.ok(src.includes('__p2449BrightnessChangedIds'));
  });

  it('core wiring markers present', () => {
    const files = {
      FlowCardHelper: 'lib/FlowCardHelper.js',
      ButtonDevice: 'lib/devices/ButtonDevice.js',
      UniversalFlowCardLoader: 'lib/flow/UniversalFlowCardLoader.js',
      ActuatorFlowHelper: 'lib/flow/ActuatorFlowHelper.js',
      SmartKnobRotationMixin: 'lib/mixins/SmartKnobRotationMixin.js',
    };
    for (const [name, rel] of Object.entries(files)) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      if (name === 'FlowCardHelper' || name === 'ButtonDevice') {
        assert.ok(src.includes('scene_recall'), `${name} scene_recall`);
      }
      if (name === 'UniversalFlowCardLoader') {
        assert.ok(src.includes('autoWireDeclaredFlowCards'));
      }
      if (name === 'ActuatorFlowHelper') {
        assert.ok(src.includes('registerBrightnessFlowCards'));
        assert.ok(/dim > 1/.test(src));
      }
      if (name === 'SmartKnobRotationMixin') {
        assert.ok(src.includes('gang_button_scene_recall'));
      }
    }
  });

  it('hotspot drivers have no two-arg getDeviceTriggerCard', () => {
    const spots = [
      'drivers/smart_knob_rotary/device.js',
      'drivers/smart_knob/device.js',
      'drivers/smart_knob_switch/device.js',
      'lib/devices/ButtonDevice.js',
      'lib/mixins/SmartKnobRotationMixin.js',
      'lib/flow/DeclaredFlowCardAutoWire.js',
    ];
    const bad = /getDeviceTriggerCard\s*\([^)]+,\s*['"]trigger['"]\s*\)/;
    for (const rel of spots) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.ok(!bad.test(src), `bad arity in ${rel}`);
    }
  });

  it('emitBrightnessChanged debounces via shared _lastBrightnessFlowTs', async () => {
    const { emitBrightnessChanged } = require('../../lib/flow/DeclaredFlowCardAutoWire');
    let triggers = 0;
    const device = {
      _destroyed: false,
      driver: {
        id: 'bulb_white',
        __p2449BrightnessChangedIds: ['bulb_white_brightness_changed'],
        manifest: { flow: { triggers: [{ id: 'bulb_white_brightness_changed' }] } },
      },
      homey: {
        flow: {
          getDeviceTriggerCard() {
            return {
              async trigger() { triggers += 1; },
            };
          },
        },
      },
      getCapabilityValue() { return 0.4; },
    };
    await emitBrightnessChanged(device, 40);
    await emitBrightnessChanged(device, 41); // within 250ms debounce
    assert.strictEqual(triggers, 1);
    device._lastBrightnessFlowTs = Date.now() - 300;
    await emitBrightnessChanged(device, 42);
    assert.strictEqual(triggers, 2);
  });
});
