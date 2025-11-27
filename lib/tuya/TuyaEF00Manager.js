'use strict';

const { EventEmitter } = require('events');
const TuyaDPParser = require('./TuyaDPParser');
const { getDeviceInfo, getDPMappings, parseValue } = require('../utils/DriverMappingLoader');
const { getTuyaProfile } = require('./TuyaProfiles');

/**
 * TuyaEF00Manager - Manage Tuya EF00 cluster datapoints
 *
 * Based on official Tuya Developer documentation:
 * https://developer.tuya.com/en/docs/connect-subdevices-to-gateways
 * https://developer.tuya.com/en/docs/iot/custom-functions
 *
 * Handles:
 * - Time synchronization (DP 0x24, 0x67)
 * - Data Point (DP) parsing and encoding
 * - Automatic daily time sync
 * - Multi-Gang Switch standard (DP1-4, DP7-10, DP14-16, DP19, DP29-32)
 * - All DP types: Boolean, Value, String, Enum, Bitmap, Raw
 *
 * Integrates with:
 * - TuyaDPParser: Low-level DP encoding/decoding
 * - HybridProtocolManager: Intelligent Tuya DP vs Zigbee native routing
 * - TuyaMultiGangManager: Multi-gang switch features
 */

class TuyaEF00Manager extends EventEmitter {

  constructor(device) {
    super();
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

    // 🆕 Load device-specific mappings from database
    const deviceData = this.device.getData();
    const model = deviceData.productId || this.device.getSetting('zb_product_id') || 'unknown';
    const manufacturer = deviceData.manufacturerId || this.device.getSetting('zb_manufacturer_name') || 'unknown';

    this.device.log(`[TUYA] 📋 Device: ${model} (${manufacturer})`);

    // Load centralized Tuya profile
    const profile = getTuyaProfile(model, manufacturer);
    if (profile) {
      this.device.log(`[TUYA] ✅ Profile loaded: ${profile.name}`);
      this.device.log(`[TUYA] Driver: ${profile.driver || 'auto'}`);
      this.device.setStoreValue('tuya_profile', profile.key).catch(() => { });
      this.tuyaProfile = profile;
    } else {
      this.device.log(`[TUYA] ⚠️  No profile for ${model}/${manufacturer} - using generic`);
    }

    // Try to get device info from database
    this.deviceInfo = getDeviceInfo(model, manufacturer);
    if (this.deviceInfo) {
      this.device.log(`[TUYA] ✅ Found in database: ${this.deviceInfo.name}`);
      this.device.log(`[TUYA]    Recommended driver: ${this.deviceInfo.driver}`);
      this.device.log(`[TUYA]    DPs: ${Object.keys(this.deviceInfo.dps).join(', ')}`);
    } else {
      this.device.log('[TUYA] ℹ️  Device not in database, using fallback mappings');
    }

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
      this.device.log('[TUYA] ℹ️  Device uses standard Zigbee clusters (not Tuya DP protocol)');
      this.device.log('[TUYA] ✅ Available clusters:', Object.keys(endpoint.clusters).join(', '));
      this.device.log('[TUYA] ℹ️  Tuya EF00 manager not needed for this device');
      return false;
    }

    this.device.log('[TUYA] ✅ EF00 cluster detected');
    this.tuyaCluster = tuyaCluster; // Store for later use

    await this.sendTimeSync(zclNode);

    // Schedule daily sync at 3 AM
    this.scheduleDailySync(zclNode);

    // Listen for incoming datapoints
    this.setupDatapointListener(tuyaCluster);

