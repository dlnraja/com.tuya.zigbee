#!/usr/bin/env node
'use strict';
/**
 * drivers-smoke-test.js — requires every drivers/<id>/device.js in an
 * isolated subprocess (homey stub preloaded) and reports load failures.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const files = [];
for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
  const f = path.join(ROOT, 'drivers', d, 'device.js');
  if (fs.existsSync(f)) {files.push(f);}
}

const bad = [];
for (const f of files) {
  try {
    execFileSync(process.execPath, [
      '-r', path.join(ROOT, 'tools', 'ci', 'preload-homey-stub.js'),
      '-e', `require(${JSON.stringify(f)})`,
    ], { stdio: 'pipe', timeout: 8000, cwd: ROOT });
  } catch (e) {
    const msg = (e.stderr || e.stdout || '').toString().split('\n').filter(Boolean).slice(0, 2).join(' | ');
    bad.push(`${path.relative(ROOT, f)}: ${msg.slice(0, 160)}`);
  }
}
console.log(`drivers smoke-test: ${files.length} fichiers | échecs: ${bad.length}`);
for (const b of bad) {console.log(' ', b);}
fs.writeFileSync(
  path.join(ROOT, '.github', 'state', 'drivers-smoke-audit.json'),
  JSON.stringify({ generated: new Date().toISOString(), total: files.length, bad }, null, 1)
);
process.exit(bad.length ? 1 : 0);
