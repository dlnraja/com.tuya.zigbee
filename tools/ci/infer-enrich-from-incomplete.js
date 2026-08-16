#!/usr/bin/env node
/**
 * infer-enrich-from-incomplete.js
 *
 * When forums/git/Gmail/external sources are partial or empty, still investigate
 * using ALL local corpora, score heuristics, and propose (or apply) high-confidence
 * Sacred Couple rehomes. Never invent mfrs into a wrong class without pid +
 * Z2M/mfs hints. Never dump into generic_tuya.
 *
 * Usage:
 *   node tools/ci/infer-enrich-from-incomplete.js              # dry-run (default)
 *   node tools/ci/infer-enrich-from-incomplete.js --dry-run
 *   node tools/ci/infer-enrich-from-incomplete.js --apply
 *   node tools/ci/infer-enrich-from-incomplete.js --json
 *   node tools/ci/infer-enrich-from-incomplete.js --root PATH
 *
 * Output: .github/state/infer-enrich-report.json
 *   { applied[], inferred_needs_review[], skipped_ambiguous[], meta }
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {
  normalize,
  includesCI,
  mergeManufacturerCaseVariants,
  pairingCaseVariants,
} = require('../../lib/utils/TuyaNormalizer');
const { isForbiddenPlacement } = require('../../lib/pairing/UserMisattributionRegistry');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const DRY_RUN = !APPLY || args.includes('--dry-run');
const AS_JSON = args.includes('--json');
const rootIdx = args.indexOf('--root');
const ROOT = rootIdx >= 0 ? path.resolve(args[rootIdx + 1]) : path.resolve(__dirname, '..', '..');

const STATE_DIR = path.join(ROOT, '.github', 'state');
const REPORT_PATH = path.join(STATE_DIR, 'infer-enrich-report.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const WIDE_CLAIM = new Set([
  'generic_tuya',
  'universal_zigbee',
  'universal_fallback',
  'generic_diy',
  'tuya_dummy_device',
  'device_generic_diy_universal',
  'gateway_zigbee_bridge',
]);

const SYNTHETIC_RX = /_disabled|_dummy|_generic|_hybrid|_master|placeholder|needs_|xxxxxxxx/i;

/** Deterministic PID → driver (HIGH when target exists; TS0601 excluded). */
const PID_CLASS_RULES = [
  { re: /^TS0001$/i, driver: 'switch_1gang', conf: 92, rule: 'pid_TS0001_switch_1gang' },
  { re: /^TS0002$/i, driver: 'switch_2gang', conf: 92, rule: 'pid_TS0002_switch_2gang' },
  { re: /^TS0003$/i, driver: 'switch_3gang', conf: 92, rule: 'pid_TS0003_switch_3gang' },
  { re: /^TS0004$/i, driver: 'switch_4gang', conf: 92, rule: 'pid_TS0004_switch_4gang' },
  { re: /^TS0011$/i, driver: 'switch_1gang', conf: 88, rule: 'pid_TS0011_switch_1gang' },
  { re: /^TS0012$/i, driver: 'switch_2gang', conf: 88, rule: 'pid_TS0012_switch_2gang' },
  { re: /^TS0013$/i, driver: 'switch_3gang', conf: 88, rule: 'pid_TS0013_switch_3gang' },
  { re: /^TS0014$/i, driver: 'switch_4gang', conf: 88, rule: 'pid_TS0014_switch_4gang' },
  { re: /^TS0041$/i, driver: 'button_wireless_1', conf: 94, rule: 'pid_TS0041_button_1' },
  { re: /^TS0042$/i, driver: 'button_wireless_2', conf: 94, rule: 'pid_TS0042_button_2' },
  { re: /^TS0043$/i, driver: 'button_wireless_3', conf: 94, rule: 'pid_TS0043_button_3' },
  { re: /^TS0044$/i, driver: 'button_wireless_4', conf: 94, rule: 'pid_TS0044_button_4' },
  { re: /^TS0201$/i, driver: 'climate_sensor', conf: 90, rule: 'pid_TS0201_climate' },
  { re: /^TS0202$/i, driver: 'motion_sensor', conf: 88, rule: 'pid_TS0202_motion' },
  { re: /^TS0203$/i, driver: 'contact_sensor', conf: 92, rule: 'pid_TS0203_contact' },
  { re: /^TS0204$/i, driver: 'water_leak_sensor', conf: 85, rule: 'pid_TS0204_leak' },
  { re: /^TS0205$/i, driver: 'smoke_sensor', conf: 85, rule: 'pid_TS0205_smoke' },
  { re: /^TS0207$/i, driver: 'water_leak_sensor', conf: 90, rule: 'pid_TS0207_leak' },
  { re: /^TS011F$/i, driver: 'plug', conf: 86, rule: 'pid_TS011F_plug' },
  { re: /^TS0121$/i, driver: 'plug', conf: 84, rule: 'pid_TS0121_plug' },
  { re: /^TS130F$/i, driver: 'curtain_motor', conf: 86, rule: 'pid_TS130F_cover' },
];

