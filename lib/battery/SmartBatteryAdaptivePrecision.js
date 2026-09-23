'use strict';

/**
 * P2689 — Smart Battery Adaptive Precision
 *
 * WHY (P215):
 * - Pourquoi: recover precise % for piles/accus without draining CR2032 or flooding
 *   the mesh with powerCfg polls / tight reportableChange.
 * - Comment: SOC-band + chemistry-class adaptive minChange / intervals / throttle;
 *   SED = passive + piggyback only (Z2M/ZHA/HomeSuite lessons, ideas only).
 * - Pour qui: Homey measure_battery UI + flows (Universal + Bastien + Stable BOTH).
 * - Quand: configureReporting, UnifiedBatteryHandler poll/throttle, sensor DP ingest.
 * - Contre quoi: fixed 2%/5min + fixed 1h poll on all devices → drain or stale UI.
 *
 * Peer inspiration (behaviour only — no code copy):
 * - Z2M: bind+report while awake; minInterval ≥3600; voltage→% chemistry curves
 * - ZHA: TuyaNoBindPower / skip power bind on coin remotes
 * - HomeSuite: jitter, no thundering herd, skip Poll Control on sleepy
 * - Community: last-seen often beats % for "dead battery" detection
 */

const COIN = new Set(['CR2032', 'CR2450', 'CR2477', 'CR1632', 'CR1220']);
const ALKALINE = new Set(['AAA', 'AA', 'C', 'D', '9V', '2xAAA', '2xAA', '4xAAA', '4xAA']);
const RECHARGEABLE = new Set(['Li-ion', 'Li-polymer', 'LiPo', '18650', 'NiMH']);

/** SOC bands — finer precision when energy is scarce. */
const SOC_BANDS = [
  // critical: accept 1% moves, shorter maxInterval so low packs report sooner
  { id: 'critical', maxPct: 15, minChange: 1, minInterval: 1800, maxInterval: 21600, throttleMs: 60 * 1000, pollScale: 0.5 },
  { id: 'low', maxPct: 30, minChange: 1, minInterval: 3600, maxInterval: 28800, throttleMs: 120 * 1000, pollScale: 0.7 },
  { id: 'mid', maxPct: 70, minChange: 2, minInterval: 3600, maxInterval: 43200, throttleMs: 300 * 1000, pollScale: 1.0 },
  { id: 'high', maxPct: 100, minChange: 5, minInterval: 7200, maxInterval: 64800, throttleMs: 600 * 1000, pollScale: 1.5 },
];

function normalizeChemistry(chemistry) {
  const c = String(chemistry || 'CR2032').trim();
  if (!c) return 'CR2032';
  return c;
}

function chemistryClass(chemistry) {
  const c = normalizeChemistry(chemistry);
  if (COIN.has(c) || /^CR\d+/i.test(c)) return 'coin';
  if (RECHARGEABLE.has(c) || /li-?ion|lipo|18650|nimh/i.test(c)) return 'rechargeable';
  if (ALKALINE.has(c) || /AA|AAA/i.test(c)) return 'alkaline';
  if (/CR123/i.test(c)) return 'lithiumPrimary';
  if (/MAINS|USB|NONE/i.test(c)) return 'mains';
  return 'coin';
}

function resolveSocBand(percent) {
  const p = Number(percent);
  const pct = Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : 70;
  for (const band of SOC_BANDS) {
    if (pct <= band.maxPct) return band;
  }
  return SOC_BANDS[SOC_BANDS.length - 1];
}

/**
 * Zigbee configureReporting payload for batteryPercentageRemaining.
 * Sleepy coin cells: never call this for proactive TX — caller must skip.
 * @returns {{ minInterval: number, maxInterval: number, minChange: number, band: string, chemistryClass: string }}
 */
function buildAdaptiveReportingConfig(opts = {}) {
  const chem = normalizeChemistry(opts.chemistry);
  const klass = chemistryClass(chem);
  const band = resolveSocBand(opts.percent);
  let { minInterval, maxInterval, minChange } = band;

  // Coin primary: prefer coarse when high (save airtime); fine when low.
  if (klass === 'coin') {
    minInterval = Math.max(minInterval, 3600);
    maxInterval = Math.max(maxInterval, 43200);
  }
  // Accu / Li-ion: can afford slightly tighter max when mid/low (SOC swings faster under load).
  if (klass === 'rechargeable' && (band.id === 'low' || band.id === 'critical')) {
    maxInterval = Math.min(maxInterval, 21600);
    minChange = 1;
  }
  // Mains phantom — caller should disable; if asked, park reporting.
  if (klass === 'mains' || opts.mains === true) {
    return {
      minInterval: 3600,
      maxInterval: 65534,
      minChange: 65534,
      band: 'mains',
      chemistryClass: klass,
    };
  }

  return {
    minInterval,
    maxInterval,
    minChange,
    band: band.id,
    chemistryClass: klass,
  };
}

/**
 * Adaptive poll interval (ms). Sleepy / skipBatteryReporting → null (no timer).
 */
