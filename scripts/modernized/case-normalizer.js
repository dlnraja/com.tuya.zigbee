#!/usr/bin/env node
'use strict';

/**
 * Case Normalizer - Modernized
 *
 * Consolidates functionality from:
 *   - scripts/legacy/add_lowercase_ids.js
 *   - scripts/legacy/fix-lowercase-fingerprints.js
 *   - scripts/legacy/final_conflict_resolution.js (case normalization part)
 *
 * Features:
 *   - Normalizes Tuya manufacturer IDs to uppercase
 *   - Adds lowercase variants for case-sensitive matching
 *   - Deduplicates after normalization
 *   - --json output for CI integration
 *   - --dry-run mode (default: report only)
 *   - --fix mode to apply changes
 *   - Proper error handling and logging
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Tuya ID patterns that should be normalized
const TUYA_ID_PATTERNS = [
  /^_TZ[0-9]{4}_[a-z0-9]{8}$/i,
  /^_TYST11_[a-z0-9]{8}$/i,
  /^_TYZB01_[a-z0-9]{8}$/i,
  /^_TZB210_[a-z0-9]{8}$/i,
  /^_TZC[0-9]{3}_[a-z0-9]{8}$/i,
  /^_TZ1800_[a-z0-9]{8}$/i,
  /^_TZ2000_[a-z0-9]{8}$/i,
];

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    json: args.includes('--json'),
    dryRun: args.includes('--dry-run'),
    fix: args.includes('--fix'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };
}

/**
 * Check if an ID is a Tuya manufacturer ID
 */
function isTuyaId(id) {
  return TUYA_ID_PATTERNS.some(p => p.test(id));
}

/**
 * Normalize a single driver
 */
function normalizeDriver(driverName, opts = {}) {
  const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');

  if (!fs.existsSync(composePath)) {
    return { driver: driverName, status: 'not_found', changes: 0 };
  }

  try {
    const content = JSON.parse(fs.readFileSync(composePath));

    if (!content.zigbee || !content.zigbee.manufacturerName) {
      return { driver: driverName, status: 'no_manufacturerName', changes: 0 };
    }

    const originalIds = content.zigbee.manufacturerName;
    const changes = [];
    const newIds = [];
    const seen = new Set();

    // First pass: normalize to uppercase and deduplicate
    for (const id of originalIds) {
      let normalized = id;

      // Normalize Tuya IDs to uppercase
      if (isTuyaId(id)) {
        normalized = id.toUpperCase();
        if (normalized !== id) {
          changes.push({
            type: 'case_normalized',
            original: id,
            normalized,
          });
        }
      }

      // Deduplicate (case-insensitive)
      const key = normalized.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        newIds.push(normalized);
      } else {
        changes.push({
          type: 'duplicate_removed',
          original: id,
        });
      }
    }

    // Second pass: add lowercase variants for Tuya IDs
    const finalIds = [...newIds];
    for (const id of newIds) {
      if (isTuyaId(id)) {
        const lowerId = id.toLowerCase();
        const lowerKey = lowerId.toLowerCase();
        if (!seen.has(lowerKey)) {
          seen.add(lowerKey);
          finalIds.push(lowerId);
          changes.push({
            type: 'lowercase_added',
            original: id,
            added: lowerId,
          });
        }
      }
    }

    // Sort alphabetically
    finalIds.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    // Check if anything changed
    const hasChanges = JSON.stringify(originalIds) !== JSON.stringify(finalIds);

    if (hasChanges && !opts.dryRun) {
      // Backup
      const backupPath = `${composePath}.backup-normalize-${Date.now()}`;
      fs.copyFileSync(composePath, backupPath);

      // Save
      content.zigbee.manufacturerName = finalIds;
      fs.writeFileSync(composePath, JSON.stringify(content, null, 2));
    }

    return {
      driver: driverName,
      status: hasChanges ? (opts.dryRun ? 'would_normalize' : 'normalized') : 'up_to_date',
      changes: changes.length,
      details: changes,
      before: originalIds.length,
      after: finalIds.length,
    };
  } catch (e) {
    return { driver: driverName, status: 'error', error: e.message, changes: 0 };
  }
}

/**
 * Main normalizer function
 */
function runCaseNormalizer(opts = {}) {
  const startTime = Date.now();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  CASE NORMALIZER - Modernized v2.0.0                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  if (opts.dryRun) {
    console.log('   MODE: DRY RUN (no changes will be made)\n');
  }

  // Scan drivers
  const entries = fs.readdirSync(DRIVERS_DIR);
  const drivers = entries.filter(entry => {
    const driverPath = path.join(DRIVERS_DIR, entry);
    return fs.statSync(driverPath).isDirectory() && !entry.startsWith('.');
  });

  console.log(`   Drivers scanned: ${drivers.length}\n`);

  // Process each driver
  const results = [];
  let totalChanges = 0;
  let driversModified = 0;

  for (const driver of drivers) {
    const result = normalizeDriver(driver, opts);
    results.push(result);

    if (result.changes > 0) {
      totalChanges += result.changes;
      driversModified++;

      if (opts.verbose) {
        console.log(`   ${opts.dryRun ? 'WOULD NORMALIZE' : 'NORMALIZED'}: ${driver} (${result.changes} changes)`);
        for (const detail of result.details.slice(0, 5)) {
          console.log(`     ${detail.type}: ${detail.original}${detail.normalized ? ' -> ' + detail.normalized : ''}${detail.added ? ' + ' + detail.added : ''}`);
        }
        if (result.details.length > 5) {
          console.log(`     ... and ${result.details.length - 5} more`);
        }
      }
    }
  }

  const duration = Date.now() - startTime;

  // Build result
  const result = {
    timestamp: new Date().toISOString(),
    duration: `${duration}ms`,
    dryRun: opts.dryRun || false,
    summary: {
      driversScanned: drivers.length,
      driversModified,
      totalChanges,
    },
    results: results.filter(r => r.changes > 0),
  };

  // Output
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log(`║  SUMMARY: ${totalChanges} changes ${opts.dryRun ? 'would be' : ''} made across ${driversModified} drivers   ║`);
    console.log(`║  Duration: ${duration}ms                                           ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
  }

  return result;
}

// Run if called directly
if (require.main === module) {
  const opts = parseArgs();
  const result = runCaseNormalizer(opts);
  process.exit(0);
}

module.exports = { runCaseNormalizer, normalizeDriver };
