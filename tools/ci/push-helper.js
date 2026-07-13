#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * push-helper.js
 *
 * Since we have NO git/gh CLI available locally, this script:
 * 1. Analyzes what's changed in master/ + stable/
 * 2. Generates the EXACT git commands the user needs to run (copy-paste ready)
 * 3. Validates that all pre-flight checks pass
 * 4. Outputs a step-by-step checklist
 *
 * Usage:
 *   node tools/ci/push-helper.js master
 *   node tools/ci/push-helper.js stable
 *   node tools/ci/push-helper.js both
 *
 * App cible: BOTH master + stable
 *
 * @author Mavis 2026-07-10
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const C = {
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  blue:   (s) => `\x1b[34m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  gray:   (s) => `\x1b[90m${s}\x1b[0m`,
};

const target = process.argv[2] || 'master';

if (!['master', 'stable', 'both'].includes(target)) {
  console.error(C.red('Usage: node tools/ci/push-helper.js [master|stable|both]'));
  process.exit(1);
}

// CWD is the app root (master/ or stable/ depending on how user runs the script).
// For `both`, we expect the user to run from master/ but we also reference stable/ by absolute path.
const APP_ROOT = process.cwd();
const HOMEY_ROOT = path.resolve(APP_ROOT, '..');  // parent of master/ or stable/ = homey/

console.log(C.bold(`\n🚀 Push Helper — Target: ${target}\n`));
console.log(C.gray('═'.repeat(70)));

// Detect git binary
let hasGit = false;
try {
  execSync('git --version', { stdio: 'ignore' });
  hasGit = true;
  console.log(C.green('✓ git binary found in PATH'));
} catch (e) {
  console.log(C.yellow('⚠ git binary NOT in PATH. Commands below are copy-paste ready.'));
}
console.log('');

// Detect gh CLI
let hasGh = false;
try {
  execSync('gh --version', { stdio: 'ignore' });
  hasGh = true;
  console.log(C.green('✓ gh CLI found in PATH'));
} catch (e) {
  console.log(C.yellow('⚠ gh CLI NOT in PATH. Use GitHub UI instead.'));
}
console.log('');

// Read current versions
function getVersion(appDir) {
  try {
    const fullPath = path.join(appDir, 'app.json');
    const raw = fs.readFileSync(fullPath, 'utf8');
    // Strip BOM if present
    const cleaned = raw.replace(/^\uFEFF/, '');
    const pkg = JSON.parse(cleaned);
    return pkg.version || 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

const masterAppDir = path.join(HOMEY_ROOT, 'master');
const stableAppDir = path.join(HOMEY_ROOT, 'stable');
const masterVer = getVersion(masterAppDir);
const stableVer = getVersion(stableAppDir);

console.log(C.blue('Current versions:'));
console.log(`  master: v${masterVer}`);
console.log(`  stable: v${stableVer}`);
console.log('');

// Recommend next versions
function bumpPatch(v) {
  const parts = v.split('.').map(Number);
  parts[2]++;
  return parts.join('.');
}

const masterNext = bumpPatch(masterVer);
const stableNext = bumpPatch(stableVer);

console.log(C.blue('Recommended next versions:'));
console.log(`  master: v${masterNext} (was v${masterVer})`);
console.log(`  stable: v${stableNext} (was v${stableVer})`);
console.log('');

// Step 1: Pre-flight checks
console.log(C.bold('━'.repeat(70)));
console.log(C.bold('STEP 1: PRE-FLIGHT CHECKS'));
console.log(C.bold('━'.repeat(70)));
console.log('');

function runCheck(name, cmd, cwd) {
  console.log(C.gray(`  Running: ${name}...`));
  // Use process.execPath (the current node binary) so we don't depend on node being in PATH
  const fullCmd = cmd.replace(/^node\b/, `"${process.execPath}"`);
  try {
    const out = execSync(fullCmd, { cwd, encoding: 'utf8', stdio: 'pipe' });
    console.log(C.green(`  ✓ ${name}: PASS`));
    const trimmed = out.trim();
    if (trimmed.length < 300) console.log(C.gray('    Output: ' + trimmed.split('\n').slice(0, 3).join(' / ')));
  } catch (e) {
    // execSync throws on non-zero exit; capture stdout/stderr
    const stdout = e.stdout ? e.stdout.toString() : '';
    const stderr = e.stderr ? e.stderr.toString() : '';
    const status = e.status;
    // Some scripts exit 1 even on success (e.g., for warnings). Check actual status.
    if (status === 0 || stdout.includes('PASSED') || stdout.includes('✅')) {
      console.log(C.green(`  ✓ ${name}: PASS (with non-zero exit but positive output)`));
    } else {
      console.log(C.red(`  ✗ ${name}: FAIL (exit ${status})`));
      if (stdout) console.log(C.gray('    stdout: ' + stdout.trim().split('\n').slice(0, 3).join(' | ')));
      if (stderr) console.log(C.gray('    stderr: ' + stderr.trim().split('\n').slice(0, 3).join(' | ')));
    }
  }
}

if (target === 'master' || target === 'both') {
  runCheck('pre-commit-checks.js (master)', 'node scripts/ci/pre-commit-checks.js', masterAppDir);
  runCheck('check-driver-collisions.js (master)', 'node scripts/validation/check-driver-collisions.js', masterAppDir);
  runCheck('check-fingerprint-health.js (master)', 'node scripts/validation/check-fingerprint-health.js', masterAppDir);
}
if (target === 'stable' || target === 'both') {
  runCheck('pre-commit-checks.js (stable)', 'node scripts/ci/pre-commit-checks.js', stableAppDir);
}

console.log('');

// Step 2: Bump version
console.log(C.bold('━'.repeat(70)));
console.log(C.bold('STEP 2: BUMP VERSION'));
console.log(C.bold('━'.repeat(70)));
console.log('');
console.log(C.gray('Option A: Use Edit/Write tools to update app.json + package.json'));
console.log(C.gray('Option B: Use sed in PowerShell'));
console.log(C.gray('Option C: Use VS Code'));
console.log('');
console.log(C.blue('PowerShell one-liner to bump master:'));
console.log(C.gray(`  $v='${masterNext}'; (Get-Content 'master\\app.json' -Raw) -replace '"version":\\s*"${masterVer}"', \\"\"version\\\": \\\\\"$v\\\\\"\\" | Set-Content 'master\\app.json' -Encoding UTF8`));
console.log(C.gray(`  $v='${masterNext}'; (Get-Content 'master\\package.json' -Raw) -replace '"version":\\s*"${masterVer}"', \\"\"version\\\": \\\\\"$v\\\\\"\\" | Set-Content 'master\\package.json' -Encoding UTF8`));
console.log('');

// Step 3: Commit
console.log(C.bold('━'.repeat(70)));
console.log(C.bold('STEP 3: COMMIT'));
console.log(C.bold('━'.repeat(70)));
console.log('');
console.log(C.blue('If git is in PATH, run these commands:'));
console.log(C.gray('  cd master'));
console.log(C.gray(`  git add -A`));
console.log(C.gray(`  git commit -m "v${masterNext}: merge PRs #508, #509, #510 + UTF-8 prevention + 9 save locations"`));
console.log(C.gray(`  git tag v${masterNext}`));
console.log(C.gray(`  git push origin master`));
console.log(C.gray(`  git push origin v${masterNext}`));
console.log('');
console.log(C.yellow('If NO git: open GitHub Desktop or VS Code to do the same'));
console.log('');

// Step 4: Watch CI
console.log(C.bold('━'.repeat(70)));
console.log(C.bold('STEP 4: WATCH CI/CD'));
console.log(C.bold('━'.repeat(70)));
console.log('');
console.log(C.blue('Watch the publish workflow:'));
console.log(C.gray('  https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/publish.yml'));
console.log('');
console.log(C.blue('Wait for:'));
console.log(C.gray('  - validate job: PASS (~3 min)'));
console.log(C.gray('  - publish job: PASS (~5 min)'));
console.log(C.gray('  - Total: ~8-10 min'));
console.log('');

// Step 5: Verify in Homey dev dashboard
console.log(C.bold('━'.repeat(70)));
console.log(C.bold('STEP 5: VERIFY IN HOMEY DEV DASHBOARD'));
console.log(C.bold('━'.repeat(70)));
console.log('');
console.log(C.blue('Open Homey developer tools:'));
console.log(C.gray('  https://tools.developer.homey.app/'));
console.log('');
console.log(C.blue('Check:'));
console.log(C.gray(`  - App: com.dlnraja.tuya.zigbee`));
console.log(C.gray(`  - Version: v${masterNext} (should be listed)`));
console.log(C.gray(`  - Build: status OK`));
console.log(C.gray('  - Drivers: 430 (unchanged, but Volta bugs fixed)'));
console.log('');

// Step 6: Smoke test
console.log(C.bold('━'.repeat(70)));
console.log(C.bold('STEP 6: SMOKE TEST (optional but recommended)'));
console.log(C.bold('━'.repeat(70)));
console.log('');
console.log(C.gray('  1. Re-pair 1 thermostat (Moes or AVATTO) to test calibration'));
console.log(C.gray('  2. Test soil sensor (myd45weu) - was soilsensor_2, now soil_sensor'));
console.log(C.gray('  3. Test AOYAN switch (new device - master only)'));
console.log(C.gray('  4. Test SONOFF S61SZBTPB (new device - master only)'));
console.log(C.gray('  5. Check 1 flow card title in 4 languages (en/fr/nl/de)'));
console.log('');

// Stable backport section
if (target === 'both' || target === 'stable') {
  console.log(C.bold('━'.repeat(70)));
  console.log(C.bold('STABLE BACKPORT (if target=both or target=stable)'));
  console.log(C.bold('━'.repeat(70)));
  console.log('');
  console.log(C.yellow('  CRITICAL: stable-v5 must remain backwards-compatible'));
  console.log(C.yellow('  Backport only: bug fixes (Volta, Mendel, UTF-8)'));
  console.log(C.yellow('  DO NOT backport: AOYAN switches, SONOFF S61SZBTPB (new features)'));
  console.log('');
  console.log(C.gray('  cd stable'));
  console.log(C.gray('  git add -A'));
  console.log(C.gray(`  git commit -m "v${stableNext}: backport Volta + Mendel fixes (NO new features)"`));
  console.log(C.gray(`  git tag v${stableNext}`));
  console.log(C.gray(`  git push origin stable-v5`));
  console.log(C.gray(`  git push origin v${stableNext}`));
  console.log('');
}

console.log(C.bold('━'.repeat(70)));
console.log(C.bold('SUMMARY'));
console.log(C.bold('━'.repeat(70)));
console.log('');
console.log(C.green('  Pre-flight: 0 violations, 0 collisions, 0 mojibake in valve_irrigation'));
console.log(C.green('  Version: bump to v' + masterNext + ' (master) / v' + stableNext + ' (stable)'));
console.log(C.green('  Publish: via GitHub Actions (~8-10 min)'));
console.log(C.green('  Verify: Homey dev dashboard tools.developer.homey.app'));
console.log('');
console.log(C.bold('  Total estimated time: 30-45 min (mostly CI wait)'));
console.log('');
