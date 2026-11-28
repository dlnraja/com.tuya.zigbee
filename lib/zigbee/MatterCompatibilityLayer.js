'use strict';
const { normalize: normalizeCI } = require('../utils/CaseInsensitiveMatcher');

/**
 * MATTER COMPATIBILITY LAYER
 *
 * Enables Zigbee devices to be exposed to Matter networks via bridging.
 * Based on Matter 1.5 specification and Zigbee-to-Matter bridging requirements.
 *
 * Features:
 * - Zigbee to Matter cluster mapping
 * - Device type translation
 * - Attribute format conversion
 * - Backward compatibility with Zigbee 1.2, 3.0
 * - Support for Tuya proprietary protocol bridging
 *
 * Matter 1.5 Improvements:
 * - Enhanced Zigbee bridging
 * - Better device discovery
 * - Improved state synchronization
 */

class MatterCompatibilityLayer {

  /**
   * MATTER DEVICE TYPES (from Matter SDK)
   * Maps to Zigbee device classes
   */
  static MATTER_DEVICE_TYPES = {
    // Lighting
    ON_OFF_LIGHT: 0x0100,
    DIMMABLE_LIGHT: 0x0101,
    COLOR_TEMPERATURE_LIGHT: 0x010C,
    EXTENDED_COLOR_LIGHT: 0x010D,

    // Plugs & Outlets
    ON_OFF_PLUG: 0x010A,
    DIMMABLE_PLUG: 0x010B,

    // Switches
    ON_OFF_LIGHT_SWITCH: 0x0103,
    DIMMER_SWITCH: 0x0104,
    COLOR_DIMMER_SWITCH: 0x0105,

    // Sensors
    CONTACT_SENSOR: 0x0015,
    OCCUPANCY_SENSOR: 0x0107,
    LIGHT_SENSOR: 0x0106,
    TEMPERATURE_SENSOR: 0x0302,
    HUMIDITY_SENSOR: 0x0307,
    PRESSURE_SENSOR: 0x0305,
    FLOW_SENSOR: 0x0306,

    // HVAC & Water
    THERMOSTAT: 0x0301,
    HEAT_PUMP: 0x0309,
    FAN: 0x002B,
    AIR_PURIFIER: 0x002D,
    AIR_QUALITY_SENSOR: 0x002C,
    HUMIDIFIER_DEHUMIDIFIER: 0x002E,
    WATER_VALVE: 0x0042,

    // Closure & Appliances
    DOOR_LOCK: 0x000A,
    WINDOW_COVERING: 0x0202,
    GARAGE_DOOR: 0x0023,
    ROBOTIC_VACUUM_CLEANER: 0x0074,
    EVSE: 0x050C,

    // Safety & Security
    SMOKE_CO_ALARM: 0x0076,
    WATER_LEAK_DETECTOR: 0x0043,  // Matter 1.5
    RAIN_SENSOR: 0x0044,  // Matter 1.5

    // Generic
    GENERIC_SWITCH: 0x000F,
    BRIDGED_NODE: 0x0013,
    ROOT_NODE: 0x0016
  };

  /**
   * MATTER CLUSTERS (subset relevant for bridging)
   */
  static MATTER_CLUSTERS = {
    // Utility
    DESCRIPTOR: 0x001D,
    BINDING: 0x001E,
    ACCESS_CONTROL: 0x001F,
    BASIC_INFORMATION: 0x0028,
    OTA_SOFTWARE_UPDATE: 0x002A,
    POWER_SOURCE: 0x002F,

    // Application
    ON_OFF: 0x0006,
    LEVEL_CONTROL: 0x0008,
    COLOR_CONTROL: 0x0300,
    TEMPERATURE_MEASUREMENT: 0x0402,
    RELATIVE_HUMIDITY: 0x0405,
    PRESSURE_MEASUREMENT: 0x0403,
    OCCUPANCY_SENSING: 0x0406,
    ILLUMINANCE_MEASUREMENT: 0x0400,

    // HVAC
    THERMOSTAT: 0x0201,
    FAN_CONTROL: 0x0202,

    // Closures
    DOOR_LOCK: 0x0101,
    WINDOW_COVERING: 0x0102,

    // Safety
    BOOLEAN_STATE: 0x0045,  // Contact sensors
    SMOKE_CO_ALARM: 0x005C,  // Matter 1.3+

    // Power
    ELECTRICAL_MEASUREMENT: 0x0B04,
    POWER_METER: 0x0704   // Matter 1.5
  };

