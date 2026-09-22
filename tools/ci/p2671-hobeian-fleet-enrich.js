'use strict';

/**
 * P2671 — HOBEIAN fleet recognition: case forms + missing Z2M pids + mfs
 *
 * Pourquoi: Bastien Homey interview reports exact `HOBEIAN` + `ZG-*`, but several
 * drivers (climate/button on Bastien compact) only kept lowercase `hobeian` —
 * Athom compose matching is case-sensitive → "not recognized". Also Z2M gaps:
 * ZG-301Z-3CH, ZG-301Z-MOTO, ZG-210Z, ZG-227ZH/ZP, ZG-102ZA, AY* aliases.
 *
 * Comment: ComplementaryMerge UNION only on manufacturerName/productId + mfs_db.
 * Pour qui: ALL tracks (Bastien + master Universal + stable reliability) = BOTH.
 * Quand: pair / Repair / first interview.
 * Contre quoi: missing HOBEIAN exact form or missing verified Z2M pid → Unknown.
 *
 * Usage: node tools/ci/p2671-hobeian-fleet-enrich.js [--root=PATH] [--apply]
 * Default: dry-run on cwd.
 */

const fs = require('fs');
const path = require('path');

const {
  appendExactIdentityForms,
  appendIdentityStrings,
} = require('../../lib/enrichment/ComplementaryMerge');

const APPLY = process.argv.includes('--apply');
const rootArg = process.argv.find((a) => a.startsWith('--root='));
const ROOT = rootArg ? rootArg.slice('--root='.length) : process.cwd();

const HOBEIAN_FORMS = ['HOBEIAN', 'Hobeian', 'hobeian', 'heobian', 'Heobian'];

/** Sacred (mfr forms, pids) → driver — Z2M herdsman 2026-09 verified */
const FLEET = {
  switch_1gang: {
    pids: ['ZG-301Z', 'zg-301z', 'ZG-302Z1', 'WHD02', 'whd02'],
  },
  switch_2gang: {
    pids: ['ZG-305Z', 'ZG-301Z-2CH', 'ZG-302Z2'],
  },
  switch_3gang: {
    pids: ['ZG-302Z3', 'ZG-301Z-3CH', 'zg-301z-3ch'],
  },
  curtain_motor: {
    pids: ['ZG-301Z-MOTO', 'zg-301z-moto'],
  },
  climate_sensor: {
    pids: ['ZG-227Z', 'ZG-227ZL', 'ZG-227ZH', 'ZG-227ZP'],
  },
  contact_sensor: {
    pids: ['ZG-102Z', 'ZG-102ZL', 'ZG-102ZA'],
  },
  sensor_contact_zigbee: {
    pids: ['ZG-102Z', 'ZG-102ZL', 'ZG-102ZA'],
  },
  presence_sensor_radar: {
    pids: [
      'ZG-204Z', 'ZG-204ZE', 'ZG-204ZH', 'ZG-204ZK', 'ZG-204ZL', 'ZG-204ZM',
      'ZG-204ZP', 'ZG-204ZQ', 'ZG-204ZV', 'ZG-204ZX',
      'ZG-205Z', 'ZG-205ZL', 'ZG-205W',
      'ZG-302ZL', 'ZG-302ZM',
      'ZG-210Z', // bed occupancy / pressure strap (Z2M HOBEIAN)
      'AY-204ZX', // OEM alias of ZG-204ZK
    ],
  },
  water_leak_sensor: {
    pids: ['ZG-222Z', 'ZG-222ZA', 'ZG-226Z', 'AY222Z', '3315-S', '3315-Seu'],
  },
  vibration_sensor: {
    pids: ['ZG-102ZM', 'ZG-103Z', 'ZG-103ZL', 'ZG-228Z'],
  },
  soil_sensor: {
    pids: ['ZG-303Z'],
  },
  illuminance_sensor: {
    pids: ['ZG-106Z'],
  },
  rain_sensor: {
    pids: ['ZG-223Z'],
  },
  gas_sensor: {
    pids: ['ZG-225Z'],
  },
  siren: {
    pids: ['ZG-229Z'],
  },
  button_wireless_1: {
    pids: ['ZG-101ZL', 'ZG-101ZD'],
  },
  scene_switch_4: {
    pids: ['ZG-101ZS'],
  },
  ir_blaster: {
    // Z2M device page ZG-IR01 (Smart IR) — lock couple even if herdsman moved file
    pids: ['ZG-IR01', 'zg-ir01'],
  },
};

