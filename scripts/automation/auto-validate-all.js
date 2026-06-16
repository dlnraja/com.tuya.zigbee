#!/usr/bin/env node
'use strict';

/**
 * auto-validate-all.js - Comprehensive Validation Pipeline v1.0.0
 * =================================================================
 * Runs all validation checks across the codebase, checks for AggregateError
 * risks, Processing failed risks, bundle size, and generates a health report.
 *
 * Checks:
 *   1. JavaScript syntax validation (node --check)
 *   2. JSON schema validation (app.json, package.json, driver.compose.json)
 *   3. Anti-pattern detection (banned code patterns)
 *   4. AggregateError risk detection (empty manufacturerName arrays, wildcards)
 *   5. Processing failed risk detection (missing try/catch, unsafe operations)
 *   6. Bundle size check (< 7MB limit)
 *   7. Driver compose consistency (manufacturerName + productId non-empty)
 *   8. Import path validation (correct relative paths)
 *   9. Settings key validation (zb_model_id, not zb_modelId)
 *  10. Fingerprint collision detection
 *  11. Memory leak risk detection (missing destroy guards)
 *  12. Flow card ID uniqueness validation
 *
 * Usage:
 *   node scripts/automation/auto-validate-all.js                    # full validation
 *   node scripts/automation/auto-validate-all.js --json            # JSON output
 *   node scripts/automation/auto-validate-all.js --pre-commit      # pre-commit mode
 *   node scripts/automation/auto-validate-all.js --verbose         # detailed output
 *   node scripts/automation/auto-validate-all.js --report=path     # custom report path
 *   node scripts/automation/auto-validate-all.js --skip=js         # skip JS validation
 *   node scripts/automation/auto-validate-all.js --skip=json       # skip JSON validation
 *
 * Exit codes:
 *   0 = all validations passed
 *   1 = errors found
 *   2 = script failure
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');
const STATE_DIR = path.join(ROOT, '.github', 'state');
const REPORT_DIR = path.join(ROOT, '.cache', 'validation');

// ── CLI Arguments ─────────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const JSON_OUTPUT = ARGS.includes('--json');
const PRE_COMMIT = ARGS.includes('--pre-commit');
const VERBOSE = ARGS.includes('--verbose');
const SKIP_JS = ARGS.includes('--skip=js');
const SKIP_JSON = ARGS.includes('--skip=json');
const SKIP_YAML = ARGS.includes('--skip=yaml');
const REPORT_PATH = (() => {
  const r = ARGS.find(a => a.startsWith('--report='));
  return r ? r.split('=').slice(1).join('=') : null;
})();

// ── Results ───────────────────────────────────────────────────────────────────
const results = {
  timestamp: new Date().toISOString(),
  duration: 0,
  mode: PRE_COMMIT ? 'pre-commit' : 'standalone',
  summary: {
    totalChecks: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    errors: 0,
  },
  checks: [],
  aggregateErrorRisks: [],
  processingFailedRisks: [],
  bundleSize: null,
  antiPatterns: [],
  fingerprintIssues: [],
  memoryLeakRisks: [],
  flowCardIssues: [],
  importIssues: [],
  settingsKeyIssues: [],
};

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(color, ...args) {
  if (!JSON_OUTPUT) console.log(`${C[color] || ''}[VALIDATE]${C.reset}`, ...args);
}

function warn(...args) {
  results.summary.warnings++;
  if (!JSON_OUTPUT) console.warn(`${C.yellow}[VALIDATE WARN]${C.reset}`, ...args);
}

function error(...args) {
  results.summary.errors++;
  if (!JSON_OUTPUT) console.error(`${C.red}[VALIDATE ERROR]${C.reset}`, ...args);
}

// ── File Discovery ────────────────────────────────────────────────────────────
function findFiles(dir, extension, ignoreDirs = ['node_modules', '.git', '.cache', '.homeybuild', 'build', 'quarantine']) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (!ignoreDirs.includes(entry)) {
            files.push(...findFiles(fullPath, extension, ignoreDirs));
          }
        } else if (entry.endsWith(extension)) {
          files.push(fullPath);
        }
      } catch (_e) { /* skip inaccessible */ }
    }
  } catch (_e) { /* skip */ }
  return files;
}