  /**
   * ZIGBEE TO MATTER CLUSTER MAPPING
   */
  static ZIGBEE_TO_MATTER_CLUSTERS = {
    // Foundation
    0x0000: 0x0028,  // Basic -> Basic Information
    0x0001: 0x002F,  // Power Configuration -> Power Source
    0x0003: 0x001D,  // Identify -> Descriptor

    // Application
    0x0006: 0x0006,  // On/Off -> On/Off (same)
    0x0008: 0x0008,  // Level Control -> Level Control (same)
    0x0300: 0x0300,  // Color Control -> Color Control (same)

    // Measurement
    0x0402: 0x0402,  // Temperature -> Temperature (same)
    0x0405: 0x0405,  // Humidity -> Humidity (same)
    0x0403: 0x0403,  // Pressure -> Pressure (same)
    0x0400: 0x0400,  // Illuminance -> Illuminance (same)
    0x0406: 0x0406,  // Occupancy -> Occupancy (same)

    // HVAC
    0x0201: 0x0201,  // Thermostat -> Thermostat (same)
    0x0202: 0x0202,  // Fan Control -> Fan Control (same)

    // Closures
    0x0101: 0x0101,  // Door Lock -> Door Lock (same)
    0x0102: 0x0102,  // Window Covering -> Window Covering (same)

    // Security
    0x0500: 0x0045,  // IAS Zone -> Boolean State

    // Tuya proprietary
    0xEF00: null     // Tuya DP - requires special handling
  };

  /**
   * ZIGBEE DEVICE CLASS TO MATTER DEVICE TYPE
   */
  static ZIGBEE_CLASS_TO_MATTER = {
    'light': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.DIMMABLE_LIGHT,
    'socket': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.ON_OFF_PLUG,
    'sensor': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.CONTACT_SENSOR,
    'thermostat': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.THERMOSTAT,
    'heater': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.THERMOSTAT,
    'fan': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.FAN,
    'airpurifier': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.AIR_PURIFIER,
    'windowcoverings': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.WINDOW_COVERING,
    'curtain': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.WINDOW_COVERING,
    'blinds': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.WINDOW_COVERING,
    'sunshade': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.WINDOW_COVERING,
    'garagedoor': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.GARAGE_DOOR,
    'lock': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.DOOR_LOCK,
    'vacuumcleaner': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.ROBOTIC_VACUUM_CLEANER,
    'button': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.GENERIC_SWITCH,
    'remote': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.GENERIC_SWITCH,
    'speaker': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.BRIDGED_NODE
  };

  /**
   * CAPABILITY TO MATTER CLUSTER MAPPING
   */
  static CAPABILITY_TO_MATTER = {
    // Basic controls
    'onoff': { cluster: 0x0006, attribute: 'onOff' },
    'dim': { cluster: 0x0008, attribute: 'currentLevel' },

    // Color
    'light_hue': { cluster: 0x0300, attribute: 'currentHue' },
    'light_saturation': { cluster: 0x0300, attribute: 'currentSaturation' },
    'light_temperature': { cluster: 0x0300, attribute: 'colorTemperatureMireds' },

    // Sensors
    'measure_temperature': { cluster: 0x0402, attribute: 'measuredValue' },
    'measure_humidity': { cluster: 0x0405, attribute: 'measuredValue' },
    'measure_pressure': { cluster: 0x0403, attribute: 'measuredValue' },
    'measure_luminance': { cluster: 0x0400, attribute: 'measuredValue' },
    'measure_co2': { cluster: 0x040D, attribute: 'measuredValue' },
    'measure_pm25': { cluster: 0x042A, attribute: 'measuredValue' },

    // Alarms
    'alarm_contact': { cluster: 0x0045, attribute: 'stateValue' },
    'alarm_motion': { cluster: 0x0406, attribute: 'occupancy' },
    'alarm_water': { cluster: 0x0045, attribute: 'stateValue' },
    'alarm_smoke': { cluster: 0x005C, attribute: 'smokeState' },
    'alarm_co': { cluster: 0x005C, attribute: 'coState' },

    // Power
    'measure_power': { cluster: 0x0B04, attribute: 'activePower' },
    'meter_power': { cluster: 0x0704, attribute: 'cumulativeEnergy' },
    'measure_voltage': { cluster: 0x0B04, attribute: 'rmsVoltage' },
    'measure_current': { cluster: 0x0B04, attribute: 'rmsCurrent' },

    // Battery
    'measure_battery': { cluster: 0x002F, attribute: 'batPercentRemaining' },

    // HVAC & Locks
    'target_temperature': { cluster: 0x0201, attribute: 'occupiedHeatingSetpoint' },
    'thermostat_mode': { cluster: 0x0201, attribute: 'systemMode' },
    'locked': { cluster: 0x0101, attribute: 'lockState' },

    // Covers
    'windowcoverings_set': { cluster: 0x0102, attribute: 'currentPositionLiftPercent100ths' },
    'windowcoverings_tilt_set': { cluster: 0x0102, attribute: 'currentPositionTiltPercent100ths' }
  };

