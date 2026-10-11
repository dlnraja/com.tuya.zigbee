'use strict';
// WHY(2026-10-11): P2794/P2797 GangCountAdapter ported from master (soaked since 2026-10-02) and used to
// place _TZ3210_a2erlvb8 (Z2M qa.ts: TS000F = QARZ1DC 1-ch, TS0002 = QARZ2LR 2-ch) on both switch drivers.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { gangsFromDps } = require('../../lib/devices/GangCountAdapter');
const patterns = require('../../lib/data/gang-patterns.json');
const compose = (d) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', d, 'driver.compose.json'), 'utf8')).zigbee;

test('gangsFromDps counts contiguous boolean DPs', () => {
  assert.equal(gangsFromDps(new Set([1])), 1);
  assert.equal(gangsFromDps(new Set([1, 2])), 2);
  assert.equal(gangsFromDps(new Set([2])), 0);
});

test('UnifiedSwitchBase wires the adapter (init, DP observe, destroy)', () => {
  const s = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedSwitchBase.js'), 'utf8');
  assert.match(s, /new GangCountAdapter\(this\)/);
  assert.match(s, /_gangAdapter\.observeDp\(dpId, value\)/);
  assert.match(s, /_gangAdapter\?\.destroy\(\)/);
});

test('a2erlvb8: 1-ch TS000F on switch_1gang, 2-ch TS0002 on switch_2gang, gang counts known', () => {
  const one = compose('switch_1gang');
  const two = compose('switch_2gang');
  assert.ok(one.manufacturerName.includes('_TZ3210_a2erlvb8') && one.productId.includes('TS000F'));
  assert.ok(two.manufacturerName.includes('_TZ3210_a2erlvb8') && two.productId.includes('TS0002'));
  assert.equal(patterns.couples['_tz3210_a2erlvb8|TS000F'], 1);
  assert.equal(patterns.couples['_tz3210_a2erlvb8|TS0002'], 2);
});
