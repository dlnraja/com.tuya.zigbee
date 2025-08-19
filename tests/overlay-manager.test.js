/**
 * Tests for overlay-manager module
 */

const { test } = require('node:test');
const assert = require('node:assert');

// Mock the module
const OverlayManager = require('../lib/tuya/overlay-manager');

test('OverlayManager - constructor', (t) => {
  const manager = new OverlayManager();
  assert.ok(manager.overlaysPath);
  assert.ok(manager.cache);
  assert.strictEqual(manager.maxCacheSize, 100);
});

test('OverlayManager - detectFamily', (t) => {
  const manager = new OverlayManager();
  
  assert.strictEqual(manager.detectFamily('TS011F'), 'plug');
  assert.strictEqual(manager.detectFamily('TS0601'), 'climate-trv');
  assert.strictEqual(manager.detectFamily('TS130F'), 'cover-curtain');
  assert.strictEqual(manager.detectFamily('TS0041'), 'remote-scene');
  assert.strictEqual(manager.detectFamily('unknown'), 'generic');
});

test('OverlayManager - matchesFwRange', (t) => {
  const manager = new OverlayManager();
  
  // No range specified
  assert.strictEqual(manager.matchesFwRange('1.0.0'), true);
  
  // Version in range
  assert.strictEqual(manager.matchesFwRange('1.5.0', '>=1.0 <2.0'), true);
  
  // Version below range
  assert.strictEqual(manager.matchesFwRange('0.5.0', '>=1.0 <2.0'), false);
  
  // Version above range
  assert.strictEqual(manager.matchesFwRange('2.5.0', '>=1.0 <2.0'), false);
});

test('OverlayManager - getStats', (t) => {
  const manager = new OverlayManager();
  const stats = manager.getStats();
  
  assert.ok(typeof stats.cached === 'number');
  assert.strictEqual(stats.maxCache, 100);
  assert.ok(stats.overlays);
  assert.ok(typeof stats.overlays.families === 'number');
});

console.log('✅ OverlayManager tests completed');