const ALL_PIDS = [...new Set(Object.values(FLEET).flatMap((x) => x.pids))];

function loadCompose(driverId) {
  const fp = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(fp)) return null;
  return { fp, j: JSON.parse(fs.readFileSync(fp, 'utf8')) };
}

function saveCompose(fp, j) {
  if (!APPLY) return;
  fs.writeFileSync(fp, `${JSON.stringify(j, null, 2)}\n`);
}

function enrichDriver(driverId, pids) {
  const loaded = loadCompose(driverId);
  if (!loaded) {
    console.log(`SKIP missing driver ${driverId}`);
    return { driverId, skipped: true };
  }
  const { fp, j } = loaded;
  j.zigbee = j.zigbee || {};
  const beforeMfr = (j.zigbee.manufacturerName || []).length;
  const beforePid = (j.zigbee.productId || []).length;
  // WHY(P2671/P2543): Athom compose match is case-sensitive — keep HOBEIAN + hobeian
  // exact forms. unionStrings/mergeZigbeeIdentity would collapse them.
  j.zigbee.manufacturerName = appendExactIdentityForms(
    j.zigbee.manufacturerName,
    HOBEIAN_FORMS
  );
  j.zigbee.productId = appendExactIdentityForms(j.zigbee.productId, pids);
  const afterMfr = (j.zigbee.manufacturerName || []).length;
  const afterPid = (j.zigbee.productId || []).length;
  saveCompose(fp, j);
  return {
    driverId,
    mfrDelta: afterMfr - beforeMfr,
    pidDelta: afterPid - beforePid,
    mfr: afterMfr,
    pid: afterPid,
  };
}

function enrichMfs() {
  const fp = path.join(ROOT, 'data', 'mfs_db.json');
  if (!fs.existsSync(fp)) {
    console.log('SKIP mfs_db missing');
    return null;
  }
  // Buffer parse (P RAM doctrine)
  const buf = fs.readFileSync(fp);
  const mfs = JSON.parse(buf);
  const canonicalPids = ALL_PIDS.filter((p) => !/^[a-z]/.test(p) || p === p.toUpperCase() || /^ZG-|^AY|^3315|^WHD/i.test(p));
  // Prefer uppercase-ish canonical: keep unique case-insensitive
  const pidSet = new Map();
  for (const p of [...(mfs.HOBEIAN?.modelIds || []), ...canonicalPids, ...ALL_PIDS]) {
    const key = String(p).toUpperCase();
    if (!pidSet.has(key)) pidSet.set(key, p);
  }
  // Prefer ZG-301Z over zg-301z
  for (const p of ALL_PIDS) {
    if (/^[A-Z0-9]/.test(p) || p.includes('-')) {
      pidSet.set(String(p).toUpperCase(), p);
    }
  }
  const modelIds = [...pidSet.values()].sort((a, b) => String(a).localeCompare(String(b)));
  const entry = {
    driverId: 'multi',
    source: 'p2671-hobeian-fleet',
    modelIds,
    pid: 'ZG-301Z',
    modelIdsCount: modelIds.length,
    notes: 'HOBEIAN brand → many ZG-* couples (P2671 Z2M sync)',
  };
  let addedKeys = 0;
  for (const form of HOBEIAN_FORMS) {
    const prev = mfs[form]?.modelIds?.length || 0;
    mfs[form] = {
      ...(mfs[form] || {}),
      ...entry,
      modelIds: appendIdentityStrings(mfs[form]?.modelIds || [], modelIds),
    };
    mfs[form].modelIdsCount = mfs[form].modelIds.length;
    if (mfs[form].modelIds.length > prev) addedKeys += 1;
  }
  if (APPLY) {
    fs.writeFileSync(fp, JSON.stringify(mfs));
  }
  return { forms: HOBEIAN_FORMS.length, modelCount: mfs.HOBEIAN.modelIds.length, touched: addedKeys };
}

