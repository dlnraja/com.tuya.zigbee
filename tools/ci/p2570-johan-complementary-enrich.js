#!/usr/bin/env node
'use strict';

/**
 * P2570 — Johan Bendz complementary enrich (handover completion)
 *
 * WHY: Johan stepped back from Tuya Zigbee; we silently complete his
 *      fingerprints/DPs/case variants as UNION enrichments — never wipe.
 * HOW: Read-only dump → resolve (mfr,pid) via registry/mfs/existing compose
 *      → ComplementaryMerge appendExactIdentityForms (+ OEM TZE200/204/284 siblings).
 * POUR QUI: BOTH tracks (reliability FP coverage).
 * QUAND: Maintainer ask / after Johan farewell / cron optional.
 * CONTRE QUOI: TS0601→generic invent; capability shrink; sacred drop; forum POST.
 *
 *   node tools/ci/p2570-johan-complementary-enrich.js
 *   node tools/ci/p2570-johan-complementary-enrich.js --apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const DUMP_DIR = path.join(ROOT, '.github', 'state', 'johan-dump');
const OUT_DIR = path.join(ROOT, 'reports', `johan-complementary-${new Date().toISOString().slice(0, 10)}`);

const {
  appendExactIdentityForms,
  wouldDegradeCompose,
} = require('../../lib/enrichment/ComplementaryMerge');

let lookup = () => null;
try {
  ({ lookup } = require('../../lib/pairing/UserMisattributionRegistry'));
} catch (_e) { /* soft */ }

const MFR_RE = /_T[YZ][A-Z0-9]*_[A-Za-z0-9]+/gi;
const PID_RE = /\bTS[0-9]{4}[A-Z]?\b|\bZG-[0-9A-Z]+\b/gi;

function loadJson(p, fb) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_e) { return fb; }
}

function dualCaseForms(mfr) {
  const s = String(mfr || '').trim();
  if (!s) return [];
  const forms = new Set([s]);
  if (s.startsWith('_')) {
    forms.add(`_${s.slice(1).toLowerCase()}`);
    forms.add(`_${s.slice(1).toUpperCase()}`);
    // mixed Tuya style: prefix upper, tail lower
    const m = s.match(/^(_T[YZ][A-Z0-9]*_)(.+)$/i);
    if (m) {
      forms.add(`${m[1].toUpperCase()}${m[2].toLowerCase()}`);
      forms.add(`${m[1].toLowerCase()}${m[2].toLowerCase()}`);
      forms.add(`${m[1].toUpperCase()}${m[2].toUpperCase()}`);
    }
  }
  return [...forms];
}

/** OEM Tuya MCU siblings sharing same tail. */
function oemSiblings(mfr) {
  const s = String(mfr || '');
  const m = s.match(/^_TZE(200|204|284)_(.+)$/i);
  if (!m) return [];
  const tail = m[2];
  return [
    `_TZE200_${tail}`,
    `_TZE204_${tail}`,
    `_TZE284_${tail}`,
    `_tze200_${tail.toLowerCase()}`,
    `_tze204_${tail.toLowerCase()}`,
    `_tze284_${tail.toLowerCase()}`,
  ];
}

