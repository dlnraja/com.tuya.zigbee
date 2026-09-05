#!/usr/bin/env node
'use strict';

/**
 * sync-compose-to-mfs-db.js (P2368)
 *
 * Keep data/mfs_db.json aligned with driver.compose.json sacred couples:
 *   - Add missing mfr entries from compose (exclusive owner)
 *   - Fix wrong driverId when compose has single owner
 *   - Prune bloated modelIds to compose-claimed pids only
 *   - Merge case-duplicate keys
 *   - Apply curated high-confidence corrections
 *
 * Never invents productId — only pids present in compose for (mfr, driver).
 *
 * Usage:
 *   node tools/ci/sync-compose-to-mfs-db.js
 *   node tools/ci/sync-compose-to-mfs-db.js --apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DB_PATH = path.join(ROOT, 'data', 'mfs_db.json');
const APPLY = process.argv.includes('--apply');
const META_KEYS = new Set(['_meta', 'sources', 'devices', 'sacredCouples', 'stats', 'driverMapping']);

const SYNTHETIC_RX = /_disabled|_dummy|_generic|_hybrid|_master|placeholder|needs_/i;
const WIDE_CLAIM = new Set([
  'universal_zigbee', 'generic_tuya', 'generic_diy', 'universal_fallback',
  'tuya_dummy_device', 'device_generic_diy_universal', 'gateway_zigbee_bridge',
  'hybrid_light_sensor', 'usb_dongle_triple', 'switch_usb_dongle',
]);

/** Verified corrections (forum/Z2M/compose cross-ref) */
const KNOWN_CORRECTIONS = [
  { mfr: '_TZE284_HLX9TNZB', driverId: 'dimmer_1_gang_tuya', modelIds: ['TS0601'] },
  { mfr: '_TZE204_HLX9TNZB', driverId: 'dimmer_1_gang_tuya', modelIds: ['TS0601'] },
  { mfr: '_tz3210_402vrq2i', driverId: 'smart_knob', modelIds: ['TS004F'], mergeInto: '_TZ3000_402vrq2i' },
  { mfr: '_tz3400_402vrq2i', driverId: 'smart_knob', modelIds: ['TS004F'], mergeInto: '_TZ3000_402vrq2i' },
  { mfr: '_TZ3000_402vrq2i', driverId: 'smart_knob', modelIds: ['TS004F'] },
  { mfr: '_TZE204_r0jdjrvi', driverId: 'curtain_motor_tilt', modelIds: ['TS0601'] },
  { mfr: '_TZE200_r0jdjrvi', driverId: 'curtain_motor_tilt', modelIds: ['TS0601'] },
  { mfr: '_TZ3000_j1xl73iw', driverId: 'curtain_module_2_gang', modelIds: ['TS0601'] },
  { mfr: '_TZ3000_l6iqph4f', driverId: 'curtain_module_2_gang', modelIds: ['TS0601'] },
];

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function uniq(arr) {
  return [...new Set([].concat(arr || []).filter(Boolean))];
}

function sorted(arr) {
  return uniq(arr).sort((a, b) => a.localeCompare(b));
}

function isRealDriver(id) {
  return id && !WIDE_CLAIM.has(id) && !SYNTHETIC_RX.test(id);
}

function preferredMfrKey(keys) {
  const list = [...keys];
  list.sort((a, b) => {
    const score = (k) => {
      let s = 0;
      if (/^_TZ[A-Z0-9]+_[a-z0-9]+$/.test(k)) s += 20;
      if (/^_TZ/i.test(k)) s += 10;
      if (k === k.toUpperCase()) s -= 2;
      if (k === k.toLowerCase()) s -= 1;
      return s;
    };
    return score(b) - score(a) || a.localeCompare(b);
  });
  return list[0];
}

function entryKeys(db) {
  return Object.keys(db).filter((k) => !META_KEYS.has(k) && db[k] && typeof db[k] === 'object');
}

