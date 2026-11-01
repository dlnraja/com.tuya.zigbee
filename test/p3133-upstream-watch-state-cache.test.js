'use strict';
// P3133: .github/state/** is gitignored by security policy, so upstream-watch must persist its
// ETag state through actions/cache, never through `git add` (which exits 1 on an ignored path).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const WF = path.join(__dirname, '..', '.github', 'workflows', 'upstream-watch.yml');

describe('P3133 upstream-watch state persists via actions/cache', () => {
  const src = fs.readFileSync(WF, 'utf8');
  it('does not git-add the gitignored state file', () => {
    assert.ok(!/git add[^\n]*\.github\/state/.test(src));
  });
  it('restores and saves the state with pinned actions/cache', () => {
    assert.ok(/actions\/cache\/restore@[0-9a-f]{40}/.test(src));
    assert.ok(/actions\/cache\/save@[0-9a-f]{40}/.test(src));
    assert.ok(src.indexOf('cache/restore@') < src.indexOf('run: node scripts/ci/upstream-watch.js'));
  });
  it('needs only read access to contents now', () => {
    assert.ok(/permissions:\n  contents: read/.test(src));
  });
});
