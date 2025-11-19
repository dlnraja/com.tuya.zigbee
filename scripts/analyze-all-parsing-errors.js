#!/usr/bin/env node
/**
 * COMPREHENSIVE PARSING ERROR ANALYZER
 * Analyzes ALL 19 remaining parsing errors with deep context
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all parsing errors
const lintOutput = execSync('npm run lint', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
const lines = lintOutput.split('\n');

const errors = [];
lines.forEach((line, idx) => {
  if (line.includes('Parsing error:')) {
    // Extract file path and line number
    const prevLine = lines[idx - 1];
    const match = prevLine.match(/([A-Z]:\\[^\\]+\\[^:]+):(\d+):(\d+)/);
    if (match) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        col: parseInt(match[3]),
        error: line.trim()
      });
    }
  }
});

console.log(`\n${'='.repeat(80)}`);
console.log(`FOUND ${errors.length} PARSING ERRORS - DEEP ANALYSIS`);
console.log(`${'='.repeat(80)}\n`);

errors.forEach((err, idx) => {
  console.log(`\n${'-'.repeat(80)}`);
  console.log(`ERROR #${idx + 1}: ${path.basename(err.file)}`);
  console.log(`Line ${err.line}:${err.col} - ${err.error}`);
  console.log(`${'-'.repeat(80)}`);

  try {
    const content = fs.readFileSync(err.file, 'utf8');
    const lines = content.split('\n');

    // Show 20 lines before and 10 lines after for context
    const start = Math.max(0, err.line - 21);
    const end = Math.min(lines.length, err.line + 10);

    console.log(`\nCONTEXT (lines ${start + 1}-${end}):\n`);
    for (let i = start; i < end; i++) {
      const lineNum = (i + 1).toString().padStart(4, ' ');
      const marker = (i + 1 === err.line) ? ' >>> ' : '     ';
      console.log(`${lineNum}${marker}${lines[i]}`);
    }
    console.log();
  } catch (e) {
    console.log(`Error reading file: ${e.message}`);
  }
});

console.log(`\n${'='.repeat(80)}`);
console.log(`ANALYSIS COMPLETE - ${errors.length} errors analyzed`);
console.log(`${'='.repeat(80)}\n`);
