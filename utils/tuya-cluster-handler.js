/**
 * UNIVERSAL TUYA CLUSTER HANDLER
 * 
 * Handles Tuya custom cluster 0xEF00 (61184) for all devices
 * Automatically maps datapoints to Homey capabilities
 * 
 * SOURCES & REFERENCES:
 * - Zigbee2MQTT Tuya converters: https://github.com/Koenkk/zigbee2mqtt
 * - Home Assistant ZHA quirks: https://github.com/zigpy/zha-device-handlers
 * - Tuya IoT Platform: https://developer.tuya.com/en/docs/iot
 * - deCONZ Tuya support: https://github.com/dresden-elektronik/deconz-rest-plugin
 * - Homey Community Forum: https://community.homey.app/t/140352
 * - Blakadder Database: https://zigbee.blakadder.com/Tuya.html
 * 
 * TECHNICAL SPECIFICATIONS:
 * - Cluster ID: 0xEF00 (61184)
 * - Attribute 0x0000: dataPoints (Map)
 * - Manufacturer: Tuya Smart / Hangzhou Tuya Information Technology
 * - Protocol: Zigbee 3.0 manufacturer-specific cluster
 * 
 * @version 3.1.0
 * @author Universal Tuya Zigbee Team
 * @license GPL-3.0
 */

const TUYA_DATAPOINTS = require('./parsers/tuya-datapoints-database');

const TUYA_CLUSTER_ID = 61184; // 0xEF00 (Tuya proprietary cluster)
const TUYA_ATTRIBUTE_DATAPOINTS = 0x0000; // DataPoints attribute
const TUYA_ATTRIBUTE_REQUEST = 0x0001; // Request attribute

// Retry configuration (based on Zigbee2MQTT best practices)
const INIT_RETRY_ATTEMPTS = 5;
const INIT_RETRY_DELAY_MS = 2000;
const READ_RETRY_ATTEMPTS = 3;
const READ_RETRY_DELAY_MS = 1000;

// Reporting configuration (optimized for Tuya devices)
const REPORTING_CONFIG = {
  minimumReportInterval: 1,     // Report after 1 second (Zigbee2MQTT standard)
  maximumReportInterval: 300,   // Force report every 5 minutes (battery save)
  reportableChange: 0           // Report any change
};

// Advanced reporting for AC-powered devices
const REPORTING_CONFIG_AC = {
  minimumReportInterval: 0,     // Report immediately
  maximumReportInterval: 3600,  // Force every hour
  reportableChange: 0
};

class TuyaClusterHandler {

