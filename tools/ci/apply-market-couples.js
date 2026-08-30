#!/usr/bin/env node
'use strict';

/**
 * apply-market-couples.js (P2231)
 *
 * Apply ONLY apply-safe market couples (registry / exact DB / Z2M description)
 * into driver.compose.json. Never uses productId_default alone.
 *
 * Usage:
 *   node tools/ci/apply-market-couples.js           # dry-run
 *   node tools/ci/apply-market-couples.js --apply   # write compose
 *   node tools/ci/apply-market-couples.js --max=40
 */

const fs = require('fs');
const path = require('path');
const { isForbiddenPlacement } = require('../../lib/pairing/UserMisattributionRegistry');
const { normalizeSacredCouple, oemCaseVariants } = require('./sacred-couple-pair');
const { resolveMarketDriver, driverExists } = require('./market-driver-infer');

const ROOT = path.resolve(__dirname, '..', '..');
const INTAKE = path.join(ROOT, '.github', 'state', 'market-couples', 'intake.json');
const OUT = path.join(ROOT, '.github', 'state', 'market-couples', 'apply-report.json');

const APPLY = process.argv.includes('--apply');
const MAX = (() => {
  const a = process.argv.find((x) => x.startsWith('--max='));
  return a ? parseInt(a.split('=')[1], 10) : 80;
})();

// WHY (P2246): never apply known false routes even if z2m_desc looks apply-safe
const SKIP_COUPLES = new Set([
  '_tz3000_cvis4qmw|ts0006', // p2237 — only TS0001 → switch_1gang
  '_tz3000_g9chy2ib|ts0003', // FP = switch_3gang, not wall_thermostat
  '_tz3000_a4xycprs|ts0044', // P2312 — Z2M Star Ring scene → scene_switch_4 (not switch_4gang)
  '_tz3000_etufnltx|ts1002', // review — Safira scene panel, not blind switch_4gang
]);

function skipCouple(mfr, pid) {
  return SKIP_COUPLES.has(`${String(mfr).toLowerCase()}|${String(pid).toLowerCase()}`);
}

function ensureCouple(driver, mfr, pid) {
  if (isForbiddenPlacement(mfr, driver)) {
    return { ok: false, reason: 'forbidden-placement' };
  }
  if (!driverExists(driver)) return { ok: false, reason: 'missing-driver' };
  const fp = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  const json = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (!json.zigbee) json.zigbee = {};
  json.zigbee.manufacturerName = Array.isArray(json.zigbee.manufacturerName)
    ? json.zigbee.manufacturerName
    : (json.zigbee.manufacturerName ? [json.zigbee.manufacturerName] : []);
  json.zigbee.productId = Array.isArray(json.zigbee.productId)
    ? json.zigbee.productId
    : (json.zigbee.productId ? [json.zigbee.productId] : []);

  const changes = [];
  for (const v of oemCaseVariants(mfr)) {
    if (!json.zigbee.manufacturerName.some((x) => String(x).toLowerCase() === v.toLowerCase())) {
      json.zigbee.manufacturerName.push(v);
      changes.push(`mfr:${v}`);
    }
  }
  if (pid && !json.zigbee.productId.some((x) => String(x).toLowerCase() === String(pid).toLowerCase())) {
    json.zigbee.productId.push(pid);
    changes.push(`pid:${pid}`);
  }
  if (changes.length && APPLY) {
    fs.writeFileSync(fp, `${JSON.stringify(json, null, 2)}\n`);
  }
  return { ok: true, driver, changes, applied: APPLY && changes.length > 0 };
}

function main() {
  if (!fs.existsSync(INTAKE)) {
    console.error('FATAL: run market-couples-intake.js first — missing', INTAKE);
    process.exit(1);
  }
  const intake = JSON.parse(fs.readFileSync(INTAKE, 'utf8'));
  const candidates = intake.topMarketNew || [];

  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'APPLY' : 'DRY-RUN',
    policy: 'apply-safe only (registry|exact|z2m_desc) — never productId_default alone',
    applied: [],
    skipped: [],
    wouldApply: 0,
  };

  let n = 0;
  for (const c of candidates) {
    if (n >= MAX) break;
    const pair = normalizeSacredCouple(c.mfr, c.pid);
    if (!pair) {
      report.skipped.push({ mfr: c.mfr, pid: c.pid, reason: 'invalid-couple' });
      continue;
    }
    if (skipCouple(pair.mfr, pair.pid)) {
      report.skipped.push({ mfr: pair.mfr, pid: pair.pid, reason: 'p2246-skip-list' });
      continue;
    }
    const resolved = resolveMarketDriver(pair.mfr, pair.pid);
    if (!resolved.applySafe || !resolved.driver) {
      report.skipped.push({
        mfr: pair.mfr,
        pid: pair.pid,
        reason: resolved.tier === 'pid_default' ? 'pid_default-not-safe' : (resolved.reason || 'not-apply-safe'),
        tier: resolved.tier,
        softHint: resolved.driver || null,
      });
      continue;
    }
    // Prefer multi-catalog or exact/registry
    const src = c.sources || [];
    const catalog = src.some((s) => ['blakadder', 'z2m', 'zha'].includes(s));
    if (!catalog && resolved.tier === 'z2m_desc') {
      // still ok if z2m index hit
    }
    const r = ensureCouple(resolved.driver, pair.mfr, pair.pid);
    if (!r.ok) {
      report.skipped.push({ mfr: pair.mfr, pid: pair.pid, reason: r.reason, driver: resolved.driver });
      continue;
    }
    if (r.changes?.length) {
      n += 1;
      report.wouldApply += 1;
      report.applied.push({
        mfr: pair.mfr,
        pid: pair.pid,
        driver: resolved.driver,
        tier: resolved.tier,
        reason: resolved.reason,
        changes: r.changes,
        written: r.applied,
      });
    }
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

  console.log('=== apply-market-couples ===');
  console.log('Mode:', report.mode);
  console.log('Would/did apply:', report.wouldApply);
  console.log('Skipped:', report.skipped.length);
  for (const a of report.applied.slice(0, 25)) {
    console.log(`  ${a.mfr}+${a.pid} → ${a.driver} [${a.tier}] ${a.written ? 'WROTE' : 'dry'}`);
  }
  console.log('Report:', OUT);
}

module.exports = { ensureCouple, main };

if (require.main === module) {
  main();
}
