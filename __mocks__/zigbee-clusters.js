'use strict';

const CLUSTER = {
  // Basic cluster
  BASIC: 'basic',
  BASIC_ID: 0x0000,
  
  // Power configuration cluster
  POWER_CONFIGURATION: 'powerConfiguration',
  POWER_CONFIGURATION_ID: 0x0001,
  
  // Identify cluster
  IDENTIFY: 'identify',
  IDENTIFY_ID: 0x0003,
  
  // Groups cluster
  GROUPS: 'groups',
  GROUPS_ID: 0x0004,
  
  // Scenes cluster
  SCENES: 'scenes',
  SCENES_ID: 0x0005,
  
  // On/off cluster
  ON_OFF: 'onOff',
  ON_OFF_ID: 0x0006,
  
  // Level control cluster
  LEVEL_CONTROL: 'levelControl',
  LEVEL_CONTROL_ID: 0x0008,
  
  // Color control cluster
  COLOR_CONTROL: 'colorControl',
  COLOR_CONTROL_ID: 0x0300,
  
  // Temperature measurement cluster
  TEMPERATURE_MEASUREMENT: 'temperatureMeasurement',
  TEMPERATURE_MEASUREMENT_ID: 0x0402,
  
  // Relative humidity measurement cluster
  RELATIVE_HUMIDITY_MEASUREMENT: 'relativeHumidityMeasurement',
  RELATIVE_HUMIDITY_MEASUREMENT_ID: 0x0405,
  
  // Occupancy sensing cluster
  OCCUPANCY_SENSING: 'occupancySensing',
  OCCUPANCY_SENSING_ID: 0x0406,
  
  // Illuminance measurement cluster
  ILLUMINANCE_MEASUREMENT: 'illuminanceMeasurement',
  ILLUMINANCE_MEASUREMENT_ID: 0x0400,
  
  // Pressure measurement cluster
  PRESSURE_MEASUREMENT: 'pressureMeasurement',
  PRESSURE_MEASUREMENT_ID: 0x0403,
  
  // Metering cluster
  METERING: 'metering',
  METERING_ID: 0x0702,
  
  // Electrical measurement cluster
  ELECTRICAL_MEASUREMENT: 'electricalMeasurement',
  ELECTRICAL_MEASUREMENT_ID: 0x0B04,
  
  // Diagnostics cluster
  DIAGNOSTICS: 'diagnostics',
  DIAGNOSTICS_ID: 0x0B05,
  
  // Tuya specific cluster
  TUYA: 'tuya',
  TUYA_ID: 0xEF00,
  
  // Window covering cluster
  WINDOW_COVERING: 'windowCovering',
  WINDOW_COVERING_ID: 0x0102,
  
  // Fan control cluster
  FAN_CONTROL: 'fanControl',
  FAN_CONTROL_ID: 0x0202,
  
  // Thermostat cluster
  THERMOSTAT: 'thermostat',
  THERMOSTAT_ID: 0x0201,
  
  // Pump configuration and control cluster
  PUMP_CONFIGURATION_AND_CONTROL: 'pumpConfigurationAndControl',
  PUMP_CONFIGURATION_AND_CONTROL_ID: 0x0200,
  
  // Temperature configuration cluster
  TEMPERATURE_CONFIGURATION: 'temperatureConfiguration',
  TEMPERATURE_CONFIGURATION_ID: 0x0202,
  
  // Door lock cluster
  DOOR_LOCK: 'doorLock',
  DOOR_LOCK_ID: 0x0101,
};

// Mock Cluster class
class Cluster {
  static getCluster(clusterName) {
    return {
      attributes: {},
      commands: {},
      name: clusterName,
    };
  }
}

module.exports = {
  CLUSTER,
  Cluster,
  tuya: {
    dataType: {
      raw: 0x00,
      bool: 0x01,
      value: 0x02,
      string: 0x03,
      enum: 0x04,
      bitmap: 0x05,
    },
    commandType: {
      SET_DATA: 0x00,
      GET_DATA: 0x01,
      SET_TIME: 0x24,
    },
  },
};
