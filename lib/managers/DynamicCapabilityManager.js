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
// v9.0.40: Expanded with 8 new clusters (ZHA generic pattern)
const SAFE_CLUSTERS = {
  0x0001: { cap: 'measure_battery', attr: 'batteryPercentageRemaining', xform: v => Math.min(100, Math.round(v / 2)) },
  0x0400: { cap: 'measure_luminance', attr: 'measuredValue', xform: v => v > 0 ? Math.round(Math.pow(10, (v - 1) / 10000)) : 0 },
  0x0402: { cap: 'measure_temperature', attr: 'measuredValue', xform: v => v / 100 },
  0x0403: { cap: 'measure_pressure', attr: 'measuredValue', xform: v => v },
  0x0404: { cap: 'measure_flow', attr: 'measuredValue', xform: v => v / 10 }, // Flow measurement
  0x0405: { cap: 'measure_humidity', attr: 'measuredValue', xform: v => v / 100 },
  0x0406: { cap: 'alarm_motion', attr: 'occupancy', xform: v => !!v }, // Occupancy sensing
  0x0702: { cap: 'meter_power', attr: 'currentSummationDelivered', xform: v => v / 1000 },
  0x0800: { cap: 'measure_noise', attr: 'measuredValue', xform: v => v }, // Analog input (noise)
  0x0B04: { cap: 'measure_power', attr: 'activePower', xform: v => v / 10 },
  0x0B05: { cap: 'measure_power', attr: 'apparentPower', xform: v => v / 10 }, // PM2 (apparent)
  // v9.0.40: Additional clusters from ZHA generic device classes
  0x0201: { cap: 'measure_temperature', attr: 'localTemperature', xform: v => v / 100 }, // Thermostat local temp
  0x0202: { cap: 'thermostat_mode', attr: 'systemMode', xform: v => v }, // Fan control
  0x0204: { cap: 'thermostat_mode', attr: 'systemMode', xform: v => v }, // Thermostat
  0x040A: { cap: 'measure_conductivity', attr: 'measuredValue', xform: v => v }, // Soil conductivity
  0x040C: { cap: 'measure_co2', attr: 'measuredValue', xform: v => v }, // CO2 concentration
  0x040D: { cap: 'measure_pm25', attr: 'measuredValue', xform: v => v }, // PM2.5
  0x042A: { cap: 'measure_pm10', attr: 'measuredValue', xform: v => v }, // PM10
  // Tuya-specific clusters
  0x0500: { cap: 'alarm_contact', attr: 'zoneStatus', xform: v => !!(v & 0x01) }, // IAS Zone
  0x0502: { cap: 'alarm_water', attr: 'zoneStatus', xform: v => !!(v & 0x01) }, // Water leak
  // Note: 0x0702 (metering) and 0x0B04 (electrical) already defined above — no duplicates
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
// v9.0.40: Expanded with new cluster names
const CLUSTER_NAMES = {
  0x0001: ['powerConfiguration'],
  0x0201: ['hvacThermostat'],
  0x0202: ['hvacFanControl'],
  0x0204: ['hvacUserInterface'],
  0x0400: ['illuminanceMeasurement'],
  0x0402: ['temperatureMeasurement'],
  0x0403: ['pressureMeasurement'],
  0x0404: ['flowMeasurement'],
  0x0405: ['relativeHumidity', 'relativeHumidityMeasurement'],
  0x0406: ['occupancySensing'],
  0x040A: ['soilMoisture'],
  0x040C: ['co2Concentration'],
  0x040D: ['pm25Concentration'],
  0x042A: ['pm10Concentration'],
  0x0500: ['iasZone'],
  0x0502: ['iasWd'],
  0x0702: ['metering', 'seMetering'],
  0x0800: ['analogInput'],
  0x0B04: ['electricalMeasurement'],
  0x0B05: ['pm2Profile'],
  0x0006: ['onOff'],
  0x0008: ['levelControl'],
  0x0102: ['windowCovering', 'closuresWindowCovering'],
  0x0300: ['colorControl'],
};

const FALLBACK_DRIVERS = ['universal_fallback', 'zigbee_universal'];

// v10.2.0: CLUSTER-TO-CAPABILITY FALLBACK TABLE
// When a device reports clusters that don't match the primary maps above,
// this fallback provides a broader set of possible capability mappings.
// Used for dedicated (non-fallback) drivers that present unexpected clusters.
const CLUSTER_CAPABILITY_FALLBACK = {
  0x0006: { caps: ['onoff'], attrs: ['onOff'], xforms: [v => !!v] },
  0x0008: { caps: ['dim'], attrs: ['currentLevel'], xforms: [v => v / 254] },
  0x0001: { caps: ['measure_battery', 'alarm_battery'], attrs: ['batteryPercentageRemaining', 'batteryVoltage'], xforms: [v => Math.min(100, Math.round(v / 2)), v => v / 100] },
  0x0400: { caps: ['measure_luminance'], attrs: ['measuredValue'], xforms: [v => v > 0 ? Math.round(Math.pow(10, (v - 1) / 10000)) : 0] },
  0x0402: { caps: ['measure_temperature'], attrs: ['measuredValue'], xforms: [v => v / 100] },
  0x0403: { caps: ['measure_pressure'], attrs: ['measuredValue'], xforms: [v => v] },
  0x0405: { caps: ['measure_humidity'], attrs: ['measuredValue'], xforms: [v => v / 100] },
  0x0702: { caps: ['meter_power'], attrs: ['currentSummationDelivered'], xforms: [v => v / 1000] },
  0x0B04: { caps: ['measure_power', 'measure_voltage', 'measure_current'], attrs: ['activePower', 'rmsVoltage', 'rmsCurrent'], xforms: [v => v / 10, v => v / 10, v => v / 1000] },
  0x0102: { caps: ['windowcoverings_set', 'windowcoverings_tilt_set'], attrs: ['currentPositionLiftPercentage', 'currentPositionTiltPercentage'], xforms: [v => v / 100, v => v / 100] },
  0x0300: { caps: ['light_hue', 'light_saturation', 'light_temperature'], attrs: ['currentHue', 'currentSaturation', 'colorTemperatureMireds'], xforms: [v => v / 254, v => v / 254, v => v] },
  0x0500: { caps: ['alarm_contact', 'alarm_motion', 'alarm_tamper'], attrs: ['zoneStatus', 'zoneStatus', 'zoneStatus'], xforms: [v => !!(v & 0x01), v => !!(v & 0x04), v => !!(v & 0x08)] },
  0x0501: { caps: ['alarm_arm'], attrs: ['armState'], xforms: [v => v] },
  0x0F00: { caps: ['measure_temperature'], attrs: ['measuredValue'], xforms: [v => v / 100] },
};

class DynamicCapabilityManager {

  constructor(device) {
    this.device = device;
    this._added = new Set();
    this._timers = [];
    this._initialized = false;
    this._isFallback = false;
    this._scanCount = 0;

    // v9.1.0: Track unknown/unmapped DPs for debug export
    this._unknownDPs = new Map(); // dpId -> { firstSeen, lastSeen, count, lastValue, dpType }
  }

  /**
   * Initialize - detect mode and schedule scans
   */
  async initialize() {
    if (this._initialized) {return;}
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
    const periodic = this.homey.setInterval(() => { if (this._destroyed) return; this._scan('periodic'); }, 7200000);
    this._timers.push({ type: 'interval', ref: periodic });
  }

  /**
   * Process incoming Tuya DP (called from TuyaEF00Manager or BaseUnifiedDevice)
   * Only does DP-based enrichment for fallback drivers
   */
  async processDP(dpId, value, dpType) {
    // v9.1.0: Track all DPs regardless of fallback status for debug export
    this._trackUnknownDP(dpId, value, dpType);

    if (!this._isFallback) {return null;}
    // Fallback drivers: handled by existing lib/dynamic/DynamicCapabilityManager.js
    // This manager focuses on ZCL cluster enrichment
    return null;
  }

  /**
   * v9.1.0: Track unknown/unmapped DPs for user-facing debug export.
   * Records DPs that the device reports but are not mapped to any capability.
   */
  _trackUnknownDP(dpId, value, dpType) {
    const now = Date.now();
    if (this._unknownDPs.has(dpId)) {
      const entry = this._unknownDPs.get(dpId);
      entry.lastSeen = now;
      entry.count++;
      entry.lastValue = value;
      if (dpType !== undefined && dpType !== null) entry.dpType = dpType;
    } else {
      this._unknownDPs.set(dpId, {
        firstSeen: now,
        lastSeen: now,
        count: 1,
        lastValue: value,
        dpType: dpType,
      });
    }
  }

  /**
   * v9.1.0: Export a user-facing report of unknown/unmapped DPs.
   * Useful for identifying which DPs a device reports that have no capability mapping.
   *
   * @returns {Array<{ dpId: number, dpType: number|null, firstSeen: Date, lastSeen: Date, reportCount: number, lastValue: any }>}
   */
  getUnknownDPReport() {
    const report = [];
    for (const [dpId, entry] of this._unknownDPs) {
      report.push({
        dpId,
        dpType: entry.dpType,
        firstSeen: new Date(entry.firstSeen),
        lastSeen: new Date(entry.lastSeen),
        reportCount: entry.count,
        lastValue: entry.lastValue,
      });
    }
    // Sort by reportCount descending (most active unknown DPs first)
    report.sort((a, b) => b.reportCount - a.reportCount);
    return report;
  }

  /**
   * Run a capability scan
   */
  async _scan(reason) {
    if (!this.device || this.device.destroyed) {return;}
    if (!this.device.zclNode) {return;}

    this._scanCount++;
    this.device.log(`[DCM] Scan #${this._scanCount} (${reason})...`);

    let added = 0;
    const endpoints = this.device.zclNode.endpoints || {};

    for (const [epId, endpoint] of Object.entries(endpoints)) {
      if (isNaN(epId)) {continue;}
      const clusters = endpoint.clusters || {};

      // Determine which cluster map to use
      const clusterMap = this._isFallback
        ? { ...SAFE_CLUSTERS, ...FULL_CLUSTERS }
        : SAFE_CLUSTERS;

      for (const [clusterIdHex, mapping] of Object.entries(clusterMap)) {
        const clusterId = parseInt(clusterIdHex);
        const cluster = this._findCluster(clusters, clusterId);
        if (!cluster) {continue;}

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
      // v9.0.40: Invalidate capability map cache after capability changes
      if (typeof this.device._invalidateCapabilityMap === 'function') {
        this.device._invalidateCapabilityMap();
      }
      this.device.log(`[DCM] Scan complete: +${added} capabilities`);
    } else {
      this.device.log('[DCM] Scan complete: no new capabilities');
    }

    // v10.2.0: Run cluster-based capability fallback scan for non-fallback drivers
    // This picks up capabilities from clusters that aren't in the primary maps
    if (!this._isFallback) {
      await this._fallbackClusterScan();
    }
  }

  /**
   * v10.2.0: Cluster-based capability fallback scan.
   * Scans device clusters against CLUSTER_CAPABILITY_FALLBACK to discover
   * capabilities that the primary SAFE_CLUSTERS map might miss.
   * Only adds capabilities that are valid for the device class.
   */
  async _fallbackClusterScan() {
    if (!this.device || this.device.destroyed || !this.device.zclNode) return;

    let added = 0;
    const endpoints = this.device.zclNode.endpoints || {};

    for (const [epId, endpoint] of Object.entries(endpoints)) {
      if (isNaN(epId)) continue;
      const clusters = endpoint.clusters || {};

      for (const [clusterId, fallbackEntry] of Object.entries(CLUSTER_CAPABILITY_FALLBACK)) {
        const clusterNum = parseInt(clusterId);
        const cluster = this._findCluster(clusters, clusterNum);
        if (!cluster) continue;

        // Try each capability in the fallback entry
        for (let i = 0; i < fallbackEntry.caps.length; i++) {
          const cap = fallbackEntry.caps[i];
          const attr = fallbackEntry.attrs[i];
          const xform = fallbackEntry.xforms[i];

          // Skip if device already has this capability
          if (this.device.hasCapability(cap)) continue;

          // Skip irrelevant caps
          if (this._isIrrelevantCap(cap)) continue;

          // Check if the attribute is readable on this cluster
          if (typeof cluster.readAttributes !== 'function') continue;

          try {
            const result = await cluster.readAttributes([attr]);
            const raw = result?.[attr];
            if (raw === undefined || raw === null) continue;

            const converted = xform(raw);
            if (typeof converted === 'number' && !isFinite(converted)) continue;

            await this.device.addCapability(cap);
            this._added.add(cap);
            added++;
            this.device.log(`[DCM-FB] + ${cap} from fallback cluster 0x${clusterNum.toString(16).padStart(4, '0')} attr ${attr} (EP${epId})`);

            this._setupAttrListener(cluster, { cap, attr, xform });
            await this.device.setCapabilityValue(cap, converted).catch(() => {});
          } catch (e) {
            // Attribute not readable or capability invalid - skip silently
          }
        }
      }
    }

    if (added > 0) {
      await this._save();
      // v9.0.40: Invalidate capability map cache after capability changes
      if (typeof this.device._invalidateCapabilityMap === 'function') {
        this.device._invalidateCapabilityMap();
      }
      this.device.log(`[DCM-FB] Fallback scan: +${added} capabilities`);
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
      if (['measure_battery', 'measure_luminance', 'alarm_battery'].includes(cap)) {return true;}
    }
    // Switch/plug drivers: no luminance
    if (/switch|plug|socket|power_strip/.test(driverId)) {
      if (cap === 'measure_luminance') {return true;}
    }
    // Light drivers: no luminance (they produce light, not measure it)
    if (/light|bulb|led_strip|dimmer/.test(driverId)) {
      if (cap === 'measure_luminance') {return true;}
    }
    return false;
  }

  /**
   * Find a cluster in an endpoint by numeric ID or name aliases
   */
  _findCluster(clusters, clusterId) {
    // Try by numeric ID
    if (clusters[clusterId]) {return clusters[clusterId];}
    if (clusters[`${clusterId}`]) {return clusters[`${clusterId}`];}

    // Try by name aliases
    const names = CLUSTER_NAMES[clusterId] || [];
    for (const name of names) {
      if (clusters[name]) {return clusters[name];}
    }
    return null;
  }

  /**
   * Setup a read-only attribute listener for reporting
   */
  _setupAttrListener(cluster, mapping) {
    if (!cluster || typeof cluster.on !== 'function') {return;}
    try {
      cluster.on(`attr.${mapping.attr}`, (value) => {
        if (value === undefined || value === null) {return;}
        const converted = mapping.xform(value);
        this.device.setCapabilityValue(mapping.cap, converted).catch(() => {});
      });
    } catch (e) { /* ignore */ }
  }

  /**
   * Try to read current value from cluster
   */
  async _tryReadValue(cluster, mapping) {
    if (!cluster || typeof cluster.readAttributes !== 'function') {return;}
    try {
      const result = await cluster.readAttributes([mapping.attr]);
      const raw = result?.[mapping.attr];
      if (raw === undefined || raw === null) {return;}
      const converted = mapping.xform(raw);
      if (typeof converted === 'number' && !isFinite(converted)) {return;}
      await this.device.setCapabilityValue(mapping.cap, converted);
    } catch (e) {
      // Device may be sleeping or cluster not readable - ignore
    }
  }

  /**
   * Schedule a one-shot timer
   */
  _schedule(ms, fn) {
    const t = this.homey.setTimeout(async () => {
      if (this._destroyed) return;
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
      if (t.type === 'timeout') {clearTimeout(t.ref);}
      if (t.type === 'interval') {clearInterval(t.ref);}
    }
    this._timers = [];
    this._added.clear();
    this.device.log?.('[DCM] Cleaned up');
  }

  /**
   * v5.12.0: Athom-style Capability Audit
   * Analyzes standard ZCL devices and removes phantom capabilities 
   * that are physically unsupported by the device variant.
   */
  async auditCapabilities() {
    if (!this.device || this.device.destroyed) return;
    
    // Safely detect if device is Tuya DP. If so, we skip standard ZCL cluster validation
    const isTuyaDP = this.device._isPureTuyaDP || this.device.getStoreValue('tuya_passive_mode') === true;
    if (isTuyaDP) {
      this.device.log('[DCM-AUDIT] Skipping audit: device uses Tuya DP (clusters not reliable)');
      return;
    }

    const zclNode = this.device.zclNode;
    if (!zclNode) return;

    this.device.log('[DCM-AUDIT] 🔍 Running deep capability audit (Phantom capability removal)...');

    const endpoints = zclNode.endpoints || {};
    let allDeviceClusters = new Set();
    
    for (const [epId, endpoint] of Object.entries(endpoints)) {
      if (isNaN(epId)) continue;
      for (const clusterId of Object.keys(endpoint.clusters || {})) {
        allDeviceClusters.add(clusterId.toLowerCase());
      }
    }

    const capabilities = this.device.getCapabilities();
    
    // Reverse map to check requirements
    const CLUSTER_REQUIREMENTS = {
      'measure_power': ['0b04', 'electricalmeasurement'],
      'meter_power': ['0702', 'metering', 'semetering'],
      'measure_voltage': ['0b04', 'electricalmeasurement'],
      'measure_current': ['0b04', 'electricalmeasurement'],
      'measure_temperature': ['0402', 'temperaturemeasurement'],
      'measure_humidity': ['0405', 'relativehumidity', 'relativehumiditymeasurement'],
      'measure_luminance': ['0400', 'illuminancemeasurement'],
      'measure_pressure': ['0403', 'pressuremeasurement'],
      'measure_battery': ['0001', 'powerconfiguration', 'genpowercfg'],
      'alarm_battery': ['0001', 'powerconfiguration', 'genpowercfg']
    };

    let removedCount = 0;

    for (const cap of capabilities) {
      const requiredClusters = CLUSTER_REQUIREMENTS[cap];
      if (requiredClusters) {
        // Does the device have AT LEAST ONE of the required clusters?
        const hasCluster = requiredClusters.some(rc => allDeviceClusters.has(rc));
        
        if (!hasCluster) {
          this.device.log(`[DCM-AUDIT] 🗑️ Removing phantom capability: ${cap} (Missing required cluster)`);
          try {
            await this.device.removeCapability(cap);
            removedCount++;
          } catch (e) {
            this.device.error(`[DCM-AUDIT] Failed to remove ${cap}:`, e.message);
          }
        }
      }
    }

    if (removedCount > 0) {
      // v9.0.40: Invalidate capability map cache after phantom removal
      if (typeof this.device._invalidateCapabilityMap === 'function') {
        this.device._invalidateCapabilityMap();
      }
      this.device.log(`[DCM-AUDIT] ✅ Audit complete: Removed ${removedCount} unsupported capabilities`);
    } else {
      this.device.log('[DCM-AUDIT] ✅ Audit complete: All capabilities natively supported');
    }
  }
}

module.exports = DynamicCapabilityManager;