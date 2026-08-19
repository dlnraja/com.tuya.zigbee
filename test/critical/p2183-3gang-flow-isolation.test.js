'use strict';

/**
 * P2183 — switch_3gang vs wall_switch_3gang_1way must not collide at pair or flow level.
 * WHY: packet_ninja 1-way sub-device tiles vs EF00/multi-cap catch-all share TS0003 pid.
 * WHO: BOTH pairing + flow UX. WHEN: CI. AGAINST: wrong driver + duplicate flow cards.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function composeMfrs(driver) {
  return (readJson(`drivers/${driver}/driver.compose.json`).zigbee?.manufacturerName || [])
    .map((x) => String(x).toUpperCase());
}

function flowActionIds(driver) {
  const flow = readJson(`drivers/${driver}/driver.flow.compose.json`);
  return (flow.actions || []).map((a) => a.id);
}

describe('P2183 3-gang driver isolation', () => {
  it('keeps compose manufacturerName sets disjoint between catch-all and 1-way wall', () => {
    const a = new Set(composeMfrs('switch_3gang'));
    const b = new Set(composeMfrs('wall_switch_3gang_1way'));
    const overlap = [...a].filter((m) => b.has(m));
    assert.strictEqual(overlap.length, 0, `compose overlap: ${overlap.join(', ')}`);
  });

  it('namespaces power-on behavior flow cards per driver', () => {
    const switchActions = flowActionIds('switch_3gang');
    const wallActions = flowActionIds('wall_switch_3gang_1way');
    assert.ok(switchActions.includes('switch_3gang_set_power_on_behavior'));
    assert.ok(wallActions.includes('wall_switch_3gang_1way_set_power_on_behavior'));
    assert.ok(!switchActions.includes('set_power_on_behavior'));
    assert.ok(!wallActions.includes('set_power_on_behavior'));
  });

  it('registers namespaced power-on handler in switch_3gang driver.js', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/switch_3gang/driver.js'), 'utf8');
    assert.match(src, /\$\{P\}_set_power_on_behavior/);
    assert.match(src, /triggerCapabilityListener\('power_on_behavior'/);
    assert.doesNotMatch(src, /getActionCard\('set_power_on_behavior'\)/);
  });

  it('declares capName in ZCL-only attr listener loop scope (switch_3gang device.js)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/switch_3gang/device.js'), 'utf8');
    const loopStart = src.indexOf('// Setup attribute listeners for physical button detection');
    assert.ok(loopStart >= 0);
    const block = src.slice(loopStart, loopStart + 1200);
    assert.match(block, /const capName = epNum === 1 \? 'onoff'/);
    assert.match(block, /safeSetCapabilityValue\(capName/);
    const listenerIdx = block.indexOf("onOff.on('attr.onOff'");
    const capIdx = block.indexOf('const capName');
    assert.ok(capIdx >= 0 && listenerIdx >= 0 && capIdx < listenerIdx);
  });

  it('uses sub-device gang filter on wall_switch_3gang_1way (packet_ninja 1-way)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/wall_switch_3gang_1way/device.js'), 'utf8');
    assert.match(src, /secondSwitch/);
    assert.match(src, /thirdSwitch/);
    assert.match(src, /_hasPairedSubDevices/);
    assert.match(src, /triggerButtonPress/);
  });
});
