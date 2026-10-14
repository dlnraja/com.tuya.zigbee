'use strict';

/**
 * P2820 — Surgical high-confidence Z2M/ZHA wrong-class moves (dry-run default)
 * WHY: Same as P2819 — never wholesale rewrite manufacturerName arrays.
 * Contre quoi: wall modules stuck on button_wireless; soil on plug; garage on contact.
 *
 * Usage: node tools/ci/p2820-apply-z2m-zha-severe.js [--apply]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const OUT = path.join(ROOT, 'reports', 'z2m-zha-quirks-deep-2026-10-14', 'APPLY_SEVERE.json');

function norm(s) {
  return String(s || '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function loadCompose(driverId) {
  const fp = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(fp)) throw new Error(`missing driver ${driverId}`);
  return { fp, json: JSON.parse(fs.readFileSync(fp, 'utf8')) };
}

function saveCompose(fp, json) {
  fs.writeFileSync(fp, `${JSON.stringify(json, null, 2)}\n`);
}

function removeMfrSurgical(json, mfrNorm) {
  const list = [].concat(json.zigbee?.manufacturerName || []);
  const next = list.filter((m) => norm(m) !== mfrNorm);
  const removed = list.length - next.length;
  if (removed) json.zigbee.manufacturerName = next;
  return removed;
}

function addCoupleSurgical(json, mfr, pid) {
  if (!json.zigbee) json.zigbee = {};
  const mfrs = [].concat(json.zigbee.manufacturerName || []);
  const pids = [].concat(json.zigbee.productId || []);
  const mNorm = norm(mfr);
  let addedM = 0;
  if (!mfrs.some((m) => norm(m) === mNorm)) {
    const lower = mfr.toLowerCase();
    const upper = mfr.toUpperCase();
    mfrs.push(lower);
    addedM++;
    if (upper !== lower) {
      mfrs.push(upper);
      addedM++;
    }
  }
  const p = String(pid).toUpperCase();
  let addedP = 0;
  if (p && !pids.some((x) => String(x).toUpperCase() === p)) {
    pids.push(p);
    addedP++;
  }
  json.zigbee.manufacturerName = mfrs;
  json.zigbee.productId = pids;
  return { addedM, addedP };
}

/**
 * Curated from P2820 audit — description-backed Z2M/ZHA only.
 * Skips: water-valve-as-TRV false positives, FCU-as-cover, TZE28C malformed, soft USB-dongle.
 */
