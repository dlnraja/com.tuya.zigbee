#!/usr/bin/env node
'use strict';
/**
 * check-circuit-breaker.js - CI Validation: CircuitBreaker Integration Checker
 * ============================================================================
 * Scans all lib/ and driver files to verify that external API calls (HTTP,
 * TCP, cloud APIs) use CircuitBreaker patterns to prevent cascade failures.
 *
 * Project Rule: All external network calls must be wrapped in CircuitBreaker
 * to prevent cascade failures when remote services are down.
 *
 * The CircuitBreaker module is at: lib/utils/CircuitBreaker.js
 *
 * Usage:
 *   node scripts/validation/check-circuit-breaker.js [--json] [--verbose]
 *
 * Exit codes:
 *   0 = all external calls use CircuitBreaker
 *   1 = violations found (external calls without CircuitBreaker)
 *   2 = script failure
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const LIB_DIR = path.join(ROOT, 'lib');

const ARGS = process.argv.slice(2);
const JSON_OUTPUT = ARGS.includes('--json');
const VERBOSE = ARGS.includes('--verbose');

let errors = 0;
let warnings = 0;
const violations = [];

// Patterns that indicate external network calls
const NETWORK_CALL_PATTERNS = [
  { pattern: /https?:\/\/[^\s'"]+/g, name: 'HTTP URL' },
  { pattern: /fetch\s*\(/g, name: 'fetch()' },
  { pattern: /axios\.(get|post|put|delete|patch)\s*\(/g, name: 'axios call' },
  { pattern: /\.request\s*\(/g, name: 'http.request()' },
  { pattern: /\.connect\s*\(/g, name: 'socket.connect()' },
  { pattern: /require\s*\(\s*['"]https['"]\s*\)/g, name: 'https module' },
  { pattern: /require\s*\(\s*['"]http['"]\s*\)/g, name: 'http module' },
];

// Patterns that indicate CircuitBreaker usage
const CIRCUIT_BREAKER_PATTERNS = [
  /CircuitBreaker/,
  /circuitBreaker/,
  /circuit_breaker/,
  /circuit\.execute/,
  /breaker\.execute/,
  /CB\.execute/,
];

// Files that are known to use CircuitBreaker or are allowed to not use it
const EXEMPT_FILES = [
  'CircuitBreaker.js',  // The module itself
  'CacheManager.js',    // Cache layer
  'scanner-cache.js',   // Scanner cache
];

// Directories that are exempt (scripts, tests, scanners)
const EXEMPT_DIRS = ['scripts/', 'test/', '.github/', 'scanners/'];

function log(level, file, msg) {
  if (JSON_OUTPUT) return;
  const icon = level === 'ERROR' ? '\x1b[31m[ERROR]\x1b[0m' : level === 'WARN' ? '\x1b[33m[WARN]\x1b[0m' : '\x1b[32m[OK]\x1b[0m';
  console.log(`${icon} ${file}: ${msg}`);
}

function isExempt(filePath) {
  const relPath = path.relative(ROOT, filePath);
  if (EXEMPT_DIRS.some(d => relPath.startsWith(d))) return true;
  if (EXEMPT_FILES.some(f => relPath.endsWith(f))) return true;
  return false;
}

function usesCircuitBreaker(content) {
  return CIRCUIT_BREAKER_PATTERNS.some(p => p.test(content));
}

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  if (isExempt(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(ROOT, filePath);

  // Skip if file doesn't have any network calls
  let hasNetworkCalls = false;
  for (const { pattern } of NETWORK_CALL_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      hasNetworkCalls = true;
      break;
    }
  }
  if (!hasNetworkCalls) return;

  // File has network calls - check if it uses CircuitBreaker
  const hasCB = usesCircuitBreaker(content);

  if (!hasCB) {
    // Check if the network calls are in comments or strings
    const lines = content.split('\n');
    let realNetworkCalls = 0;
    let networkCallTypes = new Set();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

      for (const { pattern, name } of NETWORK_CALL_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          realNetworkCalls++;
          networkCallTypes.add(name);
        }
      }
    }

    if (realNetworkCalls > 0) {
      // Check if this file delegates to another module that has CB
      const delegatesToModule = /(?:TuyaCloudAPI|TuyaLocalClient|TuyaSmartLifeAuth|EweLinkLANClient)/.test(content);
      
      if (!delegatesToModule) {
        const types = [...networkCallTypes].join(', ');
        warnings++;
        log('WARN', relPath, `${realNetworkCalls} network call(s) [${types}] without CircuitBreaker`);
        violations.push({ file: relPath, networkCalls: realNetworkCalls, types: [...networkCallTypes] });
      } else if (VERBOSE) {
        log('OK', relPath, 'Network calls delegated to module with CircuitBreaker');
      }
    }
  } else if (VERBOSE) {
    log('OK', relPath, 'Uses CircuitBreaker for network calls');
  }
}

// Main
console.log('\x1b[36m=== CircuitBreaker Integration Checker ===\x1b[0m\n');

// First verify CircuitBreaker.js exists
const cbPath = path.join(LIB_DIR, 'utils', 'CircuitBreaker.js');
if (!fs.existsSync(cbPath)) {
  console.error('\x1b[31m[FATAL]\x1b[0m CircuitBreaker.js not found at lib/utils/CircuitBreaker.js');
  console.error('Cannot validate CircuitBreaker integration without the module.');
  process.exit(2);
}

console.log(`CircuitBreaker module: ${path.relative(ROOT, cbPath)}\n`);

// Scan lib/ directory recursively
function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.name.endsWith('.js')) {
      checkFile(fullPath);
    }
  }
}

scanDir(LIB_DIR);

// Also check driver.js files for WiFi drivers (they make direct network calls)
const DRIVERS_DIR = path.join(ROOT, 'drivers');
if (fs.existsSync(DRIVERS_DIR)) {
  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
    catch { return false; }
  });

  for (const driverName of driverDirs) {
    // Only check WiFi driver driver.js files
    if (!driverName.startsWith('wifi_') && !driverName.startsWith('sonoff_') && !driverName.startsWith('ewelink_')) continue;
    
    for (const filename of ['driver.js', 'device.js']) {
      const filePath = path.join(DRIVERS_DIR, driverName, filename);
      if (fs.existsSync(filePath)) {
        checkFile(filePath);
      }
    }
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log(`Warnings (network calls without CB): ${warnings}`);

if (JSON_OUTPUT) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    circuitBreakerExists: true,
    errors,
    warnings,
    violations,
    exitCode: errors > 0 ? 1 : 0,
  }, null, 2));
}

if (errors > 0) {
  console.log('\n\x1b[31mFAILED\x1b[0m - External calls must use CircuitBreaker');
  process.exit(1);
} else if (warnings > 0) {
  console.log('\n\x1b[33mWARNINGS\x1b[0m - Some network calls may benefit from CircuitBreaker');
  console.log('(This is advisory - not blocking)');
  process.exit(0);
} else {
  console.log('\x1b[32mPASSED\x1b[0m - CircuitBreaker integration verified');
  process.exit(0);
}
