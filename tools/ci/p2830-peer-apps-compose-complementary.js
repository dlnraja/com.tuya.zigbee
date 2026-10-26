#!/usr/bin/env node
'use strict';

/**
 * P2830 — Peer Homey apps compose → OUR drivers (intelligent rewrite, C1).
 *
 * WHY: Integrate devices from Johan / Lidl / peer Zigbee apps without copy-paste
 *      of their runtime code — only (mfr,pid) couples from their compose manifests.
 * HOW: Fetch peer driver.compose.json via GitHub API → map driver id → ComplementaryMerge.
 * POUR QUI: BOTH reliability FP enrich. Never write peer repos. Never forum POST.
 * CONTRE QUOI: invent pid; wipe compose; cartesian issue dumps; TS0601→generic.
 *
 *   node tools/ci/p2830-peer-apps-compose-complementary.js
 *   node tools/ci/p2830-peer-apps-compose-complementary.js --apply
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const OUT = path.join(ROOT, 'reports', `peer-compose-${new Date().toISOString().slice(0, 10)}`);
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';

const {
  appendExactIdentityForms,
  wouldDegradeCompose,
} = require('../../lib/enrichment/ComplementaryMerge');

/** Misattribution registry: never UNION a mfr into a forbiddenDrivers target (P2328 wkai4ga5…). */
function loadForbiddenMfrDrivers() {
  const p = path.join(ROOT, 'data/user-misattribution-registry.json');
  const out = new Map(); // mfrLower → Set(driverId)
  try {
    const reg = JSON.parse(fs.readFileSync(p, 'utf8'));
    const entries = Array.isArray(reg.cases)
      ? reg.cases
      : Array.isArray(reg.entries)
        ? reg.entries
        : Array.isArray(reg)
          ? reg
          : [];
    for (const e of entries) {
      const forbidden = e.forbiddenDrivers || e.forbidDrivers || [];
      if (!forbidden.length) continue;
      // WHY(P2870): forbidMode "couple" bans one mfr+pid, not the mfr. Treating it mfr-wide kept
      // _TZ3000_dfgbtub0 off button_wireless_2 although only its TS0044 couple is banned there
      // (TS0042 is the real 2-button couple). A couple ban now blocks the union only when the
      // target driver would also carry one of the banned pids.
      const couplePids = String(e.forbidMode || '').toLowerCase() === 'couple' && !e.doNotLock
        ? [].concat(e.productId || []).map((x) => String(x).toUpperCase()) : null;
      for (const m of e.mfr || e.manufacturerName || []) {
        const k = String(m).toLowerCase();
        if (!out.has(k)) out.set(k, new Map());
        for (const d of forbidden) {
          const prev = out.get(k).get(String(d));
          if (prev === null) continue; // already banned mfr-wide
          if (!couplePids || !couplePids.length) { out.get(k).set(String(d), null); continue; }
          const set = prev || new Set();
          couplePids.forEach((x) => set.add(x));
          out.get(k).set(String(d), set);
        }
      }
    }
  } catch (_e) { /* soft */ }
  return out;
}

function mfrForbiddenOnDriver(forbidIdx, mfr, driverId, driverPids = null) {
  const byDriver = forbidIdx.get(String(mfr).toLowerCase());
  if (!byDriver || !byDriver.has(driverId)) return false;
  const pids = byDriver.get(driverId);
  if (pids === null || !driverPids) return true; // mfr-wide ban, or pids unknown: stay strict
  for (const p of driverPids) if (pids.has(String(p).toUpperCase())) return true;
  return false;
}

/** Hard allow-list exceptions: mfr suffix → only these drivers may receive UNION (peer bleed Contre quoi). */
const MFR_SUFFIX_ALLOW_DRIVERS = {
  zdrhqmo0: new Set(['wall_dimmer_tuya', 'dimmer_1_gang_tuya', 'dimmer_2_gang_tuya']),
};

/** BSEED zcl_only mfrs must never receive Tuya MCU pid TS0601 via peer cartesian. */
const BSEED_ZCL_MFR = new Set([
  '_tz3000_l9brjwau', '_tz3000_blhvsaqf', '_tz3000_ysdv91bk', '_tz3000_hafsqare',
  '_tz3000_e98krvvk', '_tz3000_iedbgyxt', '_tz3000_cauq1okq', '_tz3000_w5xztuy7',
]);

