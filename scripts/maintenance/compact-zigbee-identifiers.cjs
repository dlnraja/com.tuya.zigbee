#!/usr/bin/env node
'use strict';

/**
 * Publish-only Zigbee identifier compactor (evidence-prioritized).
 *
 * Athom expands manufacturerName x productId for each Zigbee driver while
 * processing a build. Broad catch-all drivers can create tens of thousands of
 * combinations and inflate the upload payload. Keep source manifests complete,
 * but cap the generated publish manifest.
 *
 * When data/mfs_db.json (observed real-world devices) is available, compaction
 * is prioritized instead of order-blind:
 *   1. productIds are first reduced to the ones actually observed with the
 *      driver's manufacturers in mfs_db (never emptied);
 *   2. manufacturers are kept by priority: (a) observed in mfs_db, sorted by
 *      confidence desc, then (b) speculative ones in original order;
 *   3. an observed manufacturer is never dropped while a speculative one is
 *      kept — observed are only cut when the budget cannot hold them all;
 *   4. drivers whose manufacturers are all synthetic (or missing) are rescued
 *      with real manufacturers pointing at them in mfs_db (driverHint /
 *      driverMapping / top-level driverId) instead of being dropped.
 *
 * Without mfs_db.json the legacy order-based truncation applies unchanged.
 */

const fs = require('fs');
const path = require('path');
const caseEvidence = require('./case-variant-evidence.cjs');
const wireEq = require('./build-wire-equivalents.cjs');

// Legacy budgets (no mfs_db available): historical behavior.
const DEFAULT_MAX_DRIVER_COMBOS = 350;
const DEFAULT_MAX_TOTAL_COMBOS = 17000;
// Prioritized budgets (mfs_db available).
// WHY(P2252): Athom expands manufacturerName[] × productId[] using RAW array
// lengths (every CASE form counts). Unique-lowercase under-counting let
// publish think ~28k while Athom saw 100k+ → processor socket hang up /
// processing_failed (#2977 on 9.0.646). Keep raw totals Athom-safe.
const PRIORITIZED_MAX_DRIVER_COMBOS = 1500;
const PRIORITIZED_MAX_TOTAL_COMBOS = 17000;
// Above this per-driver combo count (and only when mfs_db is available),
// productIds are reduced to the ones actually observed with the driver's
// manufacturers — this shrinks the cross-product without losing any real pair.
const DEFAULT_PID_REDUCE_OVER = 350;
// Max CASE string forms kept per unique manufacturer (Homey matching is
// often case-sensitive). 2 = canonical + lowercase covers HOBEIAN/hobeian.
const DEFAULT_MAX_CASE_FORMS = 2;
const SYNTHETIC_MANUFACTURER_RE = /unknown|dummy|placeholder|needs_device_assignment|needs_exact_fingerprint|migrated_to|^_generic_|^_GENERIC_|^_hybrid_|^_HYBRID_|^_master_|^_MASTER_|^_disabled_|^_DISABLED_/;
const MFS_DB_META_KEYS = new Set(['_meta', 'sources', 'devices', 'driverMapping', 'stats', 'diff']);

/** WHY(P2286): pin verified (mfr,pid,driver) so Athom budget cuts never drop sacred couples. */
function loadSacredKeepCouples(repoRoot) {
  const candidates = [
    path.join(repoRoot, 'config', 'architecture', 'publish-sacred-keep-couples.json'),
    path.join(__dirname, '..', '..', 'config', 'architecture', 'publish-sacred-keep-couples.json'),
  ];
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      const list = Array.isArray(raw.couples) ? raw.couples : [];
      // WHY(P2348): Homey pairing is case-SENSITIVE. Keep pin.mfr EXACT as in
      // publish-sacred-keep-couples.json (e.g. _TZE204_5slehgeo). Lowercasing
      // here made compact inject _tze204_* while the device reports mixed case
      // → Unknown Device (Salvagr #533 diag 724d4bc9). Group compares still use
      // String(pin.mfr).toLowerCase() at call sites.
      return list
        .filter((c) => c && c.mfr && (c.pid || c.productId || c.modelId) && c.driverId)
        .map((c) => ({
          mfr: String(c.mfr),
          // WHY(P2495/P2496): Homey productId === Zigbee modelId === internal pid
          pid: String(c.pid || c.productId || c.modelId),
          driverId: String(c.driverId),
        }));
    } catch {
      /* try next */
    }
  }
  return [];
}

// WHY(P3024b): baseline pins add ~14k entries; index per driver instead of a
// full filter on every pass2 iteration (pass2 can loop thousands of times).
const PIN_INDEX = new WeakMap();
function sacredPinsForDriver(sacredAll, driverId) {
  let index = PIN_INDEX.get(sacredAll);
  if (!index) {
    index = new Map();
    for (const c of sacredAll) {
      if (!index.has(c.driverId)) index.set(c.driverId, []);
      index.get(c.driverId).push(c);
    }
    PIN_INDEX.set(sacredAll, index);
  }
  return index.get(driverId) || [];
}

/**
 * WHY(P3024b): the 14000 combo budget silently cut 261 couples (192 mfrs, e.g.
 * device_radiator_valve, smart_garden_irrigation_control) that the last Athom
 * Test package (9.0.1574) paired. Budget cuts must never remove a couple users
 * could already pair. test/fixtures/athom-last-test-package-couples.json holds
 * that package's exact couples (per driver m x p, exact case).
 */
function defaultBaselinePath(repoRoot) {
  return path.join(repoRoot, 'test', 'fixtures', 'athom-last-test-package-couples.json');
}

function loadPublishBaseline(repoRoot, file) {
  const target = file || process.env.HOMEY_PUBLISH_BASELINE_PATH || defaultBaselinePath(repoRoot);
  try {
    if (!fs.existsSync(target)) return null;
    const raw = JSON.parse(fs.readFileSync(target, 'utf8'));
    return raw && raw.drivers ? raw : null;
  } catch {
    return null;
  }
}

/** Every exact couple of the baseline as [{mfr, pid, driverId}]. */
function baselineCouples(baseline) {
  const out = [];
  for (const [driverId, entry] of Object.entries((baseline && baseline.drivers) || {})) {
    for (const mfr of (entry && entry.m) || []) {
      for (const pid of (entry && entry.p) || []) {
        out.push({ mfr: String(mfr), pid: String(pid), driverId });
      }
    }
  }
  return out;
}

/**
 * Resolve baseline couples against the PRE-compact manifest (exact strings).
 * Same driver first; if the couple moved (one couple, one driver), pin it on
 * the driver(s) that own it now. A couple no driver carries any more is
 * "unresolved" unless listed in baseline.exemptions [{mfr,pid,driverId,reason}].
 */