    // 🆕 Request DPs from database if available, otherwise use fallback
    this.device.log('[TUYA] 🔍 Will request critical DPs after initialization...');
    setTimeout(async () => {
      this.device.log('[TUYA] 📦 NOW requesting critical DPs...');

      if (this.deviceInfo && this.deviceInfo.dps) {
        // Use database DPs
        const dpIds = Object.keys(this.deviceInfo.dps);
        this.device.log(`[TUYA] 📦 Requesting ${dpIds.length} DPs from database: [${dpIds.join(', ')}]`);
        for (const dpId of dpIds) {
          await this.requestDP(parseInt(dpId));
          await new Promise(resolve => setTimeout(resolve, 200)); // Space out requests
        }
      } else {
        // Fallback: request common DPs
        this.device.log('[TUYA] 📦 Requesting common DPs (fallback)...');
        await this.requestDP(1);  // Temperature or Motion
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(2);  // Humidity or Sensitivity
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(4);  // Battery %
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(15);  // Battery % (most common)
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(3);  // Soil temp
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(5);  // Soil moisture
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(9);  // Target distance
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(101); // Sensitivity
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(102); // Lux threshold
        await new Promise(resolve => setTimeout(resolve, 200));
        await this.requestDP(14);  // Battery low
      }

      this.device.log('[TUYA] ✅ All critical DP requests sent');
      this.device.log('[TUYA] ℹ️  Waiting for device responses...');

      // Schedule a retry after 30s if no data received
      setTimeout(() => {
        this.device.log('[TUYA] 🔄 Retry: Requesting DPs again for stubborn devices...');
        if (this.deviceInfo && this.deviceInfo.dps) {
          const dpIds = Object.keys(this.deviceInfo.dps);
          dpIds.forEach(dpId => this.requestDP(parseInt(dpId)));
        } else {
          [1, 2, 4, 15].forEach(dp => this.requestDP(dp)); // Most critical DPs
        }
      }, 30000);
    }, 5000); // Wait 5s for device to be fully ready (increased from 3s)

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

        // Send via dataRequest (correct SDK3 method)
        try {
          await tuyaCluster.dataRequest({
            dp: dp,
            datatype: datatype,
            data: payload
          });
          this.device.log('[TUYA] Time sync sent via dataRequest');
          return true;
        } catch (err1) {
          // Fallback: try sendFrame with correct syntax
          try {
            await endpoint.sendFrame(0xEF00, frame, 0x00);
            this.device.log('[TUYA] Time sync sent via sendFrame');
            return true;
          } catch (err2) {
            this.device.log('[TUYA] Time sync failed both methods:', err1.message, err2.message);
            return false;
          }
        }
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

      // URGENT FIX: Listen to dataReport command (THE ONE THAT ACTUALLY WORKS!)
      if (typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('dataReport', (data) => {
          this.device.log('[TUYA] 📦 dataReport EVENT received!', JSON.stringify(data, null, 2));
          this.handleDatapoint(data);
        });
        this.device.log('[TUYA] ✅ dataReport listener registered');
      } else {
        this.device.log('[TUYA] ⚠️  tuyaCluster.on is not a function!');
      }

      // Also listen to any raw frame
      if (typeof tuyaCluster.on === 'function') {
        tuyaCluster.on('response', (data) => {
          this.device.log('[TUYA] 📦 response EVENT received!', JSON.stringify(data, null, 2));
          this.handleDatapoint(data);
        });
        this.device.log('[TUYA] ✅ response listener registered');
      }

