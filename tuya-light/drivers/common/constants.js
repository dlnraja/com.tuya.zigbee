'use strict';

/**
 * Common constants used across the Tuya Zigbee integration
 */

// Manufacturer Information
const MANUFACTURERS = {
  TUYA: '_TZ',
  XIAOMI: 'lumi',
  PHILIPS: 'Philips',
  IKEA: 'IKEA',
};

// Zigbee Cluster IDs
const CLUSTERS = {
  BASIC: 'genBasic',
  POWER_CONFIGURATION: 'genPowerCfg',
  ON_OFF: 'genOnOff',
  LEVEL_CONTROL: 'genLevelCtrl',
  COLOR_CONTROL: 'lightingColorCtrl',
  TEMPERATURE_MEASUREMENT: 'msTemperatureMeasurement',
  RELATIVE_HUMIDITY_MEASUREMENT: 'msRelativeHumidity',
  PRESSURE_MEASUREMENT: 'msPressureMeasurement',
  ILLUMINANCE_MEASUREMENT: 'msIlluminanceMeasurement',
  IAS_ZONE: 'ssIasZone',
  ELECTRICAL_MEASUREMENT: 'haElectricalMeasurement',
  METERING: 'seMetering',
  OCCUPANCY_SENSING: 'msOccupancySensing',
  TEMPERATURE_CONFIGURATION: 'msTemperatureConfiguration',
  TUYA_MANUFACTURER_CLUSTER: 'manuSpecificTuya',
};

// Common Attribute Names
const ATTRIBUTES = {
  // Power Configuration
  batteryPercentageRemaining: 'batteryPercentageRemaining',
  batteryVoltage: 'batteryVoltage',
  batterySize: 'batterySize',
  
  // Basic
  manufacturerName: 'manufacturerName',
  modelId: 'modelId',
  powerSource: 'powerSource',
  
  // Common Measurements
  measuredValue: 'measuredValue',
  minMeasuredValue: 'minMeasuredValue',
  maxMeasuredValue: 'maxMeasuredValue',
  
  // On/Off
  onOff: 'onOff',
  
  // Level Control
  currentLevel: 'currentLevel',
  
  // Color Control
  currentHue: 'currentHue',
  currentSaturation: 'currentSaturation',
  colorTemperature: 'colorTemperature',
};

// Default Polling Intervals (in milliseconds)
const POLLING_INTERVALS_MS = {
  BATTERY: 6 * 60 * 60 * 1000,  // 6 hours
  TEMPERATURE: 5 * 60 * 1000,    // 5 minutes
  HUMIDITY: 5 * 60 * 1000,       // 5 minutes
  PRESSURE: 15 * 60 * 1000,      // 15 minutes
  ILLUMINANCE: 5 * 60 * 1000,    // 5 minutes
  POWER: 30 * 1000,              // 30 seconds
  OCCUPANCY: 1 * 60 * 1000,      // 1 minute
};

// Default Settings
const DEFAULT_SETTINGS = {
  debug_enabled: false,
  polling_interval: 300,  // seconds
  battery_threshold: 20,  // percentage
};

// Device Types
const DEVICE_TYPES = {
  SENSOR: 'sensor',
  SWITCH: 'switch',
  LIGHT: 'light',
  THERMOSTAT: 'thermostat',
  COVER: 'cover',
  LOCK: 'lock',
};

module.exports = {
  // Core Constants
  MANUFACTURERS,
  CLUSTERS,
  ATTRIBUTES,
  POLLING_INTERVALS_MS,
  DEFAULT_SETTINGS,
  DEVICE_TYPES,
  
  // Aliases for backward compatibility
  TUYA_MANUFACTURER_NAME_PREFIX: MANUFACTURERS.TUYA,
};
