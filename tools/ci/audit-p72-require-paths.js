#!/usr/bin/env node
/**
 * P72 — Audit for require-path issues like the sensor_presence_radar bug.
 * Scan all .js files in drivers/ and count `require('../../../lib/...')`
 * (3-level up). Any such require in drivers/ is BUGGY because drivers/
 * is 2 levels deep.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, 'drivers');

let total = 0;
const bad = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      walk(full);
    } else if (ent.isFile() && ent.name.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // ../../../lib/... from drivers/<x>/file.js → outside repo
        // Also /lib/utils/... (root-anchored) is fine because it falls through to repo root
        const m = line.match(/require\(['"](\.\.\/\.\.\/\.\.\/[^'"]+)['"]\)/);
        if (m) {
          bad.push({ file: full.replace(ROOT + '\\', ''), line: i + 1, require: m[1] });
          total++;
        }
      }
    }
  }
}

walk(DRIVERS);

console.log(`FOUND ${total} bad require paths (../../../lib/... from drivers/):`);
for (const b of bad) {
  console.log(`  ${b.file}:${b.line}  -> require('${b.require}')`);
}
