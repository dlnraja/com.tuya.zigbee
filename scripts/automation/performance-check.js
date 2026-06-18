#!/usr/bin/env node
/**
 * performance-check.js - Performance & Resource Verification
 * ===========================================================
 * Checks:
 *   1. Bundle size (must be < 7MB compressed)
 *   2. Individual file sizes (flag files > 100KB)
 *   3. Memory usage estimation (heap analysis)
 *   4. Fingerprint lookup time (simulated)
 *   5. JSON file sizes (data/fingerprints.json)
 *   6. Total JS codebase size
 *   7. Largest files ranking
 *   8. Driver count and complexity metrics
 *   9. Import depth analysis (deep require chains)
 *  10. Potential OOM risks (large JSON loads without Buffer)
 *
 * Usage: node scripts/automation/performance-check.js
 * Exit code: 0 = acceptable, 1 = critical issues, 2 = warnings
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');
const DATA_DIR = path.join(ROOT, 'data');

// ── ANSI colors ──────────────────────────────────────────────────
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ── Thresholds ───────────────────────────────────────────────────
const BUNDLE_SIZE_LIMIT_MB = 7;
const LARGE_FILE_THRESHOLD_KB = 100;
const CRITICAL_FILE_THRESHOLD_KB = 500;
const MAX_FINGERPRINT_LOOKUP_MS = 50;
const MAX_STARTUP_FILE_COUNT = 500;

// ── Report ───────────────────────────────────────────────────────
const report = {
  errors: [],
  warnings: [],
  metrics: {
    totalJsSizeKB: 0,
    totalDrivers: 0,
    totalLibFiles: 0,
    largestFiles: [],
    bundleSizeMB: 0,
    fingerprintDBSizeKB: 0,
    fingerprintLookupMs: 0,
    estimatedHeapMB: 0,
    largeFilesCount: 0,
    criticalFilesCount: 0,
  },
};

function log(msg) { console.log(`${CYAN}[PERF]${RESET} ${msg}`); }
function err(msg) { report.errors.push(msg); console.error(`${RED}[ERROR]${RESET} ${msg}`); }
function warn(msg) { report.warnings.push(msg); console.warn(`${YELLOW}[WARN]${RESET} ${msg}`); }

// ── 1. Bundle Size Check ─────────────────────────────────────────
function checkBundleSize() {
  log('Phase 1: Checking bundle size...');

  // Check if a build exists
  const buildDir = path.join(ROOT, '.homeybuild');
  if (fs.existsSync(buildDir)) {
    try {
      const files = fs.readdirSync(buildDir);
      let totalSize = 0;
      for (const f of files) {
        const fp = path.join(buildDir, f);
        try {
          const stat = fs.statSync(fp);
          totalSize += stat.size;
        } catch (e) { /* skip */ }
      }
      const sizeMB = totalSize / (1024 * 1024);
      report.metrics.bundleSizeMB = parseFloat(sizeMB.toFixed(2));

      if (sizeMB > BUNDLE_SIZE_LIMIT_MB) {
        err(`Bundle size ${sizeMB.toFixed(2)}MB exceeds ${BUNDLE_SIZE_LIMIT_MB}MB limit`);
      } else if (sizeMB > BUNDLE_SIZE_LIMIT_MB * 0.8) {
        warn(`Bundle size ${sizeMB.toFixed(2)}MB is approaching ${BUNDLE_SIZE_LIMIT_MB}MB limit (${((sizeMB / BUNDLE_SIZE_LIMIT_MB) * 100).toFixed(0)}%)`);
      } else {
        log(`  Bundle size: ${sizeMB.toFixed(2)}MB / ${BUNDLE_SIZE_LIMIT_MB}MB (${((sizeMB / BUNDLE_SIZE_LIMIT_MB) * 100).toFixed(0)}%)`);
      }
    } catch (e) {
      warn(`Cannot measure bundle size: ${e.message}`);
    }
  } else {
    log('  No build directory found (.homeybuild) - skipping bundle size check');
  }

  // Estimate size by summing all deployable files
  log('  Estimating deployable size...');
  let deployableSize = 0;
  const deployableDirs = ['drivers', 'lib', 'assets'];

  for (const dir of deployableDirs) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;

    try {
      const files = getAllFiles(dirPath);
      for (const f of files) {
        try {
          const stat = fs.statSync(f);
          deployableSize += stat.size;
        } catch (e) { /* skip */ }
      }
    } catch (e) { /* skip */ }
  }

  // Add app.js and app.json
  for (const f of ['app.js', 'app.json']) {
    const fp = path.join(ROOT, f);
    if (fs.existsSync(fp)) {
      try { deployableSize += fs.statSync(fp).size; } catch (e) { /* skip */ }
    }
  }

  const estMB = deployableSize / (1024 * 1024);
  log(`  Estimated deployable size: ${estMB.toFixed(2)}MB`);
  if (estMB > BUNDLE_SIZE_LIMIT_MB) {
    err(`Estimated deployable size ${estMB.toFixed(2)}MB exceeds ${BUNDLE_SIZE_LIMIT_MB}MB limit`);
  }
}

