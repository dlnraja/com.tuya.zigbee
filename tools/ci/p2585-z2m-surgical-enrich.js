#!/usr/bin/env node
'use strict';
/**
 * P2585c — Surgical complementary apply from Z2M herdsman research (verified couples only).
 * Uses appendExactIdentityForms — never shrink compose arrays (P2520).
 *
 *   node tools/ci/p2585-z2m-surgical-enrich.js
 *   node tools/ci/p2585-z2m-surgical-enrich.js --apply
 */
const fs = require('fs');
const path = require('path');
const {
  appendExactIdentityForms,
  appendIdentityStrings,
} = require('../../lib/enrichment/ComplementaryMerge');

const ROOT = path.join(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const OUT = path.join(ROOT, 'reports', 'z2m-homey-couple-diff-2026-09-18', 'SURGICAL.json');

/** Verified Z2M (mfr,pid) → driver — Contre quoi invent / wrong class */
const COUPLES = [
  // Climate TH (Z2M TS0601_temperature_humidity_sensor_2) — was misrouted on button_wireless_2
  { mfr: '_TZE284_ksz749x8', pid: 'TS0601', driver: 'climate_sensor', ref: 'Z2M ZTH02/TH' },
  { mfr: '_TZE204_ksz749x8', pid: 'TS0601', driver: 'climate_sensor', ref: 'Z2M ZTH02/TH sibling' },
  { mfr: '_TZE2841000000_qf5mzewi', pid: 'TS0601', driver: 'climate_sensor', ref: 'Z2M ONENUO TH05Z batch' },
  // Dimmer with power monitoring
  { mfr: '_TZE284_da26abzz', pid: 'TS0601', driver: 'wall_dimmer_tuya', ref: 'Z2M MG-DIM02Z' },
  // SOS buttons
  { mfr: '_TZ3000_nxdziqzc', pid: 'TS0215A', driver: 'button_emergency_sos', ref: 'Z2M TS0215A_sos' },
  { mfr: '_TZ3000_irwuzilv', pid: 'TS0215A', driver: 'button_emergency_sos', ref: 'Z2M TS0215A_sos' },
  { mfr: '_TZ3000_gjiggmio', pid: 'TS0215A', driver: 'button_emergency_sos', ref: 'Z2M TS0215A_sos' },
  // Motion (Z2M IH012-RT02) — was only on contact_sensor (wrong class for TS0202)
  { mfr: '_TZ3000_o4mkahkc', pid: 'TS0202', driver: 'motion_sensor', ref: 'Z2M IH012-RT02' },
  // 2-gang power switches (Z2M TS0002_power / limited)
  { mfr: '_TZ3000_aaifmpuq', pid: 'TS0002', driver: 'switch_2gang', ref: 'Z2M TS0002_power' },
  { mfr: '_TZ3000_irrmjcgi', pid: 'TS0002', driver: 'switch_2gang', ref: 'Z2M TS0002_power' },
  { mfr: '_TZ3000_huvxrx4i', pid: 'TS0002', driver: 'switch_2gang', ref: 'Z2M TS0002_power' },
  { mfr: '_TZ3000_pxfjrzyj', pid: 'TS0002', driver: 'switch_2gang', ref: 'Z2M TS0002_power' },
  { mfr: '_TZ3000_5gey1ohx', pid: 'TS0002', driver: 'switch_2gang', ref: 'Z2M TS0002_limited' },
  { mfr: '_TZ3000_mufwv0ry', pid: 'TS0002', driver: 'switch_2gang', ref: 'Z2M TS0002_limited' },
  { mfr: '_TZ3000_54hjn4vs', pid: 'TS0002', driver: 'switch_2gang', ref: 'Z2M TS0002_limited' },
  { mfr: '_TZ3000_in5qxhtt', pid: 'TS0002', driver: 'switch_2gang', ref: 'Z2M TS0002_limited' },
  { mfr: '_TZ3000_ogpla3lh', pid: 'TS0002', driver: 'switch_2gang', ref: 'Z2M TS0002_limited' },
  { mfr: '_TZ3000_i9w5mehz', pid: 'TS0002', driver: 'switch_2gang', ref: 'Z2M TS0002_limited' },
  // 1-gang power
  { mfr: '_TZ3000_zojh9vz7', pid: 'TS0001', driver: 'switch_1gang', ref: 'Z2M TS0001_power' },
  { mfr: '_TZ3000_gsat0axs', pid: 'TS0001', driver: 'switch_1gang', ref: 'Z2M TS0001_power' },
  // Plugs TS011F
  { mfr: '_TZ3000_8nyaanzb', pid: 'TS011F', driver: 'plug_energy_monitor', ref: 'Z2M TS011F_2_gang_wall' },
  { mfr: '_TZ3000_iy2c3n6p', pid: 'TS011F', driver: 'plug_energy_monitor', ref: 'Z2M TS011F_2_gang_wall' },
  { mfr: '_TZ3008_tary5dvv', pid: 'TS011F', driver: 'plug_energy_monitor', ref: 'Z2M TS011F_plug_1' },
  { mfr: '_TZ3210_iooniers', pid: 'TS011F', driver: 'plug_energy_monitor', ref: 'Z2M TS011F_plug_1' },
  // Curtain TS0301
  { mfr: '_TZE210_xgzzuerd', pid: 'TS0301', driver: 'curtain_motor', ref: 'Z2M TS0301_cover_2' },
];

function caseForms(mfr) {
  const s = String(mfr);
  const out = new Set([s]);
  if (/^_TZE/i.test(s)) {
    const rest = s.replace(/^_TZE/i, '');
    out.add(`_TZE${rest}`);
    out.add(`_tze${rest.toLowerCase()}`);
  } else if (/^_TZ/i.test(s)) {
    const rest = s.slice(3);
    out.add(`_TZ${rest}`);
    out.add(`_tz${rest.toLowerCase()}`);
  }
  return [...out];
}

function enrichCompose(driverId, mfr, pid) {
  const p = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(p)) return { ok: false, reason: 'missing' };
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!c.zigbee) c.zigbee = {};
  const beforeM = (c.zigbee.manufacturerName || []).length;
  const beforeP = (c.zigbee.productId || []).length;
  const forms = caseForms(mfr);
  // Prefer exact dual-case append (P2543) — never collapse
  c.zigbee.manufacturerName = appendExactIdentityForms(c.zigbee.manufacturerName || [], forms);
  c.zigbee.productId = appendExactIdentityForms(c.zigbee.productId || [], [pid]);
  const afterM = c.zigbee.manufacturerName.length;
  const afterP = c.zigbee.productId.length;
  const changed = afterM > beforeM || afterP > beforeP;
  if (APPLY && changed) {
    fs.writeFileSync(p, `${JSON.stringify(c, null, 2)}\n`);
  }
  return { ok: true, changed, addedMfr: afterM - beforeM, addedPid: afterP - beforeP };
}

