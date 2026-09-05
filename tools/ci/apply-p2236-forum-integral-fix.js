#!/usr/bin/env node
/**
 * P2236 — Integral forum silent fixes (SHADOW).
 *
 * Fine analysis of forum-verify-2026-08-23 NEED_ACTION + processor false routes.
 * Sacred couple = mfr+pid only. Never invent. Never forum POST.
 *
 * Usage:
 *   node tools/ci/apply-p2236-forum-integral-fix.js
 *   node tools/ci/apply-p2236-forum-integral-fix.js --apply
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

function loadCompose(driver) {
  const f = path.join(ROOT, 'drivers', driver, 'driver.compose.json');
  if (!fs.existsSync(f)) return null;
  return { f, j: JSON.parse(fs.readFileSync(f, 'utf8')) };
}

function removeMfr(driver, mfr) {
  const loaded = loadCompose(driver);
  if (!loaded) return 0;
  const { f, j } = loaded;
  if (!j.zigbee?.manufacturerName) return 0;
  const want = new Set(variants(mfr).map((v) => v.toLowerCase()));
  const before = j.zigbee.manufacturerName.length;
  j.zigbee.manufacturerName = j.zigbee.manufacturerName.filter((m) => !want.has(String(m).toLowerCase()));
  const n = before - j.zigbee.manufacturerName.length;
  if (n && APPLY) fs.writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);
  return n;
}

function ensureMfr(driver, mfr, pids) {
  const loaded = loadCompose(driver);
  if (!loaded) throw new Error(`missing ${driver}`);
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
  for (const pid of pids || []) {
    if (!j.zigbee.productId.some((p) => String(p).toLowerCase() === String(pid).toLowerCase())) {
      j.zigbee.productId.push(pid);
      added += 1;
    }
  }
  if (APPLY && added) fs.writeFileSync(f, `${JSON.stringify(j, null, 2)}\n`);
  return added;
}

function patchMfs(mfr, driverHint, modelIds, extra = {}) {
  const f = path.join(ROOT, 'data', 'mfs_db.json');
  const db = JSON.parse(fs.readFileSync(f));
  const devices = db.devices || (db.devices = {});
  const key = Object.keys(devices).find((k) => k.toLowerCase() === mfr.toLowerCase()) || mfr;
  const prev = devices[key] && typeof devices[key] === 'object' ? devices[key] : {};
  const ids = [...new Set((modelIds || []).map(String))];
  devices[key] = {
    ...prev,
    manufacturerId: mfr,
    driverId: driverHint,
    driverHint,
    modelIds: ids,
    pid: ids[0],
    coupleLock: true,
    source: 'p2236-forum-integral',
    confidence: 0.95,
    updatedAt: new Date().toISOString().slice(0, 10),
    ...extra,
  };
  if (APPLY) fs.writeFileSync(f, JSON.stringify(db));
  return { key, driverHint, modelIds: ids, from: { driverHint: prev.driverHint, modelIds: prev.modelIds } };
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
      reg.cases[idx] = { ...reg.cases[idx], ...c };
      updated += 1;
    }
  }
  if (APPLY && (added || updated)) fs.writeFileSync(regPath, `${JSON.stringify(reg, null, 2)}\n`);
  return { added, updated };
}

function patchNewFingerprints(mfr, driverId, modelIds) {
  const f = path.join(ROOT, 'lib', 'data', 'new_fingerprints.json');
  if (!fs.existsSync(f)) return 0;
  const arr = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!Array.isArray(arr)) return 0;
  let n = 0;
  for (const row of arr) {
    if (!row || !equalsMfr(row.manufacturerName, mfr)) continue;
    const nextIds = [...new Set(modelIds.map(String))];
    if (row.driverId !== driverId || JSON.stringify(row.modelIds) !== JSON.stringify(nextIds)) {
      row.driverId = driverId;
      row.modelIds = nextIds;
      n += 1;
    }
  }
  if (APPLY && n) fs.writeFileSync(f, `${JSON.stringify(arr, null, 2)}\n`);
  return n;
}

function equalsMfr(a, b) {
  return String(a || '').toLowerCase() === String(b || '').toLowerCase();
}

/** Verified forum couples — one row = one mfr+pid lock. */
const ACTIONS = [
  {
    id: 'p2236-4upl1fcj-ts0041-button',
    mfr: '_TZ3000_4upl1fcj',
    pids: ['TS0041'],
    to: 'button_wireless_1',
    from: ['switch_1gang', 'switch_2gang', 'wall_dimmer_tuya'],
    forbid: ['switch_1gang', 'switch_2gang', 'switch_3gang', 'wall_dimmer_tuya'],
    why: 'SunBeech T156967 — TS0041 wireless remote, NEVER switch_1gang (processor false ROUTED_OK)',
  },
  {
    id: 'p2236-qeuvnohg-ts011f-din',
    mfr: '_TZ3000_qeuvnohg',
    pids: ['TS011F'],
    to: 'din_rail_switch',
    from: ['smartPlug_DinRail', 'lcdtemphumidsensor_plug_energy', 'zigbee_universal'],
    forbid: ['smartPlug_DinRail', 'switch_1gang', 'button_wireless_2', 'zigbee_universal'],
    why: 'T89271 Erwin3/Zdenek — registry+DeviceFingerprintDB din_rail_switch; strip fake TS0042/TS0601',
  },
  {
    id: 'p2236-amdymr7l-tz3210-energy',
    mfr: '_TZ3210_amdymr7l',
    pids: ['TS011F'],
    to: 'plug_energy_monitor',
    from: ['plug_smart'],
    forbid: ['plug_smart', 'button_wireless_4', 'switch_1gang'],
    why: 'T89271 Bram_B — BlitzWolf SHP13 dual-compose; energy only',
  },
  {
    id: 'p2236-amdymr7l-tz3000-energy',
    mfr: '_TZ3000_amdymr7l',
    pids: ['TS011F'],
    to: 'plug_energy_monitor',
    from: ['plug_smart'],
    forbid: ['plug_smart', 'button_wireless_4'],
    why: 'Sibling TZ3000 BlitzWolf — TS011F only',
  },
  {
    id: 'p2236-xabckq1v-ts004f',
    mfr: '_TZ3000_xabckq1v',
    pids: ['TS004F'],
    to: 'button_wireless_4',
    from: ['switch_1gang', 'zigbee_universal'],
    forbid: ['switch_1gang', 'zigbee_universal'],
    why: 'Steampunk soft TS0001 REJECTED — known couple is TS004F only',
  },
  {
    id: 'p2236-kfu8zapd-ts0044f',
    mfr: '_TZ3000_kfu8zapd',
    pids: ['TS0044', 'TS004F'],
    to: 'button_wireless_4',
    from: ['switch_1gang'],
    forbid: ['switch_1gang', 'scene_switch_4'],
    why: 'Primordial T150690 — Moes 4-btn; mfs must list TS0044/TS004F not TS0001',
  },
  {
    id: 'p2236-zgyzgdua-ts0044-scene',
    mfr: '_TZ3000_zgyzgdua',
    pids: ['TS0044'],
    to: 'scene_switch_4',
    from: ['button_wireless_4', 'smart_knob', 'wall_dimmer_tuya'],
    forbid: ['button_wireless_4', 'smart_knob', 'wall_dimmer_tuya'],
    why: 'meter91 #2189 — scene_switch_4 0xFD; never invent TS0601-only',
  },
  {
    id: 'p2236-nkcobies-ts011f-plug',
    mfr: '_TZ3000_nkcobies',
    pids: ['TS011F', 'TS0121'],
    to: 'smartplug',
    from: ['switch_1gang', 'button_wireless_2'],
    forbid: ['switch_1gang', 'button_wireless_2'],
    why: 'Bo_Kjaergaard soft TS0001 REJECTED — compose plug TS011F/TS0121',
  },
];