function resolveBaselinePins(manifest, baseline) {
  const couples = baselineCouples(baseline);
  const byId = new Map();
  const owners = new Map(); // "mfr\u0000pid" -> [driverId]
  for (const d of manifest.drivers || []) {
    if (!d || !d.zigbee) continue;
    const m = new Set((d.zigbee.manufacturerName || []).map(String));
    const p = new Set((d.zigbee.productId || []).map(String));
    byId.set(d.id, { m, p });
  }
  const ownersOf = (mfr, pid) => {
    const k = `${mfr}\u0000${pid}`;
    if (!owners.has(k)) {
      const list = [];
      for (const [id, s] of byId) if (s.m.has(mfr) && s.p.has(pid)) list.push(id);
      owners.set(k, list);
    }
    return owners.get(k);
  };
  const exempt = new Set(((baseline && baseline.exemptions) || [])
    .filter((e) => e && e.mfr && e.pid && e.reason)
    .map((e) => `${e.mfr}\u0000${e.pid}\u0000${e.driverId || '*'}`));
  const pins = [];
  const unresolved = [];
  const seen = new Set();
  let moved = 0;
  let restored = 0;
  const push = (pin) => {
    const k = `${pin.mfr}\u0000${pin.pid}\u0000${pin.driverId}`;
    if (seen.has(k)) return;
    seen.add(k);
    pins.push(pin);
  };
  const pinnedSets = new Map(); // driverId -> { m:Set, p:Set } of pins chosen so far
  const addPinned = (pin) => {
    if (!pinnedSets.has(pin.driverId)) pinnedSets.set(pin.driverId, { m: new Set(), p: new Set() });
    const ps = pinnedSets.get(pin.driverId);
    ps.m.add(pin.mfr);
    ps.p.add(pin.pid);
  };
  const later = [];
  for (const c of couples) {
    const s = byId.get(c.driverId);
    if (s && s.m.has(c.mfr) && s.p.has(c.pid)) {
      push(c);
      addPinned(c);
      continue;
    }
    later.push(c);
  }
  for (const c of later) {
    const now = ownersOf(c.mfr, c.pid);
    if (now.length > 0) {
      moved += 1;
      // One couple, one driver: pin on ONE current owner. WHY(P3024b): pick the owner
      // whose pinned cartesian grows least (a pid pinned on universal_zigbee's 94 mfrs
      // cost +282 combos); ties keep manifest order.
      let best = now[0];
      let bestCost = Infinity;
      for (const id of now) {
        const ps = pinnedSets.get(id) || { m: new Set(), p: new Set() };
        const newM = !ps.m.has(c.mfr);
        const newP = !ps.p.has(c.pid);
        const cost = (newM ? Math.max(1, ps.p.size) : 0) + (newP ? Math.max(1, ps.m.size) : 0)
          + (newM && newP ? 1 : 0);
        if (cost < bestCost) {
          bestCost = cost;
          best = id;
        }
      }
      const pin = { mfr: c.mfr, pid: c.pid, driverId: best };
      push(pin);
      addPinned(pin);
      continue;
    }
    if (exempt.has(`${c.mfr}\u0000${c.pid}\u0000${c.driverId}`) || exempt.has(`${c.mfr}\u0000${c.pid}\u0000*`)) continue;
    if (byId.has(c.driverId)) {
      // WHY(P3024b): no driver owns this couple any more (a later source curation or an
      // mfs_db rescue that did not re-run). Nothing else can claim it, so re-pin it on the
      // driver that shipped it: devices keep pairing exactly as in the Test package.
      restored += 1;
      push(c);
      addPinned(c);
      continue;
    }
    unresolved.push(`${c.mfr}+${c.pid} @ ${c.driverId}`);
  }
  return { pins, unresolved, moved, restored, total: couples.length };
}

function assertSacredCouplesPresent(manifest, sacredAll) {
  const missing = [];
  const byId = new Map((manifest.drivers || []).map((d) => [d.id, d]));
  for (const c of sacredAll) {
    const d = byId.get(c.driverId);
    if (!d || !d.zigbee) {
      missing.push(`${c.mfr}+${c.pid} → ${c.driverId} (driver missing in publish)`);
      continue;
    }
    const mfrsExact = (d.zigbee.manufacturerName || []).map(String);
    const mfrsLc = mfrsExact.map((m) => m.toLowerCase());
    const pids = (d.zigbee.productId || []).map(String);
    const pinMfr = String(c.mfr);
    // Prefer exact device-case match (Homey pairing); fall back to CI-only lc.
    const hasMfrExact = mfrsExact.includes(pinMfr);
    const hasMfrLc = mfrsLc.includes(pinMfr.toLowerCase());
    const hasPid = pids.some((p) => p.toUpperCase() === String(c.pid).toUpperCase());
    if (!hasMfrExact || !hasPid) {
      missing.push(
        `${pinMfr}+${c.pid} → ${c.driverId}`
        + ` (mfrExact=${hasMfrExact} mfrLc=${hasMfrLc} pid=${hasPid})`,
      );
    }
  }
  return missing;
}

/** Manufacturer grouping key: case- and padding-insensitive (P2941). */
function mfrKey(value) {
  return String(value).trim().toLowerCase();
}

function uniqStrings(values) {
  const out = [];
  const seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    if (typeof value !== 'string') continue;
    // WHY(P2941, GH#570): keep the exact wire string. Some brands report a
    // padded Basic manufacturerName (AOYAN AY-303Z/AY-302Z: "AOYAN  ", Z2M
    // hobeian.ts whiteLabel fingerprint). Homey matches it byte-exact, so trimming
    // here dropped the padded form from the publish manifest -> "Unknown device".
    if (!value.trim() || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

// WHY(P3027): caseless (driver, mfr, pid) keys of a manifest, for the no-loss guard.
function caselessCoupleSet(manifest) {
  const out = new Set();
  for (const d of (manifest && manifest.drivers) || []) {
    const z = d && d.zigbee;
    if (!z) continue;
    for (const m of z.manufacturerName || []) {
      for (const p of z.productId || []) {
        out.add(`${d.id}\u0000${mfrKey(m)}\u0000${String(p).trim().toUpperCase()}`);
      }
    }
  }
  return out;
}

function comboCount(driver) {
  const zigbee = driver && driver.zigbee;
  if (!zigbee) return 0;
  const manufacturers = uniqStrings(zigbee.manufacturerName);
  const products = uniqStrings(zigbee.productId);
  // WHY(P2252): Athom cartesian uses raw list lengths — do not unique-case here.
  return manufacturers.length * products.length;
}

/**
 * Cap CASE variants per unique manufacturer key.
 * Prefer original first occurrence, then lowercase, then uppercase.
 */
function limitCaseForms(manufacturers, maxForms = DEFAULT_MAX_CASE_FORMS, legacyOrder = false) {
  const limit = Math.max(1, Number(maxForms) || DEFAULT_MAX_CASE_FORMS);
  const groups = new Map();
  for (const value of manufacturers || []) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const k = mfrKey(value);
    if (!groups.has(k)) groups.set(k, []);
    const list = groups.get(k);
    if (!list.includes(value)) list.push(value);
  }
  const out = [];
  for (const [, variants] of groups) {
    const preferred = [];
    const lower = variants.find((v) => v === v.toLowerCase());
    const upper = variants.find((v) => v === v.toUpperCase());
    const first = variants[0];
    // WHY(P2671): brand interviews (HOBEIAN) report UPPERCASE — prefer upper then lower.
    const brandish = upper && lower && !String(first).startsWith('_');
    // WHY(P3027): the Tuya wire shape (_TZ3000_abcd) is the only spelling devices
    // send; keep it first so the case cap never leaves only _tz3000_/_TZ3000_ABCD.
    const wire = legacyOrder ? [] : variants.filter((v) => caseEvidence.isWireShapedMfr(v));
    const order = brandish
      ? [upper, lower, first, ...variants]
      : [...wire, first, lower, upper, ...variants];
    for (const v of order) {
      if (!v || preferred.includes(v)) continue;
      preferred.push(v);
      if (preferred.length >= limit) break;
    }
    // P2941: padded wire forms are extra exact strings, never cut by the case cap.
    for (const v of variants) {
      if (v !== v.trim() && !preferred.includes(v)) preferred.push(v);
    }
    out.push(...preferred);
  }
  return out;
}

function isSyntheticManufacturer(value) {
  return typeof value === 'string' && SYNTHETIC_MANUFACTURER_RE.test(value);
}

function defaultMfsDbPath() {
  return path.join(__dirname, '..', '..', 'data', 'mfs_db.json');
}

/**
 * Load and index data/mfs_db.json. Returns null (with a warning) when the
 * file is missing or unreadable — callers then fall back to legacy behavior.
 * Index shape: {
 *   byMfr: Map<lowerMfr, { manufacturerId, modelIds, confidence }>,
 *   byDriver: Map<driverId, Set<lowerMfr>>,
 * }
 */
function loadMfsDatabase(dbPath) {
  const file = dbPath || process.env.HOMEY_MFS_DB_PATH || defaultMfsDbPath();
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.warn(`[compact] mfs_db unavailable at ${file} (${e.code || e.message}) — falling back to order-based truncation`);
    return null;
  }
  return indexMfsDatabase(raw, file);
}

