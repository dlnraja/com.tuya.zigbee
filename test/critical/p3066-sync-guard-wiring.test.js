'use strict';
// P3066: the P52 workflow runs the driver-mapping guard (from master) before the couple guard, and the
// stable bump keeps the NEXT patch changelog entry pre-written (5.12.509 missing after the 5.12.508 bump).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const wf = fs.readFileSync(path.join(__dirname, '..', '..', '.github/workflows/safe-sync-stable.yml'), 'utf8');

describe('P3066 P52 sync wiring', () => {
  it('guard runs (fix then check) from master, before the couple guard and the bump', () => {
    const g = wf.indexOf('git show origin/master:tools/ci/sync-driver-mapping-guard.js');
    assert.ok(g > 0);
    assert.match(wf, /sync-driver-mapping-guard\.js --check --base HEAD/);
    assert.ok(g < wf.indexOf('Couple guard (pins') && g < wf.indexOf('name: Bump stable version'));
  });
  it('bump pre-writes the next patch entry (en + fr) when missing', () => {
    assert.match(wf, /NXT\[2\]\+=1/);
    assert.match(wf, /if \(!cl\[nk\] \|\| !String\(cl\[nk\]\.en\|\|''\)\.trim\(\)\) cl\[nk\]=\{en:/);
  });
});
