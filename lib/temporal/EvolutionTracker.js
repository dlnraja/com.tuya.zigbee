'use strict';

/**
 * EvolutionTracker.js - Temporal Consciousness: Evolution Engine
 *
 * Tracks the evolution of key project metrics over time:
 * - Driver count (Zigbee + WiFi)
 * - Fingerprint count (manufacturerName + productId)
 * - Capability count
 * - Flow card count
 * - Manufacturer name coverage
 *
 * Snapshots are stored at each version bump and can be queried to produce
 * trend lines, growth rates, and anomaly alerts.
 *
 * Part of the Tuya Unified Zigbee Temporal Consciousness System (Layer T1).
 *
 * @module lib/temporal/EvolutionTracker
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_DIR = path.join(__dirname, '..', '..', '.ai', 'cache');
const EVOLUTION_CACHE = path.join(CACHE_DIR, 'evolution-cache.json');
const KNOWLEDGE_CACHE = path.join(__dirname, '..', '..', '.ai', 'KNOWLEDGE_CACHE.json');

// Metric names
const METRICS = [
  'drivers',
  'zigbeeDrivers',
  'wifiDrivers',
  'fingerprints',
  'flowCards',
  'capabilities',
  'timeSyncFormats',
  'pipelineLayers',
  'scripts',
  'workflows',
  'libFiles',
];

class EvolutionTracker {
  /**
   * @param {object} [options]
   * @param {string} [options.repoRoot]
   */
  constructor(options = {}) {
    this.repoRoot = options.repoRoot || path.join(__dirname, '..', '..');
    this._snapshots = [];
    this._loadCache();
  }

  // =========================================================================
  // CACHE MANAGEMENT
  // =========================================================================

  /** @private */
  _loadCache() {
    try {
      if (fs.existsSync(EVOLUTION_CACHE)) {
        const raw = fs.readFileSync(EVOLUTION_CACHE);
        const data = JSON.parse(raw);
        this._snapshots = data.snapshots || [];
      }
    } catch (err) {
      this._snapshots = [];
    }
  }

  /** @private */
  _saveCache() {
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
      fs.writeFileSync(
        EVOLUTION_CACHE,
        JSON.stringify(
          {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            snapshots: this._snapshots,
          },
          null,
          2
        )
      );
    } catch (err) {
      // Non-fatal
    }
  }

  // =========================================================================
  // SNAPSHOT COLLECTION
  // =========================================================================

  /**
   * Take a snapshot of the current project metrics.
   * Sources: KNOWLEDGE_CACHE.json (primary), git log (fallback).
   * @returns {object} The snapshot taken
   */
  takeSnapshot() {
    const snapshot = {
      timestamp: new Date().toISOString(),
      version: this._getAppVersion(),
      metrics: {},
    };

    // Primary source: KNOWLEDGE_CACHE.json
    try {
      if (fs.existsSync(KNOWLEDGE_CACHE)) {
        const raw = fs.readFileSync(KNOWLEDGE_CACHE);
        const cache = JSON.parse(raw);
        const proj = cache.project || {};
        for (const metric of METRICS) {
          if (proj[metric] !== undefined) {
            snapshot.metrics[metric] = proj[metric];
          }
        }
      }
    } catch (err) {
      // Fall through to git-based extraction
    }

    // Fallback: extract from package.json
    if (!snapshot.version || snapshot.version === '0.0.0') {
      try {
        const pkg = JSON.parse(
          fs.readFileSync(path.join(this.repoRoot, 'package.json'))
        );
        snapshot.version = pkg.version || 'unknown';
      } catch (err) {
        // ignore
      }
    }

    // Only store if we have meaningful data
    const hasData = Object.values(snapshot.metrics).some(
      (v) => v !== undefined && v !== null
    );
    if (hasData) {
      // Deduplicate: only add if version differs from last snapshot
      const last = this._snapshots[this._snapshots.length - 1];
      if (!last || last.version !== snapshot.version) {
        this._snapshots.push(snapshot);
        this._saveCache();
      }
    }

    return snapshot;
  }

  /**
   * Scan git history to reconstruct evolution from release commits.
   * Parses version-bump commits that contain driver/FP counts.
   * @param {number} [days=180]
   * @returns {Array<object>} Reconstructed snapshots
   */
  scanGitHistory(days = 180) {
    try {
      const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      const cmd = `git log --format="%ai|%s" --since="${since}" --no-merges --grep="drivers"`;
      const output = execSync(cmd, {
        cwd: this.repoRoot,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000,
      }).trim();

      if (!output) return [];

      const versionRegex = /v?(\d+\.\d+\.\d+)/;
      const driverRegex = /(\d+)\s*drivers/i;
      const fpRegex = /(\d+)\s*FPs/i;
      const snapshots = [];

      for (const line of output.split('\n')) {
        const [date, ...msgParts] = line.split('|');
        const message = msgParts.join('|');
        const vMatch = message.match(versionRegex);
        const dMatch = message.match(driverRegex);
        const fMatch = message.match(fpRegex);

        if (vMatch || dMatch) {
          snapshots.push({
            timestamp: (date || '').trim(),
            version: vMatch ? vMatch[1] : 'unknown',
            metrics: {
              drivers: dMatch ? parseInt(dMatch[1], 10) : null,
              fingerprints: fMatch ? parseInt(fMatch[1], 10) : null,
            },
            source: 'git-history',
          });
        }
      }

      // Merge with existing snapshots (avoid duplicates by version)
      const existingVersions = new Set(this._snapshots.map((s) => s.version));
      for (const snap of snapshots) {
        if (!existingVersions.has(snap.version)) {
          this._snapshots.push(snap);
          existingVersions.add(snap.version);
        }
      }

      // Sort by timestamp
      this._snapshots.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
      this._saveCache();

      return snapshots;
    } catch (err) {
      return [];
    }
  }

  // =========================================================================
  // QUERY METHODS
  // =========================================================================

  /**
   * Get evolution data for a specific metric.
   * @param {string} metric - One of METRICS
   * @returns {Array<{timestamp: string, version: string, value: number}>}
   */
  getMetricEvolution(metric) {
    return this._snapshots
      .filter((s) => s.metrics[metric] !== undefined && s.metrics[metric] !== null)
      .map((s) => ({
        timestamp: s.timestamp,
        version: s.version,
        value: s.metrics[metric],
      }));
  }

  /**
   * Get the growth rate for a metric between the two most recent data points.
   * @param {string} metric
   * @returns {object|null} { from, to, delta, percentChange }
   */
  getGrowthRate(metric) {
    const evolution = this.getMetricEvolution(metric);
    if (evolution.length < 2) return null;

    const prev = evolution[evolution.length - 2];
    const curr = evolution[evolution.length - 1];
    const delta = curr.value - prev.value;
    const percent = prev.value > 0 ? ((delta / prev.value) * 100).toFixed(2) : 'N/A';

    return {
      metric,
      from: { version: prev.version, value: prev.value, timestamp: prev.timestamp },
      to: { version: curr.version, value: curr.value, timestamp: curr.timestamp },
      delta,
      percentChange: percent,
    };
  }

  /**
   * Get a full evolution report for all metrics.
   * @returns {object}
   */
  getFullEvolutionReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      totalSnapshots: this._snapshots.length,
      latestVersion: this._snapshots.length > 0
        ? this._snapshots[this._snapshots.length - 1].version
        : 'unknown',
      metrics: {},
    };

    for (const metric of METRICS) {
      const evolution = this.getMetricEvolution(metric);
      const growth = this.getGrowthRate(metric);
      report.metrics[metric] = {
        dataPoints: evolution.length,
        latest: evolution.length > 0 ? evolution[evolution.length - 1].value : null,
        growth,
        trend: this._detectTrend(evolution.map((e) => e.value)),
      };
    }

    return report;
  }

  /**
   * Detect anomalies: metrics that decreased unexpectedly.
   * @returns {Array<object>} Anomaly descriptions
   */
  detectAnomalies() {
    const anomalies = [];
    const expectedMonotonic = ['drivers', 'fingerprints', 'flowCards', 'capabilities'];

    for (const metric of expectedMonotonic) {
      const evolution = this.getMetricEvolution(metric);
      for (let i = 1; i < evolution.length; i++) {
        if (evolution[i].value < evolution[i - 1].value) {
          anomalies.push({
            metric,
            type: 'unexpected_decrease',
            severity: 'warning',
            from: evolution[i - 1],
            to: evolution[i],
            delta: evolution[i].value - evolution[i - 1].value,
            message: `${metric} decreased from ${evolution[i - 1].value} (${evolution[i - 1].version}) to ${evolution[i].value} (${evolution[i].version})`,
          });
        }
      }
    }

    return anomalies;
  }

  // =========================================================================
  // MANUFACTURER NAME EVOLUTION
  // =========================================================================

  /**
   * Track manufacturerName coverage evolution by scanning fingerprints.json.
   * @returns {object} { totalEntries, uniqueManufacturerNames, uniqueProductIds, timestamp }
   */
  analyzeFingerprintCoverage() {
    const fpPath = path.join(this.repoRoot, 'data', 'fingerprints.json');
    try {
      if (!fs.existsSync(fpPath)) return null;
      const raw = fs.readFileSync(fpPath);
      const data = JSON.parse(raw);

      // fingerprints.json can be an object with entries or an array
      const entries = Array.isArray(data) ? data : data.entries || [];
      const mfrNames = new Set();
      const productIds = new Set();
      const drivers = new Set();

      for (const entry of entries) {
        if (entry.manufacturerName) {
          const names = Array.isArray(entry.manufacturerName)
            ? entry.manufacturerName
            : [entry.manufacturerName];
          for (const n of names) {
            if (n && n.length > 0) mfrNames.add(n.toLowerCase());
          }
        }
        if (entry.productId) productIds.add(entry.productId);
        if (entry.driver) drivers.add(entry.driver);
      }

      return {
        timestamp: new Date().toISOString(),
        totalEntries: entries.length,
        uniqueManufacturerNames: mfrNames.size,
        uniqueProductIds: productIds.size,
        uniqueDrivers: drivers.size,
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * Compare two fingerprint coverage snapshots.
   * @param {object} prev - Previous snapshot
   * @param {object} curr - Current snapshot
   * @returns {object} Diff
   */
  diffFingerprintCoverage(prev, curr) {
    if (!prev || !curr) return null;
    return {
      totalEntries: curr.totalEntries - prev.totalEntries,
      uniqueManufacturerNames: curr.uniqueManufacturerNames - prev.uniqueManufacturerNames,
      uniqueProductIds: curr.uniqueProductIds - prev.uniqueProductIds,
      uniqueDrivers: curr.uniqueDrivers - prev.uniqueDrivers,
    };
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  /**
   * Get the app version from package.json.
   * @returns {string}
   * @private
   */
  _getAppVersion() {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(this.repoRoot, 'package.json'))
      );
      return pkg.version || '0.0.0';
    } catch (err) {
      return '0.0.0';
    }
  }

  /**
   * Detect the trend of a numeric series.
   * @param {number[]} values
   * @returns {string} 'increasing' | 'decreasing' | 'stable' | 'insufficient_data'
   * @private
   */
  _detectTrend(values) {
    if (!values || values.length < 2) return 'insufficient_data';

    let increases = 0;
    let decreases = 0;

    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) increases++;
      else if (values[i] < values[i - 1]) decreases++;
    }

    const total = increases + decreases;
    if (total === 0) return 'stable';
    if (increases / total > 0.7) return 'increasing';
    if (decreases / total > 0.7) return 'decreasing';
    return 'stable';
  }
}

module.exports = EvolutionTracker;
