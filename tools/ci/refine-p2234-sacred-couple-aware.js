#!/usr/bin/env node
/**
 * P2234b — Refine prior sacred-couple research (mfr ≠ unique device).
 *
 * WHY: P2234 compose rehomes were OK, but mfs_db stayed mfr-centric with
 *      invented/extra modelIds (TS0601 on ZCL switches) and ly9apzky landed
 *      on BOTH switch_3gang + wall_switch_3gang_1way.
 * HOW: Lock ONLY verified (mfr,pid) → driver; strip invented pids; remove
 *      dual-compose collisions. Never invent a second pid for coverage.
 * POUR QUI: BOTH (pairing reliability).
 * CONTRE: enrichers re-injecting mfr-only hits → registry + modelIds gate.
 *
 * Usage:
 *   node tools/ci/refine-p2234-sacred-couple-aware.js
 *   node tools/ci/refine-p2234-sacred-couple-aware.js --apply
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

/** Verified couples only — one row = one (mfr,pid) → driver. Sibling prefixes are separate. */
const COUPLES = [
  {
    mfr: '_TZ3000_gdsvhfao',
    pids: ['TS0001'],
    driver: 'zigbee_repeater',
    removeFrom: ['switch_1gang', 'switch_2gang'],
    forbid: ['switch_1gang', 'switch_2gang', 'plug_energy_monitor'],
    why: 'Z2M#11207 TS0001_repeater only — not every TS0001',
  },
  {
    mfr: '_TZE200_itp8dt7f',
    pids: ['TS0601'],
    driver: 'wall_dimmer_tuya',
    removeFrom: ['soil_sensor', 'climate_sensor'],
    forbid: ['soil_sensor', 'climate_sensor', 'zigbee_universal'],
    why: 'Z2M#12213 ION dimmer — strip fake ZG-303Z soil pid from mfs',
  },
  {
    mfr: '_TZ3000_dershnvx',
    pids: ['TS0002'],
    driver: 'switch_2gang',
    removeFrom: ['switch_1gang'],
    forbid: ['switch_1gang', 'wall_switch_2gang_1way'],
    why: 'Z2M#32034 / #12246 — ONLY TS0002 (no TS0001/TS0601 invent)',
  },
  {
    mfr: '_TZ3000_icoxotza',
    pids: ['TS0726'],
    driver: 'switch_2gang',
    removeFrom: ['switch_1gang'],
    forbid: ['switch_1gang'],
    why: 'Z2M#11720 TS0726_2_gang — pid is TS0726 not TS0002',
  },
  {
    mfr: '_TZE204_qujphad5',
    pids: ['TS0601'],
    driver: 'wall_thermostat',
    removeFrom: ['bulb_dimmable', 'thermostatic_radiator_valve'],
    forbid: ['bulb_dimmable', 'thermostatic_radiator_valve'],
    why: 'TYBAC-006 FCU — sibling mpbki2zm is a SEPARATE couple',
  },
  {
    mfr: '_TZE204_mpbki2zm',
    pids: ['TS0601'],
    driver: 'wall_thermostat',
    removeFrom: ['thermostatic_radiator_valve', 'generic_tuya', 'bulb_dimmable'],
    forbid: ['thermostatic_radiator_valve', 'bulb_dimmable'],
    why: 'TYBAC-006 sibling — not TRV',
  },
  {
    mfr: '_TZE204_apiu8k13',
    pids: ['TS0601'],
    driver: 'plug_energy_monitor',
    removeFrom: ['switch_1gang'],
    forbid: ['switch_1gang', 'soil_sensor'],
    why: 'Water-heater monitor — TZE284_q9qytwfa is sibling couple, not same mfr',
  },
  {
    mfr: '_TZE284_q9qytwfa',
    pids: ['TS0601'],
    driver: 'plug_energy_monitor',
    removeFrom: ['switch_1gang', 'soil_sensor'],
    forbid: ['switch_1gang', 'soil_sensor'],
    why: 'Z2M#32883 — TZE284 ≠ TZE204; lock separately',
  },
  {
    mfr: '_TZE200_7upwjcca',
    pids: ['TS0601'],
    driver: 'curtain_motor',
    removeFrom: [],
    forbid: ['soil_sensor', 'climate_sensor'],
    why: 'Z2M#32905 cover — only TS0601',
  },
  {
    mfr: '_TZ3000_anptztic',
    pids: ['TS0001'],
    driver: 'plug_energy_monitor',
    removeFrom: ['switch_1gang', 'zigbee_repeater'],
    forbid: ['switch_1gang', 'zigbee_repeater'],
    why: 'Z2M#32609 metering TS0001 — same pid as repeater family but DIFFERENT mfr',
  },
  {
    mfr: '_TZ3000_ly9apzky',
    pids: ['TS0003'],
    driver: 'wall_switch_3gang_1way',
    removeFrom: ['switch_3gang', 'switch_1gang', 'switch_2gang'],
    forbid: ['switch_3gang', 'switch_1gang'],
    why: 'Z2M#32810 + doctrine: TS0003 3-gang → wall_switch_3gang_1way NOT switch_3gang',
  },
  {
    mfr: '_TZE204_pkpfn9hc',
    pids: ['TS0601'],
    driver: 'air_quality_co2',
    removeFrom: [],
    forbid: ['climate_sensor', 'soil_sensor'],
    why: 'Z2M#12949 CO2 — TS0601 shared pid, mfr locks type',
  },
  {
    mfr: '_TZ3002_y7wpizuw',
    pids: ['TS0726'],
    driver: 'switch_4gang',
    removeFrom: ['switch_2gang', 'switch_1gang'],
    forbid: ['switch_2gang', 'switch_1gang'],
    why: 'Z2M#32628 4-gang TS0726 — icoxotza+TS0726 is 2-gang (different mfr)',
  },
  {
    mfr: '_TZE284_smcqit2l',
    pids: ['TS0601'],
    driver: 'wall_thermostat',
    removeFrom: [],
    forbid: ['thermostatic_radiator_valve', 'climate_sensor'],
    why: 'Z2M#32568 — do not conflate with qujphad5/mpbki2zm',
  },
  {
    mfr: '_TZE284_6uyu20xu',
    pids: ['TS0601'],
    driver: 'climate_sensor',
    removeFrom: [],
    forbid: ['soil_sensor', 'wall_thermostat'],
    why: 'Z2M#32491 Chayo TOVTH',
  },
];

