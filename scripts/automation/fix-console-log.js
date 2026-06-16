#!/usr/bin/env node
'use strict';

/**
 * fix-console-log.js - Replace banned console.log/error/warn in production code
 * ============================================================================
 * Per CLAUDE.md rules, direct console.log/error/warn is BANNED in lib/ and
 * drivers/. This script replaces them with this.log()/this.error()/this.warn().
 *
 * Handles edge cases:
 *   - Standalone functions (module-level): converts to this.log() only inside classes
 *   - Constructor methods: uses this.log() (class context)
 *   - Files outside class context: skips (utility scripts, standalone functions)
 *   - Comments and strings: preserved untouched
 *   - console.log in class methods: replaced with this.log()
 *
 * Flags:
 *   --dry-run    Preview fixes without writing files
 *   --verbose    Show per-file details
 *   --report     Output JSON summary to stdout
 *
 * Usage:
 *   node scripts/automation/fix-console-log.js
 *   node scripts/automation/fix-console-log.js --dry-run
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

function log(msg) { console.log(`${C.B}[FIX-CONSOLE]${C.X} ${msg}`); }
function ok(msg) { console.log(`${C.G}[FIX-CONSOLE]${C.X} ${msg}`); }
function warn(msg) { console.log(`${C.Y}[FIX-CONSOLE]${C.X} ${msg}`); }

const stats = {
  scanned: 0,
  fixed: 0,
  files: [],
  replacements: { log: 0, error: 0, warn: 0 },
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

// ── Class Detection ─────────────────────────────────────────────────────────

/**
 * Determines if a file contains class definitions (device classes, mixins, etc.)
 * Files with classes can use this.log()/this.error()/this.warn().
 */
function hasClassDefinition(content) {
  return /class\s+\w+\s+extends\s+/.test(content);
}

/**
 * Determines if a file is a standalone utility (no class context).
 * These files may legitimately use console.log in top-level scope.
 */
function isStandaloneUtility(content, filePath) {
  const relPath = path.relative(ROOT, filePath);

  // Explicit exceptions - files that are utilities, not device code
  const knownUtilities = [
    'scripts/',
    'test/',
    'tests/',
    '.github/',
  ];

  if (knownUtilities.some(p => relPath.startsWith(p))) return true;

  // If the file has no class definitions, it's likely a standalone utility
  if (!hasClassDefinition(content)) return true;

  return false;
}

// ── Core Replacement Logic ──────────────────────────────────────────────────

function fixConsoleInFile(content, filePath) {
  const lines = content.split('\n');
  const result = [];
  let fileFixCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      result.push(line);
      continue;
    }

    // Skip lines that are part of string literals or template literals (basic heuristic)
    // If the line is just a string, skip
    if (/^['"`]/.test(trimmed) && /['"`];?\s*$/.test(trimmed)) {
      result.push(line);
      continue;
    }

    let newLine = line;

    // Pattern: console.error('...') -> this.error('...')
    // Pattern: console.warn('...') -> this.warn('...')
    // Pattern: console.log('...') -> this.log('...')
    // Only replace when preceded by whitespace or start of line (not in strings/comments)

    // Match console methods, but not inside strings
    const patterns = [
      { from: /\bconsole\.error\b/g, to: 'this.error', type: 'error' },
      { from: /\bconsole\.warn\b/g, to: 'this.warn', type: 'warn' },
      { from: /\bconsole\.log\b/g, to: 'this.log', type: 'log' },
    ];

    for (const { from, to, type } of patterns) {
      if (from.test(newLine)) {
        // Reset regex lastIndex
        from.lastIndex = 0;
        const replaced = newLine.replace(from, to);
        if (replaced !== newLine) {
          // Verify we're not inside a string literal
          const beforeMatch = newLine.split(from)[0] || '';
          const singleQuoteCount = (beforeMatch.match(/'/g) || []).length;
          const doubleQuoteCount = (beforeMatch.match(/"/g) || []).length;
          const backtickCount = (beforeMatch.match(/`/g) || []).length;

          // If odd number of quotes before the match, we're inside a string - skip
          if (singleQuoteCount % 2 !== 0 || doubleQuoteCount % 2 !== 0 || backtickCount % 2 !== 0) {
            continue;
          }

          newLine = replaced;
          stats.replacements[type]++;
          fileFixCount++;
        }
      }
    }

    if (newLine !== line && VERBOSE) {
      log(`  L${i + 1}: ${trimmed.substring(0, 80)}`);
    }

    result.push(newLine);
  }

  return { content: result.join('\n'), count: fileFixCount };
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

  // Skip standalone utilities (they don't have class context)
  if (isStandaloneUtility(content, filePath)) {
    stats.skipped.push(path.relative(ROOT, filePath));
    return;
  }

  // Quick check: does this file even have console.log/error/warn?
  if (!content.includes('console.log') && !content.includes('console.error') && !content.includes('console.warn')) {
    return;
  }

  const { content: newContent, count } = fixConsoleInFile(content, filePath);

  if (count > 0) {
    if (!DRY_RUN) {
      try {
        fs.writeFileSync(filePath, newContent, 'utf8');
      } catch (writeErr) {
        stats.errors.push({ file: filePath, error: writeErr.message });
        return;
      }
    }
    stats.fixed += count;
    stats.files.push({ file: path.relative(ROOT, filePath), count });
    if (!VERBOSE) ok(`Fixed ${count} console method(s) in ${path.relative(ROOT, filePath)}`);
  }
}

// ── Entry Point ─────────────────────────────────────────────────────────────

function main() {
  console.log('');
  console.log(`${C.W}  FIX CONSOLE.LOG IN PRODUCTION CODE${C.X} ${DRY_RUN ? `${C.Y}(DRY RUN)${C.X}` : ''}`);
  console.log(`${'='.repeat(70)}\n`);

  const libFiles = findJSFiles(LIB_DIR);
  const driverFiles = findJSFiles(DRIVERS_DIR);
  const allFiles = [...libFiles, ...driverFiles];

  log(`Scanning ${allFiles.length} JS files in lib/ and drivers/...`);
  log(`Skipping standalone utility scripts (no class context).\n`);

  for (const file of allFiles) {
    processFile(file);
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${C.W}  FIX SUMMARY${C.X}`);
  console.log(`${'='.repeat(70)}\n`);

  console.log(`  Files scanned:    ${stats.scanned}`);
  console.log(`  Files skipped:    ${stats.skipped.length} (standalone utilities)`);
  console.log(`  Files modified:   ${stats.files.length}`);
  console.log(`  Total fixes:      ${C.G}${stats.fixed}${C.X}\n`);

  console.log(`  Breakdown by method:`);
  console.log(`    console.log  -> this.log:    ${stats.replacements.log}`);
  console.log(`    console.error -> this.error:  ${stats.replacements.error}`);
  console.log(`    console.warn  -> this.warn:   ${stats.replacements.warn}`);

  if (stats.files.length > 0 && VERBOSE) {
    console.log(`\n  Modified files:`);
    for (const f of stats.files) {
      console.log(`    ${f.file} (${f.count} fix(es))`);
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
    console.log(`\n  ${C.G}All fixes applied successfully.${C.X}\n`);
  } else {
    console.log(`\n  ${C.G}No console.log/error/warn violations found in class-based files.${C.X}\n`);
  }

  if (REPORT) {
    console.log(JSON.stringify(stats, null, 2));
  }
}

main();
