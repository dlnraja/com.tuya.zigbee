#!/usr/bin/env node
'use strict';

/**
 * Cross-source investigation of every locked peculiarity (registry + compound DB).
 *
 * WHY: Agents must reuse proven (mfr, pid) facts instead of inventing SKUs.
 * HOW: Registry × DeviceFingerprintDB × Z2M fps × compose clusters.
 * WHO: IDE / CI. docs/ is not in the Homey bundle.
 * WHEN: After registry or compose edits; this investigation session.
 * AGAINST: mfr-only routing, TS0207-as-rain without couple, climate reclaim.
 *
 * Usage: node tools/ci/investigate-device-peculiarities.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'docs', 'knowledge');
const { FINGERPRINT_DB } = require('../../lib/DeviceFingerprintDB');

function bufParse(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(Buffer.from(fs.readFileSync(p)).toString('utf8'));
}

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function uniq(list) {
  return [...new Set((list || []).filter(Boolean))];
}

const CLASS_NOTES = [
  'Sleepy IAS (SOS / water / contact): enroll on wake, skip boot CIE poll, no leftover EF00 TX.',
  'Pid TS0207 is shared: k4ej3ww2 = IAS water (Z2M IH-K665); 5k5vh43t family = mains repeater. Default driver is null.',
  'Pid TS011F is shared: metering plug (okaz9tjs poll fw 1.0.5), double outlet, DIN, USB wall, strip.',
  'MCU dimmer brightness is 0–1000 (TuyaBrightnessScale). Never write >1000 (Z2M #32305).',
  'nt4pquef soil: DP2 = light enum, DP3 = moisture, DP5 = temp/10, DP15 = battery. Do not compose 0xED00. Retail SGS02Z is not a pid.',
  'Local scripts/data/z2m-data.json is a stale FP dump — missing dump ≠ missing device. Prefer issue URLs.',
];

function loadZ2mIndex() {
  const data = bufParse('scripts/data/z2m-data.json');
  const byMfr = new Map();
  for (const row of data?.fps || []) {
    const pid = row.m;
    for (const mfr of row.f || []) {
      const key = norm(mfr);
      if (!byMfr.has(key)) byMfr.set(key, new Set());
      if (pid) byMfr.get(key).add(pid);
    }
  }
  return byMfr;
}

function composeFacts(driverId, wantedPids) {
  const p = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(p)) return { exists: false };
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  const zigbee = c.zigbee || {};
  const clusters = new Set();
  for (const ep of Object.values(zigbee.endpoints || {})) {
    for (const id of ep.clusters || []) clusters.add(id);
  }
  const pids = zigbee.productId || [];
  return {
    exists: true,
    class: c.class || null,
    pids,
    pidMatch: (wantedPids || []).filter((pid) => pids.includes(pid)),
    endpointCount: Object.keys(zigbee.endpoints || {}).length,
    hasEf00: clusters.has(61184),
    hasIas: clusters.has(1280),
    batteries: c.energy?.batteries || [],
    capabilities: (c.capabilities || []).slice(0, 12),
  };
}

function main() {
  const registry = bufParse('data/user-misattribution-registry.json') || { cases: [] };
  const z2m = loadZ2mIndex();
  const dbKeys = Object.keys(FINGERPRINT_DB);

  const rows = [];
  for (const c of registry.cases || []) {
    const mfrs = [].concat(c.mfr || []);
    const pids = [].concat(c.productId || []);
    const z2mPids = uniq(mfrs.flatMap((m) => [...(z2m.get(norm(m)) || [])]));
    const compoundHits = [];
    for (const mfr of mfrs) {
      for (const pid of pids) {
        const hit = FINGERPRINT_DB[`${mfr}|${pid}`] || FINGERPRINT_DB[`${mfr.toLowerCase()}|${pid}`];
        if (hit) compoundHits.push({ key: `${mfr}|${pid}`, ...hit });
      }
    }
    const compose = composeFacts(c.canonicalDriver, pids);
    const gaps = [];
    if (!compoundHits.length) gaps.push('no_compound_db_key');
    if (!compose.exists) gaps.push('compose_missing');
    if (compose.exists && !compose.pidMatch.length) gaps.push('compose_pid_mismatch');
    if (!(c.sources || []).length) gaps.push('no_sources');
    // Local Z2M dump is stale (2026-02). Only flag if we also lack any source URL.
    if (!z2mPids.length && !(c.sources || []).length) gaps.push('not_in_local_z2m_fps');

    rows.push({
      id: c.id,
      driver: c.canonicalDriver,
      protocol: c.protocol || null,
      mfrs: mfrs.slice(0, 8),
      pids,
      forbidden: (c.forbiddenDrivers || []).slice(0, 8),
      notes: c.notes || null,
      sources: c.sources || [],
      retailNames: c.retailNames || [],
      z2mPids,
      z2mHit: z2mPids.some((p) => pids.includes(p)),
      compound: compoundHits.map((h) => ({
        key: h.key,
        driver: h.driver,
        protocol: h.protocol,
        dp: h.dp || null,
        notes: h.notes || null,
        powerSource: h.powerSource || null,
      })),
      compose,
      gaps,
    });
  }

  const byGap = {};
  for (const r of rows) {
    for (const g of r.gaps) {
      byGap[g] = (byGap[g] || 0) + 1;
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    doctrine: 'Investigate the couple. Never invent a productId. Publish app ≠ post forum.',
    totals: {
      registryCases: rows.length,
      compoundDbKeys: dbKeys.length,
      withCompound: rows.filter((r) => r.compound.length).length,
      withZ2m: rows.filter((r) => r.z2mHit).length,
      withGaps: rows.filter((r) => r.gaps.length).length,
    },
    gapCounts: byGap,
    cases: rows,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'PECULIARITIES.json'), `${JSON.stringify(payload, null, 2)}\n`);

  const md = [
    '# Device peculiarities — cross-source investigation',
    '',
    `Generated ${payload.generatedAt} from registry (${payload.totals.registryCases} cases) × compound DB (${payload.totals.compoundDbKeys} keys) × local Z2M fps.`,
    '',
    '## Class notes (always)',
    '',
    ...CLASS_NOTES.map((n) => `- ${n}`),
    '',
    '| | Count |',
    '|---|---|',
    `| Cases with compound DB hit | ${payload.totals.withCompound} |`,
    `| Cases with Z2M pid overlap | ${payload.totals.withZ2m} |`,
    `| Cases still gapped | ${payload.totals.withGaps} |`,
    '',
    '## Gaps',
    '',
    ...Object.entries(byGap).map(([k, n]) => `- \`${k}\`: ${n}`),
    '',
    '## Cases (1 by 1)',
    '',
  ];

  for (const r of rows) {
    md.push(`### \`${r.id}\` → \`${r.driver}\``);
    md.push('');
    md.push(`- Couple: \`${r.mfrs[0] || '?'}\` + ${(r.pids || []).join(', ')}`);
    md.push(`- Protocol: ${r.protocol || 'unknown'}`);
    if (r.retailNames.length) md.push(`- Retail: ${r.retailNames.join(', ')}`);
    md.push(`- Z2M local pids for mfr: ${r.z2mPids.join(', ') || '(none in dump)'} ${r.z2mHit ? '✓ overlap' : ''}`);
    if (r.compound.length) {
      for (const h of r.compound) {
        md.push(`- Compound \`${h.key}\`: ${h.protocol || ''} ${h.dp ? `DP ${JSON.stringify(h.dp)}` : ''} ${h.notes || ''}`.trim());
      }
    }
    if (r.compose.exists) {
      md.push(`- Compose: class=${r.compose.class} eps=${r.compose.endpointCount} EF00=${r.compose.hasEf00} IAS=${r.compose.hasIas} batteries=${(r.compose.batteries || []).join('/') || 'mains?'}`);
    }
    if (r.notes) md.push(`- Notes: ${r.notes}`);
    if (r.sources.length) md.push(`- Sources: ${r.sources.join(', ')}`);
    if (r.gaps.length) md.push(`- **Gaps:** ${r.gaps.join(', ')}`);
    md.push('');
  }

  md.push('Regenerate: `node tools/ci/investigate-device-peculiarities.js`', '');
  fs.writeFileSync(path.join(OUT_DIR, 'PECULIARITIES.md'), `${md.join('\n')}\n`);

  console.log('[peculiarities]', JSON.stringify(payload.totals));
  console.log('[peculiarities] gaps', byGap);
  const missingDb = rows.filter((r) => r.gaps.includes('no_compound_db_key'));
  if (missingDb.length) {
    console.log('[peculiarities] missing compound keys:');
    for (const r of missingDb) console.log('  -', r.id, r.mfrs[0], r.pids.join(','));
  }
}

main();