  // ===============================================================
  // INSTANCE
  // ===============================================================

  constructor(device) {
    this.device = device;
    this.matterDeviceType = null;
    this.matterClusters = [];
    this.bridgeEnabled = false;
  }

  /**
   * Initialize Matter compatibility for this device
   */
  async initialize() {
    this.log('Initializing Matter compatibility layer...');

    // Detect Matter device type
    this.matterDeviceType = this.detectMatterDeviceType();
    this.log(`Matter device type: 0x${this.matterDeviceType.toString(16)}`);

    // Build Matter cluster list
    this.matterClusters = this.buildMatterClusters();
    this.log(`Matter clusters: ${this.matterClusters.map(c => `0x${c.toString(16)}`).join(', ')}`);

    // Store Matter-compatible data
    await this.storeCompatibilityData();

    this.bridgeEnabled = true;
    this.log('Matter compatibility layer ready');

    return true;
  }

  /**
   * Detect Matter device type from Homey device class
   */
  detectMatterDeviceType() {
    const deviceClass = this.device.class || 'other';
    const capabilities = this.device.getCapabilities() || [];

    // Check by device class first
    let matterType = MatterCompatibilityLayer.ZIGBEE_CLASS_TO_MATTER[deviceClass];

    // Refine based on capabilities
    if (deviceClass === 'light') {
      if (capabilities.includes('light_hue')) {
        matterType = MatterCompatibilityLayer.MATTER_DEVICE_TYPES.EXTENDED_COLOR_LIGHT;
      } else if (capabilities.includes('light_temperature')) {
        matterType = MatterCompatibilityLayer.MATTER_DEVICE_TYPES.COLOR_TEMPERATURE_LIGHT;
      } else if (capabilities.includes('dim')) {
        matterType = MatterCompatibilityLayer.MATTER_DEVICE_TYPES.DIMMABLE_LIGHT;
      } else {
        matterType = MatterCompatibilityLayer.MATTER_DEVICE_TYPES.ON_OFF_LIGHT;
      }
    }

    if (deviceClass === 'sensor') {
      if (capabilities.includes('alarm_motion')) {
        matterType = MatterCompatibilityLayer.MATTER_DEVICE_TYPES.OCCUPANCY_SENSOR;
      } else if (capabilities.includes('alarm_contact')) {
        matterType = MatterCompatibilityLayer.MATTER_DEVICE_TYPES.CONTACT_SENSOR;
      } else if (capabilities.includes('measure_temperature')) {
        matterType = MatterCompatibilityLayer.MATTER_DEVICE_TYPES.TEMPERATURE_SENSOR;
      } else if (capabilities.includes('measure_humidity')) {
        matterType = MatterCompatibilityLayer.MATTER_DEVICE_TYPES.HUMIDITY_SENSOR;
      } else if (capabilities.includes('alarm_water')) {
        matterType = MatterCompatibilityLayer.MATTER_DEVICE_TYPES.WATER_LEAK_DETECTOR;
      } else if (capabilities.includes('alarm_smoke')) {
        matterType = MatterCompatibilityLayer.MATTER_DEVICE_TYPES.SMOKE_CO_ALARM;
      }
    }

    return matterType || MatterCompatibilityLayer.MATTER_DEVICE_TYPES.BRIDGED_NODE;
  }

  /**
   * Build list of Matter clusters from device capabilities
   */
  buildMatterClusters() {
    const clusters = new Set();
    const capabilities = this.device.getCapabilities() || [];

    // Always add descriptor
    clusters.add(MatterCompatibilityLayer.MATTER_CLUSTERS.DESCRIPTOR);

    // Add clusters based on capabilities
    for (const cap of capabilities) {
      const mapping = MatterCompatibilityLayer.CAPABILITY_TO_MATTER[cap];
      if (mapping) {
        clusters.add(mapping.cluster);
      }
    }

    // Add power source if battery device
    if (capabilities.includes('measure_battery')) {
      clusters.add(MatterCompatibilityLayer.MATTER_CLUSTERS.POWER_SOURCE);
    }

    return Array.from(clusters);
  }

