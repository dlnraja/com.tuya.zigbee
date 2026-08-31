'use strict';
/**
 * P2333 — Homey diag inbox (Aug 26–30): dimmer DP2≠humidity, FCU DP36≠setpoint
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

describe('P2333 diag-driven dimmer + FCU dyn-cap', () => {
  it('TuyaEF00Manager skips humidity invent for dimmer DP2', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js'), 'utf8');
    assert.match(src, /isDimmerDriver/);
    assert.match(src, /P2333[\s\S]{0,200}DP2/);
    assert.match(src, /internal \|\| ownedMap\.skip/);
  });

  it('wall_dimmer_tuya declares dpMappings + strips phantom humidity', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/wall_dimmer_tuya/device.js'), 'utf8');
    assert.match(src, /get dpMappings\(/);
    assert.match(src, /measure_humidity/);
    assert.match(src, /_dynCapBlockDps/);
  });

  it('DynCap hard-reserves wall_thermostat DP36 and dimmer DP1/2', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/dynamic/DynamicCapabilityManager.js'), 'utf8');
    assert.match(src, /wall_thermostat[\s\S]{0,80}id === 36/);
    assert.match(src, /purgeDriverOwnedDiscoveries/);
    assert.match(src, /wall_dimmer[\s\S]{0,120}id === 1/);
  });

  it('wall_thermostat always reserves valve DP36 before FCU arm', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/wall_thermostat/device.js'), 'utf8');
    assert.match(src, /FCU_DATA_POINTS\.valve[\s\S]{0,40}internal:\s*true/);
    assert.match(src, /purgeDriverOwnedDiscoveries/);
  });
});
