'use strict';
/* eslint-env mocha */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const {
  isSlidingWindowPusherCouple,
  slidingWindowPusherDpMappings,
  encodePusherState,
  decodePusherState,
} = require('../lib/covers/slidingWindowPusher');

describe('P3374 sliding window pusher (forum 156967 #101 / Z2M ZC-LP01)', () => {
  it('matches only the exact TS0601 couples', () => {
    assert.strictEqual(isSlidingWindowPusherCouple('_TZ3210_5rta89nj', 'TS0601'), true);
    assert.strictEqual(isSlidingWindowPusherCouple('_tz3210_emqmwtym', 'TS0601'), true);
    assert.strictEqual(isSlidingWindowPusherCouple('_TZ3210_5rta89nj', 'TS110E'), false);
    assert.strictEqual(isSlidingWindowPusherCouple('_TZ3210_other', 'TS0601'), false);
  });

  it('maps DP102/104/4 and not lux/close_time', () => {
    const map = slidingWindowPusherDpMappings(false);
    assert.strictEqual(map[4].capability, 'measure_battery');
    assert.strictEqual(map[102].capability, 'windowcoverings_state');
    assert.strictEqual(map[104].capability, 'windowcoverings_set');
    assert.strictEqual(decodePusherState(0, false), 'up');
    assert.strictEqual(decodePusherState(1, false), 'down');
    assert.strictEqual(encodePusherState('up', false), 0);
    assert.strictEqual(encodePusherState('down', true), 0);
  });

  it('is listed on curtain_motor and not on wall_dimmer_tuya', () => {
    const curtain = JSON.parse(fs.readFileSync(path.join(__dirname, '../drivers/curtain_motor/driver.compose.json'), 'utf8'));
    const dimmer = JSON.parse(fs.readFileSync(path.join(__dirname, '../drivers/wall_dimmer_tuya/driver.compose.json'), 'utf8'));
    const has = (list, s) => (list || []).some((m) => String(m).toLowerCase() === s);
    assert.strictEqual(has(curtain.zigbee.manufacturerName, '_tz3210_5rta89nj'), true);
    assert.strictEqual(has(dimmer.zigbee.manufacturerName, '_tz3210_5rta89nj'), false);
  });
});