/** Z2M DP name → driver hint for ambiguous TS0601 + _TZE* MCU devices. */
const Z2M_DP_HINTS = [
  { re: /soil|moisture_soil|fertility/i, driver: 'soil_sensor', conf: 88, rule: 'z2m_dp_soil' },
  { re: /windowcover|curtain|blind|lift_percent|position/i, driver: 'curtain_motor', conf: 90, rule: 'z2m_dp_cover' },
  { re: /thermostat|setpoint|local_temperature|pi_heating|valve_position|child_lock/i, driver: 'radiator_valve', conf: 86, rule: 'z2m_dp_trv' },
  { re: /fancoil|system_mode.*cool|cooling_setpoint/i, driver: 'wall_thermostat', conf: 84, rule: 'z2m_dp_fancoil' },
  { re: /water_leak|leakage|flood/i, driver: 'water_leak_sensor', conf: 88, rule: 'z2m_dp_leak' },
  { re: /smoke|gas_alarm|co_alarm/i, driver: 'smoke_sensor', conf: 82, rule: 'z2m_dp_smoke' },
  { re: /occupancy|pir|motion|presence|radar/i, driver: 'motion_sensor', conf: 80, rule: 'z2m_dp_motion' },
  { re: /illuminance|lux|brightness_lux/i, driver: 'climate_sensor', conf: 70, rule: 'z2m_dp_lux' },
  { re: /humidity|temperature/i, driver: 'climate_sensor', conf: 72, rule: 'z2m_dp_climate' },
  { re: /switch_6|gang_6|state_l6/i, driver: 'switch_wall_6gang', conf: 84, rule: 'z2m_dp_6gang' },
  { re: /switch_4|gang_4|state_l4/i, driver: 'switch_4gang', conf: 84, rule: 'z2m_dp_4gang' },
  { re: /switch_3|gang_3|state_l3/i, driver: 'switch_3gang', conf: 84, rule: 'z2m_dp_3gang' },
  { re: /switch_2|gang_2|state_l2/i, driver: 'switch_2gang', conf: 84, rule: 'z2m_dp_2gang' },
  { re: /switch_1|state_l1|state$/i, driver: 'switch_1gang', conf: 70, rule: 'z2m_dp_1gang' },
  { re: /energy|power|current|voltage|kwh|meter/i, driver: 'energy_meter_din', conf: 78, rule: 'z2m_dp_energy' },
  { re: /fan_speed|fan_mode/i, driver: 'fan_controller', conf: 80, rule: 'z2m_dp_fan' },
  { re: /water_consumed|flow_rate/i, driver: 'water_leak_sensor', conf: 75, rule: 'z2m_dp_water_meter' },
];

const HIGH_APPLY_MIN = 85;
/** Safety cap for --apply per CI run (dry-run still reports full HIGH set). */
const APPLY_MAX = Number(process.env.INFER_ENRICH_APPLY_MAX || 150);

function loadJsonSafe(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    // Buffer → JSON.parse avoids giant UTF-16 intermediate strings (Homey RAM doctrine)
    return JSON.parse(fs.readFileSync(filePath));
  } catch {
    return fallback;
  }
}

function driverExists(driverId) {
  if (!driverId || WIDE_CLAIM.has(driverId)) return false;
  return fs.existsSync(path.join(DRIVERS_DIR, driverId, 'driver.compose.json'));
}

function coupleKey(mfr, pid) {
  return `${normalize(mfr)}|${normalize(pid)}`;
}

function isTzeMfr(mfr) {
  return /^_tze/i.test(String(mfr || ''));
}

function isTs0601(pid) {
  return /^ts0601$/i.test(String(pid || ''));
}

function isPlausibleMfr(mfr) {
  const s = String(mfr || '').trim();
  if (!s || SYNTHETIC_RX.test(s)) return false;
  if (/\s/.test(s)) return false;
  if (s.length < 3 || s.length > 48) return false;
  if (/^_TZ/i.test(s)) return true;
  if (/^(HOBEIAN|eWeLink|LUMI|lumi\.|GLEDOPTO|Third Reality)$/i.test(s)) return true;
  // OEM-style compact ids only (no prose)
  return /^[A-Za-z0-9][A-Za-z0-9._-]{2,47}$/.test(s) && !/^(button|battery|switch|digital)/i.test(s);
}

