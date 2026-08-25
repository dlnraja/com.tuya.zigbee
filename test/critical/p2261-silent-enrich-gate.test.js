'use strict';

/**
 * P2261 — Silent enrich from satellite forums + alt platforms
 * - Linptech settings cluster is 0xE002 (interview 57346), fallback 0xE001
 * - Gabriel lwthnp7j interview locks TS0004 → wall_switch_4gang_1way
 * - HOBEIAN ZG-223Z rain gets measure_luminance (Z2M/deCONZ)
 * - iHseno _TZE284_1lvln0x6 sibling of debczeci → presence_sensor_radar
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  planSettingWrite,
  CLUSTER_LINPTECH_PRIMARY,
  CLUSTER_WRITE_CHAIN,
} = require('../../lib/profiles/LinptechES1Profile');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2261 silent multi-thread enrich gate', function () {
  this.timeout(30000);

  it('Linptech primary write cluster is 0xE002 with E001 fallback', () => {
    assert.strictEqual(CLUSTER_LINPTECH_PRIMARY, 0xE002);
    assert.deepStrictEqual([...CLUSTER_WRITE_CHAIN], [0xE002, 0xE001]);
    const plan = planSettingWrite('static_detection_sensitivity', 3);
    assert.strictEqual(plan.cluster, 0xE002);
    assert.ok(plan.fallbackClusters.includes(0xE001));
  });

  it('mmwave compose includes 57346 and device uses CLUSTER_WRITE_CHAIN', () => {
    const compose = JSON.parse(read('drivers/motion_sensor_radar_mmwave/driver.compose.json'));
    const clusters = compose.zigbee.endpoints['1'].clusters.map(Number);
    assert.ok(clusters.includes(57346));
    const src = read('drivers/motion_sensor_radar_mmwave/device.js');
    assert.ok(src.includes('CLUSTER_WRITE_CHAIN'));
    assert.ok(src.includes('fallbackClusters'));
  });

  it('Gabriel lwthnp7j+TS0004 locked to wall_switch_4gang_1way', () => {
    const compose = JSON.parse(read('drivers/wall_switch_4gang_1way/driver.compose.json'));
    assert.ok(compose.zigbee.manufacturerName.some((m) => /lwthnp7j/i.test(m)));
    assert.ok(compose.zigbee.productId.includes('TS0004'));
    const reg = JSON.parse(read('data/user-misattribution-registry.json'));
    const hit = (reg.cases || []).find((c) => c.id === 'lwthnp7j-zcl-4gang');
    assert.ok(hit);
    assert.strictEqual(hit.canonicalDriver, 'wall_switch_4gang_1way');
    assert.ok((hit.productId || []).includes('TS0004'));
  });

  it('rain_sensor exposes measure_luminance + illuminance cluster for ZG-223Z', () => {
    const compose = JSON.parse(read('drivers/rain_sensor/driver.compose.json'));
    assert.ok(compose.capabilities.includes('measure_luminance'));
    assert.ok(compose.zigbee.productId.includes('ZG-223Z'));
    const clusters = compose.zigbee.endpoints['1'].clusters.map(Number);
    assert.ok(clusters.includes(1024), 'needs msIlluminanceMeasurement');
  });

  it('iHseno 1lvln0x6 sibling on presence_sensor_radar with debczeci', () => {
    const compose = JSON.parse(read('drivers/presence_sensor_radar/driver.compose.json'));
    assert.ok(compose.zigbee.manufacturerName.some((m) => /debczeci/i.test(m)));
    assert.ok(compose.zigbee.manufacturerName.some((m) => /1lvln0x6/i.test(m)));
    assert.ok(!compose.zigbee.manufacturerName.some((m) => /_TZ3000_1lvln0x6/i.test(m)), 'do not invent TZ3000 pid sibling');
    const reg = JSON.parse(read('data/user-misattribution-registry.json'));
    const hit = (reg.cases || []).find((c) => c.id === 'p2261-ihseno-debczeci-presence');
    assert.ok(hit);
    assert.strictEqual(hit.canonicalDriver, 'presence_sensor_radar');
  });

  it('silent multi-scan includes thematic rain/presence topics', () => {
    const src = read('tools/ci/forum-silent-multi-scan.js');
    assert.ok(src.includes('158754'));
    assert.ok(src.includes('158757'));
    assert.ok(src.includes('120477'));
  });
});
