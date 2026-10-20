'use strict';
// P2915 — Bastien publish writes the bumped version back once, [skip ci], after Test is confirmed.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const y = fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', 'bastien-publish.yml'), 'utf8');

test('bastien-publish writes the version back, [skip ci], no loop', () => {
  const i = y.indexOf('Version write-back');
  assert.ok(i > y.indexOf('Athom final state gate'), 'write-back runs after the final Test gate');
  const step = y.slice(i);
  assert.match(step, /\[skip ci\]/);
  assert.match(step, /git add app\.json \.homeycompose\/app\.json package\.json package-lock\.json/);
  assert.match(step, /for i in 1 2 3/);
  assert.doesNotMatch(step, /gh workflow run/);
  assert.doesNotMatch(step, /bump-homey-version/);
  assert.match(y, /contents: write/);
});
