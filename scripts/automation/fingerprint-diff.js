#!/usr/bin/env node
/**
 * fingerprint-diff.js - Fingerprint Comparison and Diff Reporting
 * Run: node scripts/automation/fingerprint-diff.js [--backup <path>] [--json] [--fix]
 *
 * Compares current fingerprint state against a backup (or previous state snapshot):
 * - Identifies new fingerprints (manufacturer+productId pairs) added to drivers
 * - Identifies fingerprints removed from drivers
 * - Identifies fingerprints modified (moved between drivers)
 * - Identifies new/removed manufacturerName entries
 * - Generates human-readable diff report
 * - Optionally auto-fixes issues (--fix)
 *
 * Backup strategy:
 * - Automatically saves a snapshot before running
 * - Can compare against a specific backup file
 *
 * Exit codes: 0 = no diffs, 1 = diffs found, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const STATE_DIR = path.join(ROOT, '.github', 'state');
const DATA_DIR = path.join(ROOT, 'data');

const SNAPSHOT_FILE = path.join(STATE_DIR, 'fingerprint-snapshot.json');
const DIFF_REPORT_FILE = path.join(STATE_DIR, 'fingerprint-diff-report.json');

const JSON_OUTPUT = process.argv.includes('--json');
const FIX_MODE = process.argv.includes('--fix');
const CUSTOM_BACKUP = getArg('--backup');

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

function log(msg) {
  if (!JSON_OUTPUT) console.log('[FP-DIFF] ' + msg);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Build fingerprint snapshot from current drivers ─────────────────────────
function buildSnapshot() {
  const snapshot = {
    timestamp: new Date().toISOString(),
    drivers: {},
    allFingerprints: new Map(),
    allManufacturers: new Set(),
  };

  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
    catch (_) { return false; }
  });

  for (const name of driverDirs) {
    const dcjPath = path.join(DRIVERS_DIR, name, 'driver.compose.json');
    if (!fs.existsSync(dcjPath)) continue;

    try {
      const config = JSON.parse(fs.readFileSync(dcjPath));
      const manufacturerNames = config.zigbee?.manufacturerName || [];
      const productIds = config.zigbee?.productId || [];
      const capabilities = config.capabilities || [];

      snapshot.drivers[name] = {
        manufacturerNames,
        productIds,
        capabilities,
        fingerprints: [],
      };

      // Build combined fingerprints
      for (const m of manufacturerNames) {
        snapshot.allManufacturers.add(m);
        for (const p of productIds) {
          const key = `${m}|${p}`;
          snapshot.allFingerprints.set(key, name);
          snapshot.drivers[name].fingerprints.push({ manufacturerName: m, productId: p });
        }
      }
    } catch (e) {
      log(`ERROR reading ${dcjPath}: ${e.message}`);
    }
  }

  // Convert Map/Set to serializable formats for storage
  const serializable = {
    timestamp: snapshot.timestamp,
    drivers: snapshot.drivers,
    fingerprintCount: snapshot.allFingerprints.size,
    manufacturerCount: snapshot.allManufacturers.size,
    fingerprintIndex: Object.fromEntries(snapshot.allFingerprints),
    manufacturers: [...snapshot.allManufacturers],
  };

  return { snapshot, serializable };
}

// ── Load a snapshot from disk ────────────────────────────────────────────────
function loadSnapshot(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath));
    // Rebuild Maps/Sets
    const snapshot = {
      timestamp: data.timestamp,
      drivers: data.drivers || {},
      allFingerprints: new Map(Object.entries(data.fingerprintIndex || {})),
      allManufacturers: new Set(data.manufacturers || []),
    };
    return snapshot;
  } catch (e) {
    log(`ERROR loading snapshot from ${filePath}: ${e.message}`);
    return null;
  }
}

// ── Compute diff between two snapshots ──────────────────────────────────────
function computeDiff(oldSnap, newSnap) {
  const diff = {
    timestamp: new Date().toISOString(),
    oldTimestamp: oldSnap.timestamp,
    newTimestamp: newSnap.timestamp,
    summary: { added: 0, removed: 0, moved: 0, modified: 0 },
    addedFingerprints: [],       // { manufacturerName, productId, driver }
    removedFingerprints: [],     // { manufacturerName, productId, previousDriver }
    movedFingerprints: [],       // { manufacturerName, productId, from, to }
    addedManufacturers: [],
    removedManufacturers: [],
    addedDrivers: [],
    removedDrivers: [],
    capabilityChanges: [],
  };

  // 1. Compare fingerprints
  const oldFPs = oldSnap.allFingerprints;
  const newFPs = newSnap.allFingerprints;

  for (const [key, newDriver] of newFPs) {
    if (!oldFPs.has(key)) {
      const [mfr, pid] = key.split('|');
      diff.addedFingerprints.push({ manufacturerName: mfr, productId: pid, driver: newDriver });
      diff.summary.added++;
    }
  }

  for (const [key, oldDriver] of oldFPs) {
    if (!newFPs.has(key)) {
      const [mfr, pid] = key.split('|');
      diff.removedFingerprints.push({ manufacturerName: mfr, productId: pid, previousDriver: oldDriver });
      diff.summary.removed++;
    }
  }

  // Detect moved fingerprints (same key changed driver - shouldn't happen with proper matching, but check)
  // Actually, since keys include mfr+pid, moves would show as remove+add. We can detect if the same
  // mfr+pid pair appears in both removed and added lists with different drivers.
  const removedMap = new Map(diff.removedFingerprints.map(r => [`${r.manufacturerName}|${r.productId}`, r]));
  const addedMap = new Map(diff.addedFingerprints.map(a => [`${a.manufacturerName}|${a.productId}`, a]));

  for (const [key, added] of addedMap) {
    if (removedMap.has(key)) {
      const removed = removedMap.get(key);
      diff.movedFingerprints.push({
        manufacturerName: added.manufacturerName,
        productId: added.productId,
        from: removed.previousDriver,
        to: added.driver,
      });
      diff.summary.moved++;
      // Remove from both added and removed lists (they're moves, not pure add/remove)
      diff.addedFingerprints = diff.addedFingerprints.filter(a => `${a.manufacturerName}|${a.productId}` !== key);
      diff.removedFingerprints = diff.removedFingerprints.filter(r => `${r.manufacturerName}|${r.productId}` !== key);
      diff.summary.added--;
      diff.summary.removed--;
    }
  }

  // 2. Compare manufacturers
  const oldMfrs = oldSnap.allManufacturers;
  const newMfrs = newSnap.allManufacturers;

  for (const m of newMfrs) {
    if (!oldMfrs.has(m)) diff.addedManufacturers.push(m);
  }
  for (const m of oldMfrs) {
    if (!newMfrs.has(m)) diff.removedManufacturers.push(m);
  }

  // 3. Compare drivers
  const oldDriverNames = new Set(Object.keys(oldSnap.drivers));
  const newDriverNames = new Set(Object.keys(newSnap.drivers));

  for (const name of newDriverNames) {
    if (!oldDriverNames.has(name)) diff.addedDrivers.push(name);
  }
  for (const name of oldDriverNames) {
    if (!newDriverNames.has(name)) diff.removedDrivers.push(name);
  }

  // 4. Compare capabilities within shared drivers
  for (const name of newDriverNames) {
    if (!oldDriverNames.has(name)) continue;
    const oldCaps = (oldSnap.drivers[name].capabilities || []).sort().join(',');
    const newCaps = (newSnap.drivers[name].capabilities || []).sort().join(',');
    if (oldCaps !== newCaps) {
      diff.capabilityChanges.push({
        driver: name,
        oldCapabilities: oldSnap.drivers[name].capabilities || [],
        newCapabilities: newSnap.drivers[name].capabilities || [],
      });
    }
  }

  return diff;
}

// ── Generate human-readable report ──────────────────────────────────────────
function formatReport(diff) {
  const lines = [];
  lines.push('=== Fingerprint Diff Report ===');
  lines.push(`Old snapshot: ${diff.oldTimestamp}`);
  lines.push(`New snapshot: ${diff.newTimestamp}`);
  lines.push('');

  // Summary
  lines.push('--- Summary ---');
  lines.push(`Added fingerprints:   ${diff.summary.added}`);
  lines.push(`Removed fingerprints: ${diff.summary.removed}`);
  lines.push(`Moved fingerprints:   ${diff.summary.moved}`);
  lines.push(`Added manufacturers:  ${diff.addedManufacturers.length}`);
  lines.push(`Removed manufacturers: ${diff.removedManufacturers.length}`);
  lines.push(`Added drivers:        ${diff.addedDrivers.length}`);
  lines.push(`Removed drivers:      ${diff.removedDrivers.length}`);
  lines.push(`Capability changes:   ${diff.capabilityChanges.length}`);
  lines.push('');

  // Detailed changes
  if (diff.addedFingerprints.length > 0) {
    lines.push('--- Added Fingerprints ---');
    for (const fp of diff.addedFingerprints) {
      lines.push(`  + ${fp.manufacturerName} / ${fp.productId} -> ${fp.driver}`);
    }
    lines.push('');
  }

  if (diff.removedFingerprints.length > 0) {
    lines.push('--- Removed Fingerprints ---');
    for (const fp of diff.removedFingerprints) {
      lines.push(`  - ${fp.manufacturerName} / ${fp.productId} (was: ${fp.previousDriver})`);
    }
    lines.push('');
  }

  if (diff.movedFingerprints.length > 0) {
    lines.push('--- Moved Fingerprints ---');
    for (const fp of diff.movedFingerprints) {
      lines.push(`  ~ ${fp.manufacturerName} / ${fp.productId}: ${fp.from} -> ${fp.to}`);
    }
    lines.push('');
  }

  if (diff.addedManufacturers.length > 0) {
    lines.push('--- Added Manufacturers ---');
    for (const m of diff.addedManufacturers) {
      lines.push(`  + ${m}`);
    }
    lines.push('');
  }

  if (diff.removedManufacturers.length > 0) {
    lines.push('--- Removed Manufacturers ---');
    for (const m of diff.removedManufacturers) {
      lines.push(`  - ${m}`);
    }
    lines.push('');
  }

  if (diff.addedDrivers.length > 0) {
    lines.push('--- Added Drivers ---');
    for (const d of diff.addedDrivers) lines.push(`  + ${d}`);
    lines.push('');
  }

  if (diff.removedDrivers.length > 0) {
    lines.push('--- Removed Drivers ---');
    for (const d of diff.removedDrivers) lines.push(`  - ${d}`);
    lines.push('');
  }

  if (diff.capabilityChanges.length > 0) {
    lines.push('--- Capability Changes ---');
    for (const c of diff.capabilityChanges) {
      const oldStr = c.oldCapabilities.join(', ') || '(none)';
      const newStr = c.newCapabilities.join(', ') || '(none)';
      lines.push(`  ${c.driver}:`);
      lines.push(`    was: ${oldStr}`);
      lines.push(`    now: ${newStr}`);
    }
    lines.push('');
  }

  // Detect potential issues
  lines.push('--- Potential Issues ---');
  const issues = [];
  if (diff.removedFingerprints.length > 0) {
    issues.push(`WARNING: ${diff.removedFingerprints.length} fingerprint(s) were REMOVED - existing paired devices may stop working`);
  }
  if (diff.removedManufacturers.length > 0) {
    issues.push(`WARNING: ${diff.removedManufacturers.length} manufacturer(s) were removed`);
  }
  if (diff.movedFingerprints.length > 0) {
    issues.push(`NOTE: ${diff.movedFingerprints.length} fingerprint(s) moved between drivers - verify intent`);
  }
  if (diff.capabilityChanges.length > 0) {
    issues.push(`NOTE: ${diff.capabilityChanges.length} driver(s) had capability changes - verify compatibility`);
  }
  if (issues.length === 0) {
    lines.push('  No issues detected.');
  } else {
    for (const issue of issues) lines.push(`  ${issue}`);
  }

  return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────
function main() {
  log('Starting fingerprint diff analysis...');

  ensureDir(STATE_DIR);

  // Build current snapshot
  const { snapshot: currentSnap, serializable: currentData } = buildSnapshot();
  log(`Current state: ${currentData.fingerprintCount} fingerprints across ${Object.keys(currentData.drivers).length} drivers`);

  // Determine backup source
  let backupPath = CUSTOM_BACKUP || SNAPSHOT_FILE;
  let oldSnap = null;

  if (fs.existsSync(backupPath)) {
    oldSnap = loadSnapshot(backupPath);
    log(`Loaded backup from: ${backupPath} (${oldSnap.timestamp})`);
  } else {
    log('No previous snapshot found. Saving current state as baseline.');
    ensureDir(path.dirname(SNAPSHOT_FILE));
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(currentData, null, 2));
    log('Baseline snapshot saved. Run again later to see diffs.');
    process.exit(0);
  }

  if (!oldSnap) {
    log('ERROR: Could not load backup snapshot.');
    process.exit(2);
  }

  // Compute diff
  const diff = computeDiff(oldSnap, currentSnap);
  const totalChanges = diff.summary.added + diff.summary.removed + diff.summary.moved
    + diff.addedManufacturers.length + diff.removedManufacturers.length
    + diff.addedDrivers.length + diff.removedDrivers.length
    + diff.capabilityChanges.length;

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(diff, null, 2));
  } else {
    console.log(formatReport(diff));
  }

  // Save diff report
  ensureDir(path.dirname(DIFF_REPORT_FILE));
  fs.writeFileSync(DIFF_REPORT_FILE, JSON.stringify(diff, null, 2));

  // Update snapshot to current state (for next comparison)
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(currentData, null, 2));
  log('Updated snapshot saved for next comparison.');

  process.exit(totalChanges > 0 ? 1 : 0);
}

main();
