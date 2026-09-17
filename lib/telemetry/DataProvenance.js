'use strict';

/**
 * DataProvenance (P2556 → P2558) — measured-first + elegant estimate/calc/predict UX
 *
 * WHY(P215):
 * - Pourquoi: prioritize precise real measurements; never confuse with smart estimate,
 *   complete calculation, or forward prediction — label elegantly in titles + flows.
 * - Comment: store origin; UX titles only decorate non-measured; unit marks ≈ / ƒ / →
 * - Pour qui: Homey device UI + Flow (BOTH).
 * - Quand: every tracked capability write.
 * - Contre quoi: estimated/predicted looking like a live meter; estimate overwriting measured.
 *
 * Priority (highest wins, never overwrite downward):
 *   measured (1) > calculated (2) > estimated (3) > predicted (4)
 */

const ORIGINS = Object.freeze(['measured', 'calculated', 'estimated', 'predicted']);

/** Higher = more trustworthy / preferred */
const ORIGIN_PRIORITY = Object.freeze({
  measured: 100,
  calculated: 70,
  estimated: 40,
  predicted: 20,
});

/**
 * Elegant short labels for capability titles (Homey UI).
 * measured = empty → clean real name only.
 */
const ORIGIN_LABELS = Object.freeze({
  measured: {
    en: '',
    fr: '',
    nl: '',
    de: '',
    it: '',
    es: '',
    sv: '',
    no: '',
    da: '',
  },
  estimated: {
    en: '≈ estimated',
    fr: '≈ estimé',
    nl: '≈ geschat',
    de: '≈ geschätzt',
    it: '≈ stimato',
    es: '≈ estimado',
    sv: '≈ uppskattad',
    no: '≈ estimert',
    da: '≈ estimeret',
  },
  calculated: {
    en: 'ƒ calculated',
    fr: 'ƒ calculé',
    nl: 'ƒ berekend',
    de: 'ƒ berechnet',
    it: 'ƒ calcolato',
    es: 'ƒ calculado',
    sv: 'ƒ beräknad',
    no: 'ƒ beregnet',
    da: 'ƒ beregnet',
  },
  predicted: {
    en: '→ predicted',
    fr: '→ prévu',
    nl: '→ voorspeld',
    de: '→ prognostiziert',
    it: '→ previsto',
    es: '→ previsto',
    sv: '→ prognos',
    no: '→ predikert',
    da: '→ forudsagt',
  },
});

/** Long labels for flow cards / hints */
const ORIGIN_FLOW_LABELS = Object.freeze({
  measured: {
    en: 'real measurement',
    fr: 'mesure réelle',
    nl: 'echte meting',
    de: 'echte Messung',
  },
  estimated: {
    en: 'intelligent estimate',
    fr: 'estimation intelligente',
    nl: 'intelligente schatting',
    de: 'intelligente Schätzung',
  },
  calculated: {
    en: 'complete calculation',
    fr: 'calcul complet',
    nl: 'volledige berekening',
    de: 'vollständige Berechnung',
  },
  predicted: {
    en: 'smart prediction',
    fr: 'prédiction intelligente',
    nl: 'slimme voorspelling',
    de: 'intelligente Prognose',
  },
});

const UNIT_MARK = Object.freeze({
  measured: '',
  estimated: ' ≈',
  calculated: ' ƒ',
  predicted: ' →',
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
      || s === 'tuya-dp' || s === 'ias' || s === 'ef00' || s === 'reliable') {
    return 'measured';
  }
  if (s === 'predicted' || s === 'prediction' || s === 'forecast' || s === 'projected'
      || s === 'trend' || s === 'decay' || s === 'extrapolat') {
    return 'predicted';
  }
  if (s === 'estimated' || s === 'estimate' || s === 'approx' || s === 'approximation'
      || s === 'heuristic' || s === 'profile' || s === 'nominal' || s === 'smart') {
    return 'estimated';
  }
  if (s === 'calculated' || s === 'derived' || s === 'computed' || s === 'integral'
      || s === 'product' || s === 'from_vi' || s === 'from_power' || s === 'complete') {
    return 'calculated';
  }
  if (ORIGINS.includes(s)) return s;
  return null;
}

function priorityOf(origin) {
  const o = normalizeOrigin(origin);
  return o ? (ORIGIN_PRIORITY[o] || 0) : 0;
}

/**
 * measured-first: only allow write if next is same or higher priority,
 * or force=true (explicit measured report always wins).
 */
function canOverwrite(currentOrigin, nextOrigin, opts = {}) {
  if (opts.force === true) return true;
  const next = normalizeOrigin(nextOrigin) || 'measured';
  if (next === 'measured') return true; // real reports always win
  const cur = normalizeOrigin(currentOrigin);
  if (!cur) return true;
  return priorityOf(next) >= priorityOf(cur);
}