function enrichFingerprintDb() {
  const fp = path.join(ROOT, 'lib', 'DeviceFingerprintDB.js');
  if (!fs.existsSync(fp)) {
    console.log('SKIP DeviceFingerprintDB missing');
    return null;
  }
  let src = fs.readFileSync(fp, 'utf8');
  const locks = [
    ["HOBEIAN|ZG-301Z-3CH", "{ driver: 'switch_3gang', protocol: 'zcl', powerSource: 'mains', notes: 'P2671 Z2M 3-gang module' }"],
    ["HOBEIAN|ZG-301Z-MOTO", "{ driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2671 Z2M curtain motor controller' }"],
    ["HOBEIAN|ZG-210Z", "{ driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2671 Z2M bed occupancy / pressure strap' }"],
    ["HOBEIAN|ZG-227ZH", "{ driver: 'climate_sensor', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2671 Z2M NTC climate sibling' }"],
    ["HOBEIAN|ZG-227ZP", "{ driver: 'climate_sensor', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2671 Z2M NTC climate sibling' }"],
    ["HOBEIAN|ZG-102ZA", "{ driver: 'contact_sensor', protocol: 'zcl', powerSource: 'battery', notes: 'P2671 Z2M contact ZA alias of ZG-102Z' }"],
    ["HOBEIAN|AY-204ZX", "{ driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2671 OEM alias ZG-204ZK' }"],
    ["HOBEIAN|AY222Z", "{ driver: 'water_leak_sensor', protocol: 'ias_zone', powerSource: 'battery', notes: 'P2671 OEM alias ZG-222Z' }"],
    ["HOBEIAN|WHD02", "{ driver: 'switch_1gang', protocol: 'zcl', powerSource: 'mains', notes: 'P2671 Z2M WHD02 sibling of ZG-301Z' }"],
    ["HOBEIAN|ZG-IR01", "{ driver: 'ir_blaster', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2671 Z2M Smart IR remote' }"],
    ["HOBEIAN|ZG-205W", "{ driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2671 HOBEIAN radar 205W' }"],
  ];
  let added = 0;
  const marker = '// P2671 HOBEIAN fleet locks (Z2M sync)';
  if (!src.includes(marker)) {
    const block = [
      `  ${marker}`,
      ...locks.map(([k, v]) => `  '${k}': ${v},`),
      '',
    ].join('\n');
    // Insert before module.exports or end of FINGERPRINTS object
    if (src.includes('// P2671')) {
      // already
    } else {
      const anchor = "  'HOBEIAN|ZG-301Z':";
      const idx = src.indexOf(anchor);
      if (idx >= 0) {
        const lineEnd = src.indexOf('\n', idx);
        src = `${src.slice(0, lineEnd + 1)}${block}${src.slice(lineEnd + 1)}`;
        added = locks.length;
      }
    }
  } else {
    for (const [k] of locks) {
      if (!src.includes(`'${k}'`)) {
        // append inside marker block — simple: add after marker line
        src = src.replace(marker, `${marker}\n  '${k}': ${locks.find((x) => x[0] === k)[1]},`);
        added += 1;
      }
    }
  }
  if (APPLY && added > 0) {
    fs.writeFileSync(fp, src);
  }
  // Ensure keys exist even if marker present
  if (APPLY) {
    let again = fs.readFileSync(fp, 'utf8');
    let extra = 0;
    for (const [k, v] of locks) {
      if (!again.includes(`'${k}'`)) {
        again = again.replace(marker, `${marker}\n  '${k}': ${v},`);
        extra += 1;
      }
    }
    if (extra) {
      fs.writeFileSync(fp, again);
      added += extra;
    }
  }
  return { added, locks: locks.length };
}

function main() {
  console.log(`P2671 HOBEIAN fleet enrich ROOT=${ROOT} apply=${APPLY}`);
  const results = [];
  for (const [driverId, { pids }] of Object.entries(FLEET)) {
    results.push(enrichDriver(driverId, pids));
  }
  const mfs = enrichMfs();
  const fpdb = enrichFingerprintDb();
  console.log(JSON.stringify({ results, mfs, fpdb }, null, 2));
  if (!APPLY) console.log('Dry-run only. Re-run with --apply to write.');
}

main();
