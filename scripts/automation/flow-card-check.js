#!/usr/bin/env node
/**
 * flow-card-check.js - Flow Card Consistency & Completeness Verification
 * =======================================================================
 * Checks all flow cards for:
 *   1. Duplicate flow card IDs across all drivers
 *   2. Flow card ID naming pattern compliance
 *   3. Missing flow cards for switch/plug drivers (onoff -> should have on/off)
 *   4. titleFormatted with [[device]] bug
 *   5. Missing required args (device filter missing)
 *   6. Flow card argument type validation
 *   7. Flow card consistency with capabilities
 *   8. Orphaned flow cards (referencing non-existent capabilities)
 *   9. Missing multilingual titles (en is required)
 *  10. App-level flow card duplication with driver-level cards
 *
 * Usage: node scripts/automation/flow-card-check.js
 * Exit code: 0 = clean, 1 = errors found, 2 = warnings only
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON = path.join(ROOT, 'app.json');

// ── ANSI colors ──────────────────────────────────────────────────
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ── Report ───────────────────────────────────────────────────────
const report = {
  errors: [],
  warnings: [],
  info: [],
  stats: {
    totalFlowCards: 0,
    totalDriverFlowCards: 0,
    totalAppFlowCards: 0,
    duplicateIds: 0,
    patternViolations: 0,
    titleFormattedBugs: 0,
    missingDeviceArg: 0,
    missingTitles: 0,
    orphanedCards: 0,
    capabilityMismatches: 0,
    driversWithFlows: 0,
    driversWithoutFlows: 0,
  },
};

function log(msg) { console.log(`${CYAN}[FLOW-CARD]${RESET} ${msg}`); }
function err(msg) { report.errors.push(msg); console.error(`${RED}[ERROR]${RESET} ${msg}`); }
function warn(msg) { report.warnings.push(msg); console.warn(`${YELLOW}[WARN]${RESET} ${msg}`); }

// ── Load app.json flow cards ─────────────────────────────────────
function loadAppFlowCards() {
  const result = { triggers: [], conditions: [], actions: [] };
  try {
    const raw = fs.readFileSync(APP_JSON);
    const app = JSON.parse(raw);
    if (app.flow) {
      result.triggers = app.flow.triggers || [];
      result.conditions = app.flow.conditions || [];
      result.actions = app.flow.actions || [];
    }
  } catch (e) {
    warn(`Cannot load app.json: ${e.message}`);
  }
  return result;
}

// ── Load all driver flow compose files ────────────────────────────
function loadDriverFlowCards() {
  const driverFlows = new Map(); // driverName -> { triggers, conditions, actions }

  try {
    const dirs = fs.readdirSync(DRIVERS_DIR);
    for (const name of dirs) {
      const flowPath = path.join(DRIVERS_DIR, name, 'driver.flow.compose.json');
      if (!fs.existsSync(flowPath)) continue;

      try {
        const raw = fs.readFileSync(flowPath);
        const flow = JSON.parse(raw);

        driverFlows.set(name, {
          triggers: flow.triggers || [],
          conditions: flow.conditions || [],
          actions: flow.actions || [],
        });

        report.stats.driversWithFlows++;
      } catch (e) {
        warn(`Failed to parse flow cards for ${name}: ${e.message}`);
      }
    }
  } catch (e) { /* skip */ }

  // Find drivers without flow cards
  try {
    const dirs = fs.readdirSync(DRIVERS_DIR);
    for (const name of dirs) {
      const dirPath = path.join(DRIVERS_DIR, name);
      try {
        const stat = fs.statSync(dirPath);
        if (!stat.isDirectory()) continue;
      } catch (e) { continue; }

      // Check if it has a driver.compose.json (it's a real driver)
      if (fs.existsSync(path.join(dirPath, 'driver.compose.json')) && !driverFlows.has(name)) {
        report.stats.driversWithoutFlows++;
      }
    }
  } catch (e) { /* skip */ }

  return driverFlows;
}

// ── Load driver compose for capability cross-reference ────────────
function loadDriverCapabilities() {
  const caps = new Map(); // driverName -> capabilities[]
  try {
    const dirs = fs.readdirSync(DRIVERS_DIR);
    for (const name of dirs) {
      const composePath = path.join(DRIVERS_DIR, name, 'driver.compose.json');
      if (!fs.existsSync(composePath)) continue;
      try {
        const raw = fs.readFileSync(composePath);
        const compose = JSON.parse(raw);
        caps.set(name, compose.capabilities || []);
      } catch (e) { /* skip */ }
    }
  } catch (e) { /* skip */ }
  return caps;
}

