'use strict';

/**
 * P2817 — T140352 deep image+message treat (2026-10-14)
 *
 * Contre quoi:
 * - #2262 Istvan `_TZE284_gnpflcoq`+TS0601 pairs virtual socket when compose
 *   requires ZCL clusters the EF00 MCU interview lacks → lean Basic-only match.
 * - #2258 EdP AOYAN must not Homey-cartesian onto water_leak via AOYAN×TS0601.
 * - #2257 meter91 `_TZ3000_7y90pany`+ZG-106Z stays illuminance_sensor.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function readCompose(driverId) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8'),
  );
}

describe('P2817 T140352 forum images/messages treat', () => {
  it('#2262 mmwave compose is lean (Basic) so EF00 gnpflcoq can pair', () => {
    const compose = readCompose('motion_sensor_radar_mmwave');
    const clusters = (compose.zigbee.endpoints['1'].clusters || []).map(Number);
    assert.ok(clusters.includes(0), 'Basic required');
    // Contre quoi: fat ZCL list (1024/1280/57346) blocked EF00-only interview → virtual socket
    for (const bad of [1024, 1280, 16384, 57346, 3, 4, 5]) {
      assert.ok(!clusters.includes(bad), `compose must not require cluster ${bad}`);
    }
    const mfr = (compose.zigbee.manufacturerName || []).map(String);
    assert.ok(mfr.some((m) => /_TZE284_gnpflcoq/i.test(m)), 'gnpflcoq FP must stay');
  });

  it('#2258 AOYAN stripped from water_leak (no AOYAN×TS0601 cartesian)', () => {
    const water = readCompose('water_leak_sensor');
    const mfr = (water.zigbee.manufacturerName || []).map(String);
    assert.ok(!mfr.some((m) => /aoyan/i.test(m)), 'AOYAN must not be on water_leak_sensor');
    const soil = readCompose('soil_sensor');
    const soilMfr = (soil.zigbee.manufacturerName || []).map(String);
    const soilPid = (soil.zigbee.productId || []).map(String);
    assert.ok(soilMfr.some((m) => /aoyan/i.test(m)), 'AOYAN stays on soil');
    assert.ok(soilPid.some((p) => /^AY-303Z$/i.test(p)), 'AY-303Z stays on soil');
  });

  it('#2257 7y90pany+ZG-106Z on illuminance + sacred-keep', () => {
    const compose = readCompose('illuminance_sensor');
    const mfr = (compose.zigbee.manufacturerName || []).map(String);
    const pid = (compose.zigbee.productId || []).map(String);
    assert.ok(mfr.some((m) => /_TZ3000_7y90pany/i.test(m)));
    assert.ok(pid.some((p) => /^ZG-106Z$/i.test(p)));
    const keep = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config', 'architecture', 'publish-sacred-keep-couples.json'), 'utf8'),
    );
    assert.ok(
      (keep.couples || []).some(
        (c) => /7y90pany/i.test(c.mfr) && /^ZG-106Z$/i.test(c.pid) && c.driverId === 'illuminance_sensor',
      ),
      'sacred-keep missing 7y90pany',
    );
  });

  it('Ef00OnlyInterview knows gnpflcoq (forcePureTuyaDp path)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'zigbee', 'Ef00OnlyInterview.js'), 'utf8');
    assert.match(src, /gnpflcoq/i);
  });
});
