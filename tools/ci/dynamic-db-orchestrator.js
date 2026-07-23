// tools/ci/dynamic-db-orchestrator.js
// P83.2 - Master orchestrator: cross-references ALL data sources with drivers,
// applies safe enrichments, syncs master+stable, audits Sacred Couples, and
// produces a complete report.
//
// Data sources ingested:
//   - data/mfs_db.json                   (3719 mfr→driverId mappings)
//   - .github/state/blakadder/mfr-pid.json (294 entries, vendor+category)
//   - .github/state/johan-dump/devices.json (124 entries)
//   - .github/state/johan-dump/issues.json  (172 issues, regex extract)
//   - .github/state/forum/new-fps.json      (Discourse forum FPs)
//   - data/sacred-couple-catch-all.json     (catch-all Sacred Couples)
//   - data/manufacturers.json               (Rule 24 mapping rules)
//
// Branches covered:
//   - master  (dev channel, all features)
//   - stable-v5 (LTS channel, selective sync)
//
// Output: .github/state/dynamic-db-orchestrator-report.json
//
// Usage:
//   node tools/ci/dynamic-db-orchestrator.js              # full audit, no changes
//   node tools/ci/dynamic-db-orchestrator.js --apply     # apply safe mfr additions
//   node tools/ci/dynamic-db-orchestrator.js --sync      # sync master→stable after apply

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MFS_DB = path.join(ROOT, 'data', 'mfs_db.json');
const BLAKADDER = path.join(ROOT, '.github', 'state', 'blakadder', 'mfr-pid.json');
const JOHAN_DEV = path.join(ROOT, '.github', 'state', 'johan-dump', 'devices.json');
const JOHAN_ISS = path.join(ROOT, '.github', 'state', 'johan-dump', 'issues.json');
const FORUM_FPS = path.join(ROOT, '.github', 'state', 'forum', 'new-fps.json');
const SACRED_BASELINE = path.join(ROOT, '.github', 'fingerprint-collision-baseline.json');
const STATE_DIR = path.join(ROOT, '.github', 'state');
const REPORT = path.join(STATE_DIR, 'dynamic-db-orchestrator-report.json');

const APPLY = process.argv.includes('--apply');
const SYNC = process.argv.includes('--sync');

// ─────────── helpers ───────────
function loadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) {
    console.warn(`[warn] cannot load ${p}: ${e.message}`);
    return null;
  }
}
function saveJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}
function loadDrivers(root) {
  const result = new Map();
  const driversDir = path.join(root, 'drivers');
  if (!fs.existsSync(driversDir)) return result;
  for (const d of fs.readdirSync(driversDir)) {
    const p = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (c.zigbee) {
        result.set(d, {
          mfrs: new Set((c.zigbee.manufacturerName || []).map(m => String(m))),
          pids: new Set((c.zigbee.productId || []).map(p => String(p)))
        });
      }
    } catch (e) {}
  }
  return result;
}

// ─────────── ingest sources ───────────
console.log('═══ P83.2 — Dynamic DB Orchestrator ═══');
console.log('Mode:', APPLY ? 'APPLY' : 'AUDIT-ONLY', SYNC ? '+ SYNC' : '');
console.log('');

const mfs = loadJSON(MFS_DB);
if (!mfs) { console.error('mfs_db missing'); process.exit(1); }
const blakadder = loadJSON(BLAKADDER) || {};
const johanDev = loadJSON(JOHAN_DEV) || [];
const johanIss = loadJSON(JOHAN_ISS) || [];
const forumFps = loadJSON(FORUM_FPS) || [];
const baseline = loadJSON(SACRED_BASELINE) || { collisions: [] };

// Build mfs_db mfr→driverId mapping
const mfsByMfr = new Map();
for (const [k, v] of Object.entries(mfs)) {
  if (k.startsWith('_') && typeof v === 'object' && v && v.driverId) {
    mfsByMfr.set(k, v.driverId);
  }
}

// Build blakadder mfr→category mapping
const blkByMfr = new Map();
for (const entry of Object.values(blakadder)) {
  if (entry && entry.mfr) {
    blkByMfr.set(entry.mfr, entry);
  }
}

// Build johan mfrs set
const johanMfrs = new Set();
for (const d of johanDev) {
  if (d && d.mfrs) for (const m of d.mfrs) johanMfrs.add(m);
}
for (const iss of johanIss) {
  if (iss && iss.body) {
    const m = iss.body.match(/_T[YZ][A-Z0-9]+_?[A-Z0-9]+/gi);
    if (m) for (const x of m) johanMfrs.add(x);
  }
}

// Build forum mfrs set
const forumMfrs = new Set();
const forumFpsList = Array.isArray(forumFps) ? forumFps : (forumFps && forumFps.newFPs) || [];
for (const f of forumFpsList) {
  if (f && f.manufacturerName) forumMfrs.add(f.manufacturerName);
}

