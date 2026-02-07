'use strict';

/**
 * DYNAMIC CAPABILITY MANAGER - v5.8.44 REWRITE
 *
 * Safe, driver-aware dynamic capability enrichment.
 * TWO TIERS:
 * 1. SAFE (ALL drivers) - read-only measurement caps from ZCL clusters
 * 2. FULL (universal_fallback only) - controllable caps + DP heuristics
 *
 * RULES: No command listeners on dedicated drivers. Never removes caps.
 * Waits 30s before first scan. Respects existing capabilities.
 */

// SAFE: read-only measurement clusters - can enrich ANY driver
const SAFE_CLUSTERS = {
  0x0001: { cap: 'measure_battery', attr: 'batteryPercentageRemaining', xform: v => Math.min(100, Math.round(v / 2)) },
  0x0400: { cap: 'measure_luminance', attr: 'measuredValue', xform: v => (v > 0 ? Math.round(Math.pow(10, (v - 1) / 10000)) : 0) },
  0x0402: { cap: 'measure_temperature', attr: 'measuredValue', xform: v => v / 100 },
  0x0403: { cap: 'measure_pressure', attr: 'measuredValue', xform: v => v },
  0x0405: { cap: 'measure_humidity', attr: 'measuredValue', xform: v => v / 100 },
  0x0702: { cap: 'meter_power', attr: 'currentSummationDelivered', xform: v => v / 1000 },
  0x0B04: { cap: 'measure_power', attr: 'activePower', xform: v => v / 10 },
};

// FULL: controllable clusters - ONLY for fallback drivers
const FULL_CLUSTERS = {
  0x0006: { cap: 'onoff', attr: 'onOff', xform: v => !!v },
  0x0008: { cap: 'dim', attr: 'currentLevel', xform: v => v / 254 },
  0x0102: { cap: 'windowcoverings_set', attr: 'currentPositionLiftPercentage', xform: v => v / 100 },
  0x0300: { cap: 'light_hue', attr: 'currentHue', xform: v => v / 254 },
  0x0500: { cap: 'alarm_contact', attr: 'zoneStatus', xform: v => !!(v & 0x01) },
};

// Cluster name aliases used by zigbee-clusters library
const CLUSTER_NAMES = {
  0x0001: ['powerConfiguration'],
  0x0400: ['illuminanceMeasurement'],
  0x0402: ['temperatureMeasurement'],
  0x0403: ['pressureMeasurement'],
  0x0405: ['relativeHumidity', 'relativeHumidityMeasurement'],
  0x0702: ['metering', 'seMetering'],
  0x0B04: ['electricalMeasurement'],
  0x0006: ['onOff'],
  0x0008: ['levelControl'],
  0x0102: ['windowCovering', 'closuresWindowCovering'],
  0x0300: ['colorControl'],
  0x0500: ['iasZone'],
};

const FALLBACK_DRIVERS = ['universal_fallback', 'zigbee_universal'];

class DynamicCapabilityManager {

  constructor(device) {
    this.device = device;
    this._added = new Set();
    this._timers = [];
    this._initialized = false;
    this._isFallback = false;
    this._scanCount = 0;
  }

  /**
   * Initialize - detect mode and schedule scans
   */
  async initialize() {
    if (this._initialized) return;
    this._initialized = true;

    const driverId = this.device.driver?.manifest?.id || this.device.driver?.id || '';
    this._isFallback = FALLBACK_DRIVERS.includes(driverId);

    try {
      const stored = await this.device.getStoreValue('_dcm_added') || [];
      stored.forEach(c => this._added.add(c));
    } catch (e) { /* ignore */ }

    this.device.log(`[DCM] Init mode=${this._isFallback ? 'FULL' : 'SAFE'}, restored=${this._added.size} caps`);

    // Schedule scans: 30s, 5min, then every 2h
    this._schedule(30000, () => this._scan('initial'));
    this._schedule(300000, () => this._scan('stabilized'));
    const periodic = setInterval(() => this._scan('periodic'), 7200000);
    this._timers.push({ type: 'interval', ref: periodic });
  }

  /**
   * Process incoming Tuya DP (called from TuyaEF00Manager or BaseHybridDevice)
   * Only does DP-based enrichment for fallback drivers
   */
  async processDP(dpId, value, dpType) {
    if (!this._isFallback) return null;
    // Fallback drivers: handled by existing lib/dynamic/DynamicCapabilityManager.js
    // This manager focuses on ZCL cluster enrichment
    return null;
  }