function isTuyaLikeMfr(mfr) {
  // Canonical Tuya OEM ids: _TZ3000_abcdefgh / _TZE200_… / _TZ3002_…
  return /^_TZ[A-Z0-9]{3,5}_[A-Za-z0-9]{6,}$/i.test(String(mfr || '').trim());
}

function isPlausiblePid(pid) {
  const s = String(pid || '').trim();
  if (!s || normalize(s) === 'unknown') return false;
  if (/\s/.test(s)) return false;
  if (s.length < 2 || s.length > 40) return false;
  if (/^(button|battery|switch|state|digital)/i.test(s)) return false;
  if (/^0x[0-9a-f]+$/i.test(s)) return false;
  // Common Zigbee / Tuya model families
  if (/^(TS|ZG|TH|SNZB|CS-|SM-|WZ|TY|ZB)/i.test(s)) return true;
  return /^[A-Za-z0-9][A-Za-z0-9._+-]{1,39}$/.test(s);
}

// ─── Source loaders ───────────────────────────────────────────────────────────

function loadSources() {
  const sources = {
    loaded: [],
    missing: [],
    mfs: null,
    z2m: null,
    zha: null,
    deconz: null,
    pairs: [],
    gmailCrash: null,
    gmailFps: null,
    diagnostics: null,
    p101: null,
    p102: null,
    forum: null,
    composeIndex: null,
  };

  function take(label, filePath, assign) {
    const v = loadJsonSafe(filePath, null);
    if (v == null) {
      sources.missing.push(label);
      return null;
    }
    sources.loaded.push(label);
    assign(v);
    return v;
  }

  take('mfs_db', path.join(ROOT, 'data', 'mfs_db.json'), (v) => { sources.mfs = v; });
  take('z2m-data', path.join(ROOT, 'scripts', 'data', 'z2m-data.json'), (v) => { sources.z2m = v; });
  take('zha-data', path.join(ROOT, 'scripts', 'data', 'zha-data.json'), (v) => { sources.zha = v; });
  take('deconz-data', path.join(ROOT, 'scripts', 'data', 'deconz-data.json'), (v) => { sources.deconz = v; });
  take('all-mfr-pid-pairs', path.join(STATE_DIR, 'all-mfr-pid-pairs.json'), (v) => {
    sources.pairs = Array.isArray(v) ? v : (v && v.pairs) || [];
  });
  take('gmail-crash-patterns', path.join(STATE_DIR, 'gmail-crash-patterns.json'), (v) => { sources.gmailCrash = v; });
  take('gmail-unique-fps', path.join(STATE_DIR, 'gmail-unique-fps.json'), (v) => { sources.gmailFps = v; });
  take('diagnostics-report', path.join(STATE_DIR, 'diagnostics-report.json'), (v) => { sources.diagnostics = v; });
  take('p101-lot2', path.join(STATE_DIR, 'p101-sacred-lot2-report.json'), (v) => { sources.p101 = v; });
  take('p102-lot3', path.join(STATE_DIR, 'p102-sacred-lot3-propose.json'), (v) => { sources.p102 = v; });

  const forumCandidates = [
    path.join(STATE_DIR, 'forum', 'forum-state.json'),
    path.join(STATE_DIR, 'forum-full-analysis.json'),
    path.join(STATE_DIR, 'forum-integration-report.json'),
  ];
  for (const fp of forumCandidates) {
    if (take(path.basename(fp), fp, (v) => { sources.forum = sources.forum || v; })) break;
  }

  // Optional mega-crawl / crossref dumps
  for (const rel of [
    'mega-crawl/summary.json',
    'compose-mfsdb-guard.json',
    'gmail-fps-crossref-v2.json',
  ]) {
    take(rel, path.join(STATE_DIR, rel), () => {});
  }

  sources.composeIndex = indexComposeDrivers();
  sources.z2mDpByNorm = indexZ2mDp(sources.z2m);
  sources.loaded.push('driver.compose.json');
  return sources;
}

