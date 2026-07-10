#!/usr/bin/env node
'use strict';
/**
 * check-super-ondeleted.js - CI Validation: super.onDeleted() Call Checker
 * =======================================================================
 * Scans ALL driver device.js files (Zigbee + WiFi) to ensure every class
 * that overrides onDeleted() or onUninit() calls super.onDeleted() or
 * super.onUninit() respectively.
 *
 * Project Rule: WiFi drivers MUST call super.onDeleted() to close TCP
 * connections. Zigbee drivers MUST call super.onDeleted() or super.onUninit()
 * to clean up Zigbee cluster subscriptions.
 *
 * This is a BROADER check than check-wifi-lifecycle.js which only scans
 * wifi_* drivers. This script scans ALL drivers.
 *
 * Usage:
 *   node scripts/validation/check-super-ondeleted.js [--json] [--verbose]
 *
 * Exit codes:
 *   0 = all drivers call super properly
 *   1 = violations found
 *   2 = script failure
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const ARGS = process.argv.slice(2);
const JSON_OUTPUT = ARGS.includes('--json');
const VERBOSE = ARGS.includes('--verbose');

let errors = 0;
let warnings = 0;
const violations = [];

function log(level, file, msg) {
  if (JSON_OUTPUT) return;
  const icon = level === 'ERROR' ? '\x1b[31m[ERROR]\x1b[0m' : level === 'WARN' ? '\x1b[33m[WARN]\x1b[0m' : '\x1b[32m[OK]\x1b[0m';
  console.log(`${icon} ${file}: ${msg}`);
}

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(ROOT, filePath);

  // Check 1: onDeleted override without super.onDeleted()
  const hasOnDeleted = /(?:async\s+)?onDeleted\s*\(\s*\)\s*\{/.test(content);
  const callsSuperDeleted = /super\.onDeleted\s*\(\s*\)/.test(content) || /super\.onDeleted\s*\?\.\s*\(\s*\)/.test(content);

  if (hasOnDeleted && !callsSuperDeleted) {
    // Determine severity based on whether it's a WiFi driver
    const isWifi = relPath.includes('wifi_') || relPath.includes('sonoff_') || relPath.includes('ewelink_');
    const severity = isWifi ? 'error' : 'error';
    const extra = isWifi ? ' - TCP connection will LEAK!' : ' - Zigbee subscriptions will NOT be cleaned up';

    errors++;
    log('ERROR', relPath, `onDeclared onDeleted() but missing super.onDeleted()${extra}`);
    violations.push({ file: relPath, method: 'onDeleted', hasSuper: false, isWifi });
  } else if (hasOnDeleted && callsSuperDeleted && VERBOSE) {
    log('OK', relPath, 'onDeleted() calls super.onDeleted()');
  }

  // Check 2: onUninit override without super.onUninit()
  const hasOnUninit = /(?:async\s+)?onUninit\s*\(\s*\)\s*\{/.test(content);
  const callsSuperUninit = /super\.onUninit\s*\(\s*\)/.test(content) || /super\.onUninit\s*\?\.\s*\(\s*\)/.test(content);

  if (hasOnUninit && !callsSuperUninit) {
    warnings++;
    log('WARN', relPath, 'onUninit() does not call super.onUninit()');
    violations.push({ file: relPath, method: 'onUninit', hasSuper: false, isWifi: false });
  } else if (hasOnUninit && callsSuperUninit && VERBOSE) {
    log('OK', relPath, 'onUninit() calls super.onUninit()');
  }
}

// Main
console.log('\x1b[36m=== super.onDeleted/onUninit Checker ===\x1b[0m\n');

if (!fs.existsSync(DRIVERS_DIR)) {
  console.error('Drivers directory not found');
  process.exit(2);
}

const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
  try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
  catch { return false; }
});

let filesChecked = 0;

for (const driverName of driverDirs) {
  // Check both device.js and driver.js
  for (const filename of ['device.js', 'driver.js']) {
    const filePath = path.join(DRIVERS_DIR, driverName, filename);
    if (fs.existsSync(filePath)) {
      checkFile(filePath);
      filesChecked++;
    }
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log(`Files checked: ${filesChecked}`);
console.log(`Errors (missing super call): ${errors}`);
console.log(`Warnings: ${warnings}`);

if (JSON_OUTPUT) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    filesChecked,
    errors,
    warnings,
    violations,
    exitCode: errors > 0 ? 1 : 0,
  }, null, 2));
}

if (errors > 0) {
  console.log('\n\x1b[31mFAILED\x1b[0m - Missing super.onDeleted() calls detected');
  console.log('These drivers will leak resources on device removal.');
  process.exit(1);
} else {
  console.log('\x1b[32mPASSED\x1b[0m - All lifecycle overrides call super properly');
  process.exit(0);
}
