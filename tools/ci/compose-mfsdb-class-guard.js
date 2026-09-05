#!/usr/bin/env node
'use strict';
/**
 * compose-mfsdb-class-guard.js (P92.68)
 * mfs_db.json is the CURATED per-device truth (mfr → driverId). A driver
 * compose claiming the same mfr with a DIFFERENT driverId means one of the
 * two is wrong — this is exactly how the Dooya curtain motor ended up
 * pairing as a climate_sensor (corpus report, cross-cutting finding).
 *
 * Checks every curated mfs_db key against all driver.compose.json claims:
 *  - CLAIMED-ELSEWHERE: compose(s) other than the curated driver claim the mfr
 *  - UNCLAIMED: curated driver doesn't claim the mfr at all
 *
 * Known sharing families (multiple drivers legitimately claiming the same
 * mfr — e.g. gang-count variants) live in ALLOWED_MULTI below the threshold:
 * a curated mfr claimed by the curated driver + others is only reported
 * when the curated driver does NOT claim it or when NONE of the claimers
 * is the curated driver.
 *
 * Exit code 1 in --check mode when mismatches exist (CI gate).
 *
 * Usage: node tools/ci/compose-mfsdb-class-guard.js [--check]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CHECK = process.argv.includes('--check');
const SYNTHETIC_RX = /_disabled|_dummy|_generic|_hybrid|_master|placeholder|needs_/i;

// Doctrine Sacred Couple: ces drivers claiment VOLONTAIREMENT large (filets
// de sécurité); mfs_db reste la vérité curée pour le routage. Leurs claims
// ne contredisent pas la curation.
const WIDE_CLAIM_DRIVERS = new Set([
  'universal_zigbee', 'generic_tuya', 'generic_diy', 'universal_fallback',
  'tuya_dummy_device', 'device_generic_diy_universal', 'gateway_zigbee_bridge',
  'hybrid_light_sensor', 'usb_dongle_triple', 'switch_usb_dongle'
]);

const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json'), 'utf8'));

// Index every compose claim: normalized mfr -> Set(driverIds)
const claims = new Map();
for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
  const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
  if (!fs.existsSync(p)) {continue;}
  try {
    const c = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const m of c.zigbee?.manufacturerName || []) {
      if (SYNTHETIC_RX.test(m)) {continue;}
      const k = String(m).toLowerCase();
      if (!claims.has(k)) {claims.set(k, new Set());}
      claims.get(k).add(d);
    }
  } catch { /* ignore */ }
}

const claimedElsewhere = [];
const unclaimed = [];
for (const [mfr, entry] of Object.entries(db)) {
  if (!entry || typeof entry !== 'object' || !entry.driverId) {continue;}
  if (SYNTHETIC_RX.test(mfr)) {continue;}
  const k = mfr.toLowerCase();
  const claimers = claims.get(k);
  if (!claimers || claimers.size === 0) {
    unclaimed.push({ mfr, curated: entry.driverId });
  } else if (!claimers.has(entry.driverId)) {
    const specific = [...claimers].filter(d => !WIDE_CLAIM_DRIVERS.has(d));
    if (specific.length > 0) {
      claimedElsewhere.push({ mfr, curated: entry.driverId, claimedBy: specific, modelIds: entry.modelIds || [] });
    }
  }
}

// v10.7.0: Sacred-Couple refinement — a mismatch only matters at PAIRING
// when the (mfr, pid) PAIR is also claimed by the wrong driver. When pids
// differ, Homey's mfr+pid matching routes correctly despite shared mfrs.
const pidClaims = new Map(); // `${mfr}|${pid}` -> Set(driverIds)
for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
  const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
  if (!fs.existsSync(p)) {continue;}
  try {
    const c = JSON.parse(fs.readFileSync(p, 'utf8'));
    const mfrs = c.zigbee?.manufacturerName || [];
    const pids = c.zigbee?.productId || [];
    for (const m of mfrs) {
      for (const pid of pids) {
        const key = `${String(m).toLowerCase()}|${String(pid).toLowerCase()}`;
        if (!pidClaims.has(key)) {pidClaims.set(key, new Set());}
        pidClaims.get(key).add(d);
      }
    }
  } catch { /* ignore */ }
}

const pairConflicts = [];
for (const i of claimedElsewhere) {
  const pids = i.modelIds.length ? i.modelIds : [null];
  for (const pid of pids) {
    const key = pid ? `${i.mfr.toLowerCase()}|${String(pid).toLowerCase()}` : null;
    // sans pid connu: le conflit mfr-level est conservé tel quel
    if (!key) { pairConflicts.push({ ...i, pid: null }); continue; }
    const pairClaimers = [...(pidClaims.get(key) || [])].filter(d => !WIDE_CLAIM_DRIVERS.has(d));
    if (pairClaimers.length && !pairClaimers.includes(i.curated)) {
      pairConflicts.push({ ...i, pid, pairClaimedBy: pairClaimers });
    }
  }
}

console.log(`[compose-mfsdb-guard] ${Object.keys(db).length} entrées mfs_db vérifiées`);
console.log(`  MFR-LEVEL (mfr curé ailleurs, pid inconnu ou partagé): ${claimedElsewhere.length}`);
console.log(`  PAIR-CONFLICTS (même mfr+pid claimé par le mauvais driver — vrais bugs Dooya): ${pairConflicts.length}`);
for (const i of pairConflicts.slice(0, 25)) {
  console.log(`    ${i.mfr} (${i.pid || '?'}): curé=${i.curated} mais la PAIRE est claimée par ${(i.pairClaimedBy || i.claimedBy).join(', ')}`);
}
console.log(`  UNCLAIMED (driver curé ne claim pas le mfr): ${unclaimed.length}`);
for (const i of unclaimed.slice(0, 10)) {
  console.log(`    ${i.mfr}: curé=${i.curated}`);
}

fs.writeFileSync(
  path.join(ROOT, '.github', 'state', 'compose-mfsdb-guard.json'),
  JSON.stringify({ generated: new Date().toISOString(), pairConflicts, claimedElsewhere, unclaimed }, null, 1)
);

if (CHECK && (pairConflicts.length > 0 || unclaimed.length > 0)) {
  console.log('[compose-mfsdb-guard] --check: échec');
  process.exit(1);
}
console.log('[compose-mfsdb-guard] OK');
