'use strict';
// P3258: tooling-only bot commits must not make the tip "code-changed" for the publish gate.
const assert = require('assert');
const P = require('../.github/scripts/athom-publish-policy.js');

describe('P3258 publish gate counts only build inputs for tip adoption', () => {
  it('ignores tooling paths that never ship', () => {
    for (const f of ['scripts/kb/build-homey-kb.js', 'test/a.test.js', '.github/scripts/x.js', 'tools/ci/y.js', 'docs/a.js', 'reports/r.js']) assert.ok(!P.isBuildInputFile(f), f);
  });
  it('still counts shipped code', () => {
    for (const f of ['lib/x.js', 'drivers/a/device.js', 'app.js', 'package.json']) assert.ok(P.isBuildInputFile(f), f);
  });
  it('isCodeFile is unchanged (CI ancestry stays strict)', () => {
    assert.ok(P.isCodeFile('scripts/kb/build-homey-kb.js'));
  });
});