function loadCompose(driver) {
  const f = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  if (!fs.existsSync(f)) return null;
  return { f, j: JSON.parse(fs.readFileSync(f, 'utf8')) };
}

function removeMfrFromDriver(driver, mfr) {
  const loaded = loadCompose(driver);
  if (!loaded) return 0;
  const { f, j } = loaded;
  if (!j.zigbee?.manufacturerName) return 0;
  const want = new Set(variants(mfr).map((v) => v.toLowerCase()));
  const before = j.zigbee.manufacturerName.length;
  j.zigbee.manufacturerName = j.zigbee.manufacturerName.filter((m) => !want.has(String(m).toLowerCase()));
  const removed = before - j.zigbee.manufacturerName.length;
  if (removed && APPLY) fs.writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);
  return removed;
}

function ensureCoupleOnDriver(driver, mfr, pids) {
  const loaded = loadCompose(driver);
  if (!loaded) throw new Error(`missing driver ${driver}`);
  const { f, j } = loaded;
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
  if (APPLY && added) fs.writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);
  return added;
}

/**
 * Surgical mfs patch: REPLACE modelIds with verified pids only (do not union invent).
 * Preserve unrelated keys. Never rewrite whole file structure beyond this entry.
 */
function patchMfsCouple(mfr, driverId, modelIds) {
  const f = path.join(ROOT, 'data', 'mfs_db.json');
  const raw = fs.readFileSync(f);
  const db = JSON.parse(raw);
  const devices = db.devices || (db.devices = {});
  const key = Object.keys(devices).find((k) => k.toLowerCase() === mfr.toLowerCase()) || mfr;
  const prev = devices[key] && typeof devices[key] === 'object' ? devices[key] : {};
  const ids = [...new Set((modelIds || []).map(String))];
  const next = {
    ...prev,
    manufacturerId: mfr,
    driverId,
    driverHint: driverId,
    source: 'p2234b-couple-refine',
    modelIds: ids,
    pid: ids[0],
    confidence: 0.95,
    // WHY: document that other pids for this mfr are UNKNOWN until proven
    coupleLock: true,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  const changed = JSON.stringify({
    d: prev.driverId, m: prev.modelIds, p: prev.pid,
  }) !== JSON.stringify({
    d: next.driverId, m: next.modelIds, p: next.pid,
  });
  devices[key] = next;
  if (APPLY && changed) {
    // Keep compact JSON like repo (no pretty) to avoid mega diff noise
    fs.writeFileSync(f, JSON.stringify(db));
  }
  return { key, changed, from: { driverId: prev.driverId, modelIds: prev.modelIds }, to: { driverId, modelIds: ids } };
}

function upsertRegistry(cases) {
  const regPath = path.join(ROOT, 'data', 'user-misattribution-registry.json');
  const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
  let added = 0;
  let updated = 0;
  for (const c of cases) {
    const idx = reg.cases.findIndex((x) => x.id === c.id);
    if (idx < 0) {
      reg.cases.push(c);
      added += 1;
    } else {
      const prev = reg.cases[idx];
      reg.cases[idx] = { ...prev, ...c, mfr: c.mfr, productId: c.productId };
      updated += 1;
    }
  }
  if (APPLY && (added || updated)) {
    fs.writeFileSync(regPath, `${JSON.stringify(reg, null, 2)}\n`);
  }
  return { added, updated };
}

function main() {
  const log = [];

  for (const c of COUPLES) {
    let removed = 0;
    for (const d of c.removeFrom || []) {
      try {
        removed += removeMfrFromDriver(d, c.mfr);
      } catch (e) {
        log.push({ mfr: c.mfr, err: `remove ${d}: ${e.message}` });
      }
    }
    let added = 0;
    try {
      added = ensureCoupleOnDriver(c.driver, c.mfr, c.pids);
    } catch (e) {
      log.push({ mfr: c.mfr, err: e.message });
      continue;
    }
    const mfs = patchMfsCouple(c.mfr, c.driver, c.pids);
    log.push({
      mfr: c.mfr,
      pids: c.pids,
      driver: c.driver,
      composeRemoved: removed,
      composeAdded: added,
      mfs,
      why: c.why,
    });
  }

  const regCases = COUPLES.map((c) => ({
    id: `p2234b-${c.mfr.replace(/^_/, '').toLowerCase()}`,
    mfr: variants(c.mfr),
    productId: c.pids,
    canonicalDriver: c.driver,
    forbiddenDrivers: c.forbid || [],
    source: 'p2234b-couple-refine',
    notes: c.why,
  }));
  const reg = upsertRegistry(regCases);

  const report = {
    apply: APPLY,
    doctrine: 'Sacred couple = manufacturerName + productId only. One mfr may have many pids/drivers; never invent pid; TZE200/204/284 siblings are separate couples.',
    couples: log.length,
    registry: reg,
    log,
  };

  const reportDir = path.join(ROOT, 'reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'p2234b-sacred-couple-refine-2026-08-24.md');
  const md = [
    '# P2234b — Sacred-couple refine (mfr multi-variant aware)',
    '',
    report.doctrine,
    '',
    '| Couple | Driver | Was wrong in mfs | Notes |',
    '|--------|--------|------------------|-------|',
    ...log.map((r) => `| \`${r.mfr}\`+\`${(r.pids || []).join(',')}\` | \`${r.driver}\` | \`${r.mfs?.from?.driverId || '?'}[${(r.mfs?.from?.modelIds || []).join(',')||''}]\` | ${r.why} |`),
    '',
    '## Homey compose caveat',
    '',
    'Compose uses flat `manufacturerName[]` × `productId[]` (OR). Runtime must prefer',
    '`DeviceFingerprintDB` compound keys + mfs `modelIds` mismatch refuse when pid present.',
    'Same mfr on a driver that lists many pids can theoretically pair a wrong sibling pid —',
    'compound DB + registry forbid lists are the guard.',
    '',
    '## Sibling families (separate couples — do not merge)',
    '',
    '- `_TZE204_qujphad5` / `_TZE204_mpbki2zm` / `_TZE284_smcqit2l` → wall thermostat variants',
    '- `_TZE204_apiu8k13` vs `_TZE284_q9qytwfa` → water-heater energy (prefix differs)',
    '- `_TZ3000_icoxotza`+TS0726 (2-gang) vs `_TZ3002_y7wpizuw`+TS0726 (4-gang)',
    '- `_TZ3000_anptztic`+TS0001 (metering) vs `_TZ3000_gdsvhfao`+TS0001 (repeater)',
    '',
    `Apply: \`node tools/ci/refine-p2234-sacred-couple-aware.js${APPLY ? ' --apply' : ''}\``,
    '',
  ].join('\n');

  if (APPLY) fs.writeFileSync(reportPath, md);

  console.log(JSON.stringify(report, null, 2));
  if (!APPLY) console.log('\n[dry-run] re-run with --apply to write');
  else console.log(`\nWrote ${reportPath}`);
}

main();