const MOVES = [
  // Wall switch modules on wireless button (Z2M)
  { mfr: '_TZ3000_npzfdcof', pid: 'TS0001', add: 'switch_1gang', remove: ['button_wireless_2'] },
  { mfr: '_TZ3000_rmjr4ufz', pid: 'TS0001', add: 'switch_1gang', remove: ['button_wireless_2'] },
  { mfr: '_TZ3000_mx3vgyea', pid: 'TS0001', add: 'switch_1gang', remove: ['button_wireless_2'] },
  { mfr: '_TZ3000_npzfdcof', pid: 'TS000F', add: 'switch_1gang', remove: ['button_wireless_2'] },
  { mfr: '_TZ3000_rmjr4ufz', pid: 'TS000F', add: 'switch_1gang', remove: ['button_wireless_2'] },
  { mfr: '_TZ3000_mx3vgyea', pid: 'TS000F', add: 'switch_1gang', remove: ['button_wireless_2'] },
  // Power strip
  { mfr: '_TZ3000_o005nuxx', pid: 'TS011F', add: 'socket_power_strip', remove: ['button_wireless_2'] },
  // Water valve
  { mfr: '_TZE200_hbnfokum', pid: 'TS0601', add: 'water_valve_smart', remove: ['button_wireless_4'] },
  // Wall outlets / sockets on switch_1gang → plug_smart
  { mfr: '_TZ3000_mvn6jl7x', pid: 'TS011F', add: 'plug_smart', remove: ['switch_1gang'] },
  { mfr: '_TZ3000_raviyuvk', pid: 'TS011F', add: 'plug_smart', remove: ['switch_1gang'] },
  { mfr: '_TZ3000_92qd4sqa', pid: 'TS011F', add: 'plug_smart', remove: ['switch_1gang'] },
  { mfr: '_TZ3000_zwaadvus', pid: 'TS011F', add: 'plug_smart', remove: ['switch_1gang'] },
  { mfr: '_TZ3000_6s5dc9lx', pid: 'TS011F', add: 'plug_smart', remove: ['switch_1gang'] },
  { mfr: '_TZ3000_helyqdvs', pid: 'TS011F', add: 'plug_smart', remove: ['switch_1gang'] },
  { mfr: '_TZ3000_qlmnxmac', pid: 'TS011F', add: 'plug_smart', remove: ['switch_1gang'] },
  { mfr: '_TZ3000_sgb0xhwn', pid: 'TS011F', add: 'plug_smart', remove: ['switch_1gang'] },
  { mfr: '_TZ3210_sgb0xhwn', pid: 'TS011F', add: 'plug_smart', remove: ['switch_1gang'] },
  { mfr: '_TZ3210_2dfy6tol', pid: 'TS0101', add: 'plug_smart', remove: ['switch_1gang'] },
  { mfr: '_TZ3000_uyrhiafs', pid: 'TS011F', add: 'plug_smart', remove: ['switch_1gang'] },
  { mfr: '_TYZB01_ijihzffk', pid: 'TS0101', add: 'plug_smart', remove: ['switch_1gang'] },
  // Garage
  { mfr: '_TZE204_jktmrpoj', pid: 'TS0601', add: 'garage_door_opener', remove: ['sensor_contact_zigbee'] },
  { mfr: '_TZE284_nklqjk62', pid: 'TS0601', add: 'garage_door_opener', remove: ['sensor_contact_zigbee'] },
  // Cover motor
  { mfr: '_TZE204_ycke4deo', pid: 'TS0601', add: 'curtain_motor', remove: ['presence_sensor_radar'] },
  // Soil
  { mfr: '_TZE200_ga1maeof', pid: 'TS0601', add: 'soil_sensor', remove: ['switch_wireless'] },
  { mfr: '_TZE200_2se8efxh', pid: 'TS0601', add: 'soil_sensor', remove: ['plug_smart'] },
  // Missing couples (additive only — no remove)
  { mfr: '_TZE284_5qfrnbqs', pid: 'TS0601', add: 'presence_sensor_radar', remove: [] },
  { mfr: '_TZE204_dak2k10o', pid: 'TS0601', add: 'air_quality_comprehensive', remove: [] },
  { mfr: '_TZE284_xc7dve2g', pid: 'TS0601', add: 'button_emergency_sos', remove: [] },
  { mfr: '_TZ3210_ffuna0nr', pid: 'TS0505B', add: 'light_rgbcct_ts0505b', remove: [] },
  { mfr: '_TZ3210_rbixajyp', pid: 'TS0503B', add: 'light_bulb_rgb', remove: [] },
  { mfr: '_TZ3210_w7ge4ldo', pid: 'TS0503B', add: 'light_bulb_rgb', remove: [] },
  { mfr: '_TZE204_wsek35um', pid: 'TS0601', add: 'device_radiator_valve', remove: [] },
  { mfr: '_TZE284_adlblwab', pid: 'TS0601', add: 'switch_wall_8gang', remove: [] },
  { mfr: '_TZE204_m9dzckna', pid: 'TS0601', add: 'relay_board_4_channel', remove: [] },
  // Round 2 — valves/TRV/presence stuck on wireless remotes
  { mfr: '_TZ3000_5ucujjts', pid: 'TS0001', add: 'switch_1gang', remove: ['button_wireless_2'] },
  { mfr: '_TZ3000_5ucujjts', pid: 'TS0011', add: 'switch_1gang', remove: ['button_wireless_2'] },
  { mfr: '_TZ3000_5ucujjts', pid: 'TS011F', add: 'plug_smart', remove: ['button_wireless_2'] },
  { mfr: '_TZ3000_w0ypwa1f', pid: 'TS0001', add: 'switch_1gang', remove: ['button_wireless_2'] },
  { mfr: '_TZ3000_w0ypwa1f', pid: 'TS0011', add: 'switch_1gang', remove: ['button_wireless_2'] },
  { mfr: '_TZ3000_w0ypwa1f', pid: 'TS011F', add: 'plug_smart', remove: ['button_wireless_2'] },
  { mfr: '_TZE204_m5r5nlxc', pid: 'TS0601', add: 'device_radiator_valve', remove: ['button_wireless_2'] },
  { mfr: '_TZE284_bw4ayyeh', pid: 'TS0601', add: 'presence_sensor_radar', remove: ['button_wireless_4'] },
  // USB wall outlets — additive to usb_outlet_advanced (keep switch_usb_dongle to avoid empty compose)
  { mfr: '_TZ3000_3zofvcaa', pid: 'TS011F', add: 'usb_outlet_advanced', remove: [] },
  { mfr: '_TZ3000_pvlvoxvt', pid: 'TS011F', add: 'usb_outlet_advanced', remove: [] },
  { mfr: '_TZ3000_lqb7lcq9', pid: 'TS011F', add: 'usb_outlet_advanced', remove: [] },
  { mfr: '_TZ3210_lqb7lcq9', pid: 'TS011F', add: 'usb_outlet_advanced', remove: [] },
  { mfr: '_TZ3210_urjf5u18', pid: 'TS011F', add: 'usb_outlet_advanced', remove: [] },
  { mfr: '_TZ3210_8n4dn1ne', pid: 'TS011F', add: 'usb_outlet_advanced', remove: [] },
  // Round 3 — multi-gang outlets / strips (additive; keep switch_* when it would empty)
  { mfr: '_TZ3000_bep7ccew', pid: 'TS011F', add: 'plug_smart', remove: ['switch_2gang'] },
  { mfr: '_TZ3000_dlug3kbc', pid: 'TS011F', add: 'plug_smart', remove: ['switch_2gang'] },
  { mfr: '_TZ3000_gdyjfvgm', pid: 'TS011F', add: 'socket_power_strip', remove: ['switch_2gang'] },
  { mfr: '_TYZB01_mtunwanm', pid: 'TS011F', add: 'plug_smart', remove: [] },
  { mfr: '_TZE284_4vbj3fxh', pid: 'TS0601', add: 'device_radiator_valve', remove: ['button_wireless_4'] },
];

