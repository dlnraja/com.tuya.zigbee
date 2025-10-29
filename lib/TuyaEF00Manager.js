'use strict';

/**
 * TuyaEF00Manager - Manage Tuya EF00 cluster datapoints
 * 
 * Handles:
 * - Time synchronization (DP 0x67)
 * - Custom datapoints parsing
 * - Automatic daily time sync
 */

class TuyaEF00Manager {
  
  constructor(device) {
    this.device = device;
    this.timeSyncDPs = [0x67, 0x01, 0x24, 0x18]; // Common time sync DPs
    this.dailySyncTimer = null;
  }

  /**
   * Initialize Tuya EF00 support
   */
  async initialize(zclNode) {
    if (!zclNode) return false;

    this.device.log('[TUYA] Initializing EF00 manager...');
    
    // Check if device has Tuya EF00 cluster (multiple possible names)
    const endpoint = zclNode.endpoints?.[1];
    if (!endpoint || !endpoint.clusters) {
      this.device.log('[TUYA] No endpoint 1 or clusters found');
      return false;
    }
    
    // Try all possible cluster names
    const tuyaCluster = endpoint.clusters.tuyaManufacturer 
                     || endpoint.clusters.tuyaSpecific 
                     || endpoint.clusters.manuSpecificTuya
                     || endpoint.clusters[0xEF00];
    
    if (!tuyaCluster) {
      this.device.log('[TUYA] No EF00 cluster found (not a Tuya DP device)');
      this.device.log('[TUYA] Available clusters:', Object.keys(endpoint.clusters).join(', '));
      return false;
    }

    this.device.log('[TUYA] ✅ EF00 cluster detected');
    this.tuyaCluster = tuyaCluster; // Store for later use
    await this.sendTimeSync(zclNode);
    
    // Schedule daily sync at 3 AM
    this.scheduleDailySync(zclNode);
    
    // Listen for incoming datapoints
    this.setupDatapointListener(tuyaCluster);
    
    return true;
  }

  /**
   * Send time synchronization to device
   */
  async sendTimeSync(zclNode) {
    if (!zclNode) return false;

    const endpoint = zclNode.endpoints?.[1];
    const tuyaCluster = endpoint?.clusters?.tuyaManufacturer 
                     || endpoint?.clusters?.tuyaSpecific 
                     || endpoint?.clusters?.manuSpecificTuya
                     || endpoint?.clusters?.[0xEF00];
    if (!tuyaCluster) return false;
    
    try {
      const now = new Date();
      const payload = Buffer.from([
        now.getFullYear() - 2000,
        now.getMonth() + 1,
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        Math.floor((now.getDay() + 6) % 7) // Monday = 0
      ]);
      
      this.device.log('[TUYA] Sending time sync:', { date: now.toISOString(), payload: payload.toString('hex') });
      
      // SDK3: Use dataRequest command (not setDataValue)
      try {
        await tuyaCluster.dataRequest({
          seq: Math.floor(Math.random() * 0xFFFF),
          dpValues: [{
            dp: 0x24, // Standard time sync DP
            datatype: 4, // STRING
            data: payload
          }]
        }).catch(err => {
          this.device.log(`[TUYA] Time sync failed: ${err.message}`);
        });
        
        this.device.log('[TUYA] Time sync command sent');
        return true;
      } catch (err) {
        this.device.log(`[TUYA] Time sync not supported: ${err.message}`);
        return false;
      }
    } catch (err) {
      this.device.error('[TUYA] Time sync error:', err.message);
      return false;
    }
  }

  /**
   * Schedule daily time sync
   */
  scheduleDailySync(zclNode) {
    if (this.dailySyncTimer) {
      clearTimeout(this.dailySyncTimer);
    }

    // Calculate ms until 3 AM tomorrow
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(3, 0, 0, 0);
    const msUntil3AM = tomorrow - now;

    this.device.log(`[TUYA] Next time sync in ${Math.round(msUntil3AM / 1000 / 60 / 60)}h`);

    this.dailySyncTimer = setTimeout(() => {
      this.sendTimeSync(zclNode);
      this.scheduleDailySync(zclNode); // Reschedule
    }, msUntil3AM);
  }

