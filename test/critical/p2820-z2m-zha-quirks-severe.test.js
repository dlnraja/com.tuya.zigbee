'use strict';

/**
 * P2820 — Z2M/ZHA/quirks severe class placements Contre quoi
 * WHY: herdsman + zha-device-handlers couple truth must not leave wall modules on remotes.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

function compose(driverId) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8')
  );
}

function hasMfr(driverId, mfr) {
  const list = (compose(driverId).zigbee?.manufacturerName || []).map((m) =>
    String(m).toLowerCase().replace(/\s+/g, '')
  );
  return list.includes(String(mfr).toLowerCase().replace(/\s+/g, ''));
}

function hasPid(driverId, pid) {
  return (compose(driverId).zigbee?.productId || [])
    .map((p) => String(p).toUpperCase())
    .includes(String(pid).toUpperCase());
}

describe('P2820 Z2M/ZHA quirks severe placements', () => {
  it('wall switch modules left button_wireless_2 for switch_1gang', () => {
    for (const m of ['_tz3000_npzfdcof', '_tz3000_rmjr4ufz', '_tz3000_mx3vgyea']) {
      assert.ok(hasMfr('switch_1gang', m), `${m} missing switch_1gang`);
      assert.ok(!hasMfr('button_wireless_2', m), `${m} must leave button_wireless_2`);
    }
  });

  it('TS011F wall outlets on plug_smart not switch_1gang', () => {
    assert.ok(hasMfr('plug_smart', '_tz3000_mvn6jl7x'));
    assert.ok(!hasMfr('switch_1gang', '_tz3000_mvn6jl7x'));
    assert.ok(hasPid('plug_smart', 'TS011F'));
  });

  it('garage jktmrpoj / nklqjk62 TZE284 on garage_door_opener', () => {
    assert.ok(hasMfr('garage_door_opener', '_tze204_jktmrpoj'));
    assert.ok(hasMfr('garage_door_opener', '_tze284_nklqjk62'));
    assert.ok(!hasMfr('sensor_contact_zigbee', '_tze204_jktmrpoj'));
    assert.ok(!hasMfr('sensor_contact_zigbee', '_tze284_nklqjk62'));
  });

  it('soil ga1maeof / 2se8efxh on soil_sensor', () => {
    assert.ok(hasMfr('soil_sensor', '_tze200_ga1maeof'));
    assert.ok(hasMfr('soil_sensor', '_tze200_2se8efxh'));
    assert.ok(!hasMfr('switch_wireless', '_tze200_ga1maeof'));
    assert.ok(!hasMfr('plug_smart', '_tze200_2se8efxh'));
  });

  it('cover motor ycke4deo on curtain_motor not presence', () => {
    // WHY(1d790f7e0a, 9.0.1509 "radar mfr bleed on curtain_motor"): later deliberate decision — _TZE204_ycke4deo is owned by
    // presence_sensor_radar and stripped off curtain_motor. One maker, one driver (W4): assert exactly that single owner.
    assert.ok(!hasMfr('curtain_motor', '_tze204_ycke4deo'));
    assert.ok(hasMfr('presence_sensor_radar', '_tze204_ycke4deo'));
  });

  it('missing Z2M couples added (presence / SOS / RGB / TRV)', () => {
    assert.ok(hasMfr('presence_sensor_radar', '_tze284_5qfrnbqs'));
    assert.ok(hasMfr('button_emergency_sos', '_tze284_xc7dve2g'));
    assert.ok(hasMfr('light_rgbcct_ts0505b', '_tz3210_ffuna0nr'));
    assert.ok(hasPid('light_rgbcct_ts0505b', 'TS0505B'));
    assert.ok(hasMfr('device_radiator_valve', '_tze204_wsek35um'));
  });

  it('TRV m5r5nlxc and presence bw4ayyeh left wireless buttons', () => {
    assert.ok(hasMfr('device_radiator_valve', '_tze204_m5r5nlxc'));
    assert.ok(!hasMfr('button_wireless_2', '_tze204_m5r5nlxc'));
    assert.ok(hasMfr('presence_sensor_radar', '_tze284_bw4ayyeh'));
    assert.ok(!hasMfr('button_wireless_4', '_tze284_bw4ayyeh'));
  });

  it('audit tooling + apply plan exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/p2820-z2m-zha-quirks-couple-audit.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/p2820-apply-z2m-zha-severe.js')));
  });
});
