const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APP = path.join(ROOT, 'app.json');
const DRIVERS = path.join(ROOT, 'drivers');
const REF = path.join(ROOT, 'references', 'manufacturer-ids.json');

if (!fs.existsSync(APP) || !fs.existsSync(DRIVERS) || !fs.existsSync(REF)) {
  throw new Error('Missing core files');
}

const app = JSON.parse(fs.readFileSync(APP, 'utf8'));
const ids = JSON.parse(fs.readFileSync(REF, 'utf8'));
const driverDirs = fs.readdirSync(DRIVERS).filter(d => fs.statSync(path.join(DRIVERS, d)).isDirectory());

const manifest = new Map(app.drivers.map(d => [d.id, d]));
let manifestUpdates = 0;
let composeUpdates = 0;

// Add missing drivers to manifest
