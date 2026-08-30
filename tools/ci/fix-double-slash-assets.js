#!/usr/bin/env node
'use strict';

/**
 * P2311: Homey compose expands `/{{driverAssetsPath}}/...` to `//drivers/...`
 * which Athom resolves as a missing S3 key ("The specified key does not exist").
 * Strip the leading slash before the placeholder and normalize existing //drivers.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const APPLY = !process.argv.includes('--check');

function fixText(raw) {
  let out = raw;
  out = out.replace(/"\/\{\{driverAssetsPath\}\}/g, '"{{driverAssetsPath}}');
  out = out.replace(/\/\/drivers\//g, '/drivers/');
  return out;
}

let composeFixed = 0;
let composeDirty = 0;
const driversDir = path.join(ROOT, 'drivers');
for (const id of fs.readdirSync(driversDir)) {
  const file = path.join(driversDir, id, 'driver.compose.json');
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, 'utf8');
  const after = fixText(before);
  if (after === before) continue;
  composeDirty += 1;
  JSON.parse(after);
  if (APPLY) {
    fs.writeFileSync(file, after.endsWith('\n') ? after : `${after}\n`);
    composeFixed += 1;
  }
}

const targets = ['app.json', path.join('.homeycompose', 'app.json')];
const report = { composeDirty, composeFixed, manifests: {} };
for (const rel of targets) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, 'utf8');
  const count = (before.match(/\/\/drivers\//g) || []).length;
  const after = fixText(before);
  report.manifests[rel] = { doubleSlash: count, changed: after !== before };
  if (after !== before) {
    JSON.parse(after);
    if (APPLY) fs.writeFileSync(file, after);
  }
}

const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const remaining = (app.drivers || []).filter((d) =>
  JSON.stringify(d.images || {}).includes('//drivers'));
report.remainingDoubleSlashDrivers = remaining.length;

console.log(JSON.stringify(report, null, 2));

if (process.argv.includes('--check') && (composeDirty > 0 || remaining.length > 0 ||
    Object.values(report.manifests).some((m) => m.doubleSlash > 0))) {
  console.error('CHECK FAIL: double-slash Homey asset paths present — run: node tools/ci/fix-double-slash-assets.js');
  process.exit(1);
}
