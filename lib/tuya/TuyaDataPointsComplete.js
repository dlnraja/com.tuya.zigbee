'use strict';

/**
 * TuyaDataPointsComplete - COMPLETE Tuya DataPoints Database
 * 
 * Sources:
 * - https://github.com/zigbeefordomoticz/wiki/blob/master/en-eng/Technical/Tuya-0xEF00.md
 * - https://github.com/zigpy/zha-device-handlers/blob/dev/zhaquirks/tuya/__init__.py
 * - D:\Download\loic\* (Loïc's device data)
 * - Tuya Developer Platform documentation
 * - Community forum analysis (Peter, Loïc, etc.)
 * - Homey forum user devices
 * 
 * Clusters Tuya:
 * - 0xEF00 (61184): Tuya Manufacturer Cluster (standard)
 * - 0xE000 (57344): Tuya Manufacturer Specific 0
 * - 0xE001 (57345): Tuya External Switch Type Cluster
 * - 0xED00 (60672): Tuya proprietary (curtain motor, TS0601)
 * - 0x1888 (6280): Tuya Manufacturer Specific 1
 */

class TuyaDataPointsComplete {
  
  // ========================================================================
  // TUYA CLUSTERS
  // ========================================================================
  
  static TUYA_CLUSTERS = {
    0xEF00: {
      id: 61184,
      hex: '0xEF00',
      name: 'tuyaManufacturer',
      description: 'Tuya Manufacturer Cluster (standard DP tunnel)',
      devices: ['All Tuya DP devices', 'TS0601'],
      attributes: {
        0x0000: 'Raw',
        0x0001: 'Product Info',
        0x0002: 'Device Status'
      }
    },
    0xE000: {
      id: 57344,
      hex: '0xE000',
      name: 'tuyaManufacturerSpecific0',
      description: 'Tuya Manufacturer Specific Cluster 0',
      devices: ['BSEED switches TS0002', 'Multi-gang switches'],
      discovered: 'Loïc BSEED data',
      attributes: {}
    },
    0xE001: {
      id: 57345,
      hex: '0xE001',
      name: 'tuyaExternalSwitchType',
      description: 'Tuya External Switch Type Cluster',
      devices: ['BSEED switches TS0002', 'Wall switches with external control'],
      discovered: 'Loïc BSEED data + ZHA',
      attributes: {
        0xD030: {
          name: 'externalSwitchType',
          type: 'enum8',
          values: {
            0x00: 'Toggle',
            0x01: 'State', 
            0x02: 'Momentary'
          }
        }
      }
    },
    0xED00: {
      id: 60672,
      hex: '0xED00',
      name: 'tuyaProprietary',
      description: 'Tuya Proprietary Cluster (TS0601 devices)',
      devices: ['Curtain motor TS0601', 'Other TS0601 devices'],
      discovered: 'Loïc curtain data + ZHA',
      attributes: {}
    },
    0x1888: {
      id: 6280,
      hex: '0x1888',
      name: 'tuyaManufacturerSpecific1',
      description: 'Tuya Manufacturer Specific Cluster 1',
      devices: ['Various Tuya devices'],
      attributes: {}
    }
  };
  
  // ========================================================================
  // TUYA COMMANDS
  // ========================================================================
  
  static TUYA_COMMANDS = {
    0x00: 'SET_DATA',
    0x01: 'GET_DATA / Product Information Inquiry',
    0x02: 'SET_DATA_RESPONSE / Device Status Query',
    0x03: 'QUERY_DATA / Zigbee Device Reset',
    0x04: 'SEND_DATA / Order Issuance',
    0x05: 'Status Report',
    0x06: 'ACTIVE_STATUS_RPT / Status Search',
    0x07: 'Reserved',
    0x08: 'Zigbee Device Functional Test',
    0x09: 'Query key information (scene switch only)',
    0x0A: 'Scene wakeup command (scene switch only)',
    0x10: 'MCU_VERSION_REQ',
    0x11: 'MCU_VERSION_RSP',
    0x24: 'SET_TIME / Time Synchronization'
  };
  
  // ========================================================================
  // TUYA DATA TYPES
  // ========================================================================
  