function mfrBlockedByAllowList(mfr, driverId) {
  const s = String(mfr).toLowerCase();
  const suffix = s.split('_').pop();
  const allow = MFR_SUFFIX_ALLOW_DRIVERS[suffix];
  if (!allow) return false;
  return !allow.has(driverId);
}

function filterPidsForBucket(mfrs, pids) {
  const hasBseed = [...mfrs].some((m) => BSEED_ZCL_MFR.has(String(m).toLowerCase()));
  if (!hasBseed) return [...pids];
  return [...pids].filter((p) => String(p).toUpperCase() !== 'TS0601');
}

/**
 * Peer repos / branches that publish Zigbee Tuya-class fingerprints (rewritten into OUR drivers).
 * WHY: Johan master is a stale stub — harvest live SDK3 + active develop/modernize lanes.
 * CONTRE QUOI: single-branch miss; invent pid; wipe compose; nkjintbl TZE284 bleed (registry forbid).
 */
const PEERS = [
  { id: 'johan-sdk3', repo: 'JohanBendz/com.tuya.zigbee', branch: 'SDK3' },
  { id: 'johan-sdk3-test', repo: 'JohanBendz/com.tuya.zigbee', branch: 'SDK3-test' },
  { id: 'johan-develop-0.4', repo: 'JohanBendz/com.tuya.zigbee', branch: 'develop-0.4' },
  { id: 'johan-modernize-2026', repo: 'JohanBendz/com.tuya.zigbee', branch: 'modernize-2026' },
  { id: 'johan-sdk-3', repo: 'JohanBendz/com.tuya.zigbee', branch: 'sdk-3' },
  { id: 'lidl-sdk3', repo: 'JohanBendz/com.lidl', branch: 'SDK3' },
  { id: 'lidl-default', repo: 'JohanBendz/com.lidl', branch: 'default' },
];

async function resolveBranch(peer) {
  if (peer.branch && peer.branch !== 'default') return peer.branch;
  const repo = await ghGet(`/repos/${peer.repo}`);
  return repo.default_branch || 'master';
}

/**
 * Peer driver folder → our driver id when names differ.
 * Only verified class aliases — never invent device types.
 */
/**
 * Prefer OUR canonical driver ids (no underscore gang) so peer rewrite
 * does not dual-claim the same (mfr,pid) on Johan-named sibling folders.
 */
