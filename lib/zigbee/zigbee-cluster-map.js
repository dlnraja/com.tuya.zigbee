/**
 * ZIGBEE CLUSTER MAPPING
 *
 * Global cluster ID mapping table for Zigbee devices
 * Maps symbolic names to numeric cluster IDs
 *
 * Usage:
 *   const CLUSTER_MAP = require('./zigbee-cluster-map');
 *   const clusterId = CLUSTER_MAP.get('POWER_CONFIGURATION'); // Returns 1
 *   const clusterId = CLUSTER_MAP.get(1); // Returns 1 (passthrough)
 */

const CLUSTER_IDS = {
  // Foundation Clusters (0x0000-0x00FF)
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

  // Closures (0x0100-0x01FF)
  'SHADE_CONFIGURATION': 256,
  'DOOR_LOCK': 257,
  'WINDOW_COVERING': 258,

  // HVAC (0x0200-0x02FF)
  'PUMP_CONFIGURATION_AND_CONTROL': 512,
  'THERMOSTAT': 513,
  'FAN_CONTROL': 514,
  'DEHUMIDIFICATION_CONTROL': 515,
  'THERMOSTAT_USER_INTERFACE_CONFIGURATION': 516,

  // Lighting (0x0300-0x03FF)
  'COLOR_CONTROL': 768,
  'BALLAST_CONFIGURATION': 769,

  // Measurement & Sensing (0x0400-0x04FF)
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

  // Security & Safety (0x0500-0x05FF)
  'IAS_ZONE': 1280,
  'IAS_ACE': 1281,
  'IAS_WD': 1282,

  // Protocol Interfaces (0x0600-0x06FF)
  'GENERIC_TUNNEL': 1536,
  'BACNET_PROTOCOL_TUNNEL': 1537,
  'ANALOG_INPUT_BACNET_REGULAR': 1538,
  'ANALOG_INPUT_BACNET_EXTENDED': 1539,
  'ANALOG_OUTPUT_BACNET_REGULAR': 1540,
  'ANALOG_OUTPUT_BACNET_EXTENDED': 1541,
  'ANALOG_VALUE_BACNET_REGULAR': 1542,
  'ANALOG_VALUE_BACNET_EXTENDED': 1543,
  'BINARY_INPUT_BACNET_REGULAR': 1544,
  'BINARY_INPUT_BACNET_EXTENDED': 1545,
  'BINARY_OUTPUT_BACNET_REGULAR': 1546,
  'BINARY_OUTPUT_BACNET_EXTENDED': 1547,
  'BINARY_VALUE_BACNET_REGULAR': 1548,
  'BINARY_VALUE_BACNET_EXTENDED': 1549,
  'MULTISTATE_INPUT_BACNET_REGULAR': 1550,
  'MULTISTATE_INPUT_BACNET_EXTENDED': 1551,
  'MULTISTATE_OUTPUT_BACNET_REGULAR': 1552,
  'MULTISTATE_OUTPUT_BACNET_EXTENDED': 1553,
  'MULTISTATE_VALUE_BACNET_REGULAR': 1554,
  'MULTISTATE_VALUE_BACNET_EXTENDED': 1555,

  // Smart Energy (0x0700-0x07FF)
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

  // Home Automation (0x0B00-0x0BFF)
  'APPLIANCE_IDENTIFICATION': 2816,
  'METER_IDENTIFICATION': 2817,
  'APPLIANCE_EVENTS_AND_ALERT': 2818,
  'APPLIANCE_STATISTICS': 2819,
  'ELECTRICAL_MEASUREMENT': 2820,
  'DIAGNOSTICS': 2821,

  // Lighting & Occupancy (0x1000-0x10FF)
  'TOUCHLINK': 4096,

  // Manufacturer Specific - Tuya
  'TUYA_PROPRIETARY': 61184,  // 0xEF00
  'TUYA_ELECTRICAL_MEASUREMENT': 61185,
  'TUYA_SWITCH_MODE': 61186,

  // Manufacturer Specific - Others
  'XIAOMI_SWITCH': 64512,
  'LEGRAND_CLUSTER': 64515,
  'PHILIPS_ENTERTAINMENT': 64769,

  // Matter 1.5 Compatible Clusters
  'MATTER_DESCRIPTOR': 0x001D,
  'MATTER_BINDING': 0x001E,
  'MATTER_ACCESS_CONTROL': 0x001F,
  'MATTER_BASIC_INFORMATION': 0x0028,
  'MATTER_OTA_UPDATE': 0x002A,
  'MATTER_POWER_SOURCE': 0x002F,
  'MATTER_BOOLEAN_STATE': 0x0045,
  'MATTER_SMOKE_CO_ALARM': 0x005C,
  'MATTER_POWER_METER': 0x0704,

  // Green Power (Zigbee 3.0)
  'GREEN_POWER': 0x0021,
  'GREEN_POWER_SINK': 0x0022,
  'GREEN_POWER_PROXY': 0x0023,

  // Common aliases (for convenience)
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
  'manuSpecificTuya': 61184
};