/** Map origin → legacy store source */
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
  return map[lang] || map.en || '';
}

function flowLabelFor(origin, lang = 'en') {
  const o = normalizeOrigin(origin) || 'measured';
  const map = ORIGIN_FLOW_LABELS[o] || ORIGIN_FLOW_LABELS.measured;
  return map[lang] || map.en;
}

function stripProvenanceSuffix(title) {
  if (!title || typeof title !== 'string') return title;
  return title
    .replace(/\s*[·•]\s*[≈ƒ→]?\s*(measured|estimated|calculated|predicted|mesuré|estimé[^·]*|calculé|prévu|pr[eé]vu|gemeten|geschat[^·]*|berekend|voorspeld|gemessen|geschätzt[^·]*|berechnet|prognostiziert|smart estimate|intelligent estimate)\s*$/iu, '')
    .replace(/\s*\((measured|estimated|calculated|predicted|mesuré|estimé|calculé|prévu)\)\s*$/iu, '')
    .replace(/\s*[≈ƒ→]\s*(estimated|calculated|predicted|estimé|calculé|prévu)?\s*$/iu, '')
    .trim();
}

function stripUnitMark(units) {
  if (!units || typeof units !== 'string') return units || '';
  return units.replace(/\s*[≈ƒ→]\s*$/u, '').trim();
}

/**
 * Elegant capability options — measured stays clean; others get · ≈/ƒ/→ labels.
 */
function buildProvenanceCapabilityOptions(currentOpts, origin, baseTitle) {
  const o = normalizeOrigin(origin) || 'measured';
  const cur = currentOpts && typeof currentOpts === 'object' ? { ...currentOpts } : {};
  const titles = {};
  const langs = Object.keys(ORIGIN_LABELS.estimated);
  for (const lang of langs) {
    const raw = (baseTitle && (baseTitle[lang] || baseTitle.en))
      || (cur.title && (cur.title[lang] || cur.title.en))
      || null;
    const base = stripProvenanceSuffix(raw || '') || null;
    const label = labelFor(o, lang);
    if (base) {
      titles[lang] = (o === 'measured' || !label) ? base : `${base} · ${label}`;
    } else if (o !== 'measured' && label) {
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
  if (cur.preventInsights === true && o === 'measured') {
    cur.preventInsights = false;
  }
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

async function stampProvenance(device, capability, origin, opts = {}) {
  const o = normalizeOrigin(origin) || 'measured';
  const prev = await readOrigin(device, capability);
  if (!canOverwrite(prev, o, opts)) {
    return { prev, origin: prev, changed: false, blocked: true };
  }
  await writeOrigin(device, capability, o, opts.reason);
  if (opts.applyUx !== false) {
    await applyProvenanceUx(device, capability, o);
  }
  if (prev && prev !== o && typeof opts.onChanged === 'function') {
    try { opts.onChanged(prev, o); } catch (_e) { /* soft */ }
  }
  return { prev, origin: o, changed: prev !== o, blocked: false };
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

function isPredicted(originOrSource) {
  return normalizeOrigin(originOrSource) === 'predicted';
}

/** True when value is NOT a live device measurement */
function isNonMeasured(originOrSource) {
  const o = normalizeOrigin(originOrSource);
  return o === 'estimated' || o === 'calculated' || o === 'predicted';
}

function originFromReason(reason) {
  const r = String(reason || '').toLowerCase();
  if (/predict|forecast|decay|drain|elapsed.?d|trend|extrapol|last-real|battery.?status/.test(r)) {
    return 'predicted';
  }
  if (/from[_-]?vi|p\/v|ohm|product|integral|accumul|delta.?kwh|usage.?ms|derived|calcul|energy-integral/.test(r)) {
    return 'calculated';
  }
  if (/nominal|standby|profile|default|audit.?silent|heuristic|estimate|approx|virtual/.test(r)) {
    return 'estimated';
  }
  if (/direct|zcl|dp|ef00|ias|report|measured/.test(r)) {
    return 'measured';
  }
  return 'estimated';
}

module.exports = {
  ORIGINS,
  ORIGIN_PRIORITY,
  ORIGIN_LABELS,
  ORIGIN_FLOW_LABELS,
  UNIT_MARK,
  TRACKED_CAPS,
  normalizeOrigin,
  priorityOf,
  canOverwrite,
  toLegacySource,
  fromLegacySource,
  labelFor,
  flowLabelFor,
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
  isPredicted,
  isNonMeasured,
  originFromReason,
};
