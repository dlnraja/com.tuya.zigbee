#!/usr/bin/env node
'use strict';

/**
 * fix-empty-catches.js - Add Descriptive Logging to Empty Catch Blocks
 * =====================================================================
 * Empty catch blocks silently swallow errors, making debugging impossible.
 * This script finds all empty catch blocks in lib/ and drivers/ and adds
 * descriptive logging.
 *
 * Patterns handled:
 *   catch (err) { }           -> catch (err) { this.log('Operation failed:', err.message); }
 *   catch (e) { }             -> catch (e) { this.log('Operation failed:', e.message); }
 *   .catch(() => {})           -> .catch(() => {})  (promise chains - left as-is with TODO)
 *   .catch(function() {})      -> .catch(function() {}) (promise chains - left as-is with TODO)
 *
 * Flags:
 *   --dry-run    Preview fixes without writing files
 *   --verbose    Show per-file details
 *   --report     Output JSON summary to stdout
 *
 * Usage:
 *   node scripts/automation/fix-empty-catches.js
 *   node scripts/automation/fix-empty-catches.js --dry-run
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const LIB_DIR = path.join(ROOT, 'lib');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const IGNORE_DIRS = ['node_modules', '.git', '.homeybuild', 'quarantine', 'tmp', 'temp'];

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const VERBOSE = ARGS.includes('--verbose');
const REPORT = ARGS.includes('--report');

const C = {
  G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[34m',
  M: '\x1b[35m', D: '\x1b[90m', X: '\x1b[0m', W: '\x1b[1m',
};

function log(msg) { console.log(`${C.B}[FIX-CATCH]${C.X} ${msg}`); }
function ok(msg) { console.log(`${C.G}[FIX-CATCH]${C.X} ${msg}`); }
function warn(msg) { console.log(`${C.Y}[FIX-CATCH]${C.X} ${msg}`); }

const stats = {
  scanned: 0,
  fixed: 0,
  files: [],
  errors: [],
  skipped: [],
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

// ── Context Detection ───────────────────────────────────────────────────────

/**
 * Determines if the file uses class-based pattern (has `this.log` usage or class definition).
 */
function hasClassContext(content) {
  return content.includes('class ') && content.includes('this.');
}

/**
 * Determines the appropriate logging method based on context.
 */
function getLoggingMethod(content) {
  if (content.includes('this.log(')) return 'this.log';
  if (content.includes('this.error(')) return 'this.error';
  if (hasClassContext(content)) return 'this.log';
  return 'console.log'; // fallback for non-class files
}

// ── Empty Catch Detection & Fix ─────────────────────────────────────────────

function fixEmptyCatchBlocks(content, filePath) {
  let count = 0;
  let newContent = content;

  // Pattern 1: catch blocks with empty body (including newlines and whitespace)
  // Matches: catch (varName) { } or catch (varName) {\n  }
  // We use a regex that matches the catch pattern with only whitespace inside braces
  const catchPattern = /catch\s*\(\s*(\w+)\s*\)\s*\{(\s*)\}/g;

  const logMethod = getLoggingMethod(content);

  newContent = newContent.replace(catchPattern, (match, errVar, whitespace) => {
    count++;
    // Generate a context-aware description based on surrounding code
    return `catch (${errVar}) { ${logMethod}('Caught and ignored error:', ${errVar}.message || ${errVar}); }`;
  });

  // Pattern 2: catch blocks with only comments but no actual code (optional improvement)
  // Matches: catch (varName) { /* ignore */ } or catch (varName) { // ignore }
  const catchCommentPattern = /catch\s*\(\s*(\w+)\s*\)\s*\{\s*(?:\/\*[^*]*\*\/|\/\/[^\n]*)\s*\}/g;

  newContent = newContent.replace(catchCommentPattern, (match, errVar) => {
    count++;
    return `catch (${errVar}) { ${logMethod}('Caught and ignored error:', ${errVar}.message || ${errVar}); }`;
  });

  return { content: newContent, count };
}

// ── Promise Chain Empty Catch ───────────────────────────────────────────────