// ── 2. Large File Detection ──────────────────────────────────────
function checkLargeFiles() {
  log('Phase 2: Checking for large files...');

  const allFiles = [];
  for (const dir of [LIB_DIR, DRIVERS_DIR]) {
    if (!fs.existsSync(dir)) continue;
    allFiles.push(...getAllFiles(dir));
  }

  const fileSizes = [];
  for (const f of allFiles) {
    try {
      const stat = fs.statSync(f);
      if (f.endsWith('.js') || f.endsWith('.json')) {
        fileSizes.push({
          path: path.relative(ROOT, f),
          sizeKB: Math.round(stat.size / 1024),
        });
      }
    } catch (e) { /* skip */ }
  }

  // Sort by size descending
  fileSizes.sort((a, b) => b.sizeKB - a.sizeKB);
  report.metrics.largestFiles = fileSizes.slice(0, 15);

  // Count large files
  const largeFiles = fileSizes.filter(f => f.sizeKB > LARGE_FILE_THRESHOLD_KB);
  const criticalFiles = fileSizes.filter(f => f.sizeKB > CRITICAL_FILE_THRESHOLD_KB);

  report.metrics.largeFilesCount = largeFiles.length;
  report.metrics.criticalFilesCount = criticalFiles.length;

  if (criticalFiles.length > 0) {
    for (const f of criticalFiles) {
      warn(`CRITICAL: ${f.path} is ${f.sizeKB}KB (>${CRITICAL_FILE_THRESHOLD_KB}KB threshold)`);
    }
  }

  log(`  Large files (>${LARGE_FILE_THRESHOLD_KB}KB): ${largeFiles.length}`);
  log(`  Critical files (>${CRITICAL_FILE_THRESHOLD_KB}KB): ${criticalFiles.length}`);

  // Display top 5
  log('  Top 5 largest files:');
  for (const f of fileSizes.slice(0, 5)) {
    const color = f.sizeKB > CRITICAL_FILE_THRESHOLD_KB ? RED : f.sizeKB > LARGE_FILE_THRESHOLD_KB ? YELLOW : GREEN;
    log(`    ${color}${f.sizeKB}KB${RESET} ${f.path}`);
  }
}

// ── 3. Total Codebase Size ───────────────────────────────────────
function checkCodebaseSize() {
  log('Phase 3: Measuring codebase size...');

  let totalSize = 0;
  let jsCount = 0;
  let jsonCount = 0;

  const allFiles = [
    ...getAllFiles(LIB_DIR),
    ...getAllFiles(DRIVERS_DIR),
    ...getAllFiles(path.join(ROOT, 'assets')),
  ];

  // Add root files
  for (const f of ['app.js', 'app.json']) {
    const fp = path.join(ROOT, f);
    if (fs.existsSync(fp)) allFiles.push(fp);
  }

  for (const f of allFiles) {
    try {
      const stat = fs.statSync(f);
      totalSize += stat.size;
      if (f.endsWith('.js')) jsCount++;
      if (f.endsWith('.json')) jsonCount++;
    } catch (e) { /* skip */ }
  }

  report.metrics.totalJsSizeKB = Math.round(totalSize / 1024);
  report.metrics.totalLibFiles = jsCount;
  report.metrics.totalDrivers = countDrivers();

  log(`  Total JS/JSON size: ${(totalSize / 1024).toFixed(0)}KB (${(totalSize / 1024 / 1024).toFixed(2)}MB)`);
  log(`  JS files: ${jsCount}`);
  log(`  JSON files: ${jsonCount}`);
}

