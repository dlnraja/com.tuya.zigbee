'use strict';

/**
 * market-driver-infer.js (P2231 / P2232)
 * Infer Homey driver from Z2M/Blakadder/interview/device-truth + soft adaptive heuristic.
 * productId_default alone is UNSAFE (TS0044 scene vs button, TS0202 valve vs PIR).
 * Heuristic / pid-suggest = soft review only (never applySafe).
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');

/** @type {Map<string, object>|null} */
let _z2mIndex = null;
/** @type {Map<string, object>|null} */
let _truthLocks = null;
/** @type {Map<string, object>|null} */
let _interviewIndex = null;

function loadZ2mIndex() {
  if (_z2mIndex) return _z2mIndex;
  _z2mIndex = new Map();
  const fp = path.join(ROOT, 'scripts', 'sync', 'data', 'z2m.json');
  if (!fs.existsSync(fp)) return _z2mIndex;
  try {
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    for (const row of data.fingerprints || []) {
      if (!row.mfr || !row.productId) continue;
      const key = `${String(row.mfr).toLowerCase()}|${String(row.productId).toUpperCase()}`;
      if (!_z2mIndex.has(key)) _z2mIndex.set(key, row);
    }
  } catch { /* ignore */ }
  return _z2mIndex;
}

function coupleKey(mfr, pid) {
  return `${String(mfr).toLowerCase()}|${String(pid).toUpperCase()}`;
}

function loadDeviceTruthLocks() {
  if (_truthLocks) return _truthLocks;
  _truthLocks = new Map();
  const fp = path.join(ROOT, 'docs', 'knowledge', 'device-truth.json');
  if (!fs.existsSync(fp)) return _truthLocks;
  try {
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    for (const [driverId, d] of Object.entries(data.drivers || {})) {
      for (const lock of d.locks || []) {
        const mfrs = Array.isArray(lock.mfr) ? lock.mfr : [];
        const pids = Array.isArray(lock.productId) ? lock.productId : [];
        for (const m of mfrs) {
          if (String(m).includes('*')) continue;
          for (const p of pids) {
            _truthLocks.set(coupleKey(m, p), {
              driver: driverId,
              caseId: lock.caseId,
              forbidden: lock.forbidden || [],
            });
          }
        }
      }
    }
  } catch { /* ignore */ }
  return _truthLocks;
}

function loadInterviewIndex() {
  if (_interviewIndex) return _interviewIndex;
  _interviewIndex = new Map();
  const fp = path.join(ROOT, 'docs', 'data', 'DEVICE_INTERVIEWS.json');
  if (!fs.existsSync(fp)) return _interviewIndex;
  try {
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    for (const [, rows] of Object.entries(data.interviews || {})) {
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        const mfr = row.manufacturerName || row.mfr;
        const pid = row.productId || row.pid;
        if (!mfr || !pid || String(mfr).includes('*')) continue;
        const key = coupleKey(mfr, pid);
        const prev = _interviewIndex.get(key);
        // Prefer rows that name an explicit driver + fixed/supported status
        if (!prev || (row.driver && !prev.driver) || (row.status === 'fixed' && prev.status !== 'fixed')) {
          _interviewIndex.set(key, {
            driver: row.driver || null,
            status: row.status || null,
            id: row.id,
          });
        }
      }
    }
  } catch { /* ignore */ }
  return _interviewIndex;
}

/** Strong pid families — Z2M text must not fight these without clear override words */
function pidFamily(pid) {
  const p = String(pid || '').toUpperCase();
  if (/^TS05/.test(p)) return 'light';
  if (/^TS000[1-6]$|^TS001[1-4]$|^TS000F$/.test(p)) return 'switch';
  if (/^TS004[1-4F]$/.test(p)) return 'button';
  if (/^TS011F$|^TS0121$/.test(p)) return 'plug';
  if (/^TS0207$/.test(p)) return 'water_or_repeater';
  if (/^TS0201$/.test(p)) return 'climate_or_sensor';
  if (/^TS0202$/.test(p)) return 'motion_or_valve';
  if (/^TS0601$/.test(p)) return 'tuya_dp';
  return 'other';
}

