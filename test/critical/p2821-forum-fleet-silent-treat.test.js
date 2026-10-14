'use strict';

/**
 * P2821 — Forum fleet silent treat Contre quoi
 * WHY: multi-topic scan must not invent cartesian couples; verified MISSING_PID
 * resolutions stay pinned in compose + sacred-keep.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function loadCompose(driverId) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8'),
  );
}

function hasMfr(compose, mfr) {
  return (compose.zigbee?.manufacturerName || []).some(
    (m) => String(m).toLowerCase() === String(mfr).toLowerCase(),
  );
}

function hasPid(compose, pid) {
  return (compose.zigbee?.productId || []).some(
    (p) => String(p).toLowerCase() === String(pid).toLowerCase(),
  );
}

describe('P2821 forum fleet silent treat', () => {
  it('verified forum couples stay in canonical drivers', () => {
    const locks = [
      ['button_wireless_4', '_TZ3000_xabckq1v', 'TS004F'],
      ['button_wireless_4', '_TZ3000_kfu8zapd', 'TS0044'],
      ['scene_switch_4', '_TZ3000_zgyzgdua', 'TS0044'],
      ['device_radiator_valve', '_TZE284_ogx8u5z6', 'TS0601'],
      ['presence_sensor_radar', '_TZE204_dtzziy1e', 'TS0601'],
      ['soil_sensor', '_TZE200_npj9bug3', 'TS0601'],
      ['wall_dimmer_tuya', '_TZE284_nqqylykc', 'TS0601'],
      ['smart_knob_rotary', '_TZ3000_qja6nq5z', 'TS004F'],
      ['rain_sensor', '_TZ3210_tgvtvdoc', 'TS0207'],
      ['motion_sensor_radar_mmwave', '_TZ3218_t9ynfz4x', 'TS0225'],
    ];
    for (const [drv, mfr, pid] of locks) {
      const c = loadCompose(drv);
      assert.ok(hasMfr(c, mfr), `${drv} missing mfr ${mfr}`);
      assert.ok(hasPid(c, pid), `${drv} missing pid ${pid}`);
    }
  });

  it('does not invent cartesian forum couples into wrong drivers', () => {
    assert.equal(hasMfr(loadCompose('scene_switch_3'), '_TZ3000_zgyzgdua'), false);
    assert.equal(hasMfr(loadCompose('button_wireless_3'), '_TZ3000_wkai4ga5'), false);
    assert.equal(hasMfr(loadCompose('bulb_rgb'), '_TZ3000_4upl1fcj'), false);
    assert.equal(hasMfr(loadCompose('button_wireless_1'), '_TZ3000_qd7hej8u'), false);
  });

  it('sacred-keep pins P2821 forum couples', () => {
    const keep = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8'),
    );
    const keys = new Set(
      (keep.couples || []).map(
        (c) => `${String(c.mfr).toLowerCase()}|${String(c.pid).toLowerCase()}|${c.driverId}`,
      ),
    );
    for (const k of [
      '_tze204_dtzziy1e|ts0601|presence_sensor_radar',
      '_tze200_npj9bug3|ts0601|soil_sensor',
      '_tze284_nqqylykc|ts0601|wall_dimmer_tuya',
      '_tz3000_qja6nq5z|ts004f|smart_knob_rotary',
      '_tz3210_tgvtvdoc|ts0207|rain_sensor',
      '_tze284_ne4pikwm|ts0601|radiator_valve',
    ]) {
      assert.ok(keys.has(k), `sacred-keep missing ${k}`);
    }
  });

  it('registry forbids cartesian invent couples', () => {
    const reg = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'),
    );
    const ids = new Set((reg.cases || []).map((c) => c.id));
    for (const id of [
      'p2821-forbid-cartesian-zgyzgdua-ts0043',
      'p2821-forbid-cartesian-wkai4ga5-ts0043',
      'p2821-forbid-cartesian-4upl1fcj-ts0505b',
      'p2821-forbid-cartesian-qd7hej8u-ts0041',
    ]) {
      assert.ok(ids.has(id), `registry missing ${id}`);
    }
  });
});
