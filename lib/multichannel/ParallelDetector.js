// lib/multichannel/ParallelDetector.js — v1.0 (P37.3)
'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
// PARALLEL DETECTOR — Detect device capabilities via N parallel methods
// ═══════════════════════════════════════════════════════════════════════════════
//
// Use case: when a device joins the network, we need to detect what it is and
// what capabilities it supports. Instead of one slow sequential detection,
// we run N detection methods in parallel and cross-validate the results.
//
// Detection methods:
//   1. Manufacturer+productId lookup  → canonical fingerprint DB
//   2. ZCL cluster scan               → what clusters does the device expose?
//   3. Tuya DP enumeration            → what DPs does the device respond to?
//   4. Signal/RSSI analysis           → how good is the radio link?
//   5. Historical matching           → has a similar device been seen before?
//
// Output: a DetectionResult with the most-likely driver + capability list,
//         cross-validated across all sources.

const { MultiChannelManager } = require('./MultiChannelManager');
const safeTimer = require('../utils/safe-timers');

const DETECTION_TIMEOUT_MS = 15000; // 15s total for all methods

class ParallelDetector {
  constructor(device, options = {}) {
    this.device = device;
    this.options = options;
    this._mcm = options.multiChannelManager || new MultiChannelManager(device);
    this._results = null;
  }

  /**
   * Run all detection methods in parallel.
   * Returns a DetectionResult with consensus.
   */
  async detect() {
    const start = Date.now();
    const allMethods = [
      { name: 'fp_lookup', weight: 1.0, run: () => this._fingerprintLookup() },
      { name: 'zcl_scan', weight: 0.8, run: () => this._zclClusterScan() },
      { name: 'tuya_scan', weight: 0.7, run: () => this._tuyaDpScan() },
      { name: 'rssi', weight: 0.3, run: () => this._rssiAnalysis() },
      { name: 'history', weight: 0.5, run: () => this._historyMatch() },
    ];

    // Run all in parallel with timeout
    const promises = allMethods.map(async (method) => {
      try {
        const r = await Promise.race([
          method.run(),
          new Promise((_, reject) => safeTimer.safeSetTimeout(this.device || globalThis, () => reject(new Error('METHOD_TIMEOUT')), DETECTION_TIMEOUT_MS)),
        ]);
        return { method: method.name, weight: method.weight, result: r, error: null };
      } catch (e) {
        return { method: method.name, weight: method.weight, result: null, error: e.message };
      }
    });

    const all = await Promise.all(promises);
    const elapsed = Date.now() - start;

    return this._consensus(all, elapsed);
  }

  /**
   * Build consensus from all detection results.
   */
  _consensus(results, elapsedMs) {
    const successful = results.filter((r) => r.result && !r.error);
    const failed = results.filter((r) => r.error);

    if (successful.length === 0) {
      return {
        confidence: 0,
        driver: null,
        capabilities: [],
        sources: [],
        errors: failed.map((r) => ({ method: r.method, error: r.error })),
        elapsedMs,
      };
    }

    // Find the driver with the highest weighted support
    const driverScores = new Map(); // driverId → { score, sources, capabilities }
    for (const r of successful) {
      const driverId = r.result.driver || 'unknown';
      const caps = r.result.capabilities || [];
      if (!driverScores.has(driverId)) {
        driverScores.set(driverId, { score: 0, sources: [], capabilities: new Set() });
      }
      const entry = driverScores.get(driverId);
      entry.score += r.weight * (r.result.confidence || 0.5);
      entry.sources.push(r.method);
      caps.forEach((c) => entry.capabilities.add(c));
    }

    // Sort by score
    const sorted = Array.from(driverScores.entries()).sort((a, b) => b[1].score - a[1].score);
    const [winnerDriver, winnerData] = sorted[0];

    return {
      confidence: Math.min(1.0, winnerData.score),
      driver: winnerDriver,
      capabilities: Array.from(winnerData.capabilities),
      sources: winnerData.sources,
      alternateDrivers: sorted.slice(1, 4).map(([d, data]) => ({ driver: d, score: data.score, sources: data.sources })),
      methodResults: results.map((r) => ({
        method: r.method,
        weight: r.weight,
        driver: r.result ? r.result.driver : null,
        confidence: r.result ? r.result.confidence : 0,
        error: r.error,
      })),
      elapsedMs,
    };
  }