function loadComposeIndex() {
  const byMfr = new Map();
  const byCouple = new Map();
  const driverPids = new Map(); // `${mfrNorm}|${driverId}` -> Set<pid>

  for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    if (!isRealDriver(id)) continue;
    const p = path.join(ROOT, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    let j;
    try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
    const mfrs = [].concat(j.zigbee?.manufacturerName || []);
    const pids = [].concat(j.zigbee?.productId || []);
    for (const m of mfrs) {
      if (SYNTHETIC_RX.test(m)) continue;
      const nm = norm(m);
      if (!byMfr.has(nm)) byMfr.set(nm, new Set());
      byMfr.get(nm).add(id);
      const dpKey = `${nm}|${id}`;
      if (!driverPids.has(dpKey)) driverPids.set(dpKey, new Set());
      for (const pid of pids) {
        driverPids.get(dpKey).add(String(pid).toUpperCase());
        const ck = `${nm}|${norm(pid)}`;
        if (!byCouple.has(ck)) byCouple.set(ck, new Set());
        byCouple.get(ck).add(id);
      }
    }
  }
  return { byMfr, byCouple, driverPids };
}

function ensureEntry(db, key) {
  if (!db[key] || typeof db[key] !== 'object') {
    db[key] = { driverId: null, source: 'sync-compose-to-mfs-db', modelIds: [] };
  }
  return db[key];
}

function pidsFor(db, index, mfrNorm, driverId) {
  const fromCompose = [...(index.driverPids.get(`${mfrNorm}|${driverId}`) || [])];
  if (fromCompose.length) return sorted(fromCompose);
  return sorted([].concat(db.modelIds || []));
}

