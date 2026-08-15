'use strict';

/**
 * AlarmPolarityManager — single source of truth for IAS / SOS / water / contact polarity.
 *
 * Homey UI: true = alarm active (open / leak / SOS pressed).
 * Some OEM firmwares flip IAS alarm1/alarm2 (or Tuya DP bool) → idle looks like alarm.
 *
 * Resolution order when alarm_polarity = auto:
 *   learned store → curated INVERTED/NORMAL lists → default normal
 *   then XOR with legacy invert_* / reverse_alarm checkboxes
 *
 * Explicit alarm_polarity = normal | inverted always wins.
 *
 * Smart learning (auto only) uses idle-time heuristics per profile:
 *   contact / water — mostly idle=false; if raw stays true too often → inverted
 *   sos — many clear keep-alives + zero alarm spikes → try inverted
 */

const { includesCI, normalize: normalizeCI } = require('../utils/CaseInsensitiveMatcher');

/** Profiles: expected idle (logical Homey value) + timing for smart learn. */
const PROFILES = {
  contact: {
    capability: 'alarm_contact',
    idleExpected: false,
    learnWindowMs: 30 * 60 * 1000,
    minSamples: 8,
    idleTrueRatio: 0.72,
    settingKeys: ['alarm_polarity', 'invert_contact', 'reverse_alarm'],
  },
  water: {
    capability: 'alarm_water',
    idleExpected: false,
    learnWindowMs: 45 * 60 * 1000,
    minSamples: 6,
    idleTrueRatio: 0.72,
    settingKeys: ['alarm_polarity', 'invert_alarm'],
  },
  sos: {
    capability: 'alarm_generic',
    idleExpected: false,
    learnWindowMs: 24 * 60 * 60 * 1000,
    minSamples: 4,
    clearHeavyRatio: 0.85,
    settingKeys: ['alarm_polarity', 'invert_sos', 'invert_alarm'],
  },
  motion: {
    capability: 'alarm_motion',
    idleExpected: false,
    learnWindowMs: 60 * 60 * 1000,
    minSamples: 10,
    idleTrueRatio: 0.65,
    settingKeys: ['alarm_polarity', 'invert_presence'],
  },
};

/**
 * Known NORMAL polarity (IAS alarm1=1 → Homey alarm true).
 * Entries: 'mfr' or 'mfr|PID'
 */
const NORMAL_POLARITY = Object.freeze([
  'HOBEIAN',
  'HOBEIAN|TS0203',
  '_TZE200_qq9mpfhw',
  '_TZ3000_upgcbody',
  '_TZE200_akjefhx5',
  '_TZ3000_p6ju8c0u|TS0215A',
  '_TZ3000_fsiempbi|TS0215A',
  '_TZ3000_0dumcwua|TS0215A',
]);

/**
 * Known INVERTED polarity — raw alarm bit / DP must be flipped for Homey.
 */
const INVERTED_POLARITY = Object.freeze([
  // Contact (legacy UnifiedSensorBase list + Z2M quirks)
  '_TZ3000_26fmupbb',
  '_TZ3000_n2egfsli',
  '_TZ3000_oxslv1c9',
  '_TZ3000_402jjyro',
  '_TZ3000_2mbfxlzr',
  '_TZ3000_bzxloft2',
  '_TZ3000_yxqnffam',
  '_TZ3000_996rpfy6',
  '_TZ3000_x8q36xwf',
  // Water — inverted IAS / DP (expand as confirmed)
  '_TZE200_nvups4qh',
  '_TZ3000_85igjkzg',
  // SOS — firms that assert alarm1=0 on press / stick alarm1=1 at idle
  '_TZ3000_4fjljplt|TS0215A',
  '_TZ3000_ssp0maqm|TS0215A',
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

  const forceInvert = (() => {
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
  })();

  const listedInvert = _listHit(INVERTED_POLARITY, mfr, pid);
  const listedNormal = _listHit(NORMAL_POLARITY, mfr, pid);

  let learned = null;
  try {
    const st = device?.getStoreValue?.(STORE_KEY);
    if (st && typeof st.inverted === 'boolean' && st.profile === profile.name) {
      learned = st.inverted;
    }
  } catch (_e) { /* ignore */ }

  // Explicit dropdown wins
  if (mode === 'inverted') {
    return {
      mode, shouldInvert: true, reason: 'setting_alarm_polarity_inverted',
      listedInvert, listedNormal, learned, forceInvert, mfr, pid, profile: profile.name,
    };
  }
  if (mode === 'normal') {
    return {
      mode, shouldInvert: false, reason: 'setting_alarm_polarity_normal',
      listedInvert, listedNormal, learned, forceInvert, mfr, pid, profile: profile.name,
    };
  }

  // auto: base from learn → curated lists → default normal
  let baseInvert = false;
  let reason = 'default_normal';
  if (learned !== null) {
    baseInvert = learned;
    reason = learned ? 'smart_learned_inverted' : 'smart_learned_normal';
  } else if (listedInvert && !listedNormal) {
    baseInvert = true;
    reason = 'curated_inverted_list';
  } else if (listedNormal) {
    baseInvert = false;
    reason = 'curated_normal_list';
  }

  // Legacy checkboxes XOR the auto base (toggle curated default)
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
    forceInvert,
    mfr,
    pid,
    profile: profile.name,
  };
}