  /**
   * Setup datapoint listener
   */
  setupDatapointListener(tuyaCluster) {
    try {
      this.device.log('[TUYA] 🎧 Setting up datapoint listeners...');
      this.device.log(`[TUYA] 📋 Cluster methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(tuyaCluster)).join(', ')}`);
      
      // Listen for dataReport command (DP reports from device)
      if (typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('dataReport', (data) => {
          this.device.log('[TUYA] 📥 DataReport received:', JSON.stringify(data));
          this.handleDatapoint(data);
        });
        this.device.log('[TUYA] ✅ dataReport listener registered');
      } else {
        this.device.log('[TUYA] ⚠️ tuyaCluster.on not available');
      }
      
      // Also try onDataReport property assignment (alternative SDK3 method)
      if (tuyaCluster.onDataReport === undefined) {
        tuyaCluster.onDataReport = (data) => {
          this.device.log('[TUYA] 📥 DataReport (property) received:', JSON.stringify(data));
          this.handleDatapoint(data);
        };
        this.device.log('[TUYA] ✅ onDataReport property listener set');
      }
      
      // Listen for response events (some devices use this)
      if (typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('response', (data) => {
          this.device.log('[TUYA] 📥 Response received:', JSON.stringify(data));
          // Some devices send data via response instead of dataReport
          if (data && (data.dpValues || data.dp !== undefined)) {
            this.handleDatapoint(data);
          }
        });
      }
      
      this.device.log('[TUYA] ✅ Datapoint listener configured');
    } catch (err) {
      this.device.error('[TUYA] Failed to setup listener:', err.message);
    }
  }

  /**
   * Handle incoming datapoint
   */
  handleDatapoint(data) {
    if (!data || !data.dpId) {
      this.device.log('[TUYA] Invalid DP data received');
      return;
    }
    
    const dp = data.dpId;
    const value = data.dpValue;
    
    this.device.log(`[TUYA] DP ${dp} = ${JSON.stringify(value)}`);
    
    // Common DP mappings (override in device-specific code)
    const dpMappings = {
      1: 'measure_temperature',  // Temperature (°C * 10)
      2: 'measure_humidity',      // Humidity (% * 10)
      3: 'measure_luminance',     // Lux
      4: 'measure_battery',       // Battery %
      5: 'alarm_motion',          // Motion (bool)
      9: 'alarm_contact',         // Contact (bool)
      18: 'measure_temperature',  // Alt temperature
      19: 'measure_humidity',     // Alt humidity
      101: 'onoff',               // On/Off (bool)
      103: 'onoff.usb2'           // USB port 2 (bool)
    };
    
    const capability = dpMappings[dp];
    
    if (capability && this.device.hasCapability(capability)) {
      // Parse value based on type
      let parsedValue = value;
      
      // Temperature/Humidity: divide by 10
      if (capability.includes('temperature') || capability.includes('humidity')) {
        parsedValue = value / 10;
      }
      
      // Bool: ensure boolean
      if (capability.includes('alarm') || capability === 'onoff' || capability === 'onoff.usb2') {
        parsedValue = Boolean(value);
      }
      
      this.device.setCapabilityValue(capability, parsedValue)
        .then(() => {
          this.device.log(`[TUYA] ${capability} = ${parsedValue}`);
        })
        .catch(err => {
          this.device.error(`[TUYA] Failed to set ${capability}:`, err.message);
        });
    } else {
      // Use DP pool for unknown DPs
      if (this.device.setTuyaDpValue) {
        this.device.setTuyaDpValue(dp, value);
      } else {
        this.device.log(`[TUYA] Unmapped DP ${dp}, value:`, value);
      }
    }
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.dailySyncTimer) {
      clearTimeout(this.dailySyncTimer);
      this.dailySyncTimer = null;
    }
    
    // Remove listeners
    if (this.tuyaCluster) {
      try {
        this.tuyaCluster.removeAllListeners('dataReport');
        this.tuyaCluster.removeAllListeners('response');
      } catch (err) {
        // Ignore
      }
    }
  }
}

module.exports = TuyaEF00Manager;
