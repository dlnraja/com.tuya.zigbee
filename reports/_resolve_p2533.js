'use strict';
const fs = require('fs');
const { execSync } = require('child_process');
const ROOT = process.cwd();

function take(rel, which) {
  execSync(`git checkout ${which} -- ${rel}`, { cwd: ROOT, stdio: 'inherit' });
}

// During rebase: --theirs = our P2533 commit being replayed
take('app.json', '--theirs');
take('data/mfs_db.json', '--theirs');

const ver = '5.12.212';
for (const rel of ['package.json', 'app.json', '.homeycompose/app.json']) {
  const fp = `${ROOT}/${rel}`;
  if (!fs.existsSync(fp)) continue;
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  j.version = ver;
  // strip any leftover conflict markers if parse somehow worked
  fs.writeFileSync(fp, `${JSON.stringify(j, null, 2)}\n`);
}

// Validate JSON
JSON.parse(fs.readFileSync(`${ROOT}/app.json`, 'utf8'));
JSON.parse(fs.readFileSync(`${ROOT}/data/mfs_db.json`, 'utf8'));
console.log('resolved app.json + mfs_db @', ver);
