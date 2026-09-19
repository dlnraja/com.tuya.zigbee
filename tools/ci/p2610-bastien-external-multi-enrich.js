'use strict';

/**
 * P2610 — Bastien house external multi-source enrich (outbound-first)
 *
 * WHY: Bastien box learns from Z2M / Johan / community FP caches; public apps
 *      receive only complementary unions (never wipe) via Bastien→master→stable.
 * HOW: Verified (mfr,pid) → driver map + local new-fingerprints harvest →
 *      ComplementaryMerge appendExactIdentityForms on target ROOT.
 * POUR QUI: Bastien first, then master/stable (outbound inspiration).
 * QUAND: Maintainer ask / after house soak / cron soft.
 * CONTRE QUOI: invent pid, wrong class (knob≠scene), compose shrink, reverse sync.
 *
 *   node tools/ci/p2610-bastien-external-multi-enrich.js
 *   node tools/ci/p2610-bastien-external-multi-enrich.js --apply
 *   node tools/ci/p2610-bastien-external-multi-enrich.js --apply --root=C:/Users/Dell/Documents/homey/bastien
 */

const fs = require('fs');
const path = require('path');

const ROOT_ARG = (process.argv.find((a) => a.startsWith('--root=')) || '').slice(7);
const ROOT = path.resolve(ROOT_ARG || path.join(__dirname, '..', '..'));
const APPLY = process.argv.includes('--apply');
const HARVEST = process.argv.includes('--harvest');
const OUT_DIR = path.join(ROOT, 'reports', `bastien-external-enrich-${new Date().toISOString().slice(0, 10)}`);

const {
  appendExactIdentityForms,
  wouldDegradeCompose,
} = require('../../lib/enrichment/ComplementaryMerge');

/** Never route these into wall scene button drivers (sacred / wrong class). */
const FORBIDDEN_MFR = new Set([
  'uri7ongn', 'ixla93vd', 'g9g2xnch', '402vrq2i',
  'kaflzta4', 'ja5osu5g', 'an5rjiwd',
  'ksz749x8', 'm1cvyneb', 'clrdrnya',
]);

/** Skip when another driver already owns the couple (registry/mfs keep). */
const SKIP_OWNED = new Map([
  ['vp6clf9d', 'scene_switch_4'],
  ['ufhtxr59', 'scene_switch_4'],
  ['w8jwkczz', 'wall_remote_3_gang'],
  ['yj6k7vfo', 'button_wireless_4_ts0041'],
  ['uaa99arv', 'switch_1gang'],
  ['rrjr1q0u', 'button_wireless_2'],
  ['yw5tvzsk', 'button_wireless_2'],
]);

/** Couples we explicitly re-home (wrong class → button remote). */
const REHOME = [
  {
    mfr: '_TZ3000_tk3s5tyg',
    pid: 'TS0041',
    fromDrivers: ['smoke_detector_advanced', 'smoke_detector'],
    toDriver: 'button_wireless_1',
    src: 'Z2M#8072 rehome from smoke',
  },
];

/**
 * Verified wall-scene remote couples (Johan README + Z2M issues + community).
 * productId locked — never invent.
 */