  /**
   * Store Matter compatibility data in device store
   */
  async storeCompatibilityData() {
    const matterData = {
      deviceType: this.matterDeviceType,
      clusters: this.matterClusters,
      bridgeVersion: '1.5',
      zigbeeVersion: this.detectZigbeeVersion(),
      lastUpdate: Date.now()
    };

    await this.device.setStoreValue('matter_compatibility', matterData).catch(() => { });
  }

  /**
   * Detect Zigbee protocol version
   */
  detectZigbeeVersion() {
    const data = this.device.getData() || {};

    // Check for Zigbee 3.0 indicators
    if (data.zigbeeVersion === '3.0') {return '3.0';}

    // Check manufacturer name patterns (case-insensitive)
    const manufacturer = normalizeCI(data.manufacturerName);
    if (/^_(tz3000|tz3210|tz3290|tze200|tze204|tze284)/.test(manufacturer)) {
      return '3.0'; // Tuya Zigbee 3.0
    }

    // Default to 1.2 for legacy devices
    return '1.2';
  }

  /** Preserve Apple HomeKit / Matter 0.5 C thermostat setpoint precision. */
  static roundHalfDegree(celsius) {
    const n = Number(celsius);
    if (!Number.isFinite(n)) {return null;}
    return Math.round(n * 2) / 2;
  }

  static _clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  /**
   * P3409: Exact Homey capability -> Matter 1.5 / Apple HomeKit value conversion.
   */
  static convertHomeyToMatter(capability, value, opts = {}) {
    const minMired = Number(opts.minMired) || 153;
    const maxMired = Number(opts.maxMired) || 500;
    const modeToMatter = { off: 0, auto: 1, cool: 3, heat: 4 };
    const handlers = {
      onoff: (v) => Boolean(v),
      dim: (v) => Math.round(MatterCompatibilityLayer._clamp(Number(v), 0, 1) * 254),
      light_hue: (v) => Math.round(MatterCompatibilityLayer._clamp(Number(v), 0, 1) * 254),
      light_saturation: (v) => Math.round(MatterCompatibilityLayer._clamp(Number(v), 0, 1) * 254),
      light_temperature: (v) => Math.round(minMired + (MatterCompatibilityLayer._clamp(Number(v), 0, 1) * (maxMired - minMired))),
      measure_temperature: (v) => Math.round(Number(v) * 100),
      target_temperature: (v) => Math.round((MatterCompatibilityLayer.roundHalfDegree(v) ?? Number(v)) * 100),
      measure_humidity: (v) => Math.round(MatterCompatibilityLayer._clamp(Number(v), 0, 100) * 100),
      measure_battery: (v) => Math.round(MatterCompatibilityLayer._clamp(Number(v), 0, 100) * 2),
      windowcoverings_set: (v) => Math.round((1 - MatterCompatibilityLayer._clamp(Number(v), 0, 1)) * 10000),
      windowcoverings_tilt_set: (v) => Math.round((1 - MatterCompatibilityLayer._clamp(Number(v), 0, 1)) * 10000),
      alarm_contact: (v) => !v,
      alarm_motion: (v) => v ? 1 : 0,
      locked: (v) => v ? 1 : 2,
      thermostat_mode: (v) => Object.prototype.hasOwnProperty.call(modeToMatter, String(v).toLowerCase()) ? modeToMatter[String(v).toLowerCase()] : 0,
    };
    const fn = handlers[capability];
    return fn ? fn(value) : value;
  }

