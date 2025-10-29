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

    const now = new Date();
    
    // Build time payload: [year-2000, month, day, hour, minute, second, dayOfWeek]
    const payload = Buffer.from([
      now.getFullYear() - 2000,
      now.getMonth() + 1,
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getDay() // 0=Sunday
    ]);

    this.device.log('[TUYA] 📅 Sending time sync:', {
      date: now.toISOString(),
      payload: payload.toString('hex')
    });

    // Try each known time sync datapoint ID
    for (const dpId of this.timeSyncDPs) {
      try {
        await tuyaCluster.setDataValue({
          dp: dpId,
          datatype: 0x00, // RAW
          data: payload
        });
        
        this.device.log(`[TUYA] ✅ Time synced via DP 0x${dpId.toString(16)}`);
        return true;
      } catch (err) {
        this.device.log(`[TUYA] DP 0x${dpId.toString(16)} failed:`, err.message);
      }
    }

    this.device.log('[TUYA] ⚠️ Time sync failed on all DPs');
    return false;
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
      // Listen for dataReport command (DP reports from device)
      tuyaCluster.on('dataReport', (data) => {
        this.device.log('[TUYA] 📥 DataReport received:', data);
        this.handleDatapoint(data);
      });
      
      // Also listen for raw 'response' event
      tuyaCluster.on('response', (data) => {
        this.device.log('[TUYA] 📥 Response received:', data);
      });
      
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