const DRIVER_ALIAS = {
  door_sensor: 'contact_sensor',
  doorwindowsensor: 'contact_sensor',
  doorwindowsensor_2: 'contact_sensor',
  doorwindowsensor_3: 'contact_sensor',
  doorwindowsensor_4: 'contact_sensor',
  smoke_detector: 'smoke_sensor',
  smoke_detector_advanced: 'smoke_sensor',
  plug: 'smart_plug',
  plug_smart: 'smart_plug',
  smartplug: 'smart_plug',
  radiator_valve: 'device_radiator_valve',
  smart_radiator_thermostat: 'device_radiator_valve',
  trv: 'device_radiator_valve',
  curtain: 'curtain_motor',
  curtain_module: 'curtain_motor',
  curtain_module_2_gang: 'curtain_motor',
  blinds: 'curtain_motor',
  dimmer: 'wall_dimmer_tuya',
  dimmer_1_gang: 'dimmer_1_gang_tuya',
  dimmer_1_gang_2: 'dimmer_1_gang_tuya',
  dimmer_2_gang: 'dimmer_2_gang_tuya',
  wall_switch: 'switch_1gang',
  switch_1_gang: 'switch_1gang',
  switch_2_gang: 'switch_2gang',
  switch_3_gang: 'switch_3gang',
  switch_4_gang: 'switch_4gang',
  wall_switch_1_gang: 'wall_switch_1gang_1way',
  wall_switch_2_gang: 'wall_switch_2gang_1way',
  wall_switch_3_gang: 'wall_switch_3gang_1way',
  wall_switch_4_gang: 'wall_switch_4gang_1way',
  wall_switch_1_gang_tuya: 'switch_1gang',
  wall_remote_1_gang: 'button_wireless_1',
  wall_remote_2_gang: 'button_wireless_2',
  wall_remote_3_gang: 'button_wireless_3',
  wall_remote_4_gang: 'button_wireless_4',
  wall_remote_4_gang_3: 'button_wireless_4',
  handheld_remote_4_buttons: 'button_wireless_4',
  smart_remote_4_buttons: 'button_wireless_4',
  sos_button: 'sos_emergency_button',
  waterleak: 'water_leak_sensor',
  water_leak: 'water_leak_sensor',
  water_detector: 'water_leak_sensor',
  water_leak_sensor_tuya: 'water_leak_sensor',
  flood_sensor: 'water_leak_sensor',
  temperature_humidity: 'climate_sensor',
  temp_humidity: 'climate_sensor',
  lcd_temperature: 'lcdtemphumidsensor',
  pirsensor: 'motion_sensor',
  pir_sensor_2: 'motion_sensor',
  motion_sensor_2: 'motion_sensor',
  radar_sensor: 'presence_sensor_radar',
  radar_sensor_2: 'presence_sensor_radar',
  radar_sensor_ceiling: 'presence_sensor_radar',
  soilsensor: 'soil_sensor',
  soilsensor_2: 'soil_sensor',
  outdoor_plug: 'smart_plug',
  outdoor_2_socket: 'smart_plug',
  double_power_point: 'smart_plug',
  double_power_point_2: 'smart_plug',
  fingerbot: 'switch_1gang',
  christmas_lights: 'rgb_led_strip',
  dimmable_led_strip: 'rgb_led_strip',
  dimmable_recessed_led: 'tunable_bulb_E27',
  smart_switch: 'switch_1gang',
  smart_button_switch: 'button_wireless_1',
  valvecontroller: 'water_valve_smart',
};

const SKIP_PEER_DRIVERS = new Set([
  'zigbee_universal',
  'generic_tuya',
  'unknown',
  'other',
]);

function ghGet(apiPath) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'UniversalTuya-P2830',
      Accept: 'application/vnd.github+json',
    };
    if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
    const req = https.get(`https://api.github.com${apiPath}`, { headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`GitHub ${res.statusCode}: ${buf.toString('utf8').slice(0, 200)}`));
          return;
        }
        try {
          resolve(JSON.parse(buf.toString('utf8')));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
  });
}

function dualCaseForms(mfr) {
  const s = String(mfr || '').trim();
  if (!s) return [];
  const forms = new Set([s]);
  if (s.startsWith('_')) {
    forms.add(`_${s.slice(1).toLowerCase()}`);
    forms.add(`_${s.slice(1).toUpperCase()}`);
    const m = s.match(/^(_T[YZ][A-Z0-9]*_)(.+)$/i);
    if (m) {
      forms.add(`${m[1].toUpperCase()}${m[2].toLowerCase()}`);
      forms.add(`${m[1].toLowerCase()}${m[2].toLowerCase()}`);
      forms.add(`${m[1].toUpperCase()}${m[2].toUpperCase()}`);
    }
  }
  return [...forms];
}

function ourDrivers() {
  const set = new Set();
  for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    if (fs.existsSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'))) set.add(id);
  }
  return set;
}

function mapDriverId(peerId, ours) {
  if (!peerId || SKIP_PEER_DRIVERS.has(peerId)) return null;
  // Alias FIRST — avoid writing into Johan-named siblings that collide with canonical.
  const alias = DRIVER_ALIAS[peerId];
  if (alias && ours.has(alias)) return alias;
  if (ours.has(peerId)) return peerId;
  // soft: strip _tuya / _zigbee suffixes
  const soft = peerId.replace(/_tuya$/i, '').replace(/_zigbee$/i, '');
  if (DRIVER_ALIAS[soft] && ours.has(DRIVER_ALIAS[soft])) return DRIVER_ALIAS[soft];
  if (ours.has(soft)) return soft;
  // underscore gang → compact (switch_2_gang → switch_2gang)
  const compact = peerId.replace(/_(\d)_gang/gi, '_$1gang').replace(/_gang_/gi, 'gang_');
  if (ours.has(compact)) return compact;
  return null;
}

