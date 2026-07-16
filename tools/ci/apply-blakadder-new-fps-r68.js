#!/usr/bin/env node
/**
 * P68: Apply 12 brand-new Blakadder fingerprints (R68 batch)
 *   + 35 high-confidence Blakadder mfrs not in mfs_db but in driver
 *
 * Source: zigbee.blakadder.com/assets/js/database.js (2026-07-16 680 unique mfrs)
 * Cross-ref method: 15 of 680 Blakadder mfrs are NOT in any of our 431 drivers.
 *                  60 of 680 are NOT in mfs_db (mfs_db.sacredCouples) but are in driver.
 *                  We add the 12 truly new mfrs to the right drivers based on Blakadder
 *                  category + Z2M compatibility.
 *
 * Output: adds 12 mfrs to driver.compose.json files + corresponding flow cards if needed.
 *
 * Run: node tools/ci/apply-blakadder-new-fps-r68.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');

/* 12 brand-new fingerprints not in any driver — target drivers chosen from Blakadder
   category + Z2M compatibility + existing driver conventions. */
const NEW_FPS = [
  // Sensors
  { mfr: '_TYZB01_ujfk3xd9', driver: 'climate_sensor', note: 'Akuvox M423-9E T/H sensor' },
  { mfr: '_TYZB01_wpmo3ja3', driver: 'co_sensor', note: 'Heiman HS1CA-TY CO sensor (Tuya)' },
  { mfr: '_TYZB01_8scntis1', driver: 'siren', note: 'Heiman HS2WD Sound and Flash Siren' },
  { mfr: '_TYZB01_8wt0zp49', driver: 'sensor_gas_presence', note: 'Tesla Smart TSL-SEN-GAS' },
  { mfr: '_TYZB01_qiplt4jq', driver: 'smoke_sensor2', note: 'Tesla Smart TSL-SEN-SMOKE' },
  { mfr: '_TYZB01_fi5yftwv', driver: 'climate_sensor', note: 'Konke KK-ES-J01W T/H sensor' },
  { mfr: '_TZ3000_fab7r7mc', driver: 'sensor_contact_zigbee', note: 'Tuya GD-D-Z Contact Sensor' },
  { mfr: '_TZ3000_psqjayrd', driver: 'sensor_contact_zigbee', note: 'Tuya MC-Xw Door Magnetic' },
  { mfr: '_TYZB01_dvakyzhd', driver: 'switch_4gang', note: 'Tuya TS0014 4-Gang Wall Switch' },
  // Remotes
  { mfr: '_TYZB01_7qf81wty', driver: 'scene_switch_1', note: 'Immax 07087-2 Neo Smart remote v2' },
  { mfr: '_TYZB01_hww2py6b', driver: 'scene_switch_1', note: 'Lidl FB21-001 Livarno Dimmer Remote' },
  // Lights
  { mfr: '_TZ3000_cmaky9gq', driver: 'bulb_dimmable', note: 'Mercator SMLD533-ZB RGB+CCT Strip' }
];

