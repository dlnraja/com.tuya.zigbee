#!/usr/bin/env node
'use strict';

/**
 * auto-update-drivers.js - Driver Auto-Updater v1.0.0
 * ==========================================================================
 * Reads new manufacturers from the enriched DB (.cache/devices/enrichment-report.json),
 * maps them to the correct driver based on device type, updates driver.compose.json
 * files with new fingerprints, validates JSON after each update, and creates
 * a diff report.
 *
 * Depends on:
 *   - auto-enrich-db.js output (.cache/devices/enrichment-report.json)
 *   - url-cache-manager.js (for fetching remote compose templates)
 *
 * Usage:
 *   node scripts/automation/auto-update-drivers.js                    # apply updates
 *   node scripts/automation/auto-update-drivers.js --dry-run          # preview only
 *   node scripts/automation/auto-update-drivers.js --source=<path>    # custom enrichment file
 *   node scripts/automation/auto-update-drivers.js --driver=<id>      # single driver
 *   node scripts/automation/auto-update-drivers.js --report           # JSON diff report
 *   node scripts/automation/auto-update-drivers.js --verbose
 */

const fs = require('fs');
const path = require('path');

// ── Paths ─────────────────────────────────────────────────────────────────────
const REPO_ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(REPO_ROOT, 'drivers');
const ENRICH_CACHE_DIR = path.join(REPO_ROOT, '.cache', 'devices');
const ENRICH_REPORT = path.join(ENRICH_CACHE_DIR, 'enrichment-report.json');
const DRIVER_CACHE_DIR = path.join(REPO_ROOT, '.cache', 'drivers');
const DIFF_REPORT = path.join(DRIVER_CACHE_DIR, 'driver-diff-report.json');
const DIFF_REPORT_MD = path.join(DRIVER_CACHE_DIR, 'driver-diff-report.md');

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[34m',
  M: '\x1b[35m', D: '\x1b[90m', X: '\x1b[0m',
};
const log = (c, ...a) => console.log(`${c}[DRIVER-UPDATE]${C.X} ${a.join(' ')}`);

// ── CLI arguments ─────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const FLAG = (name) => ARGS.some(a => a === `--${name}`);
const OPT = (name) => {
  const a = ARGS.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : null;
};

const DRY_RUN = FLAG('dry-run');
const VERBOSE = FLAG('verbose');
const REPORT_ONLY = FLAG('report');
const CUSTOM_SOURCE = OPT('source');
const SINGLE_DRIVER = OPT('driver');

// ═══════════════════════════════════════════════════════════════════════════════
// ENRICHMENT DATA LOADER
// ═══════════════════════════════════════════════════════════════════════════════

