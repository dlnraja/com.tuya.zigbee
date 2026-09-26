'use strict';

/**
 * P2750 — CI/CD Gmail + Fetch diags + tip metadata (2026-09-26)
 *
 * Contre quoi:
 * - Fetch Homey Diagnostics finishes green but uploads nothing → agents cannot
 *   `gh run download` sanitized diagnostics (only Gmail workflow had artifacts).
 * - Auto-Publish leaves reports/P169_MFS_DB_ALIGN_LATEST.json dirty → skips tip
 *   bump push while Homey Test already shows the bumped version.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2750 fetch-diags artifact + tip bump restore', () => {
  it('fetch-diags.yml uploads sanitized-diagnostics-report like gmail-diagnostics', () => {
    const fetchYml = fs.readFileSync(
      path.join(ROOT, '.github/workflows/fetch-diags.yml'),
      'utf8'
    );
    const gmailYml = fs.readFileSync(
      path.join(ROOT, '.github/workflows/gmail-diagnostics.yml'),
      'utf8'
    );

    assert.ok(
      fetchYml.includes('sanitized-diagnostics-report'),
      'fetch-diags must name artifact sanitized-diagnostics-report'
    );
    assert.ok(
      fetchYml.includes('actions/upload-artifact@'),
      'fetch-diags must upload-artifact'
    );
    assert.ok(
      fetchYml.includes('diagnostics-report.json'),
      'fetch-diags artifact must include diagnostics-report.json'
    );
    assert.ok(
      gmailYml.includes('sanitized-diagnostics-report'),
      'gmail-diagnostics keeps sanitized-diagnostics-report'
    );
  });

  it('auto-publish restores P169 align report so tip bump push is not skipped', () => {
    const yml = fs.readFileSync(
      path.join(ROOT, '.github/workflows/auto-publish-on-push.yml'),
      'utf8'
    );
    assert.ok(
      yml.includes('reports/P169_MFS_DB_ALIGN_LATEST.json'),
      'restore_volatile_artifacts must clear P169 align report dirt'
    );
    assert.ok(
      yml.includes('P2750') || yml.includes('P169 align'),
      'WHY comment or P2750 marker expected near restore'
    );
  });
});