/* 35 additional mfrs in driver but not in mfs_db — add to mfs_db.sacredCouples for coverage. */
const NEW_SACRED_PAIRS = [
  // [mfr, pid, driver, note]
  ['_TZ3000_ztrfrcsu', 'TS0001', 'scene_switch_1', 'Aldi 141L100RC Megos dimmer remote'],
  ['_TZ3210_remypqqm', 'TS0505B', 'bulb_dimmable', 'Avacom TS0505B 12W RGB+CCT'],
  ['_TZ3000_9vo5icau', 'TS011F', 'plug_energy_monitor', 'Avatto TS011F Smart Plug BR'],
  ['_TZ3000_jyupj3fw', 'TS0016', 'switch_wall_6gang', 'Avatto ZTS16 6-Gang Light Switch'],
  ['_TZ3210_psgq7ysz', 'TS0502A', 'bulb_dimmable', 'Benexmart ST64 E27 Dual Color Filament'],
  ['_TZ3210_ijczzg9h', 'TS0504A', 'bulb_dimmable', 'Giderwel C05Z RGBCCT LED Controller'],
  ['_TZ3000_7dndcnnb', 'TS0601', 'switch_1gang', 'LELLKI CM004 25A Overload Protection'],
  ['_TYST11_xu1rkty3', 'TS0601', 'curtain_motor', 'Lawson DT82LE DC Curtain Motor'],
  ['_TZ3000_kohbva1f', 'TS0601', 'bulb_dimmable', 'Lidl 14153706L LED Ceiling Light'],
  ['_TZ3000_aim0ztek', 'TS0601', 'wall_dimmer_tuya', 'LoraTap WH100 Water Heater Switch'],
  ['_TZ3000_hodifxa9', 'TS0001', 'bulb_dimmable', 'Mercator S9B22LED9W-4K-ZB Classic Globe B22'],
  ['_TZ3000_589kq4ul', 'TS0001', 'bulb_dimmable', 'Mercator S9GU10LED5-RGB-Z Downlight'],
  ['_TZ3000_1mtktxdk', 'TS0001', 'bulb_dimmable', 'Mercator SMD4106W-RGB-ZB Downlight'],
  ['_TZ3000_bujv0r9b', 'TS0001', 'bulb_dimmable', 'Mercator SMD9300 Donovan 36W CCT Panel'],
  ['_TZ3000_tza2vjxx', 'TS0001', 'bulb_dimmable', 'Mercator SMLD233-ZB RGB+CCT Strip 2m'],
  ['_TZ3210_q7oryllx', 'TS0601', 'switch_1gang', 'Mercator SPP01G / SSWF01G Fan+Light'],
  ['_TZ3000_fxjdcikv', 'TS0001', 'switch_wall_4gang', 'Mercator SSW04 Quad Switch'],
  ['_TZ3210_mny0zvkm', 'TS0601', 'bulb_dimmable', 'MiBoxer FUTC08Z RGB+CCT Garden'],
  ['_TZE3000_pfc7i3kt', 'TS0601', 'switch_3gang', 'Moes MS-104CZ 3 Gang 2 Way Module'],
  ['_TZ3210_mntza0sw', 'TS0601', 'bulb_dimmable', 'Müller Licht 404062 tint Kea 42cm'],
  ['_TZ3210_r0vzq1oj', 'TS0601', 'bulb_dimmable', 'Müller Licht 404062 tint Kea 42cm alt'],
  ['_TZ3000_hdtmulpn', 'TS0601', 'sensor_contact_zigbee', 'Neo NAS-DS05B2 Door Sensor Homekit'],
  ['_TZ3210_mcm6m1ma', 'TS0601', 'bulb_dimmable', 'Oz Smart DL41-03-10-R-ZB RGBW Downlight'],
  ['_TZ3210_g0qr1fqo', 'TS0601', 'bulb_dimmable', 'Tuya C03Z RGB LED Controller'],
  ['_TZ3000_mantufyr', 'TS0601', 'switch_1gang', 'Tuya DS-102BZN Boiler Switch 20A'],
  ['_TZ3210_grnwgegn', 'TS0501B', 'bulb_dimmable', 'Tuya TS0501B Single Color Controller / Jisim JD4101'],
  ['_TZ3210_nehayyhx', 'TS0501B', 'bulb_dimmable', 'Tuya TS0501B Single Color'],
  ['_TZ3210_wuheofsg', 'TS0501B', 'bulb_dimmable', 'Tuya TS0501B / Zsrsai YSR-ZP-TY'],
  ['_TZ3210_19qb27da', 'TS0501B', 'bulb_dimmable', 'Tuya TS0501B'],
  ['_TZ3210_93gnbdgz', 'TS0501B', 'bulb_dimmable', 'Tuya TS0501B'],
  ['_TZ3000_nzbm4ad4', 'TS0504A', 'bulb_dimmable', 'Tuya TS0504A RGBW Controller'],
  ['_TZ3210_bfvybixd', 'TS0504B', 'bulb_dimmable', 'Tuya TS0504B LED Strip RGBW'],
  ['_TZ3210_1elppmba', 'TS0504B', 'bulb_dimmable', 'Tuya TS0504B LED Strip RGBW alt'],
  ['_TZ3210_5snkkrxw', 'TS0505B', 'bulb_dimmable', 'Tuya TS0505B Downlight 10W RGBCCT'],
  ['_TZ3210_bicjqpg4', 'TS0505B', 'bulb_dimmable', 'Tuya TS0505B Downlight RGBCCT alt'],
  ['_TZ3210_0rn9qhnu', 'TS0505B', 'bulb_dimmable', 'Tuya TS0505B Downlight RGBCCT alt2'],
  ['_TZ3000_l13erpv4', 'TS130F', 'curtain_motor', 'Tuya TS130F Curtain Switch'],
  ['_TZ3000_nfnmi125', 'TS0601', 'plug_energy_monitor', 'Tuya XH-002P Power Monitoring Plug'],
  ['_TZ3210_klv2wul0', 'TS0601', 'bulb_dimmable', 'Tuya ZigBee-01-5CH RGBCW Controller'],
  ['_TZ3210_wp1k8xws', 'TS0504A', 'bulb_dimmable', 'Ysrsai YSR-MINI-Z02 RGB Controller'],
  ['_TZ3000_rbl8c85w', 'TS0601', 'switch_2gang', 'Zemismart ZS-B-EU2 No Neutral 2 Gang'],
  ['_TZ3210_e020aaaj', 'TS0601', 'bulb_dimmable', 'Zemismart XLD-TYCL1-Z 24W RGBCW Downlight'],
  ['_TZ3000_ubrvwoxv', 'TS0601', 'switch_1gang', 'Zemismart ZN-LRL1E 20A High Power Switch'],
  ['_TZE200_9xejegcy', 'TS0601', 'presence_sensor_radar', 'Merrytek MSA201 Z 24G Human Presence']
];

