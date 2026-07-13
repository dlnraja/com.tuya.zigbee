#!/usr/bin/env node
'use strict';

/**
 * pre-commit-checks.js - CI Pre-Commit Violation Gate
 * ============================================================================
 * Lightweight gate that checks for violations the auto-fix scripts can repair.
 * Runs before commit to block pushes with known anti-patterns.
 *
 * Checks:
 *   1. zb_product_id usage (should be zb_model_id)
 *   2. Bare safeTimer.safeSetInterval(globalThis, should be this.homey.setInterval)
 *   3. Missing destroy guards in device.js files with timers
 *   4. console.log/error/warn in class-based production code (lib/, drivers/)
 *
 * Exit codes:
 *   0 = all checks passed (or --dry-run)
 *   1 = violations found, commit should be blocked
 *
 * Flags:
 *   --fix         Auto-fix violations instead of just reporting
 *   --verbose     Show per-file details
 *   --json        Output JSON report to stdout (for CI integration)
 *
 * Usage:
 *   node scripts/ci/pre-commit-checks.js
 *   node scripts/ci/pre-commit-checks.js --fix
 *   node scripts/ci/pre-commit-checks.js --json
 */

const fs = require('fs');
const safeTimer = require('./utils/safe-timers') || require('../utils/safe-timers') || require('../../lib/utils/safe-timers') || require('../lib/utils/safe-timers') || require('./lib/utils/safe-timers') || require('../../../lib/utils/safe-timers');
const path = require('path');

const ROOT = process.cwd();
const LIB_DIR = path.join(ROOT, 'lib');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const IGNORE_DIRS = ['node_modules', '.git', '.homeybuild', 'quarantine', 'tmp', 'temp'];

const ARGS = process.argv.slice(2);
const AUTO_FIX = ARGS.includes('--fix');
const VERBOSE = ARGS.includes('--verbose');
const JSON_OUTPUT = ARGS.includes('--json');

