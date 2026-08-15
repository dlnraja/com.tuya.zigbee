'use strict';

/**
 * AlarmPolarityManager — IAS / SOS / water / contact / motion polarity (MASTER_ONLY smart-learn).
 *
 * Homey UI: true = alarm active (door OPEN / leak / SOS pressed / motion).
 * Some OEM firmwares flip IAS alarm1/alarm2 (or Tuya DP bool) → idle looks like alarm.
 *
 * Resolution order when alarm_polarity = auto:
 *   1) smart-learned store (with confidence)
 *   2) curated INVERTED / NORMAL lists (Sacred Couple aware)
 *   3) default normal
 *   then XOR with legacy invert_* / reverse_alarm checkboxes
 *
 * Explicit alarm_polarity = normal | inverted always wins (manual reverse setting).
 *
 * Smart learning (auto only) studies raw samples + dwell times per profile:
 *   contact / water — mostly idle=false; raw stuck true → inverted
 *   sos — sticky alarm1=1 at idle OR press as alarm1=0 → inverted;
 *         short true pulses + heavy clears → normal
 *   Lists act as Bayesian prior (listed invert needs less evidence; listed normal resists flip)
 */

const { includesCI, normalize: normalizeCI } = require('../utils/CaseInsensitiveMatcher');

/** Profiles: expected idle (logical Homey value) + timing for smart learn. */
const PROFILES = {
  contact: {
    capability: 'alarm_contact',
    idleExpected: false,
    learnWindowMs: 30 * 60 * 1000,
    minLearnMs: 12 * 60 * 1000,
    minSamples: 8,
    idleTrueRatio: 0.72,
    idleFalseRatio: 0.28,
    stickyTrueMs: 8 * 60 * 1000,
    stickyFalseMs: 8 * 60 * 1000,
    settingKeys: ['alarm_polarity', 'invert_contact', 'reverse_alarm'],
  },
  water: {
    capability: 'alarm_water',
    idleExpected: false,
    learnWindowMs: 45 * 60 * 1000,
    minLearnMs: 15 * 60 * 1000,
    minSamples: 6,
    idleTrueRatio: 0.72,
    idleFalseRatio: 0.28,
    stickyTrueMs: 10 * 60 * 1000,
    stickyFalseMs: 10 * 60 * 1000,
    settingKeys: ['alarm_polarity', 'invert_alarm'],
  },
  sos: {
    capability: 'alarm_generic',
    idleExpected: false,
    learnWindowMs: 24 * 60 * 60 * 1000,
    minLearnMs: 20 * 60 * 1000,
    minSamples: 4,
    clearHeavyRatio: 0.85,
    /** Press pulses are usually < 3s; sticky idle alarm implies inverted OEM. */
    pulseMaxMs: 3500,
    stickyTrueMs: 15 * 60 * 1000,
    settingKeys: ['alarm_polarity', 'invert_sos', 'invert_alarm'],
  },
  motion: {
    capability: 'alarm_motion',
    idleExpected: false,
    learnWindowMs: 60 * 60 * 1000,
    minLearnMs: 20 * 60 * 1000,
    minSamples: 10,
    idleTrueRatio: 0.65,
    idleFalseRatio: 0.30,
    stickyTrueMs: 25 * 60 * 1000,
    settingKeys: ['alarm_polarity', 'invert_presence'],
  },
};

/**
 * Known NORMAL polarity (raw alarm bit / DP true → Homey alarm true).
 * Entries: 'mfr' or 'mfr|PID'
 */
const NORMAL_POLARITY = Object.freeze([
  // Contact / HOBEIAN family (forum Lasse_K — do NOT treat as inverted)
  'HOBEIAN',
  'HOBEIAN|TS0203',
  'HOBEIAN|ZG-102Z',
  'HOBEIAN|ZG-102ZL',
  '_TZ3000_upgcbody',
  '_TZE200_qq9mpfhw',
  '_TZE200_akjefhx5',
  // SOS — normal press = alarm1=1
  '_TZ3000_p6ju8c0u|TS0215A',
  '_TZ3000_fsiempbi|TS0215A',
  '_TZ3000_0dumcwua|TS0215A',
  '_TZ3000_1b3zao9i|TS0215A',
  '_TZ3000_pkfbfbvs|TS0215A',
  // Water — normal wet = alarm true
  '_TZ3000_t6jpiuwk',
  '_TZ3000_k4ej3ww2',
  'HOBEIAN|TS0207',
  'SONOFF|SNZB-05P',
]);

