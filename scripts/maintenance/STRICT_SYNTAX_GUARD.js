#!/usr/bin/env node
// STRICT_SYNTAX_GUARD.js — Scans PRODUCTION code for JS syntax errors
// Only scans: drivers/ lib/ (not scripts/temp or other scratch dirs)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();

// Only production directories — scripts/temp is scratch and intentionally excluded
const SCAN_DIRS = ['drivers', 'lib'];
const IGNORE_DIRS = new Set(['node_modules', '.git', '.homeybuild', 'temp', 'tmp', 'quarantine', '.homeycompose']);

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, callback);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      callback(fullPath);
    }
  }
}

console.log('--- SYNTAX AUDIT (drivers + lib only) ---');
let errors = 0;
for (const dir of SCAN_DIRS) {
  walk(path.join(ROOT, dir), (file) => {
    const result = spawnSync('node', ['-c', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      errors++;
      console.log(`ERROR: ${path.relative(ROOT, file)}`);
      console.log((result.stderr || '').toString().split('\n').slice(0, 5).join('\n'));
    }
  });
}
console.log(`--- Total Errors: ${errors} ---`);
if (errors > 0) {
  process.exit(1);
}
