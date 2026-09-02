'use strict';

/**
 * P2379 — VicHY: DynCap must not invent curtain/dim on presence radars
 * (DP2/3/102 = sensitivity/range/delay → windowcoverings_set + stuck presence).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

describe('P2379 presence radar no curtain DynCap', () => {
  it('lib/dynamic DynCap disables presence_sensor_radar and blocks windowcoverings', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/dynamic/DynamicCapabilityManager.js'), 'utf8');
    assert.ok(src.includes('P2379'));
    assert.ok(/presence_sensor_radar/.test(src));
    assert.ok(/windowcoverings_set/.test(src));
    assert.ok(/_isDynCapDisabledForDevice[\s\S]*presence_sensor_radar/i.test(src));
  });

  it('lib/managers DynCap blocks curtain caps on sensors', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/managers/DynamicCapabilityManager.js'), 'utf8');
    assert.ok(src.includes('P2379'));
    assert.ok(src.includes('windowcoverings_set'));
  });

  it('presence_sensor_radar heals phantom curtain caps', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(src.includes('_healRadarPhantomCaps'));
    assert.ok(src.includes('_armRadarDynCapGuards'));
    assert.ok(src.includes('windowcoverings_set'));
  });

  it('clrdrnya stays on presence_sensor_radar compose (class sensor)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'), 'utf8'));
    assert.equal(compose.class, 'sensor');
    const m = compose.zigbee?.manufacturerName || [];
    assert.ok(m.some((x) => /clrdrnya/i.test(x)));
    assert.ok((compose.capabilities || []).includes('onoff'));
    assert.ok(!(compose.capabilities || []).includes('windowcoverings_set'));
  });
});
