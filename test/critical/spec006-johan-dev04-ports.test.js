'use strict';
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const read = (r) => fs.readFileSync(path.join(ROOT, r), 'utf8');

describe('Spec 006: develop-0.4 behaviour ports (own implementation)', () => {
  it('knob binds a native LevelControl bound cluster without replacing an existing binding', () => {
    const s = read('lib/mixins/SmartKnobRotationMixin.js');
    assert.ok(s.includes("ep.bind(CLUSTER.LEVEL_CONTROL.NAME, new LevelControlBoundCluster("));
    assert.ok(s.includes('!(ep.bindings && ep.bindings[CLUSTER.LEVEL_CONTROL.NAME])'));
  });
  it('knob dual-path duplicate guard: same direction within window counts once, real steps pass', () => {
    const SmartKnobRotationMixin = require('../../lib/mixins/SmartKnobRotationMixin');
    const K = SmartKnobRotationMixin(class {});
    const k = new K();
    assert.strictEqual(k._knobRotationDuplicate('up'), false);
    assert.strictEqual(k._knobRotationDuplicate('up'), true);
    assert.strictEqual(k._knobRotationDuplicate('down'), false);
    k._knobLastRotation.ts -= 100;
    assert.strictEqual(k._knobRotationDuplicate('down'), false);
  });
  it('lcdtemphumidsensor_3 answers MCU time requests via GlobalTimeSyncEngine', () => {
    const s = read('drivers/lcdtemphumidsensor_3/device.js');
    assert.ok(s.includes('setupListener(zclNode)'));
  });
  it('manufacturer helper uses Homey interview identity (sleepy sensors)', () => {
    const H = require('../../lib/helpers/ManufacturerNameHelper');
    assert.strictEqual(H.getManufacturerName({ node: { manufacturerName: '_TZE200_vvmbj46n' } }), '_TZE200_vvmbj46n');
  });
});