/**
 * Known INVERTED polarity — raw alarm bit / DP must be flipped for Homey.
 */
const INVERTED_POLARITY = Object.freeze([
  // Contact (Z2M / UnifiedSensorBase legacy + keep-alive quirks)
  '_TZ3000_26fmupbb',
  '_TZ3000_n2egfsli',
  '_TZ3000_oxslv1c9',
  '_TZ3000_402jjyro',
  '_TZ3000_2mbfxlzr',
  '_TZ3000_bzxloft2',
  '_TZ3000_yxqnffam',
  '_TZ3000_996rpfy6',
  '_TZ3000_x8q36xwf',
  '_TZ3000_bpkijo14',
  '_TZ3000_4fsgukof',
  '_TZ3000_7d8yme6f',
  '_TZ3000_barjasr9',
  '_TZE200_pay2byax',
  '_TZE204_pay2byax',
  '_TZE200_n8dljorx',
  // Water — inverted IAS / DP (wet reports as clear)
  '_TZE200_nvups4qh',
  '_TZ3000_85igjkzg',
  '_TZ3000_oitaf0ap',
  '_TZ3000_kyb656r6',
  // SOS — alarm1=0 on press OR sticky alarm1=1 at idle (Peter-class OEMs)
  '_TZ3000_4fjljplt|TS0215A',
  '_TZ3000_ssp0maqm|TS0215A',
  '_TZ3000_udyjylt7|TS0215A',
  '_TZ3000_bi6lpsew|TS0215A',
]);

const STORE_KEY = 'alarm_polarity_learn';

function _deviceIds(device) {
  const mfr = device?.getSetting?.('zb_manufacturer_name')
    || device?.getStoreValue?.('zb_manufacturer_name')
    || device?.getStoreValue?.('manufacturerName')
    || device?.getData?.()?.manufacturerName
    || '';
  const pid = device?.getSetting?.('zb_model_id')
    || device?.getStoreValue?.('zb_model_id')
    || device?.getStoreValue?.('modelId')
    || device?.getData?.()?.productId
    || device?.getData?.()?.modelId
    || '';
  return { mfr: String(mfr), pid: String(pid) };
}

function _listHit(list, mfr, pid) {
  if (!mfr) {return false;}
  const couple = pid ? `${mfr}|${pid}` : null;
  if (couple && list.some((e) => normalizeCI(e) === normalizeCI(couple))) {return true;}
  return list.some((e) => {
    if (String(e).includes('|')) {
      const [em, ep] = String(e).split('|');
      return includesCI([em], mfr) && (!pid || includesCI([ep], pid));
    }
    return includesCI([e], mfr);
  });
}

function resolveProfile(profileOrCap) {
  if (PROFILES[profileOrCap]) {return { name: profileOrCap, ...PROFILES[profileOrCap] };}
  for (const [name, p] of Object.entries(PROFILES)) {
    if (p.capability === profileOrCap) {return { name, ...p };}
  }
  return { name: 'contact', ...PROFILES.contact };
}

function _legacyForceInvert(device, profile) {
  if (profile.name === 'contact') {
    return !!(device?.getSetting?.('invert_contact') || device?.getSetting?.('reverse_alarm'));
  }
  if (profile.name === 'water') {
    return !!device?.getSetting?.('invert_alarm');
  }
  if (profile.name === 'sos') {
    return !!(device?.getSetting?.('invert_sos') || device?.getSetting?.('invert_alarm'));
  }
  if (profile.name === 'motion') {
    return !!device?.getSetting?.('invert_presence');
  }
  return false;
}

/**
 * @returns {{ mode: string, shouldInvert: boolean, reason: string, mfr: string, pid: string, profile: string }}
 */
