'use strict';

const { describe, it } = require('./_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  DEFAULT_WINDOW_MS, normalizeAction, shouldDrop, installOnce,
} = require('../lib/utils/PressActionDedup');

const ROOT = path.join(__dirname, '..');

describe('P3362 TS0044 _TZ3000_wkai4ga5 press dedup (Johan #864 lesson)', () => {
  it('the exact couple is on scene_switch_4 with TS0044, not TS004F', () => {
    const compose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/scene_switch_4/driver.compose.json'), 'utf8'));
    const mfrs = [].concat((compose.zigbee || {}).manufacturerName || []).map((s) => String(s).toLowerCase());
    const pids = [].concat((compose.zigbee || {}).productId || []).map(String);
    assert.ok(mfrs.includes('_tz3000_wkai4ga5'));
    assert.ok(pids.includes('TS0044'));
  });

  it('normalizes commandOn / 0xFD / long_press / release to one action vocabulary', () => {
    assert.strictEqual(normalizeAction('commandOn'), 'single');
    assert.strictEqual(normalizeAction(0), 'single');
    assert.strictEqual(normalizeAction('long_press'), 'long');
    assert.strictEqual(normalizeAction(2), 'long');
    assert.strictEqual(normalizeAction('released'), 'release');
    assert.strictEqual(DEFAULT_WINDOW_MS, 400);
  });

  it('drops a second event for the same endpoint+action inside the window, including mixed transports', () => {
    const store = {};
    const a = shouldDrop(store, 1, 'commandOn', 1000, 400);
    const b = shouldDrop(store, 1, 'single', 1100, 400);
    const c = shouldDrop(store, 1, 0, 1200, 400);
    assert.strictEqual(a.drop, false);
    assert.strictEqual(b.drop, true);
    assert.strictEqual(c.drop, true);
    assert.strictEqual(a.key, '1|single');
  });

  it('does not drop a different endpoint, a different action, or a press after the window', () => {
    const store = {};
    assert.strictEqual(shouldDrop(store, 1, 'single', 1000, 400).drop, false);
    assert.strictEqual(shouldDrop(store, 2, 'single', 1100, 400).drop, false);
    assert.strictEqual(shouldDrop(store, 1, 'double', 1100, 400).drop, false);
    assert.strictEqual(shouldDrop(store, 1, 'single', 1500, 400).drop, false);
  });

  it('installOnce is idempotent so re-init / migration cannot double-bind', () => {
    const obj = {};
    assert.strictEqual(installOnce(obj, '_s4StacksInitialized'), true);
    assert.strictEqual(installOnce(obj, '_s4StacksInitialized'), false);
    assert.strictEqual(obj._s4StacksInitialized, true);
  });

  it('scene_switch_4 uses the shared dedup helper and does not key transport paths separately', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/scene_switch_4/device.js'), 'utf8');
    assert.match(src, /PressActionDedup/);
    assert.match(src, /JohanBendz|issue #864/);
    assert.match(src, /installOnce/);
    assert.match(src, /normalizeAction|shouldDrop/);
    assert.doesNotMatch(src, /_isDeduped\(ep, 'on'\)/);
  });

  it('collapses commandOff with 0xFD double and commandToggle with 0xFD long', () => {
    const store = {};
    assert.strictEqual(shouldDrop(store, 3, 'commandOff', 2000, 400).drop, false);
    assert.strictEqual(shouldDrop(store, 3, 1, 2100, 400).drop, true);
    assert.strictEqual(shouldDrop(store, 4, 'commandToggle', 2000, 400).drop, false);
    assert.strictEqual(shouldDrop(store, 4, 2, 2100, 400).drop, true);
  });

  it('forwards release as its own action and does not invent a soft release', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/scene_switch_4/device.js'), 'utf8');
    assert.match(src, /normalizeAction|shouldDrop/);
    assert.doesNotMatch(src, /soft.?release|invent(?:ed)? a release/i);
    const store = {};
    assert.strictEqual(shouldDrop(store, 1, 'long', 3000, 400).drop, false);
    assert.strictEqual(shouldDrop(store, 1, 'release', 3100, 400).drop, false);
  });
});
