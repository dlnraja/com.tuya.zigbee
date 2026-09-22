'use strict';

/**
 * P2675 — Curated fingerprints ← sacred-keep complementary enrich
 *
 * WHY: P2674 skips broad lib/tuya/fingerprints.json (~0.9MB) under Homey heap
 *      pressure. Curated data/fingerprints.json must carry max sacred-couple
 *      coverage so boot still routes correctly without inventing pids.
 * HOW: Union publish-sacred-keep-couples into curated (ComplementaryMerge);
 *      add case variants (lower/UPPER) without wiping entries.
 * WHO: Homey runtime BOTH tracks (reliability).
 * WHEN: enrich cron / agent deep-coverage / before publish after P2674.
 * AGAINST: empty curated under pressure → Unknown / wrong driver after OOM harden.
 *
 * Usage:
 *   node tools/ci/p2675-curated-fingerprint-sacred-enrich.js           # dry-run
 *   node tools/ci/p2675-curated-fingerprint-sacred-enrich.js --apply
 *   node tools/ci/p2675-curated-fingerprint-sacred-enrich.js --check
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CURATED = path.join(ROOT, 'data', 'fingerprints.json');
const KEEP = path.join(ROOT, 'config', 'architecture', 'publish-sacred-keep-couples.json');
const MAX_CURATED_BYTES = 200 * 1024; // leave headroom under P2674 256KB pressure gate

const { unionStrings } = require('../../lib/enrichment/ComplementaryMerge');

function caseVariants(mfr) {
  const s = String(mfr || '');
  if (!s) return [];
  const out = [s];
  const low = s.toLowerCase();
  const up = s.toUpperCase();
  if (low !== s) out.push(low);
  if (up !== s && up !== low) out.push(up);
  return out;
}

function buildFromKeep(keep) {
  const byMfr = {};
  for (const c of keep.couples || []) {
    if (!c || !c.mfr || !c.pid || !c.driverId) continue;
    const mfr = String(c.mfr);
    if (!byMfr[mfr]) {
      byMfr[mfr] = {
        driverId: c.driverId,
        type: c.driverId,
        powerSource: c.powerSource || null,
        modelIds: [],
      };
    }
    byMfr[mfr].modelIds = unionStrings(byMfr[mfr].modelIds, [c.pid]);
    if (!byMfr[mfr].driverId) byMfr[mfr].driverId = c.driverId;
  }
  return byMfr;
}

function mergeCurated(curated, fromKeep) {
  const out = { ...curated };
  let added = 0;
  let updated = 0;

  for (const [mfr, fp] of Object.entries(fromKeep)) {
    for (const variant of caseVariants(mfr)) {
      if (!out[variant]) {
        out[variant] = {
          driverId: fp.driverId,
          type: fp.type || fp.driverId,
          powerSource: fp.powerSource || null,
          modelIds: [...(fp.modelIds || [])],
        };
        added += 1;
        continue;
      }
      const before = JSON.stringify(out[variant].modelIds || []);
      out[variant].modelIds = unionStrings(out[variant].modelIds, fp.modelIds);
      if (!out[variant].driverId) out[variant].driverId = fp.driverId;
      if (!out[variant].type) out[variant].type = fp.type || fp.driverId;
      if (JSON.stringify(out[variant].modelIds) !== before) updated += 1;
    }
  }
  return { out, added, updated };
}

function main() {
  const apply = process.argv.includes('--apply');
  const check = process.argv.includes('--check');

  const keep = JSON.parse(fs.readFileSync(KEEP, 'utf8'));
  const curated = JSON.parse(fs.readFileSync(CURATED, 'utf8'));
  const fromKeep = buildFromKeep(keep);
  const { out, added, updated } = mergeCurated(curated, fromKeep);
  const json = `${JSON.stringify(out, null, 2)}\n`;
  const bytes = Buffer.byteLength(json);

  const summary = {
    sacredCouples: (keep.couples || []).length,
    curatedBefore: Object.keys(curated).length,
    curatedAfter: Object.keys(out).length,
    added,
    updated,
    bytes,
    maxBytes: MAX_CURATED_BYTES,
  };

  if (bytes > MAX_CURATED_BYTES) {
    console.error('[P2675] FAIL curated would exceed pressure budget', summary);
    process.exit(1);
  }

  // Contre quoi: every sacred-keep mfr must resolve in curated after merge
  const missing = [];
  for (const c of keep.couples || []) {
    if (!c?.mfr) continue;
    const hit = caseVariants(c.mfr).some((v) => out[v]?.driverId === c.driverId
      || (out[v]?.modelIds || []).map((x) => String(x).toLowerCase()).includes(String(c.pid).toLowerCase()));
    if (!hit && !caseVariants(c.mfr).some((v) => out[v])) missing.push(`${c.mfr}+${c.pid}`);
  }

  if (check) {
    if (missing.length) {
      console.error('[P2675] FAIL missing curated coverage', missing.slice(0, 20));
      process.exit(1);
    }
    if (Object.keys(curated).length < 100) {
      console.error('[P2675] FAIL curated too thin for pressure boot', Object.keys(curated).length);
      process.exit(1);
    }
    console.log('[P2675] OK', summary);
    process.exit(0);
  }

  console.log('[P2675]', apply ? 'APPLY' : 'DRY-RUN', summary);
  if (missing.length) console.log('[P2675] would cover previously missing', missing.length);

  if (apply) {
    fs.writeFileSync(CURATED, json);
    console.log('[P2675] wrote', CURATED);
  }
}

main();
