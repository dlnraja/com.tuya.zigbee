'use strict';

/**
 * bastien-promote-upstream.js (P2606 / P2607)
 *
 * Autonomous one-way promote: bastien-home → master → (BOTH reliability) stable-v5.
 * NEVER copies App ID / version / store identity.
 * NEVER wholesale-syncs master/stable → bastien.
 *
 * Usage:
 *   node tools/ci/bastien-promote-upstream.js
 *   node tools/ci/bastien-promote-upstream.js --apply
 *   node tools/ci/bastien-promote-upstream.js --apply --commit
 *   node tools/ci/bastien-promote-upstream.js --apply --commit --stable
 *
 * Contre quoi: reverse sync, identity overwrite, compose shrink (P2520).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
// P3019c: per-branch generated/curated KB docs never cross branches (see module header).
const { isBranchSpecific, regenerateBranchDocs, BRANCH_SPECIFIC_PATHS } = require('./branch-specific-paths');
// P3019d: three-way (merge-base / target / Bastien) — never revert a file where the target is ahead.
const TW = require('./three-way-promote');

const ROOT = path.resolve(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const COMMIT = process.argv.includes('--commit');
const STABLE = process.argv.includes('--stable');
const SSOT = path.join(ROOT, 'config/architecture/bastien-house-ssot.json');
const OUT = path.join(ROOT, 'reports/bastien-promote-latest.json');

const BASTIEN_REF = process.env.BASTIEN_REF || 'origin/bastien-home';
const STABLE_ROOT = process.env.STABLE_ROOT || '';
const MAX_AUTO_FILES = Number(process.env.BASTIEN_PROMOTE_MAX || 48);

const FORBIDDEN_PATHS = [
  '.homeycompose/app.json',
  'app.json',
  'package.json',
  '.homeychangelog.json',
  'HOUSE_README.md',
];

const FORBIDDEN_PREFIXES = [
  '.github/workflows/bastien-publish.yml', // Bastien-only publish stays private track
];

/** BOTH reliability lib prefixes — safe to checkout from Bastien when changed there. */
const BOTH_LIB_RE = /^lib\/(tuya|zigbee|io|utils|devices|mixins|helpers|managers|battery|flow)\//i;

const PROMOTE_GLOBS = [
  'drivers/**/driver.compose.json',
  'drivers/**/device.js',
  'data/user-misattribution-registry.json',
  'lib/**/*.js',
  'test/critical/p*.test.js',
];

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      cwd: opts.cwd || ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    }).trim();
  } catch (e) {
    if (opts.throw) {throw e;}
    return ((e.stdout || '') + (e.stderr || '')).trim();
  }
}

function loadSsot() {
  if (!fs.existsSync(SSOT)) {throw new Error(`Missing ${SSOT}`);}
  return JSON.parse(fs.readFileSync(SSOT, 'utf8'));
}

function ensureBastienRef() {
  sh('git fetch origin bastien-home:bastien-home 2>/dev/null || git fetch origin bastien-home || true');
  const has = sh(`git rev-parse --verify ${BASTIEN_REF} 2>/dev/null || git rev-parse --verify bastien-home 2>/dev/null`);
  if (!has) {throw new Error('bastien-home ref not available — fetch origin bastien-home first');}
  return has.includes('origin/') ? BASTIEN_REF : sh('git rev-parse --verify origin/bastien-home 2>/dev/null') ? 'origin/bastien-home' : 'bastien-home';
}

/**
 * Files Bastien changed since diverging from master (correct promote direction).
 * WHY(P2607): old `bastien-home...HEAD` listed master-only changes — inverted.
 */
function listBastienChangedFiles(ref, rootDir = ROOT) {
  // P3019d: only what Bastien changed since the merge-base. The old HEAD-vs-ref diff also listed
  // every file where the target is ahead, which the apply then reverted to Bastien's copy.
  const since = TW.listChangedSinceBase(rootDir, TW.mergeBaseOf(rootDir, ref), ref);
  if (since) {
    // …and that still differ from the target (identical files must not eat MAX_AUTO_FILES).
    const differs = new Set(sh(`git diff --name-only --no-renames HEAD ${ref}`, { cwd: rootDir })
      .split(/\r?\n/).map((l) => l.trim().replace(/\\/g, '/')).filter(Boolean));
    return since.filter((f) => differs.has(f));
  }
  const raw = sh(`git log --name-only --pretty=format: HEAD..${ref}`);
  const set = new Set();
  for (const line of raw.split(/\r?\n/)) {
    const f = line.trim();
    if (f) {set.add(f.replace(/\\/g, '/'));}
  }
  // Also include uncommitted-equivalent: content differs even if log empty
  const diff = sh(`git diff --name-only HEAD ${ref}`);
  for (const line of diff.split(/\r?\n/)) {
    const f = line.trim();
    if (f) {set.add(f.replace(/\\/g, '/'));}
  }
  return [...set].sort();
}

function isForbidden(rel) {
  if (FORBIDDEN_PATHS.includes(rel)) {return true;}
  if (FORBIDDEN_PREFIXES.some((p) => rel === p || rel.startsWith(p))) {return true;}
  if (/^config\/architecture\/bastien-house-ssot\.json$/.test(rel)) {return true;}
  // Never promote Bastien-only identity / private inventory dumps
  if (/^reports\/bastien/i.test(rel)) {return true;}
  return false;
}

