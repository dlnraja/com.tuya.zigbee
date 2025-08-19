#!/usr/bin/env node
'use strict';

/**
 * 🔧 Capability Mapping - Universal Tuya Zigbee
 * Homey capability to cluster/attribute mapping
 */

const CAPABILITY_MAP = {
  // Basic capabilities
  onoff: {
    clusters: [0x0006], // ON_OFF
    attributes: [0x0000], // ON_OFF
    commands: ['toggle', 'on', 'off'],
    type: 'boolean'
  },
  
  dim: {
    clusters: [0x0008], // LEVEL_CONTROL
    attributes: [0x0000], // CURRENT_LEVEL
    commands: ['set', 'stepUp', 'stepDown'],
    type: 'number',
    range: [0, 100]
  },
  
  // Measurement capabilities
  measure_power: {
    clusters: [0x0B04], // ELECTRICAL_MEASUREMENT
    attributes: [0x0505], // RMS_VOLTAGE
    type: 'number',
    unit: 'W'
  },
  
  meter_power: {
    clusters: [0x0B04], // ELECTRICAL_MEASUREMENT
    attributes: [0x0508], // RMS_CURRENT
    type: 'number',
    unit: 'kWh'
  },
  
  measure_voltage: {
    clusters: [0x0B04], // ELECTRICAL_MEASUREMENT
    attributes: [0x0505], // RMS_VOLTAGE
    type: 'number',
    unit: 'V'
  },
  
  measure_current: {
    clusters: [0x0B04], // ELECTRICAL_MEASUREMENT
    attributes: [0x0508], // RMS_CURRENT
    type: 'number',
    unit: 'A'
  },
  
  // Sensor capabilities
  measure_temperature: {
    clusters: [0x0402], // TEMPERATURE_MEASUREMENT
    attributes: [0x0000], // MEASURED_VALUE
    type: 'number',
    unit: '°C'
  },
  
  measure_humidity: {
    clusters: [0x0405], // HUMIDITY_MEASUREMENT
    attributes: [0x0000], // MEASURED_VALUE
    type: 'number',
    unit: '%'
  },
  
  measure_pressure: {
    clusters: [0x0403], // PRESSURE_MEASUREMENT
    attributes: [0x0000], // MEASURED_VALUE
    type: 'number',
    unit: 'hPa'
  },
  
  measure_illuminance: {
    clusters: [0x0400], // ILLUMINANCE_MEASUREMENT
    attributes: [0x0000], // MEASURED_VALUE
    type: 'number',
    unit: 'lux'
  },
  
  // Alarm capabilities
  alarm_motion: {
    clusters: [0x0500], // IAS_ZONE
    attributes: [0x0000], // ZONE_STATE
    type: 'boolean'
  },
  
  alarm_contact: {
    clusters: [0x0500], // IAS_ZONE
    attributes: [0x0000], // ZONE_STATE
    type: 'boolean'
  },
  
  alarm_smoke: {
    clusters: [0x0500], // IAS_ZONE
    attributes: [0x0000], // ZONE_STATE
    type: 'boolean'
  },
  
  alarm_water: {
    clusters: [0x0500], // IAS_ZONE
    attributes: [0x0000], // ZONE_STATE
    type: 'boolean'
  },
  
  alarm_gas: {
    clusters: [0x0500], // IAS_ZONE
    attributes: [0x0000], // ZONE_STATE
    type: 'boolean'
  },
  
  // Battery capabilities
  measure_battery: {
    clusters: [0x0001], // POWER_CONFIG
    attributes: [0x0020], // BATTERY_PERCENTAGE_REMAINING
    type: 'number',
    unit: '%',
    range: [0, 100]
  },
  
  alarm_battery: {
    clusters: [0x0001], // POWER_CONFIG
    attributes: [0x0020], // BATTERY_PERCENTAGE_REMAINING
    type: 'boolean'
  },
  
  // Cover capabilities
  windowcoverings_state: {
    clusters: [0x0102], // WINDOW_COVERING
    attributes: [0x0008], // CURRENT_POSITION_LIFT_PERCENTAGE
    type: 'number',
    range: [0, 100]
  },
  
  windowcoverings_set: {
    clusters: [0x0102], // WINDOW_COVERING
    commands: ['up', 'down', 'stop'],
    type: 'string'
  },
  
  // Light capabilities
  light_hue: {
    clusters: [0x0300], // COLOR_CONTROL
    attributes: [0x0000], // CURRENT_HUE
    type: 'number',
    range: [0, 360]
  },
  
  light_saturation: {
    clusters: [0x0300], // COLOR_CONTROL
    attributes: [0x0001], // CURRENT_SATURATION
    type: 'number',
    range: [0, 100]
  },
  
  light_temperature: {
    clusters: [0x0300], // COLOR_CONTROL
    attributes: [0x0007], // COLOR_TEMPERATURE
    type: 'number',
    range: [153, 500]
  },
  
  // Thermostat capabilities
  target_temperature: {
    clusters: [0x0201], // THERMOSTAT
    attributes: [0x0012], // OCCUPIED_COOLING_SETPOINT
    type: 'number',
    unit: '°C'
  },
  
  measure_temperature_thermostat: {
    clusters: [0x0201], // THERMOSTAT
    attributes: [0x0000], // LOCAL_TEMPERATURE
    type: 'number',
    unit: '°C'
  }
};

