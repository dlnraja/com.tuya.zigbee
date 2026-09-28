'use strict';

/**
 * P2757 — Bastien pile drain: no proactive PowerCfg / poll on coin cells
 *
 * Contre quoi:
 * - resolvePollIntervalMs still returned an interval for CR2032 climate/contact
 * - PowerClusterPolicy allowed proactive TX on sleepy sensors (not only remotes)
 * - button_wireless_3 EP1 lost E000 (57344) → Auto-Publish P2608 fail
 * Dual-app: BOTH
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  resolvePollIntervalMs,
  chemistryClass,
} = require('../../lib/battery/SmartBatteryAdaptivePrecision');
const {
  shouldProactivePowerCfgRead,
  shouldSkipSleepyRemoteBatteryTx,
} = require('../../lib/zigbee/PowerClusterPolicy');

describe('P2757 coin battery no proactive poll', () => {
  it('resolvePollIntervalMs is null for all coin chemistries (not only button)', () => {
    assert.strictEqual(chemistryClass('CR2032'), 'coin');
    assert.strictEqual(resolvePollIntervalMs({
      chemistry: 'CR2032', deviceClass: 'sensor_climate', baseIntervalSec: 7200,
    }), null);
    assert.strictEqual(resolvePollIntervalMs({
      chemistry: 'CR2450', deviceClass: 'sensor_contact', baseIntervalSec: 14400,
    }), null);
    assert.strictEqual(resolvePollIntervalMs({
      chemistry: 'CR2032', deviceClass: 'button', baseIntervalSec: 43200,
    }), null);
  });

  it('alkaline sensors still get a gentler poll interval', () => {
    const mid = resolvePollIntervalMs({
      chemistry: '2xAA', percent: 50, baseIntervalSec: 14400, deviceClass: 'sensor_climate',
    });
    assert.ok(mid >= 45 * 60 * 1000);
  });

  it('PowerClusterPolicy skips sleepy sensors and coin energy list', () => {
    assert.strictEqual(shouldProactivePowerCfgRead({
      driver: { id: 'contact_sensor', manifest: { class: 'sensor' } },
      getSetting: () => null,
      getData: () => ({ modelId: 'TS0203' }),
    }), false);
    assert.strictEqual(shouldSkipSleepyRemoteBatteryTx(null, {
      device: {
        getEnergy: () => ({ batteries: ['CR2032'] }),
        driver: { id: 'climate_sensor' },
      },
    }), true);
  });

  it('button_wireless_3 EP1 keeps interview [0,1,6,57344]', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'), 'utf8'));
    const ep1 = compose.zigbee.endpoints['1'].clusters.map(Number).sort((a, b) => a - b);
    assert.deepEqual(ep1, [0, 1, 6, 57344]);
    assert.ok(!ep1.includes(61184) && !ep1.includes(1280));
  });

  it('deprecated BatteryManagerV3 / BatterySystem gate PowerCfg TX', () => {
    const v3 = fs.readFileSync(path.join(ROOT, 'lib/battery/BatteryManagerV3.js'), 'utf8');
    assert.match(v3, /P2757 skip ZCL configure\/read/);
    assert.match(v3, /P2757 refuse startPolling/);
    const sys = fs.readFileSync(path.join(ROOT, 'lib/battery/BatterySystem.js'), 'utf8');
    assert.match(sys, /P2757 skip configureReporting/);
    assert.match(sys, /P2757 sleepy\/coin — listen-only/);
  });
});
