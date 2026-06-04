#!/usr/bin/env node
'use strict';

/**
 * OPUS AUTONOMOUS MAINTENANCE ENGINE
 * Automates fetching of Johan issues, PRs, and community intelligence.
 * Chains into master-automation.js for validation and Git pushing.
 */

const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const C = {
  reset:  '\x1b[0m',  red:    '\x1b[31m', green:  '\x1b[32m',
  yellow: '\x1b[33m', blue:   '\x1b[34m', cyan:   '\x1b[36m',
  bold:   '\x1b[1m'
};

const log = (c, s) => console.log(c + s + C.reset);
const ok = (s) => log(C.green, '  ✅ ' + s);
const fail = (s) => log(C.red, '  ❌ ' + s);
const info = (s) => log(C.cyan, '  ℹ️  ' + s);
const warn = (s) => log(C.yellow, '  ⚠️  ' + s);

function run(cmd, args, description) {
  info(`[RUNNING] ${description} (${cmd} ${args.join(' ')})`);
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: true });
  if (res.status !== 0) {
    fail(`Command failed: ${description}`);
    return false;
  }
  ok(`Success: ${description}`);
  return true;
}

async function main() {
  log(C.bold + C.blue, '\n╔══════════════════════════════════════════════════════════════╗');
  log(C.bold + C.blue, '║       🤖 AUTONOMOUS MAINTENANCE & INTELLIGENCE ENGINE        ║');
  log(C.bold + C.blue, '╚══════════════════════════════════════════════════════════════╝\n');

  // 1. Fetching External Intelligence
  info('Phase 1: Fetching Community Intelligence & GitHub Issues');
  
  // Checking GH CLI auth
  const ghAuth = spawnSync('gh', ['auth', 'status'], { shell: true });
  if (ghAuth.status !== 0) {
    warn('GitHub CLI (gh) is not authenticated. Skipping issue extraction. Please run `gh auth login`.');
  } else {
    ok('GitHub CLI authenticated.');
    run('node', ['.github/scripts/scan-johan-full.js'], 'Johan Upstream PR/Issue Scan');
    run('node', ['.github/scripts/scan-prs-issues.js'], 'Local Repository Bug & PR Scan');
  }

  // 2. Fetch Z2M / Forum FPs
  run('npm', ['run', 'extract:all'], 'Z2M and Forum Fingerprint Extraction');
  
  // 3. Consolidate FPs
  run('npm', ['run', 'consolidate'], 'Consolidate new Fingerprints');
  
  // 4. Run Pre-push Validator & Auto-fixer (this injects FPs and fixes formats)
  info('Phase 2: Validation and Auto-Fixing');
  const validatorPass = run('node', ['scripts/master-automation.js', '--fix'], 'Master App Validation & Auto-fix');
  
  if (!validatorPass) {
    fail('Validation failed. Aborting maintenance push.');
    process.exit(1);
  }

  try {
    execSync('git add -A', { cwd: ROOT, stdio: 'inherit' });
    ok('Staged changes');
    const gitStatus = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' });
    if (gitStatus.trim().length > 0) {
      execSync('git commit -m "auto: autonomous maintenance (sync FPs and fixes)"', { cwd: ROOT, stdio: 'inherit' });
      ok('Committed changes');
      execSync('git push origin master', { cwd: ROOT, stdio: 'inherit' });
      ok('Pushed changes');
    } else {
      ok('No new changes to commit. Repository is up-to-date.');
    }
  } catch (e) {
    fail('Git operation failed: ' + e.message);
  }

  log(C.bold + C.green, '\n🎉 MAINTENANCE ENGINE COMPLETED SUCCESSFULLY');
}

main().catch(err => {
  fail('Fatal Error: ' + err.message);
  process.exit(1);
});
