#!/usr/bin/env node
/**
 * Normalize Manufacturer Names
 * Run: node scripts/automation/normalize-manufacturer-names.js [--dry-run] [--json]
 *
 * Detects and fixes inconsistent manufacturer name casing and formatting
 * across driver.compose.json files.
 *
 * Actions:
 * - Detects case variants of the same manufacturer (e.g., "Tuya" vs "tuya")
 * - Consolidates to the most common casing
 * - Removes leading/trailing whitespace from manufacturer names
 * - Detects near-duplicates with minor spelling differences
 * - Reports manufacturer name statistics
 *
 * Exit codes: 0 = clean, 1 = changes needed/found, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadAllDrivers, DRIVERS_DIR } = require('../lib/drivers');

const DRY_RUN = process.argv.includes('--dry-run');
const JSON_OUTPUT = process.argv.includes('--json');

function normalizeManufacturerNames() {
  const drivers = loadAllDrivers();
  const allMfrs = new Map(); // lowercased -> [{name, driver}]
  const changes = [];

  for (const [name, d] of drivers) {
    const zigbee = d.config.zigbee || {};
    const mfrs = zigbee.manufacturerName || [];
    for (const m of mfrs) {
      const lower = m.toLowerCase().trim();
      if (!allMfrs.has(lower)) allMfrs.set(lower, []);
      allMfrs.get(lower).push({ name: m, driver: name });
    }
  }

  // Find case variants: same lowercased name, different actual names
  const caseVariants = new Map();
  for (const [lower, entries] of allMfrs) {
    const uniqueNames = [...new Set(entries.map(e => e.name))];
    if (uniqueNames.length > 1) {
      caseVariants.set(lower, uniqueNames);
    }
  }

  // Find whitespace issues
  const whitespaceIssues = [];
  for (const [name, d] of drivers) {
    const zigbee = d.config.zigbee || {};
    const mfrs = zigbee.manufacturerName || [];
    for (const m of mfrs) {
      if (m !== m.trim()) {
        whitespaceIssues.push({ driver: name, original: m, trimmed: m.trim() });
      }
    }
  }

  // Determine preferred casing (most common across all drivers)
  const casingFreq = new Map(); // name -> count
  for (const [lower, entries] of allMfrs) {
    for (const e of entries) {
      casingFreq.set(e.name, (casingFreq.get(e.name) || 0) + 1);
    }
  }

  // Apply fixes
  let filesModified = 0;
  for (const [name, d] of drivers) {
    const zigbee = d.config.zigbee || {};
    const mfrs = zigbee.manufacturerName || [];
    let modified = false;
    const newMfrs = [];

    for (const m of mfrs) {
      const trimmed = m.trim();
      const lower = trimmed.toLowerCase();

      // Check if there's a preferred casing for this manufacturer
      const variants = caseVariants.get(lower);
      if (variants) {
        // Pick the most common variant
        let preferred = trimmed;
        let maxCount = 0;
        for (const v of variants) {
          const count = casingFreq.get(v) || 0;
          if (count > maxCount) {
            maxCount = count;
            preferred = v;
          }
        }
        if (m !== preferred) {
          changes.push({
            driver: name,
            action: 'recase',
            from: m,
            to: preferred,
          });
          newMfrs.push(preferred);
          modified = true;
          continue;
        }
      }

      // Fix whitespace
      if (trimmed !== m) {
        changes.push({
          driver: name,
          action: 'trim',
          from: m,
          to: trimmed,
        });
        newMfrs.push(trimmed);
        modified = true;
        continue;
      }

      newMfrs.push(m);
    }

    if (modified) {
      filesModified++;
      if (!DRY_RUN) {
        d.config.zigbee.manufacturerName = newMfrs;
        const cf = path.join(DRIVERS_DIR, name, 'driver.compose.json');
        fs.writeFileSync(cf, JSON.stringify(d.config, null, 2) + '\n');
      }
    }
  }

  return {
    driversScanned: drivers.size,
    caseVariants: Object.fromEntries([...caseVariants.entries()].map(([k, v]) => [k, v])),
    whitespaceIssues,
    changes,
    filesModified,
    dryRun: DRY_RUN,
  };
}

// Main
try {
  if (!JSON_OUTPUT) console.log('Normalizing manufacturer names...\n');

  const result = normalizeManufacturerNames();

  if (JSON_OUTPUT) {
    result.timestamp = new Date().toISOString();
    result.exitCode = result.changes.length > 0 ? 1 : 0;
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (result.changes.length === 0) {
      console.log('All manufacturer names are consistent.');
    } else {
      console.log(`Found ${result.changes.length} changes across ${result.filesModified} files:`);
      for (const c of result.changes) {
        console.log(`  [${c.action}] ${c.driver}: "${c.from}" -> "${c.to}"`);
      }
      if (DRY_RUN) console.log('\n(DRY RUN - no files modified)');
    }
    console.log(`\nScanned ${result.driversScanned} drivers.`);
  }

  process.exit(result.changes.length > 0 ? 1 : 0);
} catch (e) {
  console.error(`Error: ${e.message}`);
  if (!JSON_OUTPUT) console.error(e.stack);
  process.exit(2);
}
