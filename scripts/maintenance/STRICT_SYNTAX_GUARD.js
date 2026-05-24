#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const targetDirs = ['drivers', 'lib'];

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git'].includes(entry.name)) continue;
      walk(fullPath, callback);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      callback(fullPath);
    }
  }
}

console.log('--- SYNTAX AUDIT ---');
let errors = 0;
walk(ROOT, (file) => {
  const result = spawnSync('node', ['-c', file]);
  if (result.status !== 0) {
    errors++;
    console.log(`ERROR: ${path.relative(ROOT, file)}`);
    console.log(result.stderr.toString());
  }
});
console.log(`--- Total Errors: ${errors} ---`);
if (errors > 0) {
  process.exit(1);
}