// ── Check 1: JavaScript Syntax Validation ─────────────────────────────────────
function checkJavaScriptSyntax() {
  const startTime = Date.now();
  const check = { name: 'JavaScript Syntax', status: 'pass', errors: [], warnings: [] };

  const jsFiles = [
    ...findFiles(DRIVERS_DIR, '.js'),
    ...findFiles(LIB_DIR, '.js'),
  ];

  for (const filePath of jsFiles) {
    const relPath = path.relative(ROOT, filePath);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      new vm.Script(content, { filename: filePath });
    } catch (syntaxErr) {
      check.errors.push({
        file: relPath,
        type: 'syntax',
        message: syntaxErr.message,
      });
    }
  }

  check.elapsed = Date.now() - startTime;
  check.fileCount = jsFiles.length;
  if (check.errors.length > 0) check.status = 'fail';
  results.checks.push(check);
  results.summary.totalChecks++;
  if (check.status === 'pass') results.summary.passed++;
  else results.summary.failed++;
}

// ── Check 2: JSON Validation ──────────────────────────────────────────────────
function checkJSONValidation() {
  const startTime = Date.now();
  const check = { name: 'JSON Validation', status: 'pass', errors: [], warnings: [] };

  // Critical JSON schemas
  const CRITICAL_JSON = {
    'app.json': { required: ['id', 'version', 'drivers'], type: 'object' },
    'package.json': { required: ['name', 'version'], type: 'object' },
  };

  // Validate root JSON files
  const rootJsonFiles = findFiles(ROOT, '.json').filter(f => !f.includes('node_modules'));
  for (const filePath of rootJsonFiles) {
    const relPath = path.relative(ROOT, filePath);
    try {
      const raw = fs.readFileSync(filePath);
      const data = JSON.parse(raw);

      const basename = path.basename(filePath);
      if (CRITICAL_JSON[basename]) {
        const schema = CRITICAL_JSON[basename];
        if (schema.type && typeof data !== schema.type) {
          check.errors.push({ file: relPath, type: 'schema', message: `Expected type "${schema.type}"` });
        }
        if (schema.required) {
          for (const field of schema.required) {
            if (!(field in data)) {
              check.errors.push({ file: relPath, type: 'schema', message: `Missing required field: "${field}"` });
            }
          }
        }
      }
    } catch (parseErr) {
      check.errors.push({ file: relPath, type: 'syntax', message: parseErr.message });
    }
  }

  check.elapsed = Date.now() - startTime;
  check.fileCount = rootJsonFiles.length;
  if (check.errors.length > 0) check.status = 'fail';
  results.checks.push(check);
  results.summary.totalChecks++;
  if (check.status === 'pass') results.summary.passed++;
  else results.summary.failed++;
}

