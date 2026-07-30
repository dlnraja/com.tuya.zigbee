#!/usr/bin/env node
'use strict';
/**
 * lib-smoke-test.js — loads every lib JS file in an isolated subprocess
 * (5s timeout each) and reports which ones crash at require time.
 * Catches top-level errors: bad requires, syntax-adjacent runtime errors,
 * missing modules. Side-effect-free expectation: libs should be requirable.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const STUBS = path.join(ROOT, 'tools', 'ci', 'stubs');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {walk(p);}
    else if (e.name.endsWith('.js')) {files.push(p);}
  }
})(path.join(ROOT, 'lib'));

const bad = [];
for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  try {
    execFileSync(process.execPath, [
      '-r', path.join(ROOT, 'tools', 'ci', 'preload-homey-stub.js'),
      '-e', `try{require(${JSON.stringify(f)});}catch(e){console.error(e.message);process.exit(1)}`,
    ], {
      stdio: 'pipe', timeout: 5000, cwd: ROOT,
    });
  } catch (e) {
    const msg = (e.stderr || e.stdout || e.message || '').toString().split('\n').filter(Boolean).slice(0, 2).join(' | ');
    bad.push(`${rel}: ${msg}`);
  }
}
console.log(`lib smoke-test: ${files.length} fichiers | échecs au chargement: ${bad.length}`);
for (const b of bad) {console.log(' ', b);}
fs.writeFileSync(
  path.join(ROOT, '.github', 'state', 'lib-smoke-audit.json'),
  JSON.stringify({ total: files.length, bad }, null, 1)
);
process.exit(bad.length ? 1 : 0);