function main() {
  const plan = [];
  const touched = new Map();

  for (const move of MOVES) {
    const entry = {
      mfr: move.mfr,
      pid: move.pid,
      add: move.add,
      remove: move.remove,
      actions: [],
    };
    if (!touched.has(move.add)) {
      touched.set(move.add, loadCompose(move.add));
    }
    const addDoc = touched.get(move.add);
    const before = (addDoc.json.zigbee?.manufacturerName || []).length;
    const added = addCoupleSurgical(addDoc.json, move.mfr, move.pid);
    entry.actions.push({
      driver: move.add,
      op: 'add',
      addedM: added.addedM,
      addedP: added.addedP,
      mfrCountBefore: before,
      mfrCountAfter: (addDoc.json.zigbee?.manufacturerName || []).length,
    });

    for (const rid of move.remove || []) {
      if (!touched.has(rid)) {
        try {
          touched.set(rid, loadCompose(rid));
        } catch {
          entry.actions.push({ driver: rid, op: 'skip_missing' });
          continue;
        }
      }
      const remDoc = touched.get(rid);
      const removed = removeMfrSurgical(remDoc.json, norm(move.mfr));
      entry.actions.push({ driver: rid, op: 'remove', removed });
    }
    plan.push(entry);
  }

  if (APPLY) {
    for (const [, doc] of touched) {
      saveCompose(doc.fp, doc.json);
    }
  }

  const report = {
    applied: APPLY,
    generatedAt: new Date().toISOString(),
    moveCount: MOVES.length,
    driversTouched: [...touched.keys()],
    plan,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ applied: APPLY, moves: MOVES.length, drivers: report.driversTouched.length }, null, 2));
  console.log(`wrote ${OUT}`);
}

main();
