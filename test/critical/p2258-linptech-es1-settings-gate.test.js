'use strict';

/**
 * P2258 — Linptech ES1ZZ / Moes _TZ3218_t9ynfz4x + TS0225 settings save
 * Root cause: motion_sensor_radar_mmwave onSettings sent radar_sensitivity → DP9
 * (distance RX) and skipped super.onSettings. Linptech uses manuSpecificTuya2 attrs.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  isLinptechES1,
  planSettingWrite,
  CLUSTER_MANU_TUYA2,
  ATTR,
} = require('../../lib/profiles/LinptechES1Profile');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2258 Linptech ES1ZZ settings gate', function () {
  this.timeout(30000);

  it('profile locks t9ynfz4x + TS0225 as Linptech ES1', () => {
    assert.ok(isLinptechES1('_TZ3218_t9ynfz4x', 'TS0225'));
    assert.ok(isLinptechES1('_TZ3218_awarhusb', 'TS0225'));
    assert.ok(!isLinptechES1('_TZ3000_k4ej3ww2', 'TS0207'));
  });

  it('motion_detection_sensitivity plans ZCL attr 57348 on 0xE002 not EF00 DP9', () => {
    const plan = planSettingWrite('motion_detection_sensitivity', 4);
    assert.strictEqual(plan.kind, 'zcl');
    assert.strictEqual(plan.cluster, CLUSTER_MANU_TUYA2);
    assert.strictEqual(plan.cluster, 0xE002);
    assert.ok((plan.fallbackClusters || []).includes(0xE001));
    assert.strictEqual(plan.attr, ATTR.motionSensitivity);
    assert.strictEqual(plan.value, 4);

    const broken = planSettingWrite('radar_sensitivity', 9);
    assert.strictEqual(broken.attr, ATTR.motionSensitivity);
    assert.ok(broken.value <= 5, 'radar_sensitivity must scale to Linptech 0–5');
  });

  it('fading_time plans DP101 not DP104', () => {
    const plan = planSettingWrite('fading_time', 120);
    assert.strictEqual(plan.kind, 'dp');
    assert.strictEqual(plan.dp, 101);
  });

  it('device.js must not send radar_sensitivity to DP9', () => {
    const src = read('drivers/motion_sensor_radar_mmwave/device.js');
    assert.ok(src.includes('LinptechES1Profile'), 'must use Linptech profile');
    assert.ok(src.includes('_linptechOnSettings'), 'must have Linptech settings path');
    assert.ok(!/sendTuyaCommand\s*\(\s*9\s*,/.test(src), 'must not write sensitivity to DP9');
    assert.ok(!/case\s+'radar_sensitivity'[\s\S]*sendTuyaCommand\s*\(\s*9/.test(src));
  });

  it('compose exposes Linptech 0–5 sensitivity settings + cluster 57346 (0xE002)', () => {
    const compose = JSON.parse(read('drivers/motion_sensor_radar_mmwave/driver.compose.json'));
    const settingIds = (compose.settings || [])
      .flatMap((s) => (s.children ? s.children.map((c) => c.id) : [s.id]))
      .filter(Boolean);
    assert.ok(settingIds.includes('motion_detection_sensitivity'));
    assert.ok(settingIds.includes('static_detection_sensitivity'));
    assert.ok(settingIds.includes('motion_detection_distance'));
    const clusters = compose.zigbee.endpoints['1'].clusters.map(Number);
    // P2261: interview inClusterList uses 57346 (0xE002); keep 57345 as fallback
    assert.ok(clusters.includes(57346) || clusters.includes(0xE002), 'needs Linptech primary cluster 0xE002');
    assert.ok(clusters.includes(57345) || clusters.includes(0xE001), 'needs E001 fallback cluster');
  });

  it('registry couple p2258-linptech-es1zz-ts0225 exists', () => {
    const reg = JSON.parse(read('data/user-misattribution-registry.json'));
    const hit = (reg.cases || []).find((c) => c.id === 'p2258-linptech-es1zz-ts0225');
    assert.ok(hit);
    assert.strictEqual(hit.canonicalDriver, 'motion_sensor_radar_mmwave');
    assert.ok((hit.productId || []).includes('TS0225'));
  });

  it('runtime plan execution produces ZCL writes for Linptech keys', async () => {
    const zclWrites = [];
    const writePlan = async (key, rawValue) => {
      const plan = planSettingWrite(key, rawValue);
      assert.ok(plan, `plan for ${key}`);
      if (plan.kind === 'zcl') {
        zclWrites.push({ cluster: plan.cluster, attr: plan.attr, value: plan.value });
        return true;
      }
      return false;
    };

    await writePlan('motion_detection_sensitivity', 4);
    await writePlan('static_detection_sensitivity', 2);

    assert.strictEqual(zclWrites.length, 2);
    assert.ok(zclWrites.some((w) => w.attr === ATTR.motionSensitivity && w.value === 4));
    assert.ok(zclWrites.some((w) => w.attr === ATTR.staticSensitivity && w.value === 2));
    assert.ok(zclWrites.every((w) => w.cluster === CLUSTER_MANU_TUYA2));
  });
});