/**
 * Map free-text Z2M description/model to a Homey driver id, or null if ambiguous.
 */
function inferFromZ2mText(desc, model, productId) {
  const hay = `${desc || ''} ${model || ''}`.toLowerCase();
  const pid = String(productId || '').toUpperCase();
  const family = pidFamily(pid);

  // High-signal phrases first
  if (/water\s*leak|leakage|leak\s*sensor|flood\s*sensor|flood\s*detector/.test(hay)) {
    return 'water_leak_sensor';
  }
  if (/water\s*valve|irrigation|smart\s*valve|garden\s*valve/.test(hay)) {
    return 'smart_irrigation_valve';
  }
  if (/smoke/.test(hay)) return 'smoke_sensor';
  if (/\bgas\s*sensor\b|\bco\b|carbon\s*monoxide/.test(hay)) return 'gas_sensor';
  if (/(door|window)\s*(sensor|contact)|contact\s*sensor|magnetic/.test(hay) && !/curtain/.test(hay)) {
    return 'contact_sensor';
  }
  if (/mmwave|24\s*ghz|human\s*presence|occupancy\s*sensor|presence\s*sensor/.test(hay)) {
    return 'presence_sensor_radar';
  }
  if (/\bpir\b|motion\s*sensor|occupancy/.test(hay) && !/valve/.test(hay)) {
    return 'motion_sensor';
  }
  if (/soil|moisture\s*sensor/.test(hay)) return 'soil_sensor';
  if (/\btrv\b|radiator\s*valve|thermostatic\s*radiator/.test(hay)) {
    return 'thermostatic_radiator_valve';
  }
  if (/wall\s*thermostat|room\s*thermostat|thermostat\s*with\s*humidity/.test(hay)) {
    return 'wall_thermostat';
  }
  if (/curtain|blind|shutter|roller\s*shade|roller\s*blind/.test(hay)) return 'curtain_motor';
  if (/dimmer/.test(hay) && /wall|module/.test(hay)) return 'dimmer_wall_1gang';

  // Lights — including LED controller / floodlight (NOT flood sensor)
  if (/floodlight|led\s*controller|filament|bulb|lamp|gu10|e27|e14|a60|rgb(w)?\b|cct\b|tunable/.test(hay)
    || (family === 'light' && /light|led|color/.test(hay))) {
    if (/rgbw|rgb\+?cw|rgb\s*cct/.test(hay)) return 'bulb_rgbw';
    if (/\brgb\b/.test(hay)) return 'bulb_rgb';
    if (/cct|tunable|white\s*ambiance|cw\s*\/\s*ww|single\s*color/.test(hay)) return 'bulb_dimmable';
    if (family === 'light' || /filament|bulb|lamp|floodlight|led/.test(hay)) return 'bulb_dimmable';
  }

  // Gang switches BEFORE plug/socket (module with socket ≠ energy plug alone)
  if (/\b4\s*gang|\b4-gang|quad\s*gang/.test(hay)) return 'switch_4gang';
  if (/\b3\s*gang|\b3-gang|triple\s*gang/.test(hay)) return 'switch_3gang';
  if (/\b2\s*gang|\b2-gang|double\s*gang|dual\s*gang/.test(hay)) return 'switch_2gang';
  if (/\b1\s*gang|\b1-gang|single\s*gang/.test(hay)) return 'switch_1gang';

  if (/\bplug\b|\bsocket\b|\boutlet\b/.test(hay) && !/gang/.test(hay)) {
    return 'plug_energy_monitor';
  }
  if (/sos|emergency|panic/.test(hay)) return 'button_emergency_sos';
  if (/scene\s*switch|wireless\s*switch|remote\s*control|4[\s-]?button/.test(hay)) {
    if (/TS0044/i.test(pid) || /4[\s-]?button|4[\s-]?gang/.test(hay)) return 'button_wireless_4';
    if (/TS0043/i.test(pid) || /3[\s-]?button/.test(hay)) return 'button_wireless_3';
    if (/TS0042/i.test(pid) || /2[\s-]?button/.test(hay)) return 'button_wireless_2';
    if (/TS0041/i.test(pid) || /1[\s-]?button/.test(hay)) return 'button_wireless_1';
  }

  return null;
}

