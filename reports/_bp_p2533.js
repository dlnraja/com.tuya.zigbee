'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = process.cwd();

function cp(rel) {
  const src = path.join('C:/Users/Dell/Documents/homey/master', rel);
  const dst = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log('copied', rel);
}

// Strip nkjintbl bleed
{
  const rel = 'drivers/switch_2gang/driver.compose.json';
  const fp = path.join(ROOT, rel);
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const before = (data.zigbee.manufacturerName || []).length;
  data.zigbee.manufacturerName = (data.zigbee.manufacturerName || []).filter((m) => !/nkjintbl/i.test(String(m)));
  fs.writeFileSync(fp, `${JSON.stringify(data, null, 2)}\n`);
  console.log('strip nkjintbl', before, '->', data.zigbee.manufacturerName.length);
}

cp('test/critical/p2533-complementary-merge-helpers.test.js');
cp('lib/enrichment/ComplementaryMerge.js');

// Wire npm
{
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  pkg.scripts['check:p2533'] = 'node --test test/critical/p2533-complementary-merge-helpers.test.js';
  pkg.scripts['check:p253x'] = 'npm run check:p2530 && npm run check:p2530d && npm run check:p2531 && npm run check:p2532 && npm run check:p2533';
  fs.writeFileSync(path.join(ROOT, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
}

execSync('node tools/ci/align-mfs-db-intelligent.js --apply', { cwd: ROOT, stdio: 'inherit' });
execSync('node tools/ci/align-mfs-db-intelligent.js --check', { cwd: ROOT, stdio: 'inherit' });

const ver = '5.12.212';
for (const rel of ['package.json', 'app.json', '.homeycompose/app.json']) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) continue;
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  j.version = ver;
  fs.writeFileSync(fp, `${JSON.stringify(j, null, 2)}\n`);
}
const clp = path.join(ROOT, '.homeychangelog.json');
const cl = JSON.parse(fs.readFileSync(clp, 'utf8'));
cl[ver] = {
  en: 'P2533 Contre quoi merge helpers; strip nkjintbl switch bleed; mfs align for exclusive gbm10jnj.',
};
fs.writeFileSync(clp, `${JSON.stringify(cl, null, 2)}\n`);
console.log('bumped', ver);
