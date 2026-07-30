#!/usr/bin/env node
'use strict';
/**
 * dead-module-audit.js — finds lib modules that nothing in the repo requires.
 * A module is "referenced" if any OTHER tracked .js file mentions its
 * basename in a require-like context. Results are a REPORT (not a deletion
 * list): dynamic requires and Homey runtime loading can hide real usage.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {walk(p);}
    else if (e.name.endsWith('.js')) {files.push(p);}
  }
})(path.join(ROOT, 'lib'));

const unreferenced = [];
for (const f of files) {
  const base = path.basename(f, '.js');
  if (['index'].includes(base)) {continue;}
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  let matches = [];
  try {
    const out = execSync(
      `git grep -l -E "require\\(['\\"][^'\\"]*${base}(\\.js)?['\\"]\\)" -- "*.js" || true`,
      { cwd: ROOT, encoding: 'utf8' }
    ).trim();
    matches = out ? out.split('\n').filter(Boolean) : [];
  } catch { matches = []; }
  // ne compter que les références provenant d'AUTRES fichiers
  const external = matches.filter(m => m.replace(/\\/g, '/') !== rel);
  if (external.length === 0) {unreferenced.push(rel);}
}

console.log(`dead-module-audit: ${files.length} modules lib | sans require externe: ${unreferenced.length}`);
for (const u of unreferenced) {console.log(' ', u);}
fs.writeFileSync(
  path.join(ROOT, '.github', 'state', 'dead-module-audit.json'),
  JSON.stringify({ generated: new Date().toISOString(), total: files.length, unreferenced }, null, 1)
);
