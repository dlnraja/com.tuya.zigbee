'use strict';
// P2850 — promote scripts must target the uploaded draft version (HOMEY_EXPECTED_VERSION), not the pre-bump app.json.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', '..', '.github', 'scripts');
for (const f of ['promote-via-session.js', 'auto-promote-oauth.js']) {
  test(`P2850 ${f} prefers HOMEY_EXPECTED_VERSION over app.json`, () => {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const i = src.indexOf('HOMEY_EXPECTED_VERSION');
    assert.ok(i > 0, 'env override present');
    assert.ok(i < src.indexOf('selectPromotionTarget(', i > 0 ? 0 : 0) || src.includes('APP_VERSION'), 'used before selection');
    assert.match(src, /process\.env\.HOMEY_EXPECTED_VERSION[\s\S]{0,200}appJson\.version|APP_VERSION \|\| ''/);
  });
}
test('P2850 selectPromotionTarget picks the expected draft, not an older one', () => {
  const { selectPromotionTarget } = require(path.join(dir, 'homey-build-selection.js'));
  const r = selectPromotionTarget([
    { id: 337, version: '5.12.443', state: 'draft' },
    { id: 338, version: '5.12.444', state: 'draft' },
  ], '5.12.444');
  assert.strictEqual(r.build.id, 338);
});
