'use strict';

/**
 * P2340 — VicHY clrdrnya + Cam HOBEIAN ZG-204ZL pairing (forum 2026-08-31)
 * WHY: prepare-publish compact drops broad mfr lists; sacred keep must pin verified couples in app.json.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function mfrHas(driverId, needle) {
  const app = loadJson('app.json');
  const drv = app.drivers.find((d) => d.id === driverId);
  assert.ok(drv, `missing driver ${driverId}`);
  const mfrs = (drv.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
  return mfrs.some((m) => m.includes(needle.toLowerCase()));
}

function pidHas(driverId, pid) {
  const app = loadJson('app.json');
  const drv = app.drivers.find((d) => d.id === driverId);
  const pids = (drv.zigbee?.productId || []).map((p) => String(p).toUpperCase());
  return pids.includes(String(pid).toUpperCase());
}

describe('P2340 presence_sensor_radar sacred keep (VicHY + Cam)', () => {
  it('publish SSOT pins clrdrnya + HOBEIAN ZG-204ZL on presence_sensor_radar', () => {
    const ssot = loadJson('config/architecture/publish-sacred-keep-couples.json');
    const keys = ssot.couples
      .filter((c) => c.driverId === 'presence_sensor_radar')
      .map((c) => `${c.mfr}|${c.pid}`);
    for (const need of [
      '_TZE204_clrdrnya|TS0601',
      '_TZE200_clrdrnya|TS0601',
      '_TZE284_clrdrnya|TS0601',
      'HOBEIAN|ZG-204ZL',
    ]) {
      assert.ok(keys.some((k) => k.toLowerCase() === need.toLowerCase()), `missing sacred ${need}`);
    }
  });

  it('app.json retains clrdrnya mfr + TS0601 after compact (VicHY 4217d5e3)', () => {
    assert.ok(mfrHas('presence_sensor_radar', 'clrdrnya'), 'clrdrnya mfr missing from app.json');
    assert.ok(pidHas('presence_sensor_radar', 'TS0601'), 'TS0601 pid missing from app.json');
    const ep1 = loadJson('app.json').drivers.find((d) => d.id === 'presence_sensor_radar').zigbee.endpoints['1'].clusters;
    assert.deepEqual(ep1, [0, 61184], 'EF00 EP1 must match compose for TS0601 radar');
  });

  it('app.json retains HOBEIAN + ZG-204ZL for Cam motion radar', () => {
    assert.ok(mfrHas('presence_sensor_radar', 'HOBEIAN'), 'HOBEIAN mfr missing from app.json');
    assert.ok(pidHas('presence_sensor_radar', 'ZG-204ZL'), 'ZG-204ZL pid missing from app.json');
  });

  it('meter91 zgyzgdua+TS0044 still pinned on scene_switch_4 (9.0.714 pre-P2336 user action)', () => {
    assert.ok(mfrHas('scene_switch_4', 'zgyzgdua'));
    assert.ok(pidHas('scene_switch_4', 'TS0044'));
    const ep1 = loadJson('app.json').drivers.find((d) => d.id === 'scene_switch_4').zigbee.endpoints['1'].clusters;
    const interview = [0, 1, 6, 57344];
    assert.ok(ep1.every((c) => interview.includes(c)), `EP1 ${ep1} must ⊆ interview`);
  });
});
