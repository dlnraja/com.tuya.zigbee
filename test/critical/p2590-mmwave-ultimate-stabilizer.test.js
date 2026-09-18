'use strict';

/**
 * P2590 / P2591 — Tuya mmWave Software Shield (4 pillars)
 * Contre quoi: Zigbee flood misses clear; MCU zeros settings; no manual clear;
 * distance spam paints presence (forbidden — P2534).
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEVICE = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');
const CONFIGS = path.join(ROOT, 'drivers/presence_sensor_radar/configs.js');
const SETTINGS = path.join(ROOT, 'drivers/presence_sensor_radar/driver.settings.compose.json');
const FLOW = path.join(ROOT, 'drivers/presence_sensor_radar/driver.flow.compose.json');
const DRIVER = path.join(ROOT, 'drivers/presence_sensor_radar/driver.js');

describe('P2590/P2591 mmWave Software Shield', () => {
  it('Module 1 anti-spam thresholds on MTG075 + ZG-204', () => {
    const src = fs.readFileSync(CONFIGS, 'utf8');
    assert.match(src, /dpThrottleMs:\s*\{\s*9:\s*5000,\s*104:\s*10000\s*\}/);
    assert.match(src, /dpMinDelta:\s*\{\s*9:\s*0\.1,\s*104:\s*5\s*\}/);
    assert.ok(src.includes('survivalWatchdog: true'));
    // ZG-204ZM/ZH lux shield (complementary)
    assert.match(src, /modelId: 'ZG-204ZM'[\s\S]*?dpThrottleMs:\s*\{\s*106:\s*10000\s*\}/);
    assert.match(src, /modelId: 'ZG-204ZH'[\s\S]*?dpThrottleMs:\s*\{\s*106:\s*10000\s*\}/);
  });

  it('Module 2 survival watchdog does not paint presence from distance', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('_nudgeSurvivalWatchdog'));
    assert.ok(src.includes('triggerPresenceWatchdog'));
    assert.ok(src.includes('_clearSurvivalWatchdog'));
    assert.ok(src.includes('[WATCHDOG] Timeout expiré'));
    assert.ok(src.includes('NEVER paint presence=true from distance alone')
      || src.includes('never paint presence true from distance alone')
      || /Contre quoi: NEVER paint presence/i.test(src));
  });

  it('Modules 3+4 restore + clear prompt API still present', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('_pushAllRadarSettingsToDevice'));
    assert.ok(src.includes('restoreTuyaParameters'));
    assert.ok(src.includes('_hookRadarNodeAnnounce'));
    assert.ok(src.includes('clearStuckPresence'));
    assert.ok(src.includes('forceClearPresence'));
    assert.ok(!/(?<![\w.$])setTimeout\s*\(/.test(src), 'no bare setTimeout in radar device (TITAN)');
    assert.match(src, /12_000|12000/, 'boot restore ~10–15s');
    const flow = JSON.parse(fs.readFileSync(FLOW, 'utf8'));
    const clear = (flow.actions || []).find((a) => a.id === 'presence_sensor_radar_clear_presence');
    assert.ok(clear, 'clear presence action');
    assert.equal(clear.titleFormatted, undefined, 'P2590c omit titleFormatted');
    const driverSrc = fs.readFileSync(DRIVER, 'utf8');
    assert.ok(driverSrc.includes('forceClearPresence') || driverSrc.includes('clearStuckPresence'));
    const settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
    assert.ok(settings.some((s) => s.id === 'survival_watchdog'));
    assert.ok(settings.some((s) => s.id === 'clear_presence_now'));
  });
});
