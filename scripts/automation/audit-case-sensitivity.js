#!/usr/bin/env node
/**
 * Case Sensitivity Auditor
 * Run: node scripts/automation/audit-case-sensitivity.js [--json]
 *
 * Detects case-sensitivity issues across the codebase that can cause bugs:
 * - Manufacturer names with inconsistent casing
 * - Capability names with unexpected casing
 * - Driver directory names vs compose.json IDs
 * - Fingerprints that differ only by case
 * - Flow card IDs with inconsistent casing
 *
 * Exit codes: 0 = clean, 1 = issues found, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadAllDrivers, DRIVERS_DIR } = require('../lib/drivers');

const JSON_OUTPUT = process.argv.includes('--json');

function auditCaseSensitivity() {
  const drivers = loadAllDrivers();
  const issues = [];

  // 1. Manufacturer name case collisions
  // Group all manufacturers by lowercase version
  const mfrCaseMap = new Map(); // lowercased -> [{original, driver}]
  for (const [name, d] of drivers) {
    for (const m of d.mfrs) {
      const lower = m.toLowerCase();
      if (!mfrCaseMap.has(lower)) mfrCaseMap.set(lower, []);
      mfrCaseMap.get(lower).push({ original: m, driver: name });
    }
  }

  for (const [lower, entries] of mfrCaseMap) {
    const uniqueOriginals = [...new Set(entries.map(e => e.original))];
    if (uniqueOriginals.length > 1) {
      const affectedDrivers = [...new Set(entries.map(e => e.driver))];
      issues.push({
        type: 'mfr-case-variant',
        severity: 'warn',
        manufacturer: lower,
        variants: uniqueOriginals,
        drivers: affectedDrivers,
        message: `Manufacturer "${lower}" has ${uniqueOriginals.length} case variants: ${uniqueOriginals.join(', ')} across ${affectedDrivers.length} driver(s)`,
      });
    }
  }

  // 2. ProductId case collisions
  const pidCaseMap = new Map();
  for (const [name, d] of drivers) {
    for (const p of d.pids) {
      const lower = p.toLowerCase();
      if (!pidCaseMap.has(lower)) pidCaseMap.set(lower, []);
      pidCaseMap.get(lower).push({ original: p, driver: name });
    }
  }

  for (const [lower, entries] of pidCaseMap) {
    const uniqueOriginals = [...new Set(entries.map(e => e.original))];
    if (uniqueOriginals.length > 1) {
      const affectedDrivers = [...new Set(entries.map(e => e.driver))];
      issues.push({
        type: 'pid-case-variant',
        severity: 'warn',
        productId: lower,
        variants: uniqueOriginals,
        drivers: affectedDrivers,
        message: `ProductId "${lower}" has ${uniqueOriginals.length} case variants: ${uniqueOriginals.join(', ')} across ${affectedDrivers.length} driver(s)`,
      });
    }
  }

  // 3. Driver directory name vs config.id mismatch
  for (const [name, d] of drivers) {
    const configId = d.config.id;
    if (configId && configId !== name) {
      if (configId.toLowerCase() === name.toLowerCase() && configId !== name) {
        issues.push({
          type: 'dir-id-case-mismatch',
          severity: 'error',
          directory: name,
          configId: configId,
          message: `Directory name "${name}" differs from config.id "${configId}" by case only`,
        });
      }
    }
  }

  // 4. Fingerprint manufacturer case inconsistency within a single driver
  for (const [name, d] of drivers) {
    const zigbee = d.config.zigbee || {};
    const mfrs = zigbee.manufacturerName || [];
    const mfrLowerSet = new Set(mfrs.map(m => m.toLowerCase()));
    if (mfrLowerSet.size !== mfrs.length) {
      // There are case duplicates within the same driver
      const seen = new Map();
      for (const m of mfrs) {
        const lower = m.toLowerCase();
        if (!seen.has(lower)) seen.set(lower, []);
        seen.get(lower).push(m);
      }
      for (const [lower, variants] of seen) {
        if (variants.length > 1) {
          issues.push({
            type: 'internal-mfr-duplicate',
            severity: 'error',
            driver: name,
            variants: [...new Set(variants)],
            message: `Driver "${name}" has internal manufacturer case duplicates: ${[...new Set(variants)].join(', ')}`,
          });
        }
      }
    }
  }

  // 5. Check for capabilities with unexpected casing
  const allCapsLower = new Map();
  for (const [name, d] of drivers) {
    for (const cap of d.caps) {
      const lower = cap.toLowerCase();
      if (!allCapsLower.has(lower)) allCapsLower.set(lower, new Set());
      allCapsLower.get(lower).add(cap);
    }
  }

  for (const [lower, originals] of allCapsLower) {
    if (originals.size > 1) {
      issues.push({
        type: 'cap-case-variant',
        severity: 'warn',
        capability: lower,
        variants: [...originals],
        message: `Capability "${lower}" has ${originals.size} case variants: ${[...originals].join(', ')}`,
      });
    }
  }

  // 6. Check flow card IDs for case inconsistencies
  const flowIdsLower = new Map();
  for (const [name, d] of drivers) {
    const flow = d.config.flow || {};
    for (const cardType of ['triggers', 'conditions', 'actions']) {
      for (const card of (flow[cardType] || [])) {
        if (card.id) {
          const lower = card.id.toLowerCase();
          if (!flowIdsLower.has(lower)) flowIdsLower.set(lower, []);
          flowIdsLower.get(lower).push({ id: card.id, driver: name, type: cardType });
        }
      }
    }
  }

  for (const [lower, entries] of flowIdsLower) {
    const uniqueIds = [...new Set(entries.map(e => e.id))];
    if (uniqueIds.length > 1) {
      const affectedDrivers = [...new Set(entries.map(e => e.driver))];
      issues.push({
        type: 'flow-id-case-variant',
        severity: 'error',
        flowId: lower,
        variants: uniqueIds,
        drivers: affectedDrivers,
        message: `Flow card ID "${lower}" has ${uniqueIds.length} case variants: ${uniqueIds.join(', ')} across ${affectedDrivers.length} driver(s)`,
      });
    }
  }

  return {
    driversAudited: drivers.size,
    issues,
    summary: {
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warn').length,
    },
  };
}

// Main
try {
  if (!JSON_OUTPUT) console.log('Auditing case sensitivity...\n');

  const result = auditCaseSensitivity();

  if (JSON_OUTPUT) {
    result.timestamp = new Date().toISOString();
    result.exitCode = result.summary.errors > 0 ? 1 : 0;
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (result.issues.length === 0) {
      console.log('No case sensitivity issues found.');
    } else {
      for (const issue of result.issues) {
        const icon = issue.severity === 'error' ? '[ERROR]' : '[WARN]';
        console.log(`${icon} ${issue.message}`);
      }
      console.log(`\n${result.summary.errors} error(s), ${result.summary.warnings} warning(s) across ${result.driversAudited} drivers.`);
    }
  }

  process.exit(result.summary.errors > 0 ? 1 : 0);
} catch (e) {
  console.error(`Error: ${e.message}`);
  if (!JSON_OUTPUT) console.error(e.stack);
  process.exit(2);
}
