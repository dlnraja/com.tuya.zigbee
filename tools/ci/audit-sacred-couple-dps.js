#!/usr/bin/env node
'use strict';

/**
 * audit-sacred-couple-dps.js (P2212)
 *
 * Cross-ref sacred couples (mfr+pid) × driver dpMappings × dp_registry × dp_couple_knowledge.
 * Flags: missing RX, RAW without parser, DCM collision risk, TX-only gaps.
 *
 * Usage:
 *   node tools/ci/audit-sacred-couple-dps.js
 *   node tools/ci/audit-sacred-couple-dps.js --json
 *   node tools/ci/audit-sacred-couple-dps.js --couple=_TZE284_6ocnqlhn,TS0601
 */

const fs = require('fs');
const path = require('path');
const { PROFILES } = require('../../lib/tuya/DpByteArrayProfiles');

const ROOT = path.join(__dirname, '..', '..');
const REGISTRY = path.join(ROOT, 'data', 'user-misattribution-registry.json');
const DP_REG = path.join(ROOT, 'data', 'dp_registry.json');
const KNOWLEDGE = path.join(ROOT, 'data', 'dp_couple_knowledge.json');
const OUT_DIR = path.join(ROOT, 'reports', `dp-audit-${new Date().toISOString().slice(0, 10)}`);
const JSON_MODE = process.argv.includes('--json');
const coupleArg = process.argv.find((a) => a.startsWith('--couple='));

const DCM_HUMID_DPS = new Set([2, 4, 6, 19, 25]);

// WHY (P2247): Z2M byMfr can mix device types under one OEM — don't flag presence DPs on soil meters
const FAMILY_BLOCK = {
  soil_sensor: /presence|radar|motion_state|fading_time|detection_range|sensitivity|large_motion|mov_minimum|medium_motion/i,
  soil: /presence|radar|motion_state|fading_time|detection_range|sensitivity|large_motion|mov_minimum|medium_motion/i,
  climate_sensor: /presence|radar|leakage_current/i,
  din_rail_meter: /presence|humidity|moisture/i,
  smart_rcbo: /presence|humidity|moisture/i,
  wall_dimmer_tuya: /presence|humidity|energy|leakage/i,
  switch_2gang: /presence|radar|motion_state|fading_time|detection_range|sensitivity|large_motion|mov_minimum|medium_motion/i,
  switch_1gang: /presence|radar|motion_state|fading_time|detection_range/i,
  presence_sensor_radar: /moisture|soil|leakage_current/i,
};

function z2mBlockedForDriver(driver, z2mName) {
  const re = FAMILY_BLOCK[driver];
  if (!re || !z2mName) return false;
  return re.test(z2mName);
}

function norm(s) {
  return String(s || '').trim();
}

function coupleKey(mfr, pid) {
  return `${norm(mfr)}|${norm(pid).toUpperCase()}`;
}

function loadJson(fp) {
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function extractDpMappingsFromDevice(driverId) {
  const fp = path.join(ROOT, 'drivers', driverId, 'device.js');
  if (!fs.existsSync(fp)) return { found: false, dps: new Map() };
  const src = fs.readFileSync(fp, 'utf8');
  const dps = new Map();

  // Static numeric keys in dpMappings return objects
  const blockRe = /(?:get\s+dpMappings|_tongouDpMappings|dpMappings\s*=\s*\{)([\s\S]*?\n\s*\})/g;
  let bm;
  while ((bm = blockRe.exec(src))) {
    const block = bm[1];
    const lineRe = /^\s*(\d+)\s*:\s*\{([^}]+)\}/gm;
    let lm;
    while ((lm = lineRe.exec(block))) {
      const dpId = parseInt(lm[1], 10);
      const body = lm[2];
      const cap = (body.match(/capability:\s*['"]([^'"]+)['"]|capability:\s*(null)/) || [])[1] || null;
      const internal = (body.match(/internal:\s*['"]([^'"]+)['"]/) || [])[1] || null;
      const custom = /_handleDP|_handleTongouDp6|DpByteArrayProfiles/.test(src) && dpId === 6;
      dps.set(dpId, { capability: cap === 'null' ? null : cap, internal, customHandler: custom });
    }
  }

  return { found: dps.size > 0, dps, hasCustomDp6: /_handleTongouDp6|DpByteArrayProfiles/.test(src) };
}