function indexMfsDatabase(raw, file) {
  const byMfr = new Map();
  const byDriver = new Map();
  const addDriverLink = (driverId, lowerMfr) => {
    if (!driverId) return;
    let set = byDriver.get(driverId);
    if (!set) {
      set = new Set();
      byDriver.set(driverId, set);
    }
    set.add(lowerMfr);
  };

  // Primary source: devices object (carries confidence + driverHint).
  for (const [key, info] of Object.entries(raw.devices || {})) {
    if (!info || typeof info !== 'object') continue;
    const lower = String(info.manufacturerId || key).toLowerCase();
    byMfr.set(lower, {
      manufacturerId: info.manufacturerId || key,
      modelIds: uniqStrings(info.modelIds),
      confidence: typeof info.confidence === 'number' ? info.confidence : 0,
    });
    addDriverLink(info.driverHint, lower);
  }

  // Secondary source: driverMapping { driverId: { manufacturerIds: [] } }.
  for (const [driverId, mapping] of Object.entries(raw.driverMapping || {})) {
    for (const mfr of uniqStrings(mapping && mapping.manufacturerIds)) {
      addDriverLink(driverId, mfr.toLowerCase());
    }
  }

  // Tertiary source: top-level mfr keys ({ driverId, modelIds, source }).
  for (const [key, info] of Object.entries(raw)) {
    if (MFS_DB_META_KEYS.has(key) || !info || typeof info !== 'object') continue;
    const lower = key.toLowerCase();
    if (!byMfr.has(lower)) {
      byMfr.set(lower, {
        manufacturerId: key,
        modelIds: uniqStrings(info.modelIds),
        confidence: 0,
      });
    }
    addDriverLink(info.driverId, lower);
  }

  return { byMfr, byDriver, path: file };
}

/**
 * Real manufacturers pointing at a driver in mfs_db, best first.
 */
function rescueCandidates(db, driverId) {
  const linked = db.byDriver.get(driverId);
  if (!linked || linked.size === 0) return [];
  const out = [];
  for (const lower of linked) {
    const info = db.byMfr.get(lower);
    if (!info) continue; // linked via driverMapping but unknown device entry
    if (isSyntheticManufacturer(info.manufacturerId)) continue;
    out.push(info);
  }
  out.sort((a, b) => b.confidence - a.confidence);
  return out;
}

