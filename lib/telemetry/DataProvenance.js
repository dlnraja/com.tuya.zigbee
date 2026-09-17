'use strict';

/**
 * DataProvenance (P2556) — distinguish measured vs intelligent estimate vs calculated
 *
 * WHY(P215):
 * - Pourquoi: users/flows must see if a value is a real device report, a smart estimate,
 *   or a derived calculation (e.g. I=P/V, kWh integral) — never mix silently.
 * - Comment: store telemetry_<cap>_origin + legacy telemetry_<cap>_source; UX titles/units.
 * - Pour qui: Homey device UI + Flow conditions/triggers (BOTH tracks).
 * - Quand: every capability write through DeviceTelemetryEstimator / SmartEnergyManager.
 * - Contre quoi: estimated power shown as if metered; silent overwrite of measured.
 *
 * Origins (canonical):
 *   measured   — Zigbee/ZCL/EF00/IAS report from the device (reliable reading)
 *   estimated  — intelligent profile / nominal / soft model (not a live meter)
 *   calculated — derived from other values (P/V→I, energy integral, etc.)
 *
 * Legacy source field keeps `direct` as alias of measured for older flows/stores.
 */

const ORIGINS = Object.freeze(['measured', 'estimated', 'calculated']);

const ORIGIN_LABELS = Object.freeze({
  measured: {
    en: 'measured',
    fr: 'mesuré',
    nl: 'gemeten',
    de: 'gemessen',
    it: 'misurato',
    es: 'medido',
    sv: 'mätt',
    no: 'målt',
    da: 'målt',
  },
  estimated: {
    en: 'estimated',
    fr: 'estimé (intelligent)',
    nl: 'geschat (intelligent)',
    de: 'geschätzt (intelligent)',
    it: 'stimato (intelligente)',
    es: 'estimado (inteligente)',
    sv: 'uppskattad (intelligent)',
    no: 'estimert (intelligent)',
    da: 'estimeret (intelligent)',
  },
  calculated: {
    en: 'calculated',
    fr: 'calculé',
    nl: 'berekend',
    de: 'berechnet',
    it: 'calcolato',
    es: 'calculado',
    sv: 'beräknad',
    no: 'beregnet',
    da: 'beregnet',
  },
});

const UNIT_MARK = Object.freeze({
  measured: '',
  estimated: ' ≈',
  calculated: ' ƒ',
});

const TRACKED_CAPS = Object.freeze([
  'measure_power',
  'measure_voltage',
  'measure_current',
  'meter_power',
  'measure_battery',
  'measure_temperature',
  'measure_humidity',
  'measure_luminance',
  'measure_co2',
  'measure_pm25',
]);

function normalizeOrigin(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (!s) return null;
  if (s === 'direct' || s === 'measured' || s === 'real' || s === 'zcl' || s === 'dp'
      || s === 'tuya-dp' || s === 'ias' || s === 'ef00') {
    return 'measured';
  }
  if (s === 'estimated' || s === 'estimate' || s === 'approx' || s === 'approximation'
      || s === 'heuristic' || s === 'profile' || s === 'nominal') {
    return 'estimated';
  }
  if (s === 'calculated' || s === 'derived' || s === 'computed' || s === 'integral'
      || s === 'product' || s === 'from_vi' || s === 'from_power') {
    return 'calculated';
  }
  if (ORIGINS.includes(s)) return s;
  return null;
}

/** Map origin → legacy store source (direct|estimated|calculated) */
function toLegacySource(origin) {
  const o = normalizeOrigin(origin) || 'measured';
  if (o === 'measured') return 'direct';
  return o;
}

function fromLegacySource(source) {
  return normalizeOrigin(source) || null;
}

function labelFor(origin, lang = 'en') {
  const o = normalizeOrigin(origin) || 'measured';
  const map = ORIGIN_LABELS[o] || ORIGIN_LABELS.measured;
  return map[lang] || map.en;
}

function stripProvenanceSuffix(title) {
  if (!title || typeof title !== 'string') return title;
  return title
    .replace(/\s*[·•]\s*(measured|estimated|calculated|mesuré|estimé[^)]*\)?|calculé|gemeten|geschat[^)]*\)?|berekend|gemessen|geschätzt[^)]*\)?|berechnet)\s*$/i, '')
    .replace(/\s*\((measured|estimated|calculated|mesuré|estimé|calculé)\)\s*$/i, '')
    .trim();
}

function stripUnitMark(units) {
  if (!units || typeof units !== 'string') return units || '';
  return units.replace(/\s*[≈ƒ]\s*$/u, '').trim();
}

/**
 * Build complementary capability options that show origin in Homey UI.
 * Never wipe existing titles — union/append only (P2520).
 */
