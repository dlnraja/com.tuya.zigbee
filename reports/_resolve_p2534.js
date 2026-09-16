'use strict';
const fs = require('fs');
const { execSync } = require('child_process');
const ROOT = process.cwd();
execSync('git checkout --theirs -- app.json', { cwd: ROOT, stdio: 'inherit' });
const ver = '5.12.213';
for (const rel of ['package.json', 'app.json', '.homeycompose/app.json']) {
  const fp = `${ROOT}/${rel}`;
  if (!fs.existsSync(fp)) continue;
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  j.version = ver;
  fs.writeFileSync(fp, `${JSON.stringify(j, null, 2)}\n`);
}
JSON.parse(fs.readFileSync(`${ROOT}/app.json`, 'utf8'));
console.log('resolved @', ver);
