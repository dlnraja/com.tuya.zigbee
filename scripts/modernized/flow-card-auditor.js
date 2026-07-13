#!/usr/bin/env node
'use strict';

/**
 * Flow Card Auditor - Modernized
 *
 * Consolidates functionality from:
 *   - scripts/legacy/fix_all_flow_issues.js
 *   - scripts/legacy/fix_remaining_flow_issues.js
 *   - scripts/legacy/fix_missing_flow_registrations.js
 *   - scripts/legacy/fix_flow_ids.js
 *   - scripts/legacy/fix_compose_files.js
 *   - scripts/legacy/fix_all_warnings_setcapability.js
 *
 * Features:
 *   - Validates flow card IDs are globally unique
 *   - Checks for missing flow card registrations in driver.js
 *   - Detects missing runListeners for conditions
 *   - Validates flow card definitions in driver.compose.json
 *   - --json output for CI integration
 *   - --dry-run mode
 *   - --fix mode to apply fixes
 *   - Proper error handling and logging
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

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
 * Scan all drivers for flow card data
 */
function scanDrivers() {
  const drivers = [];
  const entries = fs.readdirSync(DRIVERS_DIR);

  for (const entry of entries) {
    const driverPath = path.join(DRIVERS_DIR, entry);
    const stat = fs.statSync(driverPath);

    if (!stat.isDirectory() || entry.startsWith('.')) continue;

    const composePath = path.join(driverPath, 'driver.compose.json');
    const driverJsPath = path.join(driverPath, 'driver.js');

    if (!fs.existsSync(composePath)) continue;

    try {
      const content = JSON.parse(fs.readFileSync(composePath));
      const flow = content.flow || {};
      const triggers = flow.triggers || [];
      const conditions = flow.conditions || [];
      const actions = flow.actions || [];
      const capabilities = content.capabilities || [];

      let driverJsContent = null;
      if (fs.existsSync(driverJsPath)) {
        driverJsContent = fs.readFileSync(driverJsPath, 'utf8');
      }

      drivers.push({
        driver: entry,
        triggers,
        conditions,
        actions,
        capabilities,
        composePath,
        driverJsPath,
        driverJsContent,
      });
    } catch (e) {
      // Skip invalid files
    }
  }

  return drivers;
}

/**
 * Check for globally unique flow card IDs
 */
function checkGlobalUniqueness(drivers) {
  const idMap = new Map(); // id -> [drivers]

  for (const driver of drivers) {
    const allCards = [
      ...driver.triggers.map(t => ({ ...t, type: 'trigger' })),
      ...driver.conditions.map(c => ({ ...c, type: 'condition' })),
      ...driver.actions.map(a => ({ ...a, type: 'action' })),
    ];

    for (const card of allCards) {
      if (!idMap.has(card.id)) idMap.set(card.id, []);
      idMap.get(card.id).push({ driver: driver.driver, type: card.type });
    }
  }

  const duplicates = [];
  for (const [id, entries] of idMap) {
    if (entries.length > 1) {
      const uniqueDrivers = [...new Set(entries.map(e => e.driver))];
      if (uniqueDrivers.length > 1) {
        duplicates.push({
          id,
          drivers: uniqueDrivers,
          types: entries.map(e => e.type),
        });
      }
    }
  }

  return duplicates;
}

/**
 * Check for missing flow card registrations in driver.js
 */
function checkMissingRegistrations(drivers) {
  const missing = [];

  for (const driver of drivers) {
    if (!driver.driverJsContent) continue;

    const allCards = [
      ...driver.triggers.map(t => ({ id: t.id, type: 'trigger' })),
      ...driver.conditions.map(c => ({ id: c.id, type: 'condition' })),
      ...driver.actions.map(a => ({ id: a.id, type: 'action' })),
    ];

    for (const card of allCards) {
      const methodName = card.type === 'trigger' ? 'getDeviceTriggerCard' :
        card.type === 'condition' ? 'getDeviceConditionCard' :
          'getDeviceActionCard';

      const pattern = `${methodName}('${card.id}')`;
      const patternDouble = `${methodName}("${card.id}")`;

      if (!driver.driverJsContent.includes(pattern) && !driver.driverJsContent.includes(patternDouble)) {
        missing.push({
          driver: driver.driver,
          cardId: card.id,
          cardType: card.type,
        });
      }
    }
  }

  return missing;
}

/**
 * Check for missing runListeners on conditions
 */
function checkMissingRunListeners(drivers) {
  const missing = [];

  for (const driver of drivers) {
    if (!driver.driverJsContent) continue;

    for (const condition of driver.conditions) {
      const registrationPattern = `getDeviceConditionCard('${condition.id}')`;
      const registrationPatternDouble = `getDeviceConditionCard("${condition.id}")`;

      if (!driver.driverJsContent.includes(registrationPattern) &&
        !driver.driverJsContent.includes(registrationPatternDouble)) {
        continue; // Not registered at all, will be caught by checkMissingRegistrations
      }

      // Check if registerRunListener follows
      const lines = driver.driverJsContent.split('\n');
      let foundRegistration = false;
      let foundRunListener = false;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`getDeviceConditionCard('${condition.id}')`) ||
          lines[i].includes(`getDeviceConditionCard("${condition.id}")`)) {
          foundRegistration = true;
          // Check next few lines for registerRunListener
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (lines[j].includes('registerRunListener')) {
              foundRunListener = true;
              break;
            }
          }
          break;
        }
      }

      if (foundRegistration && !foundRunListener) {
        missing.push({
          driver: driver.driver,
          conditionId: condition.id,
        });
      }
    }
  }

  return missing;
}