      // Listen to ALL cluster events for debugging
      if (typeof tuyaCluster.on === 'function') {
        const allEvents = ['data', 'command', 'report', 'datapoint'];
        allEvents.forEach(eventName => {
          tuyaCluster.on(eventName, (data) => {
            this.device.log(`[TUYA] 📦 ${eventName} EVENT received!`, JSON.stringify(data, null, 2));
            this.handleDatapoint(data);
          });
        });
        this.device.log('[TUYA] ✅ Additional event listeners registered');
      }

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
   * Request datapoint value from device (SDK3)
   */
  async requestDP(dp) {
    try {
      this.device.log(`[TUYA] 🔍 Requesting DP ${dp}...`);

      const endpoint = this.device.zclNode?.endpoints?.[1];
      if (!endpoint) {
        // v5.0.6: Don't throw - just return false silently
        this.device.log('[TUYA] ℹ️  Endpoint 1 not available for requestDP');
        return false;
      }

      const tuyaCluster = endpoint.clusters.tuyaManufacturer
        || endpoint.clusters.tuyaSpecific
        || endpoint.clusters.manuSpecificTuya
        || endpoint.clusters[0xEF00];

      if (!tuyaCluster) {
        // v5.0.6: Don't throw/error - this is normal for devices without Tuya cluster
        // Only log once per device session to avoid spam
        if (!this._clusterMissingLogged) {
          this.device.log('[TUYA] ℹ️  Tuya cluster not available - device may use standard Zigbee');
          this._clusterMissingLogged = true;
        }
        return false;
      }

      // Use getData command (0x01) with DP buffer - correct Tuya protocol
      const seq = Math.floor(Math.random() * 0xFFFF);

      try {
        if (typeof tuyaCluster.getData === 'function') {
          const dpBuffer = Buffer.from([dp]);

          await tuyaCluster.getData({
            seq: seq,
            datapoints: dpBuffer
          });

          this.device.log(`[TUYA] ✅ DP${dp} query sent via getData (waiting for dataReport)`);
          return true;
        } else {
          this.device.log(`[TUYA] ⚠️ getData not available - passive reporting only`);
          return false;
        }
      } catch (err) {
        this.device.log(`[TUYA] getData failed for DP${dp}:`, err.message);
        this.device.log('[TUYA] ℹ️  Normal for battery devices - they report passively on wake');
        return false;
      }

    } catch (err) {
      // v5.0.6: Log at info level, not error - this is often normal for battery devices
      this.device.log('[TUYA] ℹ️  requestDP:', err.message || err);
      return false;
    }
  }

  /**
   * Parse raw Tuya frame data using TuyaDPParser
   * Integrates official Tuya DP type parsing
   */
  parseTuyaFrame(buffer) {
    try {
      // Tuya frame format: [status:1][seq:1][dp:1][type:1][len:2][data:len]
      let offset = 0;

      while (offset < buffer.length) {
        if (offset + 6 > buffer.length) break;

        // Use TuyaDPParser for consistent parsing
        const dpBuffer = buffer.slice(offset);
        try {
          const parsed = TuyaDPParser.parse(dpBuffer);

          this.device.log(`[TUYA] 📊 Parsed DP ${parsed.dpId}: type=${parsed.dpType}, value=${JSON.stringify(parsed.dpValue)}`);

          this.handleDatapoint({
            dp: parsed.dpId,
            datatype: parsed.dpType,
            data: parsed.dpValue
          });

          // Calculate offset for next DP
          const dpTypeSize = dpBuffer.readUInt8(3);
          const dataLength = dpBuffer.readUInt16BE(4);
          offset += 6 + dataLength;
        } catch (parseErr) {
          this.device.error('[TUYA] DP parse error:', parseErr.message);
          break;
        }
      }
    } catch (err) {
      this.device.error('[TUYA] Frame parse failed:', err.message);
    }
  }

  /**
   * Send Tuya DP command using TuyaDPParser
   * @param {number} dp - Data Point ID
   * @param {number} dpType - DP Type (from TuyaDPParser.DP_TYPE)
   * @param {any} value - Value to send
   */
  async sendTuyaDP(dp, dpType, value) {
    try {
      this.device.log(`[TUYA] 📤 Sending DP${dp} = ${value} (type: ${dpType})`);

      const endpoint = this.device.zclNode?.endpoints?.[1];
      if (!endpoint) {
        throw new Error('Endpoint not available');
      }

      const tuyaCluster = endpoint.clusters.tuyaManufacturer
        || endpoint.clusters.tuyaSpecific
        || endpoint.clusters.manuSpecificTuya
        || endpoint.clusters[0xEF00];

      if (!tuyaCluster) {
        throw new Error('Tuya cluster not available');
      }

      // Use TuyaDPParser to encode
      const buffer = TuyaDPParser.encode(dp, dpType, value);

      // Send via cluster
      await endpoint.sendFrame(0xEF00, buffer, 0x00);

      this.device.log(`[TUYA] ✅ DP${dp} sent successfully`);
      return true;
    } catch (err) {
      this.device.error(`[TUYA] Failed to send DP${dp}:`, err.message);
      return false;
    }
  }

