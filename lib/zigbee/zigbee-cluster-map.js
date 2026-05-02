'use strict';

const { CLUSTERS } = require('../constants/ZigbeeConstants.js');

/**
 * ZIGBEE CLUSTER MAPPING
 * Global cluster ID mapping table for Zigbee devices
 */

const CLUSTER_IDS = {
  'BASIC': 0,
  'POWER_CONFIGURATION': 1,
  'DEVICE_TEMPERATURE_CONFIGURATION': 2,
  'IDENTIFY': 3,
  'GROUPS': 4,
  'SCENES': 5,
  'ON_OFF': 6,
  'ON_OFF_SWITCH_CONFIGURATION': 7,
  'LEVEL_CONTROL': 8,
  'ALARMS': 9,
  'TIME': 10,
  'RSSI_LOCATION': 11,
  'ANALOG_INPUT': 12,
  'ANALOG_OUTPUT': 13,
  'ANALOG_VALUE': 14,
  'BINARY_INPUT': 15,
  'BINARY_OUTPUT': 16,
  'BINARY_VALUE': 17,
  'MULTISTATE_INPUT': 18,
  'MULTISTATE_OUTPUT': 19,
  'MULTISTATE_VALUE': 20,
  'COMMISSIONING': 21,

  'SHADE_CONFIGURATION': 256,
  'DOOR_LOCK': 257,
  'WINDOW_COVERING': 258,

  'PUMP_CONFIGURATION_AND_CONTROL': 512,
  'THERMOSTAT': 513,
  'FAN_CONTROL': 514,
  'DEHUMIDIFICATION_CONTROL': 515,
  'THERMOSTAT_USER_INTERFACE_CONFIGURATION': 516,

  'COLOR_CONTROL': 768,
  'BALLAST_CONFIGURATION': 769,

  'ILLUMINANCE_MEASUREMENT': 1024,
  'ILLUMINANCE_LEVEL_SENSING': 1025,
  'TEMPERATURE_MEASUREMENT': 1026,
  'PRESSURE_MEASUREMENT': 1027,
  'FLOW_MEASUREMENT': 1028,
  'RELATIVE_HUMIDITY': 1029,
  'OCCUPANCY_SENSING': 1030,
  'SOIL_MOISTURE': 1032,
  'PH_MEASUREMENT': 1033,
  'ELECTRICAL_CONDUCTIVITY_MEASUREMENT': 1034,
  'WIND_SPEED_MEASUREMENT': 1035,
  'CONCENTRATION_MEASUREMENT': 1036,

  'IAS_ZONE': 1280,
  'IAS_ACE': 1281,
  'IAS_WD': 1282,

  'GENERIC_TUNNEL': 1536,

  'PRICE': 1792,
  'DEMAND_RESPONSE_AND_LOAD_CONTROL': 1793,
  'METERING': 1794,
  'MESSAGING': 1795,
  'TUNNELING': 1796,
  'PREPAYMENT': 1797,
  'ENERGY_MANAGEMENT': 1798,
  'CALENDAR': 1799,
  'DEVICE_MANAGEMENT': 1800,
  'EVENTS': 1801,
  'MDU_PAIRING': 1802,

  'APPLIANCE_IDENTIFICATION': 2816,
  'METER_IDENTIFICATION': 2817,
  'APPLIANCE_EVENTS_AND_ALERT': 2818,
  'APPLIANCE_STATISTICS': 2819,
  'ELECTRICAL_MEASUREMENT': 2820,
  'DIAGNOSTICS': 2821,

  'TOUCHLINK': 4096,

  'TUYA_PROPRIETARY': CLUSTERS.TUYA_EF00,
  'TUYA_ELECTRICAL_MEASUREMENT': 61185,
  'TUYA_SWITCH_MODE': 61186,

  'XIAOMI_SWITCH': 64512,
  'LEGRAND_CLUSTER': 64515,
  'PHILIPS_ENTERTAINMENT': 64769,

  'GREEN_POWER': 0x0021,
  'GREEN_POWER_SINK': 0x0022,
  'GREEN_POWER_PROXY': 0x0023,

  'genBasic': 0,
  'genPowerCfg': 1,
  'genDeviceTempCfg': 2,
  'genIdentify': 3,
  'genGroups': 4,
  'genScenes': 5,
  'genOnOff': 6,
  'genLevelCtrl': 8,
  'genAlarms': 9,
  'genTime': 10,
  'closuresWindowCovering': 258,
  'hvacThermostat': 513,
  'hvacFanCtrl': 514,
  'lightingColorCtrl': 768,
  'msIlluminanceMeasurement': 1024,
  'msTemperatureMeasurement': 1026,
  'msPressureMeasurement': 1027,
  'msRelativeHumidity': 1029,
  'msOccupancySensing': 1030,
  'ssIasZone': 1280,
  'ssIasAce': 1281,
  'seMetering': 1794,
  'haElectricalMeasurement': 2820,
  'manuSpecificTuya': CLUSTERS.TUYA_EF00
};

const CLUSTER_NAMES = {};
for (const [name, id] of Object.entries(CLUSTER_IDS)) {
  if (!CLUSTER_NAMES[id]) {
    CLUSTER_NAMES[id] = name;
  }
}

class ClusterMap {
  static get(identifier) {
    if (typeof identifier === 'number') {
      return identifier;
    }

    if (typeof identifier === 'string') {
      if (CLUSTER_IDS[identifier] !== undefined) {
        return CLUSTER_IDS[identifier];
      }

      const withUnderscores = identifier.replace(/([a-z])([A-Z])/g, '$1_$2');
      const upper = withUnderscores.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

      if (CLUSTER_IDS[upper] !== undefined) {
        return CLUSTER_IDS[upper];
      }

      if (upper.startsWith('CLUSTER_')) {
        const withoutPrefix = upper.substring(8);
        if (CLUSTER_IDS[withoutPrefix] !== undefined) {
          return CLUSTER_IDS[withoutPrefix];
        }
      }

      const found = Object.keys(CLUSTER_IDS).find(
        key => key.toUpperCase() === upper
      );
      if (found) {
        return CLUSTER_IDS[found];
      }
    }

    return null;
  }

  static getName(id) {
    return CLUSTER_NAMES[id] || null;
  }

  static has(identifier) {
    if (typeof identifier === 'number') {
      return CLUSTER_NAMES[identifier] !== undefined;
    }
    return this.get(identifier) !== null;
  }

  static getAll() {
    return { ...CLUSTER_IDS };
  }

  static resolve(value) {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      return this.get(value);
    }
    if (value && typeof value === 'object' && 'ID' in value) {
      return value.ID;
    }
    return null;
  }

  static safeGet(value, fallback = null) {
    const resolved = this.resolve(value);
    return resolved !== null ? resolved : fallback;
  }
}

module.exports = ClusterMap;
module.exports.CLUSTER_IDS = CLUSTER_IDS;
module.exports.CLUSTER_NAMES = CLUSTER_NAMES;