function isValidMfr(m) {
  const s = String(m || '').trim();
  if (!s) return false;
  if (!/^_T[YZ]/i.test(s) && !/^(HOBEIAN|LIDL|_TZ)/i.test(s)) return false;
  if (/ABC123|placeholder|XXXX|invent|100000(?![0-9])/i.test(s)) return false;
  // R16: reject malformed zero-padding except verified long Tuya forms
  if (/_TZE28C100000[^0]_/i.test(s) && !/^_(TZE28C1000000|TZE2841000000)_[a-z0-9]{8}$/i.test(s)) {
    return false;
  }
  return true;
}

function isValidPid(p) {
  const s = String(p || '').trim();
  if (!s) return false;
  return /^(TS\d{4}[A-Z]?|ZG-[0-9A-Z]+|TS\d{4})$/i.test(s);
}

function ingestDriverManifest(peer, peerDriverId, zigbee, ours, buckets, unmapped) {
  const ourId = mapDriverId(peerDriverId, ours);
  if (!ourId) {
    unmapped.push({ peer: peer.id, peerDriverId });
    return;
  }
  const mfrs = (zigbee?.manufacturerName || []).filter(isValidMfr);
  const pids = (zigbee?.productId || []).filter(isValidPid);
  if (!mfrs.length || !pids.length) return;

  if (!buckets.has(ourId)) {
    buckets.set(ourId, { mfrs: new Set(), pids: new Set(), peerDrivers: new Set(), sources: [] });
  }
  const b = buckets.get(ourId);
  for (const m of mfrs) b.mfrs.add(m);
  for (const p of pids) b.pids.add(String(p).toUpperCase());
  b.peerDrivers.add(peerDriverId);
  b.sources.push(`${peer.id}:${peerDriverId}`);
}

async function harvestPeer(peer, ours) {
  const buckets = new Map();
  const unmapped = [];
  let composeCount = 0;
  let appDriverCount = 0;
  const branch = await resolveBranch(peer);
  peer._resolvedBranch = branch;

  // Primary: peer app.json (Johan ships FPs there; few compose files on disk).
  try {
    const meta = await ghGet(`/repos/${peer.repo}/contents/app.json?ref=${branch}`);
    if (meta.content) {
      const app = JSON.parse(Buffer.from(meta.content, 'base64').toString('utf8'));
      for (const d of app.drivers || []) {
        if (!d?.id || !d.zigbee) continue;
        appDriverCount += 1;
        ingestDriverManifest(peer, d.id, d.zigbee, ours, buckets, unmapped);
      }
    }
  } catch (e) {
    console.warn(`[P2830] ${peer.id} app.json: ${e.message}`);
  }

  // Complementary: driver.compose.json when present
  try {
    const tree = await ghGet(`/repos/${peer.repo}/git/trees/${branch}?recursive=1`);
    const composePaths = (tree.tree || [])
      .map((t) => t.path)
      .filter((p) => /^drivers\/[^/]+\/driver\.compose\.json$/.test(p));
    composeCount = composePaths.length;
    for (const rel of composePaths) {
      const peerDriverId = rel.split('/')[1];
      try {
        const meta = await ghGet(`/repos/${peer.repo}/contents/${rel}?ref=${branch}`);
        if (!meta.content) continue;
        const j = JSON.parse(Buffer.from(meta.content, 'base64').toString('utf8'));
        ingestDriverManifest(peer, peerDriverId, j.zigbee, ours, buckets, unmapped);
      } catch (_e) { /* soft */ }
    }
  } catch (e) {
    console.warn(`[P2830] ${peer.id} tree: ${e.message}`);
  }

  return { buckets, unmapped, composeCount, appDriverCount, branch };
}

