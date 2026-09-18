'use strict';

/**
 * P2590 — Tuya mmWave Ultimate Stabilizer (4 pillars)
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

describe('P2590 mmWave Ultimate Stabilizer', () => {
  it('Module 1 anti-spam thresholds on MTG075 config', () => {
    const src = fs.readFileSync(CONFIGS, 'utf8');
    assert.match(src, /dpThrottleMs:\s*\{\s*9:\s*5000,\s*104:\s*10000\s*\}/);
    assert.match(src, /dpMinDelta:\s*\{\s*9:\s*0\.1,\s*104:\s*5\s*\}/);
    assert.ok(src.includes('survivalWatchdog: true'));
  });

  it('Module 2 survival watchdog does not paint presence from distance', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('_nudgeSurvivalWatchdog'));
    assert.ok(src.includes('_clearSurvivalWatchdog'));
    assert.ok(src.includes('P2590 survival watchdog'));
    assert.ok(src.includes('NEVER paint presence=true from distance alone')
      || src.includes('never paint presence true from distance alone')
      || /Contre quoi: NEVER paint presence/i.test(src));
  });

  it('Modules 3+4 restore + clear still present', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('_pushAllRadarSettingsToDevice'));
    assert.ok(src.includes('clearStuckPresence'));
    const flow = JSON.parse(fs.readFileSync(FLOW, 'utf8'));
    assert.ok((flow.actions || []).some((a) => a.id === 'presence_sensor_radar_clear_presence'));
    const settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
    assert.ok(settings.some((s) => s.id === 'survival_watchdog'));
    assert.ok(settings.some((s) => s.id === 'clear_presence_now'));
  });
});
