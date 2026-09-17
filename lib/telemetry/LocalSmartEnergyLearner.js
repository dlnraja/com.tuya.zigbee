'use strict';
/**
 * LocalSmartEnergyLearner (P2560) — on-device habit + power learning (no cloud AI).
 *
 * WHY(P215):
 * - Pourquoi: naive on→nominal_power ignores real draw, dim/color curves, duty cycle, and
 *   measured-vs-estimate drift; users want predictive/smart energy without cloud.
 * - Comment: EMA of measured power when ON; dim^gamma; soft color factor; blend manufacturer
 *   / driver / energy-consumption-reference with learned W; on-ratio habits → predicted kWh.
 * - Pour qui: Homey users (flow conditions + Insights) + BOTH tracks.
 * - Quand: every energy estimate tick + when a real measure_power arrives while ON.
 * - Contre quoi: flat nominal-only estimates; treating profile fill as meter truth.
 *
 * Dual-app: BOTH (reliability of estimates). Store keys stay compact for Homey RAM.
 */

const ALPHA_FAST = 0.25;
const ALPHA_SLOW = 0.08;
const MIN_SAMPLES_TRUST = 4;
const MAX_SAMPLES_TRACK = 500;
const DEFAULT_GAMMA = 1.75; // LED-ish; resistive ~1.0 via setting

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function round(n, digits = 3) {
  const f = 10 ** digits;
  return Math.round(Number(n) * f) / f;
}

function ema(prev, next, alpha) {
  if (!isFiniteNumber(next)) return prev;
  if (!isFiniteNumber(prev)) return next;
  return prev * (1 - alpha) + next * alpha;
}

/**
 * Soft relative factor for light_mode / color — RGB typically draws more than WW/CCT.
 * Returns multiplier in ~0.85–1.15 (never invents absolute watts).
 */
function colorModeFactor(lightMode, hue, saturation) {
  const mode = String(lightMode || '').toLowerCase();
  let f = 1;
  if (/rgb|color|colour|hsv/.test(mode)) f = 1.08;
  else if (/ww|warm|cct|white|temperature/.test(mode)) f = 0.95;
  else if (/scene|effect|party/.test(mode)) f = 1.12;

  if (isFiniteNumber(saturation) && saturation > 0.55 && isFiniteNumber(hue)) {
    f *= 1.03; // saturated color ≈ slightly higher LED drive
  }
  return clamp(f, 0.85, 1.18);
}

/**
 * Dim→power curve. Homey dim is 0–1.
 */
function dimPowerFactor(dim, gamma = DEFAULT_GAMMA) {
  if (!isFiniteNumber(dim)) return 1;
  const d = clamp(dim, 0, 1);
  if (d <= 0.001) return 0;
  const g = isFiniteNumber(gamma) && gamma > 0.4 && gamma < 3.5 ? gamma : DEFAULT_GAMMA;
  return Math.pow(d, g);
}

class LocalSmartEnergyLearner {
  /**
   * @param {object} device Homey device-like (getStoreValue/setStoreValue/getCapabilityValue/getSetting)
   */
  constructor(device) {
    this.device = device;
  }

  _get(key, fallback = null) {
    try {
      const v = this.device.getStoreValue?.(key);
      return v === undefined || v === null ? fallback : v;
    } catch (_e) {
      return fallback;
    }
  }

  async _set(key, value) {
    try {
      if (typeof this.device.setStoreValue === 'function') {
        await this.device.setStoreValue(key, value);
      }
    } catch (_e) { /* ignore */ }
  }

  _cap(id) {
    try {
      return this.device.getCapabilityValue?.(id);
    } catch (_e) {
      return undefined;
    }
  }

