'use strict';
// WHY(P3062): rescued agg-wt fix — wait-athom-draft-ready re-mints the delegation token when
// getBuilds fails with an expired/invalid token (run 37184850703) instead of polling blind.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', '..', '.github', 'scripts', 'wait-athom-draft-ready.js');
const mod = require(FILE);

describe('P3062 wait-athom-draft-ready token refresh', () => {
  it('recognises expired / unauthorised token errors', () => {
    for (const m of ['The provided token is invalid.', 'invalid_token', 'Unauthorized', 'HTTP 401', 'unauthorised']) {
      assert.strictEqual(mod.isTokenInvalidError(new Error(m)), true, m);
    }
  });
  it('does not treat other failures as token errors', () => {
    for (const m of ['ETIMEDOUT', 'HTTP 500', 'AggregateError', 'socket hang up', '4010 builds']) {
      assert.strictEqual(mod.isTokenInvalidError(new Error(m)), false, m);
    }
    assert.strictEqual(mod.isTokenInvalidError(null), false);
  });
  it('the poll loop re-mints the client on a token error (client is reassignable)', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    assert.match(src, /let client;/);
    assert.match(src, /if \(isTokenInvalidError\(e\)\) \{[\s\S]{0,200}client = await createClient\(/);
  });
});