const VERIFIED = [
  // 1-btn TS0041 → button_wireless_1
  { mfr: '_TZ3000_tk3s5tyg', pid: 'TS0041', driver: 'button_wireless_1', src: 'Z2M#8072' },
  { mfr: '_TZ3000_4upl1fcj', pid: 'TS0041', driver: 'button_wireless_1', src: 'Z2M#18035' },
  { mfr: '_TZ3000_fkp5zyho', pid: 'TS0041', driver: 'button_wireless_1', src: 'Johan' },
  { mfr: '_TZ3000_axpdxqgu', pid: 'TS0041', driver: 'button_wireless_1', src: 'Johan' },
  { mfr: '_TZ3000_peszejy7', pid: 'TS0041', driver: 'button_wireless_1', src: 'Johan' },
  { mfr: '_TZ3000_pzui3skt', pid: 'TS0041', driver: 'button_wireless_1', src: 'Johan' },
  { mfr: '_TZ3000_f97vq5mn', pid: 'TS0041', driver: 'button_wireless_1', src: 'Johan' },
  { mfr: '_TZ3000_fa9mlvja', pid: 'TS0041', driver: 'button_wireless_1', src: 'Johan' },
  { mfr: '_TZ3000_itb0omhv', pid: 'TS0041', driver: 'button_wireless_1', src: 'Johan' },
  { mfr: '_TZ3000_8rppvwda', pid: 'TS0041', driver: 'button_wireless_1', src: 'Johan' },
  { mfr: '_TZ3000_q68478x7', pid: 'TS0041', driver: 'button_wireless_1', src: 'Johan' },
  { mfr: '_TZ3000_yj6k7vfo', pid: 'TS0041', driver: 'button_wireless_4_ts0041', src: 'dedicated alias' },
  { mfr: '_TZ3000_qgwcxxws', pid: 'TS0041', driver: 'button_wireless_1', src: 'community-sync' },
  { mfr: '_TYZB02_keyjqthh', pid: 'TS0041', driver: 'button_wireless_1', src: 'Johan' },

  // 2-btn TS0042 → button_wireless_2
  { mfr: '_TZ3000_owgcnkrh', pid: 'TS0042', driver: 'button_wireless_2', src: 'Johan' },
  { mfr: '_TZ3000_oikiyf3b', pid: 'TS0042', driver: 'button_wireless_2', src: 'Johan' },
  { mfr: '_TZ3000_dfgbtub0', pid: 'TS0042', driver: 'button_wireless_2', src: 'Z2M#18035' },
  { mfr: '_TZ3000_h1c2eamp', pid: 'TS0042', driver: 'button_wireless_2', src: 'Johan' },
  { mfr: '_TZ3000_5e235jpa', pid: 'TS0042', driver: 'button_wireless_2', src: 'Johan' },
  { mfr: '_TZ3000_fkvaniuu', pid: 'TS0042', driver: 'button_wireless_2', src: 'Johan' },
  { mfr: '_TYZB02_keyjhapk', pid: 'TS0042', driver: 'button_wireless_2', src: 'Johan' },
  { mfr: '_TZ3400_keyjhapk', pid: 'TS0042', driver: 'button_wireless_2', src: 'Johan' },

  // 3-btn TS0043 → button_wireless_3
  { mfr: '_TZ3000_a7ouggvs', pid: 'TS0043', driver: 'button_wireless_3', src: 'Z2M/Johan Zemismart' },
  { mfr: '_TZ3000_qzjcsmar', pid: 'TS0043', driver: 'button_wireless_3', src: 'Johan' },
  { mfr: '_TZ3000_rrjr1q0u', pid: 'TS0043', driver: 'button_wireless_3', src: 'Johan' },
  { mfr: '_TZ3000_w8jwkczz', pid: 'TS0043', driver: 'wall_remote_3_gang', src: 'Johan MOES' },
  { mfr: '_TZ3000_gbm10jnj', pid: 'TS0043', driver: 'button_wireless_3', src: 'Johan MOES' },
  { mfr: '_TZ3000_yw5tvzsk', pid: 'TS0043', driver: 'button_wireless_3', src: 'Johan' },
  { mfr: '_TZ3000_sj7jbgks', pid: 'TS0043', driver: 'button_wireless_3', src: 'Johan' },
  { mfr: '_TYZB02_key8kk7r', pid: 'TS0043', driver: 'button_wireless_3', src: 'Johan' },
  { mfr: '_TZ3000_bi6lpsew', pid: 'TS0043', driver: 'button_wireless_3', src: 'Z2M' },
  { mfr: '_TZ3000_1kmurvlx', pid: 'TS0043', driver: 'button_wireless_3', src: 'Z2M' },

  // 4-btn TS0044 / scene TS004F (not rotary)
  { mfr: '_TZ3000_vp6clf9d', pid: 'TS0044', driver: 'scene_switch_4', src: 'Johan/registry' },
  { mfr: '_TZ3000_wkai4ga5', pid: 'TS0044', driver: 'button_wireless_4', src: 'Z2M#18035' },
  { mfr: '_TZ3000_ufhtxr59', pid: 'TS0044', driver: 'scene_switch_4', src: 'Johan/registry' },
  { mfr: '_TZ3000_ee8nrt2l', pid: 'TS0044', driver: 'button_wireless_4', src: 'Johan' },
  { mfr: '_TZ3000_a4xycprs', pid: 'TS0044', driver: 'button_wireless_4', src: 'Johan MOES' },
  { mfr: '_TZ3000_jcspr0tp', pid: 'TS0044', driver: 'button_wireless_4', src: 'Johan' },
  { mfr: '_TZ3000_zgyzgdua', pid: 'TS0044', driver: 'scene_switch_4', src: 'sacred meter91' },
  { mfr: '_TZ3000_xabckq1v', pid: 'TS004F', driver: 'button_wireless_4', src: 'Z2M/forum' },
  { mfr: '_TZ3000_nuombroo', pid: 'TS004F', driver: 'button_wireless_4', src: 'Johan' },
  { mfr: '_TZ3000_czuyt8lz', pid: 'TS004F', driver: 'button_wireless_4', src: 'Johan' },
  { mfr: '_TZ3000_0ht8dnxj', pid: 'TS004F', driver: 'button_wireless_4', src: 'Johan' },
  { mfr: '_TZ3000_b3mgfu0d', pid: 'TS004F', driver: 'button_wireless_4', src: 'Johan' },
  { mfr: '_TZ3000_11pg3ima', pid: 'TS004F', driver: 'button_wireless_4', src: 'Johan' },
  { mfr: '_TZ3000_et7afzxz', pid: 'TS004F', driver: 'button_wireless_4', src: 'Johan' },
  { mfr: '_TZ3000_abrsvsou', pid: 'TS004F', driver: 'button_wireless_4', src: 'P2448 stay 4-btn' },
  { mfr: '_TZ3000_4fjiwweb', pid: 'TS004F', driver: 'button_wireless_4', src: 'P2448 stay 4-btn' },
];

