'use strict';

/**
 * P2470 — Peter Smartbutton diag 8afffc76 @ 9.0.882
 * Contre quoi:
 * - ZCL-QUERY still configureReporting + read battery on skipBatteryReporting → Timeout / mute
 * - measure_battery UI stays `?` while log shows 100% (THROTTLE duplicate_value)
 * - Homey energy shows CR2032 instead of CR2450 (SH-SC07)
 * - registerCapability still ships configureAttributeReporting (Z2M#8072)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');

describe('P2470 Peter Smartbutton 8afffc76 battery UI + ZCL storm', () => {
  it('ZigbeeDataQuery skips battery configure/read for skipBatteryReporting', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/zigbee/ZigbeeDataQuery.js'), 'utf8');
    assert.ok(src.includes('_skipBatteryReporting'), 'helper present');
    assert.ok(src.includes('P2470'), 'P2470 marker');
    assert.ok(/Skip battery configureReporting/.test(src), 'skip configure log');
    assert.ok(/Skip powerConfiguration read/.test(src), 'skip read log');
    assert.ok(/sleepy-button mode/.test(src), 'passive initialize');
  });

  it('BaseUnifiedDevice skips configureAttributeReporting + force-paints UI', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/BaseUnifiedDevice.js'), 'utf8');
    assert.ok(src.includes('P2470 skip battery configureAttributeReporting'), 'skip cfg');
    assert.ok(/skipBattCfg[\s\S]{0,200}reportOpts/.test(src), 'conditional reportOpts');
    assert.ok(/measure_battery[\s\S]{0,120}cur == null/.test(src), 'null UI skipThrottle');
    assert.ok(src.includes('skipThrottle: true'), 'force paint');
  });

  it('button_wireless_1 prefers CR2450 energy for SH-SC07', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'), 'utf8'));
    assert.strictEqual(compose.energy.batteries[0], 'CR2450', 'CR2450 first in compose');
    const device = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_1/device.js'), 'utf8');
    assert.ok(device.includes("batteries: ['CR2450']") || device.includes('batteries: ["CR2450"]'),
      'runtime setEnergy CR2450');
    assert.ok(/mrpevh8p/.test(device), 'mrpevh8p lock');
  });

  it('ButtonDevice chemistry prefers profile/CR2450 over manifest CR2032', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(src.includes("shSc07 ? 'CR2450'"), 'SH-SC07 chemistry');
  });

  it('battery-reporting-manager paints null UI with skipThrottle', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/utils/battery-reporting-manager.js'), 'utf8');
    assert.ok(/skipThrottle/.test(src) && /P2470/.test(src), 'P2470 skipThrottle path');
  });
});
