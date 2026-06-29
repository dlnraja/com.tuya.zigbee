#!/usr/bin/env node
/**
 * flow-card-watchdog.js - Flow Card Integrity Watchdog v1.0.0
 * ==========================================================================
 * Comprehensive health checker for flow cards across all drivers.
 *
 * Checks performed:
 *   1. JSON syntax validation for all driver.flow.compose.json files
 *   2. Required field validation (id, title, args, tokens)
 *   3. Duplicate ID detection across all drivers
 *   4. Consistency with device.js/driver.js registration (registerRunListener)
 *   5. Capability-to-flow-card coverage analysis
 *   6. App.json flow card consistency
 *
 * Modes:
 *   --json          Output JSON report (for CI integration)
 *   --verbose       Detailed per-card output
 *   --ci            CI mode: exit 1 on errors, exit 0 on warnings only
 *   --report=FILE   Write health report to file
 *
 * Usage:
 *   node scripts/automation/flow-card-watchdog.js
 *   node scripts/automation/flow-card-watchdog.js --json --ci
 *   node scripts/automation/flow-card-watchdog.js --report=.cache/flow-health.json
 *
 * Exit codes: 0 = pass, 1 = errors found, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ── Paths ────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON = path.join(ROOT, 'app.json');
const REPORT_DIR = path.join(ROOT, '.cache');

// ── CLI Flags ────────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const JSON_OUTPUT = ARGS.includes('--json');
const VERBOSE = ARGS.includes('--verbose');
const CI_MODE = ARGS.includes('--ci');
const REPORT_FILE = ARGS.find(a => a.startsWith('--report='))?.split('=')[1] || null;

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[34m',
  M: '\x1b[35m', D: '\x1b[90m', X: '\x1b[0m', W: '\x1b[1m',
};

// ── Severity Levels ──────────────────────────────────────────────────────────
const SEV = { ERROR: 'error', WARN: 'warn', INFO: 'info' };

// ── Required fields per flow card type ───────────────────────────────────────
const REQUIRED_FIELDS = {
  triggers: ['id', 'title'],
  conditions: ['id', 'title'],
  actions: ['id', 'title'],
};

const RECOMMENDED_FIELDS = {
  triggers: ['args'],
  conditions: ['args'],
  actions: ['args'],
};

// ── Valid flow card arg types (SDK3) ─────────────────────────────────────────
const VALID_ARG_TYPES = new Set([
  'device', 'text', 'number', 'autocomplete', 'dropdown',
  'checkbox', 'color', 'date', 'time', 'textarea', 'range',
]);

// ── Capabilities that should have flow cards ─────────────────────────────────
const CAPS_NEEDING_FLOWS = new Set([
  'onoff', 'dim', 'thermostat_mode', 'thermostat_temperature',
  'locked', 'windowcoverings_set', 'fan_speed',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

const report = {
  timestamp: new Date().toISOString(),
  summary: {
    driversScanned: 0,
    driversWithFlowFiles: 0,
    driversWithoutFlowFiles: 0,
    totalFlowCards: 0,
    errors: 0,
    warnings: 0,
    info: 0,
  },
  jsonSyntax: { valid: 0, invalid: 0, files: [] },
  requiredFields: { valid: 0, missing: 0, issues: [] },
  duplicateIds: { found: 0, duplicates: [] },
  deviceJsConsistency: { consistent: 0, inconsistent: 0, issues: [] },
  capabilityCoverage: {
    totalCapsNeedingFlows: 0,
    coveredCaps: 0,
    uncoveredDrivers: [],
  },
  appJsonFlow: { valid: true, issues: [] },
  driverDetails: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// ISSUE TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

function addIssue(severity, category, driver, message, details = {}) {
  const issue = { severity, category, driver, message, ...details };
  if (severity === SEV.ERROR) report.summary.errors++;
  else if (severity === SEV.WARN) report.summary.warnings++;
  else report.summary.info++;

  if (category === 'json_syntax') report.jsonSyntax.files.push(issue);
  else if (category === 'required_fields') report.requiredFields.issues.push(issue);
  else if (category === 'duplicate_id') report.duplicateIds.duplicates.push(issue);
  else if (category === 'device_js') report.deviceJsConsistency.issues.push(issue);
  else if (category === 'app_json') report.appJsonFlow.issues.push(issue);

  if (!JSON_OUTPUT) {
    const icon = severity === SEV.ERROR ? `${C.R}ERROR`
      : severity === SEV.WARN ? `${C.Y}WARN`
        : `${C.B}INFO`;
    console.log(`${icon}${C.X} [${category}] ${driver ? driver + ': ' : ''}${message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. JSON SYNTAX VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateJsonSyntax(filePath, driverName) {
  const relPath = path.relative(ROOT, filePath);
  try {
    const content = fs.readFileSync(filePath);
    JSON.parse(content);
    report.jsonSyntax.valid++;
    if (VERBOSE) console.log(`  ${C.G}OK${C.X} ${relPath}`);
    return true;
  } catch (e) {
    report.jsonSyntax.invalid++;
    addIssue(SEV.ERROR, 'json_syntax', driverName,
      `Invalid JSON in ${relPath}: ${e.message}`, { file: relPath });
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. REQUIRED FIELD VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateRequiredFields(flowData, driverName, source) {
  let issues = 0;
  for (const cardType of ['triggers', 'conditions', 'actions']) {
    const cards = flowData[cardType] || [];
    const required = REQUIRED_FIELDS[cardType] || [];
    const recommended = RECOMMENDED_FIELDS[cardType] || [];

    for (const card of cards) {
      // Check required fields
      for (const field of required) {
        if (!card[field]) {
          addIssue(SEV.ERROR, 'required_fields', driverName,
            `Missing required field '${field}' in ${cardType} card in ${source}`, {
              cardId: card.id || '(no id)', cardType, field,
            });
          report.requiredFields.missing++;
          issues++;
        } else {
          report.requiredFields.valid++;
        }
      }

      // Check recommended fields
      for (const field of recommended) {
        if (!card[field]) {
          addIssue(SEV.WARN, 'required_fields', driverName,
            `Missing recommended field '${field}' in ${cardType} card '${card.id || '(no id)'}' in ${source}`, {
              cardId: card.id, cardType, field,
            });
          issues++;
        }
      }

      // Validate title is an object with 'en' key
      if (card.title && typeof card.title === 'object') {
        if (!card.title.en) {
          addIssue(SEV.WARN, 'required_fields', driverName,
            `Title missing 'en' locale in ${cardType} card '${card.id || '(no id)'}' in ${source}`, {
              cardId: card.id, cardType,
            });
          issues++;
        }
      } else if (card.title && typeof card.title === 'string') {
        // Title as string is acceptable for simple cards
      }

      // Validate args structure
      if (card.args && Array.isArray(card.args)) {
        for (const arg of card.args) {
          if (!arg.name) {
            addIssue(SEV.WARN, 'required_fields', driverName,
              `Arg missing 'name' in ${cardType} card '${card.id || '(no id)'}' in ${source}`, {
                cardId: card.id, cardType,
              });
            issues++;
          }
          if (arg.type && !VALID_ARG_TYPES.has(arg.type)) {
            addIssue(SEV.WARN, 'required_fields', driverName,
              `Unknown arg type '${arg.type}' in ${cardType} card '${card.id || '(no id)'}' in ${source}`, {
                cardId: card.id, cardType, argType: arg.type,
              });
            issues++;
          }
        }
      }

      // Check for device arg without filter
      if (card.args && Array.isArray(card.args)) {
        for (const arg of card.args) {
          if (arg.type === 'device' && !arg.filter) {
            addIssue(SEV.WARN, 'required_fields', driverName,
              `Device arg without filter in ${cardType} card '${card.id || '(no id)'}' in ${source}`, {
                cardId: card.id, cardType,
              });
            issues++;
          }
        }
      }
    }
  }
  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DUPLICATE ID DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

const globalIdMap = new Map(); // id -> [{ driver, cardType, source }]

function trackFlowCardIds(flowData, driverName, source) {
  for (const cardType of ['triggers', 'conditions', 'actions']) {
    const cards = flowData[cardType] || [];
    for (const card of cards) {
      if (!card.id) continue;
      if (!globalIdMap.has(card.id)) {
        globalIdMap.set(card.id, []);
      }
      globalIdMap.get(card.id).push({ driver: driverName, cardType, source });
    }
  }
}

function checkDuplicateIds() {
  for (const [id, locations] of globalIdMap) {
    // IDs within the same driver are expected (triggers + actions can share pattern)
    // IDs ACROSS drivers are the real problem
    const uniqueDrivers = new Set(locations.map(l => l.driver));
    if (uniqueDrivers.size > 1) {
      report.duplicateIds.found++;
      addIssue(SEV.ERROR, 'duplicate_id', null,
        `Flow card ID '${id}' duplicated across ${uniqueDrivers.size} drivers: ${[...uniqueDrivers].join(', ')}`, {
          cardId: id, drivers: [...uniqueDrivers],
        });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. DEVICE.JS CONSISTENCY CHECK
// ═══════════════════════════════════════════════════════════════════════════════

function checkDeviceJsConsistency(driverName, flowData) {
  const devicePath = path.join(DRIVERS_DIR, driverName, 'device.js');
  const driverPath = path.join(DRIVERS_DIR, driverName, 'driver.js');

  let totalActions = 0;
  let totalConditions = 0;
  for (const cardType of ['actions', 'conditions']) {
    const cards = flowData[cardType] || [];
    totalActions += cards.length;
    if (cardType === 'conditions') totalConditions = cards.length;
  }

  if (totalActions === 0 && totalConditions === 0) return;

  try {
    const sourceFiles = [devicePath, driverPath].filter(fs.existsSync);
    const sourceText = sourceFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
    const hasKnownFlowHelper = /\bregister(Button|SOS)FlowCards\b/.test(sourceText);
    const hasRunHandler = sourceText.includes('registerRunListener') ||
      sourceText.includes('onRunListener') ||
      hasKnownFlowHelper;

    if (!hasRunHandler) {
      report.deviceJsConsistency.inconsistent++;
      addIssue(SEV.WARN, 'device_js', driverName,
        `Flow cards define ${totalActions} action(s) / ${totalConditions} condition(s) but device.js/driver.js has no registerRunListener`, {
          actions: totalActions, conditions: totalConditions,
        });
    } else {
      report.deviceJsConsistency.consistent++;
    }
  } catch (e) {
    // Can't read device.js, skip
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. CAPABILITY COVERAGE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

function analyzeCapabilityCoverage(driverName, driverConfig, flowData) {
  const capabilities = driverConfig.capabilities || [];
  let totalFlowCards = 0;
  for (const cardType of ['triggers', 'conditions', 'actions']) {
    totalFlowCards += (flowData[cardType] || []).length;
  }
  const hasAnyFlowCards = totalFlowCards > 0;

  for (const cap of capabilities) {
    const baseCap = cap.split('.')[0]; // strip sub-capabilities like onoff.1
    if (CAPS_NEEDING_FLOWS.has(baseCap)) {
      report.capabilityCoverage.totalCapsNeedingFlows++;
      if (hasAnyFlowCards) {
        report.capabilityCoverage.coveredCaps++;
      } else {
        report.capabilityCoverage.uncoveredDrivers.push({
          driver: driverName, capability: baseCap,
        });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. APP.JSON FLOW CARD VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateAppJsonFlow() {
  if (!fs.existsSync(APP_JSON)) {
    addIssue(SEV.ERROR, 'app_json', null, 'app.json not found');
    report.appJsonFlow.valid = false;
    return;
  }

  try {
    const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
    const flow = app.flow || {};

    for (const cardType of ['triggers', 'conditions', 'actions']) {
      const cards = flow[cardType] || [];
      for (const card of cards) {
        if (!card.id) {
          addIssue(SEV.ERROR, 'app_json', null,
            `App-level ${cardType} card missing 'id'`);
          report.appJsonFlow.valid = false;
        }
        if (!card.title) {
          addIssue(SEV.WARN, 'app_json', null,
            `App-level ${cardType} card '${card.id || '(no id)'}' missing 'title'`);
        }
      }

      // Check for duplicate IDs at app level
      const ids = cards.map(c => c.id).filter(Boolean);
      const seen = new Set();
      for (const id of ids) {
        if (seen.has(id)) {
          addIssue(SEV.ERROR, 'app_json', null,
            `Duplicate app-level flow card ID: '${id}' in ${cardType}`);
          report.appJsonFlow.valid = false;
        }
        seen.add(id);
      }
    }
  } catch (e) {
    addIssue(SEV.ERROR, 'app_json', null, `Failed to parse app.json: ${e.message}`);
    report.appJsonFlow.valid = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCAN
// ═══════════════════════════════════════════════════════════════════════════════

function runWatchdog() {
  if (!JSON_OUTPUT) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`  FLOW CARD INTEGRITY WATCHDOG v1.0.0`);
    console.log(`${'='.repeat(70)}\n`);
  }

  // Scan all driver directories
  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
    catch { return false; }
  });

  report.summary.driversScanned = driverDirs.length;

  for (const driverName of driverDirs) {
    const driverDetail = { name: driverName, flowFile: false, cards: 0, issues: 0 };
    const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    const flowPath = path.join(DRIVERS_DIR, driverName, 'driver.flow.compose.json');

    // Load driver compose config
    let driverConfig = {};
    if (fs.existsSync(composePath)) {
      try {
        driverConfig = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      } catch { /* skip */ }
    }

    // Check if flow compose file exists
    const hasFlowFile = fs.existsSync(flowPath);
    if (hasFlowFile) {
      report.summary.driversWithFlowFiles++;
      driverDetail.flowFile = true;

      // 1. JSON syntax check
      if (!validateJsonSyntax(flowPath, driverName)) {
        driverDetail.issues++;
        report.driverDetails.push(driverDetail);
        continue; // Can't parse, skip further checks
      }

      // Parse flow compose
      const flowData = JSON.parse(fs.readFileSync(flowPath, 'utf8'));

      // Count cards
      for (const cardType of ['triggers', 'conditions', 'actions']) {
        driverDetail.cards += (flowData[cardType] || []).length;
      }
      report.summary.totalFlowCards += driverDetail.cards;

      // 2. Required field validation
      driverDetail.issues += validateRequiredFields(flowData, driverName, 'driver.flow.compose.json');

      // 3. Track IDs for duplicate detection
      trackFlowCardIds(flowData, driverName, 'driver.flow.compose.json');

      // 4. Device.js consistency
      checkDeviceJsConsistency(driverName, flowData);

      // 5. Capability coverage
      analyzeCapabilityCoverage(driverName, driverConfig, flowData);

    } else {
      report.summary.driversWithoutFlowFiles++;

      // Check if this driver has capabilities that need flow cards
      const capabilities = driverConfig.capabilities || [];
      const capsNeedingFlows = capabilities.filter(c => CAPS_NEEDING_FLOWS.has(c.split('.')[0]));
      if (capsNeedingFlows.length > 0) {
        addIssue(SEV.WARN, 'missing_flow_file', driverName,
          `No driver.flow.compose.json but has capabilities needing flows: ${capsNeedingFlows.join(', ')}`, {
            capabilities: capsNeedingFlows,
          });
      }
    }

    report.driverDetails.push(driverDetail);
  }

  // Check for duplicate IDs across all drivers
  checkDuplicateIds();

  // Validate app.json flow cards
  validateAppJsonFlow();

  return report;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT & REPORTING