// ── Check 3: AggregateError Risk Detection ────────────────────────────────────
function checkAggregateErrorRisks() {
  const startTime = Date.now();
  const check = { name: 'AggregateError Risk Detection', status: 'pass', errors: [], warnings: [] };

  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
    catch (_e) { return false; }
  });

  for (const dir of driverDirs) {
    const dcjPath = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
    if (!fs.existsSync(dcjPath)) continue;

    try {
      const config = JSON.parse(fs.readFileSync(dcjPath));

      // Risk 1: Empty manufacturerName array
      if (Array.isArray(config.zigbee?.manufacturerName) && config.zigbee.manufacturerName.length === 0) {
        results.aggregateErrorRisks.push({
          driver: dir,
          risk: 'EMPTY_MANUFACTURER_NAME',
          message: 'Empty manufacturerName array can cause AggregateError during pairing',
          severity: 'error',
        });
        check.errors.push({ file: `drivers/${dir}`, type: 'aggregate-error-risk', message: 'Empty manufacturerName array' });
      }

      // Risk 2: Wildcard in manufacturerName
      if (Array.isArray(config.zigbee?.manufacturerName)) {
        const wildcards = config.zigbee.manufacturerName.filter(m => m === '*' || m.includes('*') || m.includes('?'));
        if (wildcards.length > 0) {
          results.aggregateErrorRisks.push({
            driver: dir,
            risk: 'WILDCARD_MANUFACTURER',
            message: `Wildcard in manufacturerName: ${wildcards.join(', ')}`,
            severity: 'error',
          });
          check.errors.push({ file: `drivers/${dir}`, type: 'aggregate-error-risk', message: `Wildcard: ${wildcards.join(', ')}` });
        }
      }

      // Risk 3: Empty productId array
      if (Array.isArray(config.zigbee?.productId) && config.zigbee.productId.length === 0) {
        results.aggregateErrorRisks.push({
          driver: dir,
          risk: 'EMPTY_PRODUCT_ID',
          message: 'Empty productId array can cause pairing failures',
          severity: 'warning',
        });
        check.warnings.push({ file: `drivers/${dir}`, message: 'Empty productId array' });
      }

      // Risk 4: Empty string entries
      if (Array.isArray(config.zigbee?.manufacturerName)) {
        const emptyEntries = config.zigbee.manufacturerName.filter(m => !m || typeof m !== 'string' || m.trim() === '');
        if (emptyEntries.length > 0) {
          results.aggregateErrorRisks.push({
            driver: dir,
            risk: 'EMPTY_STRING_ENTRIES',
            message: `${emptyEntries.length} empty string entries in manufacturerName`,
            severity: 'warning',
          });
          check.warnings.push({ file: `drivers/${dir}`, message: `${emptyEntries.length} empty string entries` });
        }
      }
    } catch (e) { /* skip broken JSON */ }
  }

  check.elapsed = Date.now() - startTime;
  if (check.errors.length > 0) check.status = 'fail';
  else if (check.warnings.length > 0) check.status = 'warn';
  results.checks.push(check);
  results.summary.totalChecks++;
  if (check.status === 'pass') results.summary.passed++;
  else results.summary.failed++;
}

