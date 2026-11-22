'use strict';
const assert = require('assert');
const src = require('fs').readFileSync(require('path').join(__dirname, '../drivers/smart_knob_rotary/device.js'), 'utf8');
describe('P3143 smart_knob_rotary press dedup', () => {
  // 26439#5537 moved the body onto the shared PressActionDedup (window 400 ms); evaluate it with that helper.
  const m = src.match(/_isDuplicateKnobPress\(action, windowMs = (\d+)\) \{([\s\S]*?)\n  \}/);
  const { shouldDrop } = require('../lib/utils/PressActionDedup');
  it('collapses toggle+single from parallel paths, keeps double distinct', () => {
    const ctx = {};
    assert.ok(Number(m[1]) >= 300, 'dedup window must stay >= 300 ms');
    const body = m[2].replace(/\bthis\b/g, 'ctx');
    const f = (a) => new Function('ctx', 'action', 'windowMs', 'shouldDrop', body)(ctx, a, Number(m[1]), shouldDrop);
    assert.strictEqual(f('toggle'), false);
    assert.strictEqual(f('single'), true);
    assert.strictEqual(f('double'), false);
  });
  it('is wired before triggers', () => {
    assert.ok(/_isDuplicateKnobPress\(action\)\) \{return;\}/.test(src));
  });
});
