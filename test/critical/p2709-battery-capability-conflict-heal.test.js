'use strict';

/**
 * P2709 — Homey guidelines BATTERY_CAPABILITY_CONFLICT Contre quoi
 * Keep measure_battery (UI %); never pair with alarm_battery on same driver.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2709 battery capability conflict heal', () => {
  for (const id of ['button_wireless_2', 'button_wireless_3', 'climate_sensor']) {
    it(`${id} has measure_battery without alarm_battery`, () => {
      const j = JSON.parse(
        fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'),
      );
      assert.ok((j.capabilities || []).includes('measure_battery'));
      assert.ok(!(j.capabilities || []).includes('alarm_battery'));
    });
  }
});
