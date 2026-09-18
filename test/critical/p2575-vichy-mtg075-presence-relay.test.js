'use strict';

/**
 * P2575 — VicHY #2246/#2247: presence dead / curtain flip / relay onoff gone / sticky true
 *
 * Contre quoi:
 * - MTG075 DP1 marked unreliable (ignored with floodCalm DP9)
 * - removeCapability strips onoff on hasRelay radars
 * - staleCaps always lists onoff → bathroom switch tile disappears
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2575 VicHY MTG075 presence + relay lock', () => {
  it('MTG075 clrdrnya DP1 is trusted (not unreliable)', () => {
    const { getSensorConfig } = require(path.join(ROOT, 'drivers/presence_sensor_radar/configs.js'));
    const cfg = getSensorConfig('_TZE204_clrdrnya', 'TS0601');
    assert.ok(cfg);
    assert.strictEqual(cfg.hasRelay, true);
    assert.strictEqual(cfg.floodCalm, true);
    assert.strictEqual(cfg.dpMap[1].unreliable, false);
    assert.ok(cfg.softClearZeroDistanceMs >= 60000);
    assert.ok(cfg.softClearStableDistanceMs >= 60000);
  });

  it('device.js locks relay onoff + soft-clear sticky presence', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/device.js'),
      'utf8',
    );
    assert.ok(src.includes('P2575 refused removeCapability(onoff)'));
    assert.ok(src.includes('_softClearStuckPresenceOnZeroDistance'));
    assert.ok(src.includes('_ensureRelayOnoffCapability'));
    assert.ok(src.includes('requiredCaps.add(\'onoff\')') || src.includes('requiredCaps.add("onoff")'));
    assert.ok(src.includes('forcePureTuyaDp'));
    assert.ok(src.includes('stagnant distance'));
  });

  it('compose stays EF00 lean without OnOff cluster / battery', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'),
      'utf8',
    ));
    const clusters = compose.zigbee?.endpoints?.['1']?.clusters || [];
    assert.ok(!clusters.includes(6));
    assert.ok(clusters.includes(61184));
    assert.ok(!compose.capabilities.includes('measure_battery'));
  });
});
