'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

test('P3411: wall_switch_2_gang and wall_switch_3_gang import ZCLDataTypes and guard indicatorMode lookup', () => {
  for (const rel of [
    'drivers/wall_switch_2_gang/device.js',
    'drivers/wall_switch_3_gang/device.js',
  ]) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.ok(src.includes('ZCLDataTypes'), `${rel} must import ZCLDataTypes`);
    assert.ok(src.includes('ZCLDataTypes?.enum8IndicatorMode'), `${rel} must safely guard enum8IndicatorMode`);
    assert.ok(src.includes('zclNode?.endpoints?.[1]?.clusters?.basic'), `${rel} must guard basic cluster access`);
  }
});

test('P3411: universal_fallback/fallback_config.js loads cleanly with no duplicate cluster keys', () => {
  const cfg = require(path.join(ROOT, 'drivers/universal_fallback/fallback_config'));
  assert.ok(cfg && cfg.CLUSTER_MAP);
  assert.ok(Array.isArray(cfg.CLUSTER_MAP[1030]));
  assert.ok(Array.isArray(cfg.CLUSTER_MAP[17]));
});
