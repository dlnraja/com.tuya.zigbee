#!/usr/bin/env node
'use strict';

/**
 * auto-fix-patterns.js - Auto-Fix Common Architectural Violations
 * ============================================================================
 * Fixes three categories of anti-patterns across lib/ and drivers/:
 *   1. zb_product_id -> zb_model_id replacements (settings key typos)
 *   2. Bare setInterval -> this.homey.setInterval (SDK3 lifecycle compliance)
 *   3. Missing destroy guards (onDeleted/onUninit with _destroyed flag)
 *
 * Flags:
 *   --dry-run    Preview fixes without writing files
 *   --verbose    Show per-file details
 *   --report     Output JSON summary to stdout
 *
 * Usage:
 *   node scripts/automation/auto-fix-patterns.js
 *   node scripts/automation/auto-fix-patterns.js --dry-run
 *   node scripts/automation/auto-fix-patterns.js --verbose
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const LIB_DIR = path.join(ROOT, 'lib');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const IGNORE_DIRS = ['node_modules', '.git', '.homeybuild', 'quarantine', 'tmp', 'temp'];

// CLI flags
const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const VERBOSE = ARGS.includes('--verbose');
const REPORT = ARGS.includes('--report');

const C = {
  G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[34m',
  M: '\x1b[35m', D: '\x1b[90m', X: '\x1b[0m', W: '\x1b[1m',
};

function log(msg) { console.log(`${C.B}[AUTO-FIX]${C.X} ${msg}`); }
function ok(msg) { console.log(`${C.G}[AUTO-FIX]${C.X} ${msg}`); }
function warn(msg) { console.log(`${C.Y}[AUTO-FIX]${C.X} ${msg}`); }
function err(msg) { console.error(`${C.R}[AUTO-FIX]${C.X} ${msg}`); }

// Stats
const stats = {
  zbProductId: { scanned: 0, fixed: 0, files: [] },
  bareSetInterval: { scanned: 0, fixed: 0, files: [] },
  missingDestroyGuard: { scanned: 0, fixed: 0, files: [] },
  totalFiles: 0,
  totalFixed: 0,
  errors: [],
};

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

// ── Fix 1: zb_product_id -> zb_model_id ─────────────────────────────────────

function fixZbProductId(content, filePath) {
  // Match zb_product_id as a settings key string or property access
  // Only replace 'zb_product_id' (the wrong key), NOT 'zb_model_id' (already correct)
  const pattern = /\bzb_product_id\b/g;
  const matches = content.match(pattern);
  if (!matches || matches.length === 0) return { content, changed: false, count: 0 };

  const newContent = content.replace(pattern, 'zb_model_id');
  return { content: newContent, changed: true, count: matches.length };
}

// ── Fix 2: Bare setInterval -> this.homey.setInterval ───────────────────────

function fixBareSetInterval(content, filePath) {
  // Skip HTML files (they run in browser context, not Homey runtime)
  if (filePath.endsWith('.html')) return { content, changed: false, count: 0 };

  // Skip non-class files (standalone utility scripts)
  if (!content.includes('class ') && !content.includes('this.')) {
    return { content, changed: false, count: 0 };
  }

  let count = 0;
  let newContent = content;

  // Pattern: bare setInterval( but NOT already prefixed with homey.setInterval or window.setInterval
  // We match lines where setInterval is called but NOT preceded by a dot (property access)
  const lines = newContent.split('\n');
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      result.push(line);
      continue;
    }

    // Check for bare setInterval (not preceded by . or homey.)
    // Match: setInterval( but NOT .setInterval(
    const barePattern = /(?<!\.)(?<!\w)setInterval\s*\(/;
    if (barePattern.test(line)) {
      // Check if this is inside a class method (has 'this.' elsewhere)
      if (content.includes('class ') && content.includes('this.')) {
        // Replace bare setInterval( with this.homey.setInterval(
        const newLine = line.replace(barePattern, 'this.homey.setInterval(');
        if (newLine !== line) {
          result.push(newLine);
          count++;
          if (VERBOSE) {
            log(`  ${path.relative(ROOT, filePath)}: setInterval -> this.homey.setInterval`);
          }
          continue;
        }
      }
    }
    result.push(line);
  }

  newContent = result.join('\n');
  return { content: newContent, changed: count > 0, count };
}

// ── Fix 3: Missing Destroy Guards ──────────────────────────────────────────

function fixMissingDestroyGuard(content, filePath) {
  // Only check device.js files in drivers/
  const relPath = path.relative(ROOT, filePath);
  if (!relPath.startsWith('drivers/') || !relPath.endsWith('/device.js')) {
    return { content, changed: false, count: 0 };
  }

  // Check if this is a class that extends something (a real device)
  if (!content.includes('class ') || !content.includes('extends ')) {
    return { content, changed: false, count: 0 };
  }

  // Check if the class already has destroy guard (_destroyed flag)
  if (content.includes('_destroyed') || content.includes('onDeleted()') || content.includes('onUninit()')) {
    return { content, changed: false, count: 0 };
  }

  // Check if this uses intervals or timers that need cleanup
  const needsGuard = content.includes('setInterval') ||
                     content.includes('setTimeout') ||
                     content.includes('this._interval') ||
                     content.includes('this._timer') ||
                     content.includes('this._poll');

  if (!needsGuard) return { content, changed: false, count: 0 };

  // Find the class definition to insert after the opening brace
  const classMatch = content.match(/class\s+\w+\s+extends\s+\w+\s*[\s\S]*?\{/);
  if (!classMatch) return { content, changed: false, count: 0 };

  // Build the destroy guard code
  const guardCode = `
  // ── Destroy Guard ──────────────────────────────────────────────────────────
  async onDeleted() {
    this._destroyed = true;
    await this._destroyDevice?.();
    await super.onDeleted?.();
  }

  async onUninit() {
    this._destroyed = true;
    await this._destroyDevice?.();
    await super.onUninit?.();
  }
`;

  // Insert before the first method or at the end of the class
  // Look for a good insertion point - after the class opening brace
  const insertionPoint = classMatch.index + classMatch[0].length;

  // Find the first method after class declaration
  const afterClass = content.slice(insertionPoint);
  const firstMethod = afterClass.match(/\n\s+(async\s+)?onNodeInit\s*\(/);

  if (firstMethod) {
    const methodIndex = insertionPoint + firstMethod.index + 1;
    const newContent = content.slice(0, methodIndex) + guardCode + content.slice(methodIndex);
    return { content: newContent, changed: true, count: 1 };
  }

  // Fallback: append before closing brace
  const lastBrace = content.lastIndexOf('}');
  if (lastBrace > insertionPoint) {
    const newContent = content.slice(0, lastBrace) + guardCode + '\n' + content.slice(lastBrace);
    return { content: newContent, changed: true, count: 1 };
  }

  return { content, changed: false, count: 0 };
}

// ── Main Processing ─────────────────────────────────────────────────────────

function processFile(filePath) {
  stats.totalFiles++;
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (readErr) {
    stats.errors.push({ file: filePath, error: readErr.message });
    return;
  }

  let original = content;
  let fileFixCount = 0;

  // Fix 1: zb_product_id -> zb_model_id
  const fix1 = fixZbProductId(content, filePath);
  if (fix1.changed) {
    content = fix1.content;
    stats.zbProductId.fixed += fix1.count;
    stats.zbProductId.files.push(path.relative(ROOT, filePath));
    fileFixCount += fix1.count;
    if (VERBOSE) log(`  zb_product_id -> zb_model_id: ${fix1.count} replacement(s) in ${path.relative(ROOT, filePath)}`);
  }
  stats.zbProductId.scanned++;

  // Fix 2: Bare setInterval
  const fix2 = fixBareSetInterval(content, filePath);
  if (fix2.changed) {
    content = fix2.content;
    stats.bareSetInterval.fixed += fix2.count;
    stats.bareSetInterval.files.push(path.relative(ROOT, filePath));
    fileFixCount += fix2.count;
    if (VERBOSE) log(`  bare setInterval: ${fix2.count} fix(es) in ${path.relative(ROOT, filePath)}`);
  }
  stats.bareSetInterval.scanned++;

  // Fix 3: Missing destroy guards
  const fix3 = fixMissingDestroyGuard(content, filePath);
  if (fix3.changed) {
    content = fix3.content;
    stats.missingDestroyGuard.fixed += fix3.count;
    stats.missingDestroyGuard.files.push(path.relative(ROOT, filePath));
    fileFixCount += fix3.count;
    if (VERBOSE) log(`  destroy guard: ${fix3.count} added in ${path.relative(ROOT, filePath)}`);
  }
  stats.missingDestroyGuard.scanned++;

  // Write back if changed
  if (content !== original) {
    if (!DRY_RUN) {
      try {
        fs.writeFileSync(filePath, content, 'utf8');
      } catch (writeErr) {
        stats.errors.push({ file: filePath, error: writeErr.message });
        return;
      }
    }
    stats.totalFixed += fileFixCount;
    if (!VERBOSE) ok(`Fixed ${fileFixCount} issue(s) in ${path.relative(ROOT, filePath)}`);
  }
}

// ── Entry Point ─────────────────────────────────────────────────────────────

function main() {
  console.log('');
  console.log(`${C.W}  AUTO-FIX PATTERNS${C.X} ${DRY_RUN ? `${C.Y}(DRY RUN)${C.X}` : ''}`);
  console.log(`${'='.repeat(70)}\n`);

  // Discover all JS files
  const libFiles = findJSFiles(LIB_DIR);
  const driverFiles = findJSFiles(DRIVERS_DIR);
  const allFiles = [...libFiles, ...driverFiles];

  log(`Scanning ${allFiles.length} JS files...`);

  for (const file of allFiles) {
    processFile(file);
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${C.W}  FIX SUMMARY${C.X}`);
  console.log(`${'='.repeat(70)}\n`);

  console.log(`  Files scanned:      ${stats.totalFiles}`);
  console.log(`  Total fixes:        ${C.G}${stats.totalFixed}${C.X}\n`);

  console.log(`  ${C.B}1. zb_product_id -> zb_model_id${C.X}`);
  console.log(`     Files scanned:   ${stats.zbProductId.scanned}`);
  console.log(`     Replacements:    ${stats.zbProductId.fixed}`);
  if (stats.zbProductId.files.length > 0) {
    for (const f of stats.zbProductId.files) console.log(`       - ${f}`);
  }

  console.log(`\n  ${C.B}2. Bare setInterval -> this.homey.setInterval${C.X}`);
  console.log(`     Files scanned:   ${stats.bareSetInterval.scanned}`);
  console.log(`     Fixes:           ${stats.bareSetInterval.fixed}`);
  if (stats.bareSetInterval.files.length > 0) {
    for (const f of stats.bareSetInterval.files) console.log(`       - ${f}`);
  }

  console.log(`\n  ${C.B}3. Missing Destroy Guards${C.X}`);
  console.log(`     Files scanned:   ${stats.missingDestroyGuard.scanned}`);
  console.log(`     Guards added:    ${stats.missingDestroyGuard.fixed}`);
  if (stats.missingDestroyGuard.files.length > 0) {
    for (const f of stats.missingDestroyGuard.files) console.log(`       - ${f}`);
  }

  if (stats.errors.length > 0) {
    console.log(`\n  ${C.R}Errors (${stats.errors.length}):${C.X}`);
    for (const e of stats.errors) {
      console.log(`    - ${e.file}: ${e.error}`);
    }
  }

  console.log(`\n${'='.repeat(70)}`);

  if (DRY_RUN) {
    console.log(`\n  ${C.Y}DRY RUN complete. No files were modified.${C.X}\n`);
  } else if (stats.totalFixed > 0) {
    console.log(`\n  ${C.G}All fixes applied successfully.${C.X}\n`);
  } else {
    console.log(`\n  ${C.G}No violations found. Codebase is clean.${C.X}\n`);
  }

  // JSON report for CI
  if (REPORT) {
    console.log(JSON.stringify(stats, null, 2));
  }
}

main();
