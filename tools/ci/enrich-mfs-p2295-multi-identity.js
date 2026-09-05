#!/usr/bin/env node
'use strict';

/**
 * enrich-mfs-p2295-multi-identity.js
 *
 * Doctrine:
 *   - Sacred couple = (manufacturerName, productId) only.
 *   - modelIds / pid = real Zigbee productIds the device reports (never retail/Z2M labels).
 *   - deviceNames / z2mModels / whiteLabels / productNames = catalogue aliases (N:N:N).
 *   - One brand can map many pids → many drivers (HOBEIAN.byPid pattern).
 *   - Prefix/case siblings (_TZE200/_TZE204, typo 68nvbi09) are first-class variants.
 *
 * Usage:
 *   node tools/ci/enrich-mfs-p2295-multi-identity.js           # dry-run
 *   node tools/ci/enrich-mfs-p2295-multi-identity.js --apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const MFS_PATH = path.join(ROOT, 'data', 'mfs_db.json');
const REG_PATH = path.join(ROOT, 'data', 'user-misattribution-registry.json');
const ALIAS_PATH = path.join(ROOT, 'data', 'marketing-model-alias-registry.json');

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

function uniq(arr) {
  return [...new Set([].concat(arr || []).filter(Boolean))];
}

function sorted(arr) {
  return uniq(arr).sort((a, b) => a.localeCompare(b));
}

function casings(mfr) {
  const s = String(mfr);
  const lower = s.toLowerCase();
  const upper = s.toUpperCase();
  // OEM classic: _TZE200_body / _TZ3000_body
  const oem = s.replace(/^(_[A-Za-z0-9]+)_(.+)$/, (_, p, b) => `${p.toUpperCase()}_${b.toLowerCase()}`);
  const oemUpperBody = s.replace(/^(_[A-Za-z0-9]+)_(.+)$/, (_, p, b) => `${p.toUpperCase()}_${b.toUpperCase()}`);
  return uniq([s, lower, upper, oem, oemUpperBody]);
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveJson(p, obj) {
  fs.writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`);
}

function findTopKeys(mfs, mfrNorm) {
  return Object.keys(mfs).filter((k) => {
    if (k === 'devices' || k === 'sacredCouples' || k === '_meta' || k === 'sources' || k === 'stats') return false;
    return norm(k) === mfrNorm;
  });
}

function preferredKey(existingKeys, sample) {
  const pool = uniq([...(existingKeys || []), ...casings(sample)]);
  pool.sort((a, b) => {
    const score = (k) => {
      let s = 0;
      if (/^_TZ[A-Z0-9]+_[a-z0-9]+$/.test(k)) s += 20;
      if (/^_TZ/i.test(k) && /[a-z]/.test(k) && /[A-Z]/.test(k)) s += 10;
      if (k === k.toUpperCase()) s -= 2;
      if (k === k.toLowerCase()) s -= 1;
      return s;
    };
    return score(b) - score(a) || a.localeCompare(b);
  });
  return pool[0];
}

function mergeEntry(entry, patch) {
  const next = { ...entry };
  next.driverId = patch.driverId;
  next.source = patch.source;
  next.modelIds = sorted(patch.modelIds);
  next.pid = patch.modelIds[0];
  next.modelIdsCount = next.modelIds.length;
  next.deviceNames = sorted([...(entry.deviceNames || []), ...(patch.deviceNames || [])]);
  next.z2mModels = sorted([...(entry.z2mModels || []), ...(patch.z2mModels || [])]);
  next.whiteLabels = sorted([...(entry.whiteLabels || []), ...(patch.whiteLabels || [])]);
  next.productNames = sorted([
    ...(entry.productNames || []),
    ...(patch.productNames || []),
    ...(patch.deviceNames || []),
  ]);
  next.variants = sorted([...(entry.variants || []), ...(patch.variants || [])]);
  next.variantsCount = next.variants.length;
  next.prefixVariants = sorted([...(entry.prefixVariants || []), ...(patch.prefixVariants || [])]);
  if (patch.notes) next.notes = patch.notes;
  if (patch.protocol) next.protocol = patch.protocol;
  if (patch.powerSource) next.powerSource = patch.powerSource;
  if (patch.deviceType) next.deviceType = patch.deviceType;
  if (patch.coupleLock != null) next.coupleLock = patch.coupleLock;
  next.updatedAt = new Date().toISOString().slice(0, 10);
  next.lastEnrichment = 'p2295-multi-identity';
  // Drop invent / climate-bleed primary pids
  if (patch.forbidPid && norm(next.pid) === norm(patch.forbidPid)) {
    next.pid = next.modelIds[0];
  }
  return next;
}

function upsertDevices(mfs, mfrNorm, patch) {
  if (!mfs.devices || typeof mfs.devices !== 'object') mfs.devices = {};
  let key = Object.keys(mfs.devices).find((k) => norm(k) === mfrNorm);
  if (!key) key = mfrNorm;
  const prev = mfs.devices[key] || { manufacturerId: key };
  mfs.devices[key] = {
    ...prev,
    manufacturerId: prev.manufacturerId || key,
    modelIds: sorted(patch.modelIds),
    variants: sorted([...(prev.variants || []), ...(patch.variants || [])]),
    deviceType: patch.deviceType || prev.deviceType || 'unknown',
    driverHint: patch.driverId,
    driverId: patch.driverId,
    powerSource: patch.powerSource || prev.powerSource || 'unknown',
    deviceNames: sorted([...(prev.deviceNames || []), ...(patch.deviceNames || [])]),
    z2mModels: sorted([...(prev.z2mModels || []), ...(patch.z2mModels || [])]),
    whiteLabels: sorted([...(prev.whiteLabels || []), ...(patch.whiteLabels || [])]),
    productNames: sorted([...(prev.productNames || []), ...(patch.productNames || []), ...(patch.deviceNames || [])]),
    sources: uniq([...(prev.sources || []), 'p2295-multi-identity', ...(patch.sources || [])]),
    confidence: Math.max(prev.confidence || 0, 0.95),
    coupleLock: true,
    pid: patch.modelIds[0],
    lastSeen: new Date().toISOString(),
    notes: patch.notes || prev.notes,
  };
}

function upsertSacred(mfs, mfr, pid, patch) {
  if (!mfs.sacredCouples || typeof mfs.sacredCouples !== 'object') mfs.sacredCouples = {};
  const key = `${norm(mfr)}|${norm(pid)}`;
  const prev = mfs.sacredCouples[key] || {};
  mfs.sacredCouples[key] = {
    ...prev,
    mfr: norm(mfr),
    pid: norm(pid),
    driver: patch.driverId,
    sources: uniq([...(prev.sources || []), 'p2295-multi-identity', 'registry']),
    confidence: 0.95,
    productNames: sorted([
      ...(prev.productNames || []),
      ...(patch.productNames || []),
      ...(patch.deviceNames || []),
      ...(patch.z2mModels || []),
      ...(patch.whiteLabels || []),
    ]),
    deviceNames: sorted([...(prev.deviceNames || []), ...(patch.deviceNames || [])]),
    z2mModels: sorted([...(prev.z2mModels || []), ...(patch.z2mModels || [])]),
    whiteLabels: sorted([...(prev.whiteLabels || []), ...(patch.whiteLabels || [])]),
  };

  // Also refresh uppercase fingerprint-style keys if present
  for (const [k, v] of Object.entries(mfs.sacredCouples)) {
    if (!v || typeof v !== 'object') continue;
    if (norm(k) === norm(mfr) || (v.mfr && norm(v.mfr) === norm(mfr) && !String(k).includes('|'))) {
      if (Array.isArray(v.productIds) || v.driverId) {
        v.driverId = patch.driverId;
        v.productIds = sorted(patch.modelIds);
        v.productNames = sorted([...(v.productNames || []), ...(patch.deviceNames || [])]);
        v.source = 'p2295-multi-identity';
        v.confidence = 0.95;
      }
    }
  }
}

function stripFromCompose(driverId, mfrNorms) {
  const p = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(p)) return { removed: 0 };
  const j = loadJson(p);
  const list = j.zigbee?.manufacturerName;
  if (!Array.isArray(list)) return { removed: 0 };
  const ban = new Set(mfrNorms.map(norm));
  const next = list.filter((m) => !ban.has(norm(m)));
  const removed = list.length - next.length;
  if (!removed) return { removed: 0 };
  j.zigbee.manufacturerName = next;
  if (APPLY) saveJson(p, j);
  return { removed, driverId };
}

function ensureOnCompose(driverId, mfrs, pids) {
  const p = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(p)) return { added: 0 };
  const j = loadJson(p);
  j.zigbee = j.zigbee || {};
  const mlist = Array.isArray(j.zigbee.manufacturerName) ? j.zigbee.manufacturerName : [];
  const have = new Set(mlist.map(norm));
  let added = 0;
  for (const m of mfrs) {
    if (!have.has(norm(m))) {
      mlist.push(m);
      have.add(norm(m));
      added++;
    }
  }
  j.zigbee.manufacturerName = mlist;
  const plist = Array.isArray(j.zigbee.productId) ? [...j.zigbee.productId] : [];
  const phave = new Set(plist.map(norm));
  for (const pid of pids || []) {
    if (!phave.has(norm(pid))) {
      plist.push(pid);
      phave.add(norm(pid));
    }
  }
  // Strip marketing aliases from productId (keep only real Zigbee ids)
  j.zigbee.productId = sorted(plist.filter((pid) => norm(pid) !== 'ts0601_co2'));
  if (APPLY) saveJson(p, j);
  return { added, driverId };
}

function upsertRegistryCase(reg, spec) {
  const cases = reg.cases || (reg.cases = []);
  const idx = cases.findIndex((c) => c.id === spec.id);
  if (idx >= 0) {
    const prev = cases[idx];
    cases[idx] = {
      ...prev,
      ...spec,
      mfr: sorted([...(prev.mfr || []), ...(spec.mfr || [])]),
      productId: sorted([...(prev.productId || []), ...(spec.productId || [])]),
      forbiddenDrivers: sorted([...(prev.forbiddenDrivers || []), ...(spec.forbiddenDrivers || [])]),
      sources: uniq([...(prev.sources || []), ...(spec.sources || [])]),
    };
  } else {
    cases.push(spec);
  }
}

/** @type {Array<{
 *  id:string,
 *  mfrs:string[],
 *  modelIds:string[],
 *  driverId:string,
 *  deviceNames:string[],
 *  z2mModels?:string[],
 *  whiteLabels?:string[],
 *  notes:string,
 *  protocol:string,
 *  powerSource:string,
 *  deviceType:string,
 *  forbiddenDrivers:string[],
 *  stripFrom?:string[],
 *  ensureCompose?:boolean,
 * }>} */
