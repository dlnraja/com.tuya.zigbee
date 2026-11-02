'use strict';
// P3241: scripts/digest/lib.js must not describe digest jobs/scripts removed in P3232
// (self-check.js writer, Labs job, old 08:16/08:49/11:41 slots).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('P3241 digest lib has no stale references', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../scripts/digest/lib.js'), 'utf8');
  it('does not claim a self-check.js owner that no longer exists', () => {
    if (!fs.existsSync(path.join(__dirname, '../../scripts/digest/self-check.js'))) {
      assert.ok(!/owned by scripts\/digest\/self-check\.js/.test(src));
    }
  });
  it('does not list removed Labs job or old slots', () => {
    assert.ok(!/Labs 08:49/.test(src));
    assert.ok(!/08:16|11:41/.test(src));
  });
  it('still renders a legacy selfcheck block (additive)', () => {
    const { renderBody } = require('../../scripts/digest/lib.js');
    const body = renderBody({ selfcheck: { markdown: 'x', fp: 'f' } });
    assert.ok(body.includes('<!-- self-check:BEGIN -->'));
  });
});