// ═══════════════════════════════════════════════════════════════════════════════

function printReport() {
  const s = report.summary;

  if (!JSON_OUTPUT) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`  FLOW CARD HEALTH REPORT`);
    console.log(`${'='.repeat(70)}\n`);

    console.log(`  Drivers scanned:     ${s.driversScanned}`);
    console.log(`  With flow files:     ${C.G}${s.driversWithFlowFiles}${C.X}`);
    console.log(`  Without flow files:  ${C.Y}${s.driversWithoutFlowFiles}${C.X}`);
    console.log(`  Total flow cards:    ${s.totalFlowCards}`);
    console.log('');

    // JSON Syntax
    console.log(`  JSON Syntax:`);
    console.log(`    Valid:   ${C.G}${report.jsonSyntax.valid}${C.X}`);
    console.log(`    Invalid: ${report.jsonSyntax.invalid > 0 ? C.R : C.G}${report.jsonSyntax.invalid}${C.X}`);
    console.log('');

    // Required Fields
    console.log(`  Required Fields:`);
    console.log(`    Valid:    ${C.G}${report.requiredFields.valid}${C.X}`);
    console.log(`    Missing:  ${report.requiredFields.missing > 0 ? C.R : C.G}${report.requiredFields.missing}${C.X}`);
    console.log('');

    // Duplicate IDs
    console.log(`  Duplicate IDs:`);
    console.log(`    Cross-driver duplicates: ${report.duplicateIds.found > 0 ? C.R : C.G}${report.duplicateIds.found}${C.X}`);
    console.log('');

    // Device.js Consistency
    console.log(`  Device.js Consistency:`);
    console.log(`    Consistent:     ${C.G}${report.deviceJsConsistency.consistent}${C.X}`);
    console.log(`    Inconsistent:   ${report.deviceJsConsistency.inconsistent > 0 ? C.Y : C.G}${report.deviceJsConsistency.inconsistent}${C.X}`);
    console.log('');

    // Capability Coverage
    const cc = report.capabilityCoverage;
    const coveragePct = cc.totalCapsNeedingFlows > 0
      ? Math.round((cc.coveredCaps / cc.totalCapsNeedingFlows) * 100)
      : 100;
    console.log(`  Capability Coverage:`);
    console.log(`    Total capabilities needing flows: ${cc.totalCapsNeedingFlows}`);
    console.log(`    Covered: ${C.G}${cc.coveredCaps}${C.X} (${coveragePct}%)`);
    console.log(`    Uncovered drivers: ${cc.uncoveredDrivers.length}`);
    console.log('');

    // App.json
    console.log(`  App.json Flow Cards:`);
    console.log(`    Status: ${report.appJsonFlow.valid ? C.G + 'VALID' : C.R + 'INVALID'}${C.X}`);
    console.log('');

    // Overall verdict
    const hasErrors = s.errors > 0;
    const hasWarnings = s.warnings > 0;
    console.log(`${'='.repeat(70)}`);
    if (hasErrors) {
      console.log(`  ${C.R}FAILED${C.X} - ${s.errors} error(s), ${s.warnings} warning(s)`);
    } else if (hasWarnings) {
      console.log(`  ${C.Y}PASSED WITH WARNINGS${C.X} - ${s.warnings} warning(s)`);
    } else {
      console.log(`  ${C.G}ALL CHECKS PASSED${C.X}`);
    }
    console.log(`${'='.repeat(70)}\n`);
  }
}

function saveReport() {
  if (!REPORT_FILE) return;
  try {
    const dir = path.dirname(REPORT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
    if (!JSON_OUTPUT) console.log(`Report saved to: ${REPORT_FILE}`);
  } catch (e) {
    console.error(`Failed to save report: ${e.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

try {
  runWatchdog();
  printReport();
  saveReport();

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2));
  }

  // CI mode: exit 1 on errors
  if (CI_MODE && report.summary.errors > 0) {
    process.exit(1);
  }
  // Normal mode: exit 1 on errors
  if (report.summary.errors > 0) {
    process.exit(1);
  }
} catch (e) {
  console.error(`[FLOW-CARD-WATCHDOG] Fatal: ${e.message}`);
  if (VERBOSE) console.error(e.stack);
  process.exit(2);
}
