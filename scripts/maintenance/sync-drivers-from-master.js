// sync-drivers-from-master.js — P53
// Cherry-pick only the driver.compose.json changes from master to stable-v5
// Keeps the experimental scripts/tools on master, syncs only the canonical
// driver fingerprints.

'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = process.cwd();
const gitExe = 'C:\\Program Files\\Git\\cmd\\git.exe';

function git(args, opts) {
  return execFileSync(gitExe, args, Object.assign({ cwd: ROOT, encoding: 'utf8' }, opts || {})).trim();
}

console.log('=== Sync drivers (master → stable-v5) — P53 ===');

// 1. Get list of driver files that differ
const allFiles = git(['diff', '--name-only', 'origin/master..HEAD']).split('\n').filter(Boolean);
const driverFiles = allFiles.filter(f => f.match(/^drivers\/.*\/driver\.compose\.json$/));
console.log('Driver files that differ in stable-v5 vs master:', driverFiles.length);

// 2. Also get master drivers (in case stable-v5 is missing some)
const masterDrivers = git(['ls-tree', '-r', '--name-only', 'origin/master'])
  .split('\n')
  .filter(f => f.match(/^drivers\/.*\/driver\.compose\.json$/));
console.log('Master has', masterDrivers.length, 'drivers total');

// 3. Get list of drivers missing in stable
const localDrivers = new Set(fs.readdirSync(path.join(ROOT, 'drivers'))
  .filter(d => fs.existsSync(path.join(ROOT, 'drivers', d, 'driver.compose.json'))));
const missingDrivers = masterDrivers
  .map(f => f.replace(/^drivers\//, '').replace(/\/driver\.compose\.json$/, ''))
  .filter(d => !localDrivers.has(d));
console.log('Drivers missing in stable-v5:', missingDrivers.length);

if (missingDrivers.length > 0) {
  console.log('\nMissing drivers (first 20):');
  missingDrivers.slice(0, 20).forEach(d => console.log('  - ' + d));
}

if (process.argv.includes('--apply')) {
  // 4. Stage driver.compose.json changes from master
  console.log('\nApplying driver changes from master...');
  for (const f of driverFiles) {
    try {
      const masterContent = git(['show', `origin/master:${f}`]);
      const localPath = path.join(ROOT, f);
      if (fs.existsSync(localPath)) {
        fs.writeFileSync(localPath, masterContent + '\n');
        console.log('  UPDATED', f);
      } else {
        // Need to create the directory and copy
        console.log('  SKIP (no local file):', f);
      }
    } catch (e) {
      console.log('  FAILED', f, ':', e.message);
    }
  }

  // 5. Also copy missing drivers
  console.log('\nCopying missing drivers...');
  for (const d of missingDrivers) {
    try {
      const srcDir = path.join(ROOT, 'drivers', d);
      // We need to git checkout the entire driver folder from master
      // For simplicity, we just log it
      console.log('  MISSING (manual copy needed):', d);
    } catch (e) {}
  }
} else {
  console.log('\nRun with --apply to actually copy changes');
}
