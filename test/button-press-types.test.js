'use strict';

/**
 * Tests — button press types & gang routing (C lot, v9.0.377)
 * Contract of TuyaPressTypeMap (single/double/long across vendors' vocab)
 * and gang-based decoding in button_wireless_4 (TS0044).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const { resolve: resolvePressType, PRESS_MAP } = require('../lib/utils/TuyaPressTypeMap');

describe('TuyaPressTypeMap', () => {
  it('numeric 0/1/2 = single/double/long (Tuya convention)', () => {
    assert.strictEqual(PRESS_MAP[0], 'single');
    assert.strictEqual(PRESS_MAP[1], 'double');
    assert.strictEqual(PRESS_MAP[2], 'long');
  });

  it('resolves vendor vocab to canonical types', () => {
    assert.strictEqual(resolvePressType('single', 'E000-4G'), 'single');
    assert.strictEqual(resolvePressType('double', 'E000-4G'), 'double');
    assert.strictEqual(resolvePressType('hold', 'E000-4G'), 'long');
    assert.strictEqual(resolvePressType('long_press', 'E000-4G'), 'long');
  });

  it('numeric values pass through the map', () => {
    assert.strictEqual(resolvePressType(0, 'E000-4G'), 'single');
    assert.strictEqual(resolvePressType(1, 'E000-4G'), 'double');
    assert.strictEqual(resolvePressType(2, 'E000-4G'), 'long');
  });

  it('unknown values never crash', () => {
    assert.doesNotThrow(() => resolvePressType(99, 'E000-4G'));
    assert.doesNotThrow(() => resolvePressType(undefined, 'E000-4G'));
  });
});

describe('button_wireless_4 (TS0044) source contract', () => {
  const src = fs.readFileSync(path.join(ROOT, 'drivers', 'button_wireless_4', 'device.js'), 'utf8');

  it('decodes E000 frames per button (1-4)', () => {
    assert.match(src, /data\[0\] >= 1 && data\[0\] <= 4/);
  });

  it('has the verbose unrecognized-frame logger (P92)', () => {
    assert.match(src, /_logUnrecognizedFrame/);
  });

  it('wraps handleFrame with orig(...args)', () => {
    assert.match(src, /orig\(\.\.\.args\)/);
  });
});

describe('button_emergency_sos source contract', () => {
  const src = fs.readFileSync(path.join(ROOT, 'drivers', 'button_emergency_sos', 'device.js'), 'utf8');

  it('registers the button.1 capability listener (virtual press)', () => {
    assert.match(src, /registerCapabilityListener\('button\.1'/);
  });

  it('routes battery through the smart normalizer', () => {
    assert.match(src, /normalizeZigbeeValue/);
  });
});
