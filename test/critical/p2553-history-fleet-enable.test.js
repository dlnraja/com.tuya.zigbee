'use strict';

/**
 * P2553 — Intelligent History fleet enable
 * Contre quoi: sensor readables without getable/insights hide Homey History;
 * mmWave distance + twin alarm_motion must stay silenced.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  shouldSilenceInsights,
  complementaryHistoryOptions,
  healSensorCapabilityGetable,
} = require('../../lib/utils/HomeyCapabilityUx');

const ROOT = path.join(__dirname, '..', '..');

describe('P2553 intelligent History fleet', () => {
  it('silences distance flood and twin alarm_motion when alarm_human present', () => {
    assert.equal(shouldSilenceInsights('measure_luminance.distance', []), true);
    assert.equal(shouldSilenceInsights('measure_luminance.distance.zone1', ['alarm_motion']), true);
    assert.equal(
      shouldSilenceInsights('alarm_motion', ['alarm_motion', 'alarm_human']),
      true,
    );
    assert.equal(shouldSilenceInsights('alarm_motion', ['alarm_motion']), false);
    assert.equal(shouldSilenceInsights('measure_battery', []), false);
    assert.equal(shouldSilenceInsights('alarm_human', ['alarm_human', 'alarm_motion']), false);
  });

  it('complementaryHistoryOptions enables battery Insights', () => {
    const o = complementaryHistoryOptions('measure_battery', { title: { en: 'Battery' } }, []);
    assert.equal(o.getable, true);
    assert.equal(o.preventInsights, false);
    assert.equal(o.title.en, 'Battery');
  });

  it('button_wireless_1 + climate_sensor compose lock History ON', () => {
    const bw = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'), 'utf8'));
    assert.equal(bw.capabilitiesOptions.measure_battery.getable, true);
    assert.equal(bw.capabilitiesOptions.measure_battery.preventInsights, false);

    const climate = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/climate_sensor/driver.compose.json'), 'utf8'));
    assert.equal(climate.capabilitiesOptions.measure_temperature.getable, true);
    assert.equal(climate.capabilitiesOptions.measure_temperature.preventInsights, false);
    assert.equal(climate.capabilitiesOptions.measure_humidity.preventInsights, false);
  });

  it('presence_sensor_radar keeps alarm_motion Insights silenced (P2551)', () => {
    const radar = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'), 'utf8'));
    assert.equal(radar.capabilitiesOptions.alarm_motion.preventInsights, true);
    assert.equal(radar.capabilitiesOptions.alarm_human.preventInsights, false);
  });

  it('runtime heal enables battery + silences twin motion', async () => {
    const calls = [];
    const device = {
      _homeyCapabilityUxHealed: false,
      getCapabilities: () => ['measure_battery', 'alarm_motion', 'alarm_human', 'measure_luminance.distance'],
      getCapabilityOptions: () => ({}),
      setCapabilityOptions: async (cap, opts) => { calls.push({ cap, opts }); },
      log: () => {},
    };
    const r = await healSensorCapabilityGetable(device);
    assert.ok(r.healed.includes('measure_battery'));
    assert.ok(r.healed.includes('alarm_human'));
    assert.ok(r.silenced.includes('alarm_motion'));
    assert.ok(r.silenced.includes('measure_luminance.distance'));
    const batt = calls.find((c) => c.cap === 'measure_battery');
    assert.equal(batt.opts.preventInsights, false);
    const motion = calls.find((c) => c.cap === 'alarm_motion');
    assert.equal(motion.opts.preventInsights, true);
  });

  it('fleet enable tool + APPLY report exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/p2553-history-fleet-enable.js')));
    const apply = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'reports/history-fleet-p2553/APPLY.json'), 'utf8'));
    assert.ok(apply.driversTouched >= 200);
    assert.ok(apply.capsSet >= 500);
  });
});
