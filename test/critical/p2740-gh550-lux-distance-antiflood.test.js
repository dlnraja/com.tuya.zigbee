'use strict';
/**
 * P2740 — GH#550 residual after P2730 (HiepSVG @ 9.0.1243)
 *
 * Contre quoi:
 * - safeSetCapabilityValue antiflood: lux 10s / distance default 5s discarded
 *   light-off steps and walk-away mmWave frames → lag + dip-then-rise UI
 * - EventDedup softNumeric 2% ate lux/distance within 1.2s
 * - 7dcddnye market bleed back onto bulb_dimmable (blocks Auto-Publish / p2517)
 * - motion re-arm still too strict after stillness
 *
 * Dual-app: BOTH
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const EventDeduplicationLayer = require('../../lib/filter/EventDeduplicationLayer');

describe('P2740 GH#550 lux/distance antiflood + sacred rollback', () => {
  it('TuyaZigbeeDevice antiflood snappy for lux + distance', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    assert.ok(/P2740/.test(src), 'must document P2740');
    assert.ok(/'measure_luminance':\s*400/.test(src), 'lux throttle ≤400ms');
    assert.ok(/'measure_luminance\.distance':\s*200/.test(src), 'distance throttle ≤200ms');
    assert.ok(/'measure_luminance':\s*8/.test(src), 'lux significant ≤8');
    assert.ok(/isLuxDrop/.test(src), 'lux drop bypasses throttle');
    const mixin = fs.readFileSync(path.join(ROOT, 'lib/mixins/CapabilityManagerMixin.js'), 'utf8');
    assert.ok(/'measure_luminance':\s*400/.test(mixin), 'mixin lux throttle ≤400ms');
    const uni = fs.readFileSync(path.join(ROOT, 'lib/utils/UniversalThrottleManager.js'), 'utf8');
    assert.ok(/measure_luminance:\s*400/.test(uni), 'UniversalThrottle lux ≤400ms');
  });

  it('EventDedup skips softNumeric on lux and distance', () => {
    const layer = new EventDeduplicationLayer({ windowMs: 1200, softNumeric: true });
    try {
      const id = 'p2740';
      assert.strictEqual(layer.shouldProcess(id, 'measure_luminance', 647), true);
      // Different lux within window must NOT soft-dedupe (was 2% of 647 ≈ 13)
      assert.strictEqual(layer.shouldProcess(id, 'measure_luminance', 620), true);
      assert.strictEqual(layer.shouldProcess(id, 'measure_luminance.distance', 3.0), true);
      assert.strictEqual(layer.shouldProcess(id, 'measure_luminance.distance', 3.05), true);
    } finally {
      layer.destroy();
    }
  });

  it('ceiling motion thresholds snappier than P2730', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/configs.js'), 'utf8');
    assert.ok(/rearmMotionDistanceDeltaM:\s*0\.05/.test(src));
    assert.ok(/motionThrottleMs:\s*600/.test(src));
    assert.ok(/motionDebounceMs:\s*200/.test(src));
  });

  it('7dcddnye stays on dimmer_wall_1gang only (not bulb_dimmable)', () => {
    const dim = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/dimmer_wall_1gang/driver.compose.json'), 'utf8'));
    const bulb = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/bulb_dimmable/driver.compose.json'), 'utf8'));
    const has = (c, m) => (c.zigbee.manufacturerName || []).some((x) => /7dcddnye/i.test(x));
    assert.ok(has(dim, '_TZ3000_7dcddnye'));
    assert.ok(!has(bulb, '_TZ3000_7dcddnye'));
  });
});