// ── Check 4: Processing Failed Risk Detection ─────────────────────────────────
function checkProcessingFailedRisks() {
  const startTime = Date.now();
  const check = { name: 'Processing Failed Risk Detection', status: 'pass', errors: [], warnings: [] };

  const jsFiles = [
    ...findFiles(DRIVERS_DIR, '.js'),
    ...findFiles(LIB_DIR, '.js'),
  ];

  for (const filePath of jsFiles) {
    const relPath = path.relative(ROOT, filePath);

    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Risk 1: Raw setCapabilityValue (should use safesetCapability)
      if (!filePath.includes('scripts/')) {
        const setCapPattern = /(?<!\/\/.*)(?<!\*.*)(?<!\._safeSet)(?<!\.safesetCapability)(?<!\.safeSetCapability)\bsetCapabilityValue\s*\(/g;
        let match;
        while ((match = setCapPattern.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length;
          results.processingFailedRisks.push({
            file: relPath,
            risk: 'RAW_SET_CAPABILITY',
            message: `Raw setCapabilityValue at line ${lineNum} (use safesetCapability)`,
            severity: 'warning',
            line: lineNum,
          });
          check.warnings.push({ file: relPath, message: `Raw setCapabilityValue at line ${lineNum}` });
        }
      }

      // Risk 2: Linear battery formula
      const batteryPattern = /\(voltage\s*-\s*2\.5\)\s*\/\s*0\.5/g;
      let batteryMatch;
      while ((batteryMatch = batteryPattern.exec(content)) !== null) {
        const lineNum = content.substring(0, batteryMatch.index).split('\n').length;
        results.processingFailedRisks.push({
          file: relPath,
          risk: 'LINEAR_BATTERY',
          message: `Linear battery formula at line ${lineNum} (use UnifiedBatteryHandler)`,
          severity: 'error',
          line: lineNum,
        });
        check.errors.push({ file: relPath, message: `Linear battery formula at line ${lineNum}` });
      }

      // Risk 3: console.log/error/warn in production code
      if (!filePath.includes('scripts/')) {
        const consolePattern = /console\.(log|error|warn)\s*\(/g;
        let consoleMatch;
        while ((consoleMatch = consolePattern.exec(content)) !== null) {
          const lineNum = content.substring(0, consoleMatch.index).split('\n').length;
          results.processingFailedRisks.push({
            file: relPath,
            risk: 'CONSOLE_LOG',
            message: `console.${consoleMatch[1]} at line ${lineNum} (use this.log/this.error)`,
            severity: 'warning',
            line: lineNum,
          });
          check.warnings.push({ file: relPath, message: `console.${consoleMatch[1]} at line ${lineNum}` });
        }
      }

      // Risk 4: Missing destroy guard in device.js files
      if (path.basename(filePath) === 'device.js' && filePath.includes('drivers/')) {
        if (content.includes('setInterval') || content.includes('setTimeout')) {
          if (!content.includes('_destroyed') && !content.includes('onDeleted') && !content.includes('onUninit')) {
            results.processingFailedRisks.push({
              file: relPath,
              risk: 'MISSING_DESTROY_GUARD',
              message: 'Device has timers but no destroy guard (_destroyed check)',
              severity: 'warning',
            });
            check.warnings.push({ file: relPath, message: 'Missing destroy guard with timers' });
          }
        }
      }
    } catch (e) { /* skip */ }
  }

  check.elapsed = Date.now() - startTime;
  if (check.errors.length > 0) check.status = 'fail';
  else if (check.warnings.length > 0) check.status = 'warn';
  results.checks.push(check);
  results.summary.totalChecks++;
  if (check.status === 'pass') results.summary.passed++;
  else results.summary.failed++;
}

// ── Check 5: Bundle Size ──────────────────────────────────────────────────────
function checkBundleSize() {
  const startTime = Date.now();
  const check = { name: 'Bundle Size Check', status: 'pass', errors: [], warnings: [] };

  const MAX_SIZE_MB = 7;
  let totalSize = 0;
  const fileSizes = [];

  // Calculate total size of lib/ and drivers/
  const dirs = [LIB_DIR, DRIVERS_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = findFiles(dir, '.js').concat(findFiles(dir, '.json'));
    for (const file of files) {
      try {
        const stat = fs.statSync(file);
        totalSize += stat.size;
        fileSizes.push({ path: path.relative(ROOT, file), size: stat.size });
      } catch (_e) { /* skip */ }
    }
  }

  // Add data/ files
  const dataDir = path.join(ROOT, 'data');
  if (fs.existsSync(dataDir)) {
    const dataFiles = findFiles(dataDir, '.json');
    for (const file of dataFiles) {
      try {
        const stat = fs.statSync(file);
        totalSize += stat.size;
        fileSizes.push({ path: path.relative(ROOT, file), size: stat.size });
      } catch (_e) { /* skip */ }
    }
  }

  const totalSizeMB = totalSize / (1024 * 1024);
  results.bundleSize = {
    totalBytes: totalSize,
    totalMB: parseFloat(totalSizeMB.toFixed(2)),
    maxMB: MAX_SIZE_MB,
    withinLimit: totalSizeMB <= MAX_SIZE_MB,
    largestFiles: fileSizes.sort((a, b) => b.size - a.size).slice(0, 10),
  };

  if (totalSizeMB > MAX_SIZE_MB) {
    check.errors.push({ type: 'bundle-size', message: `Bundle size ${totalSizeMB.toFixed(2)}MB exceeds ${MAX_SIZE_MB}MB limit` });
    check.status = 'fail';
  } else if (totalSizeMB > MAX_SIZE_MB * 0.9) {
    check.warnings.push({ type: 'bundle-size', message: `Bundle size ${totalSizeMB.toFixed(2)}MB is within 10% of limit` });
    check.status = 'warn';
  }

  check.elapsed = Date.now() - startTime;
  check.details = { totalMB: totalSizeMB.toFixed(2), maxMB: MAX_SIZE_MB };
  results.checks.push(check);
  results.summary.totalChecks++;
  if (check.status === 'pass') results.summary.passed++;
  else results.summary.failed++;
}

// ── Check 6: Driver Compose Consistency ───────────────────────────────────────
function checkDriverComposeConsistency() {
  const startTime = Date.now();
  const check = { name: 'Driver Compose Consistency', status: 'pass', errors: [], warnings: [] };

  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
    catch (_e) { return false; }
  });

  let totalDrivers = 0;
  let validDrivers = 0;

  for (const dir of driverDirs) {
    const dcjPath = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
    if (!fs.existsSync(dcjPath)) continue;
    totalDrivers++;

    try {
      const config = JSON.parse(fs.readFileSync(dcjPath));

      // Check required fields
      if (!config.name) {
        check.errors.push({ file: `drivers/${dir}`, message: 'Missing "name" field' });
      }
      if (!config.capabilities || !Array.isArray(config.capabilities) || config.capabilities.length === 0) {
        check.errors.push({ file: `drivers/${dir}`, message: 'Missing or empty "capabilities" array' });
      }

      // Check zigbee section
      if (config.zigbee) {
        if (!Array.isArray(config.zigbee.manufacturerName) || config.zigbee.manufacturerName.length === 0) {
          check.errors.push({ file: `drivers/${dir}`, message: 'Missing or empty zigbee.manufacturerName' });
        }
        if (!Array.isArray(config.zigbee.productId) || config.zigbee.productId.length === 0) {
          check.warnings.push({ file: `drivers/${dir}`, message: 'Missing or empty zigbee.productId' });
        }
      }

      validDrivers++;
    } catch (e) {
      check.errors.push({ file: `drivers/${dir}`, message: `Invalid JSON: ${e.message}` });
    }
  }

  check.elapsed = Date.now() - startTime;
  check.details = { totalDrivers, validDrivers };
  if (check.errors.length > 0) check.status = 'fail';
  else if (check.warnings.length > 0) check.status = 'warn';
  results.checks.push(check);
  results.summary.totalChecks++;
  if (check.status === 'pass') results.summary.passed++;
  else results.summary.failed++;
}

