#!/usr/bin/env node
'use strict';
/**
 * P2519 — CI gate: enrich must be append-only (no capability wipe, no sacred drop).
 * Contre quoi: fleet/market/case-variant overwriting user-verified couples.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const fails = [];

function load(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function hasMfr(driver, re) {
  const j = load(`drivers/${driver}/driver.compose.json`);
  return (j.zigbee?.manufacturerName || []).some((m) => re.test(String(m)));
}

// Climate must not host switch/button false paints (compose + app.json)
{
  const c = load('drivers/climate_sensor/driver.compose.json');
  if ((c.zigbee.manufacturerName || []).some((m) => /8eazvzo6|krwtzhfd/i.test(m))) {
    fails.push('climate_sensor hosts 8eazvzo6/krwtzhfd (overwrite regression)');
  }
  if ((c.zigbee.productId || []).some((p) => /^TS004F$/i.test(p))) {
    fails.push('climate_sensor invent productId TS004F');
  }
  try {
    const a = load('app.json');
    const d = (a.drivers || []).find((x) => x.id === 'climate_sensor');
    if (d && (d.zigbee?.manufacturerName || []).some((m) => /8eazvzo6|krwtzhfd/i.test(m))) {
      fails.push('app.json climate_sensor hosts 8eazvzo6/krwtzhfd');
    }
    if (d && (d.zigbee?.productId || []).some((p) => /^TS004F$/i.test(p))) {
      fails.push('app.json climate_sensor invent TS004F');
    }
  } catch (_e) { /* soft if app.json absent */ }
}

// WHY(P2523): doNotLock couple bans must block mfr-only placement
{
  const { isForbiddenPlacement } = require('../../lib/pairing/UserMisattributionRegistry');
  if (!isForbiddenPlacement('_TZ3000_krwtzhfd', 'climate_sensor')) {
    fails.push('isForbiddenPlacement must block krwtzhfd→climate (doNotLock)');
  }
}

const sacred = [
  ['wall_dimmer_tuya', /m1cvyneb/i, 'PresentSky BSEED dimmer'],
  ['water_leak_sensor', /k4ej3ww2/i, 'Peter/leak IAS'],
  ['button_wireless_1', /mrpevh8p/i, 'Peter Smartbutton'],
  ['presence_sensor_radar', /clrdrnya/i, 'VicHY radar'],
  ['curtain_motor', /fodv6bkr|icka1clh/i, 'Eduard/MIAMO curtain'],
  ['energy_meter_3phase', /a14rjslz/i, '3-phase meter'],
  ['wall_switch_2gang_1way', /l9brjwau/i, 'BSEED 2gang'],
  ['switch_wall_6gang', /8eazvzo6/i, '6gang not climate'],
  ['water_valve_garden', /mq4wujmp/i, 'Kai T26439 irrigation'],
];
for (const [d, re, note] of sacred) {
  if (!hasMfr(d, re)) fails.push(`sacred missing ${note} @ ${d}`);
}

// energy meter DP1
{
  const src = fs.readFileSync(path.join(ROOT, 'drivers/energy_meter_3phase/device.js'), 'utf8');
  if (!/1:\s*\{\s*capability:\s*'meter_power'/.test(src)) fails.push('energy_meter_3phase DP1 not meter_power');
  if (/1:\s*\{\s*capability:\s*'onoff'/.test(src)) fails.push('energy_meter_3phase DP1 onoff regression');
}

if (fails.length) {
  console.error('P2519 FAIL');
  for (const f of fails) console.error(' -', f);
  process.exit(1);
}
console.log('P2519 PASS — enrich append-only / sacred couples intact');
process.exit(0);