function indexDrivers() {
  const byMfr = new Map(); // lower mfr → [{driverId, pids}]
  const dir = path.join(ROOT, 'drivers');
  for (const id of fs.readdirSync(dir)) {
    const fp = path.join(dir, id, 'driver.compose.json');
    if (!fs.existsSync(fp)) continue;
    let j;
    try { j = JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (_e) { continue; }
    const mfrs = j.zigbee?.manufacturerName || [];
    const pids = j.zigbee?.productId || [];
    for (const m of mfrs) {
      const k = String(m).toLowerCase();
      if (!byMfr.has(k)) byMfr.set(k, []);
      byMfr.get(k).push({ driverId: id, pids, composePath: fp });
    }
  }
  return byMfr;
}

function resolveDriver(mfr, pid, byMfr, mfs) {
  const reg = lookup(mfr, pid);
  if (reg?.canonicalDriver && fs.existsSync(path.join(ROOT, 'drivers', reg.canonicalDriver, 'driver.compose.json'))) {
    return { driverId: reg.canonicalDriver, reason: `registry:${reg.id || 'case'}`, confidence: 'high' };
  }

  const hits = byMfr.get(String(mfr).toLowerCase()) || [];
  if (hits.length === 1) {
    return { driverId: hits[0].driverId, reason: 'compose-mfr', confidence: 'high' };
  }
  if (hits.length > 1 && pid) {
    const withPid = hits.filter((h) => (h.pids || []).some((p) => String(p).toUpperCase() === String(pid).toUpperCase()));
    if (withPid.length === 1) {
      return { driverId: withPid[0].driverId, reason: 'compose-couple', confidence: 'high' };
    }
  }

  // mfs_db soft
  const entry = mfs?.devices?.[String(mfr).toLowerCase()] || mfs?.devices?.[mfr];
  if (entry?.driverId && fs.existsSync(path.join(ROOT, 'drivers', entry.driverId, 'driver.compose.json'))) {
    return { driverId: entry.driverId, reason: 'mfs_db', confidence: 'medium' };
  }

  // OEM sibling already on a driver → same driver
  for (const sib of oemSiblings(mfr)) {
    const sh = byMfr.get(sib.toLowerCase()) || [];
    if (sh.length === 1) {
      return { driverId: sh[0].driverId, reason: `oem-sibling:${sib}`, confidence: 'medium' };
    }
  }

  return null;
}

function harvestCouples() {
  const couples = new Map(); // key mfr|pid → {mfr,pid,sources}
  const add = (mfr, pid, source) => {
    const m = String(mfr || '').trim();
    const p = String(pid || '').trim().toUpperCase();
    if (!m || !/^_T/i.test(m)) return;
    if (!p) return; // never lock mfr-only
    // junk filters
    if (/ABC123|placeholder|XXXX|000000|invent/i.test(m)) return;
    if (/^_TZE2841000000/i.test(m)) return;
    const key = `${m.toLowerCase()}|${p}`;
    const cur = couples.get(key) || { mfr: m, pid: p, sources: [] };
    if (!cur.sources.includes(source)) cur.sources.push(source);
    couples.set(key, cur);
  };

  const devices = loadJson(path.join(DUMP_DIR, 'devices.json'), []);
  for (const d of devices) {
    const mfrs = d.mfrs || [];
    const pids = d.pids || [];
    for (const m of mfrs) {
      for (const p of pids) add(m, p, `johan-device#${d.issue || '?'}`);
    }
  }

  // Issue titles/bodies often carry couples
  for (const name of ['issues.json', 'issues-open.json']) {
    const issues = loadJson(path.join(DUMP_DIR, name), []);
    if (!Array.isArray(issues)) continue;
    for (const issue of issues) {
      const blob = `${issue.title || ''}\n${issue.body || ''}`;
      const mfrs = [...new Set((blob.match(MFR_RE) || []).map((x) => x.trim()))];
      const pids = [...new Set((blob.match(PID_RE) || []).map((x) => x.toUpperCase()))];
      if (!mfrs.length || !pids.length) continue;
      for (const m of mfrs) {
        for (const p of pids) add(m, p, `johan-issue#${issue.number || issue.id || '?'}`);
      }
    }
  }

  return [...couples.values()];
}

function applyToDriver(driverId, mfrs, pids, byMfr) {
  const fp = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  const before = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const after = JSON.parse(JSON.stringify(before));
  after.zigbee = after.zigbee || {};
  const forms = [];
  for (const m of mfrs) {
    forms.push(...dualCaseForms(m));
    // OEM siblings only if not already locked on another driver
    if (/_TZE(200|204|284)_/i.test(m)) {
      for (const sib of oemSiblings(m)) {
        const hits = byMfr.get(String(sib).toLowerCase()) || [];
        const other = hits.filter((h) => h.driverId !== driverId);
        if (other.length) continue; // Contre quoi: cross-driver bleed
        forms.push(sib);
      }
    }
  }
  after.zigbee.manufacturerName = appendExactIdentityForms(after.zigbee.manufacturerName, forms);
  after.zigbee.productId = appendExactIdentityForms(after.zigbee.productId, pids);
  if (wouldDegradeCompose(before, after)) {
    return { ok: false, reason: 'would_degrade' };
  }
  const addedMfr = (after.zigbee.manufacturerName?.length || 0) - (before.zigbee.manufacturerName?.length || 0);
  const addedPid = (after.zigbee.productId?.length || 0) - (before.zigbee.productId?.length || 0);
  if (addedMfr === 0 && addedPid === 0) return { ok: true, changed: false };
  if (APPLY) {
    fs.writeFileSync(fp, `${JSON.stringify(after, null, 2)}\n`);
  }
  return { ok: true, changed: true, addedMfr, addedPid };
}

function main() {
  console.log(`[P2570] Johan complementary enrich — ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  if (!fs.existsSync(path.join(DUMP_DIR, 'devices.json'))) {
    console.error('Missing johan dump. Run: node tools/ci/johan-dump.js');
    process.exit(1);
  }

  const byMfr = indexDrivers();
  const mfs = loadJson(path.join(ROOT, 'data', 'mfs_db.json'), { devices: {} });
  const couples = harvestCouples();
  console.log(`[P2570] harvested couples: ${couples.length}`);

  const applied = [];
  const skipped = [];
  const byDriver = new Map();

  for (const c of couples) {
    const res = resolveDriver(c.mfr, c.pid, byMfr, mfs);
    if (!res || res.confidence === 'low') {
      skipped.push({ ...c, reason: res ? res.reason : 'unresolved' });
      continue;
    }
    // Refuse dangerous catch-alls
    if (/generic_tuya|zigbee_universal|unknown/i.test(res.driverId) && /TS0601/i.test(c.pid)) {
      skipped.push({ ...c, reason: 'refuse_ts0601_generic', driverId: res.driverId });
      continue;
    }
    const key = res.driverId;
    if (!byDriver.has(key)) byDriver.set(key, { mfrs: new Set(), pids: new Set(), sources: [] });
    const bucket = byDriver.get(key);
    bucket.mfrs.add(c.mfr);
    bucket.pids.add(c.pid);
    bucket.sources.push(...c.sources);
  }

  for (const [driverId, bucket] of byDriver) {
    const r = applyToDriver(driverId, [...bucket.mfrs], [...bucket.pids], byMfr);
    applied.push({
      driverId,
      mfrCount: bucket.mfrs.size,
      pidCount: bucket.pids.size,
      ...r,
    });
  }

  // Dual-case completion for every Johan mfr already on a driver (even without pid resolve)
  let caseBoost = 0;
  const devices = loadJson(path.join(DUMP_DIR, 'devices.json'), []);
  const seenMfr = new Set();
  for (const d of devices) {
    for (const m of d.mfrs || []) {
      const k = String(m).toLowerCase();
      if (seenMfr.has(k)) continue;
      seenMfr.add(k);
      const hits = byMfr.get(k) || [];
      for (const h of hits) {
        const r = applyToDriver(h.driverId, [m], [], byMfr);
        if (r.changed) caseBoost += 1;
      }
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const report = {
    id: 'P2570',
    mode: APPLY ? 'apply' : 'dry-run',
    generatedAt: new Date().toISOString(),
    harvested: couples.length,
    driversTouched: applied.filter((a) => a.changed).length,
    applied,
    skipped: skipped.slice(0, 200),
    skippedTotal: skipped.length,
    caseBoost,
    policy: {
      brandingFree: true,
      neverInventPid: true,
      refuseTs0601Generic: true,
      complementaryOnly: true,
      forumPost: false,
      source: 'JohanBendz/com.tuya.zigbee read-only dump',
    },
  };
  fs.writeFileSync(path.join(OUT_DIR, 'REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'REPORT.md'), [
    '# P2570 Johan complementary enrich',
    '',
    `Mode: **${report.mode}** · harvested couples: ${report.harvested}`,
    `Drivers changed: ${report.driversTouched} · skipped: ${report.skippedTotal} · caseBoost: ${caseBoost}`,
    '',
    'Silent only — never forum POST. Never invent pid. Union/append only (P2520).',
    '',
  ].join('\n'));

  console.log(`[P2570] drivers changed=${report.driversTouched} skipped=${report.skippedTotal} caseBoost=${caseBoost}`);
  console.log(`[P2570] report → ${OUT_DIR}`);
  if (!APPLY) console.log('[P2570] re-run with --apply to write compose unions');
}

main();
