#!/usr/bin/env node
/**
 * P72 — Find syntax errors in all drivers/ files.
 * Runs `node -c` on every device.js / driver.js and reports failures.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
let count = 0;
const bad = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      walk(full);
    } else if (ent.isFile() && (ent.name === 'device.js' || ent.name === 'driver.js')) {
      count++;
      try {
        execFileSync(process.execPath, ['-c', full], { stdio: 'pipe' });
      } catch (e) {
        const stderr = e.stderr ? e.stderr.toString() : e.message;
        const lineMatch = stderr.match(/(.+?):(\d+)/);
        const line = lineMatch ? lineMatch[2] : '?';
        bad.push({ file: full.replace(ROOT + '\\', ''), line, error: stderr.split('\n')[0].slice(0, 200) });
      }
    }
  }
}

walk(path.join(ROOT, 'drivers'));
console.log(`Checked ${count} files in drivers/`);
console.log(`FOUND ${bad.length} syntax errors:`);
for (const b of bad) {
  console.log(`  ${b.file}:${b.line}  ${b.error}`);
}
process.exit(bad.length ? 1 : 0);