  /**
   * Run a capability scan
   */
  async _scan(reason) {
    if (!this.device || this.device.destroyed) return;
    if (!this.device.zclNode) return;

    this._scanCount++;
    this.device.log(`[DCM] Scan #${this._scanCount} (${reason})...`);

    let added = 0;
    const endpoints = this.device.zclNode.endpoints || {};

    for (const [epId, endpoint] of Object.entries(endpoints)) {
      if (isNaN(epId)) continue;
      const clusters = endpoint.clusters || {};

      // Determine which cluster map to use
      const clusterMap = this._isFallback
        ? { ...SAFE_CLUSTERS, ...FULL_CLUSTERS }
        : SAFE_CLUSTERS;

      for (const [clusterIdHex, mapping] of Object.entries(clusterMap)) {
        const clusterId = parseInt(clusterIdHex);
        const cluster = this._findCluster(clusters, clusterId);
        if (!cluster) continue;

        // Skip if device already has this capability
        if (this.device.hasCapability(mapping.cap)) {
          // Capability exists - try to refresh value
          await this._tryReadValue(cluster, mapping);
          continue;
        }

        // v5.8.58: Skip irrelevant caps for dedicated drivers (Tbao TS130F fix)
        if (!this._isFallback && this._isIrrelevantCap(mapping.cap)) {
          this.device.log(`[DCM] ⊘ Skipping ${mapping.cap} (irrelevant for driver type)`);
          continue;
        }

        // Add the capability
        try {
          await this.device.addCapability(mapping.cap);
          this._added.add(mapping.cap);
          added++;
          this.device.log(`[DCM] + ${mapping.cap} from cluster 0x${clusterId.toString(16).padStart(4, '0')} (EP${epId})`);

          // Setup attribute listener (read-only reporting)
          this._setupAttrListener(cluster, mapping);

          // Read initial value
          await this._tryReadValue(cluster, mapping);
        } catch (e) {
          // Capability might be invalid for this device class - skip silently
        }
      }
    }

    // Persist
    if (added > 0) {
      await this._save();
      this.device.log(`[DCM] Scan complete: +${added} capabilities`);
    } else {
      this.device.log(`[DCM] Scan complete: no new capabilities`);
    }
  }

  /**
   * v5.8.58: Check if a capability is irrelevant for this driver type
   * Prevents mains-powered covers getting battery/luminance, etc.
   */
  _isIrrelevantCap(cap) {
    const driverId = this.device.driver?.manifest?.id || this.device.driver?.id || '';
    // Mains-powered cover/curtain drivers: no battery, no luminance
    if (/curtain|cover|shutter|garage|roller/.test(driverId)) {
      if (['measure_battery', 'measure_luminance', 'alarm_battery'].includes(cap)) return true;
    }
    // Switch/plug drivers: no luminance
    if (/switch|plug|socket|power_strip/.test(driverId)) {
      if (cap === 'measure_luminance') return true;
    }
    // Light drivers: no luminance (they produce light, not measure it)
    if (/light|bulb|led_strip|dimmer/.test(driverId)) {
      if (cap === 'measure_luminance') return true;
    }
    return false;
  }

  /**
   * Find a cluster in an endpoint by numeric ID or name aliases
   */
  _findCluster(clusters, clusterId) {
    // Try by numeric ID
    if (clusters[clusterId]) return clusters[clusterId];
    if (clusters[`${clusterId}`]) return clusters[`${clusterId}`];

    // Try by name aliases
    const names = CLUSTER_NAMES[clusterId] || [];
    for (const name of names) {
      if (clusters[name]) return clusters[name];
    }
    return null;
  }

  /**
   * Setup a read-only attribute listener for reporting
   */
  _setupAttrListener(cluster, mapping) {
    if (!cluster || typeof cluster.on !== 'function') return;
    try {
      cluster.on(`attr.${mapping.attr}`, (value) => {
        if (value === undefined || value === null) return;
        const converted = mapping.xform(value);
        this.device.setCapabilityValue(mapping.cap, converted).catch(() => {});
      });
    } catch (e) { /* ignore */ }
  }

  /**
   * Try to read current value from cluster
   */
  async _tryReadValue(cluster, mapping) {
    if (!cluster || typeof cluster.readAttributes !== 'function') return;
    try {
      const result = await cluster.readAttributes([mapping.attr]);
      const raw = result?.[mapping.attr];
      if (raw === undefined || raw === null) return;
      const converted = mapping.xform(raw);
      if (typeof converted === 'number' && !isFinite(converted)) return;
      await this.device.setCapabilityValue(mapping.cap, converted);
    } catch (e) {
      // Device may be sleeping or cluster not readable - ignore
    }
  }

  /**
   * Schedule a one-shot timer
   */
  _schedule(ms, fn) {
    const t = setTimeout(async () => {
      try { await fn(); } catch (e) { /* ignore */ }
    }, ms);
    this._timers.push({ type: 'timeout', ref: t });
  }

  /**
   * Persist added capabilities
   */
  async _save() {
    try {
      await this.device.setStoreValue('_dcm_added', [...this._added]);
    } catch (e) { /* ignore */ }
  }

  /**
   * Cleanup on device deletion
   */
  cleanup() {
    for (const t of this._timers) {
      if (t.type === 'timeout') clearTimeout(t.ref);
      if (t.type === 'interval') clearInterval(t.ref);
    }
    this._timers = [];
    this._added.clear();
    this.device.log?.('[DCM] Cleaned up');
  }
}

module.exports = DynamicCapabilityManager;