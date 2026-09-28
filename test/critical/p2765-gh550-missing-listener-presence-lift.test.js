'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('P2765 GH#550 missing capability listener fix & initial presence motion lift', () => {
  const devicePath = path.join(__dirname, '../../drivers/presence_sensor_radar/device.js');
  const src = fs.readFileSync(devicePath, 'utf8');

  // 1. _registerPhantomRelaySoftListeners handles onoff, button.1, and button gracefully
  assert.ok(src.includes("this.registerCapabilityListener('onoff'"), 'registers onoff capability listener');
  assert.ok(src.includes("this.registerCapabilityListener('button.1'"), 'registers button.1 capability listener');
  assert.ok(src.includes("this.registerCapabilityListener('button'"), 'registers button capability listener');
  assert.ok(src.includes('/already been registered/i.test(e.message)'), 'catches already registered errors gracefully');

  // 2. onoff tap updates capability value on non-relay radars
  assert.ok(src.includes("await this.safeSetCapabilityValue('onoff', !!value)"), 'updates onoff capability value on tap');

  // 3. Motion true in split mode lifts human and triggers flows
  assert.ok(src.includes("super.safeSetCapabilityValue('alarm_human', true)"), 'lifts alarm_human on motion true');

  // 4. rawEnum 1 on initial entry triggers motion
  assert.ok(src.includes('currentMotion !== true && currentHuman !== true'), 'lifts motion on initial rawEnum 1 detection');
});
