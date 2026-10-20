'use strict';
// P2917 — publish workflows write the highest CONFIRMED Test version back: [skip ci], after the final
// Athom gate, clean tree (never a built app.json), rebase + 3 bounded tries, no dispatch (no loop).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const sh = fs.readFileSync(path.join(ROOT, '.github', 'scripts', 'version-writeback.sh'), 'utf8');
const WF = ['auto-publish-on-push.yml', 'publish-stable.yml', 'bastien-publish.yml']
  .map((f) => path.join(ROOT, '.github', 'workflows', f)).filter((f) => fs.existsSync(f));

test('write-back script: confirmed Test only, clean tree, [skip ci], 3 tries, no loop, no --no-verify', () => {
  assert.match(sh, /state\)\.toLowerCase\(\)==="test"/);
  assert.match(sh, /git reset -q --hard "origin\/\$BR"/);
  assert.match(sh, /\[skip ci\]/);
  assert.match(sh, /for i in 1 2 3/);
  assert.match(sh, /nothing to write back/);
  assert.doesNotMatch(sh, /gh workflow run|--no-verify|push -f|--force/);
});

test('the publish workflow calls it after the Athom final state gate', () => {
  const hits = WF.filter((f) => /version-writeback\.sh/.test(fs.readFileSync(f, 'utf8')));
  assert.ok(hits.length >= 1, 'no publish workflow wires version-writeback.sh');
  for (const f of hits) {
    const y = fs.readFileSync(f, 'utf8');
    assert.ok(y.indexOf('version-writeback.sh') > y.indexOf('Athom final state gate'), `${path.basename(f)}: write-back before the gate`);
  }
});
