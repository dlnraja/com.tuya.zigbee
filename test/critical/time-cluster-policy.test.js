'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { shouldProactiveTimeSync, isSleepyNoClock } = require('../../lib/zigbee/TimeClusterPolicy');

const ROOT = path.join(__dirname, '..', '..');

describe('TimeClusterPolicy 0x000A', () => {
  it('does not poll time on battery scene remotes', () => {
    const remote = {
      driver: { id: 'button_wireless_3', manifest: { class: 'button', id: 'button_wireless_3' } },
      getSettings: () => ({ zb_model_id: 'TS0043', zb_manufacturer_name: '_TZ3000_a7ouggvs' }),
      getData: () => ({}),
      getStore: () => ({}),
    };
    assert.equal(isSleepyNoClock(remote), true);
    assert.equal(shouldProactiveTimeSync(remote), false);
  });

  it('still syncs LCD / thermostat clocks', () => {
    const lcd = {
      driver: { id: 'climate_sensor_zt08', manifest: { class: 'sensor', id: 'climate_sensor_zt08' } },
      getSettings: () => ({ zb_model_id: 'TS0601' }),
      getData: () => ({}),
      getStore: () => ({}),
    };
    assert.equal(shouldProactiveTimeSync(lcd), true);
  });

  it('answers when the MCU already asked', () => {
    const remote = {
      _deviceRequestedTime: true,
      driver: { id: 'button_wireless_3', manifest: { class: 'button' } },
      getSettings: () => ({ zb_model_id: 'TS0043' }),
      getData: () => ({}),
      getStore: () => ({}),
    };
    assert.equal(shouldProactiveTimeSync(remote), true);
  });
});

describe('TS0043 3-button routing', () => {
  it('keeps Zemismart 3-btn mfrs on button_wireless_3 not 2', () => {
    const three = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'), 'utf8'));
    const two = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_2/driver.compose.json'), 'utf8'));
    const mfrs = ['_TZ3000_a7ouggvs', '_TZ3000_qzjcsmar'];
    for (const m of mfrs) {
      assert.ok(three.zigbee.manufacturerName.some((x) => x.toLowerCase() === m.toLowerCase()), m);
      assert.ok(!two.zigbee.manufacturerName.some((x) => x.toLowerCase() === m.toLowerCase()), `2-btn must not claim ${m}`);
    }
    assert.ok(three.capabilities.includes('button.3'));
  });
});
