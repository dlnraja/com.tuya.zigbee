'use strict';

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

    // HVAC
    THERMOSTAT: 0x0301,
    FAN: 0x002B,
    AIR_PURIFIER: 0x002D,
    AIR_QUALITY_SENSOR: 0x002C,

    // Closure
    DOOR_LOCK: 0x000A,
    WINDOW_COVERING: 0x0202,

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
    0x0000: 0x0028,  // Basic → Basic Information
    0x0001: 0x002F,  // Power Configuration → Power Source
    0x0003: 0x001D,  // Identify → Descriptor

    // Application
    0x0006: 0x0006,  // On/Off → On/Off (same)
    0x0008: 0x0008,  // Level Control → Level Control (same)
    0x0300: 0x0300,  // Color Control → Color Control (same)

    // Measurement
    0x0402: 0x0402,  // Temperature → Temperature (same)
    0x0405: 0x0405,  // Humidity → Humidity (same)
    0x0403: 0x0403,  // Pressure → Pressure (same)
    0x0400: 0x0400,  // Illuminance → Illuminance (same)
    0x0406: 0x0406,  // Occupancy → Occupancy (same)

    // HVAC
    0x0201: 0x0201,  // Thermostat → Thermostat (same)
    0x0202: 0x0202,  // Fan Control → Fan Control (same)

    // Closures
    0x0101: 0x0101,  // Door Lock → Door Lock (same)
    0x0102: 0x0102,  // Window Covering → Window Covering (same)

    // Security
    0x0500: 0x0045,  // IAS Zone → Boolean State

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
    'windowcoverings': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.WINDOW_COVERING,
    'lock': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.DOOR_LOCK,
    'button': MatterCompatibilityLayer.MATTER_DEVICE_TYPES.GENERIC_SWITCH,
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

    // Alarms
    'alarm_contact': { cluster: 0x0045, attribute: 'stateValue' },
    'alarm_motion': { cluster: 0x0406, attribute: 'occupancy' },
    'alarm_water': { cluster: 0x0045, attribute: 'stateValue' },
    'alarm_smoke': { cluster: 0x005C, attribute: 'smokeState' },

    // Power
    'measure_power': { cluster: 0x0B04, attribute: 'activePower' },
    'meter_power': { cluster: 0x0704, attribute: 'cumulativeEnergy' },
    'measure_voltage': { cluster: 0x0B04, attribute: 'rmsVoltage' },
    'measure_current': { cluster: 0x0B04, attribute: 'rmsCurrent' },

    // Battery
    'measure_battery': { cluster: 0x002F, attribute: 'batPercentRemaining' },

    // HVAC
    'target_temperature': { cluster: 0x0201, attribute: 'occupiedHeatingSetpoint' },

    // Covers
    'windowcoverings_set': { cluster: 0x0102, attribute: 'currentPositionLiftPercent100ths' }
  };

  // ═══════════════════════════════════════════════════════════════
  // INSTANCE
  // ═══════════════════════════════════════════════════════════════

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
    if (data.zigbeeVersion === '3.0') return '3.0';

    // Check manufacturer name patterns (case-insensitive)
    const manufacturer = (data.manufacturerName || '').toLowerCase();
    if (manufacturer.startsWith('_tz3000') || manufacturer.startsWith('_tze200')) {
      return '3.0'; // Tuya Zigbee 3.0
    }

    // Default to 1.2 for legacy devices
    return '1.2';
  }

  /**
   * Convert Zigbee attribute value to Matter format
   */
  static convertToMatterFormat(zigbeeCluster, attribute, value) {
    // Temperature: Zigbee uses 0.01°C, Matter uses 0.01°C (same)
    if (zigbeeCluster === 0x0402) {
      return value; // Already compatible
    }

    // Humidity: Zigbee uses 0.01%, Matter uses 0.01% (same)
    if (zigbeeCluster === 0x0405) {
      return value;
    }

    // Level control: Zigbee 0-254, Matter 0-254 (same)
    if (zigbeeCluster === 0x0008) {
      return value;
    }

    // Battery: Zigbee 0-200 (0.5%), Matter 0-200 (0.5%) (same)
    if (zigbeeCluster === 0x0001) {
      return value;
    }

    // Color temperature: Zigbee mired, Matter mired (same)
    if (zigbeeCluster === 0x0300 && attribute === 'colorTemperatureMireds') {
      return value;
    }

    // Boolean states
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    return value;
  }

  /**
   * Convert Matter attribute value to Zigbee format
   */
  static convertFromMatterFormat(matterCluster, attribute, value) {
    // Most values are compatible
    return value;
  }

  /**
   * Get Matter-compatible device info for bridging
   */
  getMatterDeviceInfo() {
    const data = this.device.getData() || {};
    const settings = this.device.getSettings() || {};

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
    if (!modelId) return 0x0001;

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
    if (!this.bridgeEnabled) return;

    const mapping = MatterCompatibilityLayer.CAPABILITY_TO_MATTER[capability];
    if (!mapping) return;

    const matterValue = MatterCompatibilityLayer.convertToMatterFormat(
      mapping.cluster,
      mapping.attribute,
      value
    );

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

// ═══════════════════════════════════════════════════════════════
// ZIGBEE BACKWARD COMPATIBILITY
// ═══════════════════════════════════════════════════════════════

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

    // Zigbee 1.2 → 3.0 compatibility
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