const PACKS = [
  {
    id: 'p2291-ogkdpgy2-co2-not-climate',
    mfrs: ['_TZE200_ogkdpgy2', '_TZE204_ogkdpgy2'],
    modelIds: ['TS0601'],
    driverId: 'air_quality_co2',
    deviceNames: [
      'DCR-LCD',
      'DCR-RQJ',
      'NDIR CO2 sensor',
      'Tuya Zigbee CO2 Sensor',
      'TS0601_co2_sensor',
      'TS0601_TZE204_ogkdpgy2',
    ],
    z2mModels: ['TS0601_co2_sensor', 'TS0601_TZE204_ogkdpgy2', 'DCR-LCD'],
    whiteLabels: ['DCR-LCD', 'DCR-RQJ'],
    notes:
      'P2295: zigbee pid=TS0601 only. Retail/Z2M names stay in deviceNames — never CK-TLSR climate bleed, never TS0601_co2 as Homey productId.',
    protocol: 'tuya_ef00',
    powerSource: 'mains',
    deviceType: 'air_quality',
    forbiddenDrivers: ['climate_sensor', 'climate_sensor_zt08', 'soil_sensor', 'zigbee_universal'],
    stripFrom: ['climate_sensor', 'climate_sensor_zt08'],
    ensureCompose: true,
  },
  {
    id: 'p2295-3ejwxpmu-co2-sibling',
    mfrs: ['_TZE200_3ejwxpmu', '_TZE204_3ejwxpmu'],
    modelIds: ['TS0601'],
    driverId: 'air_quality_co2',
    deviceNames: ['NDIR CO2 sensor', 'TS0601_co2_sensor', 'Tuya CO2 (3ejwxpmu)'],
    z2mModels: ['TS0601_co2_sensor'],
    notes: 'P2295: Z2M same fingerprint group as ogkdpgy2 CO2 — not climate_sensor cartesian bleed.',
    protocol: 'tuya_ef00',
    powerSource: 'mains',
    deviceType: 'air_quality',
    forbiddenDrivers: ['climate_sensor', 'climate_sensor_zt08', 'soil_sensor'],
    stripFrom: ['climate_sensor'],
    ensureCompose: true,
  },
  {
    id: 'p2293-zemismart-68nvbio9-curtain-not-trv',
    mfrs: ['_TZE200_68nvbio9', '_TZE204_68nvbio9'],
    modelIds: ['TS0601'],
    driverId: 'curtain_motor',
    deviceNames: ['ZM16EL', 'ZM16EL-03', 'ZM16EL-33', 'Zemismart curtain motor'],
    z2mModels: ['ZM16EL', 'TS0601_cover'],
    whiteLabels: ['ZM16EL-03', 'ZM16EL-33'],
    notes: 'P2295: Zigbee pid=TS0601; ZM16EL* are retail aliases not productIds.',
    protocol: 'tuya_ef00',
    powerSource: 'mains',
    deviceType: 'curtain',
    forbiddenDrivers: ['device_radiator_valve', 'wall_thermostat', 'climate_sensor'],
    stripFrom: ['device_radiator_valve', 'wall_thermostat', 'climate_sensor'],
    ensureCompose: true,
  },
  {
    id: 'p2295-zemismart-68nvbi09-typo-curtain',
    mfrs: ['_TZE200_68nvbi09'],
    modelIds: ['TS0601'],
    driverId: 'curtain_motor',
    deviceNames: ['ZM16EL (typo mfr 68nvbi09)', 'Zemismart curtain motor'],
    z2mModels: ['ZM16EL', 'TS0601_cover'],
    notes: 'P2295: Z2M fingerprint typo sibling of 68nvbio9 — cover not TRV.',
    protocol: 'tuya_ef00',
    powerSource: 'mains',
    deviceType: 'curtain',
    forbiddenDrivers: ['device_radiator_valve', 'wall_thermostat', 'climate_sensor'],
    stripFrom: ['device_radiator_valve', 'wall_thermostat', 'climate_sensor'],
    ensureCompose: true,
  },
  {
    id: 'p2293-zemismart-cf1sl3tj-curtain-not-trv',
    mfrs: ['_TZE200_cf1sl3tj'],
    modelIds: ['TS0601'],
    driverId: 'curtain_motor',
    deviceNames: ['ZM85EL-2Z', 'Zemismart dual curtain'],
    z2mModels: ['ZM85EL-2Z', 'TS0601_cover'],
    whiteLabels: ['ZM85EL-2Z'],
    notes: 'P2295: Zigbee pid=TS0601; ZM85EL-2Z is retail alias.',
    protocol: 'tuya_ef00',
    powerSource: 'mains',
    deviceType: 'curtain',
    forbiddenDrivers: ['device_radiator_valve', 'wall_thermostat', 'climate_sensor'],
    stripFrom: ['device_radiator_valve', 'wall_thermostat', 'climate_sensor'],
    ensureCompose: true,
  },
  {
    id: 'p2295-zemismart-cover-siblings',
    mfrs: [
      '_TZE200_pw7mji0l',
      '_TZE204_pw7mji0l',
      '_TZE200_nw1r9hp6',
      '_TZE200_9p5xmj5r',
      '_TZE200_vexa5o82',
      '_TZE200_eevqq1uv',
      '_TZE200_ba69l9ol',
      '_TZE200_sfqyhvpv',
      '_TZE204_ejh6owwz',
    ],
    modelIds: ['TS0601'],
    driverId: 'curtain_motor',
    deviceNames: ['Zemismart / Tuya TS0601 cover (Z2M group 148)', 'TS0601_cover'],
    z2mModels: ['TS0601_cover', 'ZM16EL', 'ZM85EL-2Z'],
    notes: 'P2295: Z2M cover fingerprint siblings of 68nvbio9/cf1sl3tj — each couple keeps pid TS0601 only.',
    protocol: 'tuya_ef00',
    powerSource: 'mains',
    deviceType: 'curtain',
    forbiddenDrivers: ['device_radiator_valve', 'wall_thermostat', 'climate_sensor'],
    stripFrom: ['device_radiator_valve', 'wall_thermostat', 'climate_sensor'],
    ensureCompose: true,
  },
  {
    id: 'p2234b-tze204_mpbki2zm',
    mfrs: ['_TZE204_mpbki2zm'],
    modelIds: ['TS0601'],
    driverId: 'wall_thermostat',
    deviceNames: ['TYBAC-006', 'BAC006', 'Tuya FCU thermostat'],
    z2mModels: ['TYBAC-006', 'BAC-006'],
    whiteLabels: ['TYBAC-006', 'BAC006'],
    notes:
      'P2295: zigbee pid=TS0601 only — PJ-1203A was invent. TYBAC-006/BAC006 are retail names. Sibling qujphad5 is a separate couple.',
    protocol: 'tuya_ef00',
    powerSource: 'mains',
    deviceType: 'thermostat',
    forbiddenDrivers: ['thermostatic_radiator_valve', 'device_radiator_valve', 'power_meter', 'bulb_dimmable'],
    stripFrom: ['device_radiator_valve', 'power_meter'],
    ensureCompose: true,
  },
  {
    id: 'p2282-mrpevh8p-ts0041-button',
    mfrs: ['_TZ3000_mrpevh8p'],
    modelIds: ['TS0041'],
    driverId: 'button_wireless_1',
    deviceNames: ['SH-SC07', 'RSH-SC021', 'Tuya 1-button scene switch'],
    z2mModels: ['TS0041', 'SH-SC07'],
    whiteLabels: ['SH-SC07', 'RSH-SC021'],
    notes:
      'P2295: zigbee pid=TS0041 only. SH-SC07/RSH-SC021 are whiteLabels. Interview may show phantom EP2–4 — still 1 physical button.',
    protocol: 'zcl',
    powerSource: 'battery',
    deviceType: 'button',
    forbiddenDrivers: [
      'switch_1gang',
      'scene_switch_4',
      'button_wireless_4',
      'button_wireless_4_ts0041',
      'climate_sensor',
    ],
    stripFrom: ['switch_1gang', 'button_wireless_4_ts0041'],
    ensureCompose: true,
  },
];

