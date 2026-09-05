'use strict';

/**
 * enrich-market-colocate.js (P2319)
 *
 * Enrichment-first: for market-new sacred couples, ADD mfr∧pid onto the verified
 * driver so Homey can pair. NEVER strip mfr/pid from other drivers (P2318).
 *
 * Usage:
 *   node tools/ci/enrich-market-colocate.js           # dry-run
 *   node tools/ci/enrich-market-colocate.js --apply
 */

const fs = require('fs');
const path = require('path');
const { ensureCouple } = require('./apply-market-couples');
const { resolveMarketDriver, lookupZ2m } = require('./market-driver-infer');
const { normalizeSacredCouple } = require('./sacred-couple-pair');

const ROOT = path.resolve(__dirname, '..', '..');
const INTAKE = path.join(ROOT, '.github', 'state', 'market-couples', 'intake.json');
const OUT = path.join(ROOT, 'reports', 'market-colocate-enrich-2026-08-30.json');
const APPLY = process.argv.includes('--apply');

/** Do-not-lock / known bad Universal Tuya couples */
const NEVER = new Set([
  // intentionally empty — P2320 brought v5498kdm+TS0001 into switch_1gang
]);

/**
 * Curated overrides when market infer is wrong but Z2M/forum/P2317 locks are clear.
 * WHY(P2318): enrichment only — write to these drivers; never remove elsewhere.
 */
const FORCE_DRIVER = {
  '_tz3000_cvis4qmw|ts0006': 'switch_wall_6gang',
  '_tz3000_g9chy2ib|ts0003': 'wall_switch_3gang_1way',
  '_tz3000_etufnltx|ts1002': 'button_wireless_4',
  '_tz3000_a4xycprs|ts0044': 'scene_switch_4',
  '_tz3000_zgyzgdua|ts0044': 'scene_switch_4',
  '_tz3000_wkai4ga5|ts0044': 'scene_switch_4',
  '_tz3000_v5498kdm|ts0001': 'switch_1gang',
  // Buttons / remotes (pid family + blakadder/z2m)
  '_tz3000_bi6lpsew|ts0043': 'button_wireless_3',
  '_tz3000_t8hzpgnd|ts0042': 'button_wireless_2',
  '_tz3000_w3c7ouru|ts0043': 'button_wireless_3',
  '_tz3000_ygvf9xzp|ts0044': 'button_wireless_4',
  '_tz3000_pzui3skt|ts0041': 'button_wireless_1',
  '_tz3400_keyjqthh|ts0041': 'button_wireless_1',
  '_tz3400_key8kk7r|ts0043': 'button_wireless_3',
  '_tz3000_q68478x7|ts0041': 'button_wireless_1',
  '_tz3000_wqcbzbae|ts0041': 'button_wireless_1',
  '_tz3000_rrjr1q0u|ts0043': 'button_wireless_3',
  '_tz3000_yw5tvzsk|ts0043': 'button_wireless_3',
  '_tz3000_b7bxojrg|ts0044': 'button_wireless_4',
  '_tz3000_vdfwjopk|ts0219': 'handheld_remote_4_buttons',
  // IR
  '_tz3290_ot6ewjvmejq5ekhl|ts1201': 'ir_blaster',
  '_tz3290_u9xac5rv|ts1201': 'ir_blaster',
  // Presence / water / climate clear Z2M
  '_tz321c_fkzihaxe8|ts0225': 'presence_sensor_radar',
  '_tz321c_fkzihax8|ts0225': 'presence_sensor_radar',
  '_tz321c_4slreunp|ts0225': 'presence_sensor_radar',
  '_tze200_hl0ss9oa|ts0225': 'presence_sensor_radar',
  '_tze200_y4mdop0b|ts0225': 'presence_sensor_radar',
  '_tze200_2aaelwxk|ts0225': 'presence_sensor_radar',
  '_tze200_crq3r3la|ts0225': 'presence_sensor_radar',
  '_tze200_jthf7vb6|ts0601': 'water_leak_sensor',
  '_tze284_7trh4ihp|ts0601': 'water_leak_sensor',
  '_tz3000_akqdg6g7|ts0201': 'climate_sensor',
  '_tz3000_mxzo5rhf|ts0201': 'climate_sensor',
  // Water leak TS0207 soft (not repeater twins)
  '_tz3000_85czd6fy|ts0207': 'water_leak_sensor',
  '_tz3000_d16y6col|ts0207': 'water_leak_sensor',
  '_tz3000_kyb656no|ts0207': 'water_leak_sensor',
  '_tz3000_ww9i3e0y|ts0207': 'water_leak_sensor',
  // Lights TS050x
  '_tz3000_4whigl8i|ts0501b': 'bulb_dimmable',
  '_tz3000_hodifxa9|ts0501b': 'bulb_dimmable',
  '_tz3210_4zinq6io|ts0501b': 'bulb_dimmable',
  '_tz3210_9q49basr|ts0501b': 'bulb_dimmable',
  '_tz3210_e5t9bfdv|ts0501b': 'bulb_dimmable',
  '_tz3210_g0qr1fqo|ts0503b': 'bulb_rgb',
  // USB / outlet
  // WHY(P2319): cfnprab5+TS011F canon = socket_power_strip_four_three — do not also
  // put mfr on usb_outlet_advanced (shares TS011F → pairing conflict).
  '_tz3000_cfnprab5|ts0115': 'socket_power_strip_four_three',
  '_tz3000_o005nuxx|ts0115': 'usb_outlet_advanced',
  // Switch pid_default soft with clear gang
  '_tz3000_rk2yzt0u|ts0001': 'switch_1gang',
  '_tz3210_nuenzetq|ts0002': 'switch_2gang',
};

