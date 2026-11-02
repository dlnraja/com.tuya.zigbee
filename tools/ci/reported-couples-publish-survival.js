#!/usr/bin/env node
'use strict';
/**
 * P3200 (GH#581/#584, t765u): a couple listed in a driver.compose.json can still be
 * MISSING from the package Athom receives, because prepare-publish compacts the
 * mfr x productId matrix (climate_sensor 1949 mfrs -> ~19). The user then gets
 * "Unknown Zigbee device" while the Device Finder (source) shows the couple.
 *
 * This check replays the publish compaction (+ TS0601 top-up) in memory and reports
 * every user-reported couple that is listed in source but absent from the payload,
 * with the sacred-pin entry to add. It also flags case-only matches (reported string
 * not listed exactly, another case is) as SUSPECT — report only, never auto-adds.
 *
 * Reported couples: data/leads/reported-couples.json  [{mfr,pid,source}]
 *                   + optional --issues <gh issue list --json number,title,body file>
 * Default mode = report (exit 0). --strict exits 1 on a dropped couple.
 * Nothing here is read at runtime; app.json is not modified.
 */
const fs = require('fs');
const path = require('path');

const MFR_RE = /\b(_T[ZY][A-Z0-9]{0,4}_[A-Za-z0-9]{8})\b/g;
const PID_RE = /\b(TS[0-9]{3,4}[A-Z]?|TY[0-9]{4}[A-Z]?)\b/g;

function couplesFromIssues(issues) {
  const out = [];
  for (const i of issues || []) {
    const txt = `${i.title || ''}\n${i.body || ''}`;
    const mfrs = [...new Set([...txt.matchAll(MFR_RE)].map((m) => m[1]))];
    const pids = [...new Set([...txt.matchAll(PID_RE)].map((m) => m[1]))];
    // WHY: only one pid in the report = unambiguous pairing; never cross-product several.
    if (pids.length !== 1) continue;
    for (const mfr of mfrs) out.push({ mfr, pid: pids[0], source: `GH#${i.number}` });
  }
  return out;
}

function listedIn(manifest, mfr, pid) {
  const exact = []; const caseOnly = [];
  for (const d of manifest.drivers || []) {
    const z = d.zigbee; if (!z) continue;
    const mf = [].concat(z.manufacturerName || []); const pi = [].concat(z.productId || []);
    if (!pi.includes(pid)) continue;
    if (mf.includes(mfr)) exact.push(d.id);
    else if (mf.some((x) => x.toLowerCase() === mfr.toLowerCase())) caseOnly.push(d.id);
  }
  return { exact, caseOnly };
}

function simulatePayload(root, manifest, env = process.env) {
  const { compactZigbeeIdentifiers } = require(path.join(root, 'scripts/maintenance/compact-zigbee-identifiers.cjs'));
  const src = JSON.parse(JSON.stringify(manifest));
  const out = JSON.parse(JSON.stringify(manifest));
  const prev = process.cwd(); process.chdir(root);
  try {
    compactZigbeeIdentifiers(out, {
      maxTotalCombos: Number(env.HOMEY_ZIGBEE_MAX_TOTAL_COMBOS) || 15500,
      maxDriverCombos: Number(env.HOMEY_ZIGBEE_MAX_DRIVER_COMBOS) || 1500,
    });
    const topPath = path.join(root, 'scripts/maintenance/ts0601-topup.cjs');
    if (fs.existsSync(topPath)) {
      const tu = require(topPath);
      const tmp = path.join(require('os').tmpdir(), `p3200-${process.pid}.json`);
      fs.writeFileSync(tmp, JSON.stringify(out));
      tu.topUpFile(src, tmp, { maxTotal: Number(env.HOMEY_ZIGBEE_TOPUP_MAX_TOTAL) || 20000, maxDriver: Number(env.HOMEY_ZIGBEE_TOPUP_MAX_DRIVER) || 2000, maxCaseForms: Number(env.HOMEY_ZIGBEE_MAX_CASE_FORMS) || 2 });
      const r = JSON.parse(fs.readFileSync(tmp, 'utf8')); fs.unlinkSync(tmp); return r;
    }
    return out;
  } finally { process.chdir(prev); }
}

function check({ root, manifest, reported, payload }) {
  const dropped = []; const suspect = []; const ok = [];
  const pay = payload || simulatePayload(root, manifest);
  for (const c of reported) {
    const src = listedIn(manifest, c.mfr, c.pid);
    if (!src.exact.length) {
      if (src.caseOnly.length) suspect.push({ ...c, drivers: src.caseOnly });
      continue; // not listed at all = a device request, not this class
    }
    const p = listedIn(pay, c.mfr, c.pid);
    if (p.exact.length) ok.push(c);
    else dropped.push({ ...c, drivers: src.exact });
  }
  return { ok, dropped, suspect };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const root = process.cwd();
  const strict = args.includes('--strict');
  const ii = args.indexOf('--issues');
  const ledgerPath = path.join(root, 'data/leads/reported-couples.json');
  let reported = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath, 'utf8')).couples || [] : [];
  if (ii >= 0 && args[ii + 1] && fs.existsSync(args[ii + 1])) reported = reported.concat(couplesFromIssues(JSON.parse(fs.readFileSync(args[ii + 1], 'utf8'))));
  const seen = new Set(); reported = reported.filter((c) => { const k = c.mfr + '|' + c.pid; if (seen.has(k)) return false; seen.add(k); return true; });
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  const r = check({ root, manifest, reported });
  console.log(`[P3200] reported couples: ${reported.length}, in payload ${r.ok.length}, DROPPED by compaction ${r.dropped.length}, case-suspect ${r.suspect.length}`);
  for (const d of r.dropped) console.log(`  DROPPED ${d.mfr}|${d.pid} (${d.source}) listed in ${d.drivers.join(',')} -> add to config/architecture/publish-sacred-keep-couples.json: {"mfr":"${d.mfr}","pid":"${d.pid}","driverId":"${d.drivers[0]}"}`);
  for (const s of r.suspect) console.log(`  CASE-SUSPECT ${s.mfr}|${s.pid} (${s.source}) only another case in ${s.drivers.join(',')} — verify the wire string (interview/Z2M) before adding one variant`);
  if (strict && r.dropped.length) process.exit(1);
}

module.exports = { couplesFromIssues, listedIn, simulatePayload, check };