function loadEnrichmentData() {
  const sourcePath = CUSTOM_SOURCE || ENRICH_REPORT;
  if (!fs.existsSync(sourcePath)) {
    log(C.R, `Enrichment report not found: ${sourcePath}`);
    log(C.Y, 'Run auto-enrich-db.js first to generate the enrichment data.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(sourcePath));
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRIVER COMPOSE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Read and parse a driver.compose.json file.
 */
function readDriverCompose(driverId) {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(composePath));
  } catch (err) {
    log(C.R, `Failed to parse ${composePath}: ${err.message}`);
    return null;
  }
}

/**
 * Write a driver.compose.json with validation.
 */
function writeDriverCompose(driverId, data) {
  const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');

  if (DRY_RUN) {
    log(C.D, `[DRY RUN] Would write ${composePath}`);
    return true;
  }

  try {
    // Validate: ensure it's valid JSON and has required structure
    const json = JSON.stringify(data, null, 2) + '\n';

    // Round-trip validation
    JSON.parse(json);

    // Ensure zigbee section exists
    if (!data.zigbee) {
      log(C.R, `Refusing to write ${driverId}: missing zigbee section`);
      return false;
    }

    // Write
    fs.writeFileSync(composePath, json);
    return true;
  } catch (err) {
    log(C.R, `Failed to write ${composePath}: ${err.message}`);
    return false;
  }
}

/**
 * Add a manufacturer name to a driver if not already present.
 * Returns true if added, false if already present.
 */
function addManufacturerToDriver(data, manufacturer) {
  if (!data.zigbee) data.zigbee = {};
  if (!data.zigbee.manufacturerName) data.zigbee.manufacturerName = [];

  const existing = data.zigbee.manufacturerName.map(m => m.toLowerCase());
  if (existing.includes(manufacturer.toLowerCase())) {
    return false;
  }

  data.zigbee.manufacturerName.push(manufacturer);
  return true;
}

/**
 * Add a product ID to a driver if not already present.
 * Returns true if added, false if already present.
 */
function addProductIdToDriver(data, productId) {
  if (!data.zigbee) data.zigbee = {};
  if (!data.zigbee.productId) data.zigbee.productId = [];

  if (data.zigbee.productId.includes(productId)) {
    return false;
  }

  data.zigbee.productId.push(productId);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

async function updateDrivers() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  AUTO-UPDATE DRIVERS v1.0.0 ${DRY_RUN ? '(DRY RUN)' : ''}`);
  console.log(`${'='.repeat(70)}\n`);

  // Load enrichment data
  const enrichData = loadEnrichmentData();
  const newManufacturers = enrichData.newManufacturers || [];

  if (newManufacturers.length === 0) {
    log(C.G, 'No new manufacturers to add. Nothing to update.');
    return { updated: [], skipped: [], errors: [], created: [] };
  }

  log(C.B, `Processing ${newManufacturers.length} new manufacturers...`);

  // Ensure cache directory
  if (!fs.existsSync(DRIVER_CACHE_DIR)) {
    fs.mkdirSync(DRIVER_CACHE_DIR, { recursive: true });
  }

  // Track changes for diff report
  const diffReport = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    updates: [],
    skipped: [],
    errors: [],
    created: [],
    summary: { updated: 0, skipped: 0, errors: 0, created: 0 },
  };

  // Group by suggested driver
  const byDriver = new Map();
  for (const mfr of newManufacturers) {
    const driver = mfr.suggestedDriver;
    if (!byDriver.has(driver)) byDriver.set(driver, []);
    byDriver.get(driver).push(mfr);
  }

  // Filter to single driver if specified
  const driversToProcess = SINGLE_DRIVER
    ? (byDriver.has(SINGLE_DRIVER) ? [[SINGLE_DRIVER, byDriver.get(SINGLE_DRIVER)]] : [])
    : [...byDriver.entries()];

  for (const [driverId, manufacturers] of driversToProcess) {
    const compose = readDriverCompose(driverId);

    if (!compose) {
      log(C.Y, `Driver ${driverId} does not exist. Skipping ${manufacturers.length} manufacturer(s).`);
      for (const m of manufacturers) {
        diffReport.skipped.push({
          manufacturer: m.manufacturer,
          driver: driverId,
          reason: 'driver_not_found',
        });
        diffReport.summary.skipped++;
      }
      continue;
    }

    // Add each manufacturer
    let driverModified = false;
    for (const m of manufacturers) {
      const added = addManufacturerToDriver(compose, m.manufacturer);

      if (added) {
        driverModified = true;
        diffReport.updates.push({
          manufacturer: m.manufacturer,
          driver: driverId,
          sources: m.sources,
          modelIds: m.modelIds,
          action: 'added',
        });
        diffReport.summary.updated++;

        if (VERBOSE) {
          log(C.G, `  + ${m.manufacturer} -> ${driverId}`);
        }
      } else {
        diffReport.skipped.push({
          manufacturer: m.manufacturer,
          driver: driverId,
          reason: 'already_exists',
        });
        diffReport.summary.skipped++;

        if (VERBOSE) {
          log(C.D, `  = ${m.manufacturer} (already in ${driverId})`);
        }
      }
    }

    // Write updated compose if modified
    if (driverModified) {
      const success = writeDriverCompose(driverId, compose);
      if (!success) {
        diffReport.errors.push({ driver: driverId, reason: 'write_failed' });
        diffReport.summary.errors++;
      }
    }
  }

  // ── Report ─────────────────────────────────────────────────────────────────

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  UPDATE RESULTS`);
  console.log(`${'─'.repeat(70)}`);
  console.log(`  Updated:    ${C.G}${diffReport.summary.updated}${C.X}`);
  console.log(`  Skipped:    ${diffReport.summary.skipped}`);
  console.log(`  Errors:     ${C.R}${diffReport.summary.errors}${C.X}`);

  if (diffReport.updates.length > 0) {
    console.log(`\n${C.G}Updates applied:${C.X}`);
    // Group by driver for display
    const updatesByDriver = new Map();
    for (const u of diffReport.updates) {
      if (!updatesByDriver.has(u.driver)) updatesByDriver.set(u.driver, []);
      updatesByDriver.get(u.driver).push(u);
    }
    for (const [driverId, updates] of updatesByDriver) {
      console.log(`  ${C.B}${driverId}/${C.X} (${updates.length} additions)`);
      for (const u of updates) {
        console.log(`    + ${u.manufacturer}`);
      }
    }
  }

  if (diffReport.errors.length > 0) {
    console.log(`\n${C.R}Errors:${C.X}`);
    for (const e of diffReport.errors) {
      console.log(`  ${e.driver}: ${e.reason}`);
    }
  }

  // Save diff report
  if (!DRY_RUN) {
    fs.writeFileSync(DIFF_REPORT, JSON.stringify(diffReport, null, 2));

    // Generate markdown report
    const md = generateMarkdownReport(diffReport);
    fs.writeFileSync(DIFF_REPORT_MD, md);

    log(C.G, `Diff report saved to ${DIFF_REPORT}`);
  }

  // GitHub Actions summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    let md = '## Driver Update Results\n\n';
    md += '| Metric | Count |\n|---|---|\n';
    md += `| Updated | ${diffReport.summary.updated} |\n`;
    md += `| Skipped | ${diffReport.summary.skipped} |\n`;
    md += `| Errors | ${diffReport.summary.errors} |\n\n`;

    if (diffReport.updates.length > 0) {
      md += '### Updates\n\n';
      md += '| Manufacturer | Driver | Sources |\n|---|---|---|\n';
      for (const u of diffReport.updates.slice(0, 100)) {
        md += `| ${u.manufacturer} | ${u.driver} | ${u.sources.join(', ')} |\n`;
      }
    }
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  }

  return diffReport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MARKDOWN REPORT
