// P52 — Direct sync of safe files from master to stable-v5
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const gitExe = 'C:\\Program Files\\Git\\cmd\\git.exe';

function git(args) {
  return execFileSync(gitExe, args, { cwd: root, encoding: 'utf8' }).trim();
}

console.log('═══ P52 — Direct safe sync master → stable-v5 ═══');

// Safe files to sync (FPs, battery, SDK3 compat, mfs_db, etc.)
const SAFE_FILES = [
  'lib/tuya/fingerprints.json',
  'lib/battery/BatteryMasterEngine.js',
  'lib/battery/BatteryCascadeEngine.js',
  'lib/battery/UniversalBatteryFallback.js',
  'lib/battery/index.js',
  'lib/LocalFirstEngine.js',
  'lib/SDK3CompatBridge.js',
  'lib/LowLevelBridge.js',
  'lib/utils/safe-timers.js',
  'data/mfs_db.json',
];

// Get master content for each safe file
const changes = [];
for (const f of SAFE_FILES) {
  try {
    const masterContent = git(['show', `origin/master:${f}`]);
    const localContent = fs.readFileSync(f, 'utf8');
    if (masterContent === localContent) continue;
    changes.push({ file: f, size: masterContent.length, lines: masterContent.split('\n').length });
  } catch (e) {
    // File doesn't exist locally or in master
  }
}

console.log('Files to sync:', changes.length);
for (const c of changes) {
  console.log('  ✓', c.file, '(' + c.lines + ' lines)');
}

// Apply changes
console.log('');
console.log('Applying changes...');
for (const c of changes) {
  const content = git(['show', `origin/master:${c.file}`]);
  fs.writeFileSync(c.file, content);
  console.log('  ✓ wrote', c.file);
}

// Show diff stats
console.log('');
console.log('=== Diff summary ===');
for (const c of changes) {
  try {
    const stat = git(['diff', '--stat', c.file]);
    if (stat) console.log(stat.split('\n').pop());
  } catch (e) { /* ignore */ }
}
