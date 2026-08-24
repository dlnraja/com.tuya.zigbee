#!/usr/bin/env node
/**
 * P2234 — Sacred couples from external Z2M/ZHA web research (2026-07/08).
 *
 * WHY: Other projects already locked mfr+pid; our catalogs had several MISATTRIBUTES
 *      (dimmer on soil, repeater on switch_1gang, etc.) and missing recent couples.
 * HOW: Rehome wrong drivers + add verified couples only (never invent pid).
 * POUR QUI: BOTH (reliability pairing).
 * CONTRE: enrichers re-injecting wrong drivers → registry + mfs lock.
 *
 * Usage:
 *   node tools/ci/apply-p2234-z2m-web-sacred.js
 *   node tools/ci/apply-p2234-z2m-web-sacred.js --apply
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const APPLY = process.argv.includes('--apply');

function variants(mfr) {
  const base = String(mfr).trim();
  const out = new Set([base, base.toLowerCase()]);
  const m = base.match(/^(_[A-Za-z0-9]+)_(.+)$/);
  if (m) {
    out.add(`${m[1].toUpperCase()}_${m[2].toLowerCase()}`);
    out.add(`${m[1].toLowerCase()}_${m[2].toLowerCase()}`);
    out.add(`${m[1].toUpperCase()}_${m[2].toUpperCase()}`);
  }
  return [...out];
}

function load(driver) {
  const f = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  return { f, j: JSON.parse(fs.readFileSync(f, 'utf8')) };
}

function save(f, j) {
  if (APPLY) fs.writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);
}

function ensureMfr(driver, mfr, pids = []) {
  const { f, j } = load(driver);
  j.zigbee = j.zigbee || {};
  j.zigbee.manufacturerName = j.zigbee.manufacturerName || [];
  j.zigbee.productId = j.zigbee.productId || [];
  let added = 0;
  for (const v of variants(mfr)) {
    if (!j.zigbee.manufacturerName.some((x) => String(x).toLowerCase() === v.toLowerCase())) {
      j.zigbee.manufacturerName.push(v);
      added += 1;
    }
  }
  for (const pid of pids) {
    if (!j.zigbee.productId.some((p) => String(p).toLowerCase() === String(pid).toLowerCase())) {
      j.zigbee.productId.push(pid);
      added += 1;
    }
  }
  save(f, j);
  return added;
}

function removeMfr(driver, mfr) {
  const { f, j } = load(driver);
  if (!j.zigbee?.manufacturerName) return 0;
  const want = new Set(variants(mfr).map((v) => v.toLowerCase()));
  const before = j.zigbee.manufacturerName.length;
  j.zigbee.manufacturerName = j.zigbee.manufacturerName.filter((m) => !want.has(String(m).toLowerCase()));
  const removed = before - j.zigbee.manufacturerName.length;
  if (removed) save(f, j);
  return removed;
}

function patchMfs(mfr, driverId, modelIds) {
  const f = path.join(ROOT, 'data', 'mfs_db.json');
  const db = JSON.parse(fs.readFileSync(f));
  const devices = db.devices || (db.devices = {});
  const key = Object.keys(devices).find((k) => k.toLowerCase() === mfr.toLowerCase()) || mfr;
  const prev = devices[key] && typeof devices[key] === 'object' ? devices[key] : {};
  const ids = Array.isArray(modelIds) ? modelIds : [modelIds];
  devices[key] = {
    ...prev,
    manufacturerId: mfr,
    driverId,
    driverHint: driverId,
    source: 'p2234-z2m-web',
    modelIds: ids,
    pid: ids[0],
    confidence: 0.95,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  if (APPLY) fs.writeFileSync(f, JSON.stringify(db));
  return { key, driverId, modelIds: ids };
}

/** @type {{op:'rehome'|'add', mfr:string, from?:string[], to:string, pids:string[], why:string}[]} */
const ACTIONS = [
  // --- REHOMES (Z2M verified misattributes) ---
  {
    op: 'rehome',
    mfr: '_TZ3000_gdsvhfao',
    from: ['switch_1gang'],
    to: 'zigbee_repeater',
    pids: ['TS0001'],
    why: 'Z2M #11207 TS0001_repeater — not a 1-gang switch',
  },
  {
    op: 'rehome',
    mfr: '_TZE200_itp8dt7f',
    from: ['soil_sensor'],
    to: 'wall_dimmer_tuya',
    pids: ['TS0601'],
    why: 'Z2M #12213 alias of ykgar0ow / 4mh6tyyo ION touch dimmer',
  },
  {
    op: 'rehome',
    mfr: '_TZ3000_dershnvx',
    from: ['switch_1gang'],
    to: 'switch_2gang',
    pids: ['TS0002'],
    why: 'Z2M #12246 2-gang no-neutral (TS0002)',
  },
  {
    op: 'rehome',
    mfr: '_TZ3000_icoxotza',
    from: ['switch_1gang'],
    to: 'switch_2gang',
    pids: ['TS0726'],
    why: 'Z2M #11720 TS0726_2_gang',
  },
  {
    op: 'rehome',
    mfr: '_TZE204_qujphad5',
    from: ['bulb_dimmable'],
    to: 'wall_thermostat',
    pids: ['TS0601'],
    why: 'Z2M #12869 TYBAC-006 FCU thermostat (sibling mpbki2zm)',
  },
  {
    op: 'rehome',
    mfr: '_TZE204_apiu8k13',
    from: ['switch_1gang'],
    to: 'plug_energy_monitor',
    pids: ['TS0601'],
    why: 'Z2M power-monitoring water heater switch (same family as q9qytwfa)',
  },
  {
    op: 'rehome',
    mfr: '_TZE204_mpbki2zm',
    from: ['thermostatic_radiator_valve', 'generic_tuya'],
    to: 'wall_thermostat',
    pids: ['TS0601'],
    why: 'Z2M TYBAC-006 wall FCU thermostat — not TRV',
  },

  // --- ADDS (recent open/merged Z2M couples) ---
  {
    op: 'add',
    mfr: '_TZE200_7upwjcca',
    to: 'curtain_motor',
    pids: ['TS0601'],
    why: 'Z2M #32905 cover motor TS0601_cover_14',
  },
  {
    op: 'add',
    mfr: '_TZE284_q9qytwfa',
    to: 'plug_energy_monitor',
    pids: ['TS0601'],
    why: 'Z2M #32883 Nisko water heater — same DPs as apiu8k13',
  },
  {
    op: 'add',
    mfr: '_TZ3000_anptztic',
    to: 'plug_energy_monitor',
    pids: ['TS0001'],
    why: 'Z2M #32609 TS0001 with haElectricalMeasurement + seMetering',
  },
  {
    op: 'add',
    mfr: '_TZ3000_ly9apzky',
    to: 'wall_switch_3gang_1way',
    pids: ['TS0003'],
    why: 'Z2M #32810 3-channel relay TS0003',
  },
  {
    op: 'add',
    mfr: '_TZE204_pkpfn9hc',
    to: 'air_quality_co2',
    pids: ['TS0601'],
    why: 'Z2M #12949 CO2/temp/humidity sensor',
  },
  {
    op: 'add',
    mfr: '_TZ3002_y7wpizuw',
    to: 'switch_4gang',
    pids: ['TS0726'],
    why: 'Z2M #32628 TS0726 4-gang wall switch',
  },
  {
    op: 'add',
    mfr: '_TZE284_smcqit2l',
    to: 'wall_thermostat',
    pids: ['TS0601'],
    why: 'Z2M #32568 BHT-209W interview manufName (title typo smcqil2l)',
  },
  {
    op: 'add',
    mfr: '_TZE284_6uyu20xu',
    to: 'climate_sensor',
    pids: ['TS0601'],
    why: 'Z2M #32491 Chayo temp/humidity TOVTH',
  },
  {
    op: 'add',
    mfr: '_TZE200_ykgar0ow',
    to: 'wall_dimmer_tuya',
    pids: ['TS0601'],
    why: 'Ensure sibling lock for itp8dt7f alias chain',
  },
];