function enrichRadarConfigYa4() {
  const p = path.join(ROOT, 'drivers', 'presence_sensor_radar', 'configs.js');
  let src = fs.readFileSync(p, 'utf8');
  if (src.includes("'_TZE204_ya4ft0w4'")) return { changed: false };
  if (!src.includes("'_TZE204_gkfbdvyx'")) return { changed: false, reason: 'no-gkfbdvyx-block' };
  const next = src.replace(
    /sensors:\s*\[\s*\n\s*'_TZE200_gkfbdvyx',\s*'_TZE204_gkfbdvyx',\s*'_TZE284_gkfbdvyx',\s*\n\s*'_TZE204_laokfqwu',/,
    `sensors: [
      '_TZE200_gkfbdvyx', '_TZE204_gkfbdvyx', '_TZE284_gkfbdvyx',
      '_TZE204_ya4ft0w4', '_TZE200_ya4ft0w4', // WHY(P2585): Z2M ZY-M100-24GV3 sibling
      '_TZE204_laokfqwu',`,
  );
  if (next === src) return { changed: false, reason: 'pattern-miss' };
  if (APPLY) fs.writeFileSync(p, next);
  return { changed: true };
}

function ensureMisattributionMotion() {
  const p = path.join(ROOT, 'data', 'user-misattribution-registry.json');
  const reg = JSON.parse(fs.readFileSync(p, 'utf8'));
  const cases = [
    {
      id: 'z2m-o4mkahkc-ts0202-motion',
      manufacturerName: '_TZ3000_o4mkahkc',
      productId: 'TS0202',
      canonicalDriver: 'motion_sensor',
      forbidDrivers: ['contact_sensor', 'climate_sensor'],
      forbidMode: 'couple',
      reason: 'P2585 Z2M IH012-RT02 motion — not contact (TS0202)',
      sources: ['z2m', 'blakadder'],
    },
    {
      id: 'z2m-ksz749x8-ts0601-climate',
      manufacturerName: '_TZE284_ksz749x8',
      productId: 'TS0601',
      canonicalDriver: 'climate_sensor',
      forbidDrivers: ['button_wireless_2', 'button_wireless_1', 'button_wireless_4'],
      forbidMode: 'couple',
      reason: 'P2585 Z2M temperature_humidity_sensor_2 — not wireless button',
      sources: ['z2m'],
    },
    {
      id: 'z2m-ksz749x8-tze204-ts0601-climate',
      manufacturerName: '_TZE204_ksz749x8',
      productId: 'TS0601',
      canonicalDriver: 'climate_sensor',
      forbidDrivers: ['button_wireless_2', 'button_wireless_1', 'button_wireless_4'],
      forbidMode: 'couple',
      reason: 'P2585 Z2M TH sibling — not wireless button',
      sources: ['z2m'],
    },
  ];
  let changed = false;
  reg.cases = reg.cases || [];
  for (const c of cases) {
    if (reg.cases.some((x) => x.id === c.id)) continue;
    reg.cases.push(c);
    changed = true;
  }
  if (APPLY && changed) fs.writeFileSync(p, `${JSON.stringify(reg, null, 2)}\n`);
  return { changed };
}

function main() {
  const results = [];
  for (const c of COUPLES) {
    results.push({ ...c, result: enrichCompose(c.driver, c.mfr, c.pid) });
  }
  const radar = enrichRadarConfigYa4();
  const mis = ensureMisattributionMotion();
  const report = {
    generated: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    couples: COUPLES.length,
    wrote: results.filter((r) => r.result.changed).length,
    results,
    radarConfig: radar,
    misattribution: mis,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`[p2585c] ${report.mode} couples=${COUPLES.length} wouldWrite=${report.wrote}`);
  for (const r of results.filter((x) => x.result.changed)) {
    console.log(`  + ${r.mfr}+${r.pid} → ${r.driver} (+${r.result.addedMfr}mfr +${r.result.addedPid}pid)`);
  }
  if (radar.changed) console.log('  + ZY_M100 config ya4ft0w4');
  if (mis.changed) console.log('  + misattribution o4mkahkc→motion_sensor');
}

main();