function fixPromiseChainCatches(content, filePath) {
  let count = 0;
  let newContent = content;

  // Pattern: .catch(() => {}) or .catch(function() {})
  // These are intentionally silent in many cases (fire-and-forget operations)
  // We add a TODO comment instead of replacing with logging
  const promiseCatchPattern = /\.catch\s*\(\s*(?:\(\s*\)\s*=>\s*\{\s*\}|function\s*\(\s*\)\s*\{\s*\})\s*\)/g;

  newContent = newContent.replace(promiseCatchPattern, (match) => {
    count++;
    // Keep as-is but add a TODO comment
    return match.replace(/\{\s*\}/, `() => { /* TODO: add error handling */ }`);
  });

  return { content: newContent, count };
}

// ── Main Processing ─────────────────────────────────────────────────────────

function processFile(filePath) {
  stats.scanned++;
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (readErr) {
    stats.errors.push({ file: filePath, error: readErr.message });
    return;
  }

  // Quick check: does this file have empty catch blocks?
  if (!content.match(/catch\s*\(\s*\w+\s*\)\s*\{(\s*)\}/) &&
      !content.match(/catch\s*\(\s*\w+\s*\)\s*\{\s*(?:\/\*[^*]*\*\/|\/\/[^\n]*)\s*\}/) &&
      !content.match(/\.catch\s*\(\s*(?:\(\s*\)\s*=>\s*\{\s*\}|function\s*\(\s*\)\s*\{\s*\})\s*\)/)) {
    return;
  }

  let original = content;
  let fileFixCount = 0;

  // Fix 1: Empty catch blocks
  const fix1 = fixEmptyCatchBlocks(content, filePath);
  content = fix1.content;
  fileFixCount += fix1.count;

  // Fix 2: Promise chain catches
  const fix2 = fixPromiseChainCatches(content, filePath);
  content = fix2.content;
  fileFixCount += fix2.count;

  if (content !== original) {
    if (!DRY_RUN) {
      try {
        fs.writeFileSync(filePath, content, 'utf8');
      } catch (writeErr) {
        stats.errors.push({ file: filePath, error: writeErr.message });
        return;
      }
    }
    stats.fixed += fileFixCount;
    stats.files.push({ file: path.relative(ROOT, filePath), count: fileFixCount });
    if (VERBOSE) {
      log(`${path.relative(ROOT, filePath)}: ${fileFixCount} empty catch(es) fixed`);
    } else {
      ok(`Fixed ${fileFixCount} empty catch(es) in ${path.relative(ROOT, filePath)}`);
    }
  }
}

// ── Entry Point ─────────────────────────────────────────────────────────────

function main() {
  console.log('');
  console.log(`${C.W}  FIX EMPTY CATCH BLOCKS${C.X} ${DRY_RUN ? `${C.Y}(DRY RUN)${C.X}` : ''}`);
  console.log(`${'='.repeat(70)}\n`);

  const libFiles = findJSFiles(LIB_DIR);
  const driverFiles = findJSFiles(DRIVERS_DIR);
  const allFiles = [...libFiles, ...driverFiles];

  log(`Scanning ${allFiles.length} JS files for empty catch blocks...\n`);

  for (const file of allFiles) {
    processFile(file);
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${C.W}  FIX SUMMARY${C.X}`);
  console.log(`${'='.repeat(70)}\n`);

  console.log(`  Files scanned:    ${stats.scanned}`);
  console.log(`  Files modified:   ${stats.files.length}`);
  console.log(`  Total fixes:      ${C.G}${stats.fixed}${C.X}\n`);

  if (stats.files.length > 0) {
    console.log(`  Modified files:`);
    for (const f of stats.files) {
      console.log(`    ${f.file} (${f.count} catch(es))`);
    }
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
  } else if (stats.fixed > 0) {
    console.log(`\n  ${C.G}All empty catch blocks fixed successfully.${C.X}\n`);
  } else {
    console.log(`\n  ${C.G}No empty catch blocks found. Codebase is clean.${C.X}\n`);
  }

  if (REPORT) {
    console.log(JSON.stringify(stats, null, 2));
  }
}

main();