function main() {
  const log = [];
  for (const a of ACTIONS) {
    let removed = 0;
    let added = 0;
    if (a.from) {
      for (const d of a.from) {
        try {
          removed += removeMfr(d, a.mfr);
        } catch (e) {
          log.push({ mfr: a.mfr, err: `remove ${d}: ${e.message}` });
        }
      }
    }
    try {
      added = ensureMfr(a.to, a.mfr, a.pids);
      patchMfs(a.mfr, a.to, a.pids);
    } catch (e) {
      log.push({ mfr: a.mfr, err: `ensure ${a.to}: ${e.message}` });
      continue;
    }
    log.push({
      op: a.op,
      mfr: a.mfr,
      to: a.to,
      pids: a.pids,
      removed,
      added,
      why: a.why,
      dryRun: !APPLY,
    });
  }

  // Registry append (canonical locks)
  const regPath = path.join(ROOT, 'data', 'user-misattribution-registry.json');
  const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
  const newCases = [
    {
      id: 'p2234-gdsvhfao-repeater',
      mfr: variants('_TZ3000_gdsvhfao'),
      productId: ['TS0001'],
      canonicalDriver: 'zigbee_repeater',
      forbiddenDrivers: ['switch_1gang', 'switch_2gang'],
      source: 'z2m#11207',
      notes: 'TS0001_repeater — pairing button repeater',
    },
    {
      id: 'p2234-itp8dt7f-dimmer',
      mfr: variants('_TZE200_itp8dt7f'),
      productId: ['TS0601'],
      canonicalDriver: 'wall_dimmer_tuya',
      forbiddenDrivers: ['soil_sensor', 'climate_sensor'],
      source: 'z2m#12213',
      notes: 'ION touch dimmer alias of ykgar0ow',
    },
    {
      id: 'p2234-qujphad5-tybac',
      mfr: variants('_TZE204_qujphad5'),
      productId: ['TS0601'],
      canonicalDriver: 'wall_thermostat',
      forbiddenDrivers: ['bulb_dimmable', 'thermostatic_radiator_valve'],
      source: 'z2m#12869',
      notes: 'TYBAC-006 FCU thermostat',
    },
    {
      id: 'p2234-apiu8k13-q9qytwfa-water-heater',
      mfr: [...variants('_TZE204_apiu8k13'), ...variants('_TZE284_q9qytwfa')],
      productId: ['TS0601'],
      canonicalDriver: 'plug_energy_monitor',
      forbiddenDrivers: ['switch_1gang', 'soil_sensor', 'climate_sensor'],
      source: 'z2m#32883',
      notes: 'Power-monitoring water heater controller',
    },
  ];
  let regAdded = 0;
  for (const c of newCases) {
    if (!reg.cases.some((x) => x.id === c.id)) {
      reg.cases.push(c);
      regAdded += 1;
    }
  }
  if (APPLY && regAdded) fs.writeFileSync(regPath, `${JSON.stringify(reg, null, 2)}\n`);

  console.log(JSON.stringify({ apply: APPLY, actions: log.length, regAdded, log }, null, 2));
  if (!APPLY) console.log('\n[dry-run] re-run with --apply to write');
}

main();