  /**
   * Handle incoming datapoint
   */
  handleDatapoint(data) {
    if (!data || (!data.dpId && !data.dp)) {
      this.device.log('[TUYA] Invalid DP data received');
      return;
    }

    const dp = data.dpId || data.dp;
    const value = data.dpValue || data.data;

    this.device.log(`[TUYA] DP ${dp} = ${JSON.stringify(value)}`);

    // Emit event for driver-specific handling
    this.emit(`dp-${dp}`, value);
    this.emit('datapoint', { dp, value });

    // Common DP mappings (override in device-specific code)
    // NOTE: DP 1 can be BOTH temperature AND motion depending on device type!
    const dpMappings = {
      // Soil Sensor DPs
      1: 'measure_temperature',   // Temperature (°C * 10) - most common
      // 1: 'alarm_motion',       // Motion (bool) - for PIR sensors - handled by driver override
      2: 'measure_humidity',       // Humidity (% * 10) OR sensitivity for PIR
      3: 'measure_temperature',    // Soil temperature (°C * 10)
      5: 'measure_humidity',       // Soil moisture (% * 10) - SOIL SENSOR CRITICAL!

      // PIR/Motion Sensor DPs
      9: 'target_distance',        // PIR target distance (cm)
      101: 'radar_sensitivity',    // PIR sensitivity
      102: 'illuminance_threshold', // PIR lux threshold

      // Battery
      4: 'measure_battery',        // Battery % (some devices)
      14: 'alarm_battery',         // Battery low alarm (bool)
      15: 'measure_battery',       // Battery % (most common)

      // Contact/Motion
      7: 'alarm_contact',          // Contact (bool)
      18: 'measure_temperature',   // Alt temperature
      19: 'measure_humidity',      // Alt humidity

      // Switches
      103: 'onoff.usb2'            // USB port 2 (bool)
    };

    const capability = dpMappings[dp];

    if (capability) {
      // Check if device has this capability
      if (!this.device.hasCapability(capability)) {
        this.device.log(`[TUYA] ⚠️ Device missing capability ${capability} for DP ${dp} - skipping`);

        // Try to add it if it's a standard capability
        if (capability.startsWith('measure_') || capability.startsWith('alarm_')) {
          try {
            this.device.addCapability(capability).catch(err => {
              this.device.log(`[TUYA] ℹ️ Cannot add ${capability}: ${err.message}`);
            });
          } catch (e) {
            // Ignore
          }
        }

        // Store in DP pool anyway
        if (this.device.setTuyaDpValue) {
          this.device.setTuyaDpValue(dp, value);
        }
        return;
      }

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

      // Distance: cm to meters for some capabilities
      if (capability === 'target_distance') {
        parsedValue = typeof value === 'number' ? value / 100 : value;
      }

      // Bool: ensure boolean
      if (capability.includes('alarm') || capability === 'onoff' || capability === 'onoff.usb2' || capability === 'led_mode') {
        parsedValue = Boolean(value);
      }

      this.device.setCapabilityValue(capability, parsedValue)
        .then(() => {
          this.device.log(`[TUYA] ✅ ${capability} = ${parsedValue} (DP ${dp})`);
        })
        .catch(err => {
          this.device.error(`[TUYA] ❌ Failed to set ${capability}:`, err.message);
        });
    } else {
      // Use DP pool for unknown DPs
      if (this.device.setTuyaDpValue) {
        this.device.setTuyaDpValue(dp, value);
      } else {
        this.device.log(`[TUYA] ℹ️ Unmapped DP ${dp}, value: ${JSON.stringify(value)}`);
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
