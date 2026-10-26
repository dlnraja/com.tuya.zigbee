'use strict';
// P3065: flow-card consistency gate (ratchet). Known findings are frozen below; any NEW
// duplicate id, missing en title, bad arg, titleFormatted [[x]] that is not an arg, or literal
// get*Card('id') reference to an undeclared card fails. Shrinking a list is always allowed.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { audit } = require('../../scripts/diag/flow-card-audit');

const r = audit(path.join(__dirname, '..', '..'));

// Known 2026-10-26. undeclaredRefs are all inside try/catch (legacy helpers; card never declared).
const BASELINE = {
  duplicateIds: 9, // driver.compose.json "flow" shadowed by driver.flow.compose.json (3 curtain/gas drivers)
  noEnTitle: 0,
  badArgs: 0,
  titleFormattedUnknown: 16, // trigger titleFormatted referencing tokens (button scene/multi)
  undeclaredRefs: 17,
};

for (const [key, max] of Object.entries(BASELINE)) {
  test(`P3065 flow audit: ${key} <= ${max}`, () => {
    assert.ok(r[key].length <= max, `${key} grew to ${r[key].length}:\n${r[key].join('\n')}`);
  });
}

test('P3065 flow audit sees the whole card set', () => {
  assert.ok(r.counts.triggers > 1000 && r.counts.actions > 500 && r.counts.conditions > 100, JSON.stringify(r.counts));
});