function indexComposeDrivers() {
  const byCouple = new Map(); // key → Set(driverId)
  const byMfr = new Map(); // norm mfr → Set(driverId)
  const siblingBySuffixPid = new Map(); // `${suffix}|${npid}` → Set(driverId)
  const drivers = [];
  if (!fs.existsSync(DRIVERS_DIR)) {
    return { byCouple, byMfr, siblingBySuffixPid, drivers };
  }

  for (const d of fs.readdirSync(DRIVERS_DIR)) {
    const f = path.join(DRIVERS_DIR, d, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    let j;
    try { j = JSON.parse(fs.readFileSync(f)); } catch { continue; }
    const mfrs = (j.zigbee && j.zigbee.manufacturerName) || [];
    const pids = (j.zigbee && j.zigbee.productId) || [];
    drivers.push({ id: d, mfrs, pids });
    const npids = pids.map((p) => normalize(p)).filter(Boolean);
    for (const m of mfrs) {
      if (!m || SYNTHETIC_RX.test(m)) continue;
      const nm = normalize(m);
      if (!byMfr.has(nm)) byMfr.set(nm, new Set());
      byMfr.get(nm).add(d);
      for (const p of pids) {
        const key = coupleKey(m, p);
        if (!byCouple.has(key)) byCouple.set(key, new Set());
        byCouple.get(key).add(d);
      }
      if (WIDE_CLAIM.has(d)) continue;
      const suffix = String(m).replace(/^_[A-Za-z0-9]+_/, '').toLowerCase();
      if (!suffix || suffix.length < 6) continue;
      for (const np of npids) {
        const sk = `${suffix}|${np}`;
        if (!siblingBySuffixPid.has(sk)) siblingBySuffixPid.set(sk, new Set());
        siblingBySuffixPid.get(sk).add(d);
      }
    }
  }
  return { byCouple, byMfr, siblingBySuffixPid, drivers };
}

function indexZ2mDp(z2m) {
  const byNorm = new Map();
  const dp = z2m && z2m.dp;
  if (!dp || typeof dp !== 'object') return byNorm;
  for (const [k, v] of Object.entries(dp)) {
    const names = ((v && v.dps) || []).map((x) => x.n || x.name || '').join(' ');
    byNorm.set(normalize(k), `${(v && v.model) || ''} ${names}`);
  }
  return byNorm;
}

// ─── Candidate harvest ────────────────────────────────────────────────────────

function addCandidate(map, mfr, pid, evidence) {
  if (!mfr || !pid) return;
  if (!isPlausibleMfr(mfr) || !isPlausiblePid(pid)) return;
  if (SYNTHETIC_RX.test(mfr)) return;
  const key = coupleKey(mfr, pid);
  let c = map.get(key);
  if (!c) {
    c = {
      key,
      mfr: String(mfr),
      pid: String(pid),
      evidence: [],
      currentDrivers: [],
      sacredDriver: null,
      mfsDriver: null,
    };
    map.set(key, c);
  }
  if (evidence && c.evidence.length < 8) c.evidence.push(evidence);
}

function harvestCandidates(sources) {
  const map = new Map();
  const mfs = sources.mfs || {};

  // 1) Sacred couples incomplete / generic
  for (const [key, val] of Object.entries(mfs.sacredCouples || {})) {
    if (!val || typeof val !== 'object') continue;
    const parts = key.split('|');
    const mfr = val.mfr || parts[0];
    const pid = val.pid || parts[1];
    if (!mfr || !pid) continue;
    const driver = val.driver || val.driverId || '';
    const incomplete = !driver || WIDE_CLAIM.has(driver) || driver === 'unknown';
    if (!incomplete) continue;
    addCandidate(map, mfr, pid, { source: 'sacredCouples', driver: driver || 'empty' });
    const c0 = map.get(coupleKey(mfr, pid));
    if (c0) c0.sacredDriver = driver || null;
  }

  // 2) mfs devices with weak/missing hint
  for (const [id, dev] of Object.entries(mfs.devices || {})) {
    if (!dev || typeof dev !== 'object') continue;
    const mfr = dev.manufacturerId || id;
    const hint = dev.driverHint || dev.driverId || '';
    const conf = typeof dev.confidence === 'number' ? dev.confidence : 0;
    const weak = !hint || WIDE_CLAIM.has(hint) || hint === 'unknown' || conf < 0.6;
    if (!weak) continue;
    for (const pid of dev.modelIds || []) {
      addCandidate(map, mfr, pid, { source: 'mfs.devices', driverHint: hint || 'empty', confidence: conf });
      const c = map.get(coupleKey(mfr, pid));
      if (c && hint) c.mfsDriver = hint;
    }
  }

  // 3) Top-level mfs curated entries claiming generic / missing compose claim
  for (const [mfr, entry] of Object.entries(mfs)) {
    if (!entry || typeof entry !== 'object' || !entry.driverId) continue;
    if (mfr.startsWith('_') === false && !/^_t/i.test(mfr)) continue;
    if (SYNTHETIC_RX.test(mfr)) continue;
    const pids = entry.modelIds || (entry.pid ? [entry.pid] : []);
    for (const pid of pids) {
      const key = coupleKey(mfr, pid);
      const claimers = [...(sources.composeIndex.byCouple.get(key) || [])];
      const typed = claimers.filter((d) => !WIDE_CLAIM.has(d));
      if (typed.length === 0 || WIDE_CLAIM.has(entry.driverId)) {
        addCandidate(map, mfr, pid, {
          source: 'mfs.top',
          curated: entry.driverId,
          compose: claimers,
        });
        const c = map.get(key);
        if (c) c.mfsDriver = entry.driverId;
      }
    }
  }

  // 4) Local pair dumps — prefer incomplete / user-sourced pairs (bounded)
  const pairSlice = sources.pairs.slice(0, 20000);
  for (const p of pairSlice) {
    if (!p || !p.mfr || !p.pid) continue;
    const srcs = p.sources || [];
    const userish = srcs.some((s) => /gmail|johan|forum|user/i.test(String(s)));
    if (!userish && map.size > 8000) continue;
    const key = coupleKey(p.mfr, p.pid);
    const claimers = sources.composeIndex.byCouple.get(key);
    let typed = false;
    if (claimers) {
      for (const d of claimers) {
        if (!WIDE_CLAIM.has(d)) { typed = true; break; }
      }
    }
    if (!typed) {
      addCandidate(map, p.mfr, p.pid, {
        source: 'all-mfr-pid-pairs',
        sources: srcs.slice(0, 6),
      });
    }
  }

  // 5) Gmail unique FPs (often mfr-only) — pair with known pids from mfs/z2m
  const gmailList = (sources.gmailFps && (sources.gmailFps.fps || sources.gmailFps.unique)) || [];
  for (const item of gmailList) {
    const mfr = typeof item === 'string' ? item : (item && (item.mfr || item.manufacturerName));
    if (!mfr) continue;
    const nm = normalize(mfr);
    const fromMfs = (mfs.devices && mfs.devices[nm]) || mfs[nm] || mfs[mfr];
    const pids = (fromMfs && (fromMfs.modelIds || (fromMfs.pid ? [fromMfs.pid] : []))) || [];
    if (!pids.length) {
      continue; // mfr-only Gmail hits need a pid from mfs/z2m — skip inventing
    }
    for (const pid of pids) {
      addCandidate(map, mfr, pid, { source: 'gmail-unique-fps' });
    }
  }

  // 6) Z2M fps present locally but not typed in compose
  if (sources.z2m && Array.isArray(sources.z2m.fps)) {
    for (const row of sources.z2m.fps) {
      const pid = row.m || row.model || row.pid;
      const mfrs = row.f || row.manufacturers || row.mfrs || [];
      if (!pid || !Array.isArray(mfrs)) continue;
      for (const mfr of mfrs) {
        const key = coupleKey(mfr, pid);
        const claimers = [...(sources.composeIndex.byCouple.get(key) || [])];
        if (claimers.filter((d) => !WIDE_CLAIM.has(d)).length === 0) {
          addCandidate(map, mfr, pid, { source: 'z2m-data.fps' });
        }
      }
    }
  }

  // Attach current compose drivers
  for (const c of map.values()) {
    const claimers = [...(sources.composeIndex.byCouple.get(c.key) || [])];
    if (!claimers.length) {
      const byM = sources.composeIndex.byMfr.get(normalize(c.mfr));
      c.currentDrivers = byM ? [...byM] : [];
    } else {
      c.currentDrivers = claimers;
    }
  }

  return map;
}

// ─── Heuristic scoring ────────────────────────────────────────────────────────

function z2mDpBlob(sources, mfr) {
  if (!sources.z2mDpByNorm) return '';
  return sources.z2mDpByNorm.get(normalize(mfr)) || '';
}

function scoreCandidate(c, sources) {
  const hints = [];
  const pid = c.pid;
  const mfr = c.mfr;

  if (!pid || normalize(pid) === 'unknown') {
    return {
      status: 'skipped_ambiguous',
      confidence: 0,
      proposedDriver: null,
      reasons: ['missing_pid'],
      hints,
    };
  }

  // Curated mfs driver wins when typed + exists
  const curated = c.mfsDriver && driverExists(c.mfsDriver) && !WIDE_CLAIM.has(c.mfsDriver)
    ? c.mfsDriver
    : null;
  if (curated) {
    hints.push({ rule: 'mfs_curated', driver: curated, conf: 95 });
  }

  // Deterministic PID class (not for bare TS0601 MCU without Z2M)
  if (!(isTs0601(pid) && isTzeMfr(mfr))) {
    for (const rule of PID_CLASS_RULES) {
      if (rule.re.test(pid) && driverExists(rule.driver)) {
        hints.push({ rule: rule.rule, driver: rule.driver, conf: rule.conf });
      }
    }
  } else {
    hints.push({ rule: 'ts0601_tze_needs_z2m', driver: null, conf: 0 });
  }

  // Z2M DP class hints (especially TS0601)
  const blob = z2mDpBlob(sources, mfr);
  if (blob) {
    for (const rule of Z2M_DP_HINTS) {
      if (rule.re.test(blob) && driverExists(rule.driver)) {
        hints.push({ rule: rule.rule, driver: rule.driver, conf: rule.conf, evidence: 'z2m.dp' });
      }
    }
  } else if (isTs0601(pid) && isTzeMfr(mfr) && !curated) {
    // No Z2M and no curated mfs → refuse to invent a class
    return {
      status: 'skipped_ambiguous',
      confidence: 20,
      proposedDriver: null,
      reasons: ['ts0601_tze_without_z2m_or_mfs_hint'],
      hints,
    };
  }

  // Sibling mfr family (pre-indexed): same suffix + pid already typed elsewhere
  const suffix = String(mfr).replace(/^_[A-Za-z0-9]+_/, '').toLowerCase();
  if (suffix && suffix.length >= 6) {
    const sibs = sources.composeIndex.siblingBySuffixPid.get(`${suffix}|${normalize(pid)}`);
    if (sibs) {
      for (const d of sibs) {
        hints.push({ rule: 'sibling_mfr_suffix', driver: d, conf: 80 });
      }
    }
  }

  // Collapse hints by driver (max conf)
  const byDriver = new Map();
  for (const h of hints) {
    if (!h.driver) continue;
    const prev = byDriver.get(h.driver);
    if (!prev || h.conf > prev.conf) byDriver.set(h.driver, h);
  }
  const ranked = [...byDriver.values()].sort((a, b) => b.conf - a.conf);

  if (!ranked.length) {
    return {
      status: 'skipped_ambiguous',
      confidence: 0,
      proposedDriver: null,
      reasons: ['no_viable_hint'],
      hints,
    };
  }

  const best = ranked[0];
  const second = ranked[1];
  if (second && second.conf >= best.conf - 5 && second.driver !== best.driver) {
    return {
      status: 'skipped_ambiguous',
      confidence: best.conf,
      proposedDriver: best.driver,
      reasons: ['ambiguous_competing_drivers', best.driver, second.driver],
      hints: ranked,
    };
  }

  // Already correctly placed?
  const typedCurrent = (c.currentDrivers || []).filter((d) => !WIDE_CLAIM.has(d));
  if (typedCurrent.includes(best.driver)) {
    const needsVariants = checkNeedsCaseVariants(best.driver, mfr);
    if (!needsVariants) {
      return {
        status: 'skipped_ambiguous',
        confidence: best.conf,
        proposedDriver: best.driver,
        reasons: ['already_on_target'],
        hints: ranked,
      };
    }
  }

  // Never propose generic_tuya
  if (WIDE_CLAIM.has(best.driver)) {
    return {
      status: 'skipped_ambiguous',
      confidence: best.conf,
      proposedDriver: null,
      reasons: ['refused_wide_claim'],
      hints: ranked,
    };
  }

  const fromCurated = best.rule === 'mfs_curated';
  const fromPidClass = String(best.rule || '').startsWith('pid_');
  const fromZ2m = String(best.rule || '').startsWith('z2m_');
  const incompletePlacement = (c.currentDrivers || []).every((d) => WIDE_CLAIM.has(d))
    || !(c.currentDrivers || []).length
    || WIDE_CLAIM.has(c.sacredDriver || '');

  // PID-only HIGH requires Tuya-like mfr + incomplete/wide placement (anti-noise)
  if (fromPidClass && !isTuyaLikeMfr(mfr)) {
    return {
      status: 'skipped_ambiguous',
      confidence: best.conf,
      proposedDriver: best.driver,
      reasons: ['pid_rule_non_tuya_mfr'],
      hints: ranked,
    };
  }
  if (fromPidClass && !incompletePlacement) {
    return {
      status: 'review',
      confidence: best.conf,
      proposedDriver: best.driver,
      reasons: [best.rule, 'already_typed_elsewhere'],
      hints: ranked,
    };
  }

  if (best.conf >= HIGH_APPLY_MIN && (fromCurated || fromPidClass || fromZ2m) && incompletePlacement) {
    return {
      status: 'high',
      confidence: best.conf,
      proposedDriver: best.driver,
      reasons: [best.rule],
      hints: ranked,
    };
  }

  // Curated but already claimed by a different typed driver → review (avoid mass rehomes)
  if (best.conf >= HIGH_APPLY_MIN && fromCurated && typedCurrent.length && !typedCurrent.includes(best.driver)) {
    return {
      status: 'review',
      confidence: best.conf,
      proposedDriver: best.driver,
      reasons: [best.rule, 'curated_conflicts_typed_compose'],
      hints: ranked,
    };
  }

  if (best.conf >= 70) {
    return {
      status: 'review',
      confidence: best.conf,
      proposedDriver: best.driver,
      reasons: [best.rule, 'below_apply_threshold_or_placement'],
      hints: ranked,
    };
  }

  return {
    status: 'skipped_ambiguous',
    confidence: best.conf,
    proposedDriver: best.driver,
    reasons: [best.rule || 'low_confidence'],
    hints: ranked,
  };
}

function checkNeedsCaseVariants(driverId, mfr) {
  try {
    const f = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    const j = JSON.parse(fs.readFileSync(f));
    const list = (j.zigbee && j.zigbee.manufacturerName) || [];
    const needed = pairingCaseVariants(mfr);
    return needed.some((v) => !list.includes(v));
  } catch {
    return false;
  }
}

// ─── Apply (HIGH only) ────────────────────────────────────────────────────────

function applyRehome(mfr, pid, targetDriver) {
  if (isForbiddenPlacement(mfr, targetDriver)) {
    throw new Error(`registry forbids ${mfr} on ${targetDriver}`);
  }
  const result = {
    target: targetDriver,
    addedVariants: 0,
    pidAdded: false,
    removedFromWide: [],
  };

  const targetPath = path.join(DRIVERS_DIR, targetDriver, 'driver.compose.json');
  const j = JSON.parse(fs.readFileSync(targetPath));
  j.zigbee = j.zigbee || {};
  j.zigbee.manufacturerName = Array.isArray(j.zigbee.manufacturerName) ? j.zigbee.manufacturerName : [];
  j.zigbee.productId = Array.isArray(j.zigbee.productId) ? j.zigbee.productId : [];

  const merged = mergeManufacturerCaseVariants(j.zigbee.manufacturerName, mfr);
  j.zigbee.manufacturerName = merged.list;
  result.addedVariants = merged.added;

  if (pid && !includesCI(j.zigbee.productId, pid)) {
    j.zigbee.productId.push(pid);
    result.pidAdded = true;
  }

  fs.writeFileSync(targetPath, `${JSON.stringify(j, null, 2)}\n`);

  // Strip from wide-claim drivers only (preserve legitimate multi-driver mfr sharing)
  const want = new Set(pairingCaseVariants(mfr).map((v) => normalize(v)));
  want.add(normalize(mfr));
  for (const wide of WIDE_CLAIM) {
    const wp = path.join(DRIVERS_DIR, wide, 'driver.compose.json');
    if (!fs.existsSync(wp)) continue;
    const wj = JSON.parse(fs.readFileSync(wp));
    if (!wj.zigbee || !Array.isArray(wj.zigbee.manufacturerName)) continue;
    const before = wj.zigbee.manufacturerName.length;
    wj.zigbee.manufacturerName = wj.zigbee.manufacturerName.filter(
      (m) => !want.has(normalize(m)),
    );
    if (wj.zigbee.manufacturerName.length !== before) {
      fs.writeFileSync(wp, `${JSON.stringify(wj, null, 2)}\n`);
      result.removedFromWide.push(`${wide}:${before - wj.zigbee.manufacturerName.length}`);
    }
  }

  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const mode = APPLY && !args.includes('--dry-run') ? 'APPLY' : 'DRY-RUN';
  if (!AS_JSON) {
    console.log('═══════════════════════════════════════════════');
    console.log('  Infer-enrich from incomplete sources');
    console.log(`  root: ${ROOT}`);
    console.log(`  mode: ${mode}`);
    console.log('═══════════════════════════════════════════════');
  }

  const sources = loadSources();
  if (!AS_JSON) {
    console.log(`Sources loaded: ${sources.loaded.length} | missing: ${sources.missing.length}`);
    if (sources.missing.length) {
      console.log(`  missing: ${sources.missing.slice(0, 12).join(', ')}`);
    }
  }

  const candidates = harvestCandidates(sources);
  const applied = [];
  const inferred_needs_review = [];
  const skipped_ambiguous = [];

  for (const c of candidates.values()) {
    const scored = scoreCandidate(c, sources);
    const row = {
      mfr: c.mfr,
      pid: c.pid,
      key: c.key,
      confidence: scored.confidence,
      proposedDriver: scored.proposedDriver,
      reasons: scored.reasons,
      hints: (scored.hints || []).slice(0, 6),
      evidence: c.evidence.slice(0, 8),
      currentDrivers: c.currentDrivers,
      sacredDriver: c.sacredDriver,
      mfsDriver: c.mfsDriver,
    };

    if (scored.status === 'high') {
      if (scored.proposedDriver && isForbiddenPlacement(c.mfr, scored.proposedDriver)) {
        skipped_ambiguous.push({
          ...row,
          reasons: [...(row.reasons || []), 'registry_forbidden'],
        });
        continue;
      }
      const doApply = APPLY && !args.includes('--dry-run') && scored.proposedDriver;
      if (doApply) {
        if (applied.filter((a) => a.applied).length >= APPLY_MAX) {
          inferred_needs_review.push({
            ...row,
            reasons: [...(row.reasons || []), 'apply_cap_deferred'],
          });
        } else {
          try {
            const applyResult = applyRehome(c.mfr, c.pid, scored.proposedDriver);
            applied.push({ ...row, apply: applyResult, applied: true });
          } catch (e) {
            inferred_needs_review.push({ ...row, applyError: e.message });
          }
        }
      } else {
        // Dry-run: high-confidence proposals land in applied[] as would-apply
        applied.push({ ...row, applied: false, wouldApply: true });
      }
    } else if (scored.status === 'review') {
      inferred_needs_review.push(row);
    } else {
      skipped_ambiguous.push(row);
    }
  }

  // Cap huge skip lists in report but keep counts
  const SKIP_CAP = 500;
  const REVIEW_CAP = 500;
  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      mode,
      apply: APPLY && !args.includes('--dry-run'),
      root: ROOT,
      sourcesLoaded: sources.loaded,
      sourcesMissing: sources.missing,
      candidatesTotal: candidates.size,
      counts: {
        applied: applied.length,
        inferred_needs_review: inferred_needs_review.length,
        skipped_ambiguous: skipped_ambiguous.length,
      },
      sampleRules: [
        'TS0001→switch_1gang',
        'TS0044→button_wireless_4',
        'TS0203→contact_sensor',
        'TS0601+_TZE*→requires Z2M DP / mfs curated hint',
        'never→generic_tuya',
        'apply≥85 + case variants via TuyaNormalizer',
      ],
    },
    applied,
    inferred_needs_review: inferred_needs_review.slice(0, REVIEW_CAP),
    skipped_ambiguous: skipped_ambiguous.slice(0, SKIP_CAP),
  };

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  if (AS_JSON) {
    process.stdout.write(JSON.stringify({
      meta: report.meta,
      appliedSample: applied.slice(0, 20),
      reviewSample: inferred_needs_review.slice(0, 20),
    }, null, 2));
    process.stdout.write('\n');
  } else {
    console.log(`Candidates: ${candidates.size}`);
    console.log(`  applied / would-apply (HIGH): ${applied.length}`);
    console.log(`  inferred_needs_review:        ${inferred_needs_review.length}`);
    console.log(`  skipped_ambiguous:            ${skipped_ambiguous.length}`);
    for (const a of applied.slice(0, 12)) {
      console.log(
        `  · ${a.wouldApply ? 'WOULD' : 'DID'} ${a.mfr} + ${a.pid} → ${a.proposedDriver} (${a.confidence}) [${(a.reasons || []).join(',')}]`,
      );
    }
    if (inferred_needs_review.length) {
      console.log('Review samples:');
      for (const r of inferred_needs_review.slice(0, 8)) {
        console.log(`  · ${r.mfr} + ${r.pid} → ${r.proposedDriver || '?'} (${r.confidence})`);
      }
    }
    console.log(`Report: ${REPORT_PATH}`);
    console.log('═══════════════════════════════════════════════');
  }

  // Soft exit — CI steps use continue-on-error; never hard-fail on sparse sources
  process.exit(0);
}

main();
