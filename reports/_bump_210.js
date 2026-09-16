'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const next = '5.12.210';
for (const rel of ['.homeycompose/app.json', 'package.json', 'app.json']) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) continue;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  j.version = next;
  fs.writeFileSync(p, `${JSON.stringify(j, null, rel === 'app.json' ? 0 : 2)}\n`);
  console.log('bumped', rel, next);
}
const clPath = path.join(root, '.homeychangelog.json');
const cl = JSON.parse(fs.readFileSync(clPath, 'utf8'));
if (!cl[next]) {
  cl[next] = { en: 'Improved complementary OEM/forum/Z2M coverage overlays for recent Zigbee couples.' };
  fs.writeFileSync(clPath, `${JSON.stringify(cl, null, 2)}\n`);
}
