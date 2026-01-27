'use strict';

/**
 * PeriodicAutoEnricherMixin - v5.5.855
 * 
 * Provides periodic auto-enrichment for ALL drivers:
 * - 15 minutes after init: First deep scan
 * - Every hour: Periodic capability refresh
 * 
 * Auto-detects and adds capabilities based on:
 * - ZCL clusters present on the device
 * - Tuya DPs received
 * - Dynamic flow card registration
 * 
 * Usage: Apply to any device class via Object.assign or extends
 */

// ZCL Cluster ID to capability mapping
const ZCL_CLUSTER_CAPABILITIES = {
  0x0000: null, // Basic - no capability
  0x0001: 'measure_battery', // Power Configuration
  0x0006: 'onoff', // On/Off
  0x0008: 'dim', // Level Control
  0x0102: 'windowcoverings_set', // Window Covering
  0x0201: 'target_temperature', // Thermostat
  0x0300: ['light_hue', 'light_saturation', 'light_temperature'], // Color Control
  0x0400: 'measure_luminance', // Illuminance Measurement
  0x0402: 'measure_temperature', // Temperature Measurement
  0x0403: 'measure_pressure', // Pressure Measurement
  0x0405: 'measure_humidity', // Relative Humidity
  0x0406: 'alarm_motion', // Occupancy Sensing
  0x0500: 'alarm_contact', // IAS Zone
  0x0702: ['measure_power', 'meter_power'], // Metering
  0x0B04: ['measure_power', 'measure_voltage', 'measure_current'], // Electrical Measurement
  0xEF00: null, // Tuya - handled separately
};

// Tuya DP to capability heuristics
const TUYA_DP_CAPABILITIES = {
  1: ['measure_temperature', 'onoff', 'alarm_motion'], // Context-dependent
  2: ['measure_humidity', 'dim'],
  3: ['measure_humidity', 'measure_temperature'],
  4: 'measure_battery',
  5: ['measure_humidity', 'measure_temperature'],
  6: 'onoff',
  7: ['alarm_contact', 'measure_luminance'],
  9: 'measure_distance',
  12: 'measure_luminance',
  14: 'alarm_battery',
  15: 'measure_battery',
  18: 'measure_temperature',
  19: 'measure_humidity',
  20: 'measure_luminance',
  21: 'measure_voltage',
  101: 'alarm_motion',
  102: 'alarm_contact',
  103: 'measure_luminance',
  104: 'alarm_motion',
  105: 'alarm_motion',
  106: 'measure_luminance',
};

