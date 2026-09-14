#!/usr/bin/env node
'use strict';

// P2471: sync drivers/wifi_generic/pair/configure.html to all wifi_* pair UIs.
// Usage: node tools/ci/sync-wifi-pair-configure.js [--check]

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SSOT = path.join(ROOT, 'drivers', 'wifi_generic', 'pair', 'configure.html');
const checkOnly = process.argv.includes('--check');

if (!fs.existsSync(SSOT)) {
  console.error('SSOT missing:', SSOT);
  process.exit(1);
}

const ssotBuf = fs.readFileSync(SSOT);
const driversRoot = path.join(ROOT, 'drivers');
const dirs = fs.readdirSync(driversRoot).filter((d) => d.startsWith('wifi_') && d !== 'wifi_generic');

let synced = 0;
let same = 0;
let missing = 0;
const drift = [];

for (const d of dirs) {
  const dest = path.join(driversRoot, d, 'pair', 'configure.html');
  if (!fs.existsSync(path.dirname(dest))) {
    missing += 1;
    continue;
  }
  if (!fs.existsSync(dest)) {
    if (checkOnly) {
      drift.push(d + ': missing');
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, ssotBuf);
    synced += 1;
    continue;
  }
  const cur = fs.readFileSync(dest);
  if (Buffer.compare(ssotBuf, cur) === 0) {
    same += 1;
    continue;
  }
  if (checkOnly) {
    drift.push(d);
    continue;
  }
  fs.writeFileSync(dest, ssotBuf);
  synced += 1;
}

if (checkOnly) {
  if (drift.length) {
    console.error('P2471 pair UI drift: ' + drift.length + '\n' + drift.slice(0, 30).join('\n'));
    process.exit(1);
  }
  console.log('P2471 pair UI SSOT check OK (' + same + ' match, ' + dirs.length + ' drivers)');
  process.exit(0);
}

console.log('P2471 sync-wifi-pair-configure: synced=' + synced + ' already_same=' + same + ' missing_dir=' + missing);
