'use strict';

/**
 * P2366 — Unknown Zigbee Device hardening (forum signals)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function hasCouple(driverId, mfr, pid) {
  const j = loadJson(`drivers/${driverId}/driver.compose.json`);
  const mfrs = (j.zigbee?.manufacturerName || []).map((x) => x.toLowerCase());
  const pids = (j.zigbee?.productId || []).map((x) => String(x).toUpperCase());
  return mfrs.includes(mfr.toLowerCase()) && pids.includes(String(pid).toUpperCase());
}

describe('P2366 unknown zigbee hardening', () => {
  it('sacred-keep pins forum unknown couples', () => {
    const sk = loadJson('config/architecture/publish-sacred-keep-couples.json');
    const pins = sk.couples || [];
    const must = [
      ['_TZ3000_v5498kdm', 'TS0001', 'switch_1gang'],
      ['_TZE284_fhvpaltk', 'TS0601', 'valve_dual_irrigation'],
      ['_TZ3000_zgyzgdua', 'TS0044', 'scene_switch_4'],
    ];
    for (const [mfr, pid, drv] of must) {
      assert.ok(
        pins.some((p) => p.mfr.toLowerCase() === mfr.toLowerCase() && p.pid === pid && p.driverId === drv),
        `missing sacred pin ${mfr}+${pid} → ${drv}`,
      );
    }
  });

  it('compose lists forum unknown couples with case variants', () => {
    assert.ok(hasCouple('switch_1gang', '_TZ3000_v5498kdm', 'TS0001'));
    assert.ok(hasCouple('valve_dual_irrigation', '_TZE284_fhvpaltk', 'TS0601'));
    assert.ok(hasCouple('scene_switch_4', '_TZ3000_zgyzgdua', 'TS0044'));
  });

  it('app.json zigbee matches compose for scene_switch_4 (pairing path)', () => {
    const compose = loadJson('drivers/scene_switch_4/driver.compose.json');
    const app = loadJson('app.json');
    const drv = app.drivers.find((d) => d.id === 'scene_switch_4');
    assert.ok(drv?.zigbee, 'scene_switch_4 in app.json');
    const cm = compose.zigbee.manufacturerName.map((m) => m.toLowerCase());
    const am = drv.zigbee.manufacturerName.map((m) => m.toLowerCase());
    assert.ok(am.includes('_tz3000_zgyzgdua'), 'app.json must include zgyzgdua for pairing');
    assert.deepEqual(drv.zigbee.endpoints, compose.zigbee.endpoints, 'endpoints must match compose');
  });

  it('pairing identity logger exists', () => {
    const mod = require('../../lib/pairing/logPairingIdentity');
    assert.equal(typeof mod.logPairingIdentityBatch, 'function');
  });
});
