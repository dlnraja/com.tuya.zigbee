'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const locked = lock.packages && lock.packages['node_modules/homey'] && lock.packages['node_modules/homey'].version;
const installedPath = path.join(root, 'node_modules', 'homey', 'package.json');
if (!locked) {
  console.error('homey-cli-pin: package-lock.json has no node_modules/homey');
  process.exit(1);
}
if (!fs.existsSync(installedPath)) {
  console.error(`homey-cli-pin: node_modules/homey is missing; npm ci must install homey@${locked}`);
  process.exit(1);
}
const installed = JSON.parse(fs.readFileSync(installedPath, 'utf8')).version;
if (installed !== locked) {
  console.error(`homey-cli-pin: installed homey@${installed} != lockfile homey@${locked}`);
  process.exit(1);
}
console.log(`homey-cli-pin: homey@${installed}`);
