'use strict';

/**
 * P2550 — Peter #2239 diag b8b78521 Smartbutton History/Insights
 * Contre quoi: battery % paints but Insights History stays empty after prior
 * getable:false pairing — need one-shot measure_battery recycle + units %.
 *
 * P2551 — VicHY #2240 image Presencia baño dual History + presence WHEN
 * Contre quoi: alarm_motion + alarm_human both insight → duplicate timeline;
 * declared presence WHEN must stay edge-wired (P2526/P2546).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2550 Peter #2239 Smartbutton battery Insights recycle', () => {
  it('compose measure_battery getable + preventInsights false + units %', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'), 'utf8'));
    const opts = compose.capabilitiesOptions.measure_battery;
    assert.equal(opts.getable, true);
    assert.equal(opts.preventInsights, false);
    assert.equal(opts.units, '%');
  });

  it('ButtonDevice recycles measure_battery once for Insights (P2550)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(src.includes('p2550_batt_insights_recycle'));
    assert.ok(src.includes('P2550 recycled measure_battery'));
    assert.ok(src.includes('removeCapability(\'measure_battery\')'));
    assert.ok(src.includes('addCapability(\'measure_battery\')'));
  });

  it('button_wireless_1 boot still calls _ensureBatteryCapabilityUi', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/device.js'), 'utf8');
    assert.ok(src.includes('_ensureBatteryCapabilityUi'));
    assert.ok(src.includes('P2550'));
  });
});

describe('P2551 VicHY #2240 radar History dedupe + presence flow', () => {
  it('compose silences alarm_motion insights; keeps alarm_human Presence titles', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'), 'utf8'));
    assert.ok(compose.capabilities.includes('alarm_human'));
    assert.ok(compose.capabilities.includes('alarm_motion'));
    assert.equal(compose.capabilitiesOptions.alarm_motion.preventInsights, true);
    assert.equal(
      compose.capabilitiesOptions.alarm_human.insightsTitleTrue.en,
      'Presence detected',
    );
    assert.equal(
      compose.capabilitiesOptions.alarm_human.insightsTitleFalse.en,
      'No presence',
    );
  });

  it('device heals History UX + keeps presence flow edge (P2551)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(src.includes('_healPresenceHistoryUx'));
    assert.ok(src.includes('P2551'));
    assert.ok(src.includes('_triggerPresenceFlows'));
    assert.ok(src.includes('presence_sensor_radar_presence_detected'));
  });

  it('MTG075 clrdrnya still refuses clearPresenceOnZeroDistance (P2534)', () => {
    const cfg = require('../../lib/data/SensorConfigs');
    const mtg = cfg.MTG075_ZB_RL_RELAY || cfg['MTG075_ZB_RL_RELAY'];
    assert.ok(mtg, 'MTG075 config');
    assert.equal(mtg.clearPresenceOnZeroDistance, false);
  });
});
