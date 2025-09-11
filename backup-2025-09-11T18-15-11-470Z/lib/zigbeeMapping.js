#!/usr/bin/env node
'use strict';

/**
 * Maps Zigbee clusters to Homey capabilities
 */

/**
 * Enhanced function/class
 */
class ZigbeeMapping {
  static mapCapabilities(device, capabilitiesMap) {
    const mappedCapabilities = {};
    for (const [key, value] of Object.entries(capabilitiesMap)) {
      if (device[key] !== undefined) {
        mappedCapabilities[value] = device[key];
      }
    }
    return mappedCapabilities;
  }

  static mapSettings(device, settingsMap) {
    const mappedSettings = {};
    for (const [key, value] of Object.entries(settingsMap)) {
      if (device[key] !== undefined) {
        mappedSettings[value] = device[key];
      }
    }
    return mappedSettings;
  }

  static zigbeeMapping = {
    // On/Off
    onoff: {
      cluster: 'genOnOff',
      attribute: 'onOff',
      capability: 'onoff',
    },
    
    // Dimmer
    dim: {
      cluster: 'genLevelCtrl',
      attribute: 'currentLevel',
      capability: 'dim',
      /** @param {number} value */
      setParser: value => Math.round(value * 254),
      /** @param {number} value */
      getParser: value => value / 254,
    },
    
    // Temperature
    measure_temperature: {
      cluster: 'msTemperatureMeasurement',
      attribute: 'measuredValue',
      capability: 'measure_temperature',
      /** @param {number} value */
      getParser: value => value / 100,
    },
    
    // Humidity
    measure_humidity: {
      cluster: 'msRelativeHumidity',
      attribute: 'measuredValue',
      capability: 'measure_humidity',
      /** @param {number} value */
      getParser: value => value / 100,
    },
    
    // Power
    measure_power: {
      cluster: 'haElectricalMeasurement',
      attribute: 'activePower',
      capability: 'measure_power',
    },
  };
}

module.exports = {
  // Mapping of Zigbee clusters to Homey capabilities
  clusterToCapability: {
    'genOnOff': 'onoff',
    'haElectricalMeasurement': 'measure_power',
    // Add more mappings here
  }
};
