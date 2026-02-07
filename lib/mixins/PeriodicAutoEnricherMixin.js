'use strict';

/**
 * PeriodicAutoEnricherMixin - v5.8.44 REWRITE
 *
 * VALUE REFRESH ONLY - no longer adds capabilities.
 * Capability enrichment is now handled by DynamicCapabilityManager.
 *
 * This mixin periodically reads fresh ZCL attribute values for
 * capabilities the device ALREADY has. Useful for:
 * - Battery-powered devices that don't report proactively
 * - Stale measurement values after device sleep
 * - Devices that only report on change (no periodic reports)
 *
 * Schedule: 10min after init, then every 4 hours
 */

// Map capability to { clusterNames, attr, xform }
const REFRESH_MAP = {
  measure_temperature: {
    clusters: ['temperatureMeasurement'],
    attr: 'measuredValue',
    xform: v => v / 100,
    validate: v => v >= -4000 && v <= 12500,
  },
  measure_humidity: {
    clusters: ['relativeHumidity', 'relativeHumidityMeasurement'],
    attr: 'measuredValue',
    xform: v => v / 100,
    validate: v => v >= 0 && v <= 10000,
  },
  measure_luminance: {
    clusters: ['illuminanceMeasurement'],
    attr: 'measuredValue',
    xform: v => (v > 0 ? Math.round(Math.pow(10, (v - 1) / 10000)) : 0),
    validate: v => v >= 0 && v <= 100000,
  },
  measure_battery: {
    clusters: ['powerConfiguration'],
    attr: 'batteryPercentageRemaining',
    xform: v => Math.min(100, Math.round(v / 2)),
    validate: v => v >= 0 && v <= 200,
  },
  measure_pressure: {
    clusters: ['pressureMeasurement'],
    attr: 'measuredValue',
    xform: v => v,
    validate: v => v >= 0 && v <= 2000,
  },
};

const PeriodicAutoEnricherMixin = {

  initPeriodicAutoEnricher() {
    this._enricherState = {
      initialized: Date.now(),
      refreshCount: 0,
    };

    // First refresh at 10 minutes
    this._initialScanTimeout = setTimeout(async () => {
      await this._refreshExistingValues();
    }, 600000);

    // Then every 4 hours
    this._hourlyScanInterval = setInterval(async () => {
      await this._refreshExistingValues();
    }, 14400000);

    this.log('[ENRICH] Value refresh scheduled (10min + 4h)');
  },

  async _refreshExistingValues() {
    if (!this.zclNode || this.destroyed) return;

    this._enricherState.refreshCount++;
    const n = this._enricherState.refreshCount;
    let refreshed = 0;

    for (const [cap, cfg] of Object.entries(REFRESH_MAP)) {
      if (!this.hasCapability(cap)) continue;

      // Find cluster across all endpoints
      const cluster = this._findRefreshCluster(cfg.clusters);
      if (!cluster || typeof cluster.readAttributes !== 'function') continue;

      try {
        const result = await cluster.readAttributes([cfg.attr]);
        const raw = result?.[cfg.attr];
        if (raw === undefined || raw === null) continue;
        if (cfg.validate && !cfg.validate(raw)) continue;

        const value = cfg.xform(raw);
        if (typeof value !== 'number' || !isFinite(value)) continue;

        await this.setCapabilityValue(cap, value);
        refreshed++;
      } catch (e) {
        // Device sleeping or cluster unavailable - skip
      }
    }

    if (refreshed > 0) {
      this.log(`[ENRICH] Refresh #${n}: updated ${refreshed} values`);
    }
  },

  _findRefreshCluster(clusterNames) {
    const endpoints = this.zclNode?.endpoints || {};
    for (const ep of Object.values(endpoints)) {
      const clusters = ep.clusters || {};
      for (const name of clusterNames) {
        if (clusters[name]) return clusters[name];
      }
    }
    return null;
  },

  cleanupPeriodicEnricher() {
    if (this._initialScanTimeout) clearTimeout(this._initialScanTimeout);
    if (this._hourlyScanInterval) clearInterval(this._hourlyScanInterval);
  },
};

module.exports = PeriodicAutoEnricherMixin;