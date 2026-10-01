'use strict';

/**
 * P2777 — predictive / smart Flow cards (master only, additive, app-level).
 *
 * Triggers:   battery_depletion_forecast, capability_anomaly, capability_trend, device_offline_risk
 * Conditions: battery_days_remaining_below, capability_trend_is, device_silent_for
 *
 * All statistics are computed locally from the values the devices report:
 *   - battery forecast: least-squares slope of battery % over time (samples kept in the
 *     device store, max 40 points / 45 days, written only when the value changes);
 *   - anomaly: exponentially weighted mean / variance per device+capability, z-score test
 *     (only for capabilities a Flow uses);
 *   - trend: slope (units per hour) over a sliding window of samples (default 60 min);
 *   - offline risk: silence longer than `factor` × the median report interval of the device.
 * Fed by FeatureFlowCards.triggerCapabilityChanged(); everything is soft and never blocks
 * a capability update.
 */

const { GenericDeviceCards, sameDevice } = require('./GenericDeviceCards');
const { safeSetInterval, safeClearInterval } = require('../utils/safe-timers');

const DAY = 86400000;
const HOUR = 3600000;
const BATT_KEY = 'p2777_batt_samples';
const SENSITIVITY_Z = { low: 4, medium: 3, high: 2 };

// ---------- pure statistics ----------

/** Least-squares slope (value per ms) of [[ts, v], …]; null when not enough spread. */
function slope(points) {
  const p = (points || []).filter((x) => Array.isArray(x) && Number.isFinite(x[0]) && Number.isFinite(x[1]));
  if (p.length < 2) {return null;}
  const n = p.length;
  const mx = p.reduce((s, x) => s + x[0], 0) / n;
  const my = p.reduce((s, x) => s + x[1], 0) / n;
  let num = 0; let den = 0;
  for (const [x, y] of p) { num += (x - mx) * (y - my); den += (x - mx) * (x - mx); }
  if (den === 0) {return null;}
  return num / den;
}

/**
 * Days until the battery reaches `emptyAt` % (default 5) from the samples; null when the
 * trend is flat / rising or the samples span less than 2 days.
 */
function forecastDaysRemaining(samples, now = Date.now(), emptyAt = 5) {
  const p = (samples || []).filter((x) => now - x[0] <= 45 * DAY);
  if (p.length < 3) {return null;}
  if (p[p.length - 1][0] - p[0][0] < 2 * DAY) {return null;}
  const s = slope(p);
  if (s === null || s >= 0) {return null;}
  const current = p[p.length - 1][1];
  if (current <= emptyAt) {return 0;}
  const days = (current - emptyAt) / (-s * DAY);
  return Math.max(0, Math.round(days * 10) / 10);
}

/** Append a battery sample only when the value changed; keeps the newest 40 / 45 days. */
function pushBatterySample(samples, pct, now = Date.now()) {
  const out = Array.isArray(samples) ? samples.slice() : [];
  const v = Number(pct);
  if (!Number.isFinite(v) || v < 0 || v > 100) {return out;}
  const last = out[out.length - 1];
  if (last && last[1] === v) {return out;}
  out.push([now, v]);
  while (out.length > 40 || (out.length && now - out[0][0] > 45 * DAY)) {out.shift();}
  return out;
}

/** EWMA mean/variance update; returns { mean, variance, n }. */
function ewma(stats, x, alpha = 0.1) {
  if (!stats || !Number.isFinite(stats.mean)) {return { mean: x, variance: 0, n: 1 };}
  const diff = x - stats.mean;
  const incr = alpha * diff;
  return { mean: stats.mean + incr, variance: (1 - alpha) * (stats.variance + diff * incr), n: stats.n + 1 };
}

/** z-score of x against stats (null while warming up: < 20 samples or no variance). */
function zScore(stats, x) {
  if (!stats || stats.n < 20) {return null;}
  const sd = Math.sqrt(stats.variance);
  if (!Number.isFinite(sd) || sd <= 1e-9) {return null;}
  return (x - stats.mean) / sd;
}

/** Trend over a window: units per hour, and a label rising / falling / stable. */
function trend(samples, now = Date.now(), windowMs = HOUR, stableBand = 0) {
  const p = (samples || []).filter((x) => now - x[0] <= windowMs);
  if (p.length < 3 || p[p.length - 1][0] - p[0][0] < windowMs / 4) {return { perHour: null, label: 'unknown' };}
  const s = slope(p);
  if (s === null) {return { perHour: null, label: 'unknown' };}
  const perHour = s * HOUR;
  const band = Math.abs(Number(stableBand) || 0);
  const label = perHour > band ? 'rising' : perHour < -band ? 'falling' : 'stable';
  return { perHour: Math.round(perHour * 1000) / 1000, label };
}

