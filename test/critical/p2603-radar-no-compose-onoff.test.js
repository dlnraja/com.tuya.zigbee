'use strict';

/**
 * P2603 — Integral GH#547/#550: no compose onoff (ceiling Channel 1) + quickAction presence
 *
 * Contre quoi:
 * - Shared compose onoff → Missing Listener / phantom Channel on gkfbdvyx
 * - quickAction onoff kept big power button after tip
 * - MTG relay still gets onoff via _applyRadarCapabilityProfile addCapability
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const COMPOSE = path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json');
const DEVICE = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');

describe('P2603 radar no compose onoff + presence quickAction', () => {
  it('compose capabilities omit onoff; quickAction is alarm_human', () => {
    const j = JSON.parse(fs.readFileSync(COMPOSE, 'utf8'));
    assert.ok(!(j.capabilities || []).includes('onoff'));
    const raw = fs.readFileSync(COMPOSE, 'utf8');
    assert.ok(raw.includes('"quickAction": "alarm_human"'));
    assert.ok(!raw.includes('"quickAction": "onoff"'));
    assert.ok(j.capabilitiesOptions?.onoff, 'onoff options kept for MTG addCapability');
  });

  it('device still adds onoff for hasRelay / MTG family', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes("requiredCaps.add('onoff')"));
    assert.ok(src.includes('MTG_RELAY'));
  });
});
