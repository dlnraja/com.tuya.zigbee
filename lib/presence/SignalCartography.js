'use strict';

/**
 * SignalCartography - Zigbee LQI-based signal mapping engine
 *
 * Builds a live radio map of the home from device-reported LQI values.
 * Uses exponential moving averages, per-device baselines, and coverage
 * analytics to identify weak zones and support room estimation.
 *
 * Inputs:
 *   - lastHopLqi from Zigbee nodes
 *   - manual/manual presence inputs (optional boost)
 *   - optional anchor device positions supplied by the user
 */

const EventEmitter = require('events');

/** LQI quality buckets */
const LQI_BAND = Object.freeze({
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
  BAD: 'bad',
});

const BAND_RANGES = Object.freeze([
  { band: LQI_BAND.EXCELLENT, min: 200, max: 255 },
  { band: LQI_BAND.GOOD, min: 150, max: 199 },
  { band: LQI_BAND.FAIR, min: 100, max: 149 },
  { band: LQI_BAND.POOR, min: 50, max: 99 },
  { band: LQI_BAND.BAD, min: 0, max: 49 },
]);

function clampNumber(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function exponentialMovingAverage(previous, sample, alpha) {
  if (typeof previous !== 'number' || !Number.isFinite(previous)) return sample;
  if (typeof sample !== 'number' || !Number.isFinite(sample)) return previous;
  const a = clampNumber(alpha, 0, 1);
  return previous * (1 - a) + sample * a;
}

function bandFromLqi(lqi) {
  const v = clampNumber(lqi, 0, 255);
  if (v >= 200) return LQI_BAND.EXCELLENT;
  if (v >= 150) return LQI_BAND.GOOD;
  if (v >= 100) return LQI_BAND.FAIR;
  if (v >= 50) return LQI_BAND.POOR;
  return LQI_BAND.BAD;
}

class SignalCartography extends EventEmitter {
  constructor(options = {}) {
    super();

    this._logger = typeof options.logger === 'function' ? options.logger : () => {};
    this._maxHistoryPerDevice = clampNumber(options.maxHistoryPerDevice || 120, 10, 1000);
    this._emaAlpha = clampNumber(options.emaAlpha || 0.15, 0.01, 0.6);
    this._nowFn = typeof options.now === 'function' ? options.now : () => Date.now();

    this._devices = new Map();
    this._anchorDevices = new Set(options.anchorDeviceIds || []);
  }

  /**
   * Register a device for cartography.
   */
  registerDevice(deviceId, meta = {}) {
    if (!deviceId) return;
    if (this._devices.has(deviceId)) {
      const existing = this._devices.get(deviceId);
      existing.meta = Object.assign({}, existing.meta, meta);
      return;
    }

    this._devices.set(deviceId, {
      meta: {
        driverId: meta.driverId || null,
        zoneId: meta.zoneId || null,
        role: meta.role || 'unknown',
        label: meta.label || deviceId,
      },
      lastLqi: null,
      ema: null,
      samples: [],
      lastUpdated: 0,
    });
  }

  /**
   * Update the metadata for an already registered device.
   */
  updateDeviceMeta(deviceId, meta) {
    if (!deviceId || !this._devices.has(deviceId)) return;
    const entry = this._devices.get(deviceId);
    entry.meta = Object.assign({}, entry.meta, meta);
  }

  /**
   * Mark some devices as anchor routers (known position references).
   */
  setAnchors(anchorDeviceIds = []) {
    this._anchorDevices = new Set(anchorDeviceIds || []);
  }

  /**
   * Add an LQI sample.
   */
  recordLqi(deviceId, lqi, timestamp = this._nowFn()) {
    if (!deviceId) return;
    this.registerDevice(deviceId);

    const entry = this._devices.get(deviceId);
    const sample = {
      lqi: clampNumber(lqi, 0, 255),
      ts: timestamp,
      band: bandFromLqi(lqi),
    };

    entry.samples.push(sample);
    while (entry.samples.length > this._maxHistoryPerDevice) {
      entry.samples.shift();
    }

    entry.lastLqi = sample.lqi;
    entry.ema = exponentialMovingAverage(entry.ema, sample.lqi, this._emaAlpha);
    entry.lastUpdated = timestamp;

    this.emit('lqi_sample', { deviceId, ...sample, ema: Math.round((entry.ema || 0) * 10) / 10 });
  }

  /**
   * Convenience helper: ingest from device.zclNode / lastHopLqi style events.
   */
  ingestFromNode(deviceId, node = {}) {
    const lqi = typeof node.lqi === 'number'
      ? node.lqi
      : typeof node.lastHopLqi === 'number'
        ? node.lastHopLqi
        : null;
    if (lqi === null) return false;
    this.recordLqi(deviceId, lqi);
    return true;
  }

  /**
   * Remove a device from the map.
   */
  removeDevice(deviceId) {
    return this._devices.delete(deviceId);
  }

  /**
   * Get device summary.
   */
  getDeviceSummary(deviceId) {
    const entry = this._devices.get(deviceId);
    if (!entry) return null;

    const samples = entry.samples;
    const recentWindowMs = 5 * 60 * 1000;
    const now = this._nowFn();
    const recent = samples.filter(s => now - s.ts <= recentWindowMs);

    const bandCounts = { excellent: 0, good: 0, fair: 0, poor: 0, bad: 0 };
    let minLqi = 255;
    let maxLqi = 0;

    for (const s of samples) {
      bandCounts[s.band] = (bandCounts[s.band] || 0) + 1;
      if (s.lqi < minLqi) minLqi = s.lqi;
      if (s.lqi > maxLqi) maxLqi = s.lqi;
    }

    const totalSamples = samples.length || 0;
    const overallScore = totalSamples > 0
      ? Math.round(Object.values(bandCounts).reduce((sum, c) => sum + c, 0) === 0 ? 0 : (
        (bandCounts.excellent * 100 + bandCounts.good * 75 + bandCounts.fair * 50 + bandCounts.poor * 25 + bandCounts.bad * 0) /
        totalSamples
      ))
      : 0;

    const stability = totalSamples > 1
      ? Math.round(Math.max(0, 100 - varianceOf(samples.map(s => s.lqi)) * 0.5))
      : null;

    return {
      deviceId,
      meta: entry.meta,
      lastLqi: entry.lastLqi,
      ema: entry.ema !== null ? Math.round(entry.ema * 10) / 10 : null,
      minLqi: totalSamples > 0 ? minLqi : null,
      maxLqi: totalSamples > 0 ? maxLqi : null,
      totalSamples,
      recentSamples: recent.length,
      lastUpdated: entry.lastUpdated,
      bandCounts,
      overallScore,
      stability,
      quality: bandFromLqi(entry.lastLqi ?? 0),
    };
  }

  /**
   * Network-wide summary.
   */
  getNetworkSummary() {
    const devices = [];
    const bandTotals = { excellent: 0, good: 0, fair: 0, poor: 0, bad: 0 };
    let unstableCount = 0;
    let weakCount = 0;

    for (const deviceId of this._devices.keys()) {
      const summary = this.getDeviceSummary(deviceId);
      if (!summary) continue;
      devices.push(summary);
      for (const key of Object.keys(bandTotals)) {
        bandTotals[key] += summary.bandCounts[key] || 0;
      }
      if (summary.stability !== null && summary.stability < 50) unstableCount += 1;
      if (summary.lastLqi !== null && summary.lastLqi < 100) weakCount += 1;
    }

    return {
      deviceCount: devices.length,
      anchorCount: this._anchorDevices.size,
      bandTotals,
      unstableDeviceCount: unstableCount,
      weakDeviceCount: weakCount,
      devices,
    };
  }

  /**
   * Compute a pseudo coverage score for the monitored space.
   * This is a relative signal-space metric, not a physical metric.
   */
  computeCoverageStats() {
    const summaries = [];
    for (const deviceId of this._devices.keys()) {
      summaries.push(this.getDeviceSummary(deviceId));
    }

    if (summaries.length === 0) {
      return {
        deviceCount: 0,
        averageLqi: null,
        medianLqi: null,
        coverageScore: 0,
        deadZoneCount: 0,
        weakZones: [],
      };
    }

    const emaValues = summaries
      .map(s => (typeof s.ema === 'number' ? s.ema : s.lastLqi))
      .filter(v => typeof v === 'number' && Number.isFinite(v));

    const lqiValues = summaries
      .map(s => (typeof s.lastLqi === 'number' ? s.lastLqi : null))
      .filter(v => typeof v === 'number');

    const averageEma = emaValues.length > 0 ? emaValues.reduce((a, b) => a + b, 0) / emaValues.length : null;
    const medianLqi = lqiValues.length > 0 ? median(lqiValues) : null;

    const weakZones = summaries
      .filter(s => (s.ema ?? s.lastLqi ?? 255) < 120)
      .map(s => ({
        deviceId: s.deviceId,
        label: s.meta?.label || s.deviceId,
        zoneId: s.meta?.zoneId || null,
        score: Math.round((s.ema ?? s.lastLqi ?? 0) * 10) / 10,
        quality: s.quality,
      }));

    return {
      deviceCount: summaries.length,
      averageLqi: averageEma !== null ? Math.round(averageEma * 10) / 10 : null,
      medianLqi,
      coverageScore: averageEma !== null ? Math.round((averageEma / 255) * 100) : 0,
      deadZoneCount: weakZones.filter(z => z.score < 70).length,
      weakZones,
    };
  }

  destroy() {
    this._devices.clear();
    this._anchorDevices.clear();
    this.removeAllListeners();
  }
}

function median(values) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function varianceOf(values) {
  if (!values || values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}

module.exports = SignalCartography;
module.exports.LQI_BAND = LQI_BAND;
module.exports.bandFromLqi = bandFromLqi;