/**
 * Reject Z2M inferences that fight strong pid families without override words.
 */
function familyAllows(pid, driver, hay) {
  const fam = pidFamily(pid);
  // Light pid with contact-only Z2M label is suspicious OEM reuse — keep for human review
  if (fam === 'light' && /water_leak|irrigation|contact_sensor|motion_sensor|curtain/.test(driver)) {
    if (/floodlight|led\s*controller|bulb|lamp|rgb/.test(hay)) return false;
    if (/water\s*leak|leakage/.test(hay) && !/floodlight/.test(hay)) return true;
    return false; // review: pid says light, text says sensor
  }
  if (fam === 'switch' && /bulb_|curtain|water_leak|trv|thermostatic/.test(driver)) {
    if (/curtain|blind/.test(hay) && /module/.test(hay)) return true; // dual curtain module
    if (/1\s*gang|2\s*gang|3\s*gang|4\s*gang/.test(hay)) return /switch_/.test(driver);
    return false;
  }
  return true;
}

function lookupZ2m(mfr, pid) {
  const key = `${String(mfr).toLowerCase()}|${String(pid).toUpperCase()}`;
  return loadZ2mIndex().get(key) || null;
}

function driverExists(id) {
  return id && fs.existsSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'));
}

/** @type {object|null} */
let _mfsAsDb = null;

function loadMfsAsDb() {
  if (_mfsAsDb) return _mfsAsDb;
  const mfsPath = path.join(ROOT, 'data', 'mfs_db.json');
  if (!fs.existsSync(mfsPath)) {
    _mfsAsDb = {};
    return _mfsAsDb;
  }
  try {
    const mfs = JSON.parse(fs.readFileSync(mfsPath));
    const devices = mfs.devices && typeof mfs.devices === 'object' ? mfs.devices : mfs;
    const asDb = {};
    for (const [k, v] of Object.entries(devices)) {
      if (!v || typeof v !== 'object') continue;
      if (k === '_meta' || k === 'sources' || k === 'stats' || k === 'driverMapping' || k === 'diff') continue;
      asDb[k] = v;
    }
    _mfsAsDb = asDb;
  } catch {
    _mfsAsDb = {};
  }
  return _mfsAsDb;
}

/**
 * Soft adaptive heuristic (runtime fingerprint-matcher + mfs_db pid tally).
 * NEVER applySafe — review / NEED_REVIEW only.
 */
function softHeuristicHint(mfr, pid, isForbiddenDriver) {
  // Respect TUYA_FP_HEURISTIC=0 kill-switch (same as DeviceFingerprintDB runtime)
  if (process.env.TUYA_FP_HEURISTIC === '0') {
    return null;
  }
  try {
    const { suggestDriverFromPid, matchFingerprint } = require('../../lib/utils/fingerprint-matcher');
    const asDb = loadMfsAsDb();
    if (!Object.keys(asDb).length) return null;
    const matched = matchFingerprint(mfr, pid, asDb, { threshold: 0.75 });
    if (matched?.entry) {
      const hint = matched.entry.driverHint || matched.entry.driverId || matched.entry.driver;
      if (hint && driverExists(hint) && !isForbiddenDriver(mfr, pid, hint)) {
        // Only soft if pid coherent or match is prefix/fuzzy (not claiming exact lock)
        if (matched.matchType !== 'exact' && matched.matchType !== 'normalized') {
          return {
            driver: hint,
            tier: 'heuristic_adaptive',
            reason: `fingerprint-matcher:${matched.matchType}@${matched.score}`,
            applySafe: false,
          };
        }
      }
    }

    const sug = suggestDriverFromPid(pid, asDb);
    if (sug?.driverHint && driverExists(sug.driverHint) && !isForbiddenDriver(mfr, pid, sug.driverHint)) {
      // Require plurality (≥2 supporting mfrs) to even soft-hint
      if (sug.count >= 2) {
        return {
          driver: sug.driverHint,
          tier: 'heuristic_pid',
          reason: `suggestDriverFromPid count=${sug.count}`,
          applySafe: false,
        };
      }
    }
  } catch {
    /* heuristic optional */
  }
  return null;
}

