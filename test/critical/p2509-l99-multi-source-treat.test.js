'use strict';

/**
 * P2509 — L99 multi-source treat Contre quoi
 * - gkfbdvyx sticky presence (Z2M#30785 / GH#547): DP1 unreliable + clear on distance≈0
 * - invent junk mfr never locked (Stefan T154092)
 * - npj9bug3+TS0601 soil (not climate / invent CK-TLSR pid)
 * - Moes 5slehgeo stays curtain_motor (GH#533 tip-lag / re-pair)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const IntelligentPresenceInference = require('../../lib/sensors/IntelligentPresenceInference');

describe('P2509 L99 multi-source treat', () => {
  it('TYPE B gkfbdvyx DP1 is unreliable + zero-distance clear flags', () => {
    const { SENSOR_CONFIGS } = require('../../drivers/presence_sensor_radar/configs');
    const cfg = SENSOR_CONFIGS.ZY_M100_CEILING_24G;
    assert.ok(cfg, 'ZY_M100_CEILING_24G config');
    assert.strictEqual(cfg.clearPresenceOnZeroDistance, true);
    assert.strictEqual(cfg.syncPresenceFromDistanceInference, true);
    assert.strictEqual(cfg.dpMap[1].unreliable, true);
    assert.strictEqual(cfg.dpMap[1].useInference, true);
    // WHY(P2604 / Z2M V3): DP104 is NOT presence on gkfbdvyx — internal compat only
    assert.strictEqual(cfg.dpMap[104].cap, null);
    assert.strictEqual(cfg.dpMap[9].divisor, 10);
    assert.strictEqual(cfg.dpMap[103].cap, 'measure_luminance');
    const deviceSrc = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(deviceSrc.includes('clearPresenceOnZeroDistance'), 'device paints clear on zero distance');
  });

  it('unreliable sticky true clears when distance collapses to 0', () => {
    const inf = new IntelligentPresenceInference({ log() {} });
    inf.updateDistance(1.2);
    assert.strictEqual(inf.updatePresenceDP(1, { unreliable: true }), true);
    assert.strictEqual(inf.updateDistance(0), false);
    assert.strictEqual(inf.updatePresenceDP(1, { unreliable: true }), false);
  });

  it('invent junk mfr is doNotLock; npj9bug3 locked to soil_sensor', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const cases = reg.cases || reg;
    const invent = cases.find((c) => c.id === 'p2509-invent-junk-do-not-lock');
    assert.ok(invent && invent.doNotLock === true);
    assert.ok(invent.mfr.some((m) => /3MZB0SDZ/i.test(m)));
    const soil = cases.find((c) => c.id === 'p2509-npj9bug3-soil-zg303z');
    assert.ok(soil);
    assert.strictEqual(soil.canonicalDriver, 'soil_sensor');
    assert.ok(soil.productId.includes('TS0601'));
    assert.ok(!soil.productId.some((p) => /CK-TLSR/i.test(p)), 'never invent CK-TLSR as productId');
  });

  it('npj9bug3 + 5slehgeo + gkfbdvyx remain in correct compose drivers', () => {
    const soil = fs.readFileSync(path.join(ROOT, 'drivers/soil_sensor/driver.compose.json'), 'utf8');
    assert.ok(/_TZE200_npj9bug3/i.test(soil));
    const curtain = fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8');
    assert.ok(/_TZE204_5slehgeo/i.test(curtain));
    const radar = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'), 'utf8');
    assert.ok(/_TZE204_gkfbdvyx/i.test(radar));
  });
});
