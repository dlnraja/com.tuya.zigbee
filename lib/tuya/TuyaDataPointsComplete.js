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
      name: 'min_alarm_humidity / dim.valve',
      devices: ['Siren', 'TRV'],
      description: 'Min humidity alarm / Valve position %',
      capability: ['humidity_alarm_min', 'dim.valve']
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
    },

    // ==================================================================
    // P92 (2026-07-28): DP reference entries imported from the tuya-local
    // scan (data/scanners/tuya-local-results.json). These dpIds were
    // unknown to TuyaDPDatabase + this dictionary. Reference-only:
    // capability is intentionally null because dpId semantics are
    // device-family specific - do NOT auto-map them to capabilities.
    // ==================================================================
    0x0B: { id: 11, type: [0x01], name: 'locate', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 102x; reference-only mapping', capability: null },
    0x0E: { id: 14, type: [0x02], name: 'path_data', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 86x; reference-only mapping', capability: null },
    0x16: { id: 22, type: [0x02], name: 'Reset rag life', devices: ['tuya-local:diagnostic', 'tuya-local:config', 'tuya-local:unknown'], description: 'tuya-local scan import (P92), seen 117x; reference-only mapping', capability: null },
    0x17: { id: 23, type: [0x01], name: 'Alarm volume', devices: ['tuya-local:diagnostic', 'tuya-local:config', 'tuya-local:unknown'], description: 'tuya-local scan import (P92), seen 108x; reference-only mapping', capability: null },
    0x18: { id: 24, type: [0x01], name: 'button', devices: ['tuya-local:diagnostic', 'tuya-local:config', 'tuya-local:unknown'], description: 'tuya-local scan import (P92), seen 111x; reference-only mapping', capability: null },
    0x19: { id: 25, type: [0x01], name: 'Resume cleaning', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 54x; reference-only mapping', capability: null },
    0x1A: { id: 26, type: [0x02], name: 'Compressor', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 82x; reference-only mapping', capability: null },
    0x1C: { id: 28, type: [0x03], name: 'error', devices: ['tuya-local:diagnostic', 'tuya-local:config', 'tuya-local:unknown'], description: 'tuya-local scan import (P92), seen 59x; reference-only mapping', capability: null },
    0x1D: { id: 29, type: [0x02], name: 'Total cleaning times', devices: ['tuya-local:diagnostic', 'tuya-local:config', 'tuya-local:unknown'], description: 'tuya-local scan import (P92), seen 24x; reference-only mapping', capability: null },
    0x1E: { id: 30, type: [0x02], name: 'Total cleaning time', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 14x; reference-only mapping', capability: null },
    0x1F: { id: 31, type: [0x02], name: 'Reset map', devices: ['tuya-local:diagnostic', 'tuya-local:config', 'tuya-local:unknown'], description: 'tuya-local scan import (P92), seen 29x; reference-only mapping', capability: null },
    0x20: { id: 32, type: [0x02], name: 'device_timer', devices: ['tuya-local:diagnostic', 'tuya-local:config', 'tuya-local:unknown'], description: 'tuya-local scan import (P92), seen 19x; reference-only mapping', capability: null },
    0x26: { id: 38, type: [0x03], name: 'Valve 2 state', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 21x; reference-only mapping', capability: null },
    0x27: { id: 39, type: [0x01], name: 'Carpet boost', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 23x; reference-only mapping', capability: null },
    0x29: { id: 41, type: [0x03], name: 'option', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 20x; reference-only mapping', capability: null },
    0x2A: { id: 42, type: [0x02], name: 'Smart weather delay', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 23x; reference-only mapping', capability: null },
    0x2D: { id: 45, type: [0x03], name: 'option', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 41x; reference-only mapping', capability: null },
    0x2E: { id: 46, type: [0x02], name: 'Manual switch', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 6x; reference-only mapping', capability: null },
    0x2F: { id: 47, type: [0x02], name: 'lock_state', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 18x; reference-only mapping', capability: null },
    0x30: { id: 48, type: [0x01], name: 'Edge cleaning', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 5x; reference-only mapping', capability: null },
    0x31: { id: 49, type: [0x01], name: 'Dry', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0x32: { id: 50, type: [0x02], name: 'fault_code', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 4x; reference-only mapping', capability: null },
    0x33: { id: 51, type: [0x02], name: 'Delete temp password', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 16x; reference-only mapping', capability: null },
    0x34: { id: 52, type: [0x02], name: 'Modify temp password', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 8x; reference-only mapping', capability: null },
    0x35: { id: 53, type: [0x02], name: 'Valve 1 last runtime', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 12x; reference-only mapping', capability: null },
    0x36: { id: 54, type: [0x02], name: 'Offline password timestamp', devices: ['tuya-local:diagnostic', 'tuya-local:config', 'tuya-local:unknown'], description: 'tuya-local scan import (P92), seen 8x; reference-only mapping', capability: null },
    0x37: { id: 55, type: [0x02], name: 'unlock_temp_pwd', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 10x; reference-only mapping', capability: null },
    0x38: { id: 56, type: [0x01], name: 'switch', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 10x; reference-only mapping', capability: null },
    0x39: { id: 57, type: [0x03], name: 'Smart meter type', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 3x; reference-only mapping', capability: null },
    0x3A: { id: 58, type: [0x03], name: 'unlock_temp_pwd', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 7x; reference-only mapping', capability: null },
    0x3B: { id: 59, type: [0x02], name: 'standby_brightness', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 4x; reference-only mapping', capability: null },
    0x3C: { id: 60, type: [0x02], name: 'New credential', devices: ['tuya-local:diagnostic', 'tuya-local:config', 'tuya-local:unknown'], description: 'tuya-local scan import (P92), seen 17x; reference-only mapping', capability: null },
    0x3D: { id: 61, type: [0x02], name: 'code_unlock', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 17x; reference-only mapping', capability: null },
    0x3E: { id: 62, type: [0x02], name: 'unlock_app', devices: ['tuya-local:diagnostic', 'tuya-local:config', 'tuya-local:unknown'], description: 'tuya-local scan import (P92), seen 17x; reference-only mapping', capability: null },
    0x3F: { id: 63, type: [0x02], name: 'unlock_voice', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 15x; reference-only mapping', capability: null },
    0x40: { id: 64, type: [0x03], name: 'Used offline password', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 15x; reference-only mapping', capability: null },
    0x41: { id: 65, type: [0x03], name: '32A wall mounted EV charger', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 4x; reference-only mapping', capability: null },
    0x42: { id: 66, type: [0x03], name: 'Wind chill index', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 5x; reference-only mapping', capability: null },
    0x43: { id: 67, type: [0x03], name: 'unlock_offline_pwd', devices: ['tuya-local:diagnostic'], description: 'tuya-local scan import (P92), seen 5x; reference-only mapping', capability: null },
    0x44: { id: 68, type: [0x03], name: 'switch', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 3x; reference-only mapping', capability: null },
    0x45: { id: 69, type: [0x03], name: 'record', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 3x; reference-only mapping', capability: null },
    0x46: { id: 70, type: [0x03], name: '2400W panel heater', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 5x; reference-only mapping', capability: null },
    0x47: { id: 71, type: [0x03], name: 'unlock_offline_clear_single', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 5x; reference-only mapping', capability: null },
    0x48: { id: 72, type: [0x03], name: 'unlock_offline_clear', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0x49: { id: 73, type: [0x03], name: 'unlock_offline_pwd', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 3x; reference-only mapping', capability: null },
    0x4A: { id: 74, type: [0x02], name: 'unlock_dynamic_pwd', devices: ['tuya-local:diagnostic'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0x4B: { id: 75, type: [0x02], name: 'available', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0x4C: { id: 76, type: [0x01], name: 'switch', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0x4E: { id: 78, type: [0x03], name: 'Regulation grid export power limit', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0x55: { id: 85, type: [0x01], name: 'Base load', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0x5B: { id: 91, type: [0x01], name: 'message', devices: ['tuya-local:diagnostic'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0x76: { id: 118, type: [0x02], name: 'Supply air temperature', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 47x; reference-only mapping', capability: null },
    0x83: { id: 131, type: [0x02], name: 'Warning', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 14x; reference-only mapping', capability: null },
    0x84: { id: 132, type: [0x03], name: 'option', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 16x; reference-only mapping', capability: null },
    0x85: { id: 133, type: [0x02], name: 'swing_action', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 16x; reference-only mapping', capability: null },
    0x86: { id: 134, type: [0x01], name: 'switch', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 31x; reference-only mapping', capability: null },
    0x87: { id: 135, type: [0x02], name: 'Energy tariff', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 12x; reference-only mapping', capability: null },
    0x88: { id: 136, type: [0x03], name: 'Overvoltage recovery delay', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 15x; reference-only mapping', capability: null },
    0x89: { id: 137, type: [0x02], name: 'Horizontal swing', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 10x; reference-only mapping', capability: null },
    0x8A: { id: 138, type: [0x03], name: 'Over protection', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 12x; reference-only mapping', capability: null },
    0x8B: { id: 139, type: [0x01], name: 'Fast refresh', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 19x; reference-only mapping', capability: null },
    0x8C: { id: 140, type: [0x01], name: 'Low voltage threshold', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 10x; reference-only mapping', capability: null },
    0x8D: { id: 141, type: [0x02], name: 'Over protection time remaining', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 7x; reference-only mapping', capability: null },
    0x8E: { id: 142, type: [0x02], name: 'Voice status', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 7x; reference-only mapping', capability: null },
    0x8F: { id: 143, type: [0x03], name: 'Voice location', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 8x; reference-only mapping', capability: null },
    0x90: { id: 144, type: [0x01], name: 'inspection_mode', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 4x; reference-only mapping', capability: null },
    0x91: { id: 145, type: [0x01], name: 'demo_mode', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 6x; reference-only mapping', capability: null },
    0x92: { id: 146, type: [0x03], name: 'option', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 4x; reference-only mapping', capability: null },
    0x93: { id: 147, type: [0x03], name: 'Auto generator mode', devices: ['tuya-local:diagnostic'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0x94: { id: 148, type: [0x01], name: 'lock', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 5x; reference-only mapping', capability: null },
    0x95: { id: 149, type: [0x01], name: 'Access card', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 4x; reference-only mapping', capability: null },
    0x96: { id: 150, type: [0x01], name: 'switch', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 18x; reference-only mapping', capability: null },
    0x97: { id: 151, type: [0x03], name: 'option', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 11x; reference-only mapping', capability: null },
    0x98: { id: 152, type: [0x03], name: 'Turbo ventilation', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 7x; reference-only mapping', capability: null },
    0x99: { id: 153, type: [0x03], name: 'Refresh', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0x9A: { id: 154, type: [0x02], name: 'event', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 9x; reference-only mapping', capability: null },
    0x9B: { id: 155, type: [0x01], name: 'switch', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 6x; reference-only mapping', capability: null },
    0x9C: { id: 156, type: [0x01], name: 'available', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 4x; reference-only mapping', capability: null },
    0x9D: { id: 157, type: [0x02], name: 'Charge', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0x9E: { id: 158, type: [0x02], name: 'brightness', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0x9F: { id: 159, type: [0x01], name: 'switch', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xA0: { id: 160, type: [0x01], name: 'Log upload', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xA1: { id: 161, type: [0x01], name: 'switch', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 3x; reference-only mapping', capability: null },
    0xA2: { id: 162, type: [0x01], name: 'Notification', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 4x; reference-only mapping', capability: null },
    0xA3: { id: 163, type: [0x03], name: 'Stop zooming', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xA4: { id: 164, type: [0x01], name: 'Limit motion detection area', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xA5: { id: 165, type: [0x01], name: 'Power', devices: ['tuya-local:diagnostic'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0xA8: { id: 168, type: [0x01], name: 'Motion area', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 4x; reference-only mapping', capability: null },
    0xA9: { id: 169, type: [0x03], name: 'Human detection', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 3x; reference-only mapping', capability: null },
    0xAA: { id: 170, type: [0x01], name: 'Light duration', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 3x; reference-only mapping', capability: null },
    0xAB: { id: 171, type: [0x01], name: 'switch', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 11x; reference-only mapping', capability: null },
    0xAC: { id: 172, type: [0x02], name: 'second', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 3x; reference-only mapping', capability: null },
    0xAD: { id: 173, type: [0x02], name: 'drying_status', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 5x; reference-only mapping', capability: null },
    0xAE: { id: 174, type: [0x03], name: 'Maintenance', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xAF: { id: 175, type: [0x03], name: 'Map expansion', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xB0: { id: 176, type: [0x02], name: 'Eco mode stop time 2', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xB1: { id: 177, type: [0x02], name: 'Eco mode start time 3', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xB2: { id: 178, type: [0x03], name: 'log_event', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0xB3: { id: 179, type: [0x02], name: 'Eco mode start time 4', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xB4: { id: 180, type: [0x01], name: 'AC voltage', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0xB5: { id: 181, type: [0x02], name: 'Compressor frequency', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 3x; reference-only mapping', capability: null },
    0xB6: { id: 182, type: [0x02], name: 'Eco mode stop time 5', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xB7: { id: 183, type: [0x02], name: 'Eco mode start time 6', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xB8: { id: 184, type: [0x03], name: 'dormant_keep_unseen', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0xB9: { id: 185, type: [0x02], name: 'event', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 12x; reference-only mapping', capability: null },
    0xBA: { id: 186, type: [0x02], name: 'Total time', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 3x; reference-only mapping', capability: null },
    0xBB: { id: 187, type: [0x01], name: 'Wednesday program', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xBC: { id: 188, type: [0x01], name: 'button', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 3x; reference-only mapping', capability: null },
    0xBD: { id: 189, type: [0x01], name: 'Friday program', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xBE: { id: 190, type: [0x01], name: 'Saturday program', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xBF: { id: 191, type: [0x02], name: 'Time zone', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0xC0: { id: 192, type: [0x03], name: 'Charge', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0xC1: { id: 193, type: [0x02], name: 'Sensor clean reset', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0xC2: { id: 194, type: [0x02], name: 'duration', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0xC3: { id: 195, type: [0x03], name: 'Get base software version', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 3x; reference-only mapping', capability: null },
    0xC5: { id: 197, type: [0x01], name: 'Dusty reset', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xC6: { id: 198, type: [0x01], name: 'button', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xC7: { id: 199, type: [0x02], name: 'Total cleaned area', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0xC9: { id: 201, type: [0x02], name: 'Portion size', devices: ['tuya-local:config', 'tuya-local:unknown'], description: 'tuya-local scan import (P92), seen 5x; reference-only mapping', capability: null },
    0xCA: { id: 202, type: [0x02], name: 'receive', devices: ['tuya-local:config', 'tuya-local:unknown'], description: 'tuya-local scan import (P92), seen 3x; reference-only mapping', capability: null },
    0xCB: { id: 203, type: [0x02], name: 'control', devices: ['tuya-local:diagnostic'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xCC: { id: 204, type: [0x02], name: 'realtime_data', devices: ['tuya-local:diagnostic'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xCD: { id: 205, type: [0x02], name: 'remote_dispensing', devices: ['tuya-local:diagnostic'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xCE: { id: 206, type: [0x02], name: 'history_data', devices: ['tuya-local:diagnostic'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xCF: { id: 207, type: [0x03], name: 'schedule', devices: ['tuya-local:diagnostic'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xD0: { id: 208, type: [0x03], name: 'Portion size', devices: ['tuya-local:diagnostic'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xD4: { id: 212, type: [0x02], name: 'event', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 10x; reference-only mapping', capability: null },
    0xE8: { id: 232, type: [0x02], name: 'lock', devices: ['tuya-local:diagnostic'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0xE9: { id: 233, type: [0x03], name: 'Voice record', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0xEA: { id: 234, type: [0x01], name: 'Feed problem', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 3x; reference-only mapping', capability: null },
    0xEB: { id: 235, type: [0x03], name: 'Stop voice record', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 3x; reference-only mapping', capability: null },
    0xEC: { id: 236, type: [0x01], name: 'Detection polygon', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xED: { id: 237, type: [0x02], name: 'Last feed', devices: ['tuya-local:diagnostic', 'tuya-local:config'], description: 'tuya-local scan import (P92), seen 3x; reference-only mapping', capability: null },
    0xEE: { id: 238, type: [0x01], name: 'Multi-zone area', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0xEF: { id: 239, type: [0x02], name: 'PIR alarm interval', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0xF0: { id: 240, type: [0x03], name: 'Dispenser stuck', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 4x; reference-only mapping', capability: null },
    0xF1: { id: 241, type: [0x03], name: 'option', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 4x; reference-only mapping', capability: null },
    0xF2: { id: 242, type: [0x03], name: 'feeding_record', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xF3: { id: 243, type: [0x03], name: 'report', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xF4: { id: 244, type: [0x03], name: 'planned_feed_report', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 2x; reference-only mapping', capability: null },
    0xF6: { id: 246, type: [0x03], name: 'feed_report', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xFD: { id: 253, type: [0x03], name: 'password_change', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xFE: { id: 254, type: [0x03], name: 'ip_address', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
    0xFF: { id: 255, type: [0x01], name: 'switch', devices: ['tuya-local:config'], description: 'tuya-local scan import (P92), seen 1x; reference-only mapping', capability: null },
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
          hex: `0x${  parseInt(dpId).toString(16).toUpperCase().padStart(2, '0')}`,
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
    if (!dp || !dp.capability) {return null;}
    
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