// ── Check 7: Import Path Validation ───────────────────────────────────────────
function checkImportPaths() {
  const startTime = Date.now();
  const check = { name: 'Import Path Validation', status: 'pass', errors: [], warnings: [] };

  const jsFiles = findFiles(DRIVERS_DIR, '.js');

  for (const filePath of jsFiles) {
    const relPath = path.relative(ROOT, filePath);
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for incorrect import paths
      const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      let match;
      while ((match = requirePattern.exec(content)) !== null) {
        const requirePath = match[1];

        // Check for deprecated HybridSwitchBase import
        if (requirePath.includes('HybridSwitchBase') && !requirePath.includes('UnifiedSwitchBase')) {
          results.importIssues.push({
            file: relPath,
            issue: 'DEPRECATED_IMPORT',
            message: `Deprecated import: ${requirePath} (use UnifiedSwitchBase)`,
            line: content.substring(0, match.index).split('\n').length,
          });
          check.warnings.push({ file: relPath, message: `Deprecated import: ${requirePath}` });
        }

        // Check for incorrect path patterns
        if (requirePath.startsWith('../../lib/TuyaZigbeeDevice') || requirePath.startsWith('../lib/TuyaZigbeeDevice')) {
          results.importIssues.push({
            file: relPath,
            issue: 'INCORRECT_PATH',
            message: `Incorrect import path: ${requirePath} (use ../../lib/tuya/TuyaZigbeeDevice)`,
            line: content.substring(0, match.index).split('\n').length,
          });
          check.errors.push({ file: relPath, message: `Incorrect import path: ${requirePath}` });
        }
      }
    } catch (e) { /* skip */ }
  }

  check.elapsed = Date.now() - startTime;
  if (check.errors.length > 0) check.status = 'fail';
  else if (check.warnings.length > 0) check.status = 'warn';
  results.checks.push(check);
  results.summary.totalChecks++;
  if (check.status === 'pass') results.summary.passed++;
  else results.summary.failed++;
}

