'use strict';

/**
 * P2448 — Rotary knob command/dimmer mode (ERS-10 / ZG-101ZD)
 * Complements P2439 (kaflzta4 scene remotes on smart_knob).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '../..');
const ssot = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'config/architecture/rotary-knob-ssot.json'), 'utf8')
);
const {
  classifyOperatingFamily,
  KNOB_MFR,
  TS004F_ONE_BUTTON_SCENE_MFR,
} = require('../../lib/zigbee/DeviceOperatingMode');
const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');

function mockDevice({ mfr, pid, driver, buttonMode }) {
  return {
    driver: { id: driver },
    getSetting(k) {
      if (k === 'zb_manufacturer_name') return mfr;
      if (k === 'zb_model_id') return pid;
      if (k === 'button_mode') return buttonMode;
      return null;
    },
    getStoreValue() { return null; },
    getData() { return { manufacturerName: mfr, productId: pid }; },
  };
}

describe('P2448 — rotary knob command mode', () => {
  it('SSOT lists rotary couples and gates', () => {
    assert.ok(ssot.rotaryCouples.length >= 8);
    assert.ok(ssot.gates.some((g) => /p2448/.test(g)));
  });

  for (const c of ssot.rotaryCouples) {
    it(`${c.mfr}+${c.pid} → knob/dimmer on ${c.driver}`, () => {
      const fam = classifyOperatingFamily(mockDevice({
        mfr: c.mfr, pid: c.pid, driver: c.driver,
      }));
      assert.strictEqual(fam.family, 'knob');
      assert.strictEqual(fam.defaultMode, 'dimmer');
      assert.strictEqual(fam.writeSceneAttr, true);
      assert.ok(KNOB_MFR.test(c.mfr), `KNOB_MFR should match ${c.mfr}`);
    });

    it(`FPDB locks ${c.mfr}+${c.pid} → ${c.driver}`, () => {
      const hit = DeviceFingerprintDB.lookup(c.mfr, c.pid);
      assert.ok(hit, `missing FPDB hit for ${c.mfr}`);
      assert.strictEqual(hit.driver, c.driver);
    });
  }

  it('smart_knob_rotary ABSENT still dimmer (not scene catch-all)', () => {
    const fam = classifyOperatingFamily(mockDevice({
      mfr: '', pid: '', driver: 'smart_knob_rotary',
    }));
    assert.strictEqual(fam.family, 'knob');
    assert.strictEqual(fam.defaultMode, 'dimmer');
  });

  it('smart_knob_switch defaults knob/dimmer', () => {
    const fam = classifyOperatingFamily(mockDevice({
      mfr: '_TZ3000_uri7ber7', pid: 'TS004F', driver: 'smart_knob_switch',
    }));
    assert.strictEqual(fam.family, 'knob');
    assert.strictEqual(fam.defaultMode, 'dimmer');
  });

  it('one-button scene mfrs stay scene', () => {
    for (const suf of ssot.sceneModeOneButton.mfrSuffixes) {
      assert.ok(TS004F_ONE_BUTTON_SCENE_MFR.test(suf));
      const fam = classifyOperatingFamily(mockDevice({
        mfr: `_TZ3000_${suf}`, pid: 'TS004F', driver: 'smart_knob',
      }));
      assert.strictEqual(fam.defaultMode, 'scene');
    }
  });

  it('abrsvsou/4fjiwweb stay button_wireless_4 and off KNOB_MFR', () => {
    for (const mfr of ssot.forbiddenOnKnobMfr.mfr) {
      assert.ok(!KNOB_MFR.test(mfr));
      const hit = DeviceFingerprintDB.lookup(mfr, 'TS004F');
      assert.strictEqual(hit.driver, 'button_wireless_4');
    }
  });

  it('smart_knob_rotary compose default is dimmer + has cluster 8', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/smart_knob_rotary/driver.compose.json'), 'utf8'
    ));
    const btn = (compose.settings || []).find((s) => s.id === 'button_mode');
    assert.strictEqual(btn.value, 'dimmer');
    const clusters = compose.zigbee.endpoints['1'].clusters;
    assert.ok(clusters.includes(8));
  });

  it('device.js has command-mode path and 0xFC fallback, no scene force', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/smart_knob_rotary/device.js'), 'utf8'
    );
    assert.ok(!/\basync\s+_enableTS004FSceneMode\b|\bthis\._enableTS004FSceneMode\s*\(/.test(src));
    assert.ok(src.includes('_enableTS004FOperatingMode'));
    assert.ok(src.includes('_setupOnOffRotateFc'));
    assert.ok(!/writeAttributes\(\s*\{\s*32772\s*:\s*1\s*\}/.test(src));
  });

  it('button_mode=auto resolves to command for rotary family', () => {
    const fam = classifyOperatingFamily(mockDevice({
      mfr: '_TZ3000_qja6nq5z', pid: 'TS004F', driver: 'smart_knob_rotary',
      buttonMode: 'auto',
    }));
    let setting = 'auto';
    if (!setting || setting === 'auto') setting = fam.defaultMode;
    const desired = (setting === 'dimmer' || setting === 'command') ? 'command' : 'scene';
    assert.strictEqual(desired, 'command');
  });

  it('P2449 flow UX — rotate + brightness cards on all knob drivers', () => {
    const required = ssot.flowUx.requiredTriggersByDriver;
    for (const [driverId, ids] of Object.entries(required)) {
      const flow = JSON.parse(fs.readFileSync(
        path.join(ROOT, `drivers/${driverId}/driver.flow.compose.json`), 'utf8'
      ));
      const allIds = [
        ...(flow.triggers || []).map((t) => t.id),
        ...(flow.conditions || []).map((t) => t.id),
        ...(flow.actions || []).map((t) => t.id),
      ];
      for (const id of ids) {
        assert.ok(allIds.includes(id), `${driverId} missing ${id}`);
      }
    }
  });

  it('P2449 SmartKnobRotationMixin exists and knob devices use it', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/mixins/SmartKnobRotationMixin.js')));
    for (const d of ['smart_knob', 'smart_knob_switch', 'smart_knob_rotary']) {
      const src = fs.readFileSync(path.join(ROOT, `drivers/${d}/device.js`), 'utf8');
      assert.ok(/SmartKnobRotationMixin/.test(src), `${d} should use mixin`);
    }
  });
});
