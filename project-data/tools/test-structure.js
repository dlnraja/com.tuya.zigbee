#!/usr/bin/env node

// tools/test-structure.js
// Vérifie la structure Homey du projet et des drivers.

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'reports');
const REPORT_PATH = path.join(REPORTS_DIR, 'structure-validation.json');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function exists(p) { return fs.existsSync(p); }

function checkRoot() {
  const required = ['app.json', 'app.js'];
  const missing = required.filter(f => !exists(path.join(PROJECT_ROOT, f)));
  return { required, missing };
}

function findDriverDirs(driversRoot) {
  const results = [];
  if (!exists(driversRoot)) return results;
  const stack = [driversRoot];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    const hasCompose = entries.some(e => e.isFile() && e.name === 'driver.compose.json');
    const hasDevice = entries.some(e => e.isFile() && (e.name === 'device.js' || e.name === 'driver.js'));
    if (hasCompose || hasDevice) {
      results.push(current);
      continue;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (['.git', 'node_modules', '.homeycompose', 'final-release', 'releases'].includes(e.name)) continue;
        stack.push(path.join(current, e.name));
      }
    }
  }
  return results;
}

function checkDriver(driverPath) {
  const required = [
    'driver.compose.json',
    'driver.js',
    'device.js',
    'assets/icon.svg',
  ];
  const missing = [];
  for (const f of required) {
    const full = path.join(driverPath, f);
    if (!exists(full)) missing.push(f);
  }
  // images optional but recommended
  const recommended = ['assets/images/large.png', 'assets/images/small.png'];
  const recMissing = recommended.filter(f => !exists(path.join(driverPath, f)));
  return { driverPath, missing, recommendedMissing: recMissing };
}

function main() {
  ensureDir(REPORTS_DIR);
  const res = { start: new Date().toISOString(), root: {}, drivers: [], errors: 0 };

  res.root = checkRoot();
  if (res.root.missing.length) res.errors += res.root.missing.length;

  const driversRoot = path.join(PROJECT_ROOT, 'drivers');
  const driverDirs = findDriverDirs(driversRoot);
  for (const d of driverDirs) {
    const r = checkDriver(d);
    if (r.missing.length) res.errors += r.missing.length;
    res.drivers.push({ path: path.relative(PROJECT_ROOT, d), ...r });
  }

  res.end = new Date().toISOString();
  fs.writeFileSync(REPORT_PATH, JSON.stringify(res, null, 2));
  console.log(`Structure validation report written to ${REPORT_PATH}`);
  if (res.errors > 0) {
    console.error(`Structure issues detected: ${res.errors}`);
    process.exit(1);
  }
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('Fatal error:', e); process.exit(1); }
}
