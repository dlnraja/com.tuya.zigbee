'use strict';

/**
 * align-mfs-db-intelligent.js (P169)
 *
 * Intelligent alignment of data/mfs_db.json with the rest of the sacred-couple stack:
 *   1) user-misattribution-registry  (highest — community locks)
 *   2) exclusive compose claim       (one non-wide driver owns the mfr)
 *   3) exclusive sacred couple       (mfr+pid claimed by exactly one real driver)
 *   4) case-key canonicalization     (prefer _TZ* uppercase OEM form)
 *
 * Never invents fingerprints onto wide-claim / hybrid / generic drivers.
 * Ambiguous multi-driver mfrs are reported only (no auto-pick).
 *
 * Usage:
 *   node tools/ci/align-mfs-db-intelligent.js              # dry-run report
 *   node tools/ci/align-mfs-db-intelligent.js --apply      # write mfs_db.json
 *   node tools/ci/align-mfs-db-intelligent.js --check      # CI: fail on high-severity drift
 *   node tools/ci/align-mfs-db-intelligent.js --json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DB_PATH = path.join(ROOT, 'data', 'mfs_db.json');
const REG_PATH = path.join(ROOT, 'data', 'user-misattribution-registry.json');
const APPLY = process.argv.includes('--apply');
const CHECK = process.argv.includes('--check');
const JSON_MODE = process.argv.includes('--json');

const SYNTHETIC_RX = /_disabled|_dummy|_generic|_hybrid|_master|placeholder|needs_/i;
const META_KEYS = new Set(['_meta', 'sources', 'devices', 'sacredCouples', 'version']);

const WIDE_CLAIM_DRIVERS = new Set([
  'universal_zigbee',
  'generic_tuya',
  'generic_diy',
  'universal_fallback',
  'tuya_dummy_device',
  'device_generic_diy_universal',
  'device_generic_tuya',
  'gateway_zigbee_bridge',
  'hybrid_light_sensor',
  'usb_dongle_triple',
  'switch_usb_dongle',
]);

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function isRealDriver(id) {
  return id && !WIDE_CLAIM_DRIVERS.has(id) && !SYNTHETIC_RX.test(id);
}

function preferredMfrKey(variants) {
  // Prefer canonical Tuya form: _TZE200_xxx / _TZ3000_xxx (mixed case as OEM)
  const list = [...variants];
  list.sort((a, b) => {
    const score = (k) => {
      let s = 0;
      if (/^_TZ/i.test(k)) s += 10;
      if (/^_TZ[A-Z0-9]+_[a-z0-9]+$/.test(k)) s += 5; // classic OEM casing
      if (k === k.toUpperCase()) s -= 2;
      if (k === k.toLowerCase()) s -= 1;
      return s;
    };
    return score(b) - score(a) || a.length - b.length || a.localeCompare(b);
  });
  return list[0];
}

function loadComposeIndex() {
  const driversDir = path.join(ROOT, 'drivers');
  const byMfr = new Map(); // norm mfr -> Set(driverId)
  const byCouple = new Map(); // norm mfr|pid -> Set(driverId)
  const driverExists = new Set();
  const mfrCasings = new Map(); // norm -> Set(original casings from compose)

  for (const id of fs.readdirSync(driversDir)) {
    const p = path.join(driversDir, id, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    let j;
    try {
      j = JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
      continue;
    }
    driverExists.add(id);
    const mfrs = [].concat(j.zigbee?.manufacturerName || []);
    const pids = [].concat(j.zigbee?.productId || []);
    for (const m of mfrs) {
      if (SYNTHETIC_RX.test(m)) continue;
      const nm = norm(m);
      if (!byMfr.has(nm)) byMfr.set(nm, new Set());
      byMfr.get(nm).add(id);
      if (!mfrCasings.has(nm)) mfrCasings.set(nm, new Set());
      mfrCasings.get(nm).add(String(m));
      for (const pid of pids) {
        const key = `${nm}|${norm(pid)}`;
        if (!byCouple.has(key)) byCouple.set(key, new Set());
        byCouple.get(key).add(id);
      }
    }
  }
  return { byMfr, byCouple, driverExists, mfrCasings };
}

function loadDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REG_PATH, 'utf8'));
  } catch {
    return { cases: [] };
  }
}

function entryKeys(db) {
  return Object.keys(db).filter((k) => !META_KEYS.has(k) && db[k] && typeof db[k] === 'object');
}

function findDbKey(db, mfrNorm) {
  return entryKeys(db).find((k) => norm(k) === mfrNorm) || null;
}

function ensureEntry(db, key) {
  if (!db[key] || typeof db[key] !== 'object') {
    db[key] = { driverId: null, source: 'align-mfs-db-intelligent', modelIds: [] };
  }
  return db[key];
}

function stripMfrFromCompose(driverId, mfrNorm) {
  const p = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(p)) return 0;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const list = j.zigbee?.manufacturerName;
  if (!Array.isArray(list)) return 0;
  const next = list.filter((m) => norm(m) !== mfrNorm);
  const removed = list.length - next.length;
  if (!removed) return 0;
  if (next.length === 0) {
    const s = `_hybrid_${driverId}_needs_device_assignment`;
    j.zigbee.manufacturerName = [s, s.toUpperCase()];
  } else {
    j.zigbee.manufacturerName = next;
  }
  if (APPLY) fs.writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
  return removed;
}

function enforceRegistryCompose(registry, changes, highSeverity) {
  for (const c of registry.cases || []) {
    const forbidden = [].concat(c.forbiddenDrivers || []);
    const mfrs = [].concat(c.mfr || []);
    for (const m of mfrs) {
      const nm = norm(m);
      for (const bad of forbidden) {
        const n = stripMfrFromCompose(bad, nm);
        if (n) {
          changes.push({
            severity: 'high',
            action: 'registry_compose_strip',
            mfr: m,
            from: bad,
            to: c.canonicalDriver,
            removed: n,
            caseId: c.id,
          });
          highSeverity.push(`forbidden compose ${bad} still claims ${m}`);
        }
      }
    }
  }
}

function align(db, compose, registry) {
  const changes = [];
  const skipped = [];
  const highSeverity = [];

  // --- Priority 1: registry → mfs_db locks ---
  for (const c of registry.cases || []) {
    const canon = c.canonicalDriver;
    const pids = [].concat(c.productId || []).filter(Boolean);
    if (!canon || !compose.driverExists.has(canon)) {
      skipped.push({ reason: 'registry_driver_missing', caseId: c.id, canon });
      continue;
    }
    for (const m of [].concat(c.mfr || [])) {
      const nm = norm(m);
      if (!nm || SYNTHETIC_RX.test(m)) continue;
      let key = findDbKey(db, nm);
      if (!key) {
        key = preferredMfrKey([m, ...(compose.mfrCasings.get(nm) || [])]);
        ensureEntry(db, key);
        changes.push({
          severity: 'high',
          action: 'create_from_registry',
          mfr: key,
          driverId: canon,
          modelIds: pids,
          caseId: c.id,
        });
        highSeverity.push(`missing mfs entry for registry ${c.id}`);
      }
      const entry = ensureEntry(db, key);
      const before = { driverId: entry.driverId, modelIds: [...(entry.modelIds || [])] };
      let dirty = false;
      if (entry.driverId !== canon) {
        entry.driverId = canon;
        dirty = true;
      }
      if (pids.length) {
        const next = [...pids];
        if (JSON.stringify(entry.modelIds || []) !== JSON.stringify(next)) {
          entry.modelIds = next;
          dirty = true;
        }
      }
      entry.source = entry.source || 'user-misattribution-registry';
      if (!String(entry.source).includes('registry')) {
        entry.source = `registry:${c.id}`;
      }
      if (dirty) {
        changes.push({
          severity: 'high',
          action: 'registry_force',
          mfr: key,
          from: before,
          to: { driverId: entry.driverId, modelIds: entry.modelIds },
          caseId: c.id,
        });
        highSeverity.push(`registry drift ${key} → ${canon}`);
      }
    }
  }

  // --- Priority 2/3: compose exclusivity & couple exclusivity ---
  for (const key of entryKeys(db)) {
    if (SYNTHETIC_RX.test(key)) continue;
    const entry = db[key];
    if (!entry || typeof entry !== 'object') continue;
    const nm = norm(key);

    // Skip if registry already owns this mfr
    const regOwns = (registry.cases || []).some((c) =>
      [].concat(c.mfr || []).some((m) => norm(m) === nm));
    if (regOwns) continue;

    const claimers = [...(compose.byMfr.get(nm) || [])].filter(isRealDriver);
    const curated = entry.driverId;

    // Exclusive compose owner → align mfs
    if (claimers.length === 1) {
      const only = claimers[0];
      if (curated !== only) {
        const before = entry.driverId;
        entry.driverId = only;
        entry.source = 'compose-exclusive';
        // Prefer modelIds from exclusive driver's productIds intersecting known
        changes.push({
          severity: curated && compose.driverExists.has(curated) ? 'medium' : 'high',
          action: 'compose_exclusive',
          mfr: key,
          from: before,
          to: only,
        });
        if (!curated || !compose.driverExists.has(curated)) {
          highSeverity.push(`orphan/wrong curated ${key} → ${only}`);
        }
      }
      continue;
    }

    // Multi claimers: try exclusive couples from modelIds
    const modelIds = [].concat(entry.modelIds || []);
    if (modelIds.length && claimers.length > 1) {
      const coupleOwners = new Set();
      for (const pid of modelIds) {
        const owners = [...(compose.byCouple.get(`${nm}|${norm(pid)}`) || [])].filter(isRealDriver);
        for (const o of owners) coupleOwners.add(o);
      }
      if (coupleOwners.size === 1) {
        const only = [...coupleOwners][0];
        if (curated !== only) {
          const before = entry.driverId;
          entry.driverId = only;
          entry.source = 'couple-exclusive';
          changes.push({
            severity: 'high',
            action: 'couple_exclusive',
            mfr: key,
            from: before,
            to: only,
            modelIds,
          });
          highSeverity.push(`couple exclusive ${key} → ${only}`);
        }
        continue;
      }
    }

    // Curated driver missing from disk → try exclusive repair
    if (curated && !compose.driverExists.has(curated)) {
      if (claimers.length === 1) {
        entry.driverId = claimers[0];
        entry.source = 'compose-exclusive-orphan-repair';
        changes.push({
          severity: 'high',
          action: 'orphan_driver_repair',
          mfr: key,
          from: curated,
          to: claimers[0],
        });
        highSeverity.push(`orphan driverId ${curated} for ${key}`);
      } else {
        skipped.push({ reason: 'orphan_ambiguous', mfr: key, curated, claimers });
        highSeverity.push(`orphan ambiguous ${key}`);
      }
      continue;
    }

    // Pair conflict: curated doesn't claim any of its modelIds but another does
    if (curated && modelIds.length) {
      let curatedClaimsCouple = false;
      const foreign = new Set();
      for (const pid of modelIds) {
        const owners = [...(compose.byCouple.get(`${nm}|${norm(pid)}`) || [])].filter(isRealDriver);
        if (owners.includes(curated)) curatedClaimsCouple = true;
        for (const o of owners) {
          if (o !== curated) foreign.add(o);
        }
      }
      if (!curatedClaimsCouple && foreign.size === 1) {
        const only = [...foreign][0];
        const before = entry.driverId;
        entry.driverId = only;
        entry.source = 'pair-conflict-repair';
        changes.push({
          severity: 'high',
          action: 'pair_conflict_repair',
          mfr: key,
          from: before,
          to: only,
          modelIds,
        });
        highSeverity.push(`pair conflict ${key} → ${only}`);
      } else if (!curatedClaimsCouple && foreign.size > 1) {
        skipped.push({
          reason: 'pair_conflict_ambiguous',
          mfr: key,
          curated,
          foreign: [...foreign],
          modelIds,
        });
      }
    }

    // Unclaimed: curated does not list mfr at all, but exactly one other real driver does
    if (curated && claimers.length >= 1 && !claimers.includes(curated) && claimers.length === 1) {
      // already handled by exclusive above — keep for safety
    } else if (curated && (!compose.byMfr.get(nm) || !compose.byMfr.get(nm).has(curated))) {
      if (claimers.length === 0) {
        skipped.push({ reason: 'unclaimed_no_compose', mfr: key, curated });
      } else if (claimers.length > 1) {
        skipped.push({ reason: 'unclaimed_multi', mfr: key, curated, claimers });
      }
    }
  }

  // --- Case duplicate merge (keep preferred key, drop others) ---
  const byNorm = new Map();
  for (const key of entryKeys(db)) {
    const nm = norm(key);
    if (!byNorm.has(nm)) byNorm.set(nm, []);
    byNorm.get(nm).push(key);
  }
  for (const [, keys] of byNorm) {
    if (keys.length < 2) continue;
    const keep = preferredMfrKey(keys);
    const keepEntry = ensureEntry(db, keep);
    for (const k of keys) {
      if (k === keep) continue;
      const other = db[k];
      // merge modelIds
      const merged = new Set([...(keepEntry.modelIds || []), ...(other.modelIds || [])]);
      keepEntry.modelIds = [...merged];
      if (!keepEntry.driverId && other.driverId) keepEntry.driverId = other.driverId;
      delete db[k];
      changes.push({
        severity: 'medium',
        action: 'case_dedupe',
        drop: k,
        keep,
      });
    }
  }

  // Touch meta
  if (!db._meta || typeof db._meta !== 'object') db._meta = {};
  db._meta.lastAlignedAt = new Date().toISOString();
  db._meta.alignTool = 'align-mfs-db-intelligent@P169';

  return { changes, skipped, highSeverity };
}

function main() {
  const db = loadDb();
  let compose = loadComposeIndex();
  const registry = loadRegistry();

  // First pass: registry may mutate compose when APPLY
  const preChanges = [];
  const preHigh = [];
  enforceRegistryCompose(registry, preChanges, preHigh);
  if (APPLY && preChanges.some((c) => c.action === 'registry_compose_strip')) {
    compose = loadComposeIndex();
  }

  const { changes, skipped, highSeverity } = align(db, compose, registry);
  // merge pre compose strips (align also runs enforce — dedupe by signature)
  const seen = new Set(changes.map((c) => `${c.action}|${c.mfr}|${c.from}`));
  for (const c of preChanges) {
    const sig = `${c.action}|${c.mfr}|${c.from}`;
    if (!seen.has(sig)) changes.unshift(c);
  }
  for (const h of preHigh) {
    if (!highSeverity.includes(h)) highSeverity.push(h);
  }

  const summary = {
    timestamp: new Date().toISOString(),
    gate: 'align-mfs-db-intelligent',
    apply: APPLY,
    check: CHECK,
    changeCount: changes.length,
    skippedCount: skipped.length,
    highSeverityCount: highSeverity.length,
    byAction: changes.reduce((acc, c) => {
      acc[c.action] = (acc[c.action] || 0) + 1;
      return acc;
    }, {}),
    changes: changes.slice(0, 200),
    skipped: skipped.slice(0, 80),
    highSeverity: highSeverity.slice(0, 50),
  };

  if (APPLY && changes.length) {
    fs.writeFileSync(DB_PATH, `${JSON.stringify(db, null, 2)}\n`);
  }

  const outDir = path.join(ROOT, 'reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'P169_MFS_DB_ALIGN_LATEST.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  );

  if (JSON_MODE) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`align-mfs-db-intelligent: changes=${summary.changeCount} skipped=${summary.skippedCount} high=${summary.highSeverityCount} (${APPLY ? 'APPLIED' : 'dry-run'})`);
    console.log('byAction:', JSON.stringify(summary.byAction));
    for (const c of changes.slice(0, 40)) {
      console.log(`  [${c.severity}] ${c.action} ${c.mfr || c.drop || ''} ${c.from ? `${c.from}→` : ''}${c.to || c.keep || c.driverId || ''}`);
    }
    if (changes.length > 40) console.log(`  ... +${changes.length - 40} more`);
    if (skipped.length) {
      console.log(`skipped (ambiguous/report-only): ${skipped.length}`);
      for (const s of skipped.slice(0, 15)) {
        console.log(`  ${s.reason} ${s.mfr || s.caseId || ''} ${s.curated || ''} ${(s.claimers || s.foreign || []).slice?.(0, 5)?.join?.(',') || ''}`);
      }
    }
  }

  if (CHECK && highSeverity.length > 0 && !APPLY) {
    console.error(`CHECK FAIL: ${highSeverity.length} high-severity mfs_db drift(s) — run with --apply`);
    process.exit(1);
  }
  process.exit(0);
}

main();