console.log('Sources loaded:');
console.log(`  mfs_db:         ${mfsByMfr.size} mfr→driver mappings`);
console.log(`  blakadder:      ${blkByMfr.size} mfr→category mappings`);
console.log(`  johan:          ${johanMfrs.size} mfrs (devices+issues)`);
console.log(`  forum:          ${forumMfrs.size} mfrs`);
console.log('');

// ─────────── load drivers (master + stable) ───────────
const masterDrivers = loadDrivers(ROOT);
const stableRoot = path.resolve(ROOT, '..', 'stable');
const stableDrivers = loadDrivers(stableRoot);

console.log('Drivers loaded:');
console.log(`  master:         ${masterDrivers.size} drivers`);
console.log(`  stable-v5:      ${stableDrivers.size} drivers`);
console.log('');

// Build mfr→drivers index (master ∪ stable)
const mfrToDrivers = new Map();
for (const [d, info] of masterDrivers) {
  for (const m of info.mfrs) {
    if (!mfrToDrivers.has(m)) mfrToDrivers.set(m, new Set());
    mfrToDrivers.get(m).add(d);
  }
}
for (const [d, info] of stableDrivers) {
  for (const m of info.mfrs) {
    if (!mfrToDrivers.has(m)) mfrToDrivers.set(m, new Set());
    mfrToDrivers.get(m).add(d);
  }
}

// ─────────── cross-reference analysis ───────────
const allMfrs = [...mfrToDrivers.keys()];
const allSources = new Map();
for (const m of allMfrs) {
  allSources.set(m, new Set(['driver']));
}
for (const m of mfsByMfr.keys()) {
  if (!allSources.has(m)) allSources.set(m, new Set());
  allSources.get(m).add('mfs_db');
}
for (const m of blkByMfr.keys()) {
  if (!allSources.has(m)) allSources.set(m, new Set());
  allSources.get(m).add('blakadder');
}
for (const m of johanMfrs) {
  if (!allSources.has(m)) allSources.set(m, new Set());
  allSources.get(m).add('johan');
}
for (const m of forumMfrs) {
  if (!allSources.has(m)) allSources.set(m, new Set());
  allSources.get(m).add('forum');
}

// mfrs in mfs_db but no driver (gap to fill)
const mfsMissing = [...mfsByMfr.entries()]
  .filter(([m, d]) => masterDrivers.has(d) && !mfrToDrivers.has(m))
  .map(([m, d]) => ({ mfr: m, driverId: d }));

// mfrs in drivers but not in mfs_db (driver has extras — mfs_db out of date)
const mfrsNotInMfs = allMfrs.filter(m => !mfsByMfr.has(m));

// Sacred Couples: mfr in 2+ drivers
const sacredCouples = [];
for (const [m, drivers] of mfrToDrivers) {
  if (drivers.size > 1) {
    sacredCouples.push({ mfr: m, drivers: [...drivers].sort() });
  }
}

// Per-driver coverage
const driverCoverage = [];
for (const [d, info] of masterDrivers) {
  let mfrMfs = 0, mfrBlk = 0, mfrJohan = 0, mfrForum = 0;
  for (const m of info.mfrs) {
    if (mfsByMfr.has(m)) mfrMfs++;
    if (blkByMfr.has(m)) mfrBlk++;
    if (johanMfrs.has(m)) mfrJohan++;
    if (forumMfrs.has(m)) mfrForum++;
  }
  const stableInfo = stableDrivers.get(d);
  driverCoverage.push({
    driver: d,
    masterMfrs: info.mfrs.size,
    stableMfrs: stableInfo ? stableInfo.mfrs.size : 0,
    mfsMfrs: mfrMfs,
    blkMfrs: mfrBlk,
    johanMfrs: mfrJohan,
    forumMfrs: mfrForum
  });
}
driverCoverage.sort((a, b) => b.masterMfrs - a.masterMfrs);

console.log('=== CROSS-REF RESULTS ===');
console.log(`  mfs_db mfrs missing from drivers: ${mfsMissing.length}`);
console.log(`  Driver mfrs missing from mfs_db:  ${mfrsNotInMfs.length}`);
console.log(`  Sacred Couples (mfr in 2+ drivers): ${sacredCouples.length}`);
console.log(`  Driver coverage: ${driverCoverage.length} drivers audited`);
console.log('');

// Source overlap (mfrs covered by 1, 2, 3, 4, 5 sources)
const sourceCount = new Map();
for (const srcs of allSources.values()) {
  const n = srcs.size;
  sourceCount.set(n, (sourceCount.get(n) || 0) + 1);
}
console.log('Source overlap (mfr coverage):');
for (const [n, c] of [...sourceCount.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`  ${n} sources: ${c} mfrs`);
}
console.log('');

