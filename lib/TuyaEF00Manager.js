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
    
    // Feature detection
    this.detectAvailableMethods();
    
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
      
      // SDK3: Send raw frame with time sync
      try {
        const endpoint = zclNode.endpoints?.[1];
        if (!endpoint) {
          this.device.log('[TUYA] No endpoint 1');
          return false;
        }
        
        // Build Tuya frame: [seq:2][dp:1][type:1][len:2][data]
        const dp = 0x24; // Time sync DP
        const datatype = 0x00; // RAW
        const seq = Math.floor(Math.random() * 0xFFFF);
        
        const frame = Buffer.alloc(4 + payload.length);
        frame.writeUInt8(dp, 0);
        frame.writeUInt8(datatype, 1);
        frame.writeUInt16BE(payload.length, 2);
        payload.copy(frame, 4);
        
        // Send via sendFrame
        await endpoint.Promise.resolve(sendFrame(0xEF00, 0x00, frame)).catch(err => {
          this.device.log(`[TUYA] Time sync sendFrame failed: ${err.message}`);
        });
        
        this.device.log('[TUYA] Time sync frame sent');
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
      
      // DEBUG: Log cluster structure
      this.device.log(`[TUYA] 📋 Cluster type: ${tuyaCluster.constructor.name}`);
      this.device.log(`[TUYA] 📋 Cluster ID: ${tuyaCluster.id || 'unknown'}`);
      
      // SDK3 CRITICAL: Use bound listener, not .on()
      // TS0601 sends data via raw Zigbee frames, not cluster events
      
      // Method 1: Bound frame listener (SDK3 way)
      const boundListener = this.handleDatapoint.bind(this);
      
      // Try to bind to cluster's command handler
      if (tuyaCluster.constructor && tuyaCluster.constructor.COMMANDS) {
        this.device.log('[TUYA] 📋 Available commands:', Object.keys(tuyaCluster.constructor.COMMANDS).join(', '));
      }
      
      // SDK3: Listen directly to cluster commands
      // dataReport = command 0x01 or 0x02
      const dataReportHandler = async (data) => {
        this.device.log('[TUYA] 📥 DataReport received:', JSON.stringify(data));
        this.handleDatapoint(data);
      };
      
      // Bind to both possible command names
      if (tuyaCluster.constructor.COMMANDS) {
        // Register for dataReport command (0x01)
        try {
          const endpoint = this.device.zclNode?.endpoints?.[1];
          if (endpoint) {
            endpoint.on('frame', (frame) => {
              // Check if it's from Tuya cluster
              if (frame.cluster === 0xEF00 || frame.cluster === 61184) {
                this.device.log('[TUYA] 📥 Raw frame:', JSON.stringify({
                  cluster: frame.cluster,
                  command: frame.command,
                  data: frame.data?.toString('hex')
                }));
                
                // Parse Tuya frame
                if (frame.data && frame.data.length > 0) {
                  this.parseTuyaFrame(frame.data);
                }
              }
            });
            this.device.log('[TUYA] ✅ Raw frame listener registered');
          }
        } catch (err) {
          this.device.log('[TUYA] ⚠️ Frame listener failed:', err.message);
        }
      }
      
      this.device.log('[TUYA] ✅ Datapoint listener configured (SDK3 frame mode)');
    } catch (err) {
      this.device.error('[TUYA] Failed to setup listener:', err.message);
    }
  }
  
  /**
   * Parse raw Tuya frame data
   */
  parseTuyaFrame(buffer) {
    try {
      // Tuya frame format: [seq:2][dp:1][type:1][len:2][data:len]
      let offset = 0;
      
      while (offset < buffer.length) {
        if (offset + 4 > buffer.length) break;
        
        const dp = buffer.readUInt8(offset);
        const datatype = buffer.readUInt8(offset + 1);
        const len = buffer.readUInt16BE(offset + 2);
        
        if (offset + 4 + len > buffer.length) break;
        
        const data = buffer.slice(offset + 4, offset + 4 + len);
        
        this.device.log(`[TUYA] 📊 Parsed DP ${dp}: type=${datatype}, len=${len}, data=${data.toString('hex')}`);
        
        // Parse value based on datatype
        let value;
        switch (datatype) {
          case 0x00: // RAW
            value = data;
            break;
          case 0x01: // BOOL
            value = data.readUInt8(0) === 1;
            break;
          case 0x02: // VALUE (4 bytes)
            value = data.readUInt32BE(0);
            break;
          case 0x03: // STRING
            value = data.toString('utf8');
            break;
          case 0x04: // ENUM
            value = data.readUInt8(0);
            break;
          default:
            value = data;
        }
        
        this.handleDatapoint({ dp, datatype, data: value });
        
        offset += 4 + len;
      }
    } catch (err) {
      this.device.error('[TUYA] Frame parse failed:', err.message);
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
      
      // Temperature/Humidity/Voltage: divide by 10
      if (capability.includes('temperature') || capability.includes('humidity') || capability === 'measure_voltage') {
        parsedValue = typeof value === 'number' ? value / 10 : value;
      }
      
      // Current: convert mA to A
      if (capability === 'measure_current') {
        parsedValue = typeof value === 'number' ? value / 1000 : value;
      }
      
      // Bool: ensure boolean
      if (capability.includes('alarm') || capability === 'onoff' || capability === 'onoff.usb2' || capability === 'led_mode') {
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
