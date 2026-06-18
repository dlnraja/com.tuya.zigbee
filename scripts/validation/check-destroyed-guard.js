#!/usr/bin/env node
'use strict';
/**
 * check-destroyed-guard.js - CI Validation: _destroyed Guard Checker
 * ==================================================================
 * Scans all driver device.js files to ensure async callbacks and timers
 * check `this._destroyed` before calling SDK methods (setCapabilityValue,
 * triggerFlowCard, etc.).
 *
 * Project Rule: Every async callback in device lifecycle must guard with
 * `if (this._destroyed) return;` before calling Homey SDK methods.
 *
 * Usage:
 *   node scripts/validation/check-destroyed-guard.js [--json] [--verbose]
 *
 * Exit codes:
 *   0 = all drivers have proper guards
 *   1 = violations found
 *   2 = script failure
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');

const ARGS = process.argv.slice(2);
const JSON_OUTPUT = ARGS.includes('--json');
const VERBOSE = ARGS.includes('--verbose');

// Patterns that indicate a device.js file uses async callbacks or timers
const TIMER_PATTERNS = [
  /setInterval\s*\(/g,
  /setTimeout\s*\(/g,
  /this\.homey\.setInterval\s*\(/g,
  /this\.homey\.setTimeout\s*\(/g,
];

// Patterns that indicate SDK method calls that need guarding
const SDK_METHOD_PATTERNS = [
  /this\.setCapabilityValue\s*\(/g,
  /this\.safeSetCapabilityValue\s*\(/g,
  /this\._safeSetCapability\s*\(/g,
  /this\.setStoreValue\s*\(/g,
  /this\.triggerFlowCard\s*\(/g,
  /this\.triggerFlow\s*\(/g,
];

// Patterns that indicate _destroyed guard is present
const GUARD_PATTERNS = [
  /if\s*\(\s*this\._destroyed\s*\)/,
  /if\s*\(\s*.*_destroyed\s*\)/,
  /this\._destroyed\s*&&/,
  /this\._destroyed\s*\|\|/,
];

let errors = 0;
let warnings = 0;
const errorDetails = [];

function log(level, file, msg) {
  if (JSON_OUTPUT) return;
  const prefix = level === 'ERROR' ? '\x1b[31m[ERROR]\x1b[0m' : level === 'WARN' ? '\x1b[33m[WARN]\x1b[0m' : '\x1b[32m[OK]\x1b[0m';
  console.log(`${prefix} ${file}: ${msg}`);
}

function hasDestroyedGuard(content) {
  return GUARD_PATTERNS.some(p => p.test(content));
}

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(ROOT, filePath);

  // Skip files that don't have timers or async callbacks
  const hasTimers = TIMER_PATTERNS.some(p => { p.lastIndex = 0; return p.test(content); });
  const hasSdkMethods = SDK_METHOD_PATTERNS.some(p => { p.lastIndex = 0; return p.test(content); });

  if (!hasTimers && !hasSdkMethods) return null;

  const fileErrors = [];

  // Check 1: If file uses timers, it must have _destroyed guard
  if (hasTimers && !hasDestroyedGuard(content)) {
    const timerCount = TIMER_PATTERNS.reduce((sum, p) => {
      p.lastIndex = 0;
      const matches = content.match(p);
      return sum + (matches ? matches.length : 0);
    }, 0);
    if (timerCount > 0) {
      fileErrors.push({
        severity: 'error',
        message: `${timerCount} timer call(s) without _destroyed guard`,
      });
    }
  }

  // Check 2: Look for setInterval/setTimeout bodies that call SDK methods
  // without checking _destroyed above
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    // Check for SDK calls that are NOT inside a _destroyed guard block
    for (const sdkPattern of SDK_METHOD_PATTERNS) {
      sdkPattern.lastIndex = 0;
      if (sdkPattern.test(line)) {
        // Look up to 10 lines above for _destroyed guard
        const contextAbove = lines.slice(Math.max(0, i - 10), i).join('\n');
        const hasGuardAbove = GUARD_PATTERNS.some(p => p.test(contextAbove));

        // If no guard found and this looks like it's inside a callback
        if (!hasGuardAbove) {
          // Check if we're inside a timer callback by looking for timer start above
          const broaderContext = lines.slice(Math.max(0, i - 30), i).join('\n');
          const inTimer = TIMER_PATTERNS.some(p => { p.lastIndex = 0; return p.test(broaderContext); });

          if (inTimer) {
            fileErrors.push({
              severity: 'error',
              message: `SDK call at line ${i + 1} inside timer callback without _destroyed guard`,
            });
          }
        }
      }
    }
  }

  // Check 3: Uses setCapabilityValue (the raw/unsafe kind) in a file with timers
  if (hasTimers) {
    // Exclude super.setCapabilityValue() and method definitions
    const lines = content.split('\n');
    let rawSetCount = 0;
    for (const line of lines) {
      // Skip method definitions
      if (/^\s*(async\s+)?setCapabilityValue\s*\(/.test(line)) continue;
      // Skip super.setCapabilityValue
      if (/super\.setCapabilityValue\s*\(/.test(line)) continue;
      // Count raw setCapabilityValue calls
      if (/(?<!safe)(?<!_)setCapabilityValue\s*\(/.test(line)) {
        rawSetCount++;
      }
    }
    if (rawSetCount > 0) {
      fileErrors.push({
        severity: 'warning',
        message: `Uses ${rawSetCount} raw setCapabilityValue call(s) - prefer safeSetCapabilityValue`,
      });
    }
  }

  if (fileErrors.length > 0) {
    for (const err of fileErrors) {
      if (err.severity === 'error') {
        errors++;
        log('ERROR', relPath, err.message);
      } else {
        warnings++;
        log('WARN', relPath, err.message);
      }
      errorDetails.push({ file: relPath, ...err });
    }
  } else if (VERBOSE) {
    log('OK', relPath, 'Proper _destroyed guards found');
  }

  return fileErrors.length > 0 ? fileErrors : null;
}

// Main
console.log('\x1b[36m=== _destroyed Guard Checker ===\x1b[0m\n');

if (!fs.existsSync(DRIVERS_DIR)) {
  console.error('Drivers directory not found');
  process.exit(2);
}

// Scan drivers
const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
  try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
  catch { return false; }
});

let filesChecked = 0;

for (const driverName of driverDirs) {
  const devicePath = path.join(DRIVERS_DIR, driverName, 'device.js');
  if (fs.existsSync(devicePath)) {
    checkFile(devicePath);
    filesChecked++;
  }
}

// Also scan lib/ files (especially base classes)
const libDirs = ['devices', 'tuya', 'mixins'];
for (const subdir of libDirs) {
  const libSubdir = path.join(LIB_DIR, subdir);
  if (!fs.existsSync(libSubdir)) continue;
  const libFiles = fs.readdirSync(libSubdir).filter(f => f.endsWith('.js'));
  for (const f of libFiles) {
    checkFile(path.join(libSubdir, f));
    filesChecked++;
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log(`Files checked: ${filesChecked}`);
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);

if (JSON_OUTPUT) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    filesChecked,
    errors,
    warnings,
    details: errorDetails,
    exitCode: errors > 0 ? 1 : 0,
  }, null, 2));
}

if (errors > 0) {
  console.log('\n\x1b[31mFAILED\x1b[0m - Fix _destroyed guards before committing');
  process.exit(1);
} else {
  console.log('\x1b[32mPASSED\x1b[0m - All async callbacks properly guarded');
  process.exit(0);
}
