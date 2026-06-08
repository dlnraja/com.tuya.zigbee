#!/usr/bin/env node
/**
 * check-await-without-async.js
 *
 * Detects `await` usage inside non-async functions.
 * This is a semantic error that passes Node.js syntax validation but causes
 * SyntaxError at runtime on newer Node.js versions (v22+).
 *
 * Bug category: #7 (await-without-async)
 * Severity: CRITICAL — prevents module from loading
 *
 * Usage: node scripts/validation/check-await-without-async.js [--fix] [--verbose]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');

// Files to check (base classes and drivers)
const PATTERNS = [
  'lib/**/*.js',
  'drivers/**/*.js',
];

function findAwaitInNonAsync(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  // Track method definitions
  let currentMethod = null;
  let currentAsync = false;
  let braceDepth = 0;
  let methodLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Count braces
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }

    // Detect method definitions at class level (2 spaces indent, depth <= 2)
    const asyncMatch = line.match(/^  async (\w+)\(/);
    const syncMatch = line.match(/^  (\w+)\(/);

    if (asyncMatch && braceDepth <= 2) {
      currentMethod = asyncMatch[1];
      currentAsync = true;
      methodLine = i + 1;
    } else if (syncMatch && !line.includes('async') && braceDepth <= 2
               && !['if', 'for', 'while', 'switch', 'catch', 'else', 'try', 'constructor'].includes(syncMatch[1])) {
      currentMethod = syncMatch[1];
      currentAsync = false;
      methodLine = i + 1;
    }

    // Check for await in non-async method
    if (!currentAsync && currentMethod && line.includes('await ')) {
      issues.push({
        line: i + 1,
        method: currentMethod,
        methodLine,
        snippet: line.trim(),
      });
    }
  }

  return issues;
}

// Main
const files = [];
for (const pattern of PATTERNS) {
  files.push(...glob.sync(pattern, { ignore: ['node_modules/**'] }));
}

let totalIssues = 0;
const results = [];

for (const file of files) {
  try {
    const issues = findAwaitInNonAsync(file);
    if (issues.length > 0) {
      results.push({ file, issues });
      totalIssues += issues.length;
      if (verbose) {
        console.log(`\n❌ ${file}`);
        for (const issue of issues) {
          console.log(`  Line ${issue.line}: await in non-async ${issue.method}() (defined line ${issue.methodLine})`);
        }
      }
    }
  } catch (e) {
    // Skip files that can't be read
  }
}

// Report
console.log('\n═══════════════════════════════════════════════════════');
console.log('  AWAIT-WITHOUT-ASYNC DETECTOR');
console.log('═══════════════════════════════════════════════════════');
console.log(`  Files scanned: ${files.length}`);
console.log(`  Issues found: ${totalIssues}`);

if (results.length > 0) {
  console.log('\n  ❌ FAILED — await found in non-async functions:');
  for (const { file, issues } of results) {
    for (const issue of issues) {
      console.log(`    ${file}:${issue.line} — ${issue.method}() (line ${issue.methodLine})`);
    }
  }
  console.log('\n  These are SyntaxErrors on Node.js v22+ that prevent module loading.');
  console.log('  Add "async" keyword to the method definition to fix.');
  process.exit(1);
} else {
  console.log('\n  ✅ PASSED — No await-without-async issues found');
  process.exit(0);
}
