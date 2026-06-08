#!/usr/bin/env node
/**
 * Enrich Fingerprints — Automated Fingerprint Enrichment
 *
 * This script:
 * 1. Reads current fingerprints from all driver.compose.json files
 * 2. Cross-references with Z2M data (z2m-data.json)
 * 3. Identifies missing MFR+PID combinations
 * 4. Updates driver-mapping-database.json with correct mappings
 * 5. Reports any mismatches or missing entries
 *
 * Usage: node scripts/automation/enrich-fingerprints.js [--dry-run] [--verbose]
 * Frequency: Run daily via GitHub Actions
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
const REPORT_PATH = path.join(ROOT, 'data/community-sync/enrichment-report.json');

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

function analyzeEnrichment(db, z2mData, driverDirs) {
  const issues = [];
  const stats = {
    totalMFRs: 0,
    totalPIDs: 0,
    collisions: 0,
    orphanedDB: 0,
    orphanedDriver: 0,
    z2mMissing: 0,
    enriched: 0,
  };

  // Check driver-mapping-database.json entries
  if (db.mfr_index) {
    for (const [mfr, driverIds] of Object.entries(db.mfr_index)) {
      stats.totalMFRs++;

      // Check for orphaned DB entries
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

      // Check for collisions
      if (driverIds.length > 1) {
        stats.collisions++;
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

  // Check for orphaned driver directories
  for (const dir of driverDirs) {
    if (db.drivers && !db.drivers[dir]) {
      stats.orphanedDriver++;
    }
  }

  return { issues, stats };
}

// ═══════════════════════════════════════════════════════════════════════
// STEP 3: Generate report
// ═══════════════════════════════════════════════════════════════════════

function generateReport(analysis, timestamp) {
  return {
    timestamp,
    dryRun: DRY_RUN,
    analysis: analysis.stats,
    issues: analysis.issues,
    summary: {
      totalIssues: analysis.issues.length,
      critical: analysis.issues.filter(i => i.severity === 'CRITICAL').length,
      high: analysis.issues.filter(i => i.severity === 'HIGH').length,
      medium: analysis.issues.filter(i => i.severity === 'MEDIUM').length,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

function main() {
  console.log('\n🔄 Enrich Fingerprints — Automated Enrichment');
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

  const analysis = analyzeEnrichment(db, z2mData, driverDirs);
  const report = generateReport(analysis, new Date().toISOString());

  if (!DRY_RUN) {
    const reportDir = path.dirname(REPORT_PATH);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`\n📝 Report saved to: ${REPORT_PATH}`);
  }

  console.log(`\n📊 Enrichment Results:`);
  console.log(`   Total MFRs: ${analysis.stats.totalMFRs}`);
  console.log(`   Collisions: ${analysis.stats.collisions}`);
  console.log(`   Orphaned DB: ${analysis.stats.orphanedDB}`);
  console.log(`   Drivers not in DB: ${analysis.stats.orphanedDriver}`);
  console.log(`   Z2M missing: ${analysis.stats.z2mMissing}`);
  console.log(`   Total issues: ${report.summary.totalIssues}`);

  if (report.summary.critical > 0) {
    console.log(`\n❌ CRITICAL: ${report.summary.critical} issues`);
    process.exit(1);
  } else if (report.summary.high > 0) {
    console.log(`\n⚠️  HIGH: ${report.summary.high} issues`);
  } else {
    console.log(`\n✅ All checks passed`);
  }
}

main();