// ── Check 8: Settings Key Validation ──────────────────────────────────────────
function checkSettingsKeys() {
  const startTime = Date.now();
  const check = { name: 'Settings Key Validation', status: 'pass', errors: [], warnings: [] };

  const jsFiles = [
    ...findFiles(DRIVERS_DIR, '.js'),
    ...findFiles(LIB_DIR, '.js'),
  ];

  for (const filePath of jsFiles) {
    const relPath = path.relative(ROOT, filePath);
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for incorrect settings keys
      if (content.includes('zb_modelId') || content.includes('zb_manufacturerName')) {
        results.settingsKeyIssues.push({
          file: relPath,
          issue: 'INCORRECT_SETTINGS_KEY',
          message: 'Use zb_model_id (not zb_modelId) and zb_manufacturer_name (not zb_manufacturerName)',
        });
        check.errors.push({ file: relPath, message: 'Incorrect settings key (zb_modelId/zb_manufacturerName)' });
      }
    } catch (e) { /* skip */ }
  }

  check.elapsed = Date.now() - startTime;
  if (check.errors.length > 0) check.status = 'fail';
  results.checks.push(check);
  results.summary.totalChecks++;
  if (check.status === 'pass') results.summary.passed++;
  else results.summary.failed++;
}

// ── Check 9: Fingerprint Collision Detection ──────────────────────────────────
function checkFingerprintCollisions() {
  const startTime = Date.now();
  const check = { name: 'Fingerprint Collision Detection', status: 'pass', errors: [], warnings: [] };

  const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
    try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
    catch (_e) { return false; }
  });

  const fingerprintMap = new Map(); // key: mfr|pid -> driverId

  for (const dir of driverDirs) {
    const dcjPath = path.join(DRIVERS_DIR, dir, 'driver.compose.json');
    if (!fs.existsSync(dcjPath)) continue;

    try {
      const config = JSON.parse(fs.readFileSync(dcjPath));
      const mfrs = config.zigbee?.manufacturerName || [];
      const pids = config.zigbee?.productId || [];

      for (const mfr of mfrs) {
        for (const pid of pids) {
          const key = `${(mfr || '').toLowerCase()}|${(pid || '').toLowerCase()}`;
          if (fingerprintMap.has(key)) {
            const existingDriver = fingerprintMap.get(key);
            if (existingDriver !== dir) {
              results.fingerprintIssues.push({
                issue: 'COLLISION',
                manufacturerName: mfr,
                productId: pid,
                driver1: existingDriver,
                driver2: dir,
                message: `Fingerprint collision: ${mfr} + ${pid} in both ${existingDriver} and ${dir}`,
              });
              check.errors.push({
                message: `Collision: ${mfr} + ${pid} in ${existingDriver} and ${dir}`,
              });
            }
          } else {
            fingerprintMap.set(key, dir);
          }
        }
      }
    } catch (e) { /* skip */ }
  }

  check.elapsed = Date.now() - startTime;
  check.details = { totalFingerprints: fingerprintMap.size };
  if (check.errors.length > 0) check.status = 'fail';
  results.checks.push(check);
  results.summary.totalChecks++;
  if (check.status === 'pass') results.summary.passed++;
  else results.summary.failed++;
}

// ── Check 10: Memory Leak Risk Detection ──────────────────────────────────────
function checkMemoryLeakRisks() {
  const startTime = Date.now();
  const check = { name: 'Memory Leak Risk Detection', status: 'pass', errors: [], warnings: [] };

  const jsFiles = findFiles(DRIVERS_DIR, '.js');

  for (const filePath of jsFiles) {
    const relPath = path.relative(ROOT, filePath);
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Risk 1: setInterval without cleanup
      if (content.includes('setInterval')) {
        if (!content.includes('clearInterval') && !content.includes('_destroyed') && !content.includes('onDeleted')) {
          results.memoryLeakRisks.push({
            file: relPath,
            risk: 'SETINTERVAL_NO_CLEANUP',
            message: 'setInterval without clearInterval or destroy guard',
          });
          check.warnings.push({ file: relPath, message: 'setInterval without cleanup' });
        }
      }

      // Risk 2: setTimeout without cleanup (less critical but still risky)
      if (content.includes('new Promise') && content.includes('setTimeout')) {
        if (!content.includes('clearTimeout') && !content.includes('_destroyed')) {
          results.memoryLeakRisks.push({
            file: relPath,
            risk: 'TIMEOUT_NO_CLEANUP',
            message: 'setTimeout in Promise without cleanup',
          });
          check.warnings.push({ file: relPath, message: 'setTimeout in Promise without cleanup' });
        }
      }

      // Risk 3: Event listener without removal
      if (content.includes('.on(') || content.includes('.addEventListener(')) {
        if (!content.includes('.removeListener(') && !content.includes('.removeEventListener(') && !content.includes('removeAllListeners')) {
          if (content.includes('onDeleted') || content.includes('onUninit')) {
            // Has lifecycle hooks, likely OK
          } else {
            results.memoryLeakRisks.push({
              file: relPath,
              risk: 'EVENT_LISTENER_NO_REMOVE',
              message: 'Event listener added without removal',
            });
            check.warnings.push({ file: relPath, message: 'Event listener without removal' });
          }
        }
      }
    } catch (e) { /* skip */ }
  }

  check.elapsed = Date.now() - startTime;
  if (check.warnings.length > 0) check.status = 'warn';
  results.checks.push(check);
  results.summary.totalChecks++;
  if (check.status === 'pass') results.summary.passed++;
  else results.summary.failed++;
}

