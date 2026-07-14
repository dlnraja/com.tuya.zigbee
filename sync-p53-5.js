// sync-p53-5.js — Sync P53.5 changes from master to stable-v5
// Bumps concurrency 10->30 in 4 scanners + xiaomi-miot refactor
'use strict';
const fs = require('fs');
const { execFileSync } = require('child_process');
const gitExe = 'C:\\Program Files\\Git\\cmd\\git.exe';
function git(args) { return execFileSync(gitExe, args, { cwd: process.cwd(), encoding: 'utf8' }); }
const FILES = [
  'scripts/scanners/tuya-local-scanner.js',
  'scripts/scanners/openhab-scanner.js',
  'scripts/scanners/xiaomi-miot-scanner.js',
  'scripts/scanners/csa-iot-scanner.js',
  '.github/workflows/mega-crawl.yml',
];

for (const f of FILES) {
  const m = git(['show', 'origin/master:' + f]).toString();
  const l = fs.readFileSync(f, 'utf8');
  if (m === l) {
    console.log('  same', f);
    continue;
  }
  // Force sync
  fs.writeFileSync(f, m);
  console.log('UPDATED', f, '(' + m.length + ' bytes)');
}
