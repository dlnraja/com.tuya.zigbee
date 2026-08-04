#!/usr/bin/env node
'use strict';
// One-shot: resolve mfr+pid collisions by removing wrongly-routed mfrs (all case variants).
const fs = require('fs');

const REMOVALS = {
  // 9 SOS TS0215A buttons wrongly imported into the 1-gang dimmer (kept in button_emergency_sos)
  'drivers/dimmer_wall_1gang/driver.compose.json': [
    '_tz3000_4fsgukof', '_tz3000_wr2ucaj9', '_tz3000_zsh6uat3',
    '_tz3000_tj4pwzzm', '_tz3000_2izubafb', '_tz3000_pkfazisv',
    '_tz3000_ssp0maqm', '_tz3000_p3fph1go', '_tz3000_9r5jaajv',
  ],
  // Multi-gang wall switches (kept in switch_2gang), 3-gang switch (kept in plug),
  // Nous A10Z socket (kept in usb_dongle_triple), 2-gang dimmer module (kept in dimmer_2_gang)
  'drivers/switch_usb_dongle/driver.compose.json': [
    '_tz3000_itgngnqz', '_tz3000_kgxej1dv', '_tz3000_ywubfuvt',
    '_tz3000_qkixdnon', '_tz3210_jlf1nepw', '_tze200_bxoo2swd',
  ],
  // Nous A10Z smart socket wrongly in the Zigbee gateway driver (kept in usb_dongle_triple)
  'drivers/gateway_zigbee_bridge/driver.compose.json': [
    '_tz3210_jlf1nepw',
  ],
  // 1-gang dimmer (z2m TS0601_dimmer_1_gang_1) wrongly in 5-gang switch (kept in wall_dimmer_tuya)
  'drivers/wall_switch_5_gang_tuya/driver.compose.json': [
    '_tze200_3p5ydos3',
  ],
  // 2-gang dimmer module Moes ZM-105B-M wrongly in valve controller (kept in dimmer_2_gang)
  'drivers/valvecontroller/driver.compose.json': [
    '_tze200_bxoo2swd',
  ],
};

const DRIVER_IDS = {
  'drivers/dimmer_wall_1gang/driver.compose.json': 'dimmer_wall_1gang',
  'drivers/switch_usb_dongle/driver.compose.json': 'switch_usb_dongle',
  'drivers/gateway_zigbee_bridge/driver.compose.json': 'gateway_zigbee_bridge',
  'drivers/wall_switch_5_gang_tuya/driver.compose.json': 'wall_switch_5_gang_tuya',
  'drivers/valvecontroller/driver.compose.json': 'valvecontroller',
};

function stripMfrs(mfrs, bases) {
  const re = bases.map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return mfrs.filter(m => !re.some(b => new RegExp('^' + b + '$', 'i').test(m)));
}

const removed = {}; // driverId -> [mfrs removed]

for (const [file, bases] of Object.entries(REMOVALS)) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const before = j.zigbee.manufacturerName.slice();
  j.zigbee.manufacturerName = stripMfrs(before, bases);
  const gone = before.filter(m => !j.zigbee.manufacturerName.includes(m));
  removed[DRIVER_IDS[file]] = gone;
  fs.writeFileSync(file, JSON.stringify(j, null, 2) + '\n');
  console.log(file, ': removed', gone.length, 'variant(s) ->', JSON.stringify(gone));
}

// Sync root app.json (minified)
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
for (const drv of app.drivers) {
  if (!REMOVALS_BY_ID(drv.id)) continue;
}
function REMOVALS_BY_ID(id) {
  return Object.entries(REMOVALS).find(([, ], k) => DRIVER_IDS[Object.keys(REMOVALS)[k]] === id);
}
for (const drv of app.drivers) {
  const entry = Object.entries(REMOVALS).find(([f]) => DRIVER_IDS[f] === drv.id);
  if (!entry) continue;
  if (!drv.zigbee || !Array.isArray(drv.zigbee.manufacturerName)) continue;
  const before = drv.zigbee.manufacturerName.length;
  drv.zigbee.manufacturerName = stripMfrs(drv.zigbee.manufacturerName, entry[1]);
  console.log('app.json', drv.id, ': removed', before - drv.zigbee.manufacturerName.length, 'variant(s)');
}
fs.writeFileSync('app.json', JSON.stringify(app) + '\n');
console.log('app.json synced (minified)');