function compactZigbeeIdentifiers(manifest, opts = {}) {
  let db;
  if (Object.prototype.hasOwnProperty.call(opts, 'mfsDb')) {
    // Accept either an indexed db ({ byMfr, byDriver }) or raw mfs_db JSON.
    db = opts.mfsDb && !(opts.mfsDb.byMfr instanceof Map)
      ? indexMfsDatabase(opts.mfsDb)
      : opts.mfsDb;
  } else {
    db = loadMfsDatabase(opts.mfsDbPath);
  }
  const hasDb = !!(db && db.byMfr && db.byMfr.size > 0);
  const maxDriverCombos = Number(
    opts.maxDriverCombos
    || process.env.HOMEY_ZIGBEE_MAX_DRIVER_COMBOS
    || (hasDb ? PRIORITIZED_MAX_DRIVER_COMBOS : DEFAULT_MAX_DRIVER_COMBOS),
  );
  const maxTotalCombos = Number(
    opts.maxTotalCombos
    || process.env.HOMEY_ZIGBEE_MAX_TOTAL_COMBOS
    || (hasDb ? PRIORITIZED_MAX_TOTAL_COMBOS : DEFAULT_MAX_TOTAL_COMBOS),
  );
  const pruneSynthetic = opts.pruneSynthetic !== false && process.env.HOMEY_ZIGBEE_PRUNE_SYNTHETIC !== '0';
  const pidReduceOver = hasDb
    ? Number(
      opts.pidReduceOver !== undefined
        ? opts.pidReduceOver
        : (process.env.HOMEY_ZIGBEE_PID_REDUCE_OVER !== undefined
          ? process.env.HOMEY_ZIGBEE_PID_REDUCE_OVER
          : DEFAULT_PID_REDUCE_OVER),
    )
    : Infinity;
  const verbose = opts.verbose === true || process.env.COMPACT_VERBOSE === '1';
  const maxCaseForms = Number(
    opts.maxCaseForms
    || process.env.HOMEY_ZIGBEE_MAX_CASE_FORMS
    || DEFAULT_MAX_CASE_FORMS,
  );

  const repoRoot = opts.repoRoot || path.join(__dirname, '..', '..');
  const sacredOnly = Array.isArray(opts.sacredKeep)
    ? opts.sacredKeep
    : loadSacredKeepCouples(repoRoot);
  // WHY(P3024b): pin every couple of the last Athom Test package (see loadPublishBaseline).
  // WHY(P3024b): the auto-loaded baseline only applies to the real app manifest, so unit
  // tests with synthetic manifests (same driver ids) never get real couples injected.
  const autoBaseline = Object.prototype.hasOwnProperty.call(opts, 'baseline')
    ? null
    : loadPublishBaseline(repoRoot, opts.baselinePath);
  const rawBaseline = Object.prototype.hasOwnProperty.call(opts, 'baseline')
    ? opts.baseline
    : (autoBaseline && (!autoBaseline.appId || autoBaseline.appId === manifest.id) ? autoBaseline : null);
  // WHY(P3027b): opt-in (HOMEY_ZIGBEE_PIN_WIRE_EQUIVALENT=1, default off). A pinned
  // minted case form (_tz3000_x / ts0601) is pinned through its wire spelling,
  // recorded in baseline.wireEquivalents (only spellings already in the driver).
  // The fixture itself is not changed; the gate accepts the same equivalence.
  const pinWireEquivalent = wireEq.wireEquivalentEnabled(opts);
  const baseline = pinWireEquivalent && rawBaseline
    ? wireEq.applyWireEquivalents(rawBaseline)
    : rawBaseline;
  const baselineResolved = baseline
    ? resolveBaselinePins(manifest, baseline)
    : { pins: [], unresolved: [], moved: 0, total: 0 };
  const sacredAll = baselineResolved.pins.length > 0
    ? [...sacredOnly, ...baselineResolved.pins]
    : sacredOnly;
  const sacredMissing = [];
  // WHY(P3027): Tuya case forms no device sends (all-lower _tz3000_x, all-upper
  // _TZ3000_X, ts0601) are dropped from the publish manifest when the wire-shaped
  // sibling is present. Exact pins and evidence outliers are never dropped.
  const dropNeverEmitted = opts.dropNeverEmitted !== undefined
    ? opts.dropNeverEmitted !== false
    : process.env.HOMEY_ZIGBEE_DROP_NEVER_EMITTED !== '0';
  const neverEmittedKeep = new Set(opts.wireEvidence
    ? [...opts.wireEvidence]
    : caseEvidence.loadWireEvidence(repoRoot));
  for (const c of sacredAll) {
    neverEmittedKeep.add(String(c.mfr));
    neverEmittedKeep.add(String(c.pid));
  }
  for (const c of baselineCouples(baseline)) {
    neverEmittedKeep.add(c.mfr);
    neverEmittedKeep.add(c.pid);
  }
  for (const e of (baseline && baseline.exemptions) || []) {
    if (e && e.mfr) neverEmittedKeep.add(String(e.mfr));
    if (e && e.pid) neverEmittedKeep.add(String(e.pid));
  }
  let neverEmittedDropped = 0;
  // WHY(P3027): internal switch that reproduces the pre-P3027 case order, used
  // only by the no-loss guard below to know what the old compactor shipped.
  const legacyCaseOrder = opts.legacyCaseOrder === true;
  // WHY(P3027): the omission must never cost a published couple. Run the old
  // logic on a copy first; every caseless (driver, mfr, pid) it keeps is
  // protected from the budget cuts below, and if the new result still misses
  // one (or breaks the cap) the old result is shipped unchanged.
  let legacyGuard = null;
  if (dropNeverEmitted && opts.noLossGuard !== false && !opts._legacyRun) {
    const legacyManifest = JSON.parse(JSON.stringify(manifest));
    const legacyResult = compactZigbeeIdentifiers(legacyManifest, {
      ...opts,
      dropNeverEmitted: false,
      pinWireEquivalent: false,
      legacyCaseOrder: true,
      _legacyRun: true,
      verbose: false,
    });
    legacyGuard = {
      manifest: legacyManifest,
      result: legacyResult,
      keep: caselessCoupleSet(legacyManifest),
    };
  }
  const isProtected = (driverId, mfr, pid) => !!legacyGuard
    && legacyGuard.keep.has(`${driverId}\u0000${mfrKey(mfr)}\u0000${String(pid).trim().toUpperCase()}`);

  const changes = [];
  const prunedDrivers = [];
  const rescuedDrivers = [];
  const observedDropped = [];
  const logLines = [];
  let beforeTotal = 0;
  let afterTotal = 0;
  let filteredSyntheticManufacturers = 0;
  let observedBefore = 0;
  let observedKept = 0;
  let sacredPinned = 0;

  const nextDrivers = [];

  for (const driver of manifest.drivers || []) {
    if (!driver.zigbee) {
      nextDrivers.push(driver);
      continue;
    }

    let manufacturers = uniqStrings(driver.zigbee.manufacturerName);
    let products = uniqStrings(driver.zigbee.productId);
    const before = manufacturers.length * products.length;
    beforeTotal += before;

    const sacredPins = sacredPinsForDriver(sacredAll, driver.id);
    // WHY(P2340): SSOT pins must survive even when a prior compact pass already
    // dropped the mfr from app.json (clrdrnya / HOBEIAN on presence_sensor_radar).
    const sacredMfrKeys = new Set(sacredPins.map((c) => mfrKey(c.mfr)));
    const sacredPids = new Set(sacredPins.map((c) => String(c.pid).toUpperCase()));
    const sacredRequired = sacredPins;

    if (pruneSynthetic) {
      const realManufacturers = manufacturers.filter(value => !isSyntheticManufacturer(value));
      const syntheticCount = manufacturers.length - realManufacturers.length;
      filteredSyntheticManufacturers += syntheticCount;

      if (realManufacturers.length === 0) {
        // All manufacturers synthetic (or none): before dropping the driver,
        // re-attach real manufacturers that mfs_db maps to it.
        const rescue = hasDb ? rescueCandidates(db, driver.id) : [];
        if (rescue.length > 0) {
          manufacturers = rescue.map(info => info.manufacturerId);
          if (products.length === 0) {
            products = uniqStrings(rescue.flatMap(info => info.modelIds));
          }
          if (products.length === 0) {
            prunedDrivers.push({
              id: driver.id,
              manufacturers: rescue.length,
              products: 0,
              reason: 'missing-product',
              rescue: 'no-observed-product-id',
            });
            logLines.push(`[compact] pruned ${driver.id}: missing-product (rescued ${rescue.length} mfr(s) but no observed productId)`);
            continue;
          }
          rescuedDrivers.push({ id: driver.id, manufacturers: manufacturers.length });
        } else {
          const reason = manufacturers.length === 0 ? 'missing-manufacturer' : 'synthetic-manufacturer';
          prunedDrivers.push({
            id: driver.id,
            manufacturers: manufacturers.length,
            products: products.length,
            reason,
            rescue: hasDb ? 'no-mfs-db-match' : 'no-mfs-db',
          });
          logLines.push(`[compact] pruned ${driver.id}: ${reason} (${hasDb ? 'no mfs_db match' : 'mfs_db unavailable'}), mfr=${manufacturers.length}, product=${products.length}`);
          continue;
        }
      } else if (syntheticCount > 0) {
        manufacturers = realManufacturers;
      }
    }

    if (dropNeverEmitted) {
      const m = caseEvidence.dropNeverEmittedCaseForms(manufacturers, 'mfr', neverEmittedKeep);
      const p = caseEvidence.dropNeverEmittedCaseForms(products, 'pid', neverEmittedKeep);
      if (m.dropped.length || p.dropped.length) {
        manufacturers = m.kept;
        products = p.kept;
        neverEmittedDropped += m.dropped.length + p.dropped.length;
        if (verbose) {
          logLines.push(`[compact]   ${driver.id}: never-emitted case forms omitted: ${[...m.dropped, ...p.dropped].join(', ')}`);
        }
      }
    }

    // Classify manufacturers by evidence.
    // v9.0.373: case-variant groups — both cases of the same fingerprint are
    // the SAME device: they count once for budget purposes and are never
    // split (drop or keep all variants of a group together).
    const variantGroups = new Map(); // lowercaseKey -> [variants in original order]
    for (const v of manufacturers) {
      const k = mfrKey(v);
      if (!variantGroups.has(k)) {variantGroups.set(k, []);}
      variantGroups.get(k).push(v);
    }

    let observed = [];
    let speculative = manufacturers;
    let observedKeys = [];
    let speculativeKeys = [];
    if (hasDb) {
      observed = manufacturers
        .filter(value => db.byMfr.has(mfrKey(value)))
        .sort((a, b) => db.byMfr.get(mfrKey(b)).confidence - db.byMfr.get(mfrKey(a)).confidence);
      speculative = manufacturers.filter(value => !db.byMfr.has(mfrKey(value)));
      observedKeys = [...variantGroups.keys()]
        .filter(k => db.byMfr.has(k))
        .sort((a, b) => db.byMfr.get(b).confidence - db.byMfr.get(a).confidence);
      speculativeKeys = [...variantGroups.keys()].filter(k => !db.byMfr.has(k));
    }
    observedBefore += observed.length;

    // 1) Reduce productIds to the ones actually observed with the driver's
    //    manufacturers in mfs_db. Applies above a low threshold so that broad
    //    drivers stop inflating the total combination count; the productId
    //    list is never emptied (fallback: original list).
    let nextProducts = products;
    if (hasDb && observed.length > 0 && products.length > 0
        && variantGroups.size * products.length > pidReduceOver) {
      const observedPidSet = new Set();
      for (const mfr of observed) {
        for (const pid of db.byMfr.get(mfrKey(mfr)).modelIds) {
          if (products.includes(pid)) observedPidSet.add(pid);
        }
      }
      if (observedPidSet.size > 0) {
        nextProducts = products.filter(pid => observedPidSet.has(pid));
      }
    }
    // WHY(P2286): re-inject sacred pids after mfs reduce so TS0041 etc. never vanish.
    if (sacredPids.size > 0) {
      const pinned = products.filter((pid) => sacredPids.has(String(pid).toUpperCase()));
      if (pinned.length > 0) {
        nextProducts = uniqStrings([...pinned, ...nextProducts]);
        sacredPinned += pinned.length;
      }
    }

    // Budget: DEVICE count (case-variant groups) × pids — case variants are free
    // for GROUP selection, but Athom RAW cartesian is applied after emit.
    const candidate = variantGroups.size * nextProducts.length;
    if (candidate > maxDriverCombos && manufacturers.length > 0 && nextProducts.length > 0) {
      let nextManufacturers;

      if (hasDb) {
        if (nextProducts.length > maxDriverCombos) {
          // Pathological: pids alone exceed the budget.
          nextManufacturers = (observed.length > 0 ? observed : speculative).slice(0, 1);
          nextProducts = nextProducts.slice(0, maxDriverCombos);
          const pinned = products.filter((pid) => sacredPids.has(String(pid).toUpperCase()));
          if (pinned.length > 0) {
            nextProducts = uniqStrings([...pinned, ...nextProducts]).slice(0, maxDriverCombos);
          }
        } else {
          // Truncate by DEVICE GROUP: sacred first, then observed, then speculative.
          const groupLimit = Math.max(1, Math.floor(maxDriverCombos / nextProducts.length));
          const sacredKeys = observedKeys.filter((k) => sacredMfrKeys.has(k));
          const otherObserved = observedKeys.filter((k) => !sacredMfrKeys.has(k));
          const keptSacred = sacredKeys.slice(0, groupLimit);
          const keptObservedKeys = [
            ...keptSacred,
            ...otherObserved.slice(0, Math.max(0, groupLimit - keptSacred.length)),
          ];
          const keptSpeculativeKeys = speculativeKeys.slice(0, Math.max(0, groupLimit - keptObservedKeys.length));
          nextManufacturers = [
            ...keptObservedKeys.flatMap(k => variantGroups.get(k)),
            ...keptSpeculativeKeys.flatMap(k => variantGroups.get(k)),
          ];
          // Force-include sacred groups even if over soft groupLimit.
          for (const sk of sacredMfrKeys) {
            if (variantGroups.has(sk) && !nextManufacturers.some((m) => mfrKey(m) === sk)) {
              nextManufacturers = [...variantGroups.get(sk), ...nextManufacturers];
            }
          }
          nextManufacturers = uniqStrings(nextManufacturers);
          const droppedKeys = observedKeys.filter((k) => !keptObservedKeys.includes(k) && !sacredMfrKeys.has(k));
          if (droppedKeys.length > 0) {
            observedDropped.push({
              id: driver.id,
              manufacturers: droppedKeys.flatMap(k => variantGroups.get(k)),
            });
          }
        }
      } else if (nextProducts.length > maxDriverCombos) {
        nextManufacturers = manufacturers.slice(0, 1);
        nextProducts = nextProducts.slice(0, maxDriverCombos);
      } else {
        const groupLimit = Math.max(1, Math.floor(maxDriverCombos / Math.max(1, nextProducts.length)));
        const keys = [...variantGroups.keys()];
        const sacredFirst = [
          ...keys.filter((k) => sacredMfrKeys.has(k)),
          ...keys.filter((k) => !sacredMfrKeys.has(k)),
        ];
        const keptKeys = new Set(sacredFirst.slice(0, groupLimit));
        for (const sk of sacredMfrKeys) {
          if (variantGroups.has(sk)) keptKeys.add(sk);
        }
        nextManufacturers = manufacturers.filter(v => keptKeys.has(mfrKey(v)));
      }

      // WHY(P2252): cap CASE forms so Athom raw cartesian stays near group budget
      nextManufacturers = limitCaseForms(nextManufacturers, maxCaseForms, legacyCaseOrder);
      // If still over raw budget, cut more groups — never drop sacred keys
      while (
        nextManufacturers.length * nextProducts.length > maxDriverCombos
        && new Set(nextManufacturers.map((v) => mfrKey(v))).size > 1
      ) {
        const keys = [...new Set(nextManufacturers.map((v) => mfrKey(v)))];
        const drop = [...keys].reverse().find((k) => !sacredMfrKeys.has(k));
        if (!drop) break;
        nextManufacturers = nextManufacturers.filter((v) => mfrKey(v) !== drop);
      }

      driver.zigbee.manufacturerName = nextManufacturers;
      driver.zigbee.productId = nextProducts;

      const keptObservedCount = hasDb
        ? nextManufacturers.filter(value => db.byMfr.has(mfrKey(value))).length
        : 0;
      observedKept += keptObservedCount;

      const after = nextManufacturers.length * nextProducts.length;
      const change = {
        id: driver.id,
        before,
        after,
        manufacturers: `${manufacturers.length}->${nextManufacturers.length}`,
        products: `${products.length}->${nextProducts.length}`,
        observed: hasDb ? `${keptObservedCount}/${observed.length}` : undefined,
      };
      changes.push(change);
      logLines.push(
        `[compact] ${driver.id}: mfrs ${manufacturers.length}→${nextManufacturers.length}`
        + (hasDb ? ` (obs ${keptObservedCount}/${observed.length})` : '')
        + `, pids ${products.length}→${nextProducts.length}, combos ${before}→${after}`,
      );
      afterTotal += after;
    } else {
      // Still cap CASE forms on under-budget drivers (Athom raw cartesian)
      let emitMfrs = limitCaseForms(manufacturers, maxCaseForms, legacyCaseOrder);
      let emitProducts = nextProducts;
      while (
        emitMfrs.length * emitProducts.length > maxDriverCombos
        && new Set(emitMfrs.map((v) => mfrKey(v))).size > 1
      ) {
        const keys = [...new Set(emitMfrs.map((v) => mfrKey(v)))];
        const drop = [...keys].reverse().find((k) => !sacredMfrKeys.has(k));
        if (!drop) break;
        emitMfrs = emitMfrs.filter((v) => mfrKey(v) !== drop);
      }
      for (const sk of sacredMfrKeys) {
        if (!emitMfrs.some((m) => mfrKey(m) === sk) && variantGroups.has(sk)) {
          emitMfrs = uniqStrings([...variantGroups.get(sk), ...emitMfrs]);
        }
      }
      const after = emitMfrs.length * emitProducts.length;
      observedKept += hasDb
        ? emitMfrs.filter(value => db.byMfr.has(mfrKey(value))).length
        : 0;
      afterTotal += after;
      const wasRescued = rescuedDrivers.some(r => r.id === driver.id);
      if (wasRescued || emitMfrs.length !== manufacturers.length || emitProducts.length !== products.length) {
        changes.push({
          id: driver.id,
          before,
          after,
          manufacturers: `${manufacturers.length}->${emitMfrs.length}`,
          products: `${products.length}->${emitProducts.length}`,
          observed: hasDb ? undefined : undefined,
        });
        logLines.push(
          `[compact] ${driver.id}: mfrs ${manufacturers.length}→${emitMfrs.length}`
          + `, pids ${products.length}→${emitProducts.length}, combos ${before}→${after}`
          + (wasRescued ? ' (rescued)' : ''),
        );
      }
      driver.zigbee.manufacturerName = emitMfrs;
      driver.zigbee.productId = emitProducts;
      // WHY(P2348): Homey Zigbee pairing is case-SENSITIVE on manufacturerName.
      // Case-insensitive presence of 5SLEHGEO is NOT enough — inject exact pin.mfr.
      for (const pin of sacredRequired) {
        const pinMfr = String(pin.mfr);
        const pinPid = String(pin.pid);
        const pinPidUc = pinPid.toUpperCase();
        const mfrs = driver.zigbee.manufacturerName || [];
        if (!mfrs.some((m) => String(m) === pinMfr)) {
          driver.zigbee.manufacturerName = uniqStrings([pinMfr, ...mfrs]);
          sacredPinned += 1;
        }
        if (!(driver.zigbee.productId || []).some((p) => String(p).toUpperCase() === pinPidUc)) {
          driver.zigbee.productId = uniqStrings([pinPid, ...(driver.zigbee.productId || [])]);
          sacredPinned += 1;
        }
      }
      for (const pin of sacredRequired) {
        const mfrsNow = driver.zigbee.manufacturerName || [];
        const pidsNow = (driver.zigbee.productId || []).map(String);
        if (!mfrsNow.some((m) => String(m) === String(pin.mfr))
            || !pidsNow.some((p) => p.toUpperCase() === String(pin.pid).toUpperCase())) {
          sacredMissing.push(`${pin.mfr}+${pin.pid} @ ${driver.id}`);
        }
      }
      nextDrivers.push(driver);
      continue;
    }

    for (const pin of sacredRequired) {
      const pinMfr = String(pin.mfr);
      const pinPid = String(pin.pid);
      const pinPidUc = pinPid.toUpperCase();
      const mfrs = driver.zigbee.manufacturerName || [];
      if (!mfrs.some((m) => String(m) === pinMfr)) {
        driver.zigbee.manufacturerName = uniqStrings([pinMfr, ...mfrs]);
        sacredPinned += 1;
      }
      if (!(driver.zigbee.productId || []).some((p) => String(p).toUpperCase() === pinPidUc)) {
        driver.zigbee.productId = uniqStrings([pinPid, ...(driver.zigbee.productId || [])]);
        sacredPinned += 1;
      }
    }

    for (const pin of sacredRequired) {
      const mfrsNow = driver.zigbee.manufacturerName || [];
      const pidsNow = (driver.zigbee.productId || []).map(String);
      if (!mfrsNow.some((m) => String(m) === String(pin.mfr))
          || !pidsNow.some((p) => p.toUpperCase() === String(pin.pid).toUpperCase())) {
        sacredMissing.push(`${pin.mfr}+${pin.pid} @ ${driver.id}`);
      }
    }

    nextDrivers.push(driver);
  }

  if (prunedDrivers.length > 0 || rescuedDrivers.length > 0 || changes.length > 0) {
    manifest.drivers = nextDrivers;
  }

  // WHY(P2252): second pass — enforce RAW total Athom cartesian budget
  let pass2Cuts = 0;
  let pass2VariantCuts = 0;
  const rawTotal = () => (manifest.drivers || []).reduce((sum, d) => sum + comboCount(d), 0);
  afterTotal = rawTotal();
  // WHY(P3024b): a pin protects its whole case key in the loop below, so case
  // variants added to the source after the pinned package (ts0203/Ts0203 beside
  // the shipped TS0203) were uncuttable and inflated the total by ~2700 combos.
  // Phase A trims only those variants (largest driver first): the exact pinned
  // string stays, so no published couple is lost. Padded wire forms are kept.
  while (afterTotal > maxTotalCombos) {
    let trimmed = false;
    const ranked = (manifest.drivers || [])
      .map((d) => ({ d, c: comboCount(d) }))
      .filter((x) => x.c > 1)
      .sort((x, y) => y.c - x.c);
    for (const { d } of ranked) {
      const pins = sacredPinsForDriver(sacredAll, d.id);
      if (!pins.length) continue;
      const mfrs = uniqStrings(d.zigbee.manufacturerName);
      const pids = uniqStrings(d.zigbee.productId);
      const pinMfrExact = new Set(pins.map((p) => String(p.mfr)));
      const pinPidExact = new Set(pins.map((p) => String(p.pid)));
      const pinMfrLc = new Set(pins.map((p) => mfrKey(p.mfr)));
      const pinPidUc = new Set(pins.map((p) => String(p.pid).toUpperCase()));
      // WHY(P3027): trim never-emitted spellings first; the wire-shaped one
      // (TS0203, _TZ3000_abcd) is what the device sends, so it goes last.
      const pidCands = [...pids].reverse()
        .filter((p) => !pinPidExact.has(p) && pinPidUc.has(p.toUpperCase()));
      const mfrCands = [...mfrs].reverse()
        .filter((v) => v === v.trim() && !pinMfrExact.has(v) && pinMfrLc.has(mfrKey(v)));
      const variantPid = legacyCaseOrder
        ? pidCands[0]
        : (pidCands.find((p) => !caseEvidence.isWireShapedPid(p)) ?? pidCands[0]);
      const variantMfr = legacyCaseOrder
        ? mfrCands[0]
        : (mfrCands.find((v) => !caseEvidence.isWireShapedMfr(v)) ?? mfrCands[0]);
      if (variantPid !== undefined && (mfrs.length <= pids.length || variantMfr === undefined)) {
        d.zigbee.productId = pids.filter((p) => p !== variantPid);
      } else if (variantMfr !== undefined) {
        d.zigbee.manufacturerName = mfrs.filter((v) => v !== variantMfr);
      } else {
        continue;
      }
      trimmed = true;
      pass2VariantCuts += 1;
      break;
    }
    if (!trimmed) break;
    afterTotal = rawTotal();
  }
  if (neverEmittedDropped > 0) {
    logLines.push(`[compact] P3027: omitted ${neverEmittedDropped} never-emitted case form(s) (wire-shaped sibling kept)`);
  }
  if (pass2VariantCuts > 0) {
    logLines.push(`[compact] pass2: trimmed ${pass2VariantCuts} unpinned case variant(s) of pinned couples (now ${afterTotal})`);
  }
  while (afterTotal > maxTotalCombos) {
    const ranked = (manifest.drivers || [])
      .map((d) => ({ d, c: comboCount(d) }))
      .filter((x) => x.c > 1)
      .sort((a, b) => b.c - a.c);
    let cutMade = false;
    for (const item of ranked) {
      const target = item.d;
      const mfrs = uniqStrings(target.zigbee.manufacturerName);
      const pids = uniqStrings(target.zigbee.productId);
      const pins = sacredPinsForDriver(sacredAll, target.id);
      // WHY(P3027): no-loss guard — a mfr group or pid whose removal would drop a
      // caseless couple the old compactor shipped is not a candidate.
      const mfrGroupSafe = (k) => !legacyGuard
        || !pids.some((p) => isProtected(target.id, k, p));
      const pidSafe = (p) => !legacyGuard
        || pids.some((q) => q !== p && q.trim().toUpperCase() === p.trim().toUpperCase())
        || !mfrs.some((m) => isProtected(target.id, m, p));
      // WHY(P2348): pass2 must compare lowercase keys to lowercase sacred pins
      // (previously pinMfr held original case → sacred mfrs looked droppable).
      const pinMfrLc = new Set(pins.map((p) => mfrKey(p.mfr)));
      const pinPid = new Set(pins.map((p) => String(p.pid).toUpperCase()));
      if (mfrs.length <= 1 && pids.length <= 1) continue;

      if (mfrs.length > pids.length) {
        const keys = [...new Set(mfrs.map((v) => mfrKey(v)))];
        const drop = [...keys].reverse().find((k) => !pinMfrLc.has(k) && mfrGroupSafe(k));
        if (!drop) {
          // Cannot drop mfr — try pid instead
          const dropPid = [...pids].reverse().find((p) => !pinPid.has(String(p).toUpperCase()) && pidSafe(p));
          if (dropPid) {
            target.zigbee.productId = pids.filter((p) => p !== dropPid);
            cutMade = true;
            break;
          }
        } else {
          target.zigbee.manufacturerName = mfrs.filter((v) => mfrKey(v) !== drop);
          cutMade = true;
          break;
        }
      } else {
        const dropPid = [...pids].reverse().find((p) => !pinPid.has(String(p).toUpperCase()) && pidSafe(p));
        if (dropPid) {
          target.zigbee.productId = pids.filter((p) => p !== dropPid);
          cutMade = true;
          break;
        } else {
          const keys = [...new Set(mfrs.map((v) => mfrKey(v)))];
          const drop = [...keys].reverse().find((k) => !pinMfrLc.has(k) && mfrGroupSafe(k));
          if (drop) {
            target.zigbee.manufacturerName = mfrs.filter((v) => mfrKey(v) !== drop);
            cutMade = true;
            break;
          }
        }
      }
    }
    if (!cutMade) break;
    pass2Cuts += 1;
    afterTotal = rawTotal();
    if (pass2Cuts > 50000) break; // safety
  }
  if (pass2Cuts > 0) {
    logLines.push(`[compact] pass2: cut ${pass2Cuts} group/pid slot(s) to meet raw total ≤ ${maxTotalCombos} (now ${afterTotal})`);
  }

  // WHY(P2348): re-assert exact sacred mfr strings after pass2 budget cuts
  for (const driver of manifest.drivers || []) {
    const pins = sacredPinsForDriver(sacredAll, driver.id);
    if (!pins.length || !driver.zigbee) continue;
    for (const pin of pins) {
      const pinMfr = String(pin.mfr);
      const pinPid = String(pin.pid);
      const mfrs = driver.zigbee.manufacturerName || [];
      if (!mfrs.some((m) => String(m) === pinMfr)) {
        driver.zigbee.manufacturerName = uniqStrings([pinMfr, ...mfrs]);
        sacredPinned += 1;
      }
      if (!(driver.zigbee.productId || []).some((p) => String(p).toUpperCase() === pinPid.toUpperCase())) {
        driver.zigbee.productId = uniqStrings([pinPid, ...(driver.zigbee.productId || [])]);
        sacredPinned += 1;
      }
    }
  }

  // Final exact-case sacred audit (pass1 sacredMissing can be stale after pass2)
  sacredMissing.length = 0;
  for (const miss of assertSacredCouplesPresent(manifest, sacredAll)) {
    sacredMissing.push(miss);
  }
  afterTotal = rawTotal();

  // WHY(P3027): no-loss guard fallback — ship the old result when the new one
  // would lose a caseless couple the old one kept, or misses the cap/pins.
  let noLossFallback = false;
  let noLossLost = 0;
  if (legacyGuard) {
    const now = caselessCoupleSet(manifest);
    for (const k of legacyGuard.keep) if (!now.has(k)) noLossLost += 1;
    const legacyOk = (legacyGuard.result.sacredMissing || []).length === 0;
    if (legacyOk && (noLossLost > 0 || afterTotal > maxTotalCombos || sacredMissing.length > 0)) {
      noLossFallback = true;
      manifest.drivers = legacyGuard.manifest.drivers;
      sacredMissing.length = 0;
      afterTotal = rawTotal();
      neverEmittedDropped = 0;
      logLines.push(`[compact] P3027: no-loss guard — new result lost ${noLossLost} caseless couple(s); shipped the pre-P3027 result`);
    } else if (noLossLost === 0) {
      logLines.push('[compact] P3027: no-loss guard OK (every caseless couple of the pre-P3027 result kept)');
    }
  }

  // Keep OTA firmwareUpdates consistent with the (possibly compacted) zigbee
  // identifier lists: homey-lib 'publish' validation rejects firmware updates
  // whose productId/manufacturerName are no longer claimed by the driver.
  let firmwareAligned = 0;
  for (const driver of manifest.drivers || []) {
    const fw = driver.firmwareUpdates;
    if (!fw || !Array.isArray(fw.updates)) continue;
    const pids = new Set((driver.zigbee && driver.zigbee.productId) || []);
    const zigbeeMfrs = (driver.zigbee && driver.zigbee.manufacturerName) || [];
    const mfrByLc = new Map(zigbeeMfrs.map((m) => [mfrKey(m), String(m)]));
    const mfrsLc = new Set(mfrByLc.keys());
    const kept = [];
    for (const update of fw.updates) {
      const dev = update && update.device;
      if (!dev) { kept.push(update); continue; }
      if (Array.isArray(dev.productId)) {
        const next = dev.productId.filter((p) => pids.has(p));
        if (next.length !== dev.productId.length) { dev.productId = next; firmwareAligned++; }
      }
      if (Array.isArray(dev.manufacturerName)) {
        // WHY(P2257): homey-lib publish validation is case-sensitive on exact strings.
        // After compaction we may keep _tze200_* while OTA still cites _TZE200_*.
        const next = dev.manufacturerName
          .filter((m) => mfrsLc.has(mfrKey(m)))
          .map((m) => mfrByLc.get(mfrKey(m)) || m);
        if (next.length !== dev.manufacturerName.length
          || next.some((m, i) => m !== dev.manufacturerName[i])) {
          dev.manufacturerName = next;
          firmwareAligned++;
        }
      }
      const emptyPids = Array.isArray(dev.productId) && dev.productId.length === 0;
      const emptyMfrs = Array.isArray(dev.manufacturerName) && dev.manufacturerName.length === 0;
      if (!emptyPids && !emptyMfrs) kept.push(update);
    }
    if (kept.length !== fw.updates.length) {
      firmwareAligned++;
      if (kept.length === 0) { delete driver.firmwareUpdates; }
      else { fw.updates = kept; }
    }
  }
  if (firmwareAligned > 0) {
    logLines.push(`[compact] firmwareUpdates aligned to compacted identifiers (${firmwareAligned} change(s))`);
  }

  const droppedObservedCount = observedDropped.reduce((sum, item) => sum + item.manufacturers.length, 0);
  // Pass2 can still drop — re-check only couples we already flagged as required.
  // Do NOT re-assert the full config list (stable may omit master-only siblings).
  logLines.push(
    `[compact] summary: combos ${beforeTotal}→${afterTotal}, observed mfrs preserved ${observedKept}/${observedBefore}`
    + `, drivers compacted=${changes.length}, rescued=${rescuedDrivers.length}, pruned=${prunedDrivers.length}`
    + `, sacredPinned=${sacredPinned}, sacredMissing=${sacredMissing.length}`
    + (droppedObservedCount > 0 ? `, OBSERVED DROPPED=${droppedObservedCount} (budget-forced)` : ''),
  );
  if (verbose) {
    for (const item of observedDropped) {
      logLines.push(`[compact]   ${item.id}: budget-forced observed drop: ${item.manufacturers.join(', ')}`);
    }
    for (const pruned of prunedDrivers) {
      if (pruned.reason !== 'missing-product') continue;
      logLines.push(`[compact]   ${pruned.id}: ${pruned.rescue}`);
    }
  }

  return {
    changed: changes.length,
    changes,
    pruned: prunedDrivers.length,
    prunedDrivers,
    neverEmittedDropped,
    pinWireEquivalent,
    noLossFallback,
    noLossLost,
    rescuedDrivers,
    filteredSyntheticManufacturers,
    firmwareAligned,
    observedBefore,
    observedKept,
    observedDropped,
    sacredPinned,
    sacredMissing,
    beforeTotal,
    afterTotal,
    maxDriverCombos,
    maxTotalCombos,
    pidReduceOver,
    pruneSynthetic,
    mfsDbLoaded: hasDb,
    mfsDbPath: hasDb ? db.path : undefined,
    logLines,
    baselineVersion: baseline ? baseline.version : undefined,
    baselineTotal: baselineResolved.total,
    baselinePinned: baselineResolved.pins.length,
    baselineMoved: baselineResolved.moved,
    baselineRestored: baselineResolved.restored || 0,
    baselineUnresolved: baselineResolved.unresolved,
    overTotalLimit: afterTotal > maxTotalCombos,
  };
}

