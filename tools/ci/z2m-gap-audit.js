#!/usr/bin/env node
'use strict';
/**
 * z2m-gap-audit.js (P92.80 — réimplémentation enrichie de l'outil P64.13 supprimé)
 * Cross-reference our 431 drivers against the Z2M herdsman cache:
 *  1. Coverage: which of OUR fingerprints are known to Z2M (and with which exposes)
 *  2. Gaps: Z2M-known devices our drivers DON'T claim (candidates to import)
 *  3. Expose gaps: for shared devices, Z2M exposes our drivers likely miss
 *     (rough capability-class comparison: battery/energy/cover/lock/fan…)
 *
 * Output: .github/state/z2m-gap-audit.json + console summary.
 * Usage: node tools/ci/z2m-gap-audit.js [--gaps-only]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const GAPS_ONLY = process.argv.includes('--gaps-only');

const cachePath = path.join(ROOT, 'data', 'z2m_herdsman_cache.json');
if (!fs.existsSync(cachePath)) {
  console.log('[z2m-gap-audit] data/z2m_herdsman_cache.json absent — skip');
  process.exit(0);
}
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

// Z2M: mfr (lower) -> { exposes:Set, models:Set, vendors:Set }
const z2mByMfr = {};
for (const d of cache.devices || []) {
  for (const m of (d.mfrs || [])) {
    const k = String(m).toLowerCase();
    if (!z2mByMfr[k]) {z2mByMfr[k] = { exposes: new Set(), models: new Set(), vendors: new Set() };}
    for (const e of (d.exposes || [])) {z2mByMfr[k].exposes.add(typeof e === 'string' ? e : e.name || JSON.stringify(e));}
    if (d.model) {z2mByMfr[k].models.add(d.model);}
    if (d.vendor) {z2mByMfr[k].vendors.add(d.vendor);}
  }
}

// Ours: mfr (lower) -> { drivers:Set, pids:Set }
const oursByMfr = {};
for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
  const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
  if (!fs.existsSync(p)) {continue;}
  try {
    const c = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const m of (c.zigbee?.manufacturerName || [])) {
      const k = String(m).toLowerCase();
      if (!oursByMfr[k]) {oursByMfr[k] = { drivers: new Set(), pids: new Set() };}
      oursByMfr[k].drivers.add(d);
      for (const pid of (c.zigbee?.productId || [])) {oursByMfr[k].pids.add(pid);}
    }
  } catch { /* skip */ }
}

const report = { generated: new Date().toISOString(), covered: 0, oursOnly: 0, z2mOnly: [], exposeHints: [] };

const CAP_HINTS = [
  { rx: /battery/i, hint: 'battery' },
  { rx: /power_on_behavior|power_outage/i, hint: 'power_on_behavior' },
  { rx: /countdown|timer/i, hint: 'countdown' },
  { rx: /backlight|indicator/i, hint: 'backlight/indicator' },
  { rx: /child_lock/i, hint: 'child_lock' },
  { rx: /calibrat/i, hint: 'calibration' },
  { rx: /schedule|programming|weekly/i, hint: 'schedule' },
  { rx: /scene|action/i, hint: 'scenes/actions' },
  { rx: /energy|power(?!_on)/i, hint: 'energy metering' },
  { rx: /voltage|current/i, hint: 'voltage/current' }
];

for (const [k, z] of Object.entries(z2mByMfr)) {
  const ours = oursByMfr[k];
  if (ours) {
    report.covered++;
    // expose hints: what Z2M exposes that might not be covered
    const hints = new Set();
    for (const e of z.exposes) {
      for (const h of CAP_HINTS) {if (h.rx.test(e)) {hints.add(h.hint);}}
    }
    if (hints.size) {
      report.exposeHints.push({ mfr: k, drivers: [...ours.drivers].slice(0, 3), z2mFeatures: [...hints].slice(0, 6) });
    }
  } else {
    report.oursOnly++;
    report.z2mOnly.push({ mfr: k, models: [...z.models].slice(0, 3), vendors: [...z.vendors].slice(0, 2), exposes: z.exposes.size });
  }
}

report.exposeHints.sort((a, b) => b.z2mFeatures.length - a.z2mFeatures.length);
report.z2mOnly.sort((a, b) => b.exposes - a.exposes);

fs.writeFileSync(path.join(ROOT, '.github', 'state', 'z2m-gap-audit.json'), JSON.stringify(report, null, 1));

console.log(`[z2m-gap-audit] ${report.covered} mfrs couverts (nous + Z2M) | ${report.oursOnly} connus de Z2M NON claimés chez nous`);
if (!GAPS_ONLY) {
  console.log(`\nTop candidats à importer (connus Z2M, absents chez nous):`);
  for (const g of report.z2mOnly.slice(0, 15)) {
    console.log(`  ${g.mfr} (${g.models.join(', ') || '?'} — ${g.exposes} exposes)`);
  }
  console.log(`\nTop features Z2M à vérifier chez nous (appareils partagés):`);
  for (const h of report.exposeHints.slice(0, 15)) {
    console.log(`  ${h.mfr} → ${h.z2mFeatures.join(', ')} [${h.drivers.join(', ')}]`);
  }
}