function z2mDpsForMfr(dpReg, mfr, pidHint) {
  const rows = dpReg?.byMfr?.[mfr] || dpReg?.byMfr?.[mfr.toLowerCase()] || dpReg?.byMfr?.[mfr.toUpperCase()] || [];
  let use = rows;
  if (pidHint) {
    const filtered = rows.filter((r) => String(r.model || '').toLowerCase() === String(pidHint).toLowerCase());
    if (filtered.length) use = filtered;
    // Brand-only mfr with no model match → empty (avoid ZG-205 presence on ZG-303 soil)
    else if (!/^_t[yz]/i.test(mfr)) use = [];
  }
  const map = new Map();
  for (const r of use) map.set(r.dpId, r.name);
  return map;
}

function auditCouple(caseRow, dpReg, knowledge) {
  const mfrs = [].concat(caseRow.mfr || []);
  const pids = [].concat(caseRow.productId || []);
  const driver = caseRow.canonicalDriver;
  const device = extractDpMappingsFromDevice(driver);
  const issues = [];
  const dpRows = [];

  for (const mfr of mfrs) {
    for (const pid of pids) {
      const key = coupleKey(mfr, pid);
      const know = knowledge?.couples?.[key] || knowledge?.couples?.[`${mfr}|${pid}`];
      const z2m = z2mDpsForMfr(dpReg, mfr, pid);

      const allDpIds = new Set([...z2m.keys(), ...device.dps.keys(), ...Object.keys(know?.dps || {}).map(Number)]);

      for (const dpId of [...allDpIds].sort((a, b) => a - b)) {
        const z2mName = z2m.get(dpId) || null;
        const driverMap = device.dps.get(dpId) || null;
        const knowDp = know?.dps?.[String(dpId)] || null;
        const tuyaType = knowDp?.tuyaType ?? null;
        const isRaw = tuyaType === 0;
        const profile = knowDp?.profile || null;
        const hasParser = profile && PROFILES[profile];
        const hasCustom = driverMap?.customHandler || device.hasCustomDp6;

        let status = 'ok';
        const notes = [];

        if (z2mName && !driverMap && !knowDp) {
          if (z2mBlockedForDriver(driver, z2mName)) {
            status = 'ok';
            notes.push(`Z2M ${z2mName} ignored — family mismatch for ${driver}`);
          } else {
            status = 'missing_in_driver';
            notes.push(`Z2M defines ${z2mName} — no driver dpMapping`);
          }
        }
        if (knowDp && !driverMap) {
          if (knowDp.source === 'z2m-soft') {
            status = 'ok';
            notes.push('soft knowledge seed only');
          } else {
            status = 'missing_in_driver';
            notes.push(`knowledge documents DP — not in driver compose/device`);
          }
        }
        if (isRaw && !hasParser && !hasCustom) {
          status = 'raw_unparsed';
          notes.push('type 0 byte_array without DpByteArrayProfiles handler');
        }
        if (dpId === 6 && DCM_HUMID_DPS.has(dpId) && isRaw && knowDp?.blockDcm) {
          notes.push('block DCM/learner humidity inference on this couple');
        }
        if (knowDp?.direction?.includes('tx') && !driverMap?.capability && !knowDp?.internal) {
          notes.push('TX path undocumented in driver');
        }

        if (status !== 'ok') issues.push({ dpId, status, notes });

        dpRows.push({
          dpId,
          z2mName,
          driverCapability: driverMap?.capability ?? null,
          driverInternal: driverMap?.internal ?? null,
          knowledgeName: knowDp?.name ?? null,
          tuyaType,
          direction: knowDp?.direction ?? 'rx',
          status,
          notes,
        });
      }
    }
  }

  return {
    caseId: caseRow.id,
    driver,
    mfrs: mfrs.slice(0, 4),
    pids,
    deviceMappings: device.dps.size,
    issueCount: issues.length,
    issues,
    dps: dpRows,
  };
}