function patchFingerprintDb() {
  const f = path.join(ROOT, 'lib', 'DeviceFingerprintDB.js');
  let src = fs.readFileSync(f, 'utf8');
  const marker = "  '_TZ3000_zgyzgdua|TS0044':";
  if (!src.includes("'_TZ3000_4upl1fcj|TS0041':")) {
    const insert = `  '_TZ3000_4upl1fcj|TS0041': { driver: 'button_wireless_1', protocol: 'zcl', powerSource: 'battery', notes: 'P2236 SunBeech T156967 — TS0041 remote NOT switch_1gang' },\n`;
    if (src.includes(marker)) {
      src = src.replace(marker, `${insert}${marker}`);
      if (APPLY) fs.writeFileSync(f, src);
      return 1;
    }
  }
  return 0;
}

function main() {
  const log = [];
  for (const a of ACTIONS) {
    let removed = 0;
    for (const d of a.from || []) {
      try { removed += removeMfr(d, a.mfr); } catch (e) {
        log.push({ id: a.id, err: `remove ${d}: ${e.message}` });
      }
    }
    let added = 0;
    try { added = ensureMfr(a.to, a.mfr, a.pids); } catch (e) {
      log.push({ id: a.id, err: e.message });
      continue;
    }
    const mfs = patchMfs(a.mfr, a.to, a.pids);
    const nf = patchNewFingerprints(a.mfr, a.to, a.pids);
    log.push({
      id: a.id,
      mfr: a.mfr,
      pids: a.pids,
      to: a.to,
      removed,
      added,
      mfs,
      newFingerprints: nf,
      why: a.why,
    });
  }

  const fpAdded = patchFingerprintDb();

  const reg = upsertRegistry(ACTIONS.map((a) => ({
    id: a.id,
    mfr: variants(a.mfr),
    productId: a.pids,
    canonicalDriver: a.to,
    forbiddenDrivers: a.forbid || [],
    source: 'p2236-forum-integral',
    notes: a.why,
  })));

  const report = {
    apply: APPLY,
    doctrine: 'Forum SHADOW — mfr+pid only; TS004x never switch_*gang; no soft invent; Nous/SoPhos do-not-lock',
    doNotLock: [
      '_TZ3000_v5498kdm+TS0001 (SergeP/Antek T99614 — Nous/SoPhos app)',
      '_TZ3000_xabckq1v+TS0001 softHypothesis',
      '_TZ3000_nkcobies+TS0001 softHypothesis',
      'Peter/f647 smartbutton ABSENT couple',
      '_TZ3000_upgcbody+TS0207 (melectro — wait Z2M)',
      '_TZ3210_3lbtuxgp+TS0505B (late4marshmellow — wait Z2M)',
    ],
    fingerprintDbInserts: fpAdded,
    registry: reg,
    log,
  };

  const outDir = path.join(ROOT, 'reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const mdPath = path.join(outDir, 'p2236-forum-integral-2026-08-24.md');
  const md = [
    '# P2236 — Forum integral silent fixes (2026-08-24)',
    '',
    report.doctrine,
    '',
    '## Applied couples',
    '',
    '| Couple | Driver | Notes |',
    '|--------|--------|-------|',
    ...log.filter((r) => r.to).map((r) => `| \`${r.mfr}\`+\`${r.pids.join(',')}\` | \`${r.to}\` | ${r.why} |`),
    '',
    '## Do not lock',
    '',
    ...report.doNotLock.map((x) => `- ${x}`),
    '',
    '## User action (no forum reply)',
    '',
    'Update Universal Tuya Test + re-pair if driver changed.',
    '',
  ].join('\n');
  if (APPLY) fs.writeFileSync(mdPath, md);

  console.log(JSON.stringify(report, null, 2));
  if (!APPLY) console.log('\n[dry-run] re-run with --apply');
  else console.log(`\nWrote ${mdPath}`);
}

main();
