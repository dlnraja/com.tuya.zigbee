/**
 * UNIVERSAL TUYA CLUSTER HANDLER
 * 
 * Handles Tuya custom cluster 0xEF00 (61184) for all devices
 * Automatically maps datapoints to Homey capabilities
 */

const TUYA_DATAPOINTS = require('./tuya-datapoints-database');

const TUYA_CLUSTER_ID = 61184; // 0xEF00

class TuyaClusterHandler {

  /**
   * Initialize Tuya cluster handling for a device
   * @param {ZigBeeDevice} device - The Homey Zigbee device
   * @param {Object} zclNode - The ZCL node
   * @param {String} deviceType - Type of device (MULTI_SENSOR, SMOKE_DETECTOR, etc.)
   */
  static async init(device, zclNode, deviceType = 'COMMON') {
    device.log(`[TuyaCluster] Initializing for type: ${deviceType}`);
    
    // Get the Tuya cluster
    const tuyaCluster = zclNode.endpoints[1]?.clusters[TUYA_CLUSTER_ID];
    
    if (!tuyaCluster) {
      device.log('[TuyaCluster] No Tuya cluster found');
      return false;
    }

    device.log('[TuyaCluster] ✅ Tuya cluster found');
    
    // Store device type for later use
    device._tuyaDeviceType = deviceType;
    device._tuyaCluster = tuyaCluster;
    
    // Set up event listeners
    tuyaCluster.on('response', (data) => {
      this.handleTuyaData(device, data, deviceType);
    });
    
    tuyaCluster.on('reporting', (data) => {
      this.handleTuyaData(device, data, deviceType);
    });
    
    // Request initial data
    try {
      await tuyaCluster.read('dataPoints');
      device.log('[TuyaCluster] ✅ Initial data requested');
    } catch (err) {
      device.log('[TuyaCluster] Could not read initial data:', err.message);
    }
    
    return true;
  }

  /**
   * Handle Tuya datapoint reports
   */
  static handleTuyaData(device, data, deviceType) {
    if (!data || !data.dataPoints) {
      device.log('[TuyaCluster] No dataPoints in response');
      return;
    }

    device.log('[TuyaCluster] Data received:', JSON.stringify(data.dataPoints));
    
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