function resolvePollIntervalMs(opts = {}) {
  if (opts.sleepy === true || opts.skipProactive === true) return null;
  const chem = normalizeChemistry(opts.chemistry);
  const klass = chemistryClass(chem);
  if (klass === 'coin' && opts.deviceClass === 'button') return null;
  if (klass === 'mains') return null;

  const baseSec = Number(opts.baseIntervalSec);
  const base = Number.isFinite(baseSec) && baseSec > 0 ? baseSec : 14400;
  const band = resolveSocBand(opts.percent);
  let scale = band.pollScale;
  if (klass === 'rechargeable') scale *= 0.85; // accus: slightly more frequent when allowed
  if (klass === 'alkaline') scale *= 1.0;
  if (klass === 'coin') scale *= 1.25; // if we ever poll coin sensors, be gentler

  const ms = Math.round(base * scale * 1000);
  // Clamp: never hotter than 30 min, never colder than 24h for allowed polls
  return Math.max(30 * 60 * 1000, Math.min(24 * 60 * 60 * 1000, ms));
}

/**
 * Dynamic anti-flood for capability commits — finer when SOC low.
 * @returns {{ accept: boolean, reason: string, band: string, minChange: number, throttleMs: number }}
 */
function shouldAcceptBatterySample(opts = {}) {
  const next = Number(opts.next);
  if (!Number.isFinite(next)) {
    return { accept: false, reason: 'invalid', band: 'mid', minChange: 2, throttleMs: 300000 };
  }
  const band = resolveSocBand(opts.prev != null ? opts.prev : next);
  const prev = opts.prev;
  const lastTs = Number(opts.lastTs) || 0;
  const now = Number(opts.now) || Date.now();
  const force = opts.force === true;

  if (force || lastTs === 0 || prev == null || prev === undefined) {
    return { accept: true, reason: 'first_or_force', band: band.id, minChange: band.minChange, throttleMs: band.throttleMs };
  }

  const previous = Number(prev);
  if (!Number.isFinite(previous)) {
    return { accept: true, reason: 'no_prev', band: band.id, minChange: band.minChange, throttleMs: band.throttleMs };
  }

  const change = Math.abs(next - previous);
  const elapsed = now - lastTs;

  if (change >= band.minChange) {
    return { accept: true, reason: 'significant', band: band.id, minChange: band.minChange, throttleMs: band.throttleMs };
  }
  if (elapsed >= band.throttleMs) {
    return { accept: true, reason: 'heartbeat', band: band.id, minChange: band.minChange, throttleMs: band.throttleMs };
  }
  return { accept: false, reason: 'throttled', band: band.id, minChange: band.minChange, throttleMs: band.throttleMs };
}

/**
 * Dual-signal fuse: prefer measured ZCL %, refine with voltage curve when % missing/stale.
 * Does NOT invent linear (V-2.5)/0.5 — expects voltagePercent from UnifiedBatteryHandler curves.
 */
function fusePercentAndVoltage(opts = {}) {
  const zcl = opts.zclPercent;
  const fromV = opts.voltagePercent;
  const zclN = Number(zcl);
  const vN = Number(fromV);
  const hasZcl = Number.isFinite(zclN);
  const hasV = Number.isFinite(vN);

  if (hasZcl && hasV) {
    // When they disagree by >15 pts at mid/high, prefer voltage curve for coin (ZCL often flat 100).
    const band = resolveSocBand(zclN);
    if (opts.preferVoltageOnFlatZcl && zclN >= 95 && vN < 90 && chemistryClass(opts.chemistry) === 'coin') {
      return { percent: Math.round(vN), source: 'voltage_over_flat_zcl', confidence: 0.7 };
    }
    if (Math.abs(zclN - vN) > 15 && (band.id === 'high' || band.id === 'mid')) {
      // Blend lightly toward voltage for coin cells
      if (chemistryClass(opts.chemistry) === 'coin') {
        const blended = Math.round(zclN * 0.6 + vN * 0.4);
        return { percent: blended, source: 'blend_zcl_voltage', confidence: 0.75 };
      }
    }
    return { percent: Math.round(zclN), source: 'zcl', confidence: 0.9 };
  }
  if (hasZcl) return { percent: Math.round(zclN), source: 'zcl', confidence: 0.85 };
  if (hasV) return { percent: Math.round(vN), source: 'voltage', confidence: 0.7 };
  return { percent: null, source: 'none', confidence: 0 };
}

/** True when sample is stale enough that a wake piggyback read is worth it (SED only). */
function shouldPiggybackBatteryRead(opts = {}) {
  if (opts.skipBatteryReporting === true || opts.skipProactive === true) return false;
  const lastTs = Number(opts.lastTs) || 0;
  if (lastTs === 0) return true; // unknown UI — one soft read on first wake OK if policy allows
  const staleMs = Number(opts.staleMs);
  const band = resolveSocBand(opts.percent);
  const defaultStale = band.id === 'critical' || band.id === 'low'
    ? 6 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;
  const limit = Number.isFinite(staleMs) && staleMs > 0 ? staleMs : defaultStale;
  return (Date.now() - lastTs) >= limit;
}

module.exports = {
  SOC_BANDS,
  chemistryClass,
  resolveSocBand,
  buildAdaptiveReportingConfig,
  resolvePollIntervalMs,
  shouldAcceptBatterySample,
  fusePercentAndVoltage,
  shouldPiggybackBatteryRead,
  normalizeChemistry,
};
