#!/usr/bin/env node
'use strict';

/**
 * harden-unknown-zigbee.js (P2366)
 *
 * Reduce "Unknown Zigbee Device" / generic Zigbee pairing failures:
 * 1. Forum + registry couples → compose + sacred-keep pins
 * 2. Case variants on all drivers
 * 3. Resync app.json zigbee from compose (pairing uses app.json)
 *
 * NEVER invents pid. Only applies verified (mfr,pid,driver) tuples.
 *
 * Usage:
 *   node tools/ci/harden-unknown-zigbee.js
 *   node tools/ci/harden-unknown-zigbee.js --apply
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ensureCouple } = require('./apply-market-couples');
const { pairingCaseVariants } = require('../../lib/utils/TuyaNormalizer');

const ROOT = path.resolve(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const FORUM_REPORT = path.join(ROOT, '.github', 'state', 'forum', 'actionable-processor-report.json');
const SACRED = path.join(ROOT, 'config', 'architecture', 'publish-sacred-keep-couples.json');
const OUT = path.join(ROOT, 'reports', 'unknown-zigbee-harden-latest.json');

/** Forum-verified unknown-device couples (sacred mfr+pid only). */
const FORUM_UNKNOWN_COUPLES = [
  { mfr: '_TZ3000_zgyzgdua', pid: 'TS0044', driver: 'scene_switch_4', note: 'meter91' },
  { mfr: '_TZ3000_v5498kdm', pid: 'TS0001', driver: 'switch_1gang', note: 'Antek NOUS' },
  { mfr: '_TZE284_fhvpaltk', pid: 'TS0601', driver: 'valve_dual_irrigation', note: 'Joep #2218' },
  { mfr: '_TZ3000_lvhy15ix', pid: 'TS0003', driver: 'switch_3gang', note: 'melectro' },
  { mfr: '_TZ3000_decxrtwa', pid: 'TS0203', driver: 'contact_sensor', note: 'Vincent' },
  { mfr: '_TZE204_clrdrnya', pid: 'TS0601', driver: 'presence_sensor_radar', note: 'VicHY' },
  { mfr: '_TZE204_ogkdpgy2', pid: 'TS0601', driver: 'air_quality_co2', note: 'Elliot #531' },
  { mfr: '_TZE204_5slehgeo', pid: 'TS0601', driver: 'curtain_motor', note: 'Salvagr #533' },
  { mfr: '_TZE284_m1cvyneb', pid: 'TS0601', driver: 'wall_dimmer_tuya', note: 'PresentSky' },
  { mfr: '_TZ3000_kfu8zapd', pid: 'TS0044', driver: 'button_wireless_4', note: 'Relax Moes remote' },
  { mfr: '_TZ3000_4upl1fcj', pid: 'TS0041', driver: 'button_wireless_1', note: 'SunBeech' },
  { mfr: '_TZ3000_wkai4ga5', pid: 'TS0044', driver: 'scene_switch_4', note: 'SunBeech scene' },
];

function normKey(mfr, pid) {
  return `${String(mfr).toLowerCase()}|${String(pid).toUpperCase()}`;
}

function loadForumUnknownCouples() {
  const out = [];
  if (!fs.existsSync(FORUM_REPORT)) return out;
  try {
    const j = JSON.parse(fs.readFileSync(FORUM_REPORT, 'utf8'));
    for (const row of j.needAction || j.items || []) {
      const issues = row.issues || [];
      if (!issues.some((i) => /unknown/i.test(String(i)))) continue;
      for (const c of row.couples || []) {
        if (!c.mfr || !c.pid || c.verdict === 'MISSING_PID') continue;
        if (c.driverHint || c.resolvedDriver) {
          out.push({
            mfr: c.mfr,
            pid: c.pid,
            driver: c.resolvedDriver || c.driverHint,
            note: `forum T${row.topicId} #${row.postNumber}`,
          });
        }
      }
    }
  } catch { /* optional */ }
  return out;
}

