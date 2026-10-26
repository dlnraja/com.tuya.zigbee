'use strict';
// WHY(P2870, 2026-10-19 workstream B): exact couples placed from reliable sources, each on exactly one
// driver, and the history sweep now covers our own repo and survives dropped sockets.
//  - _TYZB01_o7m83470 / _TYZB01_0aps0h1r / _TYZB01_wpmo3ja3 + TS0212 → co_sensor_ias (IAS CO; Johan #513/#977
//    interviews, SmartThings Edge Mc fingerprints, Z2M #9291)
//  - _TZ3000_ee8nrt2l + TS0044 → scene_switch_4 (ZHA PR #1378, deCONZ DDF, Johan #1159)
//  - _TZ3000_5ftkaulg + TS0011 → switch_1gang (ZHA #2090, homed #150, Johan #1178), off climate_sensor
//  - _TZ3000_dfgbtub0 + TS0042 → wall_remote_2_gang (Z2M #33266, forum 26439#5021); TS0044 stays on button_wireless_4
//  - _TZ3210_ejctepku + TS0505B → light_rgbcct_ts0505b (Johan #665 interview); _TZ3210_invesber + TS0502B →
//    light_cct_ts0502b (Johan #824 interview); both mfrs stay on wall_dimmer_tuya for its own pids
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

function owners(mfr, pid) {
  const out = [];
  for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const p = path.join(ROOT, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(p)) { continue; }
    const z = JSON.parse(fs.readFileSync(p, 'utf8')).zigbee || {};
    const mf = (z.manufacturerName || []).map((m) => String(m).toLowerCase());
    const pids = (z.productId || []).map((m) => String(m).toLowerCase());
    if (mf.includes(mfr.toLowerCase()) && pids.includes(pid.toLowerCase())) { out.push(id); }
  }
  // universal_zigbee is the catch-all fallback (prefix-only matcher), not an owner.
  return out.filter((d) => d !== 'universal_zigbee');
}

const CASES = [
  ['_TYZB01_o7m83470', 'TS0212', 'co_sensor_ias'],
  ['_TYZB01_0aps0h1r', 'TS0212', 'co_sensor_ias'],
  ['_TYZB01_wpmo3ja3', 'TS0212', 'co_sensor_ias'],
  ['_TZ3000_ee8nrt2l', 'TS0044', 'scene_switch_4'],
  ['_TZ3000_5ftkaulg', 'TS0011', 'switch_1gang'],
  ['_TZ3000_dfgbtub0', 'TS0042', 'wall_remote_2_gang'],
  ['_TZ3000_dfgbtub0', 'TS0044', 'button_wireless_4'],
  ['_TZ3210_ejctepku', 'TS0505B', 'light_rgbcct_ts0505b'],
  ['_TZ3210_invesber', 'TS0502B', 'light_cct_ts0502b'],
];

describe('P2870 exact couples, one owner each', () => {
  for (const [mfr, pid, owner] of CASES) {
    it(`${mfr} + ${pid} → ${owner}`, () => {
      assert.deepEqual(owners(mfr, pid), [owner]);
    });
  }
  it('every placed couple is pinned', () => {
    const pins = readJson('config/architecture/couple-driver-pins.json').pins;
    for (const [mfr, pid, owner] of CASES.slice(0, 6)) {
      assert.ok(pins.some((p) => p.driver === owner && p.pid === pid && p.mfr.includes(mfr)), `${mfr}+${pid}`);
    }
  });
  it('5ftkaulg left climate_sensor with a curated removal and a legacy entry', () => {
    const rem = readJson('config/architecture/curated-couple-removals.json').removals;
    assert.ok(rem.some((r) => r.driver === 'climate_sensor' && r.mfr.includes('_TZ3000_5ftkaulg')));
    const legacy = readJson('lib/data/dual-couple-legacy.json').drivers.climate_sensor;
    assert.ok(legacy && legacy.manufacturerName.includes('_TZ3000_5ftkaulg'));
  });
  it('app.json mirrors the compose for the new IAS CO driver', () => {
    const app = readJson('app.json');
    const d = app.drivers.find((x) => x.id === 'co_sensor_ias');
    assert.ok(d, 'co_sensor_ias in app.json');
    assert.deepEqual(d.zigbee.productId, ['TS0212']);
    assert.ok(d.capabilities.includes('alarm_co'));
  });
  it('co_sensor_ias is native IAS only (no EF00 cluster declared, no DP map)', () => {
    const c = readJson('drivers/co_sensor_ias/driver.compose.json');
    assert.deepEqual(c.zigbee.endpoints['1'].clusters, [0, 1, 3, 1280]);
    const src = fs.readFileSync(path.join(ROOT, 'drivers/co_sensor_ias/device.js'), 'utf8');
    assert.match(src, /extends UnifiedSensorBase/);
    assert.match(src, /alarmFor\('alarm_co'/);
  });
});

describe('P2870 IAS CO decoding', () => {
  const { decodeZoneStatus, alarmFor } = require('../../lib/sensors/IasZoneTypeRouter');
  it('alarm1 or alarm2 raises alarm_co, 0 clears it', () => {
    assert.equal(alarmFor('alarm_co', decodeZoneStatus(1)), true);
    assert.equal(alarmFor('alarm_co', decodeZoneStatus(2)), true);
    assert.equal(alarmFor('alarm_co', decodeZoneStatus(0)), false);
    assert.equal(alarmFor('alarm_co', decodeZoneStatus(8)), false); // battery-low bit only
  });
});

describe('P2870 sweep coverage and robustness', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/progress/advance-sweep.js'), 'utf8');
  it('our own repo is swept (issues + PRs + comments + review comments)', () => {
    assert.match(src, /dlnraja-issue:/);
    assert.match(src, /DL_REPO = 'dlnraja\/com\.tuya\.zigbee'/);
    assert.match(src, /pulls\/\$\{n\}\/comments/);
  });
  it('a dropped socket no longer kills the chunk', () => {
    assert.match(src, /async function ghGet\(url\)/);
    const forum = fs.readFileSync(path.join(ROOT, 'scripts/progress/lib/sweep-forum.js'), 'utf8');
    assert.match(forum, /getJsonOnce/);
    assert.match(forum, /st\.sweptTo = maxNum; return \{ error/);
  });
  it('Johan index reads PR review comments', () => {
    const idx = fs.readFileSync(path.join(ROOT, 'scripts/scanners/johan-canonical-index.js'), 'utf8');
    assert.match(idx, /pulls\/comments\?since=/);
  });
  it('peer compose treats a couple-only ban as pid-scoped', () => {
    const p = fs.readFileSync(path.join(ROOT, 'tools/ci/p2830-peer-apps-compose-complementary.js'), 'utf8');
    assert.match(p, /couplePids/);
    assert.match(p, /function mfrForbiddenOnDriver\(forbidIdx, mfr, driverId, driverPids = null\)/);
  });
});