// ── 1. Duplicate Flow Card IDs ───────────────────────────────────
function checkDuplicateIds(appFlow, driverFlows) {
  log('Phase 1: Checking for duplicate flow card IDs...');

  const allIds = new Map(); // id -> [location]

  // Collect app-level cards
  for (const section of ['triggers', 'conditions', 'actions']) {
    for (const card of appFlow[section]) {
      if (!card.id) continue;
      const loc = `app.json:${section}`;
      if (!allIds.has(card.id)) allIds.set(card.id, []);
      allIds.get(card.id).push(loc);
      report.stats.totalAppFlowCards++;
      report.stats.totalFlowCards++;
    }
  }

  // Collect driver-level cards
  for (const [driverName, flow] of driverFlows) {
    for (const section of ['triggers', 'conditions', 'actions']) {
      for (const card of flow[section]) {
        if (!card.id) continue;
        const loc = `drivers/${driverName}/${section}`;
        if (!allIds.has(card.id)) allIds.set(card.id, []);
        allIds.get(card.id).push(loc);
        report.stats.totalDriverFlowCards++;
        report.stats.totalFlowCards++;
      }
    }
  }

  // Find duplicates
  for (const [id, locations] of allIds) {
    if (locations.length > 1) {
      err(`Duplicate flow card ID "${id}" found in: ${locations.join(', ')}`);
      report.stats.duplicateIds++;
    }
  }
}

// ── 2. Flow Card ID Naming Pattern ───────────────────────────────
function checkNamingPatterns(driverFlows) {
  log('Phase 2: Checking flow card ID naming patterns...');

  // Expected pattern: {driver}_{type}_{action} or {driver}_{type}_gang{N}_{action}
  const validPattern = /^[a-z][a-z0-9_]+$/;
  const gangPattern = /^(.+)_gang(\d+)_(.+)$/;

  for (const [driverName, flow] of driverFlows) {
    for (const section of ['triggers', 'conditions', 'actions']) {
      for (const card of flow[section]) {
        if (!card.id) continue;

        if (!validPattern.test(card.id)) {
          warn(`Flow card ID "${card.id}" in ${driverName} contains invalid characters`);
          report.stats.patternViolations++;
        }

        // Check that ID starts with driver name
        if (!card.id.startsWith(driverName + '_') && !card.id.includes(driverName)) {
          warn(`Flow card ID "${card.id}" in ${driverName} does not reference driver name`);
          report.stats.patternViolations++;
        }
      }
    }
  }
}

// ── 3. titleFormatted [[device]] Bug ─────────────────────────────
function checkTitleFormattedBugs(appFlow, driverFlows) {
  log('Phase 3: Checking for titleFormatted [[device]] bugs...');

  function checkCard(card, location) {
    if (!card.titleFormatted) return;

    const titleFormattedStr = typeof card.titleFormatted === 'object'
      ? JSON.stringify(card.titleFormatted)
      : String(card.titleFormatted);

    if (titleFormattedStr.includes('[[device]]')) {
      warn(`titleFormatted contains [[device]] in ${location}: ${card.id}`);
      report.stats.titleFormattedBugs++;
    }
  }

  // Check app-level
  for (const section of ['triggers', 'conditions', 'actions']) {
    for (const card of appFlow[section]) {
      checkCard(card, `app.json:${section}`);
    }
  }

  // Check driver-level
  for (const [driverName, flow] of driverFlows) {
    for (const section of ['triggers', 'conditions', 'actions']) {
      for (const card of flow[section]) {
        checkCard(card, `drivers/${driverName}/${section}`);
      }
    }
  }
}

// ── 4. Missing Device Arg Filter ─────────────────────────────────
function checkDeviceArgFilters(appFlow, driverFlows) {
  log('Phase 4: Checking for missing device arg filters...');

  function checkCard(card, location) {
    if (!card.args || !Array.isArray(card.args)) return;

    const hasDeviceArg = card.args.some(a => a.type === 'device');
    if (!hasDeviceArg) return;

    const deviceArg = card.args.find(a => a.type === 'device');
    if (deviceArg && !deviceArg.filter) {
      warn(`Device arg in "${card.id}" (${location}) has no filter - device selection may be too broad`);
      report.stats.missingDeviceArg++;
    }
  }

  for (const section of ['triggers', 'conditions']) {
    for (const card of appFlow[section]) {
      checkCard(card, `app.json:${section}`);
    }
  }
}