/**
 * Apply polarity to a raw boolean alarm bit.
 * @returns {{ value: boolean, meta: object, raw: boolean }}
 */
function applyPolarity(device, rawAlarm, profileOrCap = 'contact') {
  const raw = !!rawAlarm;
  const meta = resolvePolarity(device, profileOrCap);
  const value = meta.shouldInvert ? !raw : raw;
  return { value, meta, raw };
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
  let st = device.getStoreValue(STORE_KEY) || null;
  if (!st || st.profile !== profile.name) {
    st = {
      profile: profile.name,
      startedAt: now,
      samples: 0,
      rawTrue: 0,
      rawFalse: 0,
      clearEvents: 0,
      alarmEvents: 0,
      inverted: null,
      decidedAt: null,
    };
  }

  st.samples += 1;
  if (rawAlarm) {
    st.rawTrue += 1;
    st.alarmEvents += 1;
  } else {
    st.rawFalse += 1;
    st.clearEvents += 1;
  }

  if (st.inverted === null || !st.decidedAt) {
    const elapsed = now - (st.startedAt || now);
    const minElapsed = Math.min(profile.learnWindowMs, 15 * 60 * 1000);
    if (st.samples >= profile.minSamples && elapsed >= minElapsed) {
      const trueRatio = st.rawTrue / Math.max(1, st.samples);
      let decideInvert = null;

      if (profile.name === 'sos') {
        const clearRatio = st.clearEvents / Math.max(1, st.samples);
        if (clearRatio >= (profile.clearHeavyRatio || 0.85)
          && st.alarmEvents === 0
          && st.samples >= profile.minSamples) {
          decideInvert = true;
        } else if (st.alarmEvents >= 2 && trueRatio < 0.4) {
          decideInvert = false;
        }
      } else if (trueRatio >= (profile.idleTrueRatio || 0.72)) {
        decideInvert = true;
      } else if (trueRatio <= 0.28 && st.samples >= profile.minSamples + 4) {
        decideInvert = false;
      }

      if (decideInvert !== null) {
        st.inverted = decideInvert;
        st.decidedAt = now;
        try {
          device.log?.(`[POLARITY] smart learn → ${decideInvert ? 'INVERTED' : 'NORMAL'} `
            + `(profile=${profile.name} samples=${st.samples} trueRatio=${trueRatio.toFixed(2)} `
            + `mfr=${_deviceIds(device).mfr})`);
        } catch (_e) { /* ignore */ }
      }
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
        en: 'Auto (lists + smart learn)',
        fr: 'Auto (listes + apprentissage)',
        nl: 'Auto (lijsten + slim leren)',
      },
    },
    {
      id: 'normal',
      label: {
        en: 'Normal (alarm bit = alarm)',
        fr: 'Normal (bit alarme = alarme)',
        nl: 'Normaal (alarmbit = alarm)',
      },
    },
    {
      id: 'inverted',
      label: {
        en: 'Inverted (flip signal)',
        fr: 'Inversé (inverser le signal)',
        nl: 'Omgekeerd (signaal omdraaien)',
      },
    },
  ],
  hint: {
    en: 'Use Auto unless the tile is stuck open/wet/pressed. Inverted flips the raw Zigbee/Tuya signal. Auto uses curated device lists and learns from idle timing.',
    fr: 'Garder Auto sauf si la tuile reste ouverte/humide/pressée. Inversé inverse le signal brut. Auto utilise les listes d’appareils et apprend selon les temps d’inactivité.',
    nl: 'Houd Auto tenzij de tegel vast open/nat/ingedrukt blijft. Omgekeerd draait het ruwe signaal om. Auto gebruikt apparaattlijsten en leert van idle-tijden.',
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
};
