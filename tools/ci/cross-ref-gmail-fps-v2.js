// V2: Correct cross-ref - FPs = manufacturerName in zigbee section of driver.compose.json
const fs = require('fs');
const path = require('path');

const fpsData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'state', 'gmail-unique-fps.json'), 'utf8'));
const fps = fpsData.fps;
const root = path.join(__dirname, '..', '..');

// Driver.compose.json: each FP IS a manufacturerName entry
const driverDirs = fs.readdirSync(path.join(root, 'drivers')).filter(d => {
  try { return fs.statSync(path.join(root, 'drivers', d)).isDirectory(); } catch (e) { return false; }
});
const driverFPs = new Set();   // case-sensitive
const driverFPsLC = new Set(); // lowercase for fuzzy match
const driverSacred = new Set();
for (const d of driverDirs) {
  const composePath = path.join(root, 'drivers', d, 'driver.compose.json');
  if (!fs.existsSync(composePath)) continue;
  try {
    const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const z = data.zigbee || {};
    if (Array.isArray(z.manufacturerName)) {
      z.manufacturerName.forEach(m => {
        if (typeof m === 'string') {
          driverFPs.add(m);
          driverFPsLC.add(m.toLowerCase());
        }
      });
    }
    if (z.productId) {
      driverFPs.add(z.productId);
      driverFPsLC.add(String(z.productId).toLowerCase());
    }
  } catch (e) {}
}
console.log(`Drivers: ${driverFPs.size} mfr+pid entries (${driverFPsLC.size} lc) across ${driverDirs.length} drivers`);

// app.json
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const appFPs = new Set();
const appFPsLC = new Set();
for (const d of appJson.drivers || []) {
  const z = d.zigbee || {};
  if (Array.isArray(z.manufacturerName)) {
    z.manufacturerName.forEach(m => {
      if (typeof m === 'string') {
        appFPs.add(m);
        appFPsLC.add(m.toLowerCase());
      }
    });
  }
  if (z.productId) {
    appFPs.add(z.productId);
    appFPsLC.add(String(z.productId).toLowerCase());
  }
}
console.log(`app.json: ${appFPs.size} mfr+pid entries (${appFPsLC.size} lc)`);

// mfs_db - top-level keys are manufacturer names
const mfsDb = JSON.parse(fs.readFileSync(path.join(root, 'data', 'mfs_db.json'), 'utf8'));
const mfsMfrs = new Set(Object.keys(mfsDb).filter(k => !k.startsWith('_') || /_[A-Z][A-Z]/.test(k.slice(1))));
// mfs_db also has a sacredCouples object
const mfsSacred = new Set();
if (mfsDb.sacredCouples && typeof mfsDb.sacredCouples === 'object') {
  for (const [k, v] of Object.entries(mfsDb.sacredCouples)) {
    mfsSacred.add(k);
    mfsSacred.add(v);
  }
}
if (mfsDb.driverMapping && typeof mfsDb.driverMapping === 'object') {
  Object.keys(mfsDb.driverMapping).forEach(k => mfsSacred.add(k));
}
console.log(`mfs_db top-level mfrs: ${mfsMfrs.size}, sacred-like entries: ${mfsSacred.size}`);

// Cross-ref (case-insensitive)
const allFPs = new Set([...driverFPsLC, ...appFPsLC, ...[...mfsSacred].map(s => String(s).toLowerCase())]);
const inDrivers = fps.filter(f => driverFPs.has(f) || driverFPsLC.has(f.toLowerCase()));
const inApp = fps.filter(f => appFPs.has(f) || appFPsLC.has(f.toLowerCase()));
const inSacred = fps.filter(f => mfsSacred.has(f) || [...mfsSacred].some(s => String(s).toLowerCase() === f.toLowerCase()));
const missing = fps.filter(f => !allFPs.has(f.toLowerCase()));

console.log(`\n=== Cross-Ref Results ===`);
console.log(`Total Gmail FPs: ${fps.length}`);
console.log(`In drivers: ${inDrivers.length}`);
console.log(`In app.json: ${inApp.length}`);
console.log(`In sacred couples: ${inSacred.length}`);
console.log(`MISSING from all (mfr+pid): ${missing.length}`);

const outPath = path.join(__dirname, '..', '..', '.github', 'state', 'gmail-fps-crossref-v2.json');
fs.writeFileSync(outPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  totalGmailFPs: fps.length,
  inDrivers: inDrivers.length,
  inApp: inApp.length,
  inSacred: inSacred.length,
  missingCount: missing.length,
  missing: missing,
  stats: { drivers: driverFPs.size, app: appFPs.size, sacred: mfsSacred.size }
}, null, 2));
console.log(`\nWrote ${outPath}`);

// Group missing by prefix
const byPrefix = {};
for (const f of missing) {
  const m = f.match(/^_T(Y[A-Z0-9]+)_/);
  const prefix = m ? m[1] : 'other';
  if (!byPrefix[prefix]) byPrefix[prefix] = [];
  byPrefix[prefix].push(f);
}
console.log('\nMissing by prefix:');
for (const [p, arr] of Object.entries(byPrefix).sort((a,b)=>b[1].length-a[1].length)) {
  console.log(`  ${p}: ${arr.length}`);
}