function compactManifestFile(file, opts = {}) {
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = compactZigbeeIdentifiers(manifest, opts);
  if (result.changed > 0 || result.pruned > 0 || result.rescuedDrivers.length > 0 || result.filteredSyntheticManufacturers > 0 || result.firmwareAligned > 0 || result.sacredPinned > 0) {
    fs.writeFileSync(file, JSON.stringify(manifest), 'utf8');
  }
  return result;
}

function logResult(file, result) {
  const rel = path.relative(process.cwd(), file) || file;
  console.log(`[compact-zigbee] ${rel}: mfs_db=${result.mfsDbLoaded ? 'loaded' : 'absent (legacy mode)'}, max/driver=${result.maxDriverCombos}, max/total=${result.maxTotalCombos}`);
  for (const line of result.logLines) {
    console.log(line);
  }
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: node scripts/maintenance/compact-zigbee-identifiers.cjs <app.json> [...]');
    process.exit(2);
  }
  let failed = false;
  for (const file of files) {
    try {
      const result = compactManifestFile(file);
      logResult(file, result);
      if (result.overTotalLimit) {
        console.error(`[compact-zigbee] FATAL: total Zigbee combinations ${result.afterTotal} exceed limit ${result.maxTotalCombos}`);
        failed = true;
      }
      if (result.observedDropped.length > 0) {
        console.error(`[compact-zigbee] WARNING: ${result.observedDropped.reduce((s, i) => s + i.manufacturers.length, 0)} observed manufacturer(s) dropped (budget-forced) in ${result.observedDropped.length} driver(s)`);
      }
      if ((result.sacredMissing || []).length > 0) {
        console.error(`[compact-zigbee] FATAL: sacred keep couples missing after compact:`);
        for (const m of result.sacredMissing.slice(0, 20)) console.error(`  - ${m}`);
        failed = true;
      }
    } catch (e) {
      console.error(`[compact-zigbee] FATAL: ${file}: ${e.message}`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
}

module.exports = {
  comboCount,
  compactManifestFile,
  compactZigbeeIdentifiers,
  limitCaseForms,
  indexMfsDatabase,
  isSyntheticManufacturer,
  loadMfsDatabase,
  loadSacredKeepCouples,
  assertSacredCouplesPresent,
  loadPublishBaseline,
  baselineCouples,
  resolveBaselinePins,
};