function ensureSacredPin(mfr, pid, driverId, note) {
  const raw = JSON.parse(fs.readFileSync(SACRED, 'utf8'));
  const couples = raw.couples || [];
  const key = normKey(mfr, pid);
  const exists = couples.some((c) => normKey(c.mfr, c.pid) === key && c.driverId === driverId);
  if (exists) return { ok: true, added: false };
  if (!APPLY) return { ok: true, added: true, dry: true };
  couples.push({ mfr, pid, driverId, note: note || 'P2366 unknown-harden' });
  raw.couples = couples;
  fs.writeFileSync(SACRED, `${JSON.stringify(raw, null, 2)}\n`);
  return { ok: true, added: true };
}

function runNode(rel, args = []) {
  const script = path.join(ROOT, rel);
  return spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 300000,
  });
}

function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'APPLY' : 'DRY-RUN',
    compose: [],
    sacredKeep: [],
    phases: [],
  };

  const candidates = [...FORUM_UNKNOWN_COUPLES, ...loadForumUnknownCouples()];
  const seen = new Set();
  for (const c of candidates) {
    const key = `${normKey(c.mfr, c.pid)}|${c.driver}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const r = ensureCouple(c.driver, c.mfr, c.pid);
    if (r.changes?.length) {
      report.compose.push({ ...c, changes: r.changes, written: r.applied });
    }

    const sk = ensureSacredPin(c.mfr, c.pid, c.driver, c.note);
    if (sk.added) {
      report.sacredKeep.push({ mfr: c.mfr, pid: c.pid, driver: c.driver, dry: !!sk.dry });
    }
  }

  if (APPLY) {
    const cv = runNode('tools/ci/ensure-case-variants.js', ['--apply']);
    report.phases.push({
      name: 'case-variants',
      ok: cv.status === 0,
      tail: (cv.stdout || cv.stderr || '').trim().slice(-400),
    });
    const sync = runNode('scripts/maintenance/sync-appjson-zigbee.js', []);
    report.phases.push({
      name: 'sync-appjson-zigbee',
      ok: sync.status === 0,
      tail: (sync.stdout || sync.stderr || '').trim(),
    });
    const gate = runNode('tools/ci/p2138-sacred-couple-matrix-gate.js', []);
    report.phases.push({
      name: 'p2138-gate',
      ok: gate.status === 0,
      tail: (gate.stdout || '').trim().slice(-200),
    });
  }

  // Verify case forms exist for pinned couples
  report.verify = [];
  for (const c of FORUM_UNKNOWN_COUPLES.slice(0, 8)) {
    const fp = path.join(ROOT, 'drivers', c.driver, 'driver.compose.json');
    if (!fs.existsSync(fp)) continue;
    const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const mfrs = (j.zigbee?.manufacturerName || []).map((x) => String(x).toLowerCase());
    const pids = (j.zigbee?.productId || []).map((x) => String(x).toUpperCase());
    const variants = pairingCaseVariants(c.mfr).map((v) => v.toLowerCase());
    report.verify.push({
      couple: `${c.mfr}+${c.pid}`,
      driver: c.driver,
      mfrOk: variants.some((v) => mfrs.includes(v)),
      pidOk: pids.includes(String(c.pid).toUpperCase()),
    });
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

  console.log('=== harden-unknown-zigbee (P2366) ===');
  console.log('Mode:', report.mode);
  console.log('Compose changes:', report.compose.length);
  console.log('Sacred-keep adds:', report.sacredKeep.length);
  for (const v of report.verify.filter((x) => !x.mfrOk || !x.pidOk)) {
    console.log(`  MISSING compose: ${v.couple} → ${v.driver}`);
  }
  if (APPLY) {
    for (const p of report.phases) {
      console.log(`  ${p.ok ? '✓' : '✗'} ${p.name}`);
    }
  }
  console.log('Report:', OUT);
}

if (require.main === module) main();

module.exports = { FORUM_UNKNOWN_COUPLES, main };
