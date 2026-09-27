'use strict';

/**
 * P2752 — Boot Crash Guard, Uncaught Exception & Zero-Crash Color Utility
 *
 * Contre quoi:
 * - App in Crashed state upon startup on Homey Pro (GH #551 feedback)
 * - initializeSettings or constructors throwing before flow cards register
 * - Missing uncaughtException handler causing process exit
 * - lib/util/color.js throwing MODULE_NOT_FOUND on missing tinygradient
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT_MASTER = path.join(__dirname, '..', '..');
const ROOT_BASTIEN = path.join(__dirname, '..', '..', '..', 'bastien');

describe('P2752 Boot Crash Guard & Zero-Crash Color Utility', () => {
  it('app.js has uncaughtException handler and try/catch around initializeSettings & managers', () => {
    const src = fs.readFileSync(path.join(ROOT_MASTER, 'app.js'), 'utf8');
    assert.ok(src.includes("process.on('uncaughtException'"), 'must register uncaughtException');
    assert.ok(src.includes('try {'), 'must have try blocks');
    assert.ok(/try\s*\{\s*this\.initializeSettings\(\);?\s*\}\s*catch/.test(src), 'initializeSettings guarded');
    assert.ok(/try\s*\{\s*this\.capabilityManager\s*=\s*new CapabilityManager/.test(src), 'capabilityManager guarded');
    assert.ok(/try\s*\{\s*this\.identificationDatabase\s*=\s*new DeviceIdentificationDatabase/.test(src), 'identificationDatabase guarded');
  });

  it('bastien app.js has identical crash guards', () => {
    if (fs.existsSync(path.join(ROOT_BASTIEN, 'app.js'))) {
      const src = fs.readFileSync(path.join(ROOT_BASTIEN, 'app.js'), 'utf8');
      assert.ok(src.includes("process.on('uncaughtException'"), 'bastien must register uncaughtException');
      assert.ok(/try\s*\{\s*this\.initializeSettings\(\);?\s*\}\s*catch/.test(src), 'bastien initializeSettings guarded');
      assert.ok(/try\s*\{\s*this\.capabilityManager\s*=\s*new CapabilityManager/.test(src), 'bastien capabilityManager guarded');
      assert.ok(/try\s*\{\s*this\.identificationDatabase\s*=\s*new DeviceIdentificationDatabase/.test(src), 'bastien identificationDatabase guarded');
    }
  });

  it('lib/util/color.js does not crash without tinygradient and maps temperature correctly', () => {
    const colorModule = require('../../lib/util/color');
    assert.equal(typeof colorModule.mapTemperatureToHueSaturation, 'function');
    const hsv0 = colorModule.mapTemperatureToHueSaturation(0);
    assert.ok(hsv0 && typeof hsv0.hue === 'number' && typeof hsv0.saturation === 'number');
    const hsvHalf = colorModule.mapTemperatureToHueSaturation(0.5);
    assert.ok(hsvHalf && typeof hsvHalf.hue === 'number');
    const hsv1 = colorModule.mapTemperatureToHueSaturation(1);
    assert.ok(hsv1 && typeof hsv1.hue === 'number');
  });
});
