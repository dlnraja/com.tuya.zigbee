'use strict';

/**
 * P2328 — Forum button RX / pairing (meter91, Moes TS0044, wall_switch steal)
 * WHY: silent forum dump 2026-08-30 — presses dead from 0x8004 misclass, handleFrame
 * overwrite, and wall_switch_4_gang claiming TS0044 remotes.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MVM = require(path.join(ROOT, 'lib', 'ManufacturerVariationManager'));

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

describe('P2328 button forum RX / pairing', () => {
  it('wkai4ga5 is NOT TS004F 0x8004 scene-mode', () => {
    const cfg = MVM.getManufacturerConfig('_TZ3000_wkai4ga5', 'TS0044', 'button_wireless');
    assert.notEqual(cfg.sceneModeAttribute, 0x8004);
    assert.notEqual(cfg.specialHandling, 'ts004f_scene_mode');
    assert.equal(cfg.specialHandling, 'ts0044_scene_switch');
  });

  it('resolveDriverType couple-aware for sacred TS0044 remotes', () => {
    assert.equal(MVM.resolveDriverType('_TZ3000_zgyzgdua', 'TS0044'), 'scene_switch_4');
    assert.equal(MVM.resolveDriverType('_TZ3000_wkai4ga5', 'TS0044'), 'scene_switch_4');
    assert.equal(MVM.resolveDriverType('_TZ3000_kfu8zapd', 'TS0044'), 'button_wireless_4');
    assert.equal(MVM.resolveDriverType('_TZ3000_unknownxyz', 'TS0044'), 'button_wireless_4');
  });

  it('button_wireless_4 uses wrapHandleFrame (no blind handleFrame assign)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_4/device.js'), 'utf8');
    assert.match(src, /wrapHandleFrame/);
    assert.match(src, /button-wireless-4-raw/);
    assert.doesNotMatch(src, /node\.handleFrame\s*=\s*wrapper/);
  });

  it('scene_switch_4 skips dual 0xFD when BoundCluster armed', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/scene_switch_4/device.js'), 'utf8');
    assert.match(src, /!self\._onOffFdBoundClusterInitialized/);
  });

  it('wall_switch_4_gang no longer steals TS0044 remotes', () => {
    const c = readJson('drivers/wall_switch_4_gang/driver.compose.json');
    const pids = c.zigbee.productId || [];
    const mfrs = (c.zigbee.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(!pids.includes('TS0044'));
    for (const steal of ['ufhtxr59', 'vp6clf9d', 'abci1hiu']) {
      assert.ok(!mfrs.some((m) => m.includes(steal)), `wall_switch still has ${steal}`);
    }
  });

  it('scene_switch_4 productIds are TS0044/TS1002 only (no knob soup)', () => {
    const c = readJson('drivers/scene_switch_4/driver.compose.json');
    const pids = c.zigbee.productId || [];
    assert.deepEqual([...pids].sort(), ['TS0044', 'TS1002'].sort());
    const mfrs = c.zigbee.manufacturerName || [];
    assert.ok(!mfrs.some((m) => /^hobeian$/i.test(m)));
  });

  it('mfs_db wkai4ga5 locked to TS0044 battery remote', () => {
    const db = readJson('data/mfs_db.json');
    const w = (db.devices && db.devices['_tz3000_wkai4ga5']) || db['_tz3000_wkai4ga5'];
    assert.ok(w, 'wkai4ga5 mfs entry');
    assert.deepEqual(w.modelIds, ['TS0044']);
    if (w.powerSource) assert.equal(w.powerSource, 'battery');
    if (w.capabilities) assert.ok(w.capabilities.includes('button.1'));
  });
});