function applyBucket(driverId, bucket, forbidIdx = new Map()) {
  const fp = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  const before = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const after = JSON.parse(JSON.stringify(before));
  after.zigbee = after.zigbee || {};

  // WHY: peer remotes often list polluted mfr×pid cartesian — respect sacred forbid + allow-lists.
  const driverPids = [...(before.zigbee?.productId || []), ...(bucket.pids || [])];
  const safeMfrs = [...bucket.mfrs].filter(
    (m) => !mfrForbiddenOnDriver(forbidIdx, m, driverId, driverPids) && !mfrBlockedByAllowList(m, driverId),
  );
  const safePids = filterPidsForBucket(safeMfrs, bucket.pids).map((p) => String(p).toUpperCase());
  const forms = [];
  for (const m of safeMfrs) forms.push(...dualCaseForms(m));
  after.zigbee.manufacturerName = appendExactIdentityForms(after.zigbee.manufacturerName, forms);
  after.zigbee.productId = appendExactIdentityForms(after.zigbee.productId, safePids);

  if (wouldDegradeCompose(before, after)) {
    return { ok: false, reason: 'would_degrade' };
  }
  const addedMfr = (after.zigbee.manufacturerName?.length || 0) - (before.zigbee.manufacturerName?.length || 0);
  const addedPid = (after.zigbee.productId?.length || 0) - (before.zigbee.productId?.length || 0);
  if (addedMfr === 0 && addedPid === 0) return { ok: true, changed: false, addedMfr: 0, addedPid: 0 };
  if (APPLY) fs.writeFileSync(fp, `${JSON.stringify(after, null, 2)}\n`);
  return { ok: true, changed: true, addedMfr, addedPid };
}

async function main() {
  console.log(`[P2830] Peer compose complementary — ${APPLY ? 'APPLY' : 'DRY'}`);
  if (!TOKEN) console.warn('[P2830] WARN: no GH_TOKEN — unauth rate limit 60/h');

  const ours = ourDrivers();
  const forbidIdx = loadForbiddenMfrDrivers();
  const applied = [];
  const allUnmapped = [];
  const peerStats = [];

  for (const peer of PEERS) {
    console.log(`[P2830] harvest ${peer.repo}…`);
    let result;
    try {
      result = await harvestPeer(peer, ours);
    } catch (e) {
      console.error(`[P2830] FAIL ${peer.id}: ${e.message}`);
      peerStats.push({ id: peer.id, error: e.message });
      continue;
    }
    console.log(`[P2830] ${peer.id} branch=${result.branch} appDrivers=${result.appDriverCount} mapped=${result.buckets.size}`);
    peerStats.push({
      id: peer.id,
      branch: result.branch,
      composeCount: result.composeCount,
      appDriverCount: result.appDriverCount,
      mappedDrivers: result.buckets.size,
      unmapped: result.unmapped.length,
    });
    allUnmapped.push(...result.unmapped);

    for (const [driverId, bucket] of result.buckets) {
      const r = applyBucket(driverId, bucket, forbidIdx);
      applied.push({
        peer: peer.id,
        driverId,
        peerDrivers: [...bucket.peerDrivers],
        mfrIn: bucket.mfrs.size,
        pidIn: bucket.pids.size,
        ...r,
      });
    }
  }

  fs.mkdirSync(OUT, { recursive: true });
  const report = {
    id: 'P2830',
    mode: APPLY ? 'apply' : 'dry-run',
    generatedAt: new Date().toISOString(),
    peerStats,
    driversChanged: applied.filter((a) => a.changed).length,
    applied,
    unmappedSample: allUnmapped.slice(0, 80),
    unmappedTotal: allUnmapped.length,
    policy: {
      complementaryOnly: true,
      rewriteNotCopy: true,
      neverInventPid: true,
      sourcesComposeOnly: true,
      respectMisattributionForbid: true,
      forumPost: false,
      dualApp: 'BOTH',
    },
  };
  fs.writeFileSync(path.join(OUT, 'REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(
    path.join(OUT, 'REPORT.md'),
    [
      '# P2830 Peer apps compose → Universal Tuya (rewrite)',
      '',
      `Mode: **${report.mode}** · drivers changed: **${report.driversChanged}**`,
      '',
      ...peerStats.map((p) => `- \`${p.id}\`: compose=${p.composeCount || 0} mapped=${p.mappedDrivers || 0} unmapped=${p.unmapped || 0}${p.error ? ` ERR=${p.error}` : ''}`),
      '',
      'C1: rewrite couples into our drivers — no peer device.js copy. Silent. No invent pid.',
      '',
    ].join('\n'),
  );

  console.log(`[P2830] changed=${report.driversChanged} appliedRows=${applied.length} unmapped=${allUnmapped.length}`);
  if (!APPLY) console.log('[P2830] re-run with --apply to write');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
