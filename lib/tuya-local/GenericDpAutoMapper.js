'use strict';
/**
 * P2930 — Last-resort DP guesser for unknown WiFi products (no category, no catalog hit).
 * Ideas from tuya-local's config conventions and localtuya's DP auto-config, rewritten:
 * look at observed DP values and well-known Tuya standard DP numbers, and propose low-risk
 * capabilities only for gaps. Every proposal carries confidence; nothing is written to the
 * device and only 'high' proposals are applied automatically by enrichWiFiDpMappings.
 */
function guess(dps) {
  const out = {};
  if (!dps || typeof dps !== 'object') {return out;}
  const entries = Object.entries(dps).slice(0, 64);
  const bools = entries.filter(([, v]) => typeof v === 'boolean').map(([k]) => Number(k)).sort((a, b) => a - b);
  // Standard Tuya switch layout: DP1..DP6 booleans are channel relays.
  const relays = bools.filter((n) => n >= 1 && n <= 6);
  relays.forEach((n, i) => { out[String(n)] = { capability: i === 0 ? 'onoff' : `onoff.gang${i + 1}`, type: 'boolean', confidence: n === 1 ? 'high' : 'medium' }; });
  // Standard metering DPs 18 (mA), 19 (W*10), 20 (V*10) when values look plausible.
  const num = (k) => (typeof dps[k] === 'number' ? dps[k] : null);
  if (num('19') !== null && num('20') !== null && num('20') > 800 && num('20') < 2800) {
    out['18'] = num('18') !== null ? { capability: 'measure_current', type: 'value', divisor: 1000, confidence: 'high' } : undefined;
    out['19'] = { capability: 'measure_power', type: 'value', divisor: 10, confidence: 'high' };
    out['20'] = { capability: 'measure_voltage', type: 'value', divisor: 10, confidence: 'high' };
    if (!out['18']) {delete out['18'];}
  }
  return out;
}

function highConfidence(dps) {
  const g = guess(dps); const r = {};
  for (const [k, v] of Object.entries(g)) {if (v.confidence === 'high') {const { confidence, ...rest } = v; r[k] = rest;}}
  return r;
}

module.exports = { guess, highConfidence };