function median(arr) {
  const a = (arr || []).filter(Number.isFinite).slice().sort((x, y) => x - y);
  if (!a.length) {return null;}
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// ---------- cards ----------

class PredictiveFlowCards extends GenericDeviceCards {
  constructor(host) {
    super(host);
    this._stats = new Map(); // `${id}:${cap}` -> ewma
    this._series = new Map(); // `${id}:${cap}` -> [[ts, v]] (2 h max)
    this._seen = new Map(); // deviceId -> { last, intervals: [] }
    this._batt = new Map(); // deviceId -> samples (mirror of the store)
    this._lastForecast = new Map(); // deviceId -> days
    this._riskFired = new Map(); // deviceId -> Set(factor)
    this._crossedTrend = new Map(); // `${id}:${cap}:${dir}:${rate}` -> bool
  }

  register() {
    const numAC = (q, args) => require('./GenericDeviceCards').numericCapabilities(args && args.device, q);
    const capId = (a) => a && typeof a === 'object' ? a.id : a;
    const idOf = (d) => { try { return (d.getData && d.getData().id) || d.id; } catch (_e) { return null; } };

    this._reg('trigger', 'battery_depletion_forecast', async (args, state) =>
      sameDevice(args.device, state.deviceId) && state.days <= Number(args.days)
      && (state.previous === null || state.previous > Number(args.days)));
    this._reg('trigger', 'capability_anomaly', async (args, state) =>
      sameDevice(args.device, state.deviceId) && capId(args.capability) === state.capability
      && Math.abs(state.z) >= (SENSITIVITY_Z[args.sensitivity] || 3), { capability: numAC });
    this._reg('trigger', 'capability_trend', async (args, state) =>
      sameDevice(args.device, state.deviceId) && capId(args.capability) === state.capability
      && state.key === this._trendKey(state.deviceId, args), { capability: numAC });
    this._reg('trigger', 'device_offline_risk', async (args, state) =>
      sameDevice(args.device, state.deviceId) && Number(args.factor) === state.factor);

    this._reg('condition', 'battery_days_remaining_below', async (args) => {
      const days = this.forecastFor(args.device);
      if (days === null) {return false;}
      return days < Number(args.days);
    });
    this._reg('condition', 'capability_trend_is', async (args) => {
      const cap = capId(args.capability);
      if (!args.device?.hasCapability?.(cap)) {throw this.err('no_capability', { cap });}
      const s = this._series.get(`${idOf(args.device)}:${cap}`) || [];
      return trend(s, Date.now(), Number(args.window || 60) * 60000).label === args.trend;
    }, { capability: numAC });
    this._reg('condition', 'device_silent_for', async (args) => {
      const seen = this._seen.get(idOf(args.device));
      const last = seen ? seen.last : null;
      if (!last) {return false;}
      return Date.now() - last > Number(args.minutes) * 60000;
    });

    for (const id of ['capability_anomaly', 'capability_trend', 'device_offline_risk', 'battery_depletion_forecast']) {this._argsFor(id);}
    // Offline-risk check every 5 minutes, only when a Flow uses the card.
    try { this._riskTimer = safeSetInterval(this.homey, () => this._checkOfflineRisk(), 5 * 60000); } catch (_e) { /* soft */ }
  }

  destroy() {
    try { if (this._riskTimer) {safeClearInterval(this.homey, this._riskTimer);} } catch (_e) { /* soft */ }
  }

  _trendKey(deviceId, args) {
    const cap = args.capability && typeof args.capability === 'object' ? args.capability.id : args.capability;
    return `${deviceId}:${cap}:${args.direction}:${Number(args.rate)}:${Number(args.window || 60)}`;
  }

  forecastFor(device) {
    if (!device) {return null;}
    let id = null;
    try { id = (device.getData && device.getData().id) || device.id; } catch (_e) { id = null; }
    let s = this._batt.get(id);
    if (!s) {
      try { s = device.getStoreValue?.(BATT_KEY) || []; } catch (_e) { s = []; }
      this._batt.set(id, s);
    }
    return forecastDaysRemaining(s);
  }

  onCapabilityChanged(device, deviceId, capability, value) {
    try {
      const now = Date.now();
      // last-seen + report interval (all devices, tiny)
      const seen = this._seen.get(deviceId) || { last: 0, intervals: [] };
      if (seen.last) {
        seen.intervals.push(now - seen.last);
        if (seen.intervals.length > 50) {seen.intervals.shift();}
      }
      seen.last = now;
      this._seen.set(deviceId, seen);
      this._riskFired.delete(deviceId);

      const x = typeof value === 'boolean' ? null : Number(value);
      if (x === null || !Number.isFinite(x)) {return;}

      if (capability === 'measure_battery') {this._onBattery(device, deviceId, x, now);}

      const key = `${deviceId}:${capability}`;
      const capMatch = (a) => {
        const c = a.capability && typeof a.capability === 'object' ? a.capability.id : a.capability;
        return c === capability;
      };

      if (this._wanted('capability_anomaly', deviceId, capMatch)) {
        const st = this._stats.get(key);
        const z = zScore(st, x);
        this._stats.set(key, ewma(st, x));
        if (z !== null && Math.abs(z) >= 2) {
          this._fire('capability_anomaly', {
            value: x, expected: Math.round(st.mean * 100) / 100, deviation: Math.round(z * 100) / 100, capability,
          }, { deviceId, capability, z });
        }
      }

      const wantTrend = this._wanted('capability_trend', deviceId, capMatch);
      if (wantTrend || this._series.has(key)) {
        const s = this._series.get(key) || [];
        s.push([now, x]);
        while (s.length > 500 || (s.length && now - s[0][0] > 2 * HOUR)) {s.shift();}
        this._series.set(key, s);
      }
      if (wantTrend) {
        for (const a of this._argsFor('capability_trend').filter((v) => sameDevice(v.device, deviceId) && capMatch(v))) {
          const tk = this._trendKey(deviceId, a);
          const tr = trend(this._series.get(key), now, Number(a.window || 60) * 60000);
          const rate = Math.abs(Number(a.rate) || 0);
          const hit = tr.perHour !== null && (a.direction === 'falling' ? tr.perHour <= -rate : tr.perHour >= rate);
          const was = this._crossedTrend.get(tk) === true;
          this._crossedTrend.set(tk, hit);
          if (hit && !was) {
            this._fire('capability_trend', { rate_per_hour: tr.perHour, value: x, capability }, { deviceId, capability, key: tk });
          }
        }
      }
    } catch (_e) { /* soft */ }
  }

  _onBattery(device, deviceId, pct, now) {
    let s = this._batt.get(deviceId);
    if (!s) {
      try { s = device?.getStoreValue?.(BATT_KEY) || []; } catch (_e) { s = []; }
    }
    const next = pushBatterySample(s, pct, now);
    if (next.length !== s.length || (next.length && s.length && next[next.length - 1] !== s[s.length - 1])) {
      try { const p = device?.setStoreValue?.(BATT_KEY, next); if (p && p.catch) {p.catch(() => {});} } catch (_e) { /* soft */ }
    }
    this._batt.set(deviceId, next);
    const days = forecastDaysRemaining(next, now);
    const prev = this._lastForecast.has(deviceId) ? this._lastForecast.get(deviceId) : null;
    if (days !== null) {
      this._lastForecast.set(deviceId, days);
      if (this._wanted('battery_depletion_forecast', deviceId, (a) => days <= Number(a.days) && (prev === null || prev > Number(a.days)))) {
        this._fire('battery_depletion_forecast', { days_remaining: days, battery: pct }, { deviceId, days, previous: prev });
      }
    }
  }

  _checkOfflineRisk(now = Date.now()) {
    try {
      const args = this._argsFor('device_offline_risk');
      if (!args.length) {return;}
      for (const [deviceId, seen] of this._seen) {
        if (seen.intervals.length < 5) {continue;}
        const fired = this._riskFired.get(deviceId) || new Set();
        const med = median(seen.intervals);
        if (!med) {continue;}
        const silent = now - seen.last;
        for (const a of args.filter((v) => sameDevice(v.device, deviceId))) {
          const factor = Number(a.factor) || 3;
          if (!fired.has(factor) && silent > Math.max(5 * 60000, med * factor)) {
            fired.add(factor);
            this._riskFired.set(deviceId, fired);
            this._fire('device_offline_risk', {
              silent_minutes: Math.round(silent / 60000), usual_interval_minutes: Math.round(med / 600) / 100,
            }, { deviceId, factor });
          }
        }
      }
    } catch (_e) { /* soft */ }
  }
}

module.exports = {
  PredictiveFlowCards, slope, forecastDaysRemaining, pushBatterySample, ewma, zScore, trend, median, SENSITIVITY_Z, BATT_KEY,
};
