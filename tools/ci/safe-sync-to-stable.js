// tools/ci/safe-sync-to-stable.js — P52
// Syncs SAFE changes from master to stable-v5:
// - FPs additions (fingerprints.json)
// - Battery chem/mfr profiles (BATTERY_SPECS, MANUFACTURER_PROFILES)
// - TITAN v5 fixes (typos, safeSetTimeout/safeSetInterval, Buffer.from utf8)
// - Driver.compose.json mfr additions (mfr sync)
// Does NOT sync:
// - New architecture (multi-channel, AVE, daily-digest, new workflows)
// - New features (new drivers, new flow cards)
// - Sacred Couple refactor
// Usage: node tools/ci/safe-sync-to-stable.js [--dry-run]

'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const isDryRun = process.argv.includes('--dry-run');

console.log('═══ P52 — Safe Sync master → stable-v5 ═══');
console.log('Mode:', isDryRun ? 'DRY-RUN' : 'APPLY');
console.log('');

// List of SAFE files to sync (relative to repo root)
const SAFE_FILES = [
  'lib/tuya/fingerprints.json',                    // FPs
  'lib/battery/BatteryMasterEngine.js',            // battery chem/mfr
  'lib/battery/BatteryCascadeEngine.js',           // battery cascade
  'lib/battery/UniversalBatteryFallback.js',        // battery fallback
  'lib/battery/index.js',                          // battery exports
  'lib/LocalFirstEngine.js',                       // LFE rules (safe additions)
  'lib/SDK3CompatBridge.js',                       // SDK3 bridge
  'lib/LowLevelBridge.js',                         // Low-level bridge
  'lib/utils/safe-timers.js',                      // safe-timers
  'lib/SDK3CompatBridge.js',                       // SDK3 compat
  'data/mfs_db.json',                              // mfs DB
];

// DANGEROUS files to NEVER sync (new architecture)
const DANGEROUS_FILES = [
  'lib/multichannel/',                            // Multi-channel architecture
  'lib/autonomous/',                              // Autonomous verification
  'lib/security/SecurityGuard.js',                // Security guard
  'tools/ci/daily-digest.js',                     // Daily digest
  'tools/ci/recurrent-orchestrator.js',           // Orchestrator (it has AVE)
  '.github/workflows/autonomous-verification.yml', // AVE workflow
  '.github/workflows/recurrent-orchestrator.yml',   // Orchestrator workflow
  'docs/P37_',                                    // P37 docs
  'docs/P38_',                                    // P38 docs
];

// Check current state
function git(args) {
  const gitPath = 'C:\\Program Files\\Git\\cmd\\git.exe';
  return execFileSync(gitPath, args, { cwd: root, encoding: 'utf8' }).trim();
}

let masterFpsCount = 'unknown';
let stableFpsCount = 'unknown';
try {
  const masterFp = git(['show', 'origin/master:lib/tuya/fingerprints.json']);
  masterFpsCount = Object.keys(JSON.parse(masterFp)).length;
} catch (e) { /* ignore */ }
try {
  const stableFp = git(['show', 'origin/stable-v5:lib/tuya/fingerprints.json']);
  stableFpsCount = Object.keys(JSON.parse(stableFp)).length;
} catch (e) { /* ignore */ }

console.log('FPs: master =', masterFpsCount, '| stable-v5 =', stableFpsCount);
const fpDelta = masterFpsCount - stableFpsCount;
console.log('FPs delta:', fpDelta);
console.log('');

// Find safe commits on master that are NOT on stable-v5
console.log('Finding safe commits on master not on stable-v5...');
let safeCommits = [];
try {
  // Get commits on master but not on stable-v5
  const log = git(['log', 'origin/stable-v5..origin/master', '--oneline', '--no-merges']);
  const lines = log.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const sha = line.split(' ')[0];
    const subject = line.substring(sha.length + 1);
    // Heuristic: safe commits are [fix] or [chore] or [feat(P1-P36)] (legacy P commits)
    // Or they touch SAFE files only
    let isSafe = false;
    if (subject.match(/^\[?(fix|chore|docs)/i) || subject.match(/\[fix\]/i)) {
      isSafe = true;
    }
    if (subject.match(/^fix\(P\d+\)/) || subject.match(/^feat\(P\d+\)/) || subject.match(/^docs\(P\d+\)/) || subject.match(/^chore\(P\d+\)/)) {
      // P1-P36 are pre-architecture changes
      const pMatch = subject.match(/P(\d+)/);
      if (pMatch && parseInt(pMatch[1]) <= 36) {
        isSafe = true;
      } else if (parseInt(pMatch[1]) >= 37) {
        // P37+ are new architecture
        isSafe = false;
      }
    }
    // Check if any DANGEROUS files are touched
    try {
      const files = git(['show', '--name-only', '--format=', sha]);
      const fileList = files.split('\n').filter(Boolean);
      const touchesDangerous = fileList.some((f) => DANGEROUS_FILES.some((d) => f.startsWith(d)));
      const touchesSafe = fileList.some((f) => SAFE_FILES.some((s) => f.startsWith(s)));
      if (touchesDangerous) isSafe = false;
      if (touchesSafe && !touchesDangerous) isSafe = true;
    } catch (e) { /* ignore */ }

    if (isSafe) safeCommits.push({ sha, subject });
  }
} catch (e) {
  console.log('Error finding commits:', e.message);
}

console.log('Safe commits to potentially sync:', safeCommits.length);
for (const c of safeCommits.slice(0, 10)) {
  console.log('  ✓', c.sha.substring(0, 7), c.subject);
}

// List SAFE file diffs
console.log('');
console.log('=== SAFE files diff (master vs stable-v5) ===');
for (const f of SAFE_FILES) {
  try {
    const diff = git(['diff', '--stat', `origin/stable-v5:${f}`, `origin/master:${f}`]);
    if (diff) console.log('  ', f, '→', diff.split('\n').pop());
  } catch (e) { /* ignore */ }
}

if (isDryRun) {
  console.log('');
  console.log('DRY-RUN: no changes applied. Run without --dry-run to apply.');
  process.exit(0);
}

console.log('');
console.log('To apply: cherry-pick the safe commits one by one.');
console.log('  cd stable && git cherry-pick <sha>');