/**
 * Reverse mapping: numeric ID to name
 */
const CLUSTER_NAMES = {};
for (const [name, id] of Object.entries(CLUSTER_IDS)) {
  if (!CLUSTER_NAMES[id]) {
    CLUSTER_NAMES[id] = name;
  }
}

/**
 * ClusterMap class for easy access
 */
class ClusterMap {
  /**
   * Get cluster ID from name or number
   * @param {string|number} identifier - Cluster name or ID
   * @returns {number|null} Cluster ID or null if not found
   */
  static get(identifier) {
    // If already a number, return it
    if (typeof identifier === 'number') {
      return identifier;
    }

    // If string, look up in mapping
    if (typeof identifier === 'string') {
      // Try direct lookup first (case-sensitive for speed)
      if (CLUSTER_IDS[identifier] !== undefined) {
        return CLUSTER_IDS[identifier];
      }

      // Convert to uppercase and replace non-alphanumeric with underscores
      // Also convert PascalCase to SNAKE_CASE (e.g., PowerConfiguration -> POWER_CONFIGURATION)
      const withUnderscores = String(identifier).replace(/([a-z])([A-Z])/g, '$1_$2');
      const upper = withUnderscores.toUpperCase().replace(/[^A-Z0-9_]/g, '_');

      // Direct uppercase lookup
      if (CLUSTER_IDS[upper] !== undefined) {
        return CLUSTER_IDS[upper];
      }

      // Try removing CLUSTER. prefix if present
      if (upper.startsWith('CLUSTER_')) {
        const withoutPrefix = upper.substring(8);
        if (CLUSTER_IDS[withoutPrefix] !== undefined) {
          return CLUSTER_IDS[withoutPrefix];
        }
      }

      // Try exact match (case-insensitive) in keys
      const found = Object.keys(CLUSTER_IDS).find(
        key => key.toUpperCase() === upper
      );
      if (found) {
        return CLUSTER_IDS[found];
      }
    }

    // Not found
    return null;
  }

  /**
   * Get cluster name from ID
   * @param {number} id - Cluster ID
   * @returns {string|null} Cluster name or null if not found
   */
  static getName(id) {
    return CLUSTER_NAMES[id] || null;
  }

  /**
   * Check if cluster exists
   * @param {string|number} identifier - Cluster name or ID
   * @returns {boolean} True if cluster exists
   */
  static has(identifier) {
    // For numbers, check if it exists in CLUSTER_NAMES
    if (typeof identifier === 'number') {
      return CLUSTER_NAMES[identifier] !== undefined;
    }
    // For strings, use get() method
    return this.get(identifier) !== null;
  }

  /**
   * Get all cluster IDs
   * @returns {Object} All cluster mappings
   */
  static getAll() {
    return { ...CLUSTER_IDS };
  }

  /**
   * Convert CLUSTER object notation to numeric ID
   * Handles: CLUSTER.POWER_CONFIGURATION -> 1
   * @param {any} value - Value to convert
   * @returns {number|null} Cluster ID or null
   */
  static resolve(value) {
    // Already a number
    if (typeof value === 'number') {
      return value;
    }

    // String identifier
    if (typeof value === 'string') {
      return this.get(value);
    }

    // Object with ID property (like zigbee-clusters CLUSTER objects)
    if (value && typeof value === 'object' && 'ID' in value) {
      return value.ID;
    }

    // Can't resolve
    return null;
  }

  /**
   * Safe cluster ID getter with fallback
   * @param {any} value - Value to get cluster ID from
   * @param {number} fallback - Fallback value if resolution fails
   * @returns {number} Cluster ID or fallback
   */
  static safeGet(value, fallback = null) {
    const resolved = this.resolve(value);
    return resolved !== null ? resolved : fallback;
  }
}

// Export the class and constants
module.exports = ClusterMap;
module.exports.CLUSTER_IDS = CLUSTER_IDS;
module.exports.CLUSTER_NAMES = CLUSTER_NAMES;

// Export commonly used clusters as direct properties for convenience
module.exports.BASIC = 0;
module.exports.POWER_CONFIGURATION = 1;
module.exports.IDENTIFY = 3;
module.exports.GROUPS = 4;
module.exports.SCENES = 5;
module.exports.ON_OFF = 6;
module.exports.LEVEL_CONTROL = 8;
module.exports.WINDOW_COVERING = 258;
module.exports.COLOR_CONTROL = 768;
module.exports.ILLUMINANCE_MEASUREMENT = 1024;
module.exports.TEMPERATURE_MEASUREMENT = 1026;
module.exports.RELATIVE_HUMIDITY = 1029;
module.exports.OCCUPANCY_SENSING = 1030;
module.exports.IAS_ZONE = 1280;
module.exports.METERING = 1794;
module.exports.ELECTRICAL_MEASUREMENT = 2820;
module.exports.TUYA_PROPRIETARY = 61184;
