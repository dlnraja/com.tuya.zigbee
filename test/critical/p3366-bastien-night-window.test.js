'use strict';

/**
 * P3366 - the Bastien house app uploads to Athom only at night (23:00-06:00 Europe/Paris).
 * Contre quoi:
 * - build #256 was created at 22:48 Paris (2026-11-21) by a daytime dispatch: nothing enforced the rule;
 * - DST: 21:00Z is 22h in winter (outside) but 23h in summer (inside);
 * - the publish job only runs when the night step said inside AND the P3036 gate said go;
 * - a held run leaves the deferred marker so publish-self-heal can retry at night.
 */

const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const fs = require('fs');
const path = require('path');
const { parisHour, isNightWindow } = require('../../.github/scripts/bastien-night-window');

const ROOT = path.join(__dirname, '..', '..');

describe('P3366 Bastien night publish window', function() {
  it('23:00-05:59 Paris is inside, 06:00-22:59 is outside (winter, UTC+1)', function() {
    assert.strictEqual(isNightWindow(new Date('2026-11-21T21:48:00Z')), false); // 22:48, build #256
    assert.strictEqual(isNightWindow(new Date('2026-11-21T22:00:00Z')), true); // 23:00
    assert.strictEqual(isNightWindow(new Date('2026-11-22T04:59:00Z')), true); // 05:59
    assert.strictEqual(isNightWindow(new Date('2026-11-22T05:00:00Z')), false); // 06:00
    assert.strictEqual(isNightWindow(new Date('2026-11-22T11:00:00Z')), false); // noon
  });

  it('follows summer time (UTC+2)', function() {
    assert.strictEqual(parisHour(new Date('2026-07-01T21:00:00Z')), 23);
    assert.strictEqual(isNightWindow(new Date('2026-07-01T21:00:00Z')), true);
    assert.strictEqual(isNightWindow(new Date('2026-07-01T04:00:00Z')), false); // 06:00 CEST
  });

  it('bastien-publish gates the upload on the night step and leaves a deferred marker', function() {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/bastien-publish.yml'), 'utf8');
    assert.match(wf, /id: night\n[\s\S]*?run: node \.github\/scripts\/bastien-night-window\.js/);
    assert.match(wf, /id: gate\n\s+if: steps\.night\.outputs\.inside == 'true'/);
    assert.match(wf, /go: \$\{\{ steps\.night\.outputs\.inside == 'true' && steps\.gate\.outputs\.go \|\| 'false' \}\}/);
    assert.match(wf, /if: steps\.night\.outputs\.inside == 'false' \|\| \(steps\.gate\.outputs\.go == 'false'/);
    assert.match(wf, /needs: p3036-gate\n\s+if: needs\.p3036-gate\.outputs\.go == 'true'/);
  });
});
