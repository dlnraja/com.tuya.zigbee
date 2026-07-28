#!/usr/bin/env node
'use strict';

/**
 * Purge sensitive paths from git history.
 *
 * This script uses `git-filter-repo` to permanently remove sensitive
 * operational files and caches from the entire git history.
 *
 * WARNING: this rewrites commit hashes. After running it you MUST:
 *  - force-push all rewritten branches (`git push --force-with-lease --all`)
 *  - notify every collaborator to re-clone or reset their local copies
 *  - update any open PRs based on the old history
 *
 * Usage:
 *   node scripts/ci/purge-sensitive-history.js --dry-run   # preview only
 *   node scripts/ci/purge-sensitive-history.js --execute   # destructive purge
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRY_RUN = process.argv.includes('--dry-run');
const EXECUTE = process.argv.includes('--execute');

const PATHS_TO_PURGE = [
  // Catch-all for operational state files (except .gitkeep/README.md kept below)
  '.github/state/**',
  'data/community-sync/',
  'data/intel-harvest/',
  'data/temp_desktop_cleanup/',
  'data/diagnostics/',
  'data/backups/',
  'data/archive/',
  'data/forum-cache/',
  'tools/ci/diagnostics/',
  'tools/ci/.cache/',
  'tools/shadow-mode/tickets/',
  'tools/shadow-mode/.cache/',
  'reports/logs/',
  'icon_audit_report.json',
  'screenshots/',
  'screenshots-debug/',
  'promote-screenshots/',
  'push-promote-screenshots/',
  'gmail-dumps/',
  'diagnostics/',
  'diagnostics/raw/',
  'diagnostics/**/*.json',
  '.diag/',
  '.cache/',
  '.agents/fix_*.js',
  'page-dump.html',
  '**/*.bak',
  '**/*.bak.*',
  '**/*.tmp',
  '**/*.old',
  '**/*.orig',
  '.env',
  '.env.local',
  '.env.production',
  'secrets.json',
  'credentials.json',
  'token.json',
  'config.local.js',
  'oauth2.keys.json',
  'client_secret*.json',
  'homey-auth.*',
  '.netrc',
  '.npmrc',
];

// Files inside purged directories that must be preserved in history
const PATHS_TO_KEEP = [
  '.github/state/.gitkeep',
  '.github/state/README.md',
];

function hasGitFilterRepo() {
  const r = spawnSync('git', ['filter-repo', '--version'], { cwd: ROOT, stdio: 'ignore' });
  return r.status === 0;
}

function currentBranch() {
  return execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
}

function main() {
  if (!DRY_RUN && !EXECUTE) {
    console.error('Usage: node scripts/ci/purge-sensitive-history.js [--dry-run | --execute]');
    process.exit(1);
  }

  if (!hasGitFilterRepo()) {
    console.error('[purge] ❌ git-filter-repo is not available.');
    console.error('[purge] Install it first, for example:');
    console.error('  python3 -m pip install --user git-filter-repo');
    console.error('Or download the standalone script:');
    console.error('  curl -L https://raw.githubusercontent.com/newren/git-filter-repo/main/git-filter-repo -o /usr/local/bin/git-filter-repo');
    process.exit(1);
  }

  const args = ['filter-repo', '--force'];
  for (const p of PATHS_TO_PURGE) {
    args.push('--path-glob', p, '--invert-paths');
  }
  for (const p of PATHS_TO_KEEP) {
    args.push('--path', p);
  }

  console.log('[purge] Branch:', currentBranch());
  console.log('[purge] Paths to purge:', PATHS_TO_PURGE.length);
  console.log('[purge] Paths to keep:', PATHS_TO_KEEP.length);
  console.log('[purge] Mode:', DRY_RUN ? 'DRY-RUN (preview)' : 'EXECUTE (destructive)');

  if (DRY_RUN) {
    console.log('[purge] Dry-run: would run:');
    console.log('  git', args.join(' '));
    console.log('[purge] Use --execute to actually rewrite history.');
    return;
  }

  console.log('[purge] Executing git filter-repo...');
  try {
    execSync('git ' + args.join(' '), { cwd: ROOT, stdio: 'inherit' });
    console.log('[purge] ✅ History rewritten.');
    console.log('[purge] Next steps:');
    console.log('  1. Review the rewritten history: git log --oneline -10');
    console.log('  2. Force-push all branches: git push --force-with-lease --all');
    console.log('  3. Force-push tags if needed: git push --force-with-lease --tags');
    console.log('  4. Tell collaborators to re-clone or reset.');
  } catch (e) {
    console.error('[purge] ❌ Failed:', e.message);
    process.exit(1);
  }
}

main();
