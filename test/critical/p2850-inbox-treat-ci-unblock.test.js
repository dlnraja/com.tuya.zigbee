'use strict';

/**
 * P2850 Contre quoi: inbox GH soil/TRV couples stay locked; wall_remote must not steal TS0044;
 * Athom final gate soft-expects healthy Test on processing_failed.
 */

const { describe, it } = require('node:test');
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function loadJson(rel) {
  return JSON.parse(read(rel));
}

describe('P2850 inbox treat + CI unblock', () => {
  it('soil_sensor keeps QT-07S myd45weu+TS0601 and AOYAN+AY-303Z', () => {
    const c = loadJson('drivers/soil_sensor/driver.compose.json');
    const mfr = (c.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
    const pid = (c.zigbee.productId || []).map((p) => String(p).toUpperCase());
    assert.ok(mfr.some((m) => m.includes('myd45weu')));
    assert.ok(mfr.some((m) => m.includes('aoyan')));
    assert.ok(pid.includes('TS0601'));
    assert.ok(pid.includes('AY-303Z'));
    assert.deepEqual(c.zigbee.endpoints['1'].clusters.slice(0, 2).sort((a, b) => a - b), [0, 61184]);
  });

  it('wall_remote_4_gang(_3) do not bare-claim TS0044', () => {
    for (const id of ['wall_remote_4_gang', 'wall_remote_4_gang_3']) {
      const c = loadJson(`drivers/${id}/driver.compose.json`);
      assert.ok(!(c.zigbee.productId || []).includes('TS0044'), id);
    }
  });

  it('TRV rxq4iti9 DP4 setpoint guard still present (GH#560)', () => {
    const s = read('lib/tuya/TuyaEF00Manager.js');
    assert.match(s, /_isTrvSetpointDpNotBattery/);
    assert.match(s, /rxq4iti9/);
  });

  it('assert-athom-final soft-expects healthy Test on failed tip (P139)', () => {
    const s = read('.github/scripts/assert-athom-final.js');
    assert.match(s, /SOFT-EXPECT|softOk/);
    assert.match(s, /ATHOM_FINAL_SOFT_EXPECT/);
  });
});