const PeriodicAutoEnricherMixin = {
  
  /**
   * Initialize periodic auto-enrichment
   * Call this from onNodeInit after all other setup
   */
  initPeriodicAutoEnricher() {
    this.log('[AUTO-ENRICH] 🚀 Initializing periodic auto-enrichment...');
    
    // Track discovered capabilities
    this._enricherState = {
      initialized: Date.now(),
      lastScan: null,
      discoveredClusters: new Set(),
      discoveredDPs: new Set(),
      addedCapabilities: [],
      scanCount: 0,
    };
    
    // Schedule first scan at 15 minutes
    this._scheduleInitialScan();
    
    // Schedule hourly scans
    this._scheduleHourlyScan();
    
    this.log('[AUTO-ENRICH] ✅ Periodic enrichment scheduled (15min + hourly)');
  },
  
  /**
   * Schedule initial deep scan at 15 minutes
   */
  _scheduleInitialScan() {
    const INITIAL_DELAY_MS = 15 * 60 * 1000; // 15 minutes
    
    this._initialScanTimeout = setTimeout(async () => {
      this.log('[AUTO-ENRICH] ⏰ Running initial 15-minute scan...');
      await this._performDeepScan();
    }, INITIAL_DELAY_MS);
    
    this.log(`[AUTO-ENRICH] 📅 Initial scan scheduled in 15 minutes`);
  },
  
  /**
   * Schedule hourly capability refresh
   */
  _scheduleHourlyScan() {
    const HOURLY_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
    
    this._hourlyScanInterval = setInterval(async () => {
      this.log('[AUTO-ENRICH] ⏰ Running hourly capability scan...');
      await this._performDeepScan();
    }, HOURLY_INTERVAL_MS);
    
    this.log('[AUTO-ENRICH] 📅 Hourly scans scheduled');
  },
  
  /**
   * Perform deep scan of device capabilities
   */
  async _performDeepScan() {
    if (!this.zclNode || this.destroyed) {
      this.log('[AUTO-ENRICH] ⚠️ Device not ready for scan');
      return;
    }
    
    this._enricherState.scanCount++;
    this._enricherState.lastScan = Date.now();
    
    this.log(`[AUTO-ENRICH] 🔍 Deep scan #${this._enricherState.scanCount} starting...`);
    
    try {
      // 1. Scan ZCL clusters
      await this._scanZCLClusters();
      
      // 2. Check received Tuya DPs
      await this._scanTuyaDPs();
      
      // 3. Register flow cards for new capabilities
      await this._registerDynamicFlowCards();
      
      // 4. Log summary
      this._logScanSummary();
      
    } catch (err) {
      this.error('[AUTO-ENRICH] Scan error:', err.message);
    }
  },
  
  /**
   * Scan ZCL clusters and add missing capabilities
   */
  async _scanZCLClusters() {
    this.log('[AUTO-ENRICH] 📡 Scanning ZCL clusters...');
    
    const endpoints = this.zclNode?.endpoints || {};
    let addedCount = 0;
    
    for (const [epId, endpoint] of Object.entries(endpoints)) {
      const clusters = endpoint.clusters || {};
      
      for (const [clusterName, cluster] of Object.entries(clusters)) {
        // Get cluster ID
        const clusterId = cluster?.ID || parseInt(clusterName) || null;
        if (!clusterId) continue;
        
        // Track discovered cluster
        this._enricherState.discoveredClusters.add(clusterId);
        
        // Get capability mapping
        const capabilities = ZCL_CLUSTER_CAPABILITIES[clusterId];
        if (!capabilities) continue;
        
        // Add capabilities
        const capList = Array.isArray(capabilities) ? capabilities : [capabilities];
        for (const cap of capList) {
          if (cap && !this.hasCapability(cap)) {
            try {
              await this.addCapability(cap);
              this._enricherState.addedCapabilities.push({ cap, source: `ZCL-0x${clusterId.toString(16)}` });
              addedCount++;
              this.log(`[AUTO-ENRICH] ➕ Added ${cap} from cluster 0x${clusterId.toString(16)}`);
            } catch (e) {
              // Capability might not be valid for this device class
            }
          }
        }
        
        // Try to read current value from cluster
        await this._tryReadClusterValue(cluster, clusterId, capList);
      }
    }
    
    this.log(`[AUTO-ENRICH] 📡 ZCL scan complete: ${addedCount} capabilities added`);
  },
  
  /**
   * Try to read current value from a cluster
   */
  async _tryReadClusterValue(cluster, clusterId, capabilities) {
    if (!cluster || typeof cluster.readAttributes !== 'function') return;
    
    try {
      // Temperature
      if (clusterId === 0x0402 && this.hasCapability('measure_temperature')) {
        const { measuredValue } = await cluster.readAttributes(['measuredValue']).catch(() => ({}));
        if (measuredValue !== undefined) {
          const temp = measuredValue / 100;
          await this.setCapabilityValue('measure_temperature', temp).catch(() => {});
          this.log(`[AUTO-ENRICH] 🌡️ Read temperature: ${temp}°C`);
        }
      }
      
      // Humidity
      if (clusterId === 0x0405 && this.hasCapability('measure_humidity')) {
        const { measuredValue } = await cluster.readAttributes(['measuredValue']).catch(() => ({}));
        if (measuredValue !== undefined) {
          const humidity = measuredValue / 100;
          await this.setCapabilityValue('measure_humidity', humidity).catch(() => {});
          this.log(`[AUTO-ENRICH] 💧 Read humidity: ${humidity}%`);
        }
      }
      
      // Battery
      if (clusterId === 0x0001 && this.hasCapability('measure_battery')) {
        const { batteryPercentageRemaining } = await cluster.readAttributes(['batteryPercentageRemaining']).catch(() => ({}));
        if (batteryPercentageRemaining !== undefined) {
          const battery = Math.min(100, Math.round(batteryPercentageRemaining / 2));
          await this.setCapabilityValue('measure_battery', battery).catch(() => {});
          this.log(`[AUTO-ENRICH] 🔋 Read battery: ${battery}%`);
        }
      }
      
      // Illuminance
      if (clusterId === 0x0400 && this.hasCapability('measure_luminance')) {
        const { measuredValue } = await cluster.readAttributes(['measuredValue']).catch(() => ({}));
        if (measuredValue !== undefined && measuredValue > 0) {
          const lux = Math.round(Math.pow(10, (measuredValue - 1) / 10000));
          await this.setCapabilityValue('measure_luminance', lux).catch(() => {});
          this.log(`[AUTO-ENRICH] ☀️ Read luminance: ${lux} lux`);
        }
      }
      
    } catch (err) {
      // Silently ignore read errors - device might be sleeping
    }
  },
  
  /**
   * Scan received Tuya DPs and add missing capabilities
   */
  async _scanTuyaDPs() {
    this.log('[AUTO-ENRICH] 📦 Scanning Tuya DPs...');
    
    // Get received DPs from various sources
    const receivedDPs = this._receivedDPs || {};
    const storedDPs = await this.getStoreValue('discovered_dps') || {};
    const allDPs = { ...storedDPs, ...receivedDPs };
    
    let addedCount = 0;
    
    for (const [dpId, dpInfo] of Object.entries(allDPs)) {
      const dp = parseInt(dpId);
      this._enricherState.discoveredDPs.add(dp);
      
      // Get potential capabilities for this DP
      const potentialCaps = TUYA_DP_CAPABILITIES[dp];
      if (!potentialCaps) continue;
      
      const capList = Array.isArray(potentialCaps) ? potentialCaps : [potentialCaps];
      
      // Use value to determine best capability
      const value = dpInfo?.value ?? dpInfo;
      const bestCap = this._selectBestCapability(dp, value, capList);
      
      if (bestCap && !this.hasCapability(bestCap)) {
        try {
          await this.addCapability(bestCap);
          this._enricherState.addedCapabilities.push({ cap: bestCap, source: `DP${dp}` });
          addedCount++;
          this.log(`[AUTO-ENRICH] ➕ Added ${bestCap} from DP${dp}`);
        } catch (e) {
          // Capability might not be valid
        }
      }
    }
    
    // Store discovered DPs for next scan
    await this.setStoreValue('discovered_dps', allDPs).catch(() => {});
    
    this.log(`[AUTO-ENRICH] 📦 DP scan complete: ${addedCount} capabilities added`);
  },
  
  /**
   * Select best capability based on DP value
   */
  _selectBestCapability(dp, value, candidates) {
    if (candidates.length === 1) return candidates[0];
    
    // Temperature vs onoff vs motion for DP1
    if (dp === 1) {
      if (typeof value === 'boolean') {
        return this.driver?.id?.includes('motion') ? 'alarm_motion' : 'onoff';
      }
      if (typeof value === 'number' && value > 100) {
        return 'measure_temperature'; // Values like 250 = 25.0°C
      }
    }
    
    // Humidity vs dim for DP2
    if (dp === 2) {
      if (typeof value === 'number' && value <= 100) {
        return this.driver?.id?.includes('dim') ? 'dim' : 'measure_humidity';
      }
    }
    
    // Default to first candidate
    return candidates[0];
  },
  
  /**
   * Register flow cards for dynamically added capabilities
   */
  async _registerDynamicFlowCards() {
    if (!this.dynamicFlowCardManager) return;
    
    const caps = this.getCapabilities();
    for (const cap of caps) {
      try {
        await this.dynamicFlowCardManager._registerFlowCardsForCapability(cap);
      } catch (e) {
        // Ignore flow card registration errors
      }
    }
    
    this.log('[AUTO-ENRICH] 🎯 Flow cards registered for capabilities');
  },
  
  /**
   * Log scan summary
   */
  _logScanSummary() {
    const state = this._enricherState;
    const uptime = Math.round((Date.now() - state.initialized) / 60000);
    
    this.log('[AUTO-ENRICH] ═══════════════════════════════════════════');
    this.log(`[AUTO-ENRICH] 📊 Scan #${state.scanCount} Summary (uptime: ${uptime}min)`);
    this.log(`[AUTO-ENRICH] • ZCL clusters: ${state.discoveredClusters.size}`);
    this.log(`[AUTO-ENRICH] • Tuya DPs: ${state.discoveredDPs.size}`);
    this.log(`[AUTO-ENRICH] • Added capabilities: ${state.addedCapabilities.length}`);
    if (state.addedCapabilities.length > 0) {
      this.log(`[AUTO-ENRICH] • New: ${state.addedCapabilities.map(c => c.cap).join(', ')}`);
    }
    this.log('[AUTO-ENRICH] ═══════════════════════════════════════════');
  },
  
  /**
   * Force immediate scan (can be called from settings or maintenance)
   */
  async forceEnrichmentScan() {
    this.log('[AUTO-ENRICH] 🔄 Force scan requested');
    await this._performDeepScan();
  },
  
  /**
   * Get enrichment status
   */
  getEnrichmentStatus() {
    return {
      initialized: this._enricherState?.initialized,
      lastScan: this._enricherState?.lastScan,
      scanCount: this._enricherState?.scanCount || 0,
      discoveredClusters: Array.from(this._enricherState?.discoveredClusters || []),
      discoveredDPs: Array.from(this._enricherState?.discoveredDPs || []),
      addedCapabilities: this._enricherState?.addedCapabilities || [],
    };
  },
  
  /**
   * Cleanup on device deletion
   */
  cleanupPeriodicEnricher() {
    if (this._initialScanTimeout) {
      clearTimeout(this._initialScanTimeout);
    }
    if (this._hourlyScanInterval) {
      clearInterval(this._hourlyScanInterval);
    }
    this.log('[AUTO-ENRICH] 🧹 Periodic enricher cleaned up');
  },
};

module.exports = PeriodicAutoEnricherMixin;
