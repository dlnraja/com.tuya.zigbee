'use strict';
/**
 * P2737 — Bastien L99 house Contre quoi (tip-lag + couples + plan)
 *
 * Contre quoi: shipping remotes fixes without documenting tip-lag as #1
 * house risk, or dropping sacred couples / snappy parity gates.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2737 Bastien L99 house plan locks', () => {
  it('house SSOT has tip-lag as root cause + couples', () => {
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/bastien-house-ssot.json'), 'utf8'));
    const plan = ssot.improvementPlanP2736 || ssot.improvementPlanP2735;
    assert.ok(plan, 'improvement plan present');
    assert.match(String(plan.rootCauseHouse || ''), /TIP_LAG/i);
    const nodes = ssot.liveMesh?.nodes || [];
    const couples = nodes.map((n) => `${n.mfr}+${n.pid}`);
    assert.ok(couples.some((c) => /axpdxqgu\+TS0041/i.test(c)));
    assert.ok(couples.some((c) => /dzwgk7e2\+TS0042/i.test(c)));
    assert.ok(couples.some((c) => /vvmbj46n\+TS0601/i.test(c)));
  });

  it('P2733–P2736 Contre quoi tests exist', () => {
    for (const f of [
      'p2733-bastien-ts004x-wake-listen-only.test.js',
      'p2734-bastien-bidir-soft-ui-complementary.test.js',
      'p2735-famkxci2-ts0043-snappy-parity.test.js',
      'p2736-ts004x-exact-profile-snappy-parity.test.js',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, 'test/critical', f)), f);
    }
  });

  it('snappy parity helper still in PhysicalButtonMixin', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes('applyTs004xSnappyParity'));
    assert.ok(src.includes('P2733'));
    assert.ok(src.includes('softPulsePhysicalUi') || fs.readFileSync(
      path.join(ROOT, 'lib/utils/HomeyButtonUiCharter.js'), 'utf8').includes('softPulsePhysicalUi'));
  });
});