// ── 5. Missing Required Titles ───────────────────────────────────
function checkMissingTitles(appFlow, driverFlows) {
  log('Phase 5: Checking for missing required titles...');

  function checkCard(card, location) {
    if (!card.title) {
      warn(`Flow card "${card.id}" in ${location} is missing title`);
      report.stats.missingTitles++;
      return;
    }

    if (!card.title.en) {
      warn(`Flow card "${card.id}" in ${location} is missing English (en) title`);
      report.stats.missingTitles++;
    }
  }

  for (const section of ['triggers', 'conditions', 'actions']) {
    for (const card of appFlow[section]) {
      checkCard(card, `app.json:${section}`);
    }
  }

  for (const [driverName, flow] of driverFlows) {
    for (const section of ['triggers', 'conditions', 'actions']) {
      for (const card of flow[section]) {
        checkCard(card, `drivers/${driverName}/${section}`);
      }
    }
  }
}

// ── 6. Missing Flow Cards for Switch Drivers ─────────────────────
function checkSwitchFlowCards(driverFlows, driverCaps) {
  log('Phase 6: Checking switch/plug drivers for expected flow cards...');

  for (const [driverName, caps] of driverCaps) {
    if (!caps.includes('onoff')) continue;

    const flow = driverFlows.get(driverName);
    if (!flow) continue; // No flow cards at all - checked elsewhere

    const allTriggerIds = flow.triggers.map(t => t.id);
    const allActionIds = flow.actions.map(a => a.id);

    // Expected: at least one on/off trigger and one on/off action
    const hasOnTrigger = allTriggerIds.some(id => id.includes('_on') || id.includes('_turned_on'));
    const hasOffTrigger = allTriggerIds.some(id => id.includes('_off') || id.includes('_turned_off'));
    const hasOnAction = allActionIds.some(id => id.includes('_turn_on') || id.includes('_on'));
    const hasOffAction = allActionIds.some(id => id.includes('_turn_off') || id.includes('_off'));

    if (!hasOnTrigger && !hasOffTrigger) {
      warn(`Switch driver "${driverName}" with onoff capability has no on/off triggers`);
    }
    if (!hasOnAction && !hasOffAction) {
      warn(`Switch driver "${driverName}" with onoff capability has no on/off actions`);
    }
  }
}

// ── 7. Flow Card Capability Cross-Reference ──────────────────────
function checkCapabilityCrossRef(driverFlows, driverCaps) {
  log('Phase 7: Cross-referencing flow cards with capabilities...');

  for (const [driverName, flow] of driverFlows) {
    const caps = driverCaps.get(driverName) || [];

    // Check if flow cards reference capabilities that exist
    for (const section of ['triggers', 'conditions']) {
      for (const card of flow[section]) {
        if (!card.args) continue;
        for (const arg of card.args) {
          if (arg.filter) {
            // Extract capability from filter like "capabilities=measure_temperature"
            const capMatch = arg.filter.match(/capabilities=([a-z_.]+)/);
            if (capMatch) {
              const requiredCap = capMatch[1];
              if (!caps.includes(requiredCap)) {
                warn(`Flow card "${card.id}" in ${driverName} references capability "${requiredCap}" not in driver capabilities`);
                report.stats.orphanedCards++;
              }
            }
          }
        }
      }
    }
  }
}

// ── 8. Flow Card Argument Type Validation ────────────────────────
function checkArgTypes(appFlow, driverFlows) {
  log('Phase 8: Checking flow card argument type validity...');

  const VALID_TYPES = ['device', 'string', 'number', 'boolean', 'enum', 'autocomplete', 'text'];

  function checkCard(card, location) {
    if (!card.args || !Array.isArray(card.args)) return;

    for (const arg of card.args) {
      if (arg.type && !VALID_TYPES.includes(arg.type)) {
        warn(`Flow card "${card.id}" in ${location} has invalid arg type "${arg.type}" for arg "${arg.name}"`);
      }

      // Enum args should have values
      if (arg.type === 'enum' && (!arg.values || arg.values.length === 0)) {
        warn(`Flow card "${card.id}" in ${location} has enum arg "${arg.name}" without values`);
      }
    }
  }

  for (const section of ['triggers', 'conditions', 'actions']) {
    for (const card of appFlow[section]) {
      checkCard(card, `app.json:${section}`);
    }
  }

  for (const [driverName, flow] of driverFlows) {
    for (const section of ['triggers', 'conditions', 'actions']) {
      for (const card of flow[section]) {
        checkCard(card, `drivers/${driverName}/${section}`);
      }
    }
  }
}

