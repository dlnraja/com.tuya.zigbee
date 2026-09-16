'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const MASTER = 'C:/Users/Dell/Documents/homey/master';
const ROOT = process.cwd();

function cp(rel) {
  fs.copyFileSync(path.join(MASTER, rel), path.join(ROOT, rel));
  console.log('cp', rel);
}

const files = [
  'drivers/presence_sensor_radar/configs.js',
  'drivers/presence_sensor_radar/driver.js',
  'lib/data/SensorConfigs.js',
  'lib/tuya/TuyaSensorDatabase.js',
  'test/critical/p2534-vichy-mtg075-presence-dp1.test.js',
  'test/critical/p2511-vichy-clrdrnya-mtg-residual.test.js',
];
for (const f of files) cp(f);

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
pkg.scripts['check:p2534'] = 'node --test test/critical/p2534-vichy-mtg075-presence-dp1.test.js';
if (pkg.scripts['check:p253x'] && !pkg.scripts['check:p253x'].includes('p2534')) {
  pkg.scripts['check:p253x'] = pkg.scripts['check:p253x'].replace(/check:p2533/, 'check:p2533 && npm run check:p2534');
  if (!pkg.scripts['check:p253x'].includes('p2534')) {
    pkg.scripts['check:p253x'] += ' && npm run check:p2534';
  }
}
const ver = '5.12.213';
pkg.version = ver;
fs.writeFileSync(path.join(ROOT, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
for (const rel of ['app.json', '.homeycompose/app.json']) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) continue;
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  j.version = ver;
  fs.writeFileSync(fp, `${JSON.stringify(j, null, 2)}\n`);
}
const clp = path.join(ROOT, '.homeychangelog.json');
const cl = JSON.parse(fs.readFileSync(clp, 'utf8'));
cl[ver] = { en: 'P2534 VicHY MTG075: presence follows DP1 — stop distance=0 Flow WHEN flip-flop.' };
fs.writeFileSync(clp, `${JSON.stringify(cl, null, 2)}\n`);
execSync('npm run check:p2534', { cwd: ROOT, stdio: 'inherit' });
console.log('stable ready', ver);