function enrichHobeian(mfs) {
  const h = mfs.HOBEIAN;
  if (!h || typeof h !== 'object') return null;
  const byPid = { ...(h.byPid || {}) };
  const deviceNamesByPid = {
    ...(h.deviceNamesByPid || {}),
    '3315-S': ['HOBEIAN water leak', '3315-S', '3315-Seu'],
    '3315-Seu': ['HOBEIAN water leak EU', '3315-Seu'],
    'ZG-222Z': ['HOBEIAN water leak ZG-222Z'],
    'ZG-222ZA': ['HOBEIAN water leak ZG-222ZA'],
    'ZG-303Z': ['HOBEIAN soil ZG-303Z', 'ZG-303L', 'ZG-303B'],
    'ZG-227Z': ['HOBEIAN climate ZG-227Z'],
    'ZG-227ZL': ['HOBEIAN climate ZG-227ZL'],
    'ZG-204ZM': ['HOBEIAN presence PIR+mmWave ZG-204ZM', 'ZG-204ZS'],
    'ZG-101ZL': ['HOBEIAN button ZG-101ZL'],
  };
  const modelIds = sorted(Object.keys(byPid));
  mfs.HOBEIAN = {
    ...h,
    multiCouple: true,
    byPid,
    modelIds,
    modelIdsCount: modelIds.length,
    // primary remains soil default for bare-brand fallbacks; resolve via byPid
    pid: h.pid && byPid[h.pid] ? h.pid : 'ZG-303Z',
    deviceNamesByPid,
    deviceNames: sorted(Object.values(deviceNamesByPid).flat()),
    notes:
      'P2295: one brand → many deviceIds/pids/names/drivers. Never collapse to a single modelId. Compose remains Homey pairing SSOT; byPid is the multi-couple map.',
    lastEnrichment: 'p2295-multi-identity',
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  return mfs.HOBEIAN;
}

function main() {
  const mfs = loadJson(MFS_PATH);
  const reg = loadJson(REG_PATH);
  const alias = fs.existsSync(ALIAS_PATH) ? loadJson(ALIAS_PATH) : { _meta: {}, vendors: {} };
  alias.vendors = alias.vendors || {};

  const report = { applied: APPLY, packs: [], compose: [], registry: [], alias: [] };

  for (const pack of PACKS) {
    const prefixVariants = sorted(
      pack.mfrs.flatMap((m) => {
        const body = String(m).replace(/^_TZE?\d+_?/i, '');
        return [`_TZE200_${body}`, `_TZE204_${body}`, `_TZE284_${body}`].filter((x) =>
          Object.keys(mfs).some((k) => norm(k) === norm(x)) || pack.mfrs.some((y) => norm(y) === norm(x)));
      }),
    );

    for (const mfr of pack.mfrs) {
      const nm = norm(mfr);
      const existing = findTopKeys(mfs, nm);
      const key = preferredKey(existing, mfr);
      const variants = sorted([...casings(mfr), ...existing]);
      const patch = {
        driverId: pack.driverId,
        source: `registry:${pack.id}`,
        modelIds: pack.modelIds,
        deviceNames: pack.deviceNames,
        z2mModels: pack.z2mModels || [],
        whiteLabels: pack.whiteLabels || [],
        productNames: pack.deviceNames,
        variants,
        prefixVariants,
        notes: pack.notes,
        protocol: pack.protocol,
        powerSource: pack.powerSource,
        deviceType: pack.deviceType,
        coupleLock: true,
        sources: [pack.id, 'p2295'],
      };

      const before = existing.length ? { ...mfs[existing[0]] } : null;
      const merged = mergeEntry(mfs[key] || {}, patch);
      mfs[key] = merged;

      // Sync sibling case keys to the same enrichment (keep keys that already exist)
      for (const k of existing) {
        if (k === key) continue;
        mfs[k] = mergeEntry(mfs[k] || {}, { ...patch, variants });
      }

      upsertDevices(mfs, nm, patch);
      for (const pid of pack.modelIds) upsertSacred(mfs, mfr, pid, patch);

      // Drop low-confidence wrong-pid sacred bleed for this mfr (keep only locked pids)
      for (const [sk, sv] of Object.entries(mfs.sacredCouples || {})) {
        if (!sk.includes('|')) continue;
        const [sm, sp] = sk.split('|');
        if (sm !== nm) continue;
        if (!pack.modelIds.some((p) => norm(p) === sp)) {
          if ((sv.confidence || 1) < 0.5 || (sv.sources || []).includes('mfs_db')) {
            delete mfs.sacredCouples[sk];
          }
        }
      }

      report.packs.push({
        mfr: key,
        driverId: pack.driverId,
        modelIds: pack.modelIds,
        deviceNames: pack.deviceNames,
        beforePid: before?.pid,
        afterPid: merged.pid,
        beforeCount: before?.modelIdsCount,
        afterCount: merged.modelIdsCount,
      });
    }

    // Compose strip / ensure
    const allCasings = pack.mfrs.flatMap(casings);
    for (const bad of pack.stripFrom || []) {
      const r = stripFromCompose(bad, allCasings.map(norm));
      if (r.removed) report.compose.push({ action: 'strip', ...r, pack: pack.id });
    }
    if (pack.ensureCompose) {
      const r = ensureOnCompose(pack.driverId, allCasings, pack.modelIds);
      if (r.added || true) report.compose.push({ action: 'ensure', ...r, pack: pack.id });
    }

    upsertRegistryCase(reg, {
      id: pack.id,
      mfr: sorted(pack.mfrs.flatMap(casings)),
      productId: pack.modelIds,
      canonicalDriver: pack.driverId,
      forbiddenDrivers: pack.forbiddenDrivers,
      forbidMode: 'couple',
      protocol: pack.protocol,
      notes: pack.notes,
      sources: uniq([pack.id, 'P2295', ...(pack.z2mModels || [])]),
      tracks: { master: { static: true, dynamic: true }, stable: { static: true, dynamic: false } },
      deviceNames: pack.deviceNames,
      z2mModels: pack.z2mModels || [],
      whiteLabels: pack.whiteLabels || [],
    });
    report.registry.push(pack.id);

    // Marketing alias registry (never as productId)
    const vendorKey = pack.driverId.includes('curtain')
      ? 'Zemismart'
      : pack.driverId.includes('button')
        ? 'TuyaButton'
        : pack.driverId.includes('thermostat')
          ? 'TuyaFCU'
          : pack.driverId.includes('co2') || pack.driverId.includes('air_quality')
            ? 'TuyaCO2'
            : 'Tuya';
    alias.vendors[vendorKey] = alias.vendors[vendorKey] || { aliases: {} };
    for (const name of uniq([...(pack.deviceNames || []), ...(pack.z2mModels || []), ...(pack.whiteLabels || [])])) {
      const prev = alias.vendors[vendorKey].aliases[name] || {};
      alias.vendors[vendorKey].aliases[name] = {
        ...prev,
        modelId: pack.modelIds[0],
        manufacturerNames: sorted([...(prev.manufacturerNames || []), ...pack.mfrs]),
        description: pack.notes,
        currentDriver: pack.driverId,
        triage: 'ok',
        alsoSoldAs: sorted([...(prev.alsoSoldAs || []), ...(pack.whiteLabels || [])].filter((x) => x !== name)),
      };
      report.alias.push(`${vendorKey}/${name}`);
    }
  }

  const hobeian = enrichHobeian(mfs);
  if (hobeian) report.packs.push({ mfr: 'HOBEIAN', multiCouple: true, modelIdsCount: hobeian.modelIdsCount });

  // Patch populate-mfs-multi doctrine helper note into mfs stats
  mfs.stats = mfs.stats || {};
  mfs.stats.lastP2295Enrichment = new Date().toISOString();
  mfs.stats.p2295Note =
    'modelIds=real Zigbee pids; deviceNames/z2mModels/whiteLabels/productNames=aliases; multiCouple brands use byPid';

  if (APPLY) {
    saveJson(MFS_PATH, mfs);
    saveJson(REG_PATH, reg);
    saveJson(ALIAS_PATH, alias);
  }

  console.log(JSON.stringify(report, null, 2));
  console.log(APPLY ? '\nApplied.' : '\nDry-run only (pass --apply).');
}

main();
