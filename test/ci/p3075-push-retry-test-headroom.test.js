'use strict';
// P3075: the git-push-retry tests (--tag / --prefer-remote and the base cases) timed out at 60 s
// under full-suite CI load. They need 120 s headroom and a helper kill guard below that timeout.
const { describe, it } = require('../_support/dual-runner'); // P3020
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const FILES = ['p3025b-git-push-retry-tag.test.js', 'p3025-git-push-retry.test.js'];

describe('P3075 git-push-retry tests have CI headroom', () => {
  for (const f of FILES) {
    it(`${f}: suite timeout >= 120 s and helper killed before it`, () => {
      const s = fs.readFileSync(path.join(__dirname, f), 'utf8');
      const t = s.match(/this\.timeout\((\d+)\)/);
      assert.ok(t, 'suite timeout declared');
      const suite = Number(t[1]);
      assert.ok(suite >= 120000, `suite timeout ${suite} < 120000`);
      const g = s.match(/p\.kill\('SIGKILL'\); \}, (\d+)\)/);
      assert.ok(g, 'helper kill guard present');
      assert.ok(Number(g[1]) < suite, 'kill guard fires before the suite timeout');
      assert.match(s, /clearTimeout\(guard\)/);
    });
  }
});
