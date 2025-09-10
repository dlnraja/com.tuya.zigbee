'use strict';

class ZigbeeDevice {
  constructor() {
    this.log = jest.fn();
    this.error = jest.fn();
    this.debug = jest.fn();
    this.printNode = jest.fn();
    this.enableDebug = jest.fn();
    this.zclNode = {
      on: jest.fn(),
      endpoints: {},
    };
    this.capabilities = new Map();
    this.settings = new Map();
  }

  async ready() {
    return Promise.resolve();
  }

  hasCapability(capability) {
    return this.capabilities.has(capability);
  }

  async setCapabilityValue(capability, value) {
    this.capabilities.set(capability, value);
    return Promise.resolve();
  }

  async getCapabilityValue(capability) {
    return this.capabilities.get(capability);
  }

  async registerCapabilityListener(capability, handler) {
    this.capabilities.set(capability, handler);
    return Promise.resolve();
  }

  async registerMultipleCapabilityListener(capabilities, handler) {
    capabilities.forEach(capability => {
      this.capabilities.set(capability, handler);
    });
    return Promise.resolve();
  }

  async setSettings(settings) {
    Object.entries(settings).forEach(([key, value]) => {
      this.settings.set(key, value);
    });
    return Promise.resolve();
  }

  async getSettings() {
    const settings = {};
    this.settings.forEach((value, key) => {
      settings[key] = value;
    });
    return Promise.resolve(settings);
  }

  async getSetting(key) {
    return Promise.resolve(this.settings.get(key));
  }

  async setSetting(key, value) {
    this.settings.set(key, value);
    return Promise.resolve();
  }
}

module.exports = {
  ZigbeeDevice,
  CLUSTER: {
    BASIC: 'basic',
    POWER_CONFIGURATION: 'powerConfiguration',
    IDENTIFY: 'identify',
    GROUPS: 'groups',
    SCENES: 'scenes',
    ON_OFF: 'onOff',
    LEVEL_CONTROL: 'levelControl',
    COLOR_CONTROL: 'colorControl',
    TEMPERATURE_MEASUREMENT: 'temperatureMeasurement',
    RELATIVE_HUMIDITY_MEASUREMENT: 'relativeHumidityMeasurement',
    PRESSURE_MEASUREMENT: 'pressureMeasurement',
    ILLUMINANCE_MEASUREMENT: 'illuminanceMeasurement',
    OCCUPANCY_SENSING: 'occupancySensing',
    METER_IDENTIFICATION: 'meterIdentification',
    ELECTRICAL_MEASUREMENT: 'electricalMeasurement',
    METERING: 'metering',
    DIAGNOSTICS: 'diagnostics',
    WINDOW_COVERING: 'windowCovering',
    FAN_CONTROL: 'fanControl',
    THERMOSTAT: 'thermostat',
    PUMP_CONFIGURATION_AND_CONTROL: 'pumpConfigurationAndControl',
    TEMPERATURE_CONFIGURATION: 'temperatureConfiguration',
    DOOR_LOCK: 'doorLock',
  },
  Cluster: {
    getCluster: jest.fn().mockImplementation((clusterName) => ({
      attributes: {},
      commands: {},
    })),
  },
  ZCLNode: jest.fn().mockImplementation(() => ({
    endpoints: {},
    on: jest.fn(),
    log: {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    },
  })),
};
