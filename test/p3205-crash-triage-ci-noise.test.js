'use strict';
// P3205 (GH#596/#597): CI gate state and GitHub-mail workflow errors must not become crash issues.
const { describe, it } = global.describe ? global : require('node:test');
const assert = require('assert');
const t = require('../scripts/autonomy/crash-triage');

describe('P3205 crash triage ignores CI noise', () => {
  it('gate skip reason input_missing (sacred-couple-dry-gate shape) is not a crash', () => {
    const r = t.records({ results: [{ id: 'blakadder-new', status: 'skip', reason: 'input_missing', input: 'x.json' }] });
    assert.strictEqual(r.length, 0);
  });
  it('git push reject from history.topErrors / github mail is not a crash', () => {
    const r = t.records({ history: { topErrors: [{ error: "failed to push some refs to 'https://github.com/dlnraja/com.tuya.zigbee'", count: 1 }] },
      diagnostics: [{ type: 'github', from: 'github', crashInfo: { error: 'TypeError: x is not a function' } }] });
    assert.strictEqual(r.length, 1, 'a real crash quoted in a GitHub mail is kept');
    assert.ok(/not a function/.test(r[0].msg));
  });
  it('real app crashes still count', () => {
    const r = t.records({ diagnostics: [{ type: 'diag', crashInfo: { error: 'TypeError: Cannot read properties of undefined', homeyId: 'u1' } }],
      results: [{ status: 'fail', reason: 'boom', error: 'RangeError: Invalid string length' }] });
    assert.strictEqual(r.length, 2);
  });
});