class CapabilityMapper {
  constructor() {
    this.capabilities = CAPABILITY_MAP;
  }

  /**
   * Get capability info by name
   */
  getCapability(capabilityName) {
    return this.capabilities[capabilityName] || null;
  }

  /**
   * Get all capabilities for a device type
   */
  getCapabilitiesForDeviceType(deviceType) {
    const deviceCapabilities = {
      switch: ['onoff'],
      dimmer: ['onoff', 'dim'],
      light: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature'],
      plug: ['onoff', 'measure_power', 'meter_power'],
      sensor: ['measure_temperature', 'measure_humidity', 'measure_pressure', 'measure_illuminance'],
      motion: ['alarm_motion', 'measure_battery'],
      contact: ['alarm_contact', 'measure_battery'],
      smoke: ['alarm_smoke', 'measure_battery'],
      water: ['alarm_water', 'measure_battery'],
      gas: ['alarm_gas', 'measure_battery'],
      cover: ['windowcoverings_state', 'windowcoverings_set'],
      thermostat: ['target_temperature', 'measure_temperature_thermostat']
    };
    
    return deviceCapabilities[deviceType] || [];
  }

  /**
   * Get clusters needed for capabilities
   */
  getClustersForCapabilities(capabilityNames) {
    const clusters = new Set();
    
    for (const capName of capabilityNames) {
      const capability = this.getCapability(capName);
      if (capability && capability.clusters) {
        capability.clusters.forEach(cluster => clusters.add(cluster));
      }
    }
    
    return Array.from(clusters);
  }

  /**
   * Validate capability value
   */
  validateCapabilityValue(capabilityName, value) {
    const capability = this.getCapability(capabilityName);
    if (!capability) return false;
    
    if (capability.type === 'boolean') {
      return typeof value === 'boolean';
    }
    
    if (capability.type === 'number') {
      if (typeof value !== 'number') return false;
      
      if (capability.range) {
        const [min, max] = capability.range;
        return value >= min && value <= max;
      }
      
      return true;
    }
    
    if (capability.type === 'string') {
      return typeof value === 'string';
    }
    
    return false;
  }

  /**
   * Get Tuya DP mapping for capability
   */
  getTuyaDPMapping(capabilityName) {
    // This would be populated from the Tuya DP mapping table
    const tuyaMappings = {
      onoff: { dpId: 1, dpType: 'bool' },
      dim: { dpId: 2, dpType: 'value' },
      measure_power: { dpId: 5, dpType: 'value' },
      measure_temperature: { dpId: 3, dpType: 'value' },
      measure_humidity: { dpId: 4, dpType: 'value' }
    };
    
    return tuyaMappings[capabilityName] || null;
  }
}

module.exports = new CapabilityMapper();
