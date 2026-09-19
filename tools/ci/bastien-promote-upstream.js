'use strict';

/**
 * bastien-promote-upstream.js (P2606)
 *
 * One-way intelligent promote: bastien-home → master (then human BOTH→stable).
 * NEVER copies App ID / version / store identity.
 * NEVER wholesale-syncs master → bastien.
 *
 * Usage:
 *   node tools/ci/bastien-promote-upstream.js           # dry-run
 *   node tools/ci/bastien-promote-upstream.js --apply   # write report + list candidates
 *
 * Contre quoi: accidental reverse sync or identity overwrite.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const SSOT = path.join(ROOT, 'config/architecture/bastien-house-ssot.json');
const OUT = path.join(ROOT, 'reports/bastien-promote-latest.json');

const PROMOTE_GLOBS = [
  'drivers/**/driver.compose.json',
  'drivers/**/device.js',
  'data/user-misattribution-registry.json',
  'data/mfs_db.json',
  'lib/**/*.js',
  'test/critical/p*.test.js',
];

const FORBIDDEN_PATHS = [
  '.homeycompose/app.json',
  'app.json',
  'package.json',
  '.homeychangelog.json',
];

function sh(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

function loadSsot() {
  if (!fs.existsSync(SSOT)) {
    throw new Error(`Missing ${SSOT}`);
  }
  return JSON.parse(fs.readFileSync(SSOT, 'utf8'));
}

function listDiffFiles() {
  // Compare origin/bastien-home to HEAD (master) when fetch available
  sh('git fetch origin bastien-home 2>nul || git fetch origin bastien-home 2>/dev/null || true');
  const raw = sh('git diff --name-only origin/bastien-home...HEAD 2>nul || git diff --name-only bastien-home...HEAD');
  const files = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return files;
}

function isPromotable(rel) {
  if (FORBIDDEN_PATHS.includes(rel)) return false;
  if (/^config\/architecture\/bastien-house-ssot\.json$/.test(rel)) return false;
  // Allow drivers / registry / lib / critical tests
  if (/^drivers\//.test(rel) && /\.(js|json)$/.test(rel)) return true;
  if (rel === 'data/user-misattribution-registry.json') return true;
  if (/^lib\//.test(rel) && /\.js$/.test(rel)) return true;
  if (/^test\/critical\/p\d+.*\.test\.js$/.test(rel)) return true;
  if (/^docs\/knowledge\//.test(rel)) return true;
  return false;
}

function main() {
  const ssot = loadSsot();
  if (ssot.enrichment?.direction !== 'bastien_to_public_only') {
    throw new Error('SSOT enrichment.direction must be bastien_to_public_only');
  }

  const all = listDiffFiles();
  const candidates = all.filter(isPromotable);
  const blocked = all.filter((f) => FORBIDDEN_PATHS.includes(f));

  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'APPLY_REPORT' : 'DRY-RUN',
    direction: 'bastien_home → master (surgical)',
    neverReverseWholesale: true,
    appIdBastien: ssot.appId,
    forbiddenTouched: blocked,
    candidates,
    candidateCount: candidates.length,
    note: APPLY
      ? 'Report only — cherry-pick candidates manually or extend with path-level apply. Identity files never copied.'
      : 'Dry-run — no files written to working tree except this report.',
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

  console.log('=== bastien-promote-upstream P2606 ===');
  console.log('Mode:', report.mode);
  console.log('Candidates:', report.candidateCount);
  console.log('Blocked identity paths in diff:', blocked.length);
  for (const c of candidates.slice(0, 40)) console.log('  +', c);
  if (candidates.length > 40) console.log(`  … +${candidates.length - 40} more`);
  console.log('Report:', OUT);

  if (blocked.length) {
    console.log('OK: identity paths listed but will never be auto-copied');
  }
}

module.exports = { isPromotable, FORBIDDEN_PATHS, PROMOTE_GLOBS };

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}
