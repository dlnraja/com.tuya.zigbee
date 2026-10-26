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
  duplicateIds: 0, // P3065 D3: shadowed driver.compose.json "flow" copies removed after merging their hints into the shipped cards
  noEnTitle: 0,
  badArgs: 0,
  titleFormattedUnknown: 0, // P3065 uplift: arg-less triggers no longer carry a token-based titleFormatted
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

test('P3065 flow uplift: no U+FFFD (broken encoding) in driver flow cards', () => {
  const fs = require('fs');
  const root = path.join(__dirname, '..', '..', 'drivers');
  const bad = fs.readdirSync(root).filter((d) => {
    const p = path.join(root, d, 'driver.flow.compose.json');
    return fs.existsSync(p) && fs.readFileSync(p, 'utf8').includes('\uFFFD');
  });
  assert.deepStrictEqual(bad, []);
});

test('P3065 flow uplift D3: curtain calibrate/reset/hold cards keep the hint merged from the removed shadow copy', () => {
  const fs = require('fs');
  const path = require('path');
  const want = {
    air_purifier_curtain: ['air_purifier_curtain_curtain_calibrate', 'air_purifier_curtain_curtain_reset_position', 'air_purifier_curtain_curtain_hold'],
    curtain_motor_tilt: ['curtain_calibrate', 'curtain_reset_position', 'curtain_hold'],
  };
  for (const [d, ids] of Object.entries(want)) {
    const flow = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', d, 'driver.flow.compose.json'), 'utf8'));
    for (const id of ids) {
      const card = (flow.actions || []).find((c) => c.id === id);
      assert.ok(card, `${d}: ${id} missing`);
      for (const l of ['en', 'fr', 'de', 'nl']) assert.ok(card.hint && card.hint[l], `${d}: ${id} hint.${l} missing`);
    }
    const compose = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', d, 'driver.compose.json'), 'utf8'));
    assert.strictEqual(compose.flow, undefined, `${d}: shadowed flow block came back in driver.compose.json`);
  }
});
