'use strict';

/**
 * P2581 — VicHY #2247 / diag 8d9d0199 bathroom MTG075 after tip
 *
 * Contre quoi:
 * - tip update strips relay onoff when mfr/config empty (button disappears)
 * - sticky presence forever because soft-clear only ran on throttled DP9
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2581 VicHY 8d9d0199 relay lock + presence watchdog', () => {
  it('removeCapability onoff is fail-closed (P2581)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(src.includes('P2581 refused removeCapability(onoff)'));
    assert.ok(src.includes('fail-closed'));
    assert.ok(src.includes('radar_has_relay'));
    assert.ok(src.includes('_armStickyPresenceWatchdog'));
    assert.ok(src.includes('P2581 soft-clear (watchdog'));
  });

  it('profile apply never staleCaps-pushes onoff on empty cfg catch', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    // Contre quoi: catch (_e) { staleCaps.push('onoff'); }
    assert.ok(!/catch\s*\([^)]*\)\s*\{\s*staleCaps\.push\(['"]onoff['"]\)/.test(src));
    assert.ok(src.includes('do not push onoff') || src.includes('do NOT push onoff')
      || src.includes('do not push onoff'));
  });

  it('MTG075 config: faster soft-clear + watchdog period', () => {
    const { getSensorConfig } = require('../../drivers/presence_sensor_radar/configs');
    const cfg = getSensorConfig('_TZE204_clrdrnya', 'TS0601');
    assert.ok(cfg);
    assert.strictEqual(cfg.antiFalsePositive, true);
    assert.ok(cfg.softClearStableDistanceMs <= 30000);
    assert.ok(cfg.stickyPresenceWatchdogMs <= 15000);
    assert.strictEqual(cfg.hasRelay, true);
  });

  it('MTG relay onoff via options + device profile (not default compose)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'), 'utf8'));
    // WHY(P2603): ceiling no Channel — onoff omitted from capabilities; options + addCapability for MTG
    assert.ok(!(compose.capabilities || []).includes('onoff'));
    assert.ok(compose.capabilitiesOptions?.onoff);
    const device = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(device.includes("requiredCaps.add('onoff')"));
  });

  it('auto-publish compacts mfs before p248x (P2521d)', () => {
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/auto-publish-on-push.yml'), 'utf8');
    assert.ok(yml.includes('Compact mfs_db before family gates'));
    assert.ok(yml.includes('check:p2581'));
  });
});
