'use strict';
/**
 * Deterministic (no AI) symptom families + white-label model codes from forum / OCR text.
 * Output is structured labels only; callers must never store the source text (C1/C5).
 *
 * Families map to known fix patterns so a daily resume can jump to the right code:
 *   dp-write-args    → datapoint() called with keys zigbee-clusters refuses (UniversalDriverInit.sendStructuredDatapoint)
 *   options-churn    → Flow cards rebuilt by repeated setCapabilityOptions (DataProvenance.applyProvenanceUx)
 *   insights-missing → History / Insights tab absent (capabilitiesOptions getable / preventInsights)
 *   null-values      → capability tiles empty / null after pairing (identity seed, EF00-only interview)
 *   value-mapping    → swapped or wrong-scale readings (DP map, divisor, cluster meaning)
 *   pairing          → generic / unknown device, interview failure
 *   battery          → battery missing / wrong / draining
 *   presence-stuck   → occupancy that never clears or never triggers
 *   crash            → app crash / out of memory
 */

const FAMILIES = [
  ['dp-write-args', /unexpected property|value is an unexpected|datapoint[^.\n]{0,40}(?:error|fail)/i],
  ['options-churn', /(?:advanced\s+)?flows?[^.\n]{0,30}(?:lag|slow|reload|refresh|freez|hang)|cards?[^.\n]{0,20}(?:keep\s+)?(?:reload|refresh)ing/i],
  ['insights-missing', /(?:insights?|history)[^.\n]{0,30}(?:missing|empty|gone|not\s+(?:show|visible|available)|disappear)|no\s+(?:insights?|history)/i],
  ['null-values', /\bnull\b|shows?\s+(?:nothing|dashes|--)|no\s+values?\b|values?\s+(?:stay|are)\s+empty/i],
  ['value-mapping', /(?:humidity|moisture|temperature|lux|distance)[^.\n]{0,40}(?:swap|wrong|same\s+value|mixed|x\s?10|divid)|wrong\s+(?:value|unit|scale)/i],
  ['pairing', /won'?t\s+pair|can(?:'|no)?t\s+pair|generic\s+(?:zigbee\s+)?device|unknown\s+(?:zigbee\s+)?device|interview\s+fail/i],
  ['battery', /battery[^.\n]{0,30}(?:0\s?%|wrong|missing|drain|empty|not\s+(?:report|show))/i],
  ['presence-stuck', /(?:presence|occupancy|motion)[^.\n]{0,30}(?:stuck|always|never\s+(?:clear|reset|trigger)|keeps?\s+(?:on|detect))/i],
  ['crash', /\bcrash(?:es|ed)?\b|out\s+of\s+memory|heap|app\s+(?:restart|stopp)/i],
];

// White-label model codes (HOBEIAN ZG-106Z, AOYAN AY-303Z, COOLO CS-201Z, MTG075 radar …).
// A digit is required; Tuya TS#### product ids are handled by the identity extractors.
const MODEL_RE = /\b((?:ZG|AY|CS|MTG|ZY|ME|SNZB|ZTS|SGS|SM|ZBN|TRV)-?\d{2,4}[A-Z]{0,3}\d?)\b/g;
const BRANDS = ['HOBEIAN', 'AOYAN', 'COOLO', 'MOES', 'AVATTO', 'ZEMISMART', 'NEDIS', 'SONOFF', 'LIDL', 'SILVERCREST', 'BSEED', 'GIRIER', 'LONSONHO', 'NOUS', 'THALEOS', 'EARU', 'IMMAX', 'BENEXMART'];
const BRAND_RE = new RegExp(`\\b(${BRANDS.join('|')})\\b`, 'gi');

function extractSymptoms(text) {
  const src = String(text || '');
  return FAMILIES.filter(([, re]) => re.test(src)).map(([id]) => id);
}

function extractModels(text) {
  const src = String(text || '').toUpperCase();
  const models = [...new Set([...src.matchAll(MODEL_RE)].map((m) => m[1]))].filter((m) => !/^TS\d/.test(m)).slice(0, 8);
  const brands = [...new Set([...src.matchAll(BRAND_RE)].map((m) => m[1].toUpperCase()))].slice(0, 6);
  return { models, brands };
}

/** Quirk candidates: identity × family pairs. Flags only; enabling a quirk still needs 2+ sources. */
function quirkCandidates({ mfrs = [], pids = [], models = [] }, families = []) {
  if (!families.length) return [];
  const ids = [
    ...mfrs.flatMap((m) => (pids.length ? pids.map((p) => `${m}|${p}`) : [`${m}|?`])),
    ...models.map((m) => `model:${m}`),
  ].slice(0, 6);
  return ids.flatMap((id) => families.map((f) => `${id}:${f}`));
}

module.exports = { extractSymptoms, extractModels, quirkCandidates, FAMILIES: FAMILIES.map(([id]) => id) };
