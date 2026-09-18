'use strict';

/**
 * P2599 — VicHY #2252 OCR: distance "0 [object Object]" + phantom tiles
 *
 * Contre quoi (screenshot OCR):
 * - Detection Distance shows `0 [object Object]` (units object, not string "m")
 * - Zone 1/2/3 presence+distance + Temperatura + Battery low remain on MTG075 tile
 * Dual-app: BOTH · Forum: silent only
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEVICE = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');
const COMPOSE = path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json');

describe('P2599 VicHY #2252 OCR distance units + phantom strip', () => {
  it('always forces distance units string via _ensureDistanceUnitsString', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('P2599'));
    assert.ok(src.includes('_ensureDistanceUnitsString'));
    assert.ok(src.includes('_sanitizeCorruptDistanceTile'));
    assert.ok(src.includes('_armMtgTileSanitizeBurst'));
    assert.ok(src.includes('distance units → "m"'));
  });

  it('mains phantom heal strips zones + temperature + battery low', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes("'measure_temperature'"));
    assert.ok(src.includes("'alarm_motion.zone1'"));
    assert.ok(src.includes("'measure_luminance.distance.zone1'"));
    assert.ok(src.includes('VicHY #2252 OCR'));
  });

  it('compose distance units remain string m', () => {
    const compose = JSON.parse(fs.readFileSync(COMPOSE, 'utf8'));
    assert.strictEqual(compose.capabilitiesOptions['measure_luminance.distance'].units, 'm');
  });
});