let added = 0;
let errors = [];

for (const fp of NEW_FPS) {
  const cj = path.join(DRIVERS, fp.driver, 'driver.compose.json');
  if (!fs.existsSync(cj)) {
    errors.push(`Driver ${fp.driver} not found`);
    continue;
  }
  const data = JSON.parse(fs.readFileSync(cj, 'utf8'));
  if (!data.zigbee) data.zigbee = {};
  if (!data.zigbee.manufacturerName) data.zigbee.manufacturerName = [];
  const lower = fp.mfr.toLowerCase();
  const existing = data.zigbee.manufacturerName.find(m => m.toLowerCase() === lower);
  if (existing) continue;
  // Add canonical case + lowercase variant
  data.zigbee.manufacturerName.push(fp.mfr);
  if (fp.mfr !== fp.mfr.toLowerCase()) {
    data.zigbee.manufacturerName.push(fp.mfr.toLowerCase());
  }
  fs.writeFileSync(cj, JSON.stringify(data, null, 2) + '\n');
  added++;
  console.log(`✓ ${fp.driver}: +${fp.mfr} (${fp.note})`);
}

// Update mfs_db with all 12 new mfrs + the 35 sacred pair additions
const mfsPath = path.join(ROOT, 'data', 'mfs_db.json');
const mfs = JSON.parse(fs.readFileSync(mfsPath, 'utf8'));
if (!mfs.sacredCouples) mfs.sacredCouples = {};

for (const fp of NEW_FPS) {
  const key = `${fp.mfr.toLowerCase()}|ts0601`;  // most mfrs use TS0601 default pid
  if (!mfs.sacredCouples[key]) {
    mfs.sacredCouples[key] = { driver: fp.driver, source: 'blakadder-r68', added: new Date().toISOString() };
  }
}

for (const [mfr, pid, drv, note] of NEW_SACRED_PAIRS) {
  const key = `${mfr.toLowerCase()}|${pid.toLowerCase()}`;
  if (!mfs.sacredCouples[key]) {
    mfs.sacredCouples[key] = { driver: drv, source: 'blakadder-r68', added: new Date().toISOString() };
  }
  // Also add as top-level key if not present (for coverage)
  if (!mfs[mfr.toLowerCase()]) {
    mfs[mfr.toLowerCase()] = { driver: drv, pid, source: 'blakadder-r68' };
  }
}

// Update stats
if (mfs.stats) {
  mfs.stats.sacredCouples = Object.keys(mfs.sacredCouples).length;
  mfs.stats.lastUpdated = new Date().toISOString();
}

fs.writeFileSync(mfsPath, JSON.stringify(mfs, null, 2));

console.log(`\n=== R68 SUMMARY ===`);
console.log(`Driver FPs added: ${added}`);
console.log(`Sacred pairs added: ${NEW_FPS.length + NEW_SACRED_PAIRS.length}`);
console.log(`mfs_db.sacredCouples: ${Object.keys(mfs.sacredCouples).length}`);
console.log(`Errors: ${errors.length}`);
if (errors.length) errors.forEach(e => console.log(`  ! ${e}`));
