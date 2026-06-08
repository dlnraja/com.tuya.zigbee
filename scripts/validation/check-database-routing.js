#!/usr/bin/env node
/**
 * check-database-routing.js
 *
 * Validates that every entry in driver-mapping-database.json points to an
 * existing driver directory. Catches stale/orphaned database entries that
 * route devices to non-existent drivers.
 *
 * Bug category: #2 (Database routing mismatches)
 * Severity: ERROR — devices routed to wrong/non-existent drivers
 *
 * Usage: node scripts/validation/check-database-routing.js [--verbose]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');

// Load database
const dbPath = path.join(__dirname, '..', '..', 'driver-mapping-database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Get all existing driver directories
const driversDir = path.join(__dirname, '..', '..', 'drivers');
const existingDrivers = new Set(
  fs.readdirSync(driversDir)
    .filter(f => fs.statSync(path.join(driversDir, f)).isDirectory())
    .map(f => f.toLowerCase())
);

let totalIssues = 0;
const issues = [];

// Check mfr_index entries
if (db.mfr_index) {
  for (const [mfr, driverIds] of Object.entries(db.mfr_index)) {
    for (const driverId of driverIds) {
      if (!existingDrivers.has(driverId.toLowerCase())) {
        issues.push({
          type: 'ORPHANED',
          mfr,
          driverId,
          message: `Driver "${driverId}" does not exist`,
        });
        totalIssues++;
      }
    }
  }
}

// Check pid_index entries
if (db.pid_index) {
  for (const [pid, driverIds] of Object.entries(db.pid_index)) {
    for (const driverId of driverIds) {
      if (!existingDrivers.has(driverId.toLowerCase())) {
        issues.push({
          type: 'ORPHANED_PID',
          pid,
          driverId,
          message: `Driver "${driverId}" does not exist for PID "${pid}"`,
        });
        totalIssues++;
      }
    }
  }
}

// Check drivers entries
if (db.drivers) {
  for (const [driverId, info] of Object.entries(db.drivers)) {
    if (!existingDrivers.has(driverId.toLowerCase())) {
      issues.push({
        type: 'ORPHANED_DRIVER',
        driverId,
        message: `Driver "${driverId}" in database but directory does not exist`,
      });
      totalIssues++;
    }
  }
}

// Report
console.log('\n═══════════════════════════════════════════════════════');
console.log('  DATABASE ROUTING VALIDATOR');
console.log('═══════════════════════════════════════════════════════');
console.log(`  Existing drivers: ${existingDrivers.size}`);
console.log(`  Database entries checked: ${Object.keys(db.mfr_index || {}).length + Object.keys(db.pid_index || {}).length}`);
console.log(`  Issues found: ${totalIssues}`);

if (issues.length > 0) {
  console.log('\n  ❌ FAILED — Orphaned database entries:');
  for (const issue of issues) {
    console.log(`    [${issue.type}] ${issue.message}`);
    if (verbose) {
      console.log(`      MFR/PID: ${issue.mfr || issue.pid || issue.driverId}`);
    }
  }
  process.exit(1);
} else {
  console.log('\n  ✅ PASSED — All database entries point to existing drivers');
  process.exit(0);
}
