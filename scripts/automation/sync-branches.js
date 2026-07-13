#!/usr/bin/env node
/**
 * sync-branches.js — Bidirectional sync of MFRs + fingerprints + mfs_db between master and stable-v5
 * v1.0.0
 *
 * Usage: node scripts/automation/sync-branches.js [--dry-run]
 *
 * What it syncs:
 * 1. manufacturerName arrays in driver.compose.json (bidirectional)
 * 2. lib/tuya/fingerprints.json entries (bidirectional)
 * 3. data/mfs_db.json entries (bidirectional)
 * 4. Removes invalid MFRs from both branches
 * 5. Removes empty arrays from both branches
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DRY_RUN = process.argv.includes('--dry-run');

// Auto-detect paths
const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');

// Find stable-v5 worktree
function findStableWorktree() {
  try {
    const output = execSync('git worktree list', { encoding: 'utf8', cwd: REPO_ROOT });
    for (const line of output.split('\n')) {
      if (line.includes('stable-v5')) {
        return line.split(/\s+/)[0];
      }
    }
  } catch (e) {}
  // Fallback: check common locations
  const candidates = [
    path.resolve(REPO_ROOT, '..', 'tuya_repair_v5'),
    path.resolve(REPO_ROOT, '..', 'com.tuya.zigbee.stable'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'drivers'))) return c;
  }
  return null;
}

const MASTER = REPO_ROOT;
const STABLE = findStableWorktree();

if (!STABLE) {
  console.error('ERROR: Could not find stable-v5 worktree');
  process.exit(1);
}

console.log('=== Branch Sync Tool v1.0.0 ===');
console.log('Master:', MASTER);
console.log('Stable:', STABLE);
console.log('Dry run:', DRY_RUN);
console.log('');

// ─────────────────────────────────────────────────────────────────────────────
// INVALID MFRs to remove
// ─────────────────────────────────────────────────────────────────────────────
const INVALID_MFRS = [
  '_TZ3000_n', '_TZ3000_XYZ', '_TZ3000_G',
  'DHT0001', 'DHTA001', 'NTCHT01', 'NTCHT02',
  'B3876M9', 'CAT0001', 'DSS0010', 'PIRIV01', 'VABRATE', 'A89G12C', 'Zbeacon',
];

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1: Clean invalid MFRs + empty arrays
// ─────────────────────────────────────────────────────────────────────────────
function cleanBranch(baseDir, label) {
  console.log(`--- ${label}: Cleaning invalid MFRs + empty arrays ---`);
  const driversDir = path.join(baseDir, 'drivers');
  let removedInvalid = 0;
  let removedEmpty = 0;

  for (const driver of fs.readdirSync(driversDir)) {
    const fpath = path.join(driversDir, driver, 'driver.compose.json');
    if (!fs.existsSync(fpath)) continue;
    try {
      const data = JSON.parse(Buffer.from(fs.readFileSync(fpath)).toString('utf8'));
      if (!data.zigbee) continue;
      let modified = false;

      // Remove invalid MFRs
      if (Array.isArray(data.zigbee.manufacturerName)) {
        const before = data.zigbee.manufacturerName.length;
        data.zigbee.manufacturerName = data.zigbee.manufacturerName.filter(m => {
          if (!m || typeof m !== 'string') return false;
          return !INVALID_MFRS.some(invalid => m.toLowerCase() === invalid.toLowerCase());
        });
        if (before !== data.zigbee.manufacturerName.length) {
          removedInvalid += before - data.zigbee.manufacturerName.length;
          modified = true;
        }
      }

      // Remove empty arrays
      if (Array.isArray(data.zigbee.manufacturerName) && data.zigbee.manufacturerName.length === 0) {
        delete data.zigbee.manufacturerName;
        removedEmpty++;
        modified = true;
      }
      if (Array.isArray(data.zigbee.productId) && data.zigbee.productId.length === 0) {
        delete data.zigbee.productId;
        removedEmpty++;
        modified = true;
      }

      if (modified && !DRY_RUN) {
        fs.writeFileSync(fpath, JSON.stringify(data, null, 2) + '\n');
      }
    } catch (e) {}
  }

  console.log(`  Removed ${removedInvalid} invalid MFRs, ${removedEmpty} empty arrays`);
  return { removedInvalid, removedEmpty };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Load all MFRs from both branches
// ─────────────────────────────────────────────────────────────────────────────
function loadAllMfrs(baseDir) {
  const driversDir = path.join(baseDir, 'drivers');
  const mfrMap = {};  // driver -> Set(mfr lowercase)
  const allMfrs = new Set();

  for (const driver of fs.readdirSync(driversDir)) {
    const fpath = path.join(driversDir, driver, 'driver.compose.json');
    if (!fs.existsSync(fpath)) continue;
    try {
      const data = JSON.parse(Buffer.from(fs.readFileSync(fpath)).toString('utf8'));
      if (!data.zigbee || !Array.isArray(data.zigbee.manufacturerName)) continue;
      mfrMap[driver] = new Set(data.zigbee.manufacturerName.map(m => m.toLowerCase()));
      for (const mfr of data.zigbee.manufacturerName) {
        allMfrs.add(mfr.toLowerCase());
      }
    } catch (e) {}
  }
  return { mfrMap, allMfrs };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3: Sync MFRs bidirectionally
// ─────────────────────────────────────────────────────────────────────────────
function syncMfrs(sourceDir, targetDir, sourceLabel, targetLabel) {
  const source = loadAllMfrs(sourceDir);
  const target = loadAllMfrs(targetDir);
  const targetDriversDir = path.join(targetDir, 'drivers');
  const sourceDriversDir = path.join(sourceDir, 'drivers');

  let totalAdded = 0;
  let driversModified = 0;

  // Find common drivers
  const commonDrivers = Object.keys(source.mfrMap).filter(d => target.mfrMap[d]);

  for (const driver of commonDrivers) {
    const sourceMfrs = source.mfrMap[driver];
    const targetMfrs = target.mfrMap[driver];

    // MFRs in source but not target
    const missing = [...sourceMfrs].filter(m => !targetMfrs.has(m));
    if (missing.length === 0) continue;

    // Read target compose file
    const targetFpath = path.join(targetDriversDir, driver, 'driver.compose.json');
    const sourceFpath = path.join(sourceDriversDir, driver, 'driver.compose.json');

    try {
      const targetData = JSON.parse(Buffer.from(fs.readFileSync(targetFpath)).toString('utf8'));
      const sourceData = JSON.parse(Buffer.from(fs.readFileSync(sourceFpath)).toString('utf8'));

      let added = 0;
      for (const mfrLower of missing) {
        // Find original case from source
        const original = sourceData.zigbee.manufacturerName.find(m => m.toLowerCase() === mfrLower);
        if (!original) continue;

        // Check if already in target (case-insensitive)
        if (targetData.zigbee.manufacturerName.some(m => m.toLowerCase() === mfrLower)) continue;

        targetData.zigbee.manufacturerName.push(original);
        added++;

        // Also add uppercase variant if different
        const upper = original.toUpperCase();
        if (upper !== original && !targetData.zigbee.manufacturerName.some(m => m.toLowerCase() === upper.toLowerCase())) {
          targetData.zigbee.manufacturerName.push(upper);
        }
      }

      if (added > 0 && !DRY_RUN) {
        fs.writeFileSync(targetFpath, JSON.stringify(targetData, null, 2) + '\n');
        console.log(`  ${targetLabel} +${added}: ${driver}`);
        totalAdded += added;
        driversModified++;
      }
    } catch (e) {}
  }

  console.log(`  Total: +${totalAdded} MFRs in ${driversModified} drivers`);
  return { totalAdded, driversModified };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4: Sync fingerprints.json
// ─────────────────────────────────────────────────────────────────────────────
function syncFingerprints(sourceDir, targetDir, sourceLabel, targetLabel) {
  const sourceFp = JSON.parse(fs.readFileSync(path.join(sourceDir, 'lib/tuya/fingerprints.json'), 'utf8'));
  const targetFp = JSON.parse(fs.readFileSync(path.join(targetDir, 'lib/tuya/fingerprints.json'), 'utf8'));

  let added = 0;
  for (const [mfr, data] of Object.entries(sourceFp)) {
    if (!targetFp[mfr]) {
      targetFp[mfr] = data;
      added++;
    }
  }

  if (added > 0 && !DRY_RUN) {
    fs.writeFileSync(path.join(targetDir, 'lib/tuya/fingerprints.json'), JSON.stringify(targetFp, null, 2) + '\n');
  }
  console.log(`  ${targetLabel}: +${added} FP entries`);
  return added;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5: Sync mfs_db.json
// ─────────────────────────────────────────────────────────────────────────────
function syncMfsDb(sourceDir, targetDir, sourceLabel, targetLabel) {
  const sourceMfs = JSON.parse(fs.readFileSync(path.join(sourceDir, 'data/mfs_db.json'), 'utf8'));
  const targetMfsPath = path.join(targetDir, 'data/mfs_db.json');

  // Create target if it doesn't exist
  let targetMfs = {};
  if (fs.existsSync(targetMfsPath)) {
    targetMfs = JSON.parse(Buffer.from(fs.readFileSync(targetMfsPath)).toString('utf8'));
  }

  let added = 0;
  for (const [key, val] of Object.entries(sourceMfs)) {
    if (key === '_meta') continue;
    if (!targetMfs[key]) {
      targetMfs[key] = val;
      added++;
    }
  }

  if (added > 0 && !DRY_RUN) {
    fs.writeFileSync(targetMfsPath, JSON.stringify(targetMfs, null, 2) + '\n');
  }
  console.log(`  ${targetLabel}: +${added} MFS entries`);
  return added;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 6: Exact dedup
// ─────────────────────────────────────────────────────────────────────────────
function dedupBranch(baseDir, label) {
  console.log(`--- ${label}: Exact dedup (case variants preserved) ---`);
  const driversDir = path.join(baseDir, 'drivers');
  let totalRemoved = 0;
  let driversModified = 0;

  for (const driver of fs.readdirSync(driversDir)) {
    const fpath = path.join(driversDir, driver, 'driver.compose.json');
    if (!fs.existsSync(fpath)) continue;
    try {
      const data = JSON.parse(Buffer.from(fs.readFileSync(fpath)).toString('utf8'));
      if (!data.zigbee || !Array.isArray(data.zigbee.manufacturerName)) continue;

      const seen = new Set();
      const unique = [];
      for (const mfr of data.zigbee.manufacturerName) {
        if (!mfr || typeof mfr !== 'string') continue;
        if (!seen.has(mfr)) {
          seen.add(mfr);
          unique.push(mfr);
        }
      }

      if (unique.length < data.zigbee.manufacturerName.length) {
        const removed = data.zigbee.manufacturerName.length - unique.length;
        totalRemoved += removed;
        data.zigbee.manufacturerName = unique;
        if (!DRY_RUN) {
          fs.writeFileSync(fpath, JSON.stringify(data, null, 2) + '\n');
        }
        driversModified++;
      }
    } catch (e) {}
  }

  console.log(`  Removed ${totalRemoved} duplicates from ${driversModified} drivers`);
  return { totalRemoved, driversModified };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
function main() {
  console.log('═══════════════════════════════════════════════════════════════');

  // Phase 1: Clean
  const cleanMaster = cleanBranch(MASTER, 'Master');
  const cleanStable = cleanBranch(STABLE, 'Stable');

  console.log('');

  // Phase 2: Dedup
  const dedupMaster = dedupBranch(MASTER, 'Master');
  const dedupStable = dedupBranch(STABLE, 'Stable');

  console.log('');

  // Phase 3: Sync MFRs bidirectionally
  console.log('--- Syncing MFRs: Master → Stable ---');
  const mfrToStable = syncMfrs(MASTER, STABLE, 'Master', 'Stable');

  console.log('');
  console.log('--- Syncing MFRs: Stable → Master ---');
  const mfrToMaster = syncMfrs(STABLE, MASTER, 'Stable', 'Master');

  console.log('');

  // Phase 4: Sync fingerprints
  console.log('--- Syncing fingerprints.json ---');
  const fpToStable = syncFingerprints(MASTER, STABLE, 'Master', 'Stable');
  const fpToMaster = syncFingerprints(STABLE, MASTER, 'Stable', 'Master');

  console.log('');

  // Phase 5: Sync mfs_db
  console.log('--- Syncing mfs_db.json ---');
  const mfsToStable = syncMfsDb(MASTER, STABLE, 'Master', 'Stable');
  const mfsToMaster = syncMfsDb(STABLE, MASTER, 'Stable', 'Master');

  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Clean master: ${cleanMaster.removedInvalid} invalid, ${cleanMaster.removedEmpty} empty`);
  console.log(`Clean stable: ${cleanStable.removedInvalid} invalid, ${cleanStable.removedEmpty} empty`);
  console.log(`Dedup master: ${dedupMaster.totalRemoved} duplicates`);
  console.log(`Dedup stable: ${dedupStable.totalRemoved} duplicates`);
  console.log(`MFRs master→stable: +${mfrToStable.totalAdded}`);
  console.log(`MFRs stable→master: +${mfrToMaster.totalAdded}`);
  console.log(`FP master→stable: +${fpToStable}`);
  console.log(`FP stable→master: +${fpToMaster}`);
  console.log(`MFS master→stable: +${mfsToStable}`);
  console.log(`MFS stable→master: +${mfsToMaster}`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (DRY_RUN) {
    console.log('\nDRY RUN — no files were modified');
  }
}

main();