function renderMarkdown(report) {
  const lines = [
    `# Sacred couple DP audit — ${report.generatedAt.slice(0, 10)}`,
    '',
    `Cases: **${report.totals.cases}** | Issues: **${report.totals.issues}** | RAW unparsed: **${report.totals.rawUnparsed}**`,
    '',
    '## How to read',
    '',
    '- **type 0 (RAW)**: byte_array — never auto-map globally; lock parser per couple.',
    '- **missing_in_driver**: Z2M/knowledge has DP, driver does not.',
    '- **raw_unparsed**: needs `DpByteArrayProfiles` + `_handleDP` override.',
    '',
    '| Case | Driver | DP | Z2M | Driver | Status | Notes |',
    '|------|--------|----|-----|--------|--------|-------|',
  ];

  for (const row of report.cases) {
    for (const dp of row.dps.filter((d) => d.status !== 'ok')) {
      lines.push(`| ${row.caseId} | ${row.driver} | ${dp.dpId} | ${dp.z2mName || '—'} | ${dp.driverCapability || dp.driverInternal || '—'} | ${dp.status} | ${dp.notes.join('; ') || '—'} |`);
    }
  }

  lines.push('', '## DP6 collision reminder', '');
  lines.push('| Couple | DP6 meaning |');
  lines.push('|--------|-------------|');
  for (const [key, val] of Object.entries(report.globalCollisions?.['6'] || {})) {
    lines.push(`| ${key} | ${val} |`);
  }

  lines.push('', 'Regenerate: `node tools/ci/audit-sacred-couple-dps.js`', '');
  return `${lines.join('\n')}\n`;
}

function main() {
  const registry = loadJson(REGISTRY);
  const dpReg = loadJson(DP_REG);
  const knowledge = loadJson(KNOWLEDGE);
  if (!registry?.cases?.length) {
    console.error('[audit-sacred-couple-dps] Missing registry');
    process.exit(1);
  }

  let cases = registry.cases;
  if (coupleArg) {
    const [m, p] = coupleArg.split('=')[1].split(',');
    cases = cases.filter((c) => [].concat(c.mfr).some((x) => norm(x).toLowerCase() === norm(m).toLowerCase())
      && [].concat(c.productId).includes(p));
  }

  const audited = cases.map((c) => auditCouple(c, dpReg, knowledge));
  const issueCount = audited.reduce((n, r) => n + r.issueCount, 0);
  const rawUnparsed = audited.flatMap((r) => r.issues).filter((i) => i.status === 'raw_unparsed').length;

  const dp6Collisions = {};
  for (const [key, val] of Object.entries(knowledge?.couples || {})) {
    if (val.dps?.['6']) dp6Collisions[key] = val.dps['6'].name;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totals: { cases: audited.length, issues: issueCount, rawUnparsed },
    globalCollisions: { 6: dp6Collisions },
    cases: audited,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'audit.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'AUDIT.md'), renderMarkdown(report));

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('=== audit-sacred-couple-dps (P2212) ===');
  console.log('Cases:', report.totals.cases, '| issues:', report.totals.issues, '| raw unparsed:', report.totals.rawUnparsed);
  console.log('Report:', path.join(OUT_DIR, 'AUDIT.md'));

  const top = audited.filter((r) => r.issueCount).sort((a, b) => b.issueCount - a.issueCount).slice(0, 8);
  for (const row of top) {
    console.log(` ${row.caseId} (${row.driver}): ${row.issueCount} issue(s)`);
    for (const iss of row.issues.slice(0, 4)) {
      console.log(`   DP${iss.dpId} ${iss.status} — ${iss.notes.join('; ')}`);
    }
  }
}

main();
