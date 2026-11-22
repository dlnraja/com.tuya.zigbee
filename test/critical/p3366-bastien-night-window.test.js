'use strict';

/**
 * P3366 / t1025u - the Bastien house app may upload to Athom at any hour.
 * The 23:00-06:00 Paris hold is removed. P3036 green-CI / spacing / busy gates
 * still decide go; a hold still leaves the deferred marker for self-heal.
 * Contre quoi: a leftover night step would skip the gate by day and block publish.
 */

const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P3366/t1025u Bastien publish is allowed at any hour', function() {
  it('bastien-publish does not gate the upload on a night window', function() {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/bastien-publish.yml'), 'utf8');
    assert.ok(!/id: night/.test(wf));
    assert.ok(!/bastien-night-window\.js/.test(wf));
    assert.ok(!/steps\.night\.outputs\.inside/.test(wf));
    assert.match(wf, /id: gate\n\s+uses: \.\/\.github\/actions\/athom-publish-gate/);
    assert.match(wf, /go: \$\{\{ steps\.gate\.outputs\.go \|\| 'false' \}\}/);
    assert.match(wf, /if: steps\.gate\.outputs\.go == 'false' && steps\.gate\.outputs\.deferred == 'true'/);
    assert.match(wf, /needs: p3036-gate\n\s+if: needs\.p3036-gate\.outputs\.go == 'true'/);
  });

  it('the clock helper still reports Paris hours (no longer a publish gate)', function() {
    const { parisHour, isNightWindow } = require('../../.github/scripts/bastien-night-window');
    assert.strictEqual(parisHour(new Date('2026-11-21T16:00:00Z')), 17);
    // Historical helper: 23h-06h still computes, but publish must not use it.
    assert.strictEqual(isNightWindow(new Date('2026-11-21T16:00:00Z')), false);
    assert.strictEqual(isNightWindow(new Date('2026-11-21T22:00:00Z')), true);
  });
});