function main() {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const index = loadComposeIndex();
  const changes = [];

  // Known corrections + merge wrong OEM prefix variants
  for (const fix of KNOWN_CORRECTIONS) {
    const nm = norm(fix.mfr);
    if (fix.mergeInto) {
      const keep = fix.mergeInto;
      const drop = findKey(db, nm) || fix.mfr;
      if (drop !== keep && db[drop]) {
        const keepEntry = ensureEntry(db, keep);
        keepEntry.modelIds = sorted([...(keepEntry.modelIds || []), ...(db[drop].modelIds || []), ...fix.modelIds]);
        keepEntry.driverId = fix.driverId;
        keepEntry.source = 'sync-compose-known-merge';
        delete db[drop];
        changes.push({ action: 'merge_wrong_prefix', from: drop, to: keep, driverId: fix.driverId });
      }
    }
    const key = findKey(db, nm) || preferredMfrKey([fix.mfr]);
    const entry = ensureEntry(db, key);
    const before = { driverId: entry.driverId, modelIds: sorted(entry.modelIds) };
    entry.driverId = fix.driverId;
    entry.modelIds = sorted(fix.modelIds);
    entry.source = 'sync-compose-known';
    if (JSON.stringify(before) !== JSON.stringify({ driverId: entry.driverId, modelIds: entry.modelIds })) {
      changes.push({ action: 'known_correction', mfr: key, before, after: { driverId: entry.driverId, modelIds: entry.modelIds } });
    }
  }

  // Add missing compose mfrs (exclusive real driver only)
  for (const [nm, claimers] of index.byMfr) {
    const real = [...claimers].filter(isRealDriver);
    if (real.length !== 1) continue;
    const driverId = real[0];
    const existing = findKey(db, nm);
    if (existing) continue;
    const sampleMfr = [...index.driverPids.keys()].find((k) => k.startsWith(`${nm}|`));
    const key = preferredMfrKey([nm.toUpperCase(), nm]);
    const entry = ensureEntry(db, key);
    entry.driverId = driverId;
    entry.modelIds = pidsFor(entry, index, nm, driverId);
    entry.source = 'sync-compose-add';
    changes.push({ action: 'add_from_compose', mfr: key, driverId, modelIds: entry.modelIds });
  }

  // Align + prune existing entries
  for (const key of [...entryKeys(db)]) {
    const nm = norm(key);
    const entry = db[key];
    if (!entry || typeof entry !== 'object') continue;
    // WHY: multiCouple brands (HOBEIAN) use byPid → never collapse to one compose driver's productId list
    if (entry.multiCouple === true && entry.byPid && typeof entry.byPid === 'object') {
      continue;
    }
    const claimers = [...(index.byMfr.get(nm) || [])].filter(isRealDriver);
    let curated = entry.driverId;

    if (claimers.length === 1 && curated !== claimers[0]) {
      const before = curated;
      curated = claimers[0];
      entry.driverId = curated;
      entry.source = 'sync-compose-exclusive';
      changes.push({ action: 'fix_driverId', mfr: key, from: before, to: curated });
    }

    if (curated && claimers.includes(curated)) {
      const composePids = pidsFor(entry, index, nm, curated);
      if (composePids.length) {
        const before = sorted(entry.modelIds);
        if (before.length > composePids.length + 3 || before.some((p) => !composePids.includes(String(p).toUpperCase()))) {
          entry.modelIds = composePids;
          entry.pid = composePids[0];
          entry.modelIdsCount = composePids.length;
          entry.source = entry.source || 'sync-compose-prune';
          changes.push({ action: 'prune_modelIds', mfr: key, driverId: curated, before: before.length, after: composePids.length });
        }
      }
    }
  }

  // Case dedupe
  const byNorm = new Map();
  for (const key of entryKeys(db)) {
    const nm = norm(key);
    if (!byNorm.has(nm)) byNorm.set(nm, []);
    byNorm.get(nm).push(key);
  }
  for (const [, keys] of byNorm) {
    if (keys.length < 2) continue;
    // Prefer multiCouple brand key (HOBEIAN) over TitleCase preferredMfrKey score
    const multiKey = keys.find((k) => db[k]?.multiCouple === true);
    const keep = multiKey || preferredMfrKey(keys);
    const keepEntry = ensureEntry(db, keep);
    for (const k of keys) {
      if (k === keep) continue;
      const drop = db[k] || {};
      keepEntry.modelIds = sorted([...(keepEntry.modelIds || []), ...(drop.modelIds || [])]);
      if (!keepEntry.driverId && drop.driverId) keepEntry.driverId = drop.driverId;
      if (drop.multiCouple) keepEntry.multiCouple = true;
      if (drop.byPid && typeof drop.byPid === 'object') {
        keepEntry.byPid = { ...(keepEntry.byPid || {}), ...drop.byPid };
        keepEntry.modelIds = sorted(Object.keys(keepEntry.byPid));
        keepEntry.modelIdsCount = keepEntry.modelIds.length;
      }
      delete db[k];
      changes.push({ action: 'case_dedupe', from: k, to: keep });
    }
  }

  if (db._meta) {
    db._meta.lastSyncedFromCompose = new Date().toISOString();
    db._meta.syncComposeTool = 'sync-compose-to-mfs-db@P2368';
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'APPLY' : 'DRY-RUN',
    changeCount: changes.length,
    changes: changes.slice(0, 200),
  };

  const outPath = path.join(ROOT, 'reports', 'mfs-sync-compose-latest.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`sync-compose-to-mfs-db: ${changes.length} change(s) (${report.mode})`);
  const byAction = {};
  for (const c of changes) { byAction[c.action] = (byAction[c.action] || 0) + 1; }
  console.log('byAction:', byAction);

  if (APPLY && changes.length) {
    fs.writeFileSync(DB_PATH, `${JSON.stringify(db, null, 2)}\n`);
    console.log('Written:', DB_PATH);
  } else if (!APPLY && changes.length) {
    console.log('Dry-run — pass --apply to write');
  }

  return report;
}

function findKey(db, mfrNorm) {
  return entryKeys(db).find((k) => norm(k) === mfrNorm) || null;
}

if (require.main === module) {
  main();
}

module.exports = { main, loadComposeIndex, KNOWN_CORRECTIONS };
