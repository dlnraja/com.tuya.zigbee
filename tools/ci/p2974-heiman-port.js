#!/usr/bin/env node
'use strict';
/**
 * P2974 — port of master P2919/P2921/P2923/P2925 HEIMAN work to stable-v5 / bastien-home.
 *
 * Exact couples only (all sourced, see CREDITS.md):
 *   HEIMAN|RC-EF-3.0              -> heiman_keyfob   (ZHC PR #2182, deCONZ #3828)
 *   HEIMAN|WarningDevice(-EF-3.0) -> heiman_siren    (ZHC #3429, Z2M #1416, deCONZ #6400)
 *   Heiman|WarningDevice(-EF-3.0) -> heiman_siren
 *   HEIMAN|SmokeSensor-EF-3.0     -> smoke_detector_advanced (Homey interview, JohanBendz #190 / forum 26439#2296)
 *
 * WHY: on these branches HEIMAN RC-EF-3.0 sat in button_emergency_sos (PCr2-1), which only
 * exposes an SOS alarm; the keyfob's disarm / arm home / arm all buttons were lost.
 * Wrong-class move (sos -> dedicated keyfob) is flagged in the report.
 * universal_zigbee keeps HEIMAN/Heiman as the catch-all (specific drivers win).
 *
 * The driver folders themselves are checked out from master; this script only edits JSON.
 * Idempotent. --check exits 1 when something would change.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CHECK = process.argv.includes('--check');
const MASTER_APP = process.env.P2974_MASTER_APP || '';
let dirty = 0;

const rd = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const rj = (p) => JSON.parse(rd(p));
function wj(p, data, raw) {
  const pretty = /^\{\s*\n/.test(raw);
  const out = (pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)) + (raw.endsWith('\n') ? '\n' : '');
  if (out !== raw) { dirty++; console.log(`[P2974] ${p}`); if (!CHECK) {fs.writeFileSync(path.join(ROOT, p), out);} }
}
const lc = (s) => String(s).toLowerCase();

// 1. button_emergency_sos: drop HEIMAN mfr + RC-EF-3.0 pid (no other sourced couple uses them there)
function editSos(z) {
  z.manufacturerName = z.manufacturerName.filter((m) => lc(m) !== 'heiman');
  z.productId = z.productId.filter((p) => p !== 'RC-EF-3.0');
}
// 2. smoke_detector_advanced: add HEIMAN SmokeSensor-EF-3.0
function editSmoke(z) {
  for (const m of ['HEIMAN', 'heiman']) {if (!z.manufacturerName.includes(m)) {z.manufacturerName.push(m);}}
  if (!z.productId.includes('SmokeSensor-EF-3.0')) {z.productId.push('SmokeSensor-EF-3.0');}
}
for (const [id, fn] of [['button_emergency_sos', editSos], ['smoke_detector_advanced', editSmoke]]) {
  const p = `drivers/${id}/driver.compose.json`;
  const raw = rd(p); const c = JSON.parse(raw); fn(c.zigbee); wj(p, c, raw);
}

// 3. app.json: same edits + driver entries for the two new drivers (copied from master's built app.json)
{
  const p = 'app.json'; const raw = rd(p); const app = JSON.parse(raw);
  const byId = Object.fromEntries(app.drivers.map((d) => [d.id, d]));
  if (byId.button_emergency_sos) {editSos(byId.button_emergency_sos.zigbee);}
  if (byId.smoke_detector_advanced) {editSmoke(byId.smoke_detector_advanced.zigbee);}
  const missing = ['heiman_keyfob', 'heiman_siren'].filter((id) => !byId[id]);
  if (missing.length) {
    if (!MASTER_APP) {throw new Error('P2974_MASTER_APP needed to add ' + missing.join(','));}
    const m = JSON.parse(fs.readFileSync(MASTER_APP, 'utf8'));
    for (const id of missing) {
      const e = m.drivers.find((d) => d.id === id);
      if (!e) {throw new Error('master app.json lacks ' + id);}
      app.drivers.push(e);
    }
  }
  wj(p, app, raw);
}

// 4. couple-driver-pins: keyfob, siren (x2), smoke
{
  const p = 'config/architecture/couple-driver-pins.json'; const raw = rd(p); const j = JSON.parse(raw);
  const list = Array.isArray(j) ? j : (j.pins || j.couples);
  const want = [
    { id: 'p2974-heiman-keyfob', mfr: ['HEIMAN'], driver: 'heiman_keyfob', pid: 'RC-EF-3.0', source: 'zigbee-herdsman-converters PR #2182 (arnaud-gouder) + deCONZ #3828', regression: 'P2974 port of P2921 dedicated native IAS ACE driver (was button_emergency_sos)' },
    { id: 'p2974-heiman-siren', mfr: ['HEIMAN', 'Heiman'], driver: 'heiman_siren', pid: 'WarningDevice', source: 'zigbee-herdsman-converters #1416/#3429 + deCONZ DDF #6400', regression: 'P2974 port of P2921 dedicated native IAS WD driver' },
    { id: 'p2974-heiman-siren-ef', mfr: ['HEIMAN', 'Heiman'], driver: 'heiman_siren', pid: 'WarningDevice-EF-3.0', source: 'zigbee-herdsman-converters #3429 + deCONZ DDF #6400', regression: 'P2974 port of P2921 dedicated native IAS WD driver' },
    { id: 'p2974-heiman-smoke', mfr: ['HEIMAN'], driver: 'smoke_detector_advanced', pid: 'SmokeSensor-EF-3.0', source: 'Homey interview JohanBendz/com.tuya.zigbee #190 (forum 26439#2296)', regression: 'P2974 port of P2919 native smoke couple' },
  ];
  const sample = list[0] || {};
  for (const w of want) {
    const has = list.some((e) => e.driver === w.driver && e.pid === w.pid && (e.mfr || []).includes(w.mfr[0]));
    if (has) {continue;}
    // drop an older pin of the same couple to another driver (stable PCr2-1 sos pin)
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (e.pid === w.pid && (e.mfr || []).some((m) => w.mfr.includes(m)) && e.driver !== w.driver) {list.splice(i, 1);}
    }
    const entry = { mfr: w.mfr, driver: w.driver, pid: w.pid, source: w.source, regression: w.regression };
    if ('id' in sample) {entry.id = w.id;}
    list.push(entry);
  }
  wj(p, j, raw);
}

// 5. curated removals so bots don't re-add HEIMAN to the SOS driver
{
  const p = 'config/architecture/curated-couple-removals.json'; const raw = rd(p); const j = JSON.parse(raw);
  const has = j.removals.some((e) => e.driver === 'button_emergency_sos' && (e.mfr || []).includes('HEIMAN'));
  if (!has) {
    j.removals.push({
      driver: 'button_emergency_sos',
      mfr: ['HEIMAN', 'heiman'],
      pid: ['RC-EF-3.0'],
      why: '2026-10-24 P2974: HEIMAN HM1RC-2-E (RC-EF-3.0) is a 4-button IAS ACE alarm keyfob (disarm / arm home / arm all / emergency); dedicated driver heiman_keyfob (pinned). The SOS driver exposed only the emergency alarm.',
      source: 'P2974 port of master P2921; zigbee-herdsman-converters PR #2182 (arnaud-gouder), deCONZ #3828',
    });
  }
  wj(p, j, raw);
}

// 6. publish-sacred-keep-couples: retarget the HEIMAN RC-EF-3.0 keep row, add siren + smoke rows
{
  const p = 'config/architecture/publish-sacred-keep-couples.json';
  if (fs.existsSync(path.join(ROOT, p))) {
    const raw = rd(p); const j = JSON.parse(raw); const rows = j.couples;
    for (const r of rows) {
      if (r.mfr === 'HEIMAN' && r.pid === 'RC-EF-3.0' && r.driverId !== 'heiman_keyfob') {
        r.driverId = 'heiman_keyfob';
        r.note = `${r.note || ''} | P2974 2026-10-24: moved to dedicated heiman_keyfob (IAS ACE arm/disarm/emergency)`;
      }
    }
    const add = [
      ['HEIMAN', 'WarningDevice', 'heiman_siren'], ['HEIMAN', 'WarningDevice-EF-3.0', 'heiman_siren'],
      ['Heiman', 'WarningDevice', 'heiman_siren'], ['Heiman', 'WarningDevice-EF-3.0', 'heiman_siren'],
      ['HEIMAN', 'SmokeSensor-EF-3.0', 'smoke_detector_advanced'],
    ];
    for (const [mfr, pid, driverId] of add) {
      if (rows.some((r) => r.mfr === mfr && r.pid === pid)) {continue;}
      rows.push({ mfr, pid, driverId, note: driverId === 'heiman_siren'
        ? 'P2974 port of P2921 HS2WD-E: zigbee-herdsman-converters #3429 genBasic dump + deCONZ DDF #6400 (BabaIsYou)'
        : 'P2974 port of P2919: Homey interview on JohanBendz/com.tuya.zigbee #190 (forum 26439#2296)' });
    }
    wj(p, j, raw);
  }
}

console.log(dirty ? `[P2974] ${CHECK ? 'would change' : 'applied'} (${dirty})` : '[P2974] OK');
if (CHECK && dirty) {process.exit(1);}
