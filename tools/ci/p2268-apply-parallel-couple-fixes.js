'use strict';
/**
 * P2268 — Apply parallel-project sacred-couple corrections (shadow enrich)
 * Sources: ZHA #5260, #5117 · Z2M PJ-MGW1203 / ATMS10013Z3 · misattribution cleanup
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function loadCompose(driverId) {
  const p = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  return { p, j: JSON.parse(fs.readFileSync(p, 'utf8')) };
}

function saveCompose(p, j) {
  fs.writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
}

function variants(mfr) {
  const lower = mfr.toLowerCase();
  const upper = mfr.toUpperCase().replace(/^_TZE/, '_TZE').replace(/^_TZ/, '_TZ');
  const base = mfr.replace(/^_[Tt][Zz][Ee0-9]+_/, '');
  const prefixes = mfr.match(/^(_TZE\d+_)/i) || mfr.match(/^(_TZ\d+_)/i);
  const pref = prefixes ? prefixes[1] : '_TZE284_';
  const out = new Set([mfr, lower, mfr.toUpperCase()]);
  // case forms for Homey cartesian matching
  out.add(`${pref.toLowerCase()}${base.toLowerCase()}`);
  out.add(`${pref.toUpperCase()}${base.toUpperCase()}`);
  out.add(`${pref}${base.toLowerCase()}`);
  out.add(`${pref}${base.toUpperCase()}`);
  return [...out];
}

function removeMfr(j, needle) {
  const re = new RegExp(needle, 'i');
  const before = (j.zigbee.manufacturerName || []).length;
  j.zigbee.manufacturerName = (j.zigbee.manufacturerName || []).filter((m) => !re.test(m));
  return before - j.zigbee.manufacturerName.length;
}

function addMfrs(j, list) {
  j.zigbee.manufacturerName = j.zigbee.manufacturerName || [];
  const set = new Set(j.zigbee.manufacturerName);
  let added = 0;
  for (const m of list) {
    if (!set.has(m)) {
      j.zigbee.manufacturerName.push(m);
      set.add(m);
      added++;
    }
  }
  return added;
}

function ensurePid(j, pid) {
  j.zigbee.productId = j.zigbee.productId || [];
  if (!j.zigbee.productId.includes(pid)) j.zigbee.productId.push(pid);
}

// 1) Clamp meter cjbofhxw: smoke_sensor3 → power_clamp_meter
{
  const smoke = loadCompose('smoke_sensor3');
  const n = removeMfr(smoke.j, 'cjbofhxw');
  saveCompose(smoke.p, smoke.j);
  console.log('smoke_sensor3 removed cjbofhxw variants:', n);

  const clamp = loadCompose('power_clamp_meter');
  const added = addMfrs(clamp.j, [
    ...variants('_TZE204_cjbofhxw'),
    ...variants('_TZE284_cjbofhxw'),
    ...variants('_TZE200_cjbofhxw'),
  ]);
  ensurePid(clamp.j, 'TS0601');
  saveCompose(clamp.p, clamp.j);
  console.log('power_clamp_meter added mfrs:', added);
}

// 2) 3-phase a14rjslz: climate_sensor → energy_meter_3phase
{
  const climate = loadCompose('climate_sensor');
  const n = removeMfr(climate.j, 'a14rjslz');
  saveCompose(climate.p, climate.j);
  console.log('climate_sensor removed a14rjslz variants:', n);

  const meter = loadCompose('energy_meter_3phase');
  const added = addMfrs(meter.j, variants('_TZE284_a14rjslz'));
  ensurePid(meter.j, 'TS0601');
  saveCompose(meter.p, meter.j);
  console.log('energy_meter_3phase added mfrs:', added);
}

// 3) tonrapsk TS0002 → switch_2gang (ZHA #5260; Homey already magic-packets UnifiedSwitchBase)
{
  const sw = loadCompose('switch_2gang');
  const added = addMfrs(sw.j, variants('_TZ3000_tonrapsk'));
  ensurePid(sw.j, 'TS0002');
  saveCompose(sw.p, sw.j);
  console.log('switch_2gang added tonrapsk:', added);
}

console.log('P2268 compose patches done');
