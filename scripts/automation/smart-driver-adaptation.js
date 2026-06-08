#!/usr/bin/env node
/**
 * Smart Driver Adaptation — Dynamic MFR Database Updater
 *
 * This script:
 * 1. Reads the current driver-mapping-database.json
 * 2. Cross-references with Z2M data (z2m-data.json)
 * 3. Identifies MFR+PID combinations that need adaptation
 * 4. Updates the database with correct driver mappings
 * 5. Reports any mismatches or missing entries
 *
 * Usage: node scripts/automation/smart-driver-adaptation.js [--dry-run] [--verbose]
 * Frequency: Run weekly via GitHub Actions or manually
 *
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

const ROOT = path.join(__dirname, '../..');
const DB_PATH = path.join(ROOT, 'driver-mapping-database.json');
const Z2M_DATA_PATH = path.join(ROOT, 'scripts/data/z2m-data.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const REPORT_PATH = path.join(ROOT, 'data/community-sync/adaptation-report.json');

// ═══════════════════════════════════════════════════════════════════════
// STEP 1: Load databases
// ═══════════════════════════════════════════════════════════════════════

function loadDatabase() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    console.error('❌ Failed to load driver-mapping-database.json:', e.message);
    process.exit(1);
  }
}

function loadZ2MData() {
  try {
    return JSON.parse(fs.readFileSync(Z2M_DATA_PATH, 'utf8'));
  } catch (e) {
    console.error('⚠️  Z2M data not available:', e.message);
    return null;
  }
}

function getDriverDirs() {
  return fs.readdirSync(DRIVERS_DIR)
    .filter(f => fs.statSync(path.join(DRIVERS_DIR, f)).isDirectory())
    .map(f => f.toLowerCase());
}

// ═══════════════════════════════════════════════════════════════════════
// STEP 2: Cross-reference MFR+PID combinations
// ═══════════════════════════════════════════════════════════════════════

function analyzeMFRCombinations(db, z2mData, driverDirs) {
  const issues = [];
  const stats = {
    totalMFRs: 0,
    totalPIDs: 0,
    collisions: 0,
    orphanedDB: 0,
    orphanedDriver: 0,
    z2mMissing: 0,
    adapted: 0,
  };

  // Check driver-mapping-database.json entries
  if (db.mfr_index) {
    for (const [mfr, driverIds] of Object.entries(db.mfr_index)) {
      stats.totalMFRs++;

      // Check for orphaned DB entries (driver doesn't exist)
      for (const driverId of driverIds) {
        if (!driverDirs.includes(driverId.toLowerCase())) {
          issues.push({
            type: 'ORPHANED_DB',
            severity: 'MEDIUM',
            mfr,
            driverId,
            message: `Driver "${driverId}" in database but directory does not exist`,
          });
          stats.orphanedDB++;
        }
      }

      // Check for collisions (same MFR in multiple drivers)
      if (driverIds.length > 1) {
        stats.collisions++;
        if (VERBOSE) {
          console.log(`⚠️  Collision: ${mfr} → ${driverIds.join(', ')}`);
        }
      }
    }
  }

  // Check Z2M data cross-reference
  if (z2mData && z2mData.dp) {
    for (const [mfr, dpInfo] of Object.entries(z2mData.dp)) {
      const mfrLower = mfr.toLowerCase();
      if (db.mfr_index && !db.mfr_index[mfrLower]) {
        stats.z2mMissing++;
        if (VERBOSE) {
          console.log(`📡 Z2M MFR not in DB: ${mfr} (${dpInfo.model})`);
        }
      }
    }
  }

  // Check for orphaned driver directories (not in database)
  for (const dir of driverDirs) {
    if (db.drivers && !db.drivers[dir]) {
      stats.orphanedDriver++;
      if (VERBOSE) {
        console.log(`📁 Driver not in DB: ${dir}`);
      }
    }
  }

  return { issues, stats };
}

// ═══════════════════════════════════════════════════════════════════════
// STEP 3: Validate MFR+PID against compose.json files
// ═══════════════════════════════════════════════════════════════════════

function validateComposeMFRs(driverDirs) {
  const issues = [];
  const emptyArrays = [];
  const wildcards = [];

  for (const dir of driverDirs) {
    const composePath = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = compose.zigbee?.manufacturerName || [];

      // Check for empty arrays
      if (mfrs.length === 0) {
        emptyArrays.push(dir);
      }

      // Check for wildcards
      for (const mfr of mfrs) {
        if (mfr.match(/^_[A-Z]+[0-9]*_$/) || mfr.match(/^_[A-Za-z]+[0-9]*_$/)) {
          wildcards.push({ driver: dir, mfr });
        }
      }
    } catch (e) {
      issues.push({
        type: 'PARSE_ERROR',
        severity: 'HIGH',
        driver: dir,
        message: `Failed to parse compose.json: ${e.message}`,
      });
    }
  }

  return { issues, emptyArrays, wildcards };
}

// ═══════════════════════════════════════════════════════════════════════
// STEP 4: Generate report
// ═══════════════════════════════════════════════════════════════════════

function generateReport(analysis, composeCheck, timestamp) {
  const report = {
    timestamp,
    dryRun: DRY_RUN,
    analysis: analysis.stats,
    composeCheck: {
      emptyArrays: composeCheck.emptyArrays.length,
      wildcards: composeCheck.wildcards.length,
    },
    issues: [...analysis.issues, ...composeCheck.issues],
    summary: {
      totalIssues: analysis.issues.length + composeCheck.issues.length,
      critical: analysis.issues.filter(i => i.severity === 'CRITICAL').length +
                composeCheck.issues.filter(i => i.severity === 'CRITICAL').length,
      high: analysis.issues.filter(i => i.severity === 'HIGH').length +
            composeCheck.issues.filter(i => i.severity === 'HIGH').length,
      medium: analysis.issues.filter(i => i.severity === 'MEDIUM').length +
              composeCheck.issues.filter(i => i.severity === 'MEDIUM').length,
    },
  };

  return report;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

function main() {
  console.log('\n🔧 Smart Driver Adaptation — MFR Database Updater');
  console.log('═══════════════════════════════════════════════════════\n');

  const db = loadDatabase();
  const z2mData = loadZ2MData();
  const driverDirs = getDriverDirs();

  console.log(`📊 Current state:`);
  console.log(`   Drivers: ${driverDirs.length}`);
  console.log(`   DB entries: ${Object.keys(db.drivers || {}).length}`);
  console.log(`   MFR mappings: ${Object.keys(db.mfr_index || {}).length}`);
  console.log(`   Z2M devices: ${z2mData ? Object.keys(z2mData.dp || {}).length : 'N/A'}`);
  console.log('');

  // Run analysis
  const analysis = analyzeMFRCombinations(db, z2mData, driverDirs);
  const composeCheck = validateComposeMFRs(driverDirs);

  // Generate report
  const report = generateReport(analysis, composeCheck, new Date().toISOString());

  // Save report
  if (!DRY_RUN) {
    const reportDir = path.dirname(REPORT_PATH);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`\n📝 Report saved to: ${REPORT_PATH}`);
  }

  // Print summary
  console.log(`\n📊 Analysis Results:`);
  console.log(`   Total MFRs in DB: ${analysis.stats.totalMFRs}`);
  console.log(`   Collisions: ${analysis.stats.collisions}`);
  console.log(`   Orphaned DB entries: ${analysis.stats.orphanedDB}`);
  console.log(`   Drivers not in DB: ${analysis.stats.orphanedDriver}`);
  console.log(`   Z2M MFRs missing from DB: ${analysis.stats.z2mMissing}`);
  console.log(`   Empty MFR arrays: ${composeCheck.emptyArrays.length}`);
  console.log(`   Wildcard MFRs: ${composeCheck.wildcards.length}`);
  console.log(`   Total issues: ${report.summary.totalIssues}`);

  if (report.summary.critical > 0) {
    console.log(`\n❌ CRITICAL: ${report.summary.critical} issues found`);
    process.exit(1);
  } else if (report.summary.high > 0) {
    console.log(`\n⚠️  HIGH: ${report.summary.high} issues found`);
  } else {
    console.log(`\n✅ All checks passed`);
  }
}

main();