const C = {
  G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[34m',
  M: '\x1b[35m', D: '\x1b[90m', X: '\x1b[0m', W: '\x1b[1m',
};

const violations = [];
const warnings = [];
const fixes = [];
let filesScanned = 0;

// ── File Discovery ──────────────────────────────────────────────────────────

function findJSFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      results.push(...findJSFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

// ── Check 1: zb_product_id ─────────────────────────────────────────────────

function checkZbProductId(content, filePath) {
  const relPath = path.relative(ROOT, filePath);
  const pattern = /\bzb_product_id\b/g;
  let match;
  const lineNumbers = [];

  while ((match = pattern.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    lineNumbers.push(lineNum);
  }

  if (lineNumbers.length > 0) {
    const msg = `${relPath}: ${lineNumbers.length} usage(s) of zb_product_id (should be zb_model_id) at line(s) ${lineNumbers.join(', ')}`;
    violations.push({ type: 'ZB_PRODUCT_ID', file: relPath, count: lineNumbers.length, lines: lineNumbers, message: msg });

    if (AUTO_FIX) {
      const newContent = content.replace(/\bzb_product_id\b/g, 'zb_model_id');
      fs.writeFileSync(filePath, newContent, 'utf8');
      fixes.push({ type: 'ZB_PRODUCT_ID', file: relPath, count: lineNumbers.length });
      if (VERBOSE) console.log(`  ${C.G}FIXED${C.X} ${msg}`);
    } else if (VERBOSE) {
      console.log(`  ${C.R}VIOLATION${C.X} ${msg}`);
    }
  }

  return lineNumbers.length;
}

// ── Check 2: Bare setInterval ──────────────────────────────────────────────

function checkBareSetInterval(content, filePath) {
  const relPath = path.relative(ROOT, filePath);

  // Skip HTML files
  if (filePath.endsWith('.html')) return 0;

  // Skip non-class files
  if (!content.includes('class ') && !content.includes('this.')) return 0;

  const lines = content.split('\n');
  let count = 0;
  const lineNumbers = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    // Match bare safeTimer.safeSetInterval(globalThis,  but NOT .safeTimer.safeSetInterval(globalThis, 
    if (/(?<!\.)(?<!\w)setInterval\s*\(/.test(line)) {
      lineNumbers.push(i + 1);
      count++;
    }
  }

  if (count > 0) {
    const msg = `${relPath}: ${count} bare setInterval call(s) at line(s) ${lineNumbers.join(', ')} (should be this.homey.setInterval)`;
    violations.push({ type: 'BARE_SETINTERVAL', file: relPath, count, lines: lineNumbers, message: msg });

    if (AUTO_FIX) {
      const newContent = content.replace(/(?<!\.)(?<!\w)setInterval\s*\(/g, 'this.homey.safeTimer.safeSetInterval(globalThis, ');
      fs.writeFileSync(filePath, newContent, 'utf8');
      fixes.push({ type: 'BARE_SETINTERVAL', file: relPath, count });
      if (VERBOSE) console.log(`  ${C.G}FIXED${C.X} ${msg}`);
    } else if (VERBOSE) {
      console.log(`  ${C.R}VIOLATION${C.X} ${msg}`);
    }
  }

  return count;
}

// ── Check 3: Missing Destroy Guards ────────────────────────────────────────

function checkMissingDestroyGuard(content, filePath) {
  const relPath = path.relative(ROOT, filePath);

  // Only check device.js files
  if (!relPath.startsWith('drivers/') || !relPath.endsWith('/device.js')) return 0;

  // Must be a class
  if (!content.includes('class ') || !content.includes('extends ')) return 0;

  // Already has destroy guard
  if (content.includes('_destroyed') || content.includes('onDeleted()') || content.includes('onUninit()')) return 0;

  // Only flag if timers are present
  const hasTimers = content.includes('setInterval') ||
                    content.includes('setTimeout') ||
                    content.includes('this._interval') ||
                    content.includes('this._timer') ||
                    content.includes('this._poll');

  if (!hasTimers) return 0;

  const msg = `${relPath}: device class has timers but no destroy guard (onDeleted/onUninit)`;
  warnings.push({ type: 'MISSING_DESTROY_GUARD', file: relPath, message: msg });

  if (VERBOSE) {
    console.log(`  ${C.Y}WARNING${C.X} ${msg}`);
  }

  return 0;
}

// ── Check 4: console.log in production code ────────────────────────────────

function checkConsoleLog(content, filePath) {
  const relPath = path.relative(ROOT, filePath);

  // Skip files outside lib/ and drivers/
  if (!relPath.startsWith('lib/') && !relPath.startsWith('drivers/')) return 0;

  // Skip non-class files
  if (!content.includes('class ') || !content.includes('this.')) return 0;

  const lines = content.split('\n');
  let count = 0;
  const lineNumbers = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    if (/\bconsole\.(log|error|warn)\b/.test(line)) {
      lineNumbers.push(i + 1);
      count++;
    }
  }

  if (count > 0) {
    const msg = `${relPath}: ${count} console.log/error/warn call(s) in class-based production code at line(s) ${lineNumbers.join(', ')}`;
    violations.push({ type: 'CONSOLE_LOG', file: relPath, count, lines: lineNumbers, message: msg });

    if (VERBOSE) {
      console.log(`  ${C.R}VIOLATION${C.X} ${msg}`);
    }
  }

  return count;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  if (!JSON_OUTPUT) {
    console.log('');
    console.log(`${C.W}  PRE-COMMIT CHECKS${C.X} ${AUTO_FIX ? `${C.G}(auto-fix enabled)${C.X}` : ''}`);
    console.log(`${'='.repeat(70)}\n`);
  }

  const libFiles = findJSFiles(LIB_DIR);
  const driverFiles = findJSFiles(DRIVERS_DIR);
  const allFiles = [...libFiles, ...driverFiles];

  if (!JSON_OUTPUT) {
    console.log(`  Scanning ${allFiles.length} JS files...\n`);
  }

  for (const file of allFiles) {
    filesScanned++;
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    checkZbProductId(content, file);
    checkBareSetInterval(content, file);
    checkMissingDestroyGuard(content, file);
    checkConsoleLog(content, file);
  }

  // JSON output for CI
  if (JSON_OUTPUT) {
    const report = {
      passed: violations.length === 0,
      filesScanned,
      violationCount: violations.length,
      warningCount: warnings.length,
      fixCount: fixes.length,
      violations,
      warnings,
      fixes,
    };
    console.log(JSON.stringify(report, null, 2));
    process.exit(violations.length > 0 ? 1 : 0);
    return;
  }

  // Summary
  console.log(`${'='.repeat(70)}`);
  console.log(`${C.W}  PRE-COMMIT RESULTS${C.X}`);
  console.log(`${'='.repeat(70)}\n`);

  console.log(`  Files scanned:  ${filesScanned}`);
  console.log(`  Violations:     ${violations.length > 0 ? C.R + violations.length : C.G + '0'}${C.X}`);
  console.log(`  Warnings:       ${warnings.length > 0 ? C.Y + warnings.length : C.G + '0'}${C.X}`);
  console.log(`  Auto-fixes:     ${fixes.length > 0 ? C.G + fixes.length : '0'}${C.X}`);

  if (fixes.length > 0) {
    console.log(`\n  ${C.G}Applied fixes:${C.X}`);
    for (const f of fixes) {
      console.log(`    [${f.type}] ${f.file}: ${f.count} fix(es)`);
    }
  }

  if (violations.length > 0) {
    console.log(`\n  ${C.R}Blocking violations:${C.X}`);
    for (const v of violations) {
      console.log(`    [${v.type}] ${v.message}`);
    }
  }

  if (warnings.length > 0) {
    console.log(`\n  ${C.Y}Non-blocking warnings:${C.X}`);
    for (const w of warnings) {
      console.log(`    [${w.type}] ${w.message}`);
    }
  }

  console.log(`\n${'='.repeat(70)}`);

  if (violations.length === 0) {
    console.log(`\n  ${C.G}PRE-COMMIT GATE PASSED${C.X}\n`);
    process.exit(0);
  } else if (AUTO_FIX) {
    console.log(`\n  ${C.G}All violations auto-fixed. Re-run to verify.${C.X}\n`);
    process.exit(0);
  } else {
    console.log(`\n  ${C.R}PRE-COMMIT GATE FAILED${C.X}`);
    console.log(`  Run with --fix to auto-repair violations.\n`);
    process.exit(1);
  }
}

main();
