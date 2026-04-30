#!/usr/bin/env node
/**
 * 🛡️ STRICT_SYNTAX_GUARD.js - v1.0.0
 * 
 * Formal gatekeeper for Universal Tuya Zigbee.
 * Recursively validates syntax of all JavaScript files in the repository.
 * Returns exit code 1 if any syntax error is found.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const TARGET_DIRS = ['lib', 'drivers', 'scripts'];
const IGNORE_DIRS = ['node_modules', '.git', '.homeybuild', 'quarantine'];

let errorCount = 0;
let fileCount = 0;

function log(msg) { console.log(`[SYNTAX-GUARD] ${msg}`); }
function error(msg) { console.error(`[CRITICAL] ${msg}`); }

function validateFile(filePath) {
  fileCount++;
  const result = spawnSync('node', ['--check', filePath]);
  if (result.status !== 0) {
    errorCount++;
    console.error(`\n❌ Syntax Error in ${path.relative(ROOT, filePath)}:`);
    console.error(result.stderr.toString());
    return false;
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
  error(`Validation FAILED. Found ${errorCount} syntax error(s) in ${fileCount} files.`);
  process.exit(1);
} else {
  log(`Validation PASSED. All ${fileCount} files are syntactically valid.`);
  process.exit(0);
}