// ── 4. Fingerprint Database Analysis ─────────────────────────────
function checkFingerprintPerformance() {
  log('Phase 4: Analyzing fingerprint database performance...');

  const fpPath = path.join(DATA_DIR, 'fingerprints.json');
  if (!fs.existsSync(fpPath)) {
    log('  data/fingerprints.json not found - skipping');
    return;
  }

  try {
    const stat = fs.statSync(fpPath);
    report.metrics.fingerprintDBSizeKB = Math.round(stat.size / 1024);
    log(`  Fingerprint DB size: ${report.metrics.fingerprintDBSizeKB}KB`);

    if (report.metrics.fingerprintDBSizeKB > 1000) {
      warn(`Fingerprint DB is ${report.metrics.fingerprintDBSizeKB}KB - consider lazy loading`);
    }

    // Simulate lookup time
    const start = process.hrtime.bigint();
    const raw = fs.readFileSync(fpPath);
    const data = JSON.parse(raw);
    const end = process.hrtime.bigint();

    const lookupMs = Number(end - start) / 1e6;
    report.metrics.fingerprintLookupMs = parseFloat(lookupMs.toFixed(2));
    log(`  Full parse time: ${lookupMs.toFixed(2)}ms`);

    if (lookupMs > MAX_FINGERPRINT_LOOKUP_MS) {
      warn(`Fingerprint parse time ${lookupMs.toFixed(2)}ms exceeds ${MAX_FINGERPRINT_LOOKUP_MS}ms threshold`);
    }

    // Estimate memory usage
    const memBefore = process.memoryUsage().heapUsed;
    const _test = JSON.parse(fs.readFileSync(fpPath));
    const memAfter = process.memoryUsage().heapUsed;
    const memUsedMB = (memAfter - memBefore) / (1024 * 1024);
    log(`  Memory used for parsing: ${memUsedMB.toFixed(2)}MB`);

    if (memUsedMB > 10) {
      warn(`Fingerprint DB uses ${memUsedMB.toFixed(2)}MB of heap - OOM risk on Homey Pro (64MB limit)`);
    }
  } catch (e) {
    warn(`Cannot analyze fingerprint DB: ${e.message}`);
  }
}

// ── 5. JSON Loading Pattern Audit ────────────────────────────────
function checkJsonLoadingPatterns() {
  log('Phase 5: Auditing JSON loading patterns (OOM risk)...');

  const jsFiles = [...getAllFiles(LIB_DIR), ...getAllFiles(DRIVERS_DIR)];

  for (const f of jsFiles) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      const rel = path.relative(ROOT, f);

      // Check for UTF-8 JSON loading (creates UTF-16 strings in Node)
      if (content.includes("readFileSync") && content.includes("'utf8'") && content.includes("JSON.parse")) {
        // Check if it's loading a potentially large file
        const match = content.match(/readFileSync\s*\([^)]*,\s*['"]utf-?8['"]\s*\)/);
        if (match) {
          warn(`Potential OOM risk: UTF-8 JSON loading in ${rel} - use Buffer-based loading`);
        }
      }
    } catch (e) { /* skip */ }
  }
}