function resolvePolarity(device, profileOrCap = 'contact') {
  const profile = resolveProfile(profileOrCap);
  const { mfr, pid } = _deviceIds(device);

  let mode = 'auto';
  try {
    const raw = device?.getSetting?.('alarm_polarity');
    if (raw === 'normal' || raw === 'inverted' || raw === 'auto') {mode = raw;}
  } catch (_e) { /* ignore */ }

  const forceInvert = _legacyForceInvert(device, profile);
  const listedInvert = _listHit(INVERTED_POLARITY, mfr, pid);
  const listedNormal = _listHit(NORMAL_POLARITY, mfr, pid);

  let learned = null;
  let confidence = null;
  try {
    const st = device?.getStoreValue?.(STORE_KEY);
    if (st && typeof st.inverted === 'boolean' && st.profile === profile.name) {
      learned = st.inverted;
      confidence = typeof st.confidence === 'number' ? st.confidence : null;
    }
  } catch (_e) { /* ignore */ }

  if (mode === 'inverted') {
    return {
      mode, shouldInvert: true, reason: 'setting_alarm_polarity_inverted',
      listedInvert, listedNormal, learned, confidence, forceInvert, mfr, pid, profile: profile.name,
    };
  }
  if (mode === 'normal') {
    return {
      mode, shouldInvert: false, reason: 'setting_alarm_polarity_normal',
      listedInvert, listedNormal, learned, confidence, forceInvert, mfr, pid, profile: profile.name,
    };
  }

  // auto: learn → curated lists → default normal
  // If learned conflicts with strong curated NORMAL and confidence is low, prefer list.
  let baseInvert = false;
  let reason = 'default_normal';
  if (learned !== null) {
    const lowConf = confidence !== null && confidence < 0.55;
    if (lowConf && listedNormal && !listedInvert && learned === true) {
      baseInvert = false;
      reason = 'curated_normal_overrides_weak_learn';
    } else if (lowConf && listedInvert && !listedNormal && learned === false) {
      baseInvert = true;
      reason = 'curated_inverted_overrides_weak_learn';
    } else {
      baseInvert = learned;
      reason = learned ? 'smart_learned_inverted' : 'smart_learned_normal';
    }
  } else if (listedInvert && !listedNormal) {
    baseInvert = true;
    reason = 'curated_inverted_list';
  } else if (listedNormal) {
    baseInvert = false;
    reason = 'curated_normal_list';
  }

  const shouldInvert = forceInvert ? !baseInvert : baseInvert;
  if (forceInvert) {
    reason = `auto_xor_checkbox(base=${baseInvert})`;
  }

  return {
    mode,
    shouldInvert,
    reason,
    listedInvert,
    listedNormal,
    learned,
    confidence,
    forceInvert,
    mfr,
    pid,
    profile: profile.name,
  };
}

function applyPolarity(device, rawAlarm, profileOrCap = 'contact') {
  const raw = !!rawAlarm;
  const meta = resolvePolarity(device, profileOrCap);
  const value = meta.shouldInvert ? !raw : raw;
  return { value, meta, raw };
}

function _emptyState(profileName, now) {
  return {
    profile: profileName,
    startedAt: now,
    samples: 0,
    rawTrue: 0,
    rawFalse: 0,
    clearEvents: 0,
    alarmEvents: 0,
    transitions: 0,
    pulseCount: 0,
    lastRaw: null,
    lastChangeAt: now,
    stickyTrueMs: 0,
    stickyFalseMs: 0,
    inverted: null,
    decidedAt: null,
    confidence: null,
    reason: null,
  };
}

/**
 * Record a raw sample for smart learning. Call with RAW (pre-invert) values.
 */