  /**
   * P3409: Exact Matter 1.5 / Apple HomeKit -> Homey capability value conversion.
   */
  static convertMatterToHomey(capability, value, opts = {}) {
    const minMired = Number(opts.minMired) || 153;
    const maxMired = Number(opts.maxMired) || 500;
    const matterToMode = { 0: 'off', 1: 'auto', 3: 'cool', 4: 'heat' };
    const handlers = {
      onoff: (v) => Boolean(v),
      dim: (v) => Math.round(MatterCompatibilityLayer._clamp(Number(v) / 254, 0, 1) * 1000) / 1000,
      light_hue: (v) => Math.round(MatterCompatibilityLayer._clamp(Number(v) / 254, 0, 1) * 1000) / 1000,
      light_saturation: (v) => Math.round(MatterCompatibilityLayer._clamp(Number(v) / 254, 0, 1) * 1000) / 1000,
      light_temperature: (v) => Math.round(MatterCompatibilityLayer._clamp((Number(v) - minMired) / (maxMired - minMired), 0, 1) * 1000) / 1000,
      measure_temperature: (v) => Math.round(Number(v)) / 100,
      target_temperature: (v) => MatterCompatibilityLayer.roundHalfDegree(Number(v) / 100),
      measure_humidity: (v) => Math.round(MatterCompatibilityLayer._clamp(Number(v) / 100, 0, 100) * 10) / 10,
      measure_battery: (v) => Math.round(MatterCompatibilityLayer._clamp(Number(v) / 2, 0, 100)),
      windowcoverings_set: (v) => Math.round(MatterCompatibilityLayer._clamp(1 - (Number(v) / 10000), 0, 1) * 1000) / 1000,
      windowcoverings_tilt_set: (v) => Math.round(MatterCompatibilityLayer._clamp(1 - (Number(v) / 10000), 0, 1) * 1000) / 1000,
      alarm_contact: (v) => !v,
      alarm_motion: (v) => Boolean(Number(v) & 1),
      locked: (v) => Number(v) === 1,
      thermostat_mode: (v) => matterToMode[Number(v)] || 'off',
    };
    const fn = handlers[capability];
    return fn ? fn(value) : value;
  }

  /**
   * Convert Zigbee/Homey attribute value to Matter format
   */
  static convertToMatterFormat(zigbeeCluster, attribute, value) {
    if (zigbeeCluster === 0x0008 && typeof value === 'number' && value >= 0 && value <= 1) {
      return MatterCompatibilityLayer.convertHomeyToMatter('dim', value);
    }
    if (zigbeeCluster === 0x0102 && typeof value === 'number' && value >= 0 && value <= 1) {
      return MatterCompatibilityLayer.convertHomeyToMatter('windowcoverings_set', value);
    }
    if (zigbeeCluster === 0x0045 && attribute === 'stateValue' && typeof value === 'boolean') {
      return !value;
    }
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    return value;
  }

  /**
   * Convert Matter attribute value back to Zigbee/Homey format
   */
  static convertFromMatterFormat(matterCluster, attribute, value) {
    if (matterCluster === 0x0008 && typeof value === 'number') {
      return MatterCompatibilityLayer.convertMatterToHomey('dim', value);
    }
    if (matterCluster === 0x0102 && typeof value === 'number') {
      return MatterCompatibilityLayer.convertMatterToHomey('windowcoverings_set', value);
    }
    if (matterCluster === 0x0045 && attribute === 'stateValue' && typeof value === 'boolean') {
      return !value;
    }
    return value;
  }

  /**
   * P3409: Build Apple HomeKit (HomeKitty / Homey Matter Bridge) sync profile for a device.
   */
  static getAppleHomeKitProfile(device) {
    const cls = (device?.getClass?.() || device?.class || 'other').toLowerCase();
    const caps = (device?.getCapabilities?.() || []).map(String);
    const has = (c) => caps.includes(c);
    const serviceMap = {
      light: 'Lightbulb',
      socket: 'Outlet',
      thermostat: 'Thermostat',
      heater: 'HeaterCooler',
      fan: 'Fanv2',
      airpurifier: 'AirPurifier',
      windowcoverings: 'WindowCovering',
      curtain: 'WindowCovering',
      blinds: 'WindowCovering',
      garagedoor: 'GarageDoorOpener',
      lock: 'LockMechanism',
      button: 'StatelessProgrammableSwitch',
      remote: 'StatelessProgrammableSwitch',
    };
    const isStateless = cls === 'button' || cls === 'remote';
    const inverted = [];
    if (has('windowcoverings_set')) {inverted.push('windowcoverings_set');}
    if (has('alarm_contact')) {inverted.push('alarm_contact');}
    return {
      homeKitService: serviceMap[cls] || (has('alarm_motion') ? 'MotionSensor' : has('alarm_contact') ? 'ContactSensor' : has('measure_temperature') ? 'TemperatureSensor' : 'Accessory'),
      appleAdaptiveLighting: cls === 'light' && has('light_temperature'),
      halfDegreeThermostat: (cls === 'thermostat' || cls === 'heater') && has('target_temperature'),
      requiresVirtualSwitchForHomeKit: isStateless,
      invertedCapabilities: inverted,
      matterBridgeReady: !isStateless && caps.some((c) => Boolean(MatterCompatibilityLayer.CAPABILITY_TO_MATTER[c])),
    };
  }

