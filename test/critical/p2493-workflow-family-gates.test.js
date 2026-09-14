'use strict';

/**
 * P2493 — Contre quoi: family gates (p244x/p246x/p248x/p249x) drift out of
 * hard CI workflows while package.json scripts still exist.
 *
 * WHY(P215):
 * - Pourquoi: P2491/P2492 landed only on unified-ci; validate/pr-gate/publish skipped them
 * - Comment: assert workflow YAML + npm scripts for the hard set
 * - Pour qui: GHA bots + Homey Test publish path
 * - Quand: every PR / push / publish validate
 * - Contre quoi: silent tip regressions (Moes EF00, AI burn, button UI charter)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const WF = path.join(ROOT, '.github', 'workflows');

const HARD = [
  'unified-ci.yml',
  'validate.yml',
  'syntax-check.yml',
  'pr-gate.yml',
  'code-quality.yml',
  'auto-publish-on-push.yml',
];

const SOFT = ['project-resilience.yml'];

const FAMILIES = ['check:p244x', 'check:p246x', 'check:p248x', 'check:p249x'];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2493 workflow family gate wiring', () => {
  it('package.json exposes family scripts', () => {
    const pkg = JSON.parse(read('package.json'));
    for (const s of FAMILIES) {
      assert.ok(pkg.scripts[s], `missing npm script ${s}`);
    }
    assert.ok(pkg.scripts['check:p2493'], 'missing check:p2493');
  });

  it('hard workflows wire all four families', () => {
    for (const f of HARD) {
      const t = fs.readFileSync(path.join(WF, f), 'utf8');
      for (const gate of FAMILIES) {
        assert.ok(t.includes(gate), `${f} must run ${gate}`);
      }
      assert.ok(/defaults:\s*\n\s*run:\s*\n\s*shell:\s*bash/.test(t), `${f} bash defaults`);
      assert.ok(/^permissions:/m.test(t), `${f} permissions`);
      assert.ok(/timeout-minutes:/.test(t), `${f} timeout`);
    }
  });

  it('project-resilience soft-wires families', () => {
    for (const f of SOFT) {
      const t = fs.readFileSync(path.join(WF, f), 'utf8');
      for (const gate of FAMILIES) {
        assert.ok(t.includes(gate), `${f} soft must mention ${gate}`);
      }
    }
  });

  it('P2467 locks launchOnce (not hollow start/init primary)', () => {
    const cover = read('lib/devices/UnifiedCoverBase.js');
    assert.ok(/launchOnce\s*\(/.test(cover));
    const test = read('test/critical/p2467-moes-ef00-initialize.test.js');
    assert.ok(test.includes('launchOnce'), 'p2467 test tracks launchOnce Contre quoi');
  });
});
