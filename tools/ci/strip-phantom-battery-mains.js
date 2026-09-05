#!/usr/bin/env node
/**
 * P115 — Strip phantom measure_battery from mains+power drivers.
 * Homey Energy shows "?" when measure_battery exists with null value, or a
 * fake % when routers invent estimates. True AC sockets/lights with power
 * metering must not advertise energy.batteries.
 *
 * Usage:
 *   node tools/ci/strip-phantom-battery-mains.js
 *   node tools/ci/strip-phantom-battery-mains.js --apply
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APPLY = process.argv.includes('--apply');
const DRIVERS = path.join(ROOT, 'drivers');

const POWER_CAPS = new Set(['measure_power', 'meter_power', 'measure_voltage', 'measure_current']);
const MAINS_CLASSES = new Set(['socket', 'light', 'heater', 'fan', 'thermostat', 'TV', 'other']);

function shouldStrip(j) {
  const caps = Array.isArray(j.capabilities) ? j.capabilities : [];
  if (!caps.includes('measure_battery') && !caps.includes('alarm_battery')) return false;

  const hasPower = caps.some((c) => POWER_CAPS.has(c));
  const mainsFlag = j.energy?.mains; // true | false | undefined
  const isMains = mainsFlag === true;
  const cls = j.class;

  // Never strip pure wireless remotes / battery buttons without power metering
  if ((cls === 'button' || cls === 'sensor') && !hasPower && !isMains) return false;

  // Explicit mains
  if (isMains && (hasPower || MAINS_CLASSES.has(cls))) return true;

  // AC sockets/lights with power metering — even if energy.mains omitted
  // (common bug: batteries:["OTHER"] without mains:true → Homey Energy "?")
  if (hasPower && (cls === 'socket' || cls === 'light') && mainsFlag !== false) return true;

  // Fake chemistry on power sockets
  if (hasPower && cls === 'socket' && Array.isArray(j.energy?.batteries)
    && j.energy.batteries.every((b) => String(b).toUpperCase() === 'OTHER')) {
    return true;
  }
  return false;
}

const report = [];
for (const d of fs.readdirSync(DRIVERS)) {
  const f = path.join(DRIVERS, d, 'driver.compose.json');
  if (!fs.existsSync(f)) continue;
  let j;
  try {
    j = JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (_e) {
    continue;
  }
  if (!shouldStrip(j)) continue;

  const beforeCaps = [...(j.capabilities || [])];
  j.capabilities = (j.capabilities || []).filter(
    (c) => c !== 'measure_battery' && c !== 'alarm_battery',
  );
  if (j.capabilitiesOptions) {
    delete j.capabilitiesOptions.measure_battery;
    delete j.capabilitiesOptions.alarm_battery;
  }
  if (j.energy) {
    delete j.energy.batteries;
    j.energy.mains = true;
  } else {
    j.energy = { mains: true };
  }

  const removed = beforeCaps.filter((c) => !(j.capabilities || []).includes(c));
  report.push({ driver: d, class: j.class, removed, energy: j.energy });
  if (APPLY) {
    fs.writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);
  }
}

const outDir = path.join(ROOT, '.github', 'state');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'strip-phantom-battery-report.json');
fs.writeFileSync(out, `${JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', count: report.length, report }, null, 2)}\n`);
console.log(`P115 phantom battery strip: ${report.length} drivers ${APPLY ? 'APPLIED' : '(dry-run — pass --apply)'}`);
console.log('Report:', out);
for (const r of report.slice(0, 25)) {
  console.log(`  ${r.driver}: -${r.removed.join(',')}`);
}
if (report.length > 25) console.log(`  … +${report.length - 25} more`);
