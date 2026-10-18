'use strict';

/**
 * P2819 — Blakadder severe wrong-class couples locked Contre quoi
 * WHY: RGB bulbs must not live only on dimmer_wall; wall switches not on button_wireless_2.
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

describe('P2819 Blakadder severe class placements', () => {
  it('RGB TS0505B bulbs are on light_rgbcct_ts0505b not only dimmer_wall', () => {
    const bulbs = [
      '_tz3000_v1srfw9x',
      '_tz3000_quqaeew6',
      '_tz3210_zbabx9wh',
      '_tz3000_7hcgjxpc',
    ];
    for (const m of bulbs) {
      assert.ok(hasMfr('light_rgbcct_ts0505b', m), `${m} missing from light_rgbcct_ts0505b`);
      assert.ok(!hasMfr('dimmer_wall_1gang', m), `${m} must leave dimmer_wall_1gang`);
    }
    assert.ok(hasPid('light_rgbcct_ts0505b', 'TS0505B'));
  });

  it('wall switches left button_wireless_2 for switch drivers', () => {
    assert.ok(hasMfr('switch_1gang', '_tz3000_hktqahrq'));
    assert.ok(!hasMfr('button_wireless_2', '_tz3000_hktqahrq'));
    assert.ok(hasMfr('switch_2gang', '_tz3000_7ed9cqgi'));
    assert.ok(!hasMfr('button_wireless_2', '_tz3000_7ed9cqgi'));
  });

  it('plug couples on plug_smart not switch_1gang', () => {
    assert.ok(hasMfr('plug_smart', '_tz3210_fhx7lk3d'));
    assert.ok(!hasMfr('switch_1gang', '_tz3210_fhx7lk3d'));
    assert.ok(hasMfr('plug_smart', '_tz3210_tfxwxklq'));
  });

  it('PJ-ZGD01 garage on garage_door_opener not contact', () => {
    assert.ok(hasMfr('garage_door_opener', '_tze200_nklqjk62'));
    assert.ok(!hasMfr('sensor_contact_zigbee', '_tze200_nklqjk62'));
  });

  it('switch_1gang mfr list was not collapsed by enrich', () => {
    const list = compose('switch_1gang').zigbee?.manufacturerName || [];
    const n = list.length;
    // WHY(2026-10-18): raw floor 1400 predates deliberate moves (12 TS011F plugs -> plug_smart, 2 TZE284 -> switch_2gang, 732e11caa9 dedupe);
    // verified 0 orphaned makers. Raw floor tracks it; the unique-maker floor is the real collapse guard.
    assert.ok(n >= 1380, `switch_1gang mfr count ${n} looks collapsed`);
    const uniq = new Set(list.map((m) => String(m).toLowerCase())).size;
    assert.ok(uniq >= 340, `switch_1gang unique makers ${uniq} looks collapsed`);
  });
});
