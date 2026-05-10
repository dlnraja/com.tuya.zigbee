#!/usr/bin/env node
/**
 * 🛡️ STRICT_SYNTAX_GUARD.js - v1.1.0
 * 
 * Formal gatekeeper for Universal Tuya Zigbee.
 * Recursively validates syntax of all JavaScript files in the repository.
 * Detects malformed 'extends' keywords (e.g., extends SensorBase or classextends).
 * Returns exit code 1 if any syntax error or formatting issue is found.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const TARGET_DIRS = ['lib', 'drivers', 'scripts'];
const IGNORE_DIRS = ['node_modules', '.git', '.homeybuild', 'quarantine', 'tmp', 'temp'];

let errorCount = 0;
let fileCount = 0;

function log(msg) { console.log(`[SYNTAX-GUARD] ${msg}`); }
function error(msg) { console.error(`[CRITICAL] ${msg}`); }

function validateFile(filePath) {
  fileCount++;
  
  // 1. Basic Node.js Compilation Check
  const result = spawnSync('node', ['--check', filePath]);
  if (result.status !== 0) {
    errorCount++;
    console.error(`\n❌ Syntax Error in ${path.relative(ROOT, filePath)}:`);
    console.error(result.stderr.toString());
    return false;
  }

  // 2. Extends Keyword Spacing Check (Prevention of extends SensorBase and classextends)
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Pattern 1: Missing space after extends (e.g., class MyDevice extends SensorBase)
    const patternNoSpaceAfter = /\bclass\s+\w+\s+extends\w+/;
    // Pattern 2: Missing space before extends (e.g., class MyDevice extends SensorBase)
    const patternNoSpaceBefore = /\bclass\s+\w+extends\s+\w+/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (patternNoSpaceAfter.test(line)) {
        errorCount++;
        console.error(`\n❌ Spacing error in ${path.relative(ROOT, filePath)} on line ${i + 1}:`);
        console.error(`   Line: "${line.trim()}"`);
        console.error(`   Reason: Missing space after 'extends' (e.g., 'extends SensorBase' instead of 'extends SensorBase')`);
      }
      
      if (patternNoSpaceBefore.test(line)) {
        errorCount++;
        console.error(`\n❌ Spacing error in ${path.relative(ROOT, filePath)} on line ${i + 1}:`);
        console.error(`   Line: "${line.trim()}"`);
        console.error(`   Reason: Missing space before 'extends' (e.g., 'class MyDevice extends' instead of 'class MyDevice extends')`);
      }
    }
  } catch (err) {
    console.error(`[SYNTAX-GUARD] Error reading file ${filePath}: ${err.message}`);
  }

  return true;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      validateFile(fullPath);
    }
  }
}

console.log('🛡️  STRICT_SYNTAX_GUARD starting validation...');
console.log('='.repeat(60));

TARGET_DIRS.forEach(dir => {
  const fullPath = path.join(ROOT, dir);
  if (fs.existsSync(fullPath)) {
    walk(fullPath);
  }
});

console.log('\n' + '='.repeat(60));
if (errorCount > 0) {
  error(`Validation FAILED. Found ${errorCount} syntax/spacing error(s) in ${fileCount} files.`);
  process.exit(1);
} else {
  log(`Validation PASSED. All ${fileCount} files are syntactically and structurally valid.`);
  process.exit(0);
}
