'use strict';

/**
 * P2336 — forum email dump (meter91 / JiriG / PresentSky)
 * Homey pairs from app.json clusters ⊆ interview — never invent required clusters.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function endpointClusters(driverId, ep) {
  const compose = loadJson(`drivers/${driverId}/driver.compose.json`);
  const app = loadJson('app.json');
  const appDrv = app.drivers.find((d) => d.id === driverId);
  assert.ok(appDrv, `app.json missing ${driverId}`);
  const c = compose.zigbee.endpoints[String(ep)].clusters;
  const a = appDrv.zigbee.endpoints[String(ep)].clusters;
  assert.deepEqual(a, c, `${driverId} app.json EP${ep} must match compose`);
  return c;
}

function isSubset(required, available) {
  const set = new Set(available);
  return required.every((c) => set.has(c));
}

describe('P2336 forum dump pairing clusters', () => {
  it('meter91 _TZ3000_zgyzgdua+TS0044 scene_switch_4 EP1 ⊆ interview [0,1,6,57344]', () => {
    const compose = loadJson('drivers/scene_switch_4/driver.compose.json');
    const mfrs = compose.zigbee.manufacturerName.map((m) => m.toLowerCase());
    assert.ok(mfrs.includes('_tz3000_zgyzgdua'));
    assert.ok(compose.zigbee.productId.includes('TS0044'));

    const ep1 = endpointClusters('scene_switch_4', 1);
    const interviewEp1 = [0, 1, 6, 57344]; // INT-015 + Moes TS0044
    assert.ok(isSubset(ep1, interviewEp1), `EP1 ${ep1} must ⊆ ${interviewEp1}`);
    assert.ok(!ep1.includes(3), 'identify must not be required');
    assert.ok(!ep1.includes(4096), 'greenPower must not be required');
    assert.ok(!ep1.includes(61184), 'EF00 must not be required on scene remote');

    for (const ep of [2, 3, 4]) {
      const clusters = endpointClusters('scene_switch_4', ep);
      assert.ok(isSubset(clusters, [1, 6]), `EP${ep} ${clusters} must ⊆ [1,6]`);
    }
  });

  it('JiriG _TZE284_myd45weu+TS0601 soil_sensor EP1 ⊆ interview', () => {
    const compose = loadJson('drivers/soil_sensor/driver.compose.json');
    assert.ok(compose.zigbee.manufacturerName.some((m) => /myd45weu/i.test(m)));
    assert.ok(compose.zigbee.productId.includes('TS0601'));
    const ep1 = endpointClusters('soil_sensor', 1);
    const interview = [4, 5, 61184, 0, 60672];
    assert.ok(isSubset(ep1, interview), `soil EP1 ${ep1} must ⊆ interview`);
    assert.ok(!ep1.includes(60672), 'do not compose proprietary 0xED00');
  });

  it('PresentSky dimmer TX treats falsy write as soft-fail', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/wall_dimmer_tuya/device.js'), 'utf8');
    assert.ok(/if\s*\(\s*!ok\s*\)/.test(src) || /if\s*\(\s*!okOn\s*\)/.test(src));
    const write = fs.readFileSync(path.join(ROOT, 'lib/TuyaSpecificClusterDevice.js'), 'utf8');
    assert.ok(/writeBool[\s\S]*?return false/.test(write));
    assert.ok(/writeData32[\s\S]*?return false/.test(write));
  });
});