function buildProvenanceCapabilityOptions(currentOpts, origin, baseTitle) {
  const o = normalizeOrigin(origin) || 'measured';
  const cur = currentOpts && typeof currentOpts === 'object' ? { ...currentOpts } : {};
  const titles = {};
  const langs = Object.keys(ORIGIN_LABELS.measured);
  for (const lang of langs) {
    const raw = (baseTitle && (baseTitle[lang] || baseTitle.en))
      || (cur.title && (cur.title[lang] || cur.title.en))
      || null;
    const base = stripProvenanceSuffix(raw || '') || null;
    const label = labelFor(o, lang);
    if (base) {
      titles[lang] = o === 'measured' ? base : `${base} · ${label}`;
    } else if (o !== 'measured') {
      titles[lang] = label;
    }
  }
  if (Object.keys(titles).length) {
    cur.title = { ...(typeof cur.title === 'object' ? cur.title : {}), ...titles };
  }
  const baseUnits = stripUnitMark(cur.units || '');
  if (baseUnits || o !== 'measured') {
    cur.units = `${baseUnits}${UNIT_MARK[o] || ''}`.trim();
  }
  // Homey Insights: keep getable; origin is informational
  if (cur.preventInsights === true && o === 'measured') {
    cur.preventInsights = false;
  }
  cur.insightsTitleTrue = cur.insightsTitleTrue; // no-op keep
  return cur;
}

async function readOrigin(device, capability) {
  if (!device || !capability) return null;
  try {
    const get = device.getStoreValue?.bind(device);
    if (typeof get !== 'function') return null;
    const origin = fromLegacySource(await get(`telemetry_${capability}_origin`))
      || fromLegacySource(await get(`telemetry_${capability}_source`));
    return origin;
  } catch (_e) {
    return null;
  }
}

async function writeOrigin(device, capability, origin, reason) {
  if (!device || !capability) return null;
  const o = normalizeOrigin(origin) || 'measured';
  const legacy = toLegacySource(o);
  try {
    const set = device.setStoreValue?.bind(device);
    if (typeof set === 'function') {
      await set(`telemetry_${capability}_origin`, o);
      await set(`telemetry_${capability}_source`, legacy);
      if (reason) await set(`telemetry_${capability}_reason`, String(reason).slice(0, 120));
      await set(`telemetry_${capability}_updated_at`, Date.now());
    }
  } catch (_e) { /* soft */ }
  return o;
}

/**
 * Apply UI labels for provenance (best-effort, never throws).
 */
async function applyProvenanceUx(device, capability, origin) {
  if (!device || !capability || typeof device.setCapabilityOptions !== 'function') return false;
  if (!device.hasCapability?.(capability)) return false;
  const o = normalizeOrigin(origin) || 'measured';
  try {
    const cur = (typeof device.getCapabilityOptions === 'function'
      && device.getCapabilityOptions(capability)) || {};
    const next = buildProvenanceCapabilityOptions(cur, o);
    await device.setCapabilityOptions(capability, next);
    return true;
  } catch (_e) {
    return false;
  }
}

/**
 * Stamp provenance + UX. Fires optional callback when origin changes.
 */
async function stampProvenance(device, capability, origin, opts = {}) {
  const o = normalizeOrigin(origin) || 'measured';
  const prev = await readOrigin(device, capability);
  await writeOrigin(device, capability, o, opts.reason);
  if (opts.applyUx !== false) {
    await applyProvenanceUx(device, capability, o);
  }
  if (prev && prev !== o && typeof opts.onChanged === 'function') {
    try { opts.onChanged(prev, o); } catch (_e) { /* soft */ }
  }
  return { prev, origin: o, changed: prev !== o };
}

function isEstimated(originOrSource) {
  return normalizeOrigin(originOrSource) === 'estimated';
}

function isMeasured(originOrSource) {
  return normalizeOrigin(originOrSource) === 'measured';
}

function isCalculated(originOrSource) {
  return normalizeOrigin(originOrSource) === 'calculated';
}

/** Infer origin from estimate reason string */
function originFromReason(reason) {
  const r = String(reason || '').toLowerCase();
  if (/from[_-]?vi|p\/v|ohm|product|integral|accumul|delta.?kwh|usage.?ms|derived|calcul/.test(r)) {
    return 'calculated';
  }
  if (/nominal|standby|profile|default|audit.?silent|heuristic|estimate|approx|battery.?estimate/.test(r)) {
    return 'estimated';
  }
  if (/direct|zcl|dp|ef00|ias|report|measured/.test(r)) {
    return 'measured';
  }
  return 'estimated';
}

module.exports = {
  ORIGINS,
  ORIGIN_LABELS,
  UNIT_MARK,
  TRACKED_CAPS,
  normalizeOrigin,
  toLegacySource,
  fromLegacySource,
  labelFor,
  stripProvenanceSuffix,
  stripUnitMark,
  buildProvenanceCapabilityOptions,
  readOrigin,
  writeOrigin,
  applyProvenanceUx,
  stampProvenance,
  isEstimated,
  isMeasured,
  isCalculated,
  originFromReason,
};
