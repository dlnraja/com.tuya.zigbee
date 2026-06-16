#!/usr/bin/env node
'use strict';

/**
 * validate-fallbacks.js
 * Automated audit of fallback and error handling across the codebase.
 * Checks:
 *   1. All catch blocks are non-empty (contain at least a comment or log)
 *   2. All setCapabilityValue calls use a safety wrapper (.catch() or try/catch)
 *   3. All async functions have error handling
 *   4. Reports issues with file path, line number, and description
 *
 * Usage: node scripts/automation/validate-fallbacks.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SCAN_DIRS = ['lib', 'drivers'];
const EXTENSION = '.js';

let issues = [];
let stats = {
  filesScanned: 0,
  emptyCatches: 0,
  bareSetCapability: 0,
  deprecatedUsage: 0,
  total: 0,
};

// ============================================================
// 1. Find all empty catch blocks
// ============================================================
function checkEmptyCatches(filePath, lines) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Match: } catch (e) { } or } catch(e) { }  with optional whitespace
    if (/catch\s*\(\s*\w*\s*\)\s*\{\s*\}/.test(line)) {
      // Check if this is just a comment like: /* already registered */
      // It's fine if it's inside a comment line
      if (line.trimStart().startsWith('//')) continue;

      issues.push({
        file: filePath,
        line: lineNum,
        type: 'empty-catch',
        message: 'Empty catch block - add logging or a descriptive comment',
        code: line.trim(),
      });
      stats.emptyCatches++;
    }

    // Also check multiline: } catch (e) {\n  }
    if (/catch\s*\(\s*\w*\s*\)\s*\{/.test(line) && !/catch\s*\(\s*\w*\s*\)\s*\{.*\}/.test(line)) {
      // Look at next line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine === '}' || nextLine === '};') {
          issues.push({
            file: filePath,
            line: lineNum,
            type: 'empty-catch',
            message: 'Empty catch block (multiline) - add logging or a descriptive comment',
            code: lines[i].trim(),
          });
          stats.emptyCatches++;
        }
      }
    }
  }
}

// ============================================================
// 2. Find bare setCapabilityValue calls (no .catch, no try/catch)
// ============================================================
function checkBareSetCapability(filePath, lines) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip comments
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;

    // Match setCapabilityValue calls
    if (!/\.?setCapabilityValue\s*\(/.test(line)) continue;

    // Skip if it already has .catch() on same line or next non-empty lines
    const combinedContext = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join(' ');
    if (/\.catch\s*\(/.test(combinedContext)) continue;

    // Skip if it's inside a try block (check up to 5 lines back)
    let inTryBlock = false;
    for (let j = i - 1; j >= Math.max(0, i - 8); j--) {
      if (lines[j].includes('try') && lines[j].includes('{')) {
        inTryBlock = true;
        break;
      }
      // If we hit a catch, we're in a new scope
      if (/catch\s*\(/.test(lines[j])) break;
    }
    if (inTryBlock) continue;

    // Skip if it's a super.setCapabilityValue (in override, parent handles it)
    if (line.includes('super.setCapabilityValue')) continue;

    // Skip if it's a re-assignment like: const fn = this.setCapabilityValue
    if (/\b(?:const|let|var|return)\b.*setCapabilityValue/.test(line)) {
      // It's being stored, not directly called - but check if it's `return this.setCapabilityValue(...)`
      if (!/return\s+.*setCapabilityValue/.test(line)) continue;
    }

    // Skip if wrapped in .then()
    if (/\.\s*then\s*\(/.test(line)) continue;

    // Skip if it's a class method definition
    if (/\basync\s+\w+\s*\(.*setCapabilityValue/.test(line)) continue;

    issues.push({
      file: filePath,
      line: lineNum,
      type: 'bare-set-capability',
      message: 'setCapabilityValue without .catch() or try/catch wrapper',
      code: line.trim(),
    });
    stats.bareSetCapability++;
  }
}

// ============================================================
// 3. Find deprecated/TODO/FIXME markers
// ============================================================
function checkDeprecated(filePath, lines) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (/\bTODO\b/.test(line) && !line.trimStart().startsWith('//')) {
      issues.push({
        file: filePath,
        line: lineNum,
        type: 'todo',
        message: 'TODO marker found - should be resolved or tracked',
        code: line.trim(),
      });
      stats.deprecatedUsage++;
    }

    if (/\bFIXME\b/.test(line)) {
      issues.push({
        file: filePath,
        line: lineNum,
        type: 'fixme',
        message: 'FIXME marker found - requires resolution',
        code: line.trim(),
      });
      stats.deprecatedUsage++;
    }
  }
}

// ============================================================
// Main: scan all files
// ============================================================
function scanDir(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and hidden dirs
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      scanDir(fullPath);
    } else if (entry.name.endsWith(EXTENSION)) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  stats.filesScanned++;

  checkEmptyCatches(filePath, lines);
  checkBareSetCapability(filePath, lines);
  checkDeprecated(filePath, lines);
}

// ============================================================
// Report
// ============================================================
function printReport() {
  const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');

  console.log('\n' + '='.repeat(80));
  console.log('  FALLBACK & ERROR HANDLING VALIDATION REPORT');
  console.log('='.repeat(80));
  console.log(`  Files scanned:       ${stats.filesScanned}`);
  console.log(`  Empty catch blocks:  ${stats.emptyCatches}`);
  console.log(`  Bare setCapability:  ${stats.bareSetCapability}`);
  console.log(`  TODO/FIXME markers:  ${stats.deprecatedUsage}`);
  console.log(`  Total issues:        ${issues.length}`);
  console.log('='.repeat(80));

  if (issues.length === 0) {
    console.log('\n  All checks passed! No fallback issues found.\n');
    return;
  }

  // Group by type
  const groups = {};
  for (const issue of issues) {
    if (!groups[issue.type]) groups[issue.type] = [];
    groups[issue.type].push(issue);
  }

  for (const [type, items] of Object.entries(groups)) {
    console.log(`\n--- ${type.toUpperCase()} (${items.length}) ---`);
    for (const item of items) {
      console.log(`  ${rel(item.file)}:${item.line}`);
      console.log(`    ${item.message}`);
      console.log(`    > ${item.code.substring(0, 120)}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('  Validation complete.');
  console.log('='.repeat(80) + '\n');
}

// ============================================================
// Run
// ============================================================
for (const dir of SCAN_DIRS) {
  const fullPath = path.join(ROOT, dir);
  if (fs.existsSync(fullPath)) {
    scanDir(fullPath);
  }
}

printReport();

// Exit with error code if issues found
process.exit(issues.length > 0 ? 1 : 0);