  static TUYA_DATA_TYPES = {
    0x00: { name: 'RAW', description: 'Raw data', size: 'variable' },
    0x01: { name: 'BOOL', description: 'Boolean', size: 1 },
    0x02: { name: 'VALUE', description: 'Unsigned integer', size: 4 },
    0x03: { name: 'STRING', description: 'String', size: 'variable' },
    0x04: { name: 'ENUM', description: 'Enum', size: 1 },
    0x05: { name: 'FAULT', description: 'Fault bitmap', size: 1 }
  };
  
  // ========================================================================
  // COMPLETE DATAPOINTS DATABASE
  // ========================================================================
  
  static DATAPOINTS = {
    
    // ====================================================================
    // CONTROL DPs (0x01-0x10)
    // ====================================================================
    
    0x01: {
      id: 1,
      type: [0x01, 0x04], // BOOL or ENUM
      name: 'switch_1 / control / onoff',
      devices: ['Switch', 'Dimmer', 'Curtain', 'Siren', 'Thermostat'],
      description: 'Main switch / Gang 1 / Control command',
      values: {
        switch: { 0x00: 'OFF', 0x01: 'ON' },
        curtain: { 0x00: 'Open', 0x01: 'Close', 0x02: 'Stop' },
        thermostat: { 0x00: 'OFF', 0x01: 'ON' }
      },
      capability: 'onoff'
    },
    
    0x02: {
      id: 2,
      type: [0x01, 0x02, 0x03], // BOOL, VALUE, or STRING
      name: 'switch_2 / level / setpoint / curtain_percentage',
      devices: ['Switch 2-gang', 'Dimmer', 'Curtain', 'TRV'],
      description: 'Gang 2 / Dimmer level / Curtain position / Setpoint',
      capability: ['onoff.gang2', 'dim', 'windowcoverings_set', 'target_temperature']
    },
    
    0x03: {
      id: 3,
      type: [0x01, 0x02],
      name: 'switch_3 / local_temperature / curtain_percentage',
      devices: ['Switch 3-gang', 'TRV', 'Thermostat', 'Curtain'],
      description: 'Gang 3 / Current temperature / Curtain feedback',
      capability: ['onoff.gang3', 'measure_temperature', 'windowcoverings_state']
    },
    
    0x04: {
      id: 4,
      type: [0x01, 0x02, 0x04],
      name: 'switch_4 / battery / thermostat_mode',
      devices: ['Switch 4-gang', 'Battery devices', 'TRV', 'Thermostat'],
      description: 'Gang 4 / Battery percentage / Thermostat mode',
      values: {
        thermostat: { 0x00: 'Off', 0x01: 'Auto', 0x02: 'Manual' }
      },
      capability: ['onoff.gang4', 'measure_battery', 'thermostat_mode']
    },
    
    0x05: {
      id: 5,
      type: [0x01, 0x02, 0x05],
      name: 'switch_5 / direction / fault',
      devices: ['Switch 5-gang', 'Curtain', 'Fault detection'],
      description: 'Gang 5 / Curtain direction / Fault bitmap',
      capability: ['onoff.gang5', 'direction_change']
    },
    
    0x06: {
      id: 6,
      type: [0x01, 0x02],
      name: 'switch_6 / curtain_inverted',
      devices: ['Switch 6-gang', 'Curtain'],
      description: 'Gang 6 / Curtain invert setting',
      capability: ['onoff.gang6', 'curtain_inverted']
    },
    
    0x07: {
      id: 7,
      type: [0x02],
      name: 'countdown_1 / child_lock / curtain_percentage',
      devices: ['Switch', 'TRV', 'Curtain'],
      description: 'Countdown timer gang 1 / Child lock / Curtain %',
      capability: ['countdown_timer.gang1', 'child_lock']
    },
    
    0x08: {
      id: 8,
      type: [0x01, 0x02],
      name: 'countdown_2 / window_detection_status',
      devices: ['Switch', 'TRV'],
      description: 'Countdown timer gang 2 / Window open detected',
      capability: ['countdown_timer.gang2', 'window_detection']
    },
    
    0x09: {
      id: 9,
      type: [0x02],
      name: 'countdown_3',
      devices: ['Switch'],
      description: 'Countdown timer gang 3',
      capability: 'countdown_timer.gang3'
    },
    
    0x0A: {
      id: 10,
      type: [0x01, 0x02],
      name: 'countdown_4 / unknown',
      devices: ['Switch', 'TRV'],
      description: 'Countdown timer gang 4',
      capability: 'countdown_timer.gang4'
    },
    
    0x0D: {
      id: 13,
      type: [0x02, 0x05],
      name: 'voltage / unknown_fault',
      devices: ['Battery devices', 'TRV'],
      description: 'Voltage measurement / Unknown fault',
      capability: 'measure_voltage'
    },
    
    0x10: {
      id: 16,
      type: [0x02],
      name: 'setpoint',
      devices: ['Thermostat'],
      description: 'Target temperature setpoint',
      capability: 'target_temperature'
    },
    
    // ====================================================================
    // BATTERY & POWER DPs (0x11-0x1F)
    // ====================================================================
    
    0x11: {
      id: 17,
      type: [0x02],
      name: 'battery_state',
      devices: ['Battery devices'],
      description: 'Battery charging state',
      values: { 0x00: 'Discharging', 0x01: 'Charging' },
      capability: 'battery_charging_state'
    },
    
    0x12: {
      id: 18,
      type: [0x01, 0x02],
      name: 'window_detection / battery_capacity',
      devices: ['TRV', 'Thermostat', 'Battery devices'],
      description: 'Window detection enable / Battery capacity mAh',
      capability: ['window_detection', 'measure_battery.capacity']
    },
    
    0x13: {
      id: 19,
      type: [0x02],
      name: 'temperature / unknown',
      devices: ['Thermostat'],
      description: 'Temperature value',
      capability: 'measure_temperature'
    },
    
    0x14: {
      id: 20,
      type: [0x02],
      name: 'valve_state / unknown',
      devices: ['TRV'],
      description: 'Valve open/close state',
      capability: 'valve_state'
    },
    
    0x15: {
      id: 21,
      type: [0x02],
      name: 'battery_percentage',
      devices: ['Battery devices', 'TRV'],
      description: 'Battery level percentage',
      capability: 'measure_battery'
    },
    
    0x1B: {
      id: 27,
      type: [0x02],
      name: 'calibration / unknown',
      devices: ['TRV'],
      description: 'Temperature calibration offset',
      capability: 'temp_calibration'
    },
    
    // ====================================================================
    // POWER MEASUREMENT DPs (0x20-0x2F)
    // ====================================================================
    
    0x21: {
      id: 33,
      type: [0x02],
      name: 'power',
      devices: ['Smart Plug', 'Switch with metering'],
      description: 'Active power (W)',
      capability: 'measure_power'
    },
    
    0x22: {
      id: 34,
      type: [0x02],
      name: 'current',
      devices: ['Smart Plug', 'Switch with metering'],
      description: 'Current (mA)',
      capability: 'measure_current'
    },
    
    0x23: {
      id: 35,
      type: [0x02],
      name: 'voltage',
      devices: ['Smart Plug', 'Switch with metering'],
      description: 'Voltage (V * 10)',
      capability: 'measure_voltage'
    },
    
    0x24: {
      id: 36,
      type: [0x02, 0x03],
      name: 'energy / time_sync / heating_state',
      devices: ['Smart Plug', 'All devices', 'Thermostat'],
      description: 'Energy consumption kWh / Time sync / Heating state',
      capability: ['meter_power', 'time_sync', 'heating']
    },
    
    0x25: {
      id: 37,
      type: [0x02],
      name: 'power_factor',
      devices: ['Smart Plug'],
      description: 'Power factor',
      capability: 'measure_power.factor'
    },
    
    0x28: {
      id: 40,
      type: [0x01],
      name: 'child_lock',
      devices: ['TRV', 'Thermostat', 'Switch'],
      description: 'Child lock enable/disable',
      capability: 'child_lock'
    },
    
    0x2B: {
      id: 43,
      type: [0x02],
      name: 'unknown',
      devices: ['Thermostat'],
      description: 'Unknown thermostat parameter',
      capability: null
    },
    
    0x2C: {
      id: 44,
      type: [0x02],
      name: 'unknown',
      devices: ['TRV'],
      description: 'Unknown TRV parameter',
      capability: null
    },
    
    // ====================================================================
    // SIREN & ALARM DPs (0x65-0x75)
    // ====================================================================
    
    0x65: {
      id: 101,
      type: [0x01, 0x04],
      name: 'power_mode / switch_onoff',
      devices: ['Siren', 'TRV'],
      description: 'Battery/Mains mode / TRV on/off',
      values: { 0x00: 'Battery', 0x04: 'Mains' },
      capability: ['power_mode', 'onoff']
    },
    
    0x66: {
      id: 102,
      type: [0x02, 0x04],
      name: 'alarm_melody / temperature / unknown',
      devices: ['Siren', 'TRV', 'Climate'],
      description: 'Siren melody / Temperature value',
      capability: ['alarm_melody', 'measure_temperature']
    },
    
    0x67: {
      id: 103,
      type: [0x02, 0x03],
      name: 'alarm_duration / setpoint / curtain_percentage / time_sync',
      devices: ['Siren', 'TRV', 'Curtain', 'All devices'],
      description: 'Alarm duration seconds / TRV setpoint / Time sync',
      capability: ['alarm_duration', 'target_temperature', 'time_sync']
    },
    
    0x68: {
      id: 104,
      type: [0x01, 0x00],
      name: 'alarm_switch',
      devices: ['Siren'],
      description: 'Alarm ON/OFF',
      values: { 0x00: 'OFF', 0x01: 'ON' },
      capability: 'alarm_generic'
    },
    
    0x69: {
      id: 105,
      type: [0x02, 0x05],
      name: 'temperature / curtain_percentage / unknown',
      devices: ['Siren', 'TRV', 'Curtain'],
      description: 'Temperature / Curtain % / Unknown fault',
      capability: 'measure_temperature'
    },
    
    0x6A: {
      id: 106,
      type: [0x01, 0x02, 0x04],
      name: 'humidity / temporary_away',
      devices: ['Siren', 'TRV'],
      description: 'Humidity level / Temporary away mode',
      capability: ['measure_humidity', 'away_mode']
    },
    
    0x6B: {
      id: 107,
      type: [0x02],
      name: 'min_alarm_temperature',
      devices: ['Siren'],
      description: 'Minimum temperature alarm threshold',
      capability: 'temp_alarm_min'
    },
    
    0x6C: {
      id: 108,
      type: [0x02, 0x04],
      name: 'max_alarm_temperature / thermostat_mode',
      devices: ['Siren', 'TRV'],
      description: 'Max temp alarm / Mode (Auto/Manual)',
      values: { 0x01: 'Auto', 0x02: 'Manual' },
      capability: ['temp_alarm_max', 'thermostat_mode']
    },
    
    0x6D: {
      id: 109,
      type: [0x02],
      name: 'min_alarm_humidity / valve_position',
      devices: ['Siren', 'TRV'],
      description: 'Min humidity alarm / Valve position %',
      capability: ['humidity_alarm_min', 'valve_position']
    },
    
    0x6E: {
      id: 110,
      type: [0x01, 0x02, 0x00],
      name: 'max_alarm_humidity / low_battery',
      devices: ['Siren', 'TRV'],
      description: 'Max humidity alarm / Low battery flag',
      capability: ['humidity_alarm_max', 'alarm_battery']
    },
    
    0x6F: {
      id: 111,
      type: [0x04],
      name: 'unknown',
      devices: ['TRV'],
      description: 'Unknown TRV parameter',
      capability: null
    },
    
    0x70: {
      id: 112,
      type: [0x01, 0x00],
      name: 'temperature_unit / schedule_workday',
      devices: ['Siren', 'TRV'],
      description: 'Temperature unit (F/C) / Schedule workday',
      values: { 0x00: 'Fahrenheit', 0x01: 'Celsius' },
      capability: ['temp_unit', 'schedule']
    },
    
    0x71: {
      id: 113,
      type: [0x01, 0x00],
      name: 'temp_alarm_status / schedule_holiday',
      devices: ['Siren', 'TRV'],
      description: 'Temperature alarm active / Schedule holiday',
      capability: ['alarm_temperature', 'schedule']
    },
    
    0x72: {
      id: 114,
      type: [0x01, 0x02, 0x00],
      name: 'humidity_alarm_status / unknown',
      devices: ['Siren', 'TRV'],
      description: 'Humidity alarm active',
      capability: 'alarm_humidity'
    },
    
    0x73: {
      id: 115,
      type: [0x01, 0x00],
      name: 'unknown',
      devices: ['Siren', 'TRV'],
      description: 'Unknown parameter',
      capability: null
    },
    
    0x74: {
      id: 116,
      type: [0x01, 0x04, 0x00],
      name: 'siren_volume / unknown',
      devices: ['Siren', 'TRV'],
      description: 'Siren volume level',
      capability: 'volume_set'
    },
    
    0x75: {
      id: 117,
      type: [0x02, 0x00],
      name: 'unknown',
      devices: ['TRV'],
      description: 'Unknown TRV parameter',
      capability: null
    },
    
    // ====================================================================
    // ADVANCED SCHEDULING DPs (0x76-0x82)
    // ====================================================================
    
    0x77: {
      id: 119,
      type: [0x00],
      name: 'unknown_schedule',
      devices: ['TRV'],
      description: 'Unknown schedule parameter',
      capability: null
    },
    
    0x78: {
      id: 120,
      type: [0x00],
      name: 'unknown_schedule',
      devices: ['TRV'],
      description: 'Unknown schedule parameter',
      capability: null
    },
    
    0x79: {
      id: 121,
      type: [0x00],
      name: 'unknown_schedule',
      devices: ['TRV'],
      description: 'Unknown schedule parameter',
      capability: null
    },
    
    0x7A: {
      id: 122,
      type: [0x00],
      name: 'unknown_schedule',
      devices: ['TRV'],
      description: 'Unknown schedule parameter',
      capability: null
    },
    
    0x7B: {
      id: 123,
      type: [0x00],
      name: 'schedule_sunday',
      devices: ['TRV'],
      description: 'Weekly schedule Sunday',
      capability: 'schedule.sunday'
    },
    
    0x7C: {
      id: 124,
      type: [0x00],
      name: 'schedule_monday',
      devices: ['TRV'],
      description: 'Weekly schedule Monday',
      capability: 'schedule.monday'
    },
    
    0x7D: {
      id: 125,
      type: [0x00],
      name: 'schedule_tuesday',
      devices: ['TRV'],
      description: 'Weekly schedule Tuesday',
      capability: 'schedule.tuesday'
    },
    
    0x7E: {
      id: 126,
      type: [0x00],
      name: 'schedule_wednesday',
      devices: ['TRV'],
      description: 'Weekly schedule Wednesday',
      capability: 'schedule.wednesday'
    },
    
    0x7F: {
      id: 127,
      type: [0x00],
      name: 'schedule_thursday',
      devices: ['TRV'],
      description: 'Weekly schedule Thursday',
      capability: 'schedule.thursday'
    },
    
    0x80: {
      id: 128,
      type: [0x00],
      name: 'schedule_friday',
      devices: ['TRV'],
      description: 'Weekly schedule Friday',
      capability: 'schedule.friday'
    },
    
    0x81: {
      id: 129,
      type: [0x00],
      name: 'schedule_saturday',
      devices: ['TRV'],
      description: 'Weekly schedule Saturday',
      capability: 'schedule.saturday'
    },
    
    0x82: {
      id: 130,
      type: [0x01],
      name: 'anti_scale',
      devices: ['TRV'],
      description: 'Anti-scaling protection',
      capability: 'anti_scale'
    }
  };
  
