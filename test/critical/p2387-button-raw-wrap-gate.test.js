'use strict';

/**
 * P2387 — Button raw frame interceptors must use wrapHandleFrame (never blind overwrite).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function listButtonDeviceFiles() {
  const driversDir = path.join(ROOT, 'drivers');
  const out = [];
  for (const name of fs.readdirSync(driversDir)) {
    if (!/button|scene_switch/.test(name)) { continue; }
    const deviceJs = path.join(driversDir, name, 'device.js');
    if (fs.existsSync(deviceJs)) {
      out.push(`drivers/${name}/device.js`);
    }
  }
  return out;
}

describe('P2387 button raw frame wrap gate', () => {
  it('ButtonE000RawInterceptor SSOT uses wrapHandleFrame', () => {
    const src = read('lib/utils/ButtonE000RawInterceptor.js');
    assert.ok(src.includes('wrapHandleFrame'));
    assert.ok(src.includes('P2387'));
    assert.ok(!src.includes('handleFrame = async'));
  });

  it('PhysicalButtonMixin has TS004 driver+pid fallback profiles (P2387)', () => {
    const src = read('lib/mixins/PhysicalButtonMixin.js');
    assert.ok(src.includes('P2387'));
    assert.ok(src.includes('ts004RemoteFallback'));
    assert.ok(src.includes('button_wireless_3'));
  });

  it('migrated button drivers do not blind-assign zclNode.handleFrame', () => {
    const migrated = [
      'drivers/button_wireless_scene/device.js',
      'drivers/button_wireless_wall/device.js',
      'drivers/button_wireless_valve/device.js',
      'drivers/remote_button_wireless_scene/device.js',
      'drivers/remote_button_wireless_valve/device.js',
      'drivers/remote_button_wireless_wall/device.js',
      'drivers/remote_button_wireless_smart/device.js',
      'drivers/button_wireless_2/device.js',
      'drivers/button_wireless_3/device.js',
    ];
    for (const rel of migrated) {
      const src = read(rel);
      assert.ok(
        src.includes('installE000RawInterceptor') || src.includes('wrapHandleFrame'),
        `${rel} must use P2387 SSOT or wrapHandleFrame`,
      );
      assert.ok(
        !/zclNode\.handleFrame\s*=\s*async/.test(src),
        `${rel} must not blind-overwrite handleFrame`,
      );
    }
  });

  it('button/scene driver fleet: no blind handleFrame overwrite pattern', () => {
    const offenders = [];
    for (const rel of listButtonDeviceFiles()) {
      const src = read(rel);
      // Allow button_wireless_4 onDeleted restore and wrapHandleFrame chain alias
      if (/zclNode\.handleFrame\s*=\s*async/.test(src)) {
        offenders.push(rel);
      }
      if (/const orig = zclNode\.handleFrame\.bind/.test(src) && !src.includes('wrapHandleFrame')) {
        offenders.push(`${rel} (orig.bind without wrap)`);
      }
    }
    assert.deepStrictEqual(offenders, [], `blind handleFrame offenders: ${offenders.join(', ')}`);
  });
});