// ── 6. Import Depth Analysis ─────────────────────────────────────
function checkImportDepth() {
  log('Phase 6: Analyzing import depth...');

  const appPath = path.join(ROOT, 'app.js');
  if (!fs.existsSync(appPath)) {
    log('  app.js not found - skipping');
    return;
  }

  try {
    const content = fs.readFileSync(appPath, 'utf8');
    const requireMatches = content.match(/require\s*\(\s*['"][^'"]+['"]\s*\)/g) || [];
    log(`  app.js has ${requireMatches.length} direct requires`);

    if (requireMatches.length > 20) {
      warn(`app.js has ${requireMatches.length} direct requires - consider lazy loading`);
    }

    // Count total require statements across codebase
    const allFiles = [...getAllFiles(LIB_DIR)];
    let totalRequires = 0;
    for (const f of allFiles) {
      try {
        const c = fs.readFileSync(f, 'utf8');
        const matches = c.match(/require\s*\(/g);
        totalRequires += matches ? matches.length : 0;
      } catch (e) { /* skip */ }
    }

    log(`  Total require() calls across lib/: ${totalRequires}`);
  } catch (e) { /* skip */ }
}

// ── 7. Driver Complexity Metrics ─────────────────────────────────
function checkDriverComplexity() {
  log('Phase 7: Analyzing driver complexity...');

  let totalDriverLines = 0;
  let totalDeviceJsLines = 0;
  let driverCount = 0;

  try {
    const dirs = fs.readdirSync(DRIVERS_DIR);
    for (const name of dirs) {
      const dirPath = path.join(DRIVERS_DIR, name);
      try {
        if (!fs.statSync(dirPath).isDirectory()) continue;
      } catch (e) { continue; }

      if (!fs.existsSync(path.join(dirPath, 'driver.compose.json'))) continue;
      driverCount++;

      // Count lines in device.js
      const devicePath = path.join(dirPath, 'device.js');
      if (fs.existsSync(devicePath)) {
        try {
          const lines = fs.readFileSync(devicePath, 'utf8').split('\n').length;
          totalDeviceJsLines += lines;
        } catch (e) { /* skip */ }
      }

      // Count lines in driver.js
      const driverPath = path.join(dirPath, 'driver.js');
      if (fs.existsSync(driverPath)) {
        try {
          const lines = fs.readFileSync(driverPath, 'utf8').split('\n').length;
          totalDriverLines += lines;
        } catch (e) { /* skip */ }
      }
    }
  } catch (e) { /* skip */ }

  const avgDeviceLines = driverCount > 0 ? Math.round(totalDeviceJsLines / driverCount) : 0;
  const avgDriverLines = driverCount > 0 ? Math.round(totalDriverLines / driverCount) : 0;

  log(`  Total drivers: ${driverCount}`);
  log(`  Total device.js lines: ${totalDeviceJsLines.toLocaleString()} (avg: ${avgDeviceLines})`);
  log(`  Total driver.js lines: ${totalDriverLines.toLocaleString()} (avg: ${avgDriverLines})`);
}

// ── 8. Startup File Count ────────────────────────────────────────
function checkStartupFileCount() {
  log('Phase 8: Estimating startup file load count...');

  let jsFileCount = 0;
  jsFileCount += getAllFiles(LIB_DIR).filter(f => f.endsWith('.js')).length;
  jsFileCount += getAllFiles(DRIVERS_DIR).filter(f => f.endsWith('.js')).length;

  // Add root files
  for (const f of ['app.js']) {
    if (fs.existsSync(path.join(ROOT, f))) jsFileCount++;
  }

  report.metrics.totalLibFiles = jsFileCount;

  log(`  Estimated JS files loaded at startup: ${jsFileCount}`);
  if (jsFileCount > MAX_STARTUP_FILE_COUNT) {
    warn(`Startup file count ${jsFileCount} exceeds ${MAX_STARTUP_FILE_COUNT} - consider lazy loading`);
  }
}

// ── 9. Memory Snapshot ───────────────────────────────────────────
function checkMemoryUsage() {
  log('Phase 9: Current memory usage...');

  const mem = process.memoryUsage();
  const heapMB = (mem.heapUsed / (1024 * 1024)).toFixed(2);
  const rssMB = (mem.rss / (1024 * 1024)).toFixed(2);

  report.metrics.estimatedHeapMB = parseFloat(heapMB);

  log(`  Heap used: ${heapMB}MB`);
  log(`  RSS: ${rssMB}MB`);

  // This script itself is a proxy for what the app will use
  if (parseFloat(heapMB) > 30) {
    warn(`Script heap usage ${heapMB}MB is high - Homey Pro has 64MB limit`);
  }
}

// ── 10. .homeyignore Completeness ────────────────────────────────
function checkHomeyignore() {
  log('Phase 10: Checking .homeyignore completeness...');

  const ignorePath = path.join(ROOT, '.homeyignore');
  if (!fs.existsSync(ignorePath)) {
    err('.homeyignore file not found - bundle may exceed 7MB limit');
    return;
  }

  try {
    const content = fs.readFileSync(ignorePath, 'utf8');
    const patterns = content.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    const requiredExcludes = ['scripts', 'docs', '.github', 'node_modules'];
    for (const req of requiredExcludes) {
      if (!patterns.some(p => p.includes(req))) {
        warn(`.homeyignore does not exclude "${req}" - may inflate bundle`);
      }
    }

    log(`  .homeyignore has ${patterns.length} exclusion patterns`);
  } catch (e) {
    warn(`Cannot read .homeyignore: ${e.message}`);
  }
}

// ── Helper: Get all files recursively ────────────────────────────
function getAllFiles(dir) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', '.git', 'backup', 'tmp', 'dumps', '.archive'].includes(entry.name)) {
          files.push(...getAllFiles(fullPath));
        }
      } else {
        files.push(fullPath);
      }
    }
  } catch (e) { /* skip */ }
  return files;
}

