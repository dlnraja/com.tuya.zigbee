#!/usr/bin/env node
/**
 * check-flow-ids.js - Flow Card ID Uniqueness Validator
 * Scans all driver.flow.compose.json files to ensure no duplicate flow card IDs.
 *
 * Usage: node scripts/ci/check-flow-ids.js [--json]
 * Exit code: 0 = no duplicates, 1 = duplicates found, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');

const JSON_OUTPUT = process.argv.includes('--json');
const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const allCardIds = new Map(); // id -> [driverName, ...]
let filesChecked = 0;
let cardsFound = 0;

try {
  if (!fs.existsSync(DRIVERS_DIR)) {
    if (!JSON_OUTPUT) console.log('[check-flow-ids] No drivers directory found.');
    process.exit(0);
  }

  const entries = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const flowPath = path.join(DRIVERS_DIR, entry.name, 'driver.flow.compose.json');
    if (!fs.existsSync(flowPath)) continue;

    try {
      const data = JSON.parse(fs.readFileSync(flowPath, 'utf8'));
      filesChecked++;

      const cards = [
        // v9.0.416 (P92.124): namespace by section — Homey flow cards live in
        // separate namespaces per type (getDeviceTriggerCard / getConditionCard
        // / getActionCard), so the same id as trigger+condition+action is
        // LEGAL and intentional (e.g. xxx_on). Only duplicates within the
        // SAME section are real collisions.
        ...(data.triggers || []).map((c) => ({ ...c, __section: 'triggers' })),
        ...(data.conditions || []).map((c) => ({ ...c, __section: 'conditions' })),
        ...(data.actions || []).map((c) => ({ ...c, __section: 'actions' })),
      ];

      for (const card of cards) {
        if (!card.id) continue;
        cardsFound++;

        const key = `${card.__section}:${card.id}`;
        if (!allCardIds.has(key)) {
          allCardIds.set(key, []);
        }
        allCardIds.get(key).push(entry.name);
      }
    } catch (e) {
      if (!JSON_OUTPUT) console.warn(`[check-flow-ids] Error parsing ${flowPath}: ${e.message}`);
    }
  }

  // Find duplicates
  const duplicates = [];
  for (const [id, drivers] of allCardIds) {
    if (drivers.length > 1) {
      duplicates.push({ id, drivers: [...new Set(drivers)] });
    }
  }

  if (JSON_OUTPUT) {
    const output = {
      timestamp: new Date().toISOString(),
      filesChecked,
      totalCards: cardsFound,
      uniqueCards: allCardIds.size,
      duplicates: duplicates.length,
      duplicateDetails: duplicates,
      exitCode: duplicates.length > 0 ? 1 : 0,
    };
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(`[check-flow-ids] Scanned ${filesChecked} flow compose files, found ${cardsFound} cards (${allCardIds.size} unique).`);

    if (duplicates.length > 0) {
      console.error(`\nERROR: Found ${duplicates.length} duplicate flow card ID(s):`);
      for (const d of duplicates) {
        console.error(`  "${d.id}" used by: ${d.drivers.join(', ')}`);
      }
    } else {
      console.log('PASSED: All flow card IDs are globally unique.');
    }
  }

  process.exit(duplicates.length > 0 ? 1 : 0);
} catch (e) {
  if (!JSON_OUTPUT) console.error(`[check-flow-ids] Fatal error: ${e.message}`);
  process.exit(2);
}
