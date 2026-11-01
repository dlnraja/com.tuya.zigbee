'use strict';
const assert = require('assert');
const src = require('fs').readFileSync(require('path').join(__dirname, '../drivers/smart_knob_rotary/device.js'), 'utf8');
describe('P3143 smart_knob_rotary press dedup', () => {
  const m = src.match(/_isDuplicateKnobPress\(action, windowMs = 300\) \{([\s\S]*?)\n  \}/);
  it('collapses toggle+single from parallel paths, keeps double distinct', () => {
    const ctx = {};
    const body = m[1].replace(/\bthis\b/g, 'ctx');
    const f = (a) => new Function('ctx', 'action', 'windowMs', body)(ctx, a, 300);
    assert.strictEqual(f('toggle'), false);
    assert.strictEqual(f('single'), true);
    assert.strictEqual(f('double'), false);
  });
  it('is wired before triggers', () => {
    assert.ok(/_isDuplicateKnobPress\(action\)\) \{return;\}/.test(src));
  });
});