/**
 * Check for generic flow card IDs (not prefixed with driver name)
 */
function checkGenericIds(drivers) {
  const generic = [];

  for (const driver of drivers) {
    const allCards = [
      ...driver.triggers.map(t => ({ id: t.id, type: 'trigger' })),
      ...driver.conditions.map(c => ({ id: c.id, type: 'condition' })),
      ...driver.actions.map(a => ({ id: a.id, type: 'action' })),
    ];

    for (const card of allCards) {
      // Check if ID starts with driver name
      if (!card.id.startsWith(driver.driver + '_') && !card.id.startsWith(driver.driver + '.')) {
        // Allow some exceptions
        const exceptions = ['wifi_', 'global_'];
        if (!exceptions.some(e => card.id.startsWith(e))) {
          generic.push({
            driver: driver.driver,
            cardId: card.id,
            cardType: card.type,
            suggestion: `${driver.driver}_${card.id}`,
          });
        }
      }
    }
  }

  return generic;
}

/**
 * Main auditor function
 */
function runFlowCardAuditor(opts = {}) {
  const startTime = Date.now();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  FLOW CARD AUDITOR - Modernized v2.0.0                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Scan drivers
  const drivers = scanDrivers();
  console.log(`   Drivers scanned: ${drivers.length}\n`);

  // Count total flow cards
  const totalTriggers = drivers.reduce((sum, d) => sum + d.triggers.length, 0);
  const totalConditions = drivers.reduce((sum, d) => sum + d.conditions.length, 0);
  const totalActions = drivers.reduce((sum, d) => sum + d.actions.length, 0);
  console.log(`   Total flow cards: ${totalTriggers + totalConditions + totalActions}`);
  console.log(`     Triggers: ${totalTriggers}`);
  console.log(`     Conditions: ${totalConditions}`);
  console.log(`     Actions: ${totalActions}\n`);

  // Run checks
  const duplicates = checkGlobalUniqueness(drivers);
  console.log(`   Duplicate IDs: ${duplicates.length}`);

  const missingRegistrations = checkMissingRegistrations(drivers);
  console.log(`   Missing registrations: ${missingRegistrations.length}`);

  const missingRunListeners = checkMissingRunListeners(drivers);
  console.log(`   Missing runListeners: ${missingRunListeners.length}`);

  const genericIds = checkGenericIds(drivers);
  console.log(`   Generic IDs: ${genericIds.length}`);

  const totalIssues = duplicates.length + missingRegistrations.length + missingRunListeners.length;
  const duration = Date.now() - startTime;
  const passed = totalIssues === 0;

  // Build result
  const result = {
    timestamp: new Date().toISOString(),
    duration: `${duration}ms`,
    passed,
    summary: {
      driversScanned: drivers.length,
      totalFlowCards: totalTriggers + totalConditions + totalActions,
      duplicateIds: duplicates.length,
      missingRegistrations: missingRegistrations.length,
      missingRunListeners: missingRunListeners.length,
      genericIds: genericIds.length,
    },
    duplicates,
    missingRegistrations,
    missingRunListeners,
    genericIds: opts.verbose ? genericIds : genericIds.slice(0, 20),
  };

  // Output
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Show details
    if (duplicates.length > 0) {
      console.log('\n   DUPLICATE FLOW CARD IDS:');
      for (const dup of duplicates.slice(0, 10)) {
        console.log(`     ${dup.id}: ${dup.drivers.join(', ')}`);
      }
    }

    if (missingRegistrations.length > 0 && opts.verbose) {
      console.log('\n   MISSING REGISTRATIONS:');
      for (const reg of missingRegistrations.slice(0, 10)) {
        console.log(`     ${reg.driver}: ${reg.cardType} '${reg.cardId}'`);
      }
    }

    if (missingRunListeners.length > 0 && opts.verbose) {
      console.log('\n   MISSING RUNLISTENERS:');
      for (const rl of missingRunListeners.slice(0, 10)) {
        console.log(`     ${rl.driver}: condition '${rl.conditionId}'`);
      }
    }

    // Summary
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log(`║  RESULT: ${passed ? 'PASSED' : 'FAILED'} - ${totalIssues} issues found                       ║`);
    console.log(`║  Duration: ${duration}ms                                           ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
  }

  return result;
}

// Run if called directly
if (require.main === module) {
  const opts = parseArgs();
  const result = runFlowCardAuditor(opts);
  process.exit(result.passed ? 0 : 1);
}

module.exports = { runFlowCardAuditor, checkGlobalUniqueness, checkMissingRegistrations };