/** Explicit skip — ambiguous / wrong class until deeper research */
const SKIP_REVIEW = new Set([
  '_tze200_n8dljorx|ts0601', // contact vs climate
  '_tze200_nkjintbl|ts0601', // switch_2gang vs climate
  '_tz3000_fa9mlvja|ts0041', // siren vs button
  '_tz3000_sj7jbgks|ts0043', // Z2M 2-key vs TS0043
  '_tz3000_82ptnsd4|ts0201', // climate vs motion
  '_tze284_tokhh9pf|ts0601', // 5gang vs climate
  '_tze284_hqys6frs|ts0601', // repeater vs climate
  '_tze284_iunyuzwe|ts0601', // router vs climate
  '_tze284_vbgmewta|ts0601', // router
  '_tz3000_xwh1e22x|ts1002', // remote vs bulb
  '_tz3000_zwszqdpy|ts1002', // remote vs bulb
  '_tz3000_xr5m6kfg|ts0505b', // contact vs bulb
  '_tz3210_4whigl8i|ts0501', // triple switch text vs light pid
  '_tz3210_lzqq3u4r|ts0501',
  '_tz3210_ttkgurpb|ts0504b',
  '_tz3000_jyupj3fw|ts0006',
  '_tz3000_lfa05ajd|ts0201', // soft climate — leave if already conflicted
  '_tze210_xgzzuerd|ts0301', // cover motor virgin — review curtain_motor
  '_tze200_sbordckq|ts0003', // TZE200+TS0003 unusual — not auto switch
]);

function keyOf(mfr, pid) {
  return `${String(mfr).toLowerCase()}|${String(pid).toLowerCase()}`;
}

