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
// P2778: learned anomaly / trend / report-rhythm state, persisted per device (compact, throttled).
const LEARN_KEY = 'p2778_learn';
const LEARN_SAVE_EVERY_MS = 15 * 60000;

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

const r3 = (v) => Math.round(v * 1000) / 1000;

/**
 * Compact serialisable snapshot of one device's learned state.
 * { v:1, t, s:{cap:[mean,variance,n]}, r:{l:lastSeen,i:[intervalSeconds…]}, tr:{cap:[[tsSeconds,value]…]} }
 * Intervals keep the newest 20, series keep the last 2 h down-sampled to at most 30 points.
 */
function encodeLearned({ stats = {}, seen = null, series = {} } = {}, now = Date.now()) {
  const out = { v: 1, t: Math.round(now / 1000), s: {}, tr: {} };
  for (const [cap, st] of Object.entries(stats)) {
    if (st && Number.isFinite(st.mean) && Number.isFinite(st.variance)) {out.s[cap] = [r3(st.mean), r3(st.variance), Math.min(st.n || 0, 10000)];}
  }
  if (seen && seen.last) {
    out.r = { l: Math.round(seen.last / 1000), i: (seen.intervals || []).slice(-20).map((ms) => Math.round(ms / 1000)) };
  }
  for (const [cap, pts] of Object.entries(series)) {
    const p = (pts || []).filter((x) => now - x[0] <= 2 * HOUR);
    if (p.length < 2) {continue;}
    const step = Math.max(1, Math.ceil(p.length / 30));
    const ds = p.filter((_x, i) => i % step === 0 || i === p.length - 1);
    out.tr[cap] = ds.map(([ts, v]) => [Math.round(ts / 1000), r3(v)]);
  }
  return out;
}

/** Inverse of encodeLearned; tolerant of garbage (returns empty parts). */
function decodeLearned(raw, now = Date.now()) {
  const res = { stats: {}, seen: null, series: {} };
  if (!raw || typeof raw !== 'object' || raw.v !== 1) {return res;}
  for (const [cap, a] of Object.entries(raw.s || {})) {
    if (Array.isArray(a) && a.length === 3 && a.every(Number.isFinite)) {res.stats[cap] = { mean: a[0], variance: a[1], n: a[2] };}
  }
  if (raw.r && Number.isFinite(raw.r.l)) {
    res.seen = { last: raw.r.l * 1000, intervals: (Array.isArray(raw.r.i) ? raw.r.i : []).filter(Number.isFinite).map((x) => x * 1000) };
  }
  for (const [cap, pts] of Object.entries(raw.tr || {})) {
    if (!Array.isArray(pts)) {continue;}
    const p = pts.filter((x) => Array.isArray(x) && Number.isFinite(x[0]) && Number.isFinite(x[1]))
      .map(([ts, v]) => [ts * 1000, v]).filter((x) => now - x[0] <= 2 * HOUR);
    if (p.length) {res.series[cap] = p;}
  }
  return res;
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
    this._hydrated = new Set(); // deviceIds whose persisted state was loaded
    this._lastSave = new Map(); // deviceId -> ts of last persist
    this._dirty = new Set();
    this._startedAt = Date.now();
  }

  _devId(device) {
    try { return (device && device.getData && device.getData().id) || (device && device.id) || null; } catch (_e) { return null; }
  }

  /** Load the persisted learned state once per device; never overwrites newer in-memory state. */
  _hydrate(device, deviceId = this._devId(device)) {
    if (!deviceId || this._hydrated.has(deviceId) || !device) {return;}
    this._hydrated.add(deviceId);
    let raw = null;
    try { raw = device.getStoreValue?.(LEARN_KEY); } catch (_e) { raw = null; }
    const d = decodeLearned(raw);
    for (const [cap, st] of Object.entries(d.stats)) {
      const k = `${deviceId}:${cap}`;
      if (!this._stats.has(k)) {this._stats.set(k, st);}
    }
    for (const [cap, pts] of Object.entries(d.series)) {
      const k = `${deviceId}:${cap}`;
      if (!this._series.has(k)) {this._series.set(k, pts);}
    }
    if (d.seen && !this._seen.has(deviceId)) {
      // Silence is never counted from before this app start (the stored last-seen can be up to
      // one save period old), so a restart cannot produce a false offline-risk / silent result.
      this._seen.set(deviceId, { last: Math.max(d.seen.last, this._startedAt), intervals: d.seen.intervals.slice(-50) });
    }
  }

  _snapshot(deviceId) {
    const stats = {}; const series = {};
    const pre = `${deviceId}:`;
    for (const [k, v] of this._stats) {if (k.startsWith(pre)) {stats[k.slice(pre.length)] = v;}}
    for (const [k, v] of this._series) {if (k.startsWith(pre)) {series[k.slice(pre.length)] = v;}}
    return { stats, series, seen: this._seen.get(deviceId) || null };
  }

  /** Persist at most once per LEARN_SAVE_EVERY_MS per device, only when something changed. */
  _maybePersist(device, deviceId, now = Date.now(), force = false) {
    if (!device || !deviceId || !this._dirty.has(deviceId)) {return false;}
    const last = this._lastSave.get(deviceId) || 0;
    if (!force && now - last < LEARN_SAVE_EVERY_MS) {return false;}
    this._lastSave.set(deviceId, now);
    this._dirty.delete(deviceId);
    try {
      const p = device.setStoreValue?.(LEARN_KEY, encodeLearned(this._snapshot(deviceId), now));
      if (p && p.catch) {p.catch(() => {});}
    } catch (_e) { /* soft */ }
    return true;
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
      this._hydrate(args.device);
      const s = this._series.get(`${idOf(args.device)}:${cap}`) || [];
      return trend(s, Date.now(), Number(args.window || 60) * 60000).label === args.trend;
    }, { capability: numAC });
    this._reg('condition', 'device_silent_for', async (args) => {
      this._hydrate(args.device);
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
    // Best-effort final flush of anything learned since the last throttled save.
    try {
      for (const deviceId of [...this._dirty]) {
        const dev = this._devices && this._devices.get(deviceId);
        if (dev) {this._maybePersist(dev, deviceId, Date.now(), true);}
      }
    } catch (_e) { /* soft */ }
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
      this._hydrate(device, deviceId);
      if (device) {(this._devices = this._devices || new Map()).set(deviceId, device);}
      // last-seen + report interval (all devices, tiny)
      const seen = this._seen.get(deviceId) || { last: 0, intervals: [] };
      if (seen.last) {
        seen.intervals.push(now - seen.last);
        if (seen.intervals.length > 50) {seen.intervals.shift();}
      }
      seen.last = now;
      this._seen.set(deviceId, seen);
      this._riskFired.delete(deviceId);
      // Persist only for devices used by a learning card in at least one Flow.
      if (['capability_anomaly', 'capability_trend', 'device_offline_risk'].some((id) => this._wanted(id, deviceId))) {
        this._dirty.add(deviceId);
      }

      const x = typeof value === 'boolean' ? null : Number(value);
      if (x === null || !Number.isFinite(x)) {this._maybePersist(device, deviceId, now); return;}

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
      this._maybePersist(device, deviceId, now);
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
      // Devices used in a Flow but silent since the restart: load their learned rhythm.
      for (const a of args) {this._hydrate(a.device);}
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
  LEARN_KEY, LEARN_SAVE_EVERY_MS, encodeLearned, decodeLearned,
};
