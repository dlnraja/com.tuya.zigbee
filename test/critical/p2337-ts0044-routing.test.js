'use strict';

/**
 * P2337 — TS0044 sacred-couple routing (Z2M cross-ref + forum steal fixes)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const MVM = require(path.join(ROOT, 'lib', 'ManufacturerVariationManager'));
const FPDB = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

describe('P2337 TS0044 routing', () => {
  it('resolveDriverType: scene_switch_4 vs button_wireless_4 per Z2M whitelabel', () => {
    assert.equal(MVM.resolveDriverType('_TZ3000_zgyzgdua', 'TS0044'), 'scene_switch_4');
    assert.equal(MVM.resolveDriverType('_TZ3000_vp6clf9d', 'TS0044'), 'scene_switch_4');
    assert.equal(MVM.resolveDriverType('_TZ3000_u3nv1jwk', 'TS0044'), 'button_wireless_4');
    assert.equal(MVM.resolveDriverType('_TZ3000_bgtzm4ny', 'TS0044'), 'button_wireless_4');
    assert.equal(MVM.resolveDriverType('_TZ3000_kfu8zapd', 'TS0044'), 'button_wireless_4');
  });

  it('wall_remote_4_gang does not claim vp6clf9d/ufhtxr59 (scene_switch_4 owns them)', () => {
    const c = loadJson('drivers/wall_remote_4_gang/driver.compose.json');
    const mfrs = (c.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
    for (const steal of ['vp6clf9d', 'ufhtxr59']) {
      assert.ok(!mfrs.some((m) => m.includes(steal)), `wall_remote still has ${steal}`);
    }
    assert.ok(!c.zigbee.productId.includes('TS0044'));
  });

  it('scene_switch_3 does not expose bare TS0044 (1-EP driver)', () => {
    const c = loadJson('drivers/scene_switch_3/driver.compose.json');
    assert.ok(!c.zigbee.productId.includes('TS0044'));
  });

  it('mfs_db sacred couples vp6clf9d/ufhtxr59+TS0044 → scene_switch_4', () => {
    const db = loadJson('data/mfs_db.json');
    const couples = db.sacredCouples || db.couples || {};
    for (const key of ['_tz3000_vp6clf9d|ts0044', '_tz3000_ufhtxr59|ts0044']) {
      const entry = couples[key];
      assert.ok(entry, key);
      assert.equal(entry.driver, 'scene_switch_4');
    }
  });

  it('DeviceFingerprintDB locks vp6clf9d/ufhtxr59 to scene_switch_4', () => {
    assert.equal(FPDB.lookup('_TZ3000_vp6clf9d', 'TS0044')?.driver, 'scene_switch_4');
    assert.equal(FPDB.lookup('_TZ3000_ufhtxr59', 'TS0044')?.driver, 'scene_switch_4');
  });
});
