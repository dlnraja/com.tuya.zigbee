// Cross-ref Gmail FPs with our mfs_db + app.json + drivers
const fs = require('fs');
const path = require('path');

const fpsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'state', 'gmail-unique-fps.json'), 'utf8'));
const fps = fpsData.fps;

const root = path.join(__dirname, '..', '..');

// 1. mfs_db.json
const mfsDbPath = path.join(root, 'data', 'mfs_db.json');
let mfsDb = {};
if (fs.existsSync(mfsDbPath)) mfsDb = JSON.parse(fs.readFileSync(mfsDbPath, 'utf8'));
const mfsManufacturers = new Set();
const mfsFPs = new Set();
function walkMfs(node) {
  if (typeof node !== 'object' || node === null) return;
  if (Array.isArray(node)) { node.forEach(walkMfs); return; }
  if (typeof node.manufacturerName === 'string') mfsManufacturers.add(node.manufacturerName);
  if (typeof node.fingerprint === 'string') mfsFPs.add(node.fingerprint);
  for (const v of Object.values(node)) walkMfs(v);
}
walkMfs(mfsDb);
console.log(`mfs_db: ${mfsManufacturers.size} mfrs, ${mfsFPs.size} FPs`);

// 2. app.json
const appJsonPath = path.join(root, 'app.json');
let appJson = {};
if (fs.existsSync(appJsonPath)) appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const appMfrs = new Set();
const appFPs = new Set();
function walkApp(node) {
  if (typeof node !== 'object' || node === null) return;
  if (Array.isArray(node)) { node.forEach(walkApp); return; }
  if (Array.isArray(node.manufacturerName)) node.manufacturerName.forEach(m => appMfrs.add(m));
  if (Array.isArray(node.fingerprints)) {
    node.fingerprints.forEach(fp => {
      if (typeof fp === 'object' && fp.fingerprint) {
        const matches = fp.fingerprint.match(/_T[A-Z0-9]+_[A-Za-z0-9]+/g);
        if (matches) matches.forEach(m => appFPs.add(m));
      } else if (typeof fp === 'string') {
        appFPs.add(fp);
      }
    });
  }
  for (const v of Object.values(node)) walkApp(v);
}
walkApp(appJson);
console.log(`app.json: ${appMfrs.size} mfrs, ${appFPs.size} FPs`);

// 3. driver.compose.json
const driverDirs = fs.readdirSync(path.join(root, 'drivers')).filter(d => {
  try { return fs.statSync(path.join(root, 'drivers', d)).isDirectory(); } catch (e) { return false; }
});
const driverMfrs = new Set();
const driverFPs = new Set();
for (const d of driverDirs) {
  const composePath = path.join(root, 'drivers', d, 'driver.compose.json');
  if (!fs.existsSync(composePath)) continue;
  try {
    const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const zigbee = data.zigbee || {};
    if (Array.isArray(zigbee.manufacturerName)) zigbee.manufacturerName.forEach(m => driverMfrs.add(m));
    if (Array.isArray(zigbee.fingerprints)) {
      zigbee.fingerprints.forEach(fp => {
        if (typeof fp === 'object' && fp.fingerprint) {
          const matches = fp.fingerprint.match(/_T[A-Z0-9]+_[A-Za-z0-9]+/g);
          if (matches) matches.forEach(m => driverFPs.add(m));
        } else if (typeof fp === 'string') {
          driverFPs.add(fp);
        }
      });
    }
  } catch (e) {}
}
console.log(`drivers: ${driverMfrs.size} mfrs, ${driverFPs.size} FPs (across ${driverDirs.length} drivers)`);

// 4. Sacred Couples (mfs_db)
const sacredCouples = new Set();
function findSacred(node, prefix = '') {
  if (typeof node !== 'object' || node === null) return;
  if (Array.isArray(node)) { node.forEach((v, i) => findSacred(v, prefix + '[' + i + ']')); return; }
  if (node.sacredCouples) {
    if (Array.isArray(node.sacredCouples)) node.sacredCouples.forEach(s => sacredCouples.add(s));
  }
  for (const [k, v] of Object.entries(node)) findSacred(v, prefix + '.' + k);
}
findSacred(mfsDb);
console.log(`Sacred couples: ${sacredCouples.size}`);

// Cross-ref
const inMfsDb = fps.filter(f => mfsFPs.has(f));
const inApp = fps.filter(f => appFPs.has(f));
const inDrivers = fps.filter(f => driverFPs.has(f));
const inSacred = fps.filter(f => sacredCouples.has(f));
const missing = fps.filter(f => !mfsFPs.has(f) && !appFPs.has(f) && !driverFPs.has(f));

console.log(`\n=== Cross-Ref Results ===`);
console.log(`Total Gmail FPs: ${fps.length}`);
console.log(`In mfs_db: ${inMfsDb.length}`);
console.log(`In app.json: ${inApp.length}`);
console.log(`In drivers: ${inDrivers.length}`);
console.log(`In sacred couples: ${inSacred.length}`);
console.log(`MISSING from all: ${missing.length}`);

const outPath = path.join(__dirname, '..', '..', '.github', 'state', 'gmail-fps-crossref.json');
fs.writeFileSync(outPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  totalGmailFPs: fps.length,
  inMfsDb: inMfsDb.length,
  inApp: inApp.length,
  inDrivers: inDrivers.length,
  inSacred: inSacred.length,
  missing: missing,
  mfs_db_count: mfsFPs.size,
  app_count: appFPs.size,
  driver_count: driverFPs.size
}, null, 2));
console.log(`Wrote ${outPath}`);