// ═══════════════════════════════════════════════════════════════════════════════

function generateMarkdownReport(diffReport) {
  const lines = [
    '# Driver Diff Report',
    `Generated: ${diffReport.timestamp}`,
    `Mode: ${diffReport.dryRun ? 'DRY RUN' : 'LIVE'}`,
    '',
    '## Summary',
    '',
    '| Metric | Count |',
    '|---|---|',
    `| Updated | ${diffReport.summary.updated} |`,
    `| Skipped | ${diffReport.summary.skipped} |`,
    `| Errors | ${diffReport.summary.errors} |`,
    '',
  ];

  if (diffReport.updates.length > 0) {
    lines.push('## Updates');
    lines.push('');
    lines.push('| Manufacturer | Driver | Sources |');
    lines.push('|---|---|---|');
    for (const u of diffReport.updates) {
      lines.push(`| ${u.manufacturer} | ${u.driver} | ${u.sources.join(', ')} |`);
    }
    lines.push('');
  }

  if (diffReport.skipped.length > 0) {
    lines.push('## Skipped');
    lines.push('');
    lines.push('| Manufacturer | Driver | Reason |');
    lines.push('|---|---|---|');
    for (const s of diffReport.skipped) {
      lines.push(`| ${s.manufacturer} | ${s.driver} | ${s.reason} |`);
    }
    lines.push('');
  }

  if (diffReport.errors.length > 0) {
    lines.push('## Errors');
    lines.push('');
    lines.push('| Driver | Reason |');
    lines.push('|---|---|');
    for (const e of diffReport.errors) {
      lines.push(`| ${e.driver} | ${e.reason} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════════

async function cli() {
  if (REPORT_ONLY) {
    if (fs.existsSync(DIFF_REPORT)) {
      console.log(fs.readFileSync(DIFF_REPORT, 'utf8'));
    } else {
      console.log('No diff report found. Run driver update first.');
    }
    return;
  }

  const result = await updateDrivers();
  console.log(`\nDriver update complete. ${result.summary.updated} manufacturer(s) added.`);
}

// ── Export & run ──────────────────────────────────────────────────────────────
module.exports = { updateDrivers, readDriverCompose, writeDriverCompose, addManufacturerToDriver };

if (require.main === module) {
  cli().catch((err) => {
    console.error(`[DRIVER-UPDATE] Fatal: ${err.message}`);
    process.exit(1);
  });
}
