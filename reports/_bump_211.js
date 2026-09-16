'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const next = '5.12.211';
for (const rel of ['.homeycompose/app.json', 'package.json', 'app.json']) {
  const p = path.join(root, rel);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  j.version = next;
  fs.writeFileSync(p, `${JSON.stringify(j, null, rel === 'app.json' ? 0 : 2)}\n`);
}
const cl = JSON.parse(fs.readFileSync('.homeychangelog.json', 'utf8'));
if (!cl[next]) {
  cl[next] = { en: 'Added Contre quoi unit tests for complementary OEM overlays and dual-case compose preserve.' };
  fs.writeFileSync('.homeychangelog.json', `${JSON.stringify(cl, null, 2)}\n`);
}
console.log('bumped', next);
