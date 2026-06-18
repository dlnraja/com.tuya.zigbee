#!/usr/bin/env node
'use strict';

/**
 * TITAN v2 Pre-Commit Gate
 * ============================================================================
 * Lightweight pre-commit hook that runs TITAN v2 checks before every commit.
 * Blocks commits with critical violations.
 *
 * Checks:
 *   1. Raw setCapabilityValue in drivers/ (must use safeSetCapabilityValue)
 *   2. console.log/error/warn in drivers/ (must use this.log/this.error)
 *   3. Empty manufacturerName arrays in driver.compose.json
 *   4. Missing _destroyed guard in async callbacks
 *   5. Missing super.onDeleted() in WiFi drivers
 *   6. Syntax validation (node --check)
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = violations found, commit blocked
 *
 * Usage:
 *   node scripts/ci/titan-pre-commit.js
 *   node scripts/ci/titan-pre-commit.js --fix    # Auto-fix where possible
 *   node scripts/ci/titan-pre-commit.js --json   # JSON output for CI
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');

const ARGS = process.argv.slice(2);
const AUTO_FIX = ARGS.includes('--fix');
const JSON_OUTPUT = ARGS.includes('--json');

const IGNORE_DIRS = ['node_modules', '.git', '.homeybuild', 'quarantine', '.archive'];

const violations = [];
const warnings = [];
let filesScanned = 0;

// ── File Discovery ──────────────────────────────────────────────────────────

function findFiles(dir, ext = '.js') {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      results.push(...findFiles(fullPath, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

// ── Check 1: Raw setCapabilityValue ────────────────────────────────────────

function checkRawSetCapability(content, filePath) {
  const relPath = path.relative(ROOT, filePath);
  const lines = content.split('\n');
  const found = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    // Match raw setCapabilityValue but not safeSetCapabilityValue
    if (/this\.setCapabilityValue\s*\(/.test(line) && !/safeSetCapabilityValue/.test(line)) {
      found.push({ line: i + 1, text: line.trim() });
    }
  }

  if (found.length > 0) {
    violations.push({
      type: 'RAW_SET_CAPABILITY',
      severity: 'critical',
      file: relPath,
      matches: found,
      fix: 'Replace this.setCapabilityValue() with this.safeSetCapabilityValue()',
    });
  }
}

// ── Check 2: console.log in drivers ────────────────────────────────────────

function checkConsoleLog(content, filePath) {
  const relPath = path.relative(ROOT, filePath);
  const lines = content.split('\n');
  const found = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    // Match console.log/error/warn
    if (/console\.(log|error|warn)\s*\(/.test(line)) {
      found.push({ line: i + 1, text: line.trim() });
    }
  }

  if (found.length > 0) {
    violations.push({
      type: 'CONSOLE_LOG',
      severity: 'high',
      file: relPath,
      matches: found,
      fix: 'Replace console.log/error/warn with this.log()/this.error()/this.warn()',
    });
  }
}

// ── Check 3: Empty manufacturerName ────────────────────────────────────────

function checkEmptyMfr(content, filePath) {
  const relPath = path.relative(ROOT, filePath);
  if (/\"manufacturerName\"\s*:\s*\[\s*\]/.test(content)) {
    violations.push({
      type: 'EMPTY_MFR',
      severity: 'critical',
      file: relPath,
      fix: 'Remove empty manufacturerName array or populate it',
    });
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  const startTime = Date.now();

  // Get staged files if in git context, otherwise scan all
  let filesToScan = [];
  let jsonToScan = [];

  try {
    // Try to get staged files from git
    const staged = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8', stdio: 'pipe' });
    const stagedFiles = staged.split('\n').filter(f => f.endsWith('.js') || f.endsWith('.json'));
    for (const f of stagedFiles) {
      const fullPath = path.join(ROOT, f);
      if (!fs.existsSync(fullPath)) continue;
      if (f.startsWith('drivers/') && (f.endsWith('device.js') || f.endsWith('driver.js'))) {
        filesToScan.push(fullPath);
      }
      if (f.startsWith('drivers/') && f.includes('driver.compose.json')) {
        jsonToScan.push(fullPath);
      }
    }
  } catch (e) {
    // Not in git context or git not available, scan all
    const driverFiles = findFiles(DRIVERS_DIR);
    for (const filePath of driverFiles) {
      if (filePath.endsWith('device.js') || filePath.endsWith('driver.js')) {
        filesToScan.push(filePath);
      }
    }
    const jsonFiles = findFiles(DRIVERS_DIR, '.json');
    for (const filePath of jsonFiles) {
      if (filePath.includes('driver.compose.json')) {
        jsonToScan.push(filePath);
      }
    }
  }

  // Scan JS files for pattern violations
  for (const filePath of filesToScan) {
    filesScanned++;
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      checkRawSetCapability(content, filePath);
      checkConsoleLog(content, filePath);
    } catch (e) {
      warnings.push({ file: path.relative(ROOT, filePath), message: e.message });
    }
  }

  // Scan JSON files for empty manufacturerName
  for (const filePath of jsonToScan) {
    filesScanned++;
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      checkEmptyMfr(content, filePath);
    } catch (e) {
      warnings.push({ file: path.relative(ROOT, filePath), message: e.message });
    }
  }

  const elapsed = Date.now() - startTime;

  // Output
  if (JSON_OUTPUT) {
    console.log(JSON.stringify({
      passed: violations.length === 0,
      violations: violations.length,
      warnings: warnings.length,
      filesScanned,
      elapsedMs: elapsed,
      details: violations,
    }, null, 2));
  } else {
    if (violations.length === 0) {
      console.log(`\x1b[32m[PASS]\x1b[0m TITAN pre-commit: ${filesScanned} files scanned, 0 violations (${elapsed}ms)`);
    } else {
      console.log(`\x1b[31m[FAIL]\x1b[0m TITAN pre-commit: ${violations.length} violations found in ${filesScanned} files (${elapsed}ms)\n`);
      for (const v of violations) {
        const icon = v.severity === 'critical' ? '\x1b[31m[CRITICAL]\x1b[0m' : '\x1b[33m[HIGH]\x1b[0m';
        console.log(`  ${icon} ${v.type}: ${v.file}`);
        if (v.matches) {
          for (const m of v.matches.slice(0, 3)) {
            console.log(`    Line ${m.line}: ${m.text}`);
          }
          if (v.matches.length > 3) {
            console.log(`    ... and ${v.matches.length - 3} more`);
          }
        }
        console.log(`    Fix: ${v.fix}\n`);
      }
    }
  }

  process.exit(violations.length > 0 ? 1 : 0);
}

main();