function caseForms(mfr) {
  const s = String(mfr || '').trim();
  if (!s) return [];
  const out = new Set([s]);
  const m = s.match(/^(_T[YZ][A-Z0-9]*_)(.+)$/i);
  if (m) {
    const pref = m[1];
    const tail = m[2];
    out.add(`${pref.toUpperCase()}${tail}`);
    out.add(`${pref.toLowerCase()}${tail.toLowerCase()}`);
    out.add(`${pref.toUpperCase()}${tail.toLowerCase()}`);
  } else {
    out.add(s.toLowerCase());
    out.add(s.toUpperCase());
  }
  return [...out];
}

function mfrTail(mfr) {
  const m = String(mfr).match(/_([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : String(mfr).toLowerCase();
}

function isForbidden(mfr) {
  return FORBIDDEN_MFR.has(mfrTail(mfr));
}

function harvestCommunityCache() {
  const extra = [];
  const p = path.join(ROOT, 'data/community-sync/new-fingerprints.json');
  // Prefer master cache if Bastien tree lacks it
  const candidates = [
    p,
    path.join('C:/Users/Dell/Documents/homey/master/data/community-sync/new-fingerprints.json'),
  ];
  let list = [];
  for (const c of candidates) {
    if (!fs.existsSync(c)) continue;
    try {
      list = JSON.parse(fs.readFileSync(c, 'utf8'));
      break;
    } catch (_e) { /* */ }
  }
  for (const row of Array.isArray(list) ? list : []) {
    const mfr = row.mfr || row.manufacturerName;
    let pids = row.productId || row.modelId || row.pid;
    if (!mfr || isForbidden(mfr)) continue;
    if (!Array.isArray(pids)) pids = pids ? [pids] : [];
    for (const pid of pids) {
      const p = String(pid || '').toUpperCase();
      let driver = null;
      if (p === 'TS0041' || p === 'TS0041A') driver = 'button_wireless_1';
      else if (p === 'TS0042') driver = 'button_wireless_2';
      else if (p === 'TS0043') driver = 'button_wireless_3';
      else if (p === 'TS0044') driver = 'button_wireless_4';
      else if (p === 'TS0046') driver = 'button_wireless_6';
      else if (p === 'TS004F') {
        // Only when cache says remote/button — never knob tails
        if (/knob|rotary|dim/i.test(JSON.stringify(row))) continue;
        driver = 'button_wireless_4';
      } else continue;
      extra.push({
        mfr: String(mfr),
        pid: p,
        driver,
        src: `community-sync:${row.source || 'cache'}`,
      });
    }
  }
  return extra;
}

function enrichOne(couple) {
  if (isForbidden(couple.mfr)) {
    return { ok: false, reason: 'forbidden-mfr', ...couple };
  }
  const owned = SKIP_OWNED.get(mfrTail(couple.mfr));
  if (owned && owned !== couple.driver) {
    return { ok: true, noop: true, skippedOwned: owned, ...couple };
  }
  const composePath = path.join(ROOT, 'drivers', couple.driver, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {
    return { ok: false, reason: 'missing-driver', ...couple };
  }
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  if (!compose.zigbee) compose.zigbee = {};
  const before = {
    zigbee: {
      manufacturerName: [...(compose.zigbee.manufacturerName || [])],
      productId: [...(compose.zigbee.productId || [])],
    },
    capabilities: [...(compose.capabilities || [])],
    settings: Array.isArray(compose.settings) ? compose.settings.slice() : compose.settings,
  };
  const forms = caseForms(couple.mfr);
  compose.zigbee.manufacturerName = appendExactIdentityForms(
    compose.zigbee.manufacturerName,
    forms,
  );
  compose.zigbee.productId = appendExactIdentityForms(
    compose.zigbee.productId,
    [couple.pid],
  );
  const after = {
    zigbee: compose.zigbee,
    capabilities: compose.capabilities,
    settings: compose.settings,
  };
  if (wouldDegradeCompose(before, after)) {
    return { ok: false, reason: 'would-degrade', ...couple };
  }
  const addedM = (compose.zigbee.manufacturerName || []).length - before.zigbee.manufacturerName.length;
  const addedP = (compose.zigbee.productId || []).length - before.zigbee.productId.length;
  if (addedM === 0 && addedP === 0) {
    return { ok: true, noop: true, ...couple };
  }
  if (APPLY) {
    fs.writeFileSync(composePath, `${JSON.stringify(compose, null, 2)}\n`);
  }
  return {
    ok: true,
    applied: APPLY,
    addedMfr: addedM,
    addedPid: addedP,
    ...couple,
  };
}

function stripMfrFromDriver(driverId, mfr) {
  const composePath = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return { ok: false, reason: 'missing' };
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  const before = (compose.zigbee?.manufacturerName || []).length;
  const forms = new Set(caseForms(mfr).map((s) => s.toLowerCase()));
  compose.zigbee.manufacturerName = (compose.zigbee.manufacturerName || [])
    .filter((m) => !forms.has(String(m).toLowerCase()));
  const removed = before - compose.zigbee.manufacturerName.length;
  if (removed <= 0) return { ok: true, noop: true, driverId, mfr };
  if (APPLY) fs.writeFileSync(composePath, `${JSON.stringify(compose, null, 2)}\n`);
  return { ok: true, applied: APPLY, removed, driverId, mfr };
}

function applyRehomes() {
  const out = [];
  for (const rh of REHOME) {
    for (const from of rh.fromDrivers) {
      out.push({ action: 'strip', ...stripMfrFromDriver(from, rh.mfr) });
    }
    out.push({
      action: 'union',
      ...enrichOne({
        mfr: rh.mfr,
        pid: rh.pid,
        driver: rh.toDriver,
        src: rh.src,
      }),
    });
  }
  return out;
}


function updateBastienSsot(applied) {
  const ssotPath = path.join(ROOT, 'config/architecture/bastien-house-ssot.json');
  if (!fs.existsSync(ssotPath)) return null;
  const ssot = JSON.parse(fs.readFileSync(ssotPath, 'utf8'));
  const inv = Array.isArray(ssot.devicesInventory) ? ssot.devicesInventory.slice() : [];
  const byKey = new Set(inv.map((x) => `${x.mfr}|${x.pid}|${x.driver}`.toLowerCase()));
  let added = 0;
  for (const a of applied) {
    if (!a.ok || a.noop || a.reason) continue;
    const key = `${a.mfr}|${a.pid}|${a.driver}`.toLowerCase();
    if (byKey.has(key)) continue;
    byKey.add(key);
    inv.push({
      mfr: a.mfr,
      pid: a.pid,
      driver: a.driver,
      source: a.src,
      enrichedAt: new Date().toISOString().slice(0, 10),
    });
    added += 1;
  }
  ssot.devicesInventory = inv;
  ssot.enrichment = ssot.enrichment || {};
  ssot.enrichment.lastExternalPass = {
    at: new Date().toISOString(),
    patch: 'P2610',
    appliedUnions: applied.filter((x) => x.ok && !x.noop && x.applied).length,
  };
  if (APPLY) {
    fs.writeFileSync(ssotPath, `${JSON.stringify(ssot, null, 2)}\n`);
  }
  return { inventorySize: inv.length, added };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const harvest = HARVEST ? harvestCommunityCache() : [];
  const seen = new Set();
  const couples = [];
  for (const c of [...VERIFIED, ...harvest]) {
    const k = `${String(c.mfr).toLowerCase()}|${c.pid}|${c.driver}`;
    if (seen.has(k)) continue;
    seen.add(k);
    couples.push(c);
  }

  const rehome = applyRehomes();
  const results = couples.map(enrichOne);
  const wouldApply = results.filter((r) => r.ok && !r.noop && !r.skippedOwned);
  const applied = results.filter((r) => r.ok && !r.noop && r.applied);
  const noop = results.filter((r) => r.noop || r.skippedOwned);
  const failed = results.filter((r) => !r.ok);

  const ssot = updateBastienSsot(results);

  const report = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    mode: APPLY ? 'apply' : 'dry-run',
    patch: 'P2610',
    direction: 'bastien_external_then_outbound',
    harvestEnabled: HARVEST,
    totals: {
      candidates: couples.length,
      verified: VERIFIED.length,
      harvest: harvest.length,
      wouldApply: wouldApply.length,
      applied: applied.length,
      noop: noop.length,
      failed: failed.length,
      rehome: rehome.filter((x) => x.applied || (x.ok && !x.noop)).length,
    },
    ssot,
    rehome,
    applied: APPLY ? applied : wouldApply.slice(0, 80),
    failed: failed.slice(0, 40),
  };
  fs.writeFileSync(path.join(OUT_DIR, 'REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report.totals, null, 2));
  console.log(`report: ${path.join(OUT_DIR, 'REPORT.json')}`);
  if (!APPLY) console.log('dry-run only — re-run with --apply');
}

main();