  // ========================================================================
  // HELPER METHODS
  // ========================================================================
  
  /**
   * Get DataPoint info by ID
   */
  static getDP(dpId) {
    return this.DATAPOINTS[dpId] || null;
  }
  
  /**
   * Get all DPs for device type
   */
  static getDPsForDevice(deviceType) {
    const result = [];
    
    for (const [dpId, dp] of Object.entries(this.DATAPOINTS)) {
      if (dp.devices.some(d => d.toLowerCase().includes(deviceType.toLowerCase()))) {
        result.push({
          id: parseInt(dpId),
          hex: '0x' + parseInt(dpId).toString(16).toUpperCase().padStart(2, '0'),
          ...dp
        });
      }
    }
    
    return result;
  }
  
  /**
   * Get capability for DP
   */
  static getCapability(dpId) {
    const dp = this.getDP(dpId);
    if (!dp || !dp.capability) return null;
    
    return Array.isArray(dp.capability) ? dp.capability[0] : dp.capability;
  }
  
  /**
   * Get cluster info
   */
  static getCluster(clusterId) {
    return this.TUYA_CLUSTERS[clusterId] || null;
  }
  
  /**
   * Get all clusters
   */
  static getAllClusters() {
    return Object.entries(this.TUYA_CLUSTERS).map(([id, cluster]) => ({
      id: parseInt(id),
      ...cluster
    }));
  }
}

module.exports = TuyaDataPointsComplete;
