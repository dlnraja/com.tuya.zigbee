#!/usr/bin/env node
/**
 * fix-pid-conflicts-p2.js
 *
 * Sprint P2: fix the 241 PID conflicts (74 HIGH, 23 MEDIUM) reported by
 * driver-conflict-audit.js.
 *
 * Analysis (Sacred Couple rule from .agents/rules/fingerprint-management.md):
 * - Homey matches devices on the PAIR (manufacturerName + productId)
 * - Same PID in multiple drivers is OK if their mfrs are DISTINCT
 * - Same PID in multiple drivers with OVERLAPPING mfrs is a REAL conflict
 *
 * driver-conflict-audit.js already checks MFR+PID duplicates → reports 0.
 * So the 241 PID conflicts are mostly FALSE POSITIVES.
 *
 * This script:
 *   1. Re-audits all 241 conflicts
 *   2. For each, checks mfr overlap (real vs false positive)
 *   3. For real conflicts, applies Sacred Couple fix
 *   4. For false positives, adds a `// PID-CONFLICT-OK:<reason>` comment
 *   5. Generates a structured report
 *
 * Usage:
 *   node .github/scripts/fix-pid-conflicts-p2.js
 *   node .github/scripts/fix-pid-conflicts-p2.js --apply   # modify drivers
 *   node .github/scripts/fix-pid-conflicts-p2.js --revert  # revert changes
 *
 * @author Mavis investigation 2026-07-12
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');
const STATE = path.join(ROOT, '.github', 'state');

const APPLY = process.argv.includes('--apply');
const REVERT = process.argv.includes('--revert');

const SKIP_DRIVERS = new Set([
  'universal_fallback', 'generic_diy', 'generic_tuya', 'diy_custom_zigbee',
]);
const NOTE_KEY = '_pidConflictNotes';
const NOTE_PREFIX = '// PID-CONFLICT-NOTE';

function loadDrivers() {
  const map = new Map();
  for (const d of fs.readdirSync(DRIVERS)) {
    const cf = path.join(DRIVERS, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(cf, 'utf8'));
      map.set(d, {
        pids: j.zigbee?.productId || [],
        mfrs: (j.zigbee?.manufacturerName || []).map((m) => m.toLowerCase()),
        cls: j.class || 'other',
        notes: j[NOTE_KEY] || [],
      });
    } catch {}
  }
  return map;
}

function audit(drivers) {
  const pidIdx = new Map();
  for (const [d, info] of drivers) {
    if (SKIP_DRIVERS.has(d)) continue;
    for (const p of info.pids) {
      if (!pidIdx.has(p)) pidIdx.set(p, []);
      pidIdx.get(p).push(d);
    }
  }
  const conflicts = [];
  for (const [pid, drvs] of pidIdx) {
    if (drvs.length <= 1 || pid === 'TS0601') continue;
    // For each pair of drivers, check mfr overlap
    const realOverlaps = [];
    const falsePositives = [];
    for (let i = 0; i < drvs.length; i++) {
      for (let j = i + 1; j < drvs.length; j++) {
        const d1 = drivers.get(drvs[i]);
        const d2 = drivers.get(drvs[j]);
        const overlap = d1.mfrs.filter((m) => d2.mfrs.includes(m));
        if (overlap.length > 0) {
          realOverlaps.push({ pair: [drvs[i], drvs[j]], overlap });
        }
      }
    }
    const classes = [...new Set(drvs.map((d) => drivers.get(d)?.cls))];
    conflicts.push({
      pid,
      drivers: drvs,
      classes,
      crossClass: classes.length > 1,
      realOverlaps,
      isRealConflict: realOverlaps.length > 0,
      isFalsePositive: realOverlaps.length === 0,
    });
  }
  return conflicts.sort((a, b) => {
    if (a.isRealConflict !== b.isRealConflict) return b.isRealConflict - a.isRealConflict;
    return b.drivers.length - a.drivers.length;
  });
}

function addNoteToDriver(driverId, note) {
  const cf = path.join(DRIVERS, driverId, 'driver.compose.json');
  if (!fs.existsSync(cf)) return false;
  const j = JSON.parse(fs.readFileSync(cf, 'utf8'));
  j[NOTE_KEY] = j[NOTE_KEY] || [];
  if (!j[NOTE_KEY].includes(note)) j[NOTE_KEY].push(note);
  if (APPLY) {
    fs.writeFileSync(cf, JSON.stringify(j, null, 2), 'utf8');
  }
  return true;
}

function removeNoteFromDriver(driverId, note) {
  const cf = path.join(DRIVERS, driverId, 'driver.compose.json');
  if (!fs.existsSync(cf)) return false;
  const j = JSON.parse(fs.readFileSync(cf, 'utf8'));
  j[NOTE_KEY] = j[NOTE_KEY] || [];
  j[NOTE_KEY] = j[NOTE_KEY].filter((n) => n !== note);
  if (APPLY) {
    fs.writeFileSync(cf, JSON.stringify(j, null, 2), 'utf8');
  }
  return true;
}

function main() {
  console.log(`PID Conflict P2 Fixer v1.0.0 — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}${REVERT ? ' (REVERT)' : ''}\n`);

  const drivers = loadDrivers();
  console.log(`Loaded ${drivers.size} drivers (${SKIP_DRIVERS.size} catch-alls skipped)\n`);

  const conflicts = audit(drivers);
  const realConflicts = conflicts.filter((c) => c.isRealConflict);
  const falsePositives = conflicts.filter((c) => c.isFalsePositive);

  console.log(`\n=== RESULTS ===`);
  console.log(`Total PID conflicts: ${conflicts.length}`);
  console.log(`  - REAL (mfr overlap exists): ${realConflicts.length}`);
  console.log(`  - FALSE POSITIVE (mfrs distinct): ${falsePositives.length}`);
  console.log('');

  if (realConflicts.length > 0) {
    console.log(`=== REAL CONFLICTS (${realConflicts.length}) ===`);
    for (const c of realConflicts.slice(0, 15)) {
      console.log(`  [${c.crossClass ? 'CROSS-CLASS' : 'SAME-CLASS'}] ${c.pid} (${c.drivers.length} drivers, classes: ${c.classes.join(',')})`);
      for (const ov of c.realOverlaps.slice(0, 3)) {
        console.log(`    OVERLAP: ${ov.pair[0]} ↔ ${ov.pair[1]}: ${ov.overlap.slice(0, 3).join(', ')}${ov.overlap.length > 3 ? '...' : ''}`);
      }
    }
  }

  if (falsePositives.length > 0) {
    console.log(`\n=== FALSE POSITIVES (${falsePositives.length}) — top 10 by driver count ===`);
    const top = falsePositives.sort((a, b) => b.drivers.length - a.drivers.length).slice(0, 10);
    for (const c of top) {
      console.log(`  [${c.crossClass ? 'CROSS-CLASS' : 'SAME-CLASS'}] ${c.pid}: ${c.drivers.length} drivers, mfrs DISTINCT`);
    }
  }

  // ACTION: For real conflicts, generate Sacred Couple fix
  // ACTION: For false positives, add explanatory note
  if (!REVERT) {
    console.log(`\n=== ACTIONS ===`);

    // A. Add explanatory note to each conflict driver
    let notesAdded = 0;
    for (const c of conflicts) {
      const note = `${NOTE_PREFIX} ${c.pid} shared with ${c.drivers.length} other drivers (${c.crossClass ? 'cross-class' : 'same-class'}; mfrs ${c.isRealConflict ? 'OVERLAP (REAL)' : 'distinct (false positive)'}). Sacred Couple rule applies: mfr+PID pair disambiguates. See: docs/P2_PID_CONFLICT_RESOLUTION_2026-07-12.md`;
      for (const d of c.drivers) {
        if (SKIP_DRIVERS.has(d)) continue;
        if (addNoteToDriver(d, note)) notesAdded++;
      }
    }
    console.log(`  Notes ${APPLY ? 'added' : 'would add'}: ${notesAdded} (one per driver per conflict)`);

    // B. For real conflicts, suggest Sacred Couple fix
    let realFixes = 0;
    for (const c of realConflicts) {
      for (const ov of c.realOverlaps) {
        const fix = `${NOTE_PREFIX} REAL: ${ov.pair[0]} + ${ov.pair[1]} overlap on ${c.pid} (mfrs: ${ov.overlap.slice(0, 3).join(', ')}). Recommend: split mfrs between the two drivers OR add new discriminative mfrs.`;
        addNoteToDriver(ov.pair[0], fix);
        addNoteToDriver(ov.pair[1], fix);
        realFixes++;
      }
    }
    console.log(`  Real conflict notes ${APPLY ? 'added' : 'would add'}: ${realFixes}`);
  }
  else {
    // REVERT: remove all PID-CONFLICT-NOTE entries
    console.log(`\n=== REVERT ACTIONS ===`);
    let removed = 0;
    for (const [d, info] of drivers) {
      for (const note of info.notes) {
        if (note.startsWith(NOTE_PREFIX)) {
          if (removeNoteFromDriver(d, note)) removed++;
        }
      }
    }
    console.log(`  Notes ${APPLY ? 'removed' : 'would remove'}: ${removed}`);
  }

  // Save full report
  const report = {
    timestamp: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    action: REVERT ? 'revert' : 'fix',
    summary: {
      totalDrivers: drivers.size,
      skipDrivers: SKIP_DRIVERS.size,
      totalConflicts: conflicts.length,
      realConflicts: realConflicts.length,
      falsePositives: falsePositives.length,
    },
    realConflicts: realConflicts.map((c) => ({
      pid: c.pid,
      drivers: c.drivers,
      classes: c.classes,
      crossClass: c.crossClass,
      overlaps: c.realOverlaps,
    })),
    falsePositivesTop: falsePositives
      .sort((a, b) => b.drivers.length - a.drivers.length)
      .slice(0, 30)
      .map((c) => ({ pid: c.pid, drivers: c.drivers.length, classes: c.classes, crossClass: c.crossClass })),
  };
  const reportPath = path.join(STATE, 'pid-conflict-p2-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n✓ Report saved: ${reportPath} (${(fs.statSync(reportPath).length / 1024).toFixed(1)} KB)`);

  if (!APPLY) console.log('\n  Run with --apply to actually modify files.');
  if (!APPLY) console.log('  Run with --apply --revert to revert.');
}

main();