/**
 * @returns {{ driver: string|null, tier: string, reason: string, z2m: object|null, applySafe: boolean }}
 */
function resolveMarketDriver(mfr, pid, opts = {}) {
  const { lookup, isForbiddenDriver } = require('../../lib/pairing/UserMisattributionRegistry');
  const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');

  const reg = lookup(mfr, pid);
  if (reg?.canonicalDriver) {
    return {
      driver: reg.canonicalDriver,
      tier: 'registry',
      reason: `misattribution:${reg.id}`,
      z2m: lookupZ2m(mfr, pid),
      applySafe: true,
    };
  }

  const truth = loadDeviceTruthLocks().get(coupleKey(mfr, pid));
  if (truth?.driver && driverExists(truth.driver) && !isForbiddenDriver(mfr, pid, truth.driver)) {
    return {
      driver: truth.driver,
      tier: 'device_truth',
      reason: `lock:${truth.caseId || truth.driver}`,
      z2m: lookupZ2m(mfr, pid),
      applySafe: true,
    };
  }

  const hit = DeviceFingerprintDB.lookup(mfr, pid);
  if (hit?.driver && (hit.matchType === 'exact' || hit.matchType === 'exact_ci')) {
    if (isForbiddenDriver(mfr, pid, hit.driver)) {
      return { driver: null, tier: 'blocked', reason: 'forbidden-driver', z2m: null, applySafe: false };
    }
    return {
      driver: hit.driver,
      tier: 'exact',
      reason: hit.key || 'exact',
      z2m: lookupZ2m(mfr, pid),
      applySafe: true,
    };
  }

  const interview = loadInterviewIndex().get(coupleKey(mfr, pid));
  if (interview?.driver && driverExists(interview.driver)
    && !isForbiddenDriver(mfr, pid, interview.driver)
    && /^(fixed|supported|locked)$/i.test(String(interview.status || 'supported'))) {
    return {
      driver: interview.driver,
      tier: 'interview',
      reason: `interview:${interview.id || 'row'}`,
      z2m: lookupZ2m(mfr, pid),
      applySafe: true,
    };
  }

  const z2m = lookupZ2m(mfr, pid);
  if (z2m) {
    const hay = `${z2m.description || ''} ${z2m.model || ''}`.toLowerCase();
    const inferred = inferFromZ2mText(z2m.description, z2m.model, z2m.productId || pid);
    if (inferred && !isForbiddenDriver(mfr, pid, inferred) && familyAllows(pid, inferred, hay)) {
      if (driverExists(inferred)) {
        return {
          driver: inferred,
          tier: 'z2m_desc',
          reason: z2m.description || z2m.model || 'z2m',
          z2m,
          applySafe: true,
        };
      }
    }
  }

  if (hit?.driver && hit.matchType === 'productId_default') {
    return {
      driver: hit.driver,
      tier: 'pid_default',
      reason: 'productId_default — review before compose lock',
      z2m,
      applySafe: false,
    };
  }

  // Soft adaptive / dynamic heuristic (same engine as Homey runtime when TUYA_FP_HEURISTIC≠0)
  const soft = softHeuristicHint(mfr, pid, isForbiddenDriver);
  if (soft) {
    return { ...soft, z2m };
  }

  // Interview without explicit driver still surfaces status for NEED_REVIEW
  if (interview && !interview.driver) {
    return {
      driver: opts.fallback || null,
      tier: 'interview_soft',
      reason: `interview:${interview.id || 'row'}:${interview.status || 'unknown'}`,
      z2m,
      applySafe: false,
    };
  }

  return {
    driver: opts.fallback || null,
    tier: 'none',
    reason: 'no-route',
    z2m,
    applySafe: false,
  };
}

module.exports = {
  loadZ2mIndex,
  lookupZ2m,
  inferFromZ2mText,
  resolveMarketDriver,
  driverExists,
  pidFamily,
  familyAllows,
  softHeuristicHint,
  loadDeviceTruthLocks,
  loadInterviewIndex,
};
