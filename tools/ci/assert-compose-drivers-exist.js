'use strict';

/**
 * P2483 — Assert every app.json / compose driver id has drivers/<id>/ on disk.
 * Contre quoi: Homey validate "Filepath does not exist: drivers/X" (e2e stable FAIL).
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appPath = path.join(root, 'app.json');
if (!fs.existsSync(appPath)) {
  console.error('[assert-compose-drivers-exist] no app.json in', root);
  process.exit(1);
}

const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
const drivers = Array.isArray(app.drivers) ? app.drivers : [];
const missing = [];
for (const d of drivers) {
  const id = d && d.id;
  if (!id) continue;
  const dir = path.join(root, 'drivers', id);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    missing.push(id);
  }
}

if (missing.length) {
  console.error('[assert-compose-drivers-exist] MISSING folders:', missing.join(', '));
  process.exit(1);
}

console.log(`[assert-compose-drivers-exist] OK ${drivers.length} drivers present`);