// ── Helper: Count drivers ────────────────────────────────────────
function countDrivers() {
  let count = 0;
  try {
    const dirs = fs.readdirSync(DRIVERS_DIR);
    for (const name of dirs) {
      const composePath = path.join(DRIVERS_DIR, name, 'driver.compose.json');
      if (fs.existsSync(composePath)) count++;
    }
  } catch (e) { /* skip */ }
  return count;
}

// ── Main ─────────────────────────────────────────────────────────
function main() {
  console.log(`\n${BOLD}============================================${RESET}`);
  console.log(`${BOLD}  Performance Check${RESET}`);
  console.log(`${BOLD}============================================${RESET}\n`);

  const startTime = Date.now();

  checkBundleSize();
  checkLargeFiles();
  checkCodebaseSize();
  checkFingerprintPerformance();
  checkJsonLoadingPatterns();
  checkImportDepth();
  checkDriverComplexity();
  checkStartupFileCount();
  checkMemoryUsage();
  checkHomeyignore();

  // ── Summary ──────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${BOLD}============================================${RESET}`);
  console.log(`${BOLD}  PERFORMANCE REPORT${RESET}`);
  console.log(`${BOLD}============================================${RESET}`);
  console.log(`  Total drivers:            ${report.metrics.totalDrivers}`);
  console.log(`  Total JS/JSON size:       ${report.metrics.totalJsSizeKB}KB (${(report.metrics.totalJsSizeKB / 1024).toFixed(2)}MB)`);
  console.log(`  Bundle estimate:          ${report.metrics.bundleSizeMB > 0 ? report.metrics.bundleSizeMB + 'MB' : 'N/A (no build)'}`);
  console.log(`  Fingerprint DB:           ${report.metrics.fingerprintDBSizeKB}KB`);
  console.log(`  Fingerprint parse time:   ${report.metrics.fingerprintLookupMs}ms`);
  console.log(`  Script heap usage:        ${report.metrics.estimatedHeapMB}MB`);
  console.log(`  Large files (>${LARGE_FILE_THRESHOLD_KB}KB): ${report.metrics.largeFilesCount}`);
  console.log(`  Critical files (>${CRITICAL_FILE_THRESHOLD_KB}KB): ${report.metrics.criticalFilesCount}`);
  console.log(`  -----------------------------------------`);

  if (report.metrics.largestFiles.length > 0) {
    console.log(`  ${MAGENTA}Top 5 largest files:${RESET}`);
    for (const f of report.metrics.largestFiles.slice(0, 5)) {
      console.log(`    ${f.sizeKB}KB  ${f.path}`);
    }
    console.log(`  -----------------------------------------`);
  }

  console.log(`  ${RED}Errors:   ${report.errors.length}${RESET}`);
  console.log(`  ${YELLOW}Warnings: ${report.warnings.length}${RESET}`);
  console.log(`  Completed in ${elapsed}s\n`);

  if (report.errors.length > 0) {
    console.log(`${RED}${BOLD}RESULT: FAIL - ${report.errors.length} critical performance issue(s)${RESET}`);
    process.exit(1);
  } else if (report.warnings.length > 0) {
    console.log(`${YELLOW}${BOLD}RESULT: WARN - ${report.warnings.length} performance warning(s)${RESET}`);
    process.exit(2);
  } else {
    console.log(`${GREEN}${BOLD}RESULT: PASS - All performance checks acceptable${RESET}`);
    process.exit(0);
  }
}

main();