  /**
   * Initialize Tuya cluster handling for a device
   * @param {ZigBeeDevice} device - The Homey Zigbee device
   * @param {Object} zclNode - The ZCL node
   * @param {String} deviceType - Type of device (MULTI_SENSOR, SMOKE_DETECTOR, etc.)
   * @param {Object} options - Optional configuration
   * @param {Boolean} options.acPowered - Device is AC powered (use aggressive reporting)
   * @param {Boolean} options.autoDiscovery - Enable automatic datapoint discovery
   * @param {Number} options.retryAttempts - Number of initialization retry attempts
   * @returns {Promise<Boolean>} - True if initialization successful
   */
  static async init(device, zclNode, deviceType = 'COMMON', options = {}) {
    const {
      acPowered = false,
      autoDiscovery = true,
      retryAttempts = INIT_RETRY_ATTEMPTS
    } = options;
    device.log(`[TuyaCluster] Initializing for type: ${deviceType}`);
    
    // Auto-detect Tuya cluster on ANY endpoint (critical fix for HOBEIAN devices)
    let tuyaCluster = null;
    let tuyaEndpoint = null;
    
    for (const [epId, endpoint] of Object.entries(zclNode.endpoints)) {
      if (endpoint.clusters && endpoint.clusters[TUYA_CLUSTER_ID]) {
        tuyaCluster = endpoint.clusters[TUYA_CLUSTER_ID];
        tuyaEndpoint = epId;
        device.log(`[TuyaCluster] ✅ Found on endpoint ${epId}`);
        break;
      }
    }
    
    if (!tuyaCluster) {
      device.log('[TuyaCluster] No Tuya cluster found on any endpoint');
      return false;
    }

    device.log(`[TuyaCluster] ✅ Tuya cluster found on endpoint ${tuyaEndpoint}`);
    
    // Store device type and endpoint for later use
    device._tuyaDeviceType = deviceType;
    device._tuyaCluster = tuyaCluster;
    device._tuyaEndpoint = tuyaEndpoint;
    
    // Set up event listeners
    tuyaCluster.on('response', (data) => {
      this.handleTuyaData(device, data, deviceType);
    });
    
    tuyaCluster.on('reporting', (data) => {
      this.handleTuyaData(device, data, deviceType);
    });
    
    // Configure reporting (critical for HOBEIAN devices)
    try {
      await tuyaCluster.configureReporting([{
        attributeId: 0, // dataPoints
        minimumReportInterval: 0,
        maximumReportInterval: 3600,
        reportableChange: 0
      }]);
      device.log('[TuyaCluster] ✅ Reporting configured');
    } catch (err) {
      device.log('[TuyaCluster] Reporting config failed (may be OK):', err.message);
    }
    
    // Request initial data with retry (based on Zigbee2MQTT retry logic)
    let initialDataReceived = false;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        device.log(`[TuyaCluster] Reading initial data (attempt ${attempt}/${retryAttempts})...`);
        
        // Try reading dataPoints attribute
        const data = await tuyaCluster.read(TUYA_ATTRIBUTE_DATAPOINTS);
        
        if (data && data.dataPoints) {
          device.log(`[TuyaCluster] ✅ Initial data received:`, JSON.stringify(data.dataPoints));
          this.handleTuyaData(device, data, deviceType);
          initialDataReceived = true;
          break;
        } else {
          device.log(`[TuyaCluster] ⚠️ Empty data received (attempt ${attempt})`);
        }
        
      } catch (err) {
        device.log(`[TuyaCluster] Read attempt ${attempt} failed:`, err.message);
        
        if (attempt < retryAttempts) {
          // Exponential backoff (Zigbee2MQTT pattern)
          const delay = INIT_RETRY_DELAY_MS * attempt;
          device.log(`[TuyaCluster] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Try alternative method: request specific datapoints
          if (attempt === 2 && autoDiscovery) {
            device.log('[TuyaCluster] Trying datapoint discovery...');
            await this.discoverDatapoints(device, tuyaCluster, deviceType);
          }
        } else {
          device.log('[TuyaCluster] ⚠️ All read attempts failed, will rely on automatic reports');
          device.log('[TuyaCluster] This is normal for some battery-powered devices');
        }
      }
    }
    
    // Store discovery status
    device._tuyaInitialized = initialDataReceived;
    device._tuyaAutoDiscovery = autoDiscovery;
    
    // Log initialization summary
    device.log('[TuyaCluster] ═══════════════════════════════════════');
    device.log(`[TuyaCluster] Initialization complete`);
    device.log(`[TuyaCluster] Device Type: ${deviceType}`);
    device.log(`[TuyaCluster] Endpoint: ${tuyaEndpoint}`);
    device.log(`[TuyaCluster] Initial Data: ${initialDataReceived ? 'Received' : 'Pending'}`);
    device.log(`[TuyaCluster] Power Mode: ${acPowered ? 'AC' : 'Battery'}`);
    device.log(`[TuyaCluster] Auto Discovery: ${autoDiscovery ? 'Enabled' : 'Disabled'}`);
    device.log('[TuyaCluster] ═══════════════════════════════════════');
    
    return true;
  }

  /**
   * Discover unknown datapoints by requesting common ones
   * Based on Zigbee2MQTT discovery pattern
   */
  static async discoverDatapoints(device, tuyaCluster, deviceType) {
    device.log('[TuyaCluster] 🔍 Starting datapoint discovery...');
    
    // Common datapoints to try (from Tuya Standard Instruction Set)
    const commonDatapoints = [
      1,   // Usually main function (switch, alarm, temperature)
      2,   // Usually secondary function (brightness, humidity)
      3,   // Usually tertiary function (mode, pressure)
      4,   // Usually battery or countdown
      5,   // Usually settings or tamper
      9,   // Usually sensitivity or unit
      10,  // Usually threshold or calibration
      13,  // Usually secondary alarm or state
      15,  // Usually volume or alarm type
      101, // Usually advanced settings
      102  // Usually advanced state
    ];
    
    for (const dp of commonDatapoints) {
      try {
        await tuyaCluster.write(TUYA_ATTRIBUTE_REQUEST, { dp });
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        // Ignore errors, device will respond if DP exists
      }
    }
    
    device.log('[TuyaCluster] ✅ Discovery requests sent, waiting for responses...');
  }

  /**
   * Handle Tuya datapoint reports
   */
  static handleTuyaData(device, data, deviceType) {
    // Enhanced logging for debugging data reception issues
    device.log('[TuyaCluster] Raw data received:', JSON.stringify(data));
    
    if (!data) {
      device.log('[TuyaCluster] ⚠️ No data in response');
      return;
    }
    
    if (!data.dataPoints) {
      device.log('[TuyaCluster] ⚠️ No dataPoints in response, data keys:', Object.keys(data));
      return;
    }

    device.log('[TuyaCluster] 📦 DataPoints received:', JSON.stringify(data.dataPoints));
    
    // Get datapoint mapping for this device type
    const mapping = TUYA_DATAPOINTS[deviceType] || TUYA_DATAPOINTS.COMMON;
    
    // Process each datapoint
    Object.entries(data.dataPoints).forEach(([dp, value]) => {
      this.processDatapoint(device, parseInt(dp), value, mapping);
    });
  }

  /**
   * Process a single datapoint
   */
  static processDatapoint(device, dp, value, mapping) {
    const definition = mapping[dp];
    
    if (!definition) {
      device.log(`[TuyaCluster] Unknown DP ${dp}:`, value);
      return;
    }

    device.log(`[TuyaCluster] Processing DP ${dp} (${definition.name}):`, value);
    
    try {
      let parsedValue;
      
      // Parse value based on type
      switch (definition.type) {
        case 'bool':
          parsedValue = value === true || value === 1 || value === '1';
          break;
          
        case 'value':
          parsedValue = parseInt(value);
          if (definition.divide) {
            parsedValue = parsedValue / definition.divide;
          }
          if (definition.max) {
            parsedValue = parsedValue / definition.max;
          }
          break;
          
        case 'enum':
          if (definition.values) {
            parsedValue = definition.values[value] || value;
          } else {
            parsedValue = value;
          }
          break;
          
        case 'hex_color':
          // Parse hex color for RGB lights
          parsedValue = this.parseHexColor(value);
          break;
          
        default:
          parsedValue = value;
      }
      
      // Set capability if device has it
      if (definition.capability && device.hasCapability(definition.capability)) {
        device.setCapabilityValue(definition.capability, parsedValue)
          .then(() => {
            device.log(`[TuyaCluster] ✅ ${definition.capability} = ${parsedValue}`);
          })
          .catch(err => {
            device.error(`[TuyaCluster] Failed to set ${definition.capability}:`, err);
          });
      }
      
      // Emit flow trigger if it's an action/event
      if (definition.type === 'enum' && definition.name === 'action') {
        this.triggerActionFlow(device, parsedValue);
      }
      
    } catch (err) {
      device.error(`[TuyaCluster] Error processing DP ${dp}:`, err);
    }
  }

  /**
   * Parse hex color value for RGB lights
   */
  static parseHexColor(hexValue) {
    // Format: HHHHSSSSVVVV (Hue, Saturation, Value)
    if (typeof hexValue === 'string' && hexValue.length >= 12) {
      const hue = parseInt(hexValue.substr(0, 4), 16);
      const sat = parseInt(hexValue.substr(4, 4), 16);
      const val = parseInt(hexValue.substr(8, 4), 16);
      
      return {
        hue: hue / 360,
        saturation: sat / 1000,
        value: val / 1000
      };
    }
    return null;
  }

  /**
   * Trigger action flow for buttons/scenes
   */
  static triggerActionFlow(device, action) {
    const flowCard = device.homey.flow.getDeviceTriggerCard('button_action');
    if (flowCard) {
      flowCard.trigger(device, { action })
        .then(() => device.log(`[TuyaCluster] ✅ Flow triggered: ${action}`))
        .catch(err => device.error('[TuyaCluster] Flow trigger failed:', err));
    }
  }

  /**
   * Send command to Tuya device
   */
  static async sendCommand(device, dp, value) {
    if (!device._tuyaCluster) {
      throw new Error('Tuya cluster not initialized');
    }

    device.log(`[TuyaCluster] Sending command DP ${dp} = ${value}`);
    
    try {
      await device._tuyaCluster.write('dataPoints', {
        [dp]: value
      });
      device.log('[TuyaCluster] ✅ Command sent');
    } catch (err) {
      device.error('[TuyaCluster] Command failed:', err);
      throw err;
    }
  }

  /**
   * Auto-detect device type from driver name
   */
  static detectDeviceType(driverName) {
    const lower = driverName.toLowerCase();
    
    if (lower.includes('multi') && lower.includes('sensor')) return 'MULTI_SENSOR';
    if (lower.includes('smoke')) return 'SMOKE_DETECTOR';
    if (lower.includes('gas')) return 'GAS_DETECTOR';
    if (lower.includes('leak') || lower.includes('water')) return 'WATER_LEAK';
    if (lower.includes('door') || lower.includes('window') || lower.includes('contact')) return 'DOOR_WINDOW';
    if (lower.includes('sos') || lower.includes('emergency')) return 'SOS_BUTTON';
    if (lower.includes('button') || lower.includes('scene')) return 'BUTTON';
    if (lower.includes('motion') || lower.includes('pir')) {
      if (lower.includes('radar') || lower.includes('mmwave')) return 'PIR_RADAR';
      return 'MOTION_SENSOR';
    }
    if (lower.includes('temperature') && lower.includes('humidity')) return 'MULTI_SENSOR';
    if (lower.includes('temperature')) return 'TEMPERATURE';
    if (lower.includes('humidity')) return 'HUMIDITY';
    if (lower.includes('co2')) return 'CO2_SENSOR';
    if (lower.includes('air') || lower.includes('pm25') || lower.includes('tvoc')) return 'AIR_QUALITY';
    if (lower.includes('vibration')) return 'VIBRATION';
    if (lower.includes('thermostat') || lower.includes('trv') || lower.includes('valve') && lower.includes('radiator')) return 'THERMOSTAT';
    if (lower.includes('switch')) return 'SWITCH';
    if (lower.includes('dimmer')) return 'DIMMER';
    if (lower.includes('rgb') || (lower.includes('light') && lower.includes('color'))) return 'RGB_LIGHT';
    if (lower.includes('curtain') || lower.includes('blind') || lower.includes('shade')) return 'CURTAIN';
    if (lower.includes('valve')) return 'VALVE';
    if (lower.includes('lock')) return 'LOCK';
    if (lower.includes('siren') || lower.includes('alarm')) return 'SIREN';
    
    return 'COMMON';
  }
}

module.exports = TuyaClusterHandler;