function resolveTarget(mfr, pid, intakeRow) {
  const k = keyOf(mfr, pid);
  if (NEVER.has(k)) return { skip: 'do-not-lock' };
  if (SKIP_REVIEW.has(k)) return { skip: 'needs-deep-review' };
  if (FORCE_DRIVER[k]) {
    return { driver: FORCE_DRIVER[k], tier: 'force_p2319', reason: 'curated-colocate' };
  }

  const resolved = resolveMarketDriver(mfr, pid);
  // Allow apply-safe
  if (resolved.applySafe && resolved.driver) {
    return { driver: resolved.driver, tier: resolved.tier, reason: resolved.reason };
  }
  // Soft pid_default for clear button/switch/IR families only
  if (resolved.tier === 'pid_default' && resolved.driver) {
    const p = String(pid).toUpperCase();
    if (/^TS004[1-4F]$/.test(p) || /^TS000[1-4]$/.test(p) || /^TS1201$/.test(p)
      || /^TS0207$/.test(p) || /^TS0219$/.test(p)) {
      return { driver: resolved.driver, tier: 'pid_default_soft', reason: resolved.reason };
    }
  }
  // Z2M description with strong family match even if not applySafe
  const z2m = typeof lookupZ2m === 'function' ? lookupZ2m(mfr, pid) : null;
  if (z2m && resolved.driver && /z2m_desc|exact|registry|interview/.test(String(resolved.tier || ''))) {
    return { driver: resolved.driver, tier: resolved.tier, reason: resolved.reason };
  }
  // Intake routeHint + blakadder+z2m agreement
  const src = intakeRow.sources || [];
  if (intakeRow.routeHint && src.includes('blakadder') && (src.includes('z2m') || src.includes('zha'))) {
    if (/button_wireless_|scene_switch_|water_leak|presence_sensor|climate_sensor|ir_blaster|switch_[1234]gang/.test(intakeRow.routeHint)) {
      return { driver: intakeRow.routeHint, tier: 'multi_catalog_hint', reason: 'blakadder+catalog' };
    }
  }
  return { skip: 'not-confident', tier: resolved.tier, soft: resolved.driver };
}

function main() {
  if (!fs.existsSync(INTAKE)) {
    console.error('Missing intake — run market-couples-intake.js first');
    process.exit(1);
  }
  const intake = JSON.parse(fs.readFileSync(INTAKE, 'utf8'));
  const candidates = intake.topMarketNew || [];

  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'APPLY' : 'DRY-RUN',
    policy: 'P2319 enrichment-first colocate — never strip other drivers',
    applied: [],
    skipped: [],
    already: [],
  };

  for (const row of candidates) {
    const pair = normalizeSacredCouple(row.mfr, row.pid);
    if (!pair) {
      report.skipped.push({ mfr: row.mfr, pid: row.pid, reason: 'invalid' });
      continue;
    }
    const target = resolveTarget(pair.mfr, pair.pid, row);
    if (target.skip) {
      report.skipped.push({
        mfr: pair.mfr,
        pid: pair.pid,
        reason: target.skip,
        tier: target.tier || null,
        soft: target.soft || null,
      });
      continue;
    }
    // Cover motor virgin — allow if forced or clear
    if (keyOf(pair.mfr, pair.pid) === '_tze210_xgzzuerd|ts0301') {
      target.driver = 'curtain_motor';
    }

    const r = ensureCouple(target.driver, pair.mfr, pair.pid);
    if (!r.ok) {
      report.skipped.push({
        mfr: pair.mfr,
        pid: pair.pid,
        reason: r.reason,
        driver: target.driver,
      });
      continue;
    }
    if (!r.changes?.length) {
      report.already.push({ mfr: pair.mfr, pid: pair.pid, driver: target.driver });
      continue;
    }
    report.applied.push({
      mfr: pair.mfr,
      pid: pair.pid,
      driver: target.driver,
      tier: target.tier,
      reason: target.reason,
      changes: r.changes,
      written: !!r.applied,
    });
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

  console.log('=== enrich-market-colocate P2319 ===');
  console.log('Mode:', report.mode);
  console.log('Applied/would:', report.applied.length);
  console.log('Already colocated:', report.already.length);
  console.log('Skipped:', report.skipped.length);
  for (const a of report.applied.slice(0, 40)) {
    console.log(`  + ${a.mfr}+${a.pid} → ${a.driver} [${a.tier}] ${a.written ? 'WROTE' : 'dry'} (${a.changes.join(',')})`);
  }
  console.log('Report:', OUT);
}

// re-export lookup if market-driver-infer exports it
try {
  const mdi = require('./market-driver-infer');
  if (!mdi.lookupZ2m && mdi.resolveMarketDriver) {
    // lookupZ2m may not be exported — soft
  }
} catch { /* ignore */ }

module.exports = { main, FORCE_DRIVER, SKIP_REVIEW };

if (require.main === module) main();
