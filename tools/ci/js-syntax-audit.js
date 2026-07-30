#!/usr/bin/env node
'use strict';
/**
 * js-syntax-audit.js — syntax-checks every repo JS file IN-PROCESS (vm.Script),
 * ~100x faster than spawning `node --check` per file. Writes
 * .github/state/js-syntax-audit.json and exits 1 on any failure.
 *
 * Usage: node tools/ci/js-syntax-audit.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const SKIP_DIRS = new Set(['node_modules', '.git', '.homeybuild', 'backups', '.kimi-work', 'tmp', 'reimplementation_gateway']);
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) {walk(p);}
    } else if (/\.(js|cjs)$/.test(e.name)) {
      files.push(p);
    }
  }
})(ROOT);

const bad = [];
for (const f of files) {
  try {
    new vm.Script(fs.readFileSync(f, 'utf8'), { filename: f });
  } catch (e) {
    bad.push(`${path.relative(ROOT, f)}: ${e.message.split('\n')[0]}`);
  }
}

const rel = files.length;
fs.writeFileSync(
  path.join(ROOT, '.github', 'state', 'js-syntax-audit.json'),
  JSON.stringify({ generated: new Date().toISOString(), total: rel, bad }, null, 1)
);
console.log(`[js-syntax-audit] ${rel} fichiers vérifiés | syntaxe invalide: ${bad.length}`);
for (const b of bad) {console.log(' ', b);}
process.exit(bad.length ? 1 : 0);