function observeRaw(device, rawAlarm, profileOrCap = 'contact') {
  const profile = resolveProfile(profileOrCap);
  if (!device || typeof device.getStoreValue !== 'function') {return null;}

  let mode = 'auto';
  try {
    mode = device.getSetting?.('alarm_polarity') || 'auto';
  } catch (_e) { /* ignore */ }
  if (mode !== 'auto') {return null;}

  const now = Date.now();
  const { mfr, pid } = _deviceIds(device);
  const listedInvert = _listHit(INVERTED_POLARITY, mfr, pid);
  const listedNormal = _listHit(NORMAL_POLARITY, mfr, pid);

  let st = device.getStoreValue(STORE_KEY) || null;
  if (!st || st.profile !== profile.name) {
    st = _emptyState(profile.name, now);
  }

  const raw = !!rawAlarm;
  if (st.lastRaw !== null && st.lastRaw !== raw) {
    st.transitions += 1;
    const dwell = now - (st.lastChangeAt || now);
    if (st.lastRaw === true) {
      st.stickyTrueMs += dwell;
      if (dwell > 0 && dwell <= (profile.pulseMaxMs || 0)) {
        st.pulseCount += 1;
      }
    } else {
      st.stickyFalseMs += dwell;
    }
    st.lastChangeAt = now;
  } else if (st.lastRaw === null) {
    st.lastChangeAt = now;
  }
  st.lastRaw = raw;

  st.samples += 1;
  if (raw) {
    st.rawTrue += 1;
    st.alarmEvents += 1;
  } else {
    st.rawFalse += 1;
    st.clearEvents += 1;
  }

  const elapsed = now - (st.startedAt || now);
  const minElapsed = Math.min(profile.learnWindowMs, profile.minLearnMs || 15 * 60 * 1000);

  // Prior: listed devices decide earlier / with fewer samples
  let minSamples = profile.minSamples;
  let trueThresh = profile.idleTrueRatio || 0.72;
  let falseThresh = profile.idleFalseRatio || 0.28;
  if (listedInvert && !listedNormal) {
    minSamples = Math.max(3, minSamples - 3);
    trueThresh = Math.min(trueThresh, 0.58);
  } else if (listedNormal && !listedInvert) {
    minSamples += 4;
    trueThresh = Math.min(0.92, trueThresh + 0.12);
  }

  const canDecide = st.samples >= minSamples && elapsed >= minElapsed;
  const shouldRelearn = st.inverted !== null
    && (st.confidence || 0) < 0.6
    && elapsed >= profile.learnWindowMs;

  if (canDecide && (st.inverted === null || !st.decidedAt || shouldRelearn)) {
    const trueRatio = st.rawTrue / Math.max(1, st.samples);
    let decideInvert = null;
    let confidence = 0.5;
    let why = '';

    if (profile.name === 'sos') {
      const clearRatio = st.clearEvents / Math.max(1, st.samples);
      const stickyTrue = st.stickyTrueMs >= (profile.stickyTrueMs || 15 * 60 * 1000);
      const hasPulses = st.pulseCount >= 1 && st.alarmEvents >= 1;

      if (stickyTrue && trueRatio >= 0.55) {
        decideInvert = true;
        confidence = 0.82;
        why = 'sos_sticky_true_idle';
      } else if (clearRatio >= (profile.clearHeavyRatio || 0.85)
        && st.alarmEvents === 0
        && st.samples >= minSamples) {
        // Only clears forever — cannot learn press polarity; if listed invert, soft adopt
        if (listedInvert) {
          decideInvert = true;
          confidence = 0.62;
          why = 'sos_clear_heavy_listed_invert';
        }
      } else if (hasPulses && trueRatio < 0.45) {
        decideInvert = false;
        confidence = 0.78;
        why = 'sos_short_pulses_normal';
      } else if (st.alarmEvents >= 2 && trueRatio < 0.4 && st.pulseCount >= 2) {
        decideInvert = false;
        confidence = 0.7;
        why = 'sos_alarm_events_normal';
      } else if (listedInvert && trueRatio >= 0.5) {
        decideInvert = true;
        confidence = 0.68;
        why = 'sos_listed_invert_prior';
      }
    } else {
      const stickyTrue = st.stickyTrueMs >= (profile.stickyTrueMs || 8 * 60 * 1000);
      const stickyFalse = st.stickyFalseMs >= (profile.stickyFalseMs || 8 * 60 * 1000);

      if (trueRatio >= trueThresh || (stickyTrue && trueRatio >= 0.55)) {
        decideInvert = true;
        confidence = Math.min(0.95, 0.55 + trueRatio * 0.4);
        why = stickyTrue ? 'idle_sticky_true' : 'idle_true_ratio';
      } else if ((trueRatio <= falseThresh && st.samples >= minSamples + 2) || stickyFalse) {
        decideInvert = false;
        confidence = Math.min(0.95, 0.55 + (1 - trueRatio) * 0.35);
        why = stickyFalse ? 'idle_sticky_false' : 'idle_false_ratio';
      }

      if (decideInvert === true && listedNormal && !listedInvert) {
        confidence *= 0.55;
        if (confidence < 0.5) {
          decideInvert = null;
          why = 'blocked_by_normal_list';
        }
      }
      if (decideInvert === false && listedInvert && !listedNormal && trueRatio >= 0.45) {
        decideInvert = true;
        confidence = 0.72;
        why = 'listed_invert_overrides_false_ratio';
      }
    }

    if (decideInvert !== null) {
      st.inverted = decideInvert;
      st.decidedAt = now;
      st.confidence = confidence;
      st.reason = why;
      try {
        device.log?.(`[POLARITY] smart learn → ${decideInvert ? 'INVERTED' : 'NORMAL'} `
          + `(profile=${profile.name} conf=${confidence.toFixed(2)} why=${why} `
          + `samples=${st.samples} trueRatio=${trueRatio.toFixed(2)} `
          + `pulses=${st.pulseCount} stickyT=${Math.round(st.stickyTrueMs / 1000)}s `
          + `mfr=${mfr}${pid ? '|' + pid : ''}`
          + `${listedInvert ? ' list=INVERT' : ''}${listedNormal ? ' list=NORMAL' : ''})`);
      } catch (_e) { /* ignore */ }
    }
  }

  // Accrue sticky dwell for unchanged raw (IAS keep-alives) without double-counting
  if (st.lastChangeAt && now > st.lastChangeAt) {
    const dwell = now - st.lastChangeAt;
    if (dwell >= 1000) {
      if (st.lastRaw === true) {st.stickyTrueMs += dwell;}
      else if (st.lastRaw === false) {st.stickyFalseMs += dwell;}
      st.lastChangeAt = now;
    }
  }

  try {
    const p = device.setStoreValue(STORE_KEY, st);
    if (p && typeof p.catch === 'function') {p.catch(() => {});}
  } catch (_e) { /* ignore */ }
  return st;
}

