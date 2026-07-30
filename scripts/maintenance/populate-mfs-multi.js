// populate-mfs-multi.js
// P86: Peuple mfs_db.json avec modelIds[] et variants[] pour chaque mfr
// - modelIds: PIDs associés au mfr (multi-PID support)
// - variants: case-variants (e.g. _TZE200_x vs _TZE204_x) et case-insensitive siblings

const fs = require('fs');
const path = require('path');

const ROOT = '.';
const MFS = 'data/mfs_db.json';
const BLK = '.github/state/blakadder/mfr-pid.json';

function loadJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; } }
function saveJSON(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }

const mfs = loadJSON(MFS);
const blk = loadJSON(BLK) || {};

if (!mfs) { console.log('mfs_db missing'); process.exit(1); }

// Build mfr → driverId index
const mfsByMfr = new Map();
const PLACEHOLDERS = new Set();
for (const [k, v] of Object.entries(mfs)) {
  if (!k.startsWith('_')) continue;
  if (k.length < 12) { PLACEHOLDERS.add(k); continue; }  // Skip placeholders
  if (typeof v !== 'object' || !v || !v.driverId) continue;
  mfsByMfr.set(k, v);
}

// Load driver mfrs+pids
function loadDrivers(root) {
  const result = new Map();
  const dir = path.join(root, 'drivers');
  for (const d of fs.readdirSync(dir)) {
    const p = path.join(dir, d, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (c.zigbee) {
        result.set(d, {
          mfrs: c.zigbee.manufacturerName || [],
          pids: c.zigbee.productId || []
        });
      }
    } catch (e) {}
  }
  return result;
}

const drivers = loadDrivers(ROOT);

// Build mfr → [{driverId, pids}]
const mfrToDriverPids = new Map();
for (const [d, info] of drivers) {
  for (const m of info.mfrs) {
    if (!mfrToDriverPids.has(m)) mfrToDriverPids.set(m, []);
    mfrToDriverPids.get(m).push({ driverId: d, pids: info.pids });
  }
}

// Build case-variants groups (mfrs differing only by case)
const lowerToMfrs = new Map();
for (const m of mfsByMfr.keys()) {
  const lower = m.toLowerCase();
  if (!lowerToMfrs.has(lower)) lowerToMfrs.set(lower, new Set());
  lowerToMfrs.get(lower).add(m);
}

// Build prefix-variants groups (_TZE200_xxx vs _TZE204_xxx vs _TZE284_xxx)
const baseToMfrs = new Map();
for (const m of mfsByMfr.keys()) {
  const match = m.match(/^_TZE?(\d+_)(([a-f0-9]+))$/i);
  if (match) {
    const base = match[2].toLowerCase();
    if (!baseToMfrs.has(base)) baseToMfrs.set(base, new Set());
    baseToMfrs.get(base).add(m);
  }
}

// Counters
let updatedMfrs = 0;
let multiPidMfrs = 0;
let variantMfrs = 0;
let totalVariants = 0;
let totalModelIds = 0;

for (const [mfr, v] of mfsByMfr) {
  // 1. Collect modelIds (PIDs from drivers this mfr appears in)
  const appearances = mfrToDriverPids.get(mfr) || [];
  const allPids = new Set();
  for (const app of appearances) {
    for (const p of app.pids) allPids.add(p);
  }
  if (allPids.size > 0) {
    v.modelIds = [...allPids].sort();
    v.pid = v.modelIds[0];  // Keep primary PID for backward compat
    v.modelIdsCount = v.modelIds.length;
    totalModelIds += v.modelIds.length;
    if (v.modelIds.length > 1) multiPidMfrs++;
    updatedMfrs++;
  }

  // 2. Collect case-variants (same mfr, different case)
  const lower = mfr.toLowerCase();
  const caseVariants = lowerToMfrs.get(lower);
  if (caseVariants && caseVariants.size > 1) {
    v.variants = [...caseVariants].sort();
    v.variantsCount = v.variants.length;
    totalVariants += v.variants.length;
    if (!v.variants.includes(mfr)) v.variants.push(mfr);
    variantMfrs++;
  }

  // 3. Collect prefix-variants (_TZE200_x, _TZE204_x, _TZE284_x with same body)
  const match = mfr.match(/^_TZE?(\d+_)(([a-f0-9]+))$/i);
  if (match) {
    const base = match[2].toLowerCase();
    const prefixVariants = baseToMfrs.get(base);
    if (prefixVariants && prefixVariants.size > 1) {
      v.prefixVariants = [...prefixVariants].sort();
      v.prefixVariantsCount = v.prefixVariants.length;
    }
  }
}

// Update stats
mfs.stats = mfs.stats || {};
mfs.stats.totalModelIds = totalModelIds;
mfs.stats.multiPidMfrs = multiPidMfrs;
mfs.stats.variantMfrs = variantMfrs;
mfs.stats.totalVariants = totalVariants;
mfs.stats.lastUpdated = new Date().toISOString();
mfs.stats.lastMfsMultiUpdate = new Date().toISOString();

console.log('P86: mfs_db enriched with modelIds + variants');
console.log('  Mfrs updated:', updatedMfrs);
console.log('  Mfrs with multi-PID (modelIds.length > 1):', multiPidMfrs);
console.log('  Mfrs with case variants:', variantMfrs);
console.log('  Total modelIds entries:', totalModelIds);
console.log('  Total variants entries:', totalVariants);

if (process.argv.includes('--apply')) {
  saveJSON(MFS, mfs);
  console.log('  Applied. Saved:', MFS);

  // Save report
  const report = {
    generatedAt: new Date().toISOString(),
    stats: mfs.stats,
    multiPidMfrs: [...mfsByMfr.entries()]
      .filter(([_, v]) => v.modelIds && v.modelIds.length > 1)
      .slice(0, 200)
      .map(([m, v]) => ({ mfr: m, modelIds: v.modelIds, driverId: v.driverId })),
    variantMfrs: [...mfsByMfr.entries()]
      .filter(([_, v]) => v.variants && v.variants.length > 0)
      .slice(0, 100)
      .map(([m, v]) => ({ mfr: m, variants: v.variants }))
  };
  saveJSON('.github/state/mfs-multi-pid-report.json', report);
  console.log('  Report: .github/state/mfs-multi-pid-report.json');
}