  _setting(keys, fallback) {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) {
      try {
        const v = this.device.getSetting?.(k);
        if (isFiniteNumber(Number(v))) return Number(v);
      } catch (_e) { /* next */ }
    }
    return fallback;
  }

  /**
   * Observe a measured (or high-trust) power sample while the load is ON.
   * Call from estimator when provenance is measured.
   */
  async observeMeasuredPower(watts, { isOn = true, now = Date.now() } = {}) {
    if (!isOn || !isFiniteNumber(watts) || watts < 0.05) return null;
    const prev = Number(this._get('smart_learn_power_ema_w', NaN));
    const samples = Math.min(MAX_SAMPLES_TRACK, (Number(this._get('smart_learn_power_samples', 0)) || 0) + 1);
    const alpha = samples < MIN_SAMPLES_TRUST ? ALPHA_FAST : ALPHA_SLOW;
    const next = round(ema(prev, watts, alpha), 3);
    await this._set('smart_learn_power_ema_w', next);
    await this._set('smart_learn_power_samples', samples);
    await this._set('smart_learn_power_last_at', now);

    // Track peak for predictive ceiling
    const peak = Number(this._get('smart_learn_power_peak_w', 0)) || 0;
    if (watts > peak) await this._set('smart_learn_power_peak_w', round(watts, 2));

    return { emaW: next, samples };
  }

  /**
   * Compare estimated vs measured and soft-correct a bias factor (0.7–1.35).
   */
  async observeEstimateBias(estimatedW, measuredW) {
    if (!isFiniteNumber(estimatedW) || estimatedW < 0.2) return null;
    if (!isFiniteNumber(measuredW) || measuredW < 0.05) return null;
    const ratio = clamp(measuredW / estimatedW, 0.5, 1.8);
    const prev = Number(this._get('smart_learn_bias', 1));
    const next = round(ema(isFiniteNumber(prev) ? prev : 1, ratio, ALPHA_SLOW), 4);
    await this._set('smart_learn_bias', clamp(next, 0.7, 1.35));
    return next;
  }

  /**
   * Update on-duty habit from usage counters (ms).
   */
  async refreshHabitsFromUsage({ onMs, offMs, now = Date.now() } = {}) {
    const on = Math.max(0, Number(onMs) || 0);
    const off = Math.max(0, Number(offMs) || 0);
    const total = on + off;
    if (total < 60_000) return null; // need ≥1 min history
    const ratio = on / total;
    const prev = Number(this._get('smart_learn_on_ratio', NaN));
    const next = round(ema(prev, ratio, ALPHA_SLOW), 4);
    await this._set('smart_learn_on_ratio', clamp(next, 0, 1));
    await this._set('smart_learn_habit_updated_at', now);

    // Mean on-session length (approx from last elapsed when transitioning)
    return { onRatio: next };
  }

  /**
   * Manufacturer / driver / energy-reference nominal (caller may pass refW).
   */
  resolveSpecWatts({ driverClass, productHints, fallback = 9 } = {}) {
    const setting = this._setting(['nominal_power', 'power_estimate_w', 'estimated_power_w'], NaN);
    if (isFiniteNumber(setting) && setting > 0) return setting;

    // Compact local table — complements data/energy-consumption-reference.json
    const cls = String(driverClass || productHints || '').toLowerCase();
    if (/dimmer|bulb|light|lamp|rgb|led/.test(cls)) return 9;
    if (/plug|socket|outlet/.test(cls)) return 0; // unknown load
    if (/curtain|blind|cover|motor/.test(cls)) return 25;
    if (/radar|presence|pir|motion/.test(cls)) return 1.2;
    if (/thermostat|trv|heater|radiator/.test(cls)) return 2.5;
    if (/fan/.test(cls)) return 40;
    if (/switch|gang|relay/.test(cls)) return 0.8;
    return fallback;
  }

  /**
   * Smart instantaneous power estimate (W).
   * Combines: habits + dim/color + learned EMA + manufacturer/spec + bias.
   */
  estimateSmartPowerW({
    isOn,
    standbyW = 0.3,
    specW = null,
    driverClass = null,
  } = {}) {
    if (!isOn) return round(Math.max(0, standbyW), 3);

    const dim = this._cap('dim');
    const lightMode = this._cap('light_mode');
    const hue = this._cap('light_hue');
    const sat = this._cap('light_saturation');
    const gamma = this._setting(['power_dim_gamma', 'dim_power_gamma'], DEFAULT_GAMMA);

    const samples = Number(this._get('smart_learn_power_samples', 0)) || 0;
    const learned = Number(this._get('smart_learn_power_ema_w', NaN));
    const bias = clamp(Number(this._get('smart_learn_bias', 1)) || 1, 0.7, 1.35);
    const baseSpec = isFiniteNumber(specW) && specW > 0
      ? specW
      : this.resolveSpecWatts({ driverClass });

    // Trust weight: more measured samples → prefer learned EMA over catalog
    const learnWeight = clamp(samples / (MIN_SAMPLES_TRUST * 3), 0, 0.85);
    let nominal = baseSpec;
    if (isFiniteNumber(learned) && learned > 0) {
      nominal = baseSpec * (1 - learnWeight) + learned * learnWeight;
    }

    const dimF = dimPowerFactor(dim, gamma);
    const colorF = colorModeFactor(lightMode, hue, sat);
    let watts = nominal * dimF * colorF * bias;

    // If dim≈0 but onoff true (some MCU), treat as near-standby
    if (isFiniteNumber(dim) && dim < 0.01) {
      watts = Math.min(watts, Math.max(standbyW, nominal * 0.02));
    }

    return round(Math.max(0, watts), 3);
  }

  /**
   * Predict next-hour energy (kWh) from on-ratio habit × smart power.
   * Origin should be tagged `predicted` by caller.
   */
  predictNextHourKwh({ powerW, onRatio = null } = {}) {
    const ratio = isFiniteNumber(onRatio)
      ? onRatio
      : Number(this._get('smart_learn_on_ratio', NaN));
    const r = isFiniteNumber(ratio) ? clamp(ratio, 0, 1) : 0.35; // soft prior if no habit yet
    const p = isFiniteNumber(powerW) ? Math.max(0, powerW) : this.estimateSmartPowerW({ isOn: true });
    // Expected energy if current "on" power applies for ratio of the hour
    return round((p * r) / 1000, 5);
  }

  /** Snapshot for flow tokens / debug (no PII). */
  snapshot() {
    return {
      emaW: this._get('smart_learn_power_ema_w', null),
      samples: this._get('smart_learn_power_samples', 0) || 0,
      bias: this._get('smart_learn_bias', 1),
      onRatio: this._get('smart_learn_on_ratio', null),
      peakW: this._get('smart_learn_power_peak_w', null),
    };
  }
}

module.exports = LocalSmartEnergyLearner;
module.exports.dimPowerFactor = dimPowerFactor;
module.exports.colorModeFactor = colorModeFactor;
module.exports.ema = ema;