function isPromotable(rel) {
  if (isForbidden(rel)) {return false;}
  // P3019c: METHOD_COVERAGE.md & co. describe the branch they live on — regenerate, never copy.
  if (isBranchSpecific(rel)) {
    return false;
  }
  if (/^drivers\//.test(rel) && /\.(js|json)$/.test(rel)) {return true;}
  if (rel === 'data/user-misattribution-registry.json') {return true;}
  if (rel === 'config/architecture/publish-sacred-keep-couples.json') {return true;}
  if (/^lib\//.test(rel) && /\.js$/.test(rel)) {return true;}
  if (/^test\/critical\/p\d+.*\.test\.js$/.test(rel)) {return true;}
  if (/^docs\/knowledge\//.test(rel)) {return true;}
  if (/^config\/architecture\/(sacred-couple|identity-fields|complementary-variant)/.test(rel)) {return true;}
  return false;
}

/**
 * AUTO_SAFE = can apply without human (complementary / Contre quoi / BOTH reliability).
 */
function classifyAutoSafe(rel) {
  if (!isPromotable(rel)) {return false;}
  if (isBranchSpecific(rel)) {
    return false;
  }
  if (/^drivers\/.+\/driver\.compose\.json$/.test(rel)) {return true;}
  if (rel === 'data/user-misattribution-registry.json') {return true;}
  if (rel === 'config/architecture/publish-sacred-keep-couples.json') {return true;}
  if (/^test\/critical\/p\d+.*\.test\.js$/.test(rel)) {return true;}
  if (/^docs\/knowledge\//.test(rel)) {return true;}
  if (BOTH_LIB_RE.test(rel)) {return true;}
  // New driver device.js only (master missing) — not overwrite existing device.js
  if (/^drivers\/.+\/device\.js$/.test(rel) && !fs.existsSync(path.join(ROOT, rel))) {return true;}
  return false;
}

function isBothReliability(rel) {
  if (/^drivers\/.+\/driver\.compose\.json$/.test(rel)) {return true;}
  if (rel === 'data/user-misattribution-registry.json') {return true;}
  if (rel === 'config/architecture/publish-sacred-keep-couples.json') {return true;}
  if (/^test\/critical\/p\d+.*\.test\.js$/.test(rel)) {return true;}
  if (BOTH_LIB_RE.test(rel)) {return true;}
  return false;
}

function mergeComposeComplementary(masterObj, bastienObj) {
  const {
    appendExactIdentityForms,
    unionCapabilities,
    appendSettingsById,
    wouldDegradeCompose,
  } = require('../../lib/enrichment/ComplementaryMerge.js');

  const after = JSON.parse(JSON.stringify(masterObj || {}));
  const b = bastienObj || {};
  const bz = b.zigbee && typeof b.zigbee === 'object' ? b.zigbee : {};
  // WHY(P2651): never invent `zigbee: {}` on WiFi/LAN compose — Athom publish
  // validate requires manufacturerName/productId/endpoints whenever zigbee exists.
  const bastienHasZigbeeContent = Boolean(
    (Array.isArray(bz.manufacturerName) && bz.manufacturerName.length)
    || (Array.isArray(bz.productId) && bz.productId.length)
    || Array.isArray(bz.endpoints?.[1]?.clusters)
    || Array.isArray(bz.endpoints?.['1']?.clusters)
    || (bz.endpoints && typeof bz.endpoints === 'object' && Object.keys(bz.endpoints).length),
  );
  const masterHasZigbee = Boolean(
    after.zigbee && typeof after.zigbee === 'object' && Object.keys(after.zigbee).length,
  );

  if (masterHasZigbee || bastienHasZigbeeContent) {
    after.zigbee = after.zigbee && typeof after.zigbee === 'object' ? after.zigbee : {};

    if (bz.manufacturerName) {
      after.zigbee.manufacturerName = appendExactIdentityForms(
        after.zigbee.manufacturerName,
        bz.manufacturerName,
      );
    }
    if (bz.productId) {
      after.zigbee.productId = appendExactIdentityForms(after.zigbee.productId, bz.productId);
    }
    // Clusters: union numeric ids — never drop master's
    if (Array.isArray(bz.endpoints?.[1]?.clusters) || Array.isArray(bz.endpoints?.['1']?.clusters)) {
      after.zigbee.endpoints = after.zigbee.endpoints || {};
      const epKey = after.zigbee.endpoints['1'] ? '1' : after.zigbee.endpoints[1] ? 1 : '1';
      after.zigbee.endpoints[epKey] = after.zigbee.endpoints[epKey] || {};
      const cur = after.zigbee.endpoints[epKey].clusters || [];
      const inc = (bz.endpoints?.['1'] || bz.endpoints?.[1] || {}).clusters || [];
      const seen = new Set(cur.map(Number));
      const out = cur.slice();
      for (const c of inc) {
        const n = Number(c);
        if (!seen.has(n)) {
          seen.add(n);
          out.push(c);
        }
      }
      after.zigbee.endpoints[epKey].clusters = out;
    }
  }

  if (b.capabilities) {
    after.capabilities = unionCapabilities(after.capabilities, b.capabilities);
  }
  if (b.settings) {
    after.settings = appendSettingsById(after.settings, b.settings);
  }

  // Contre quoi (P2651): empty stub after merge → delete (WiFi LAN)
  if (after.zigbee && typeof after.zigbee === 'object' && Object.keys(after.zigbee).length === 0) {
    delete after.zigbee;
  }

  if (wouldDegradeCompose(masterObj, after)) {
    throw new Error('compose merge would degrade — refusing');
  }
  return after;
}

function mergeRegistryCases(masterObj, bastienObj) {
  const out = JSON.parse(JSON.stringify(masterObj || { version: 1, cases: [] }));
  const cases = Array.isArray(out.cases) ? out.cases : [];
  const byId = new Map(cases.map((c) => [String(c.id || ''), c]));
  for (const c of Array.isArray(bastienObj?.cases) ? bastienObj.cases : []) {
    if (!c || !c.id) {continue;}
    if (!byId.has(String(c.id))) {
      cases.push(JSON.parse(JSON.stringify(c)));
      byId.set(String(c.id), c);
    }
  }
  out.cases = cases;
  return out;
}

// WHY(P2891): a sacred-keep entry whose driver is not in the target's published
// set (stable-v5 publishes a subset of drivers) makes the P2288 sacred check fail
// with "driver missing in publish". Only carry couples the target can keep.
function targetDriverIds(rootDir) {
  try {
    const app = JSON.parse(fs.readFileSync(path.join(rootDir, 'app.json'), 'utf8'));
    if (Array.isArray(app.drivers) && app.drivers.length) {return new Set(app.drivers.map((d) => d.id));}
  } catch { /* fall back to the drivers folder */ }
  try {
    return new Set(fs.readdirSync(path.join(rootDir, 'drivers'))
      .filter((d) => fs.existsSync(path.join(rootDir, 'drivers', d, 'driver.compose.json'))));
  } catch {
    return null;
  }
}

function mergeSacredKeep(masterObj, bastienObj, allowedDrivers = null) {
  const out = JSON.parse(JSON.stringify(masterObj || { couples: [] }));
  const couples = Array.isArray(out.couples) ? out.couples : [];
  const key = (c) => `${String(c.mfr || '').toLowerCase()}|${String(c.pid || '')}|${String(c.driverId || '')}`;
  const seen = new Set(couples.map(key));
  for (const c of Array.isArray(bastienObj?.couples) ? bastienObj.couples : []) {
    if (!c || !c.mfr || !c.pid || !c.driverId) {continue;}
    if (allowedDrivers && !allowedDrivers.has(c.driverId)) {continue;}
    const k = key(c);
    if (seen.has(k)) {continue;}
    seen.add(k);
    couples.push(JSON.parse(JSON.stringify(c)));
  }
  out.couples = couples;
  return out;
}

/** P3019d: create parent dirs only when actually writing (a rejected new driver leaves no empty folder). */
function writeMk(abs, text) {
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text);
}

function applyOne(rel, bastienBody, rootDir = ROOT) {
  const abs = path.join(rootDir, rel);

  if (/driver\.compose\.json$/.test(rel)) {
    let bastienObj;
    try {
      bastienObj = JSON.parse(bastienBody);
    } catch {
      return { ok: false, reason: 'bastien_compose_invalid_json' };
    }
    if (!fs.existsSync(abs)) {
      // P3019d: a new driver is never auto-created on the target (one couple = one driver is
      // decided there, e.g. SPI folded into led_controller_rgb) — manual review.
      return { ok: false, reason: 'new_driver_manual_review' };
    }
    const masterObj = JSON.parse(fs.readFileSync(abs, 'utf8'));
    const merged = mergeComposeComplementary(masterObj, bastienObj);
    writeMk(abs, `${JSON.stringify(merged, null, 2)}\n`);
    return { ok: true, mode: 'merge_compose' };
  }

  if (rel === 'data/user-misattribution-registry.json') {
    const bastienObj = JSON.parse(bastienBody);
    if (!fs.existsSync(abs)) {
      writeMk(abs, `${JSON.stringify(bastienObj, null, 2)}\n`);
      return { ok: true, mode: 'create_registry' };
    }
    const masterObj = JSON.parse(fs.readFileSync(abs, 'utf8'));
    const merged = mergeRegistryCases(masterObj, bastienObj);
    writeMk(abs, `${JSON.stringify(merged, null, 2)}\n`);
    return { ok: true, mode: 'merge_registry' };
  }

  if (rel === 'config/architecture/publish-sacred-keep-couples.json') {
    const bastienObj = JSON.parse(bastienBody);
    if (!fs.existsSync(abs)) {
      writeMk(abs, `${JSON.stringify(bastienObj, null, 2)}\n`);
      return { ok: true, mode: 'create_sacred_keep' };
    }
    const masterObj = JSON.parse(fs.readFileSync(abs, 'utf8'));
    const merged = mergeSacredKeep(masterObj, bastienObj, targetDriverIds(rootDir));
    writeMk(abs, `${JSON.stringify(merged, null, 2)}\n`);
    return { ok: true, mode: 'merge_sacred_keep' };
  }

  // P3019c: docs are additive-only. The candidate list is diff-based, so a doc where the TARGET
  // branch is ahead (master-only lessons, publish history…) would lose those lines if Bastien
  // bytes were written. Only take Bastien bytes when they keep every target line.
  if (/^docs\//.test(rel) && fs.existsSync(abs) && !isAdditiveDoc(fs.readFileSync(abs, 'utf8'), bastienBody)) {
    return { ok: false, reason: 'docs_not_additive_target_ahead' };
  }

  // Tests / docs / BOTH lib / new device.js — take Bastien bytes
  writeMk(abs, bastienBody.endsWith('\n') ? bastienBody : `${bastienBody}\n`);
  return { ok: true, mode: 'checkout_bastien' };
}

/**
 * P3019d: drop from a compose delta every manufacturerName (case-insensitive) that another driver
 * of the target already declares — one couple = one driver; the target decided where it lives.
 * Mutates delta, returns the dropped names.
 */
function dropClaimedElsewhere(rel, delta, rootDir) {
  const z = delta && delta.zigbee;
  if (!z || !Array.isArray(z.manufacturerName) || !z.manufacturerName.length) {return [];}
  const self = rel.split('/')[1];
  const claimed = new Set();
  const dir = path.join(rootDir, 'drivers');
  for (const d of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (d === self) {continue;}
    try {
      const c = JSON.parse(fs.readFileSync(path.join(dir, d, 'driver.compose.json'), 'utf8'));
      for (const m of (c.zigbee && c.zigbee.manufacturerName) || []) {claimed.add(String(m).toLowerCase());}
    } catch { /* no compose */ }
  }
  const dropped = z.manufacturerName.filter((m) => claimed.has(String(m).toLowerCase()));
  z.manufacturerName = z.manufacturerName.filter((m) => !claimed.has(String(m).toLowerCase()));
  return dropped;
}

function lc(x) {
  return String(x).toLowerCase();
}

/** Couples (mfr|pid, lower-case) declared by every OTHER driver of rootDir. */
function otherDriverCouples(rootDir, self) {
  const owned = new Set();
  const dir = path.join(rootDir, 'drivers');
  for (const d of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (d === self) {continue;}
    try {
      const z = JSON.parse(fs.readFileSync(path.join(dir, d, 'driver.compose.json'), 'utf8')).zigbee || {};
      for (const m of z.manufacturerName || []) {for (const p of z.productId || []) {owned.add(`${lc(m)}|${lc(p)}`);}}
    } catch { /* no compose */ }
  }
  return owned;
}

/**
 * P3019d: compose is a cross product (every mfr × every pid). Drop each added mfr / pid that would
 * create a couple another driver of the target already owns (FP collision gate, one couple = one
 * driver). Mutates delta, returns the dropped values.
 */
function dropCollidingAdditions(rel, delta, oursText, rootDir) {
  const z = delta && delta.zigbee;
  if (!z) {return [];}
  let ours = {};
  try { ours = JSON.parse(oursText || '{}'); } catch { ours = {}; }
  const oz = ours.zigbee || {};
  const owned = otherDriverCouples(rootDir, rel.split('/')[1]);
  const dropped = [];
  const addM = Array.isArray(z.manufacturerName) ? z.manufacturerName : [];
  const addP = Array.isArray(z.productId) ? z.productId : [];
  const hits = (m, pids) => pids.some((p) => owned.has(`${lc(m)}|${lc(p)}`));
  const keptM = addM.filter((m) => hits(m, [...oz.productId || [], ...addP]) ? (dropped.push(m), false) : true);
  const keptP = addP.filter((p) => [...oz.manufacturerName || [], ...keptM].some((m) => owned.has(`${lc(m)}|${lc(p)}`))
    ? (dropped.push(p), false) : true);
  if (Array.isArray(z.manufacturerName)) {z.manufacturerName = keptM;}
  if (Array.isArray(z.productId)) {z.productId = keptP;}
  return dropped;
}

/**
 * P3019d: behaviour changes land on master first. When promoting to stable, keep only the delta
 * entries master's compose (post-promote) also carries. Mutates delta.
 */
function restrictToMaster(rel, delta, masterRoot) {
  let m = null;
  try { m = JSON.parse(fs.readFileSync(path.join(masterRoot, rel), 'utf8')); } catch { m = null; }
  const mz = (m && m.zigbee) || {};
  const ep = (z) => (z && z.endpoints && (z.endpoints['1'] || z.endpoints[1])) || {};
  const keep = (arr, have, key = (x) => JSON.stringify(x)) => {
    if (!Array.isArray(arr)) {return arr;}
    const set = new Set((have || []).map(key));
    return arr.filter((x) => set.has(key(x)));
  };
  if (delta.zigbee) {
    delta.zigbee.manufacturerName = keep(delta.zigbee.manufacturerName, mz.manufacturerName, String);
    delta.zigbee.productId = keep(delta.zigbee.productId, mz.productId, String);
    const tep = ep(delta.zigbee);
    if (Array.isArray(tep.clusters)) {tep.clusters = keep(tep.clusters, ep(mz).clusters, Number);}
  }
  delta.capabilities = keep(delta.capabilities, m && m.capabilities);
  delta.settings = keep(delta.settings, m && m.settings, (x) => String(x && x.id));
  return delta;
}

/**
 * P3019d: keep app.json fingerprints in step with the promoted composes (P2791 drift gate),
 * append-only, for the given drivers only. Never touches anything else in app.json.
 */
function syncAppJsonFingerprints(rootDir, driverIds) {
  const appPath = path.join(rootDir, 'app.json');
  if (!fs.existsSync(appPath) || !driverIds.length) {return false;}
  const raw = fs.readFileSync(appPath, 'utf8');
  const app = JSON.parse(raw);
  let changed = false;
  for (const d of app.drivers || []) {
    if (!driverIds.includes(d.id) || !d.zigbee) {continue;}
    let c;
    try {
      c = JSON.parse(fs.readFileSync(path.join(rootDir, 'drivers', d.id, 'driver.compose.json'), 'utf8'));
    } catch {
      continue;
    }
    for (const key of ['manufacturerName', 'productId']) {
      const want = (c.zigbee && c.zigbee[key]) || [];
      const have = Array.isArray(d.zigbee[key]) ? d.zigbee[key] : [];
      const add = want.filter((x) => !have.includes(x));
      if (add.length) {
        d.zigbee[key] = [...have, ...add];
        changed = true;
      }
    }
  }
  // Keep the file's own layout (stable ships a minified app.json, master a 2-space one).
  const m = /^\{\r?\n([ \t]+)"/.exec(raw);
  const indent = m ? m[1] : 0;
  if (changed) {fs.writeFileSync(appPath, `${JSON.stringify(app, null, indent)}${raw.endsWith('\n') ? '\n' : ''}`);}
  return changed;
}

/** P3019d: true when app.json differs from HEAD only by appended driver fingerprints. */
function appJsonFingerprintOnly(rootDir, headText) {
  try {
    const head = JSON.parse(headText);
    const now = JSON.parse(fs.readFileSync(path.join(rootDir, 'app.json'), 'utf8'));
    const strip = (o) => {
      const c = JSON.parse(JSON.stringify(o));
      for (const d of c.drivers || []) {
        if (d.zigbee) {
          delete d.zigbee.manufacturerName;
          delete d.zigbee.productId;
        }
      }
      return JSON.stringify(c);
    };
    if (strip(head) !== strip(now)) {return false;}
    const byId = new Map((head.drivers || []).map((d) => [d.id, d]));
    return (now.drivers || []).every((d) => ['manufacturerName', 'productId'].every((k) => {
      const before = byId.get(d.id)?.zigbee?.[k] || [];
      const after = d.zigbee?.[k] || [];
      return before.every((x) => after.includes(x));
    }));
  } catch {
    return false;
  }
}

const SEMANTIC_MERGE_RE = /(^drivers\/.+\/driver\.compose\.json$)|(^data\/user-misattribution-registry\.json$)|(^config\/architecture\/publish-sacred-keep-couples\.json$)/;

/**
 * P3019d: promote one file into rootDir with a three-way decision against the merge-base.
 *  - JSON files with a union merger (compose / registry / sacred-keep) keep their merger, but only
 *    when Bastien changed them since the base (the mergers only append, never drop target entries).
 *  - Everything else: take (only Bastien changed) / create (new on Bastien) / merge (git merge-file,
 *    clean, every target-only line kept) / skip (target_ahead, identical, conflict_skipped…).
 * Returns { ok, mode } or { ok: false, reason }.
 */
function promoteOne(rel, ref, rootDir, base, io = TW, opts = {}) {
  const theirs = io.readAt(rootDir, ref, rel);
  const ours = io.readWorktree(rootDir, rel);
  const baseText = base ? io.readAt(rootDir, base, rel) : null;
  if (SEMANTIC_MERGE_RE.test(rel)) {
    if (theirs == null) {return { ok: false, reason: 'missing_on_bastien' };}
    if (ours != null && TW.sameText(ours, theirs)) {return { ok: false, reason: 'identical' };}
    if (baseText != null && TW.sameText(baseText, theirs)) {return { ok: false, reason: 'target_ahead' };}
    if (ours == null && baseText != null) {return { ok: false, reason: 'deleted_on_target' };}
    // Feed the union merger only what Bastien ADDED since the base, so entries the target removed
    // on purpose (couples moved to a dedicated driver, curated removals) are never re-added.
    const delta = TW.semanticDelta(rel, baseText, theirs);
    if (!delta) {return { ok: false, reason: 'semantic_unparseable' };}
    const isCompose = /driver\.compose\.json$/.test(rel);
    if (isCompose && opts.masterRoot) {restrictToMaster(rel, delta, opts.masterRoot);}
    const filtered = isCompose
      ? [...dropClaimedElsewhere(rel, delta, rootDir), ...dropCollidingAdditions(rel, delta, ours, rootDir)]
      : [];
    if (TW.deltaIsEmpty(rel, delta)) {
      return { ok: false, reason: filtered.length ? 'claimed_by_other_driver' : 'no_bastien_additions' };
    }
    const res = applyOne(rel, `${JSON.stringify(delta, null, 2)}\n`, rootDir);
    return filtered.length ? { ...res, filtered } : res;
  }
  // A file inside a driver folder the target does not have is a new driver → manual review.
  const drv = /^drivers\/([^/]+)\//.exec(rel);
  if (drv && ours == null && !fs.existsSync(path.join(rootDir, 'drivers', drv[1], 'driver.compose.json'))) {
    return { ok: false, reason: 'new_driver_manual_review' };
  }
  const d = TW.decideThreeWay({ base: baseText, ours, theirs }, io.mergeFileText || TW.mergeFileText);
  if (d.action === 'skip') {
    const out = { ok: false, reason: d.reason };
    if (d.conflicts) {out.conflicts = d.conflicts;}
    if (d.dropped) {out.dropped = d.dropped;}
    return out;
  }
  if (d.action === 'merge') {
    if (/^docs\//.test(rel) && !isAdditiveDoc(ours, d.text)) {
      return { ok: false, reason: 'docs_not_additive_target_ahead' };
    }
    fs.writeFileSync(path.join(rootDir, rel), d.text);
    return { ok: true, mode: 'merge_three_way' };
  }
  const res = applyOne(rel, d.text, rootDir);
  return res.ok ? { ...res, mode: d.action === 'create' ? 'create_bastien' : 'take_bastien_target_unchanged' } : res;
}

/** P3019c: true when every non-blank line of targetBody is still present in incomingBody. */
function isAdditiveDoc(targetBody, incomingBody) {
  const have = new Set(String(incomingBody || '').split(/\r?\n/).map((l) => l.trimEnd()));
  return String(targetBody || '').split(/\r?\n/).every((l) => !l.trim() || have.has(l.trimEnd()));
}

/**
 * P3019c: after a promote/sync, rebuild the branch-specific generated docs from the TARGET tree's
 * own code and return the changed outputs, to stage alongside the promoted files.
 */
/**
 * P3019d: a promoted test file must pass on the TARGET tree, else it is restored (or removed when
 * it was created) and reported as `test_fails_on_target`. `run(rootDir, rel)` returns true on pass.
 */
function defaultRunTest(rootDir, rel) {
  try {
    execSync(`"${process.execPath}" --test "${rel}"`, { cwd: rootDir, stdio: 'ignore', timeout: 180000 });
    return true;
  } catch {
    return false;
  }
}

function composeDriverIds(applied) {
  return applied.map((a) => /^drivers\/([^/]+)\/driver\.compose\.json$/.exec(a.rel)).filter(Boolean).map((m) => m[1]);
}

function verifyPromotedTests(rootDir, applied, originals, run = defaultRunTest) {
  const kept = [];
  const reverted = [];
  for (const a of applied) {
    if (!/^test\/.+\.test\.js$/.test(a.rel) || run(rootDir, a.rel)) {
      kept.push(a);
      continue;
    }
    const abs = path.join(rootDir, a.rel);
    const before = originals.get(a.rel);
    if (before == null) {fs.rmSync(abs, { force: true });}
    else {fs.writeFileSync(abs, before);}
    reverted.push({ rel: a.rel, reason: 'test_fails_on_target' });
  }
  return { kept, reverted };
}

/**
 * P3019d: target-side locks. A target branch may pin a driver differently (stable keeps
 * switch_4gang relay-only, P2457). For every promoted compose, run the target's critical tests that
 * name that driver; a test that passed before the promote and fails after reverts the composes it
 * names (reason `target_test_lock`). Pre-existing failures are left alone.
 */
function guardComposeLocks(rootDir, applied, originals, run = defaultRunTest) {
  const ids = composeDriverIds(applied);
  if (!ids.length) {return { kept: applied, reverted: [] };}
  const tdir = path.join(rootDir, 'test', 'critical');
  const tests = fs.existsSync(tdir) ? fs.readdirSync(tdir).filter((f) => f.endsWith('.test.js')) : [];
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const byTest = new Map();
  for (const t of tests) {
    const body = fs.readFileSync(path.join(tdir, t), 'utf8');
    const named = ids.filter((id) => new RegExp(`(^|[^A-Za-z0-9_])${esc(id)}([^A-Za-z0-9_]|$)`).test(body));
    if (named.length) {byTest.set(`test/critical/${t}`, named);}
  }
  const revertedIds = new Set();
  const why = new Map();
  for (const [t, named] of byTest) {
    const live = named.filter((id) => !revertedIds.has(id));
    if (!live.length || run(rootDir, t)) {continue;}
    const swap = live.map((id) => {
      const rel = `drivers/${id}/driver.compose.json`;
      const abs = path.join(rootDir, rel);
      const now = fs.readFileSync(abs, 'utf8');
      fs.writeFileSync(abs, originals.get(rel));
      return { id, abs, now };
    });
    if (run(rootDir, t)) {
      for (const x of swap) {
        revertedIds.add(x.id);
        why.set(x.id, t);
      }
    } else {
      for (const x of swap) {fs.writeFileSync(x.abs, x.now);}
    }
  }
  const kept = [];
  const reverted = [];
  for (const a of applied) {
    const m = /^drivers\/([^/]+)\/driver\.compose\.json$/.exec(a.rel);
    if (m && revertedIds.has(m[1])) {reverted.push({ rel: a.rel, reason: 'target_test_lock', test: why.get(m[1]) });}
    else {kept.push(a);}
  }
  return { kept, reverted };
}

function regenerateAfterPromote(rootDir, regen = regenerateBranchDocs) {
  try {
    const res = regen(rootDir) || {};
    return Array.isArray(res.changed) ? res.changed : [];
  } catch (e) {
    console.warn('[bastien-promote] branch docs regeneration skipped:', e.message);
    return [];
  }
}

function commitIfNeeded(rootDir, message, files, regenerated = []) {
  if (!files.length) {return false;}
  // WHY(2026-10-10 workflow audit): a merged driver.compose.json from Bastien can carry fingerprint
  // entries that the dual-couple resolution removed on purpose (lib/data/dual-couple-legacy.json).
  // Strip them again before staging, like safe-auto-commit does for the enrichment workflows.
  const legacyTool = path.join(rootDir, 'tools', 'ci', 'enforce-dual-couple-legacy.js');
  if (files.some((f) => /^drivers\/[^/]+\/driver\.compose\.json$/.test(f) || f === 'app.json') && fs.existsSync(legacyTool)) {
    try {
      execSync(`"${process.execPath}" "${legacyTool}" --root="${rootDir}"`, { cwd: rootDir, stdio: 'inherit' });
    } catch (e) { console.warn('[bastien-promote] legacy enforcement skipped:', e.message); }
  }
  // WHY(2026-10-11): never let the promote undo pins / sacred-keep / curated removals /
  // golden couples on the target branch — restore offending files, skip commit if still dirty.
  const guardTool = path.join(__dirname, 'automation-couple-guard.js');
  if (fs.existsSync(guardTool)) {
    try {
      execSync(`"${process.execPath}" "${guardTool}" --revert`, {
        cwd: rootDir, stdio: 'inherit', env: { ...process.env, GUARD_ROOT: rootDir },
      });
    } catch (e) {
      console.warn('[bastien-promote] couple guard still dirty — commit skipped:', e.message);
      return false;
    }
  }
  sh('git config user.name "github-actions[bot]"', { cwd: rootDir });
  sh('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"', { cwd: rootDir });
  for (const f of files) {
    sh(`git add -- "${f}"`, { cwd: rootDir });
  }
  const staged = sh('git diff --cached --name-only', { cwd: rootDir });
  if (!staged) {return false;}
  // Avoid identity files if somehow staged
  for (const bad of FORBIDDEN_PATHS) {
    if (staged.split(/\n/).includes(bad)) {
      sh(`git reset HEAD -- "${bad}"`, { cwd: rootDir });
    }
  }
  // P3019d: app.json may ride along only when its diff is appended driver fingerprints.
  if (files.includes('app.json')) {
    let headApp = null;
    try { headApp = execSync('git show HEAD:app.json', { cwd: rootDir, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }); } catch { headApp = null; }
    if (headApp && appJsonFingerprintOnly(rootDir, headApp)) {
      sh('git add -- app.json', { cwd: rootDir });
    }
  }
  // P3019c: a branch-specific doc may only be committed when it was regenerated on this tree.
  for (const f of (sh('git diff --cached --name-only', { cwd: rootDir }) || '').split(/\n/).filter(Boolean)) {
    if (isBranchSpecific(f) && !regenerated.includes(f)) {
      sh(`git reset HEAD -- "${f}"`, { cwd: rootDir });
    }
  }
  const still = sh('git diff --cached --name-only', { cwd: rootDir });
  if (!still) {return false;}
  try {
    execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const ssot = loadSsot();
  if (ssot.enrichment?.direction !== 'bastien_to_public_only') {
    throw new Error('SSOT enrichment.direction must be bastien_to_public_only');
  }

  const ref = ensureBastienRef();
  const allChanged = listBastienChangedFiles(ref);
  const candidates = allChanged.filter(isPromotable);
  const blocked = allChanged.filter(isForbidden);
  const autoSafe = candidates.filter(classifyAutoSafe).slice(0, MAX_AUTO_FILES);
  const manual = candidates.filter((f) => !classifyAutoSafe(f));

  const applied = [];
  const skipped = [];
  const errors = [];

  const mergeBase = TW.mergeBaseOf(ROOT, ref);
  let appJsonSynced = false;
  if (APPLY) {
    const originals = new Map();
    for (const rel of autoSafe) {
      try {
        originals.set(rel, TW.readWorktree(ROOT, rel));
        const res = promoteOne(rel, ref, ROOT, mergeBase);
        if (res.ok) {applied.push({ rel, ...res, both: isBothReliability(rel) });}
        else {skipped.push({ rel, reason: res.reason || 'apply_failed', ...res.conflicts ? { conflicts: res.conflicts } : {} });}
      } catch (e) {
        errors.push({ rel, error: String(e.message || e) });
      }
    }
    const v = verifyPromotedTests(ROOT, applied, originals);
    applied.splice(0, applied.length, ...v.kept);
    skipped.push(...v.reverted);
    const g = guardComposeLocks(ROOT, applied, originals);
    applied.splice(0, applied.length, ...g.kept);
    skipped.push(...g.reverted);
    appJsonSynced = syncAppJsonFingerprints(ROOT, composeDriverIds(applied));
  }

  let committed = false;
  const branchSpecificSkipped = allChanged.filter(isBranchSpecific);
  let regenerated = [];
  if (APPLY && COMMIT && applied.length) {
    regenerated = regenerateAfterPromote(ROOT);
    committed = commitIfNeeded(
      ROOT,
      'chore(P2607): autonomous Bastien→master promote [skip ci]',
      [...applied.map((a) => a.rel), ...regenerated, ...appJsonSynced ? ['app.json'] : []],
      regenerated,
    );
    if (committed) {
      sh('git pull --rebase origin master || true');
      try {
        execSync('git push origin HEAD:master', { cwd: ROOT, stdio: 'inherit', env: process.env });
      } catch (e) {
        errors.push({ rel: '_push_master', error: String(e.message || e) });
      }
    }
  }

  const stableApplied = [];
  if (APPLY && STABLE && applied.some((a) => a.both)) {
    const stableDir = STABLE_ROOT && fs.existsSync(STABLE_ROOT)
      ? STABLE_ROOT
      : null;
    if (!stableDir) {
      skipped.push({
        rel: '_stable',
        reason: 'STABLE_ROOT unset — set env to Documents/homey/stable or CI checkout path',
      });
    } else {
      // Ensure stable is on stable-v5
      sh('git fetch origin stable-v5 || true', { cwd: stableDir });
      sh('git checkout stable-v5 || git checkout -B stable-v5 origin/stable-v5 || true', { cwd: stableDir });
      sh('git pull --rebase origin stable-v5 || true', { cwd: stableDir });
      // P3019d: stable has its own merge-base with Bastien — decide three-way against stable.
      sh('git fetch origin bastien-home || true', { cwd: stableDir });
      const stableBase = TW.mergeBaseOf(stableDir, ref);
      const stableOriginals = new Map();
      for (const a of applied.filter((x) => x.both)) {
        try {
          stableOriginals.set(a.rel, TW.readWorktree(stableDir, a.rel));
          const res = promoteOne(a.rel, ref, stableDir, stableBase, TW, { masterRoot: ROOT });
          if (res.ok) {stableApplied.push({ rel: a.rel, ...res });}
          else {skipped.push({ rel: `stable:${a.rel}`, reason: res.reason || 'apply_failed' });}
        } catch (e) {
          errors.push({ rel: `stable:${a.rel}`, error: String(e.message || e) });
        }
      }
      const sv = verifyPromotedTests(stableDir, stableApplied, stableOriginals);
      stableApplied.splice(0, stableApplied.length, ...sv.kept);
      skipped.push(...sv.reverted.map((r) => ({ ...r, rel: `stable:${r.rel}` })));
      const sg = guardComposeLocks(stableDir, stableApplied, stableOriginals);
      stableApplied.splice(0, stableApplied.length, ...sg.kept);
      skipped.push(...sg.reverted.map((r) => ({ ...r, rel: `stable:${r.rel}` })));
      const stableAppSynced = syncAppJsonFingerprints(stableDir, composeDriverIds(stableApplied));
      if (COMMIT && stableApplied.length) {
        const stableRegenerated = regenerateAfterPromote(stableDir);
        const ok = commitIfNeeded(
          stableDir,
          'chore(P2607): Bastien BOTH reliability → stable [skip ci]',
          [...stableApplied.map((a) => a.rel), ...stableRegenerated, ...stableAppSynced ? ['app.json'] : []],
          stableRegenerated,
        );
        if (ok) {
          try {
            execSync('git push origin HEAD:stable-v5', {
              cwd: stableDir,
              stdio: 'inherit',
              env: process.env,
            });
          } catch (e) {
            errors.push({ rel: '_push_stable', error: String(e.message || e) });
          }
        }
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? COMMIT ? 'APPLY_COMMIT' : 'APPLY' : 'DRY-RUN',
    direction: 'bastien_home → master (surgical) → stable BOTH',
    neverReverseWholesale: true,
    autonomous: true,
    bastienRef: ref,
    appIdBastien: ssot.appId,
    forbiddenTouched: blocked,
    branchSpecificSkipped,
    mergeBase,
    conflictSkipped: skipped.filter((x) => /conflict_skipped$/.test(x.reason)).map((x) => x.rel),
    targetAheadSkipped: skipped.filter((x) => x.reason === 'target_ahead').map((x) => x.rel),
    appJsonFingerprintsSynced: appJsonSynced,
    targetTestLock: skipped.filter((x) => x.reason === 'target_test_lock').map((x) => `${x.rel} (${x.test})`),
    testFailsOnTarget: skipped.filter((x) => x.reason === 'test_fails_on_target').map((x) => x.rel),
    regenerated,
    candidates,
    candidateCount: candidates.length,
    autoSafe,
    autoSafeCount: autoSafe.length,
    manualReview: manual,
    manualReviewCount: manual.length,
    applied,
    appliedCount: applied.length,
    stableApplied,
    stableAppliedCount: stableApplied.length,
    skipped,
    errors,
    committed,
    note: APPLY
      ? 'AUTO_SAFE complementary merges + BOTH lib/tests applied. Identity never copied. Manual-review left for humans.'
      : 'Dry-run — no working-tree writes except this report.',
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

  console.log('=== bastien-promote-upstream P2607 (autonomous) ===');
  console.log('Mode:', report.mode);
  console.log('Bastien ref:', ref);
  console.log('Candidates:', report.candidateCount, '| AUTO_SAFE:', report.autoSafeCount, '| manual:', report.manualReviewCount);
  console.log('Applied:', report.appliedCount, '| Stable BOTH:', report.stableAppliedCount, '| Committed:', committed);
  for (const a of applied.slice(0, 30)) {console.log('  +', a.mode, a.rel);}
  if (applied.length > 30) {console.log(`  … +${applied.length - 30} more`);}
  for (const e of errors.slice(0, 10)) {console.log('  !', e.rel, e.error);}
  console.log('Report:', OUT);
}

module.exports = {
  isPromotable,
  isForbidden,
  classifyAutoSafe,
  isBothReliability,
  mergeComposeComplementary,
  mergeRegistryCases,
  mergeSacredKeep,
  targetDriverIds,
  listBastienChangedFiles,
  FORBIDDEN_PATHS,
  BRANCH_SPECIFIC_PATHS,
  isBranchSpecific,
  regenerateAfterPromote,
  isAdditiveDoc,
  promoteOne,
  verifyPromotedTests,
  guardComposeLocks,
  dropClaimedElsewhere,
  dropCollidingAdditions,
  restrictToMaster,
  syncAppJsonFingerprints,
  appJsonFingerprintOnly,
  SEMANTIC_MERGE_RE,
  commitIfNeeded,
  PROMOTE_GLOBS,
  BOTH_LIB_RE,
};

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}
