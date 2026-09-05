// compare-mfs-db.js — compare mfs_db.json between master and stable
'use strict';
const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = process.cwd();
const gitExe = 'C:\\Program Files\\Git\\cmd\\git.exe';

function gitBlob(branch, file) {
  // Write to temp file to avoid ENOBUFS
  const tmp = path.join(ROOT, '.tmp-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  try {
    execFileSync(gitExe, ['show', `${branch}:${file}`], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }, (err, stdout, stderr) => {
      fs.writeFileSync(tmp, stdout);
    });
    // Sync version (we need to wait)
    execFileSync(gitExe, ['show', `${branch}:${file}`], { cwd: ROOT, stdio: 'pipe' });
    // Actually use cat file approach
    return null;
  } catch (e) {
    return null;
  }
}

function gitShowSync(branch, file) {
  // Use execFileSync with maxBuffer
  try {
    const result = execFileSync(gitExe, ['show', `${branch}:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
    return result;
  } catch (e) {
    console.error('Failed to read', branch, file, ':', e.message);
    return null;
  }
}

const branch1 = process.argv[2] || 'origin/master';
const branch2 = process.argv[3] || 'origin/stable-v5';
const file = process.argv[4] || 'data/mfs_db.json';

console.log('Comparing', file, 'between', branch1, 'and', branch2);

const c1 = gitShowSync(branch1, file);
const c2 = gitShowSync(branch2, file);

if (!c1 || !c2) {
  console.error('Could not read one of the files');
  process.exit(1);
}

const d1 = JSON.parse(c1);
const d2 = JSON.parse(c2);

const mfrs1 = new Set(Object.keys(d1.devices || {}));
const mfrs2 = new Set(Object.keys(d2.devices || {}));

console.log(branch1, 'mfrs:', mfrs1.size);
console.log(branch2, 'mfrs:', mfrs2.size);

const only1 = [...mfrs1].filter(m => !mfrs2.has(m));
const only2 = [...mfrs2].filter(m => !mfrs1.has(m));
const common = [...mfrs1].filter(m => mfrs2.has(m));

console.log('Common:', common.length);
console.log('Only in', branch1 + ':', only1.length);
console.log('Only in', branch2 + ':', only2.length);

if (process.argv.includes('--only1') && only1.length) {
  console.log('\nOnly in ' + branch1 + ' (first 20):');
  only1.slice(0, 20).forEach(m => console.log('  ' + m));
}
if (process.argv.includes('--only2') && only2.length) {
  console.log('\nOnly in ' + branch2 + ' (first 20):');
  only2.slice(0, 20).forEach(m => console.log('  ' + m));
}