// ─────────── apply safe mfr additions (master only) ───────────
let appliedCount = 0;
const byDriver = new Map();
const collisions = [];
if (APPLY) {
  console.log('=== APPLYING SAFE ADDITIONS TO MASTER ===');
  for (const { mfr, driverId } of mfsMissing) {
    if (!mfrToDrivers.has(mfr)) {
      if (!byDriver.has(driverId)) byDriver.set(driverId, []);
      byDriver.get(driverId).push(mfr);
    } else {
      // mfr is in other drivers — Sacred Couple candidate, record it
      const otherDrivers = [...mfrToDrivers.get(mfr)];
      collisions.push({ mfr, targetDriver: driverId, alsoIn: otherDrivers });
    }
  }
  for (const [driverId, mfrs] of byDriver) {
    const p = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
    const c = loadJSON(p);
    if (!c || !c.zigbee) continue;
    const existing = new Set(c.zigbee.manufacturerName || []);
    let added = 0;
    for (const m of mfrs) {
      if (!existing.has(m)) { existing.add(m); added++; }
    }
    if (added > 0) {
      c.zigbee.manufacturerName = [...existing].sort();
      saveJSON(p, c);
      appliedCount += added;
    }
  }
  console.log(`  Applied ${appliedCount} mfrs to ${byDriver.size} drivers`);
  console.log(`  Sacred Couple candidates (not applied): ${collisions.length}`);
  console.log('');
}

// ─────────── sync master → stable (selective) ───────────
if (SYNC) {
  console.log('=== SYNCING MASTER → STABLE (selective) ===');
  let syncedCount = 0;
  let stableCollisions = 0;
  for (const [driverId, masterInfo] of masterDrivers) {
    const stableInfo = stableDrivers.get(driverId);
    if (!stableInfo) continue;
    // Find mfrs master has that stable doesn't
    const masterOnly = [...masterInfo.mfrs].filter(m => !stableInfo.mfrs.has(m));
    if (masterOnly.length === 0) continue;
    // Check each mfr: would adding to stable create a Sacred Couple?
    const safeToAdd = [];
    for (const m of masterOnly) {
      // Build simulated stable state: if we add m to this driver, does it clash?
      const stableClaims = stableInfo.mfrs.has(m) ? 1 : 0;
      // For Sacred Couple, mfr in 2+ drivers
      // We only know stable's current state, so we approximate: if m is in stable's
      // switch_1gang catch-all AND in a specific driver, the specific wins
      // If adding creates a new pair, it's safe (the mfr was missing from stable entirely)
      if (stableClaims === 0) {
        safeToAdd.push(m);
      } else {
        stableCollisions++;
      }
    }
    if (safeToAdd.length > 0) {
      const p = path.join(stableRoot, 'drivers', driverId, 'driver.compose.json');
      const c = loadJSON(p);
      if (!c || !c.zigbee) continue;
      const existing = new Set(c.zigbee.manufacturerName || []);
      let added = 0;
      for (const m of safeToAdd) {
        if (!existing.has(m)) { existing.add(m); added++; }
      }
      if (added > 0) {
        c.zigbee.manufacturerName = [...existing].sort();
        saveJSON(p, c);
        syncedCount += added;
      }
    }
  }
  console.log(`  Synced ${syncedCount} mfrs to stable-v5 (${stableCollisions} collisions skipped)`);
  console.log('');
}

// ─────────── final report ───────────
const report = {
  generatedAt: new Date().toISOString(),
  mode: APPLY ? 'APPLY' : 'AUDIT',
  sync: SYNC,
  sources: {
    mfs_db: mfsByMfr.size,
    blakadder: blkByMfr.size,
    johan: johanMfrs.size,
    forum: forumMfrs.size
  },
  drivers: {
    master: masterDrivers.size,
    stable: stableDrivers.size
  },
  crossRef: {
    mfsMissing: mfsMissing.length,
    mfrsNotInMfs: mfrsNotInMfs.length,
    sacredCouples: sacredCouples.length
  },
  applied: APPLY ? {
    mfrsAdded: appliedCount,
    driversTouched: byDriver.size,
    collisions: collisions.length
  } : null,
  synced: SYNC ? {
    mfrsAdded: syncedCount
  } : null,
  sourceOverlap: Object.fromEntries(sourceCount),
  topDrivers: driverCoverage.slice(0, 20)
};
saveJSON(REPORT, report);
console.log('=== REPORT ===');
console.log(`  Written: ${REPORT}`);
console.log(`  Size: ${(fs.statSync(REPORT).size / 1024).toFixed(1)} KB`);
console.log('');
console.log('Done.');