function resetLearning(device) {
  try {
    if (device?.unsetStoreValue) {device.unsetStoreValue(STORE_KEY).catch?.(() => {});}
    else if (device?.setStoreValue) {device.setStoreValue(STORE_KEY, null).catch?.(() => {});}
  } catch (_e) { /* ignore */ }
}

/** Catalog for CI / free-scrape / docs (read-only). */
function listPolarityCatalog() {
  return {
    normal: [...NORMAL_POLARITY],
    inverted: [...INVERTED_POLARITY],
    profiles: Object.keys(PROFILES),
    setting: 'alarm_polarity',
    modes: ['auto', 'normal', 'inverted'],
  };
}

const ALARM_POLARITY_SETTING = Object.freeze({
  id: 'alarm_polarity',
  type: 'dropdown',
  label: {
    en: 'Alarm polarity',
    fr: 'Polarité alarme',
    nl: 'Alarm polariteit',
  },
  value: 'auto',
  values: [
    {
      id: 'auto',
      label: {
        en: 'Auto (device lists + smart timing)',
        fr: 'Auto (listes appareils + timing intelligent)',
        nl: 'Auto (apparaatlijsten + slimme timing)',
      },
    },
    {
      id: 'normal',
      label: {
        en: 'Normal (do not flip signal)',
        fr: 'Normal (ne pas inverser)',
        nl: 'Normaal (signaal niet omdraaien)',
      },
    },
    {
      id: 'inverted',
      label: {
        en: 'Inverted (flip / reverse signal)',
        fr: 'Inversé (inverser le signal)',
        nl: 'Omgekeerd (signaal omdraaien)',
      },
    },
  ],
  hint: {
    en: 'Auto uses curated normal/inverted device lists and learns from idle vs press timing. Choose Inverted if the tile stays open/wet/pressed when it should be idle. Normal forces no flip.',
    fr: 'Auto utilise les listes d’appareils normal/inversé et apprend selon les temps d’inactivité et d’appui. Choisir Inversé si la tuile reste ouverte/humide/pressée au repos. Normal force aucun flip.',
    nl: 'Auto gebruikt normale/omgekeerde apparaattlijsten en leert van idle- en druk-tijden. Kies Omgekeerd als de tegel open/nat/ingedrukt blijft in rust. Normaal forceert geen omkering.',
  },
});

module.exports = {
  PROFILES,
  NORMAL_POLARITY,
  INVERTED_POLARITY,
  ALARM_POLARITY_SETTING,
  STORE_KEY,
  resolvePolarity,
  applyPolarity,
  observeRaw,
  resetLearning,
  resolveProfile,
  listPolarityCatalog,
};