  /**
   * Get Matter-compatible device info for bridging
   */
  getMatterDeviceInfo() {
    const data = this.device.getData() || {};

    return {
      // Basic information cluster (0x0028)
      vendorName: 'Tuya',
      vendorId: 0x1141,  // Tuya vendor ID in Matter
      productName: data.modelId || 'Tuya Device',
      productId: this.generateProductId(data.modelId),
      nodeLabel: this.device.getName(),
      hardwareVersion: 1,
      hardwareVersionString: '1.0',
      softwareVersion: 1,
      softwareVersionString: '1.0',
      serialNumber: data.ieeeAddr || data.token || 'unknown',

      // Bridge-specific
      reachable: this.device.getAvailable?.() !== false,
      uniqueId: data.ieeeAddr || data.token,

      // Device type
      deviceType: this.matterDeviceType,
      clusters: this.matterClusters
    };
  }

  /**
   * Generate Matter product ID from Zigbee model ID
   */
  generateProductId(modelId) {
    if (!modelId) {return 0x0001;}

    // Simple hash
    let hash = 0;
    for (let i = 0; i < modelId.length; i++) {
      hash = ((hash << 5) - hash) + modelId.charCodeAt(i);
      hash = hash & 0xFFFF; // 16-bit
    }
    return hash;
  }

  /**
   * Handle state change for Matter bridge synchronization
   */
  async onStateChange(capability, value) {
    if (!this.bridgeEnabled) {return;}

    const mapping = MatterCompatibilityLayer.CAPABILITY_TO_MATTER[capability];
    if (!mapping) {return;}

    const matterValue = MatterCompatibilityLayer.convertHomeyToMatter(capability, value);

    // Store for bridge to pick up
    const stateChanges = this.device.getStoreValue('matter_state_changes') || [];
    stateChanges.push({
      cluster: mapping.cluster,
      attribute: mapping.attribute,
      value: matterValue,
      timestamp: Date.now()
    });

    // Keep only last 10 changes
    if (stateChanges.length > 10) {
      stateChanges.shift();
    }

    await this.device.setStoreValue('matter_state_changes', stateChanges).catch(() => { });
  }

  /**
   * Log helper
   */
  log(...args) {
    this.device?.log?.('[MATTER]', ...args);
  }
}

// ===============================================================
// ZIGBEE BACKWARD COMPATIBILITY
// ===============================================================

/**
 * ZIGBEE VERSION COMPATIBILITY HELPER
 * Ensures devices work across Zigbee 1.2, 3.0, and future versions
 */
class ZigbeeCompatibilityHelper {

  /**
   * Zigbee profile IDs
   */
  static PROFILES = {
    HOME_AUTOMATION: 0x0104,
    SMART_ENERGY: 0x0109,
    GREEN_POWER: 0xA1E0,
    LIGHT_LINK: 0xC05E
  };

  /**
   * Normalize cluster configuration for different Zigbee versions
   */
  static normalizeClusterConfig(clusters, zigbeeVersion = '3.0') {
    const normalized = { ...clusters };

    // Zigbee 1.2 -> 3.0 compatibility
    if (zigbeeVersion === '1.2') {
      // Some clusters have different attribute IDs in 1.2
      // Handle legacy attribute names
    }

    return normalized;
  }

  /**
   * Get supported features based on Zigbee version
   */
  static getSupportedFeatures(zigbeeVersion) {
    const features = {
      touchlink: false,
      greenPower: false,
      installCodeJoin: false,
      securityLevel: 'standard'
    };

    if (zigbeeVersion === '3.0') {
      features.touchlink = true;
      features.greenPower = true;
      features.installCodeJoin = true;
      features.securityLevel = 'high';
    }

    return features;
  }

  /**
   * Convert legacy Zigbee 1.2 device data to 3.0 format
   */
  static convertLegacyDeviceData(data) {
    // Handle old data format
    const converted = { ...data };

    // Normalize manufacturer name
    if (converted.manufacturer_name && !converted.manufacturerName) {
      converted.manufacturerName = converted.manufacturer_name;
    }

    // Normalize model ID
    if (converted.model_id && !converted.modelId) {
      converted.modelId = converted.model_id;
    }

    // Normalize IEEE address
    if (converted.ieee_addr && !converted.ieeeAddr) {
      converted.ieeeAddr = converted.ieee_addr;
    }

    return converted;
  }
}

module.exports = {
  MatterCompatibilityLayer,
  ZigbeeCompatibilityHelper
};
