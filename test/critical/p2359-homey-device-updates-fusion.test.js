'use strict';

/**
 * P2359 — Homey Device Updates fusion: SSOT coverage, wakeInstruction, helper.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');
const HDU = require('../../lib/ota/HomeyDeviceUpdates');

describe('P2359 Homey Device Updates fusion', () => {
  it('SSOT exists with expected drivers and sources', () => {
    const ssot = HDU.loadSsot();
    assert.ok(ssot.requirements?.homeyFirmwareMin);
    assert.ok(Array.isArray(ssot.coveredDriversExpected) && ssot.coveredDriversExpected.length >= 8);
    assert.ok(ssot.sources?.primary?.url);
    assert.ok(ssot.safety?.wakeInstructionRequiredFor?.includes('contact_sensor'));
  });

  it('semver gate matches Homey ≥13.2', () => {
    assert.strictEqual(HDU.semverGte('13.2.0', '13.2.0'), true);
    assert.strictEqual(HDU.semverGte('13.2.1', '13.2.0'), true);
    assert.strictEqual(HDU.semverGte('13.1.9', '13.2.0'), false);
  });

  it('userGuidance prefers Device Updates paths', () => {
    const msg = HDU.userGuidance({ available: true, newVersion: 99 });
    assert.match(msg, /Device Updates/i);
    assert.match(msg, /13\.2/);
  });

  it('sleepy OTA drivers ship wakeInstruction', () => {
    for (const id of ['contact_sensor', 'soil_sensor', 'radiator_valve', 'thermostatic_radiator_valve']) {
      const compose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
      const fwPath = path.join(ROOT, 'drivers', id, 'driver.firmware.compose.json');
      const fw = fs.existsSync(fwPath) ? JSON.parse(fs.readFileSync(fwPath, 'utf8')) : {};
      const wake = fw.wakeInstruction || compose.firmwareUpdates?.wakeInstruction;
      assert.ok(wake?.en, `${id} wakeInstruction.en`);
      assert.match(wake.en, /Device Updates/i);
    }
  });

  it('firmware gate + verify exit 0', () => {
    const gate = spawnSync(process.execPath, [path.join(ROOT, 'tools/ci/firmware-updates-gate.js'), '--coverage'], { encoding: 'utf8' });
    assert.strictEqual(gate.status, 0, gate.stdout + gate.stderr);
    const verify = spawnSync(process.execPath, [path.join(ROOT, 'tools/ci/verify-homey-device-updates.js')], { encoding: 'utf8' });
    assert.strictEqual(verify.status, 0, verify.stdout + verify.stderr);
  });
});