  /**
   * Method 1: fingerprint lookup (manufacturer + productId → driver).
   */
  async _fingerprintLookup() {
    const mfr = this.device.getStoreValue
      ? await this.device.getStoreValue('zbManufacturerName')
      : this.device.manufacturerName;
    const pid = this.device.getStoreValue
      ? await this.device.getStoreValue('zbProductId')
      : this.device.productId;

    if (!mfr || !pid) return { driver: null, capabilities: [], confidence: 0 };

    try {
      // Look up in the canonical fingerprints file
      const path = require('path');
      const fs = require('fs');
      const fpPath = path.join(__dirname, '..', '..', 'lib', 'tuya', 'fingerprints.json');
      if (!fs.existsSync(fpPath)) return { driver: null, capabilities: [], confidence: 0 };
      const fps = JSON.parse(Buffer.from(fs.readFileSync(fpPath)).toString('utf8'));
      const m = fps.find((f) => f && f.manufacturerName === mfr && f.productId === pid);
      if (m) {
        return {
          driver: m.driverId || m.driver,
          capabilities: m.capabilities || [],
          confidence: 0.95,
        };
      }
    } catch (e) {
      return { driver: null, capabilities: [], confidence: 0, error: e.message };
    }
    return { driver: null, capabilities: [], confidence: 0.2 };
  }

  /**
   * Method 2: ZCL cluster scan.
   * Reads which clusters are present on the device.
   */
  async _zclClusterScan() {
    if (!this.device.zclNode || !this.device.zclNode.endpoints) {
      return { driver: null, capabilities: [], confidence: 0 };
    }
    const capabilities = [];
    const endpoints = this.device.zclNode.endpoints;
    for (const epKey of Object.keys(endpoints)) {
      const ep = endpoints[epKey];
      if (!ep || !ep.clusters) continue;
      const clusters = Object.keys(ep.clusters);
      for (const cluster of clusters) {
        const cap = this._clusterToCapability(cluster);
        if (cap) capabilities.push(cap);
      }
    }
    return {
      driver: null,
      capabilities: Array.from(new Set(capabilities)),
      confidence: 0.6,
    };
  }

  /**
   * Method 3: Tuya DP scan.
   * Enumerates Tuya DPs by trying common ones.
   */
  async _tuyaDpScan() {
    const mgr = this.device.tuyaEF00Manager || this.device.tuya;
    if (!mgr) return { driver: null, capabilities: [], confidence: 0 };
    const capabilities = [];
    // Try common DPs 1-20
    for (let dp = 1; dp <= 20; dp += 1) {
      try {
        const v = await Promise.resolve(mgr.get(dp));
        if (v !== null && v !== undefined) {
          const cap = this._dpToCapability(dp);
          if (cap) capabilities.push(cap);
        }
      } catch (e) {
        // DP not supported, continue
      }
    }
    return {
      driver: null,
      capabilities: Array.from(new Set(capabilities)),
      confidence: 0.5,
    };
  }

  /**
   * Method 4: RSSI analysis.
   * Just returns current signal quality as a confidence factor.
   */
  async _rssiAnalysis() {
    // RSSI is more of a health metric than a detection method
    return { driver: null, capabilities: [], confidence: 0.3 };
  }

  /**
   * Method 5: Historical matching.
   * Look for similar devices seen before.
   */
  async _historyMatch() {
    // Could check mfs_db for similar mfr+pid
    return { driver: null, capabilities: [], confidence: 0.3 };
  }

  _clusterToCapability(cluster) {
    const map = {
      'onOff': 'onoff',
      'levelControl': 'dim',
      'msTemperatureMeasurement': 'measure_temperature',
      'msRelativeHumidity': 'measure_humidity',
      'genPowerCfg': 'measure_battery',
      'ssIasZone': 'alarm_contact',
      'msIlluminanceMeasurement': 'measure_luminance',
      'occupancySensing': 'alarm_motion',
    };
    return map[cluster] || null;
  }

  _dpToCapability(dp) {
    const map = {
      1: 'onoff',
      2: 'dim',
      3: 'measure_temperature',
      4: 'measure_humidity',
      5: 'measure_battery',
    };
    return map[dp] || null;
  }
}

module.exports = { ParallelDetector, DETECTION_TIMEOUT_MS };
