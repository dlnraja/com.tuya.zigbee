'use strict';

/**
 * P2589 — Radar MCU amnesia restore + Clear Presence maintenance
 * Contre quoi: after power blip MCU zeros sensitivity/delay; lux moves but presence stuck;
 * no Flow/settings way to clear without unplug.
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEVICE = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');
const DRIVER = path.join(ROOT, 'drivers/presence_sensor_radar/driver.js');
const FLOW = path.join(ROOT, 'drivers/presence_sensor_radar/driver.flow.compose.json');
const SETTINGS = path.join(ROOT, 'drivers/presence_sensor_radar/driver.settings.compose.json');

describe('P2589 radar MCU restore + clear presence', () => {
  it('device restores settings on announce/boot and can clear stuck presence', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('_pushAllRadarSettingsToDevice'), 'push all settings');
    assert.ok(src.includes('_scheduleRadarSettingsRestore'), 'schedule restore');
    assert.ok(src.includes('clearStuckPresence'), 'clear API');
    assert.ok(src.includes('P2589'), 'WHY tag');
    assert.match(src, /onEndDeviceAnnounce[\s\S]*_scheduleRadarSettingsRestore/);
  });

  it('Flow action + settings checkbox wired', () => {
    const flow = JSON.parse(fs.readFileSync(FLOW, 'utf8'));
    const actions = flow.actions || [];
    const clear = actions.find((a) => a.id === 'presence_sensor_radar_clear_presence');
    assert.ok(clear, 'clear action in compose');
    assert.ok((clear.args || []).some((a) => a.type === 'device'), 'device arg');

    const driverSrc = fs.readFileSync(DRIVER, 'utf8');
    assert.ok(driverSrc.includes('presence_sensor_radar_clear_presence'));
    assert.ok(driverSrc.includes('clearStuckPresence'));

    const settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
    assert.ok(settings.some((s) => s.id === 'clear_presence_now'), 'settings checkbox');
  });
});
