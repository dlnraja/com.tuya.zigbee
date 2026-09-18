'use strict';

/**
 * P2584 — MTG075 Occupied mode: smart Homey presence from distance/lux
 *
 * Contre quoi:
 * - Occupied (DP115) forces DP1=true forever → Homey stuck "present"
 * - Auto-heal unlocks Occupied even when user wants to keep it
 * - Distance/lux/relay ignored under Occupied
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2584 MTG075 smart presence while Occupied', () => {
  it('MTG075 config enables smartPresenceWhileOccupied', () => {
    const { getSensorConfig } = require('../../drivers/presence_sensor_radar/configs');
    const cfg = getSensorConfig('_TZE204_clrdrnya', 'TS0601');
    assert.ok(cfg);
    assert.strictEqual(cfg.smartPresenceWhileOccupied, true);
    assert.strictEqual(cfg.hasRelay, true);
    assert.ok(cfg.dpMap[9], 'distance DP9');
    assert.ok(cfg.dpMap[104], 'lux DP104');
    assert.ok(cfg.dpMap[108], 'relay DP108');
    assert.ok(cfg.dpMap[115], 'sensor_mode DP115');
    assert.strictEqual(cfg.dpMap[115].setting, 'sensor_mode');
  });

  it('device.js has Occupied smart overlay helpers + Contre quoi paths', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(src.includes('_smartPresenceUnderOccupiedActive'));
    assert.ok(src.includes('_applySmartPresenceUnderOccupied'));
    assert.ok(src.includes('P2584 drop forced DP1 true'));
    assert.ok(src.includes('P2584 keep Occupied (smart overlay'));
    assert.ok(src.includes('auto_unlock_occupied_on_empty'));
    assert.ok(src.includes('smart_presence_while_occupied'));
    assert.ok(src.includes('radar_fw_presence'));
    // Contre quoi: heal must gate on smart overlay before DP115 unlock
    assert.ok(src.indexOf('P2584 keep Occupied') < src.indexOf('P2579 heal DP115 occupied→on'));
  });

  it('settings expose smart overlay + optional auto-unlock (default keep Occupied)', () => {
    const settings = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.settings.compose.json'), 'utf8'));
    const ids = settings.map((s) => s.id);
    assert.ok(ids.includes('smart_presence_while_occupied'));
    assert.ok(ids.includes('auto_unlock_occupied_on_empty'));
    const smart = settings.find((s) => s.id === 'smart_presence_while_occupied');
    assert.strictEqual(smart.value, true);
    const unlock = settings.find((s) => s.id === 'auto_unlock_occupied_on_empty');
    assert.strictEqual(unlock.value, false);

    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'), 'utf8'));
    const cIds = (compose.settings || []).map((s) => s.id);
    assert.ok(cIds.includes('smart_presence_while_occupied'));
    assert.ok(cIds.includes('auto_unlock_occupied_on_empty'));
  });

  it('npm check:p2584 + auto-publish wire Contre quoi gate', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2584']);
    assert.ok(String(pkg.scripts['check:p258x']).includes('check:p2584'));
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/auto-publish-on-push.yml'), 'utf8');
    assert.ok(yml.includes('check:p2584'));
  });
});
