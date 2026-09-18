'use strict';

/**
 * P2602 — Intelligent deepen: slim radar compose + announce find_switch
 *
 * Contre quoi:
 * - Tip update re-injects compose zones/temp/humidity/button → VicHY #2252 phantoms
 * - Announce/remesh left find_switch OFF → distance cold again (GH#550)
 * - CRQ3 sibling still ÷100 on DP9
 * Dual-app: BOTH · complementary (P2520) — options kept for dynamic multi-zone add
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const COMPOSE = path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json');
const DEVICE = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');
const SENSOR = path.join(ROOT, 'lib/data/SensorConfigs.js');

describe('P2602 intelligent radar deepen', () => {
  it('compose capabilities slim — no zones/temp/humidity/button by default', () => {
    const caps = JSON.parse(fs.readFileSync(COMPOSE, 'utf8')).capabilities || [];
    assert.ok(caps.includes('alarm_motion'));
    assert.ok(caps.includes('alarm_human'));
    assert.ok(caps.includes('measure_luminance.distance'));
    assert.ok(caps.includes('onoff')); // MTG relay still declared; ceiling strips at runtime
    assert.ok(!caps.includes('alarm_motion.zone1'));
    assert.ok(!caps.includes('measure_luminance.distance.zone1'));
    assert.ok(!caps.includes('measure_temperature'));
    assert.ok(!caps.includes('measure_humidity'));
    assert.ok(!caps.includes('button.1'));
    // Options kept so multi-zone addCapability keeps titles
    const opts = JSON.parse(fs.readFileSync(COMPOSE, 'utf8')).capabilitiesOptions || {};
    assert.ok(opts['alarm_motion.zone1']);
    assert.ok(opts['measure_luminance.distance']);
  });

  it('announce re-arms find_switch + EF00 query', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes("P2602"));
    assert.ok(src.includes("_scheduleCeilingFindSwitchEnable('announce')"));
    assert.ok(src.includes("_queryCeilingPresenceDps('announce')"));
  });

  it('CRQ3 ceiling sibling mirrors DP9 ÷10 + find_switch', () => {
    const src = fs.readFileSync(SENSOR, 'utf8');
    const idx = src.indexOf('TZE200_CRQ3R3LA');
    const block = src.slice(idx, idx + 1600);
    assert.match(block, /9:\s*\{\s*cap:\s*'measure_luminance\.distance',\s*divisor:\s*10/);
    assert.ok(block.includes('enableFindSwitchOnBoot: true'));
    assert.ok(block.includes('ignorePresenceClear: true'));
  });
});