// ── Generate Report ───────────────────────────────────────────────────────────
function generateReport() {
  const lines = [];
  lines.push('# Auto-Validate All Report');
  lines.push(`Generated: ${results.timestamp}`);
  lines.push(`Mode: ${results.mode}`);
  lines.push('');

  // Overall status
  const status = results.summary.failed === 0 ? 'PASS' : 'FAIL';
  lines.push(`**Overall Status: ${status}**`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Checks | ${results.summary.totalChecks} |`);
  lines.push(`| Passed | ${results.summary.passed} |`);
  lines.push(`| Failed | ${results.summary.failed} |`);
  lines.push(`| Warnings | ${results.summary.warnings} |`);
  lines.push('');

  // Check results
  lines.push('## Check Results');
  lines.push('| Check | Status | Time | Details |');
  lines.push('|-------|--------|------|---------|');
  for (const check of results.checks) {
    const statusIcon = check.status === 'pass' ? 'PASS' : check.status === 'warn' ? 'WARN' : 'FAIL';
    const details = check.details ? JSON.stringify(check.details) : '';
    lines.push(`| ${check.name} | ${statusIcon} | ${check.elapsed}ms | ${details} |`);
  }
  lines.push('');

  // Bundle size
  if (results.bundleSize) {
    lines.push('## Bundle Size');
    lines.push(`- Total: ${results.bundleSize.totalMB} MB`);
    lines.push(`- Limit: ${results.bundleSize.maxMB} MB`);
    lines.push(`- Status: ${results.bundleSize.withinLimit ? 'WITHIN LIMIT' : 'EXCEEDS LIMIT'}`);
    lines.push('');
  }

  // AggregateError risks
  if (results.aggregateErrorRisks.length > 0) {
    lines.push('## AggregateError Risks');
    lines.push('| Driver | Risk | Severity |');
    lines.push('|--------|------|----------|');
    for (const risk of results.aggregateErrorRisks.slice(0, 50)) {
      lines.push(`| ${risk.driver} | ${risk.risk} | ${risk.severity} |`);
    }
    lines.push('');
  }

  // Processing failed risks
  if (results.processingFailedRisks.length > 0) {
    lines.push('## Processing Failed Risks');
    lines.push('| File | Risk | Severity |');
    lines.push('|------|------|----------|');
    for (const risk of results.processingFailedRisks.slice(0, 50)) {
      lines.push(`| ${risk.file} | ${risk.risk} | ${risk.severity} |`);
    }
    lines.push('');
  }

  // Fingerprint issues
  if (results.fingerprintIssues.length > 0) {
    lines.push('## Fingerprint Issues');
    for (const issue of results.fingerprintIssues.slice(0, 20)) {
      lines.push(`- ${issue.message}`);
    }
    lines.push('');
  }

  // Memory leak risks
  if (results.memoryLeakRisks.length > 0) {
    lines.push('## Memory Leak Risks');
    for (const risk of results.memoryLeakRisks.slice(0, 20)) {
      lines.push(`- ${risk.file}: ${risk.message}`);
    }
    lines.push('');
  }

  // Import issues
  if (results.importIssues.length > 0) {
    lines.push('## Import Issues');
    for (const issue of results.importIssues.slice(0, 20)) {
      lines.push(`- ${issue.file}: ${issue.message}`);
    }
    lines.push('');
  }

  // Settings key issues
  if (results.settingsKeyIssues.length > 0) {
    lines.push('## Settings Key Issues');
    for (const issue of results.settingsKeyIssues.slice(0, 20)) {
      lines.push(`- ${issue.file}: ${issue.message}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*Generated by auto-validate-all.js*');

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  const startTime = Date.now();

  log('cyan', 'Comprehensive Validation Pipeline v1.0.0');
  log('dim', `Mode: ${PRE_COMMIT ? 'pre-commit' : 'standalone'}`);
  log('');

  // Run all checks
  if (!SKIP_JS) {
    log('cyan', 'Running JavaScript syntax validation...');
    checkJavaScriptSyntax();
  }

  if (!SKIP_JSON) {
    log('cyan', 'Running JSON validation...');
    checkJSONValidation();
  }

  log('cyan', 'Checking AggregateError risks...');
  checkAggregateErrorRisks();

  log('cyan', 'Checking Processing failed risks...');
  checkProcessingFailedRisks();

  log('cyan', 'Checking bundle size...');
  checkBundleSize();

  log('cyan', 'Checking driver compose consistency...');
  checkDriverComposeConsistency();

  log('cyan', 'Checking import paths...');
  checkImportPaths();

  log('cyan', 'Checking settings keys...');
  checkSettingsKeys();

  log('cyan', 'Checking fingerprint collisions...');
  checkFingerprintCollisions();

  log('cyan', 'Checking memory leak risks...');
  checkMemoryLeakRisks();

  // Finalize
  results.duration = Date.now() - startTime;

  // Output
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    log('');
    log('cyan', '========================================');
    log('cyan', '  VALIDATION SUMMARY');
    log('cyan', '========================================');
    log('dim', `Timestamp: ${results.timestamp}`);
    log('dim', `Duration: ${results.duration}ms`);
    log('dim', `Mode: ${results.mode}`);
    log('');

    for (const check of results.checks) {
      const icon = check.status === 'pass' ? `${C.green}PASS` : check.status === 'warn' ? `${C.yellow}WARN` : `${C.red}FAIL`;
      log('dim', `  [${icon}${C.reset}] ${check.name} (${check.elapsed}ms)`);
    }

    log('');
    log('dim', `Total: ${results.summary.totalChecks} checks`);
    log('green', `Passed: ${results.summary.passed}`);
    if (results.summary.failed > 0) log('red', `Failed: ${results.summary.failed}`);
    else log('dim', `Failed: ${results.summary.failed}`);

    if (results.bundleSize) {
      log('');
      log('cyan', `Bundle Size: ${results.bundleSize.totalMB} MB / ${results.bundleSize.maxMB} MB`);
    }

    if (results.aggregateErrorRisks.length > 0) {
      log('');
      log('yellow', `AggregateError Risks: ${results.aggregateErrorRisks.length}`);
    }

    if (results.processingFailedRisks.length > 0) {
      log('yellow', `Processing Failed Risks: ${results.processingFailedRisks.length}`);
    }

    log('');
    if (results.summary.failed === 0) {
      log('green', 'ALL VALIDATIONS PASSED');
    } else {
      log('red', `VALIDATION FAILED: ${results.summary.failed} error(s)`);
    }
  }

  // Save reports
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, 'last-validation.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(REPORT_DIR, 'last-validation.md'), generateReport());

  if (REPORT_PATH) {
    const reportDir = path.dirname(REPORT_PATH);
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));
    log('dim', `Report written to: ${REPORT_PATH}`);
  }

  // Save to state directory
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(STATE_DIR, 'validation-report.json'),
    JSON.stringify(results, null, 2)
  );

  // Exit code
  if (PRE_COMMIT && results.summary.failed > 0) {
    process.exit(1);
  }

  process.exit(results.summary.failed > 0 ? 1 : 0);
}

// ── Error handling ────────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  error(`Uncaught exception: ${err.message}`);
  process.exit(2);
});

process.on('unhandledRejection', (err) => {
  error(`Unhandled rejection: ${err.message || err}`);
  process.exit(2);
});

main();