// ── 9. Missing Flow Cards for Drivers ────────────────────────────
function checkMissingDriverFlows(driverFlows) {
  log('Phase 9: Checking drivers missing flow card files...');

  try {
    const dirs = fs.readdirSync(DRIVERS_DIR);
    let count = 0;
    for (const name of dirs) {
      const composePath = path.join(DRIVERS_DIR, name, 'driver.compose.json');
      const flowPath = path.join(DRIVERS_DIR, name, 'driver.flow.compose.json');

      if (fs.existsSync(composePath) && !fs.existsSync(flowPath)) {
        warn(`Driver "${name}" has compose.json but no driver.flow.compose.json`);
        count++;
      }
    }
    if (count === 0) log('  All drivers have flow card files.');
  } catch (e) { /* skip */ }
}

// ── 10. Summary Statistics ────────────────────────────────────────
function main() {
  console.log(`\n${BOLD}============================================${RESET}`);
  console.log(`${BOLD}  Flow Card Health Check${RESET}`);
  console.log(`${BOLD}============================================${RESET}\n`);

  const startTime = Date.now();

  const appFlow = loadAppFlowCards();
  const driverFlows = loadDriverFlowCards();
  const driverCaps = loadDriverCapabilities();

  log(`App flow cards: ${appFlow.triggers.length + appFlow.conditions.length + appFlow.actions.length}`);
  log(`Driver flow file sets: ${driverFlows.size}\n`);

  // Run all checks
  checkDuplicateIds(appFlow, driverFlows);
  checkNamingPatterns(driverFlows);
  checkTitleFormattedBugs(appFlow, driverFlows);
  checkDeviceArgFilters(appFlow, driverFlows);
  checkMissingTitles(appFlow, driverFlows);
  checkSwitchFlowCards(driverFlows, driverCaps);
  checkCapabilityCrossRef(driverFlows, driverCaps);
  checkArgTypes(appFlow, driverFlows);
  checkMissingDriverFlows(driverFlows);

  // ── Summary ──────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${BOLD}============================================${RESET}`);
  console.log(`${BOLD}  FLOW CARD REPORT${RESET}`);
  console.log(`${BOLD}============================================${RESET}`);
  console.log(`  Total flow cards:         ${report.stats.totalFlowCards}`);
  console.log(`    App-level:              ${report.stats.totalAppFlowCards}`);
  console.log(`    Driver-level:           ${report.stats.totalDriverFlowCards}`);
  console.log(`  Drivers with flows:       ${report.stats.driversWithFlows}`);
  console.log(`  Drivers without flows:    ${report.stats.driversWithoutFlows}`);
  console.log(`  -----------------------------------------`);
  console.log(`  Duplicate IDs:            ${RED}${report.stats.duplicateIds}${RESET}`);
  console.log(`  Pattern violations:       ${YELLOW}${report.stats.patternViolations}${RESET}`);
  console.log(`  titleFormatted bugs:      ${YELLOW}${report.stats.titleFormattedBugs}${RESET}`);
  console.log(`  Missing device filters:   ${YELLOW}${report.stats.missingDeviceArg}${RESET}`);
  console.log(`  Missing titles:           ${YELLOW}${report.stats.missingTitles}${RESET}`);
  console.log(`  Orphaned references:      ${YELLOW}${report.stats.orphanedCards}${RESET}`);
  console.log(`  -----------------------------------------`);
  console.log(`  ${RED}Errors:   ${report.errors.length}${RESET}`);
  console.log(`  ${YELLOW}Warnings: ${report.warnings.length}${RESET}`);
  console.log(`  Completed in ${elapsed}s\n`);

  if (report.errors.length > 0) {
    console.log(`${RED}${BOLD}RESULT: FAIL - ${report.errors.length} error(s) found${RESET}`);
    process.exit(1);
  } else if (report.warnings.length > 0) {
    console.log(`${YELLOW}${BOLD}RESULT: WARN - ${report.warnings.length} warning(s) found${RESET}`);
    process.exit(2);
  } else {
    console.log(`${GREEN}${BOLD}RESULT: PASS - All flow card checks passed${RESET}`);
    process.exit(0);
  }
}

main();
