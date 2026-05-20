'use strict';

/**
 * ZigbeeConstants - Centralized Zigbee Cluster Constants
 * v7.5.52 - Created to fix MODULE_NOT_FOUND for sensor_presence_radar + ZclToHomeyMap
 *
 * Provides a single source of truth for all cluster IDs used across the app.
 */

const CLUSTERS = {
  // Foundation
  BASIC: 0x0000,
  POWER_CONFIGURATION: 0x0001,
  DEVICE_TEMPERATURE: 0x0002,
  IDENTIFY: 0x0003,
  GROUPS: 0x0004,
  SCENES: 0x0005,
  ON_OFF: 0x0006,
  ON_OFF_SWITCH: 0x0007,
  LEVEL_CONTROL: 0x0008,
  ALARMS: 0x0009,
  TIME: 0x000A,

  // Closures
  SHADE_CONFIGURATION: 0x0100,
  DOOR_LOCK: 0x0101,
  WINDOW_COVERING: 0x0102,

  // HVAC
  THERMOSTAT: 0x0201,
  FAN_CONTROL: 0x0202,

  // Lighting
  COLOR_CONTROL: 0x0300,

  // Measurement & Sensing
  ILLUMINANCE_MEASUREMENT: 0x0400,   // 1024
  TEMPERATURE_MEASUREMENT: 0x0402,   // 1026
  PRESSURE_MEASUREMENT: 0x0403,      // 1027
  FLOW_MEASUREMENT: 0x0404,
  RELATIVE_HUMIDITY: 0x0405,         // 1029
  OCCUPANCY_SENSING: 0x0406,         // 1030

  // Security & Safety (IAS)
  IAS_ZONE: 0x0500,                  // 1280
  IAS_ACE: 0x0501,
  IAS_WD: 0x0502,

  // Smart Energy
  METERING: 0x0702,                  // 1794

  // Electrical Measurement
  ELECTRICAL_MEASUREMENT: 0x0B04,    // 2820

  // Tuya Proprietary
  TUYA_EF00: 0xEF00,                 // 61184
  TUYA_E000: 0xE000,                 // 57344
  TUYA_FC00: 0xFC00,                 // 64512

  // OTA / Maintenance
  OTA: 0x0019,
  POLL_CONTROL: 0x0020,
};

// Export as both named and default for compatibility
module.exports = { CLUSTERS, default: CLUSTERS };
