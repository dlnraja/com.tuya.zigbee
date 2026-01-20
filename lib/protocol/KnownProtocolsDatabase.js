'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║            KNOWN PROTOCOLS DATABASE - v5.5.41                                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Base de données des protocoles CONNUS par manufacturer/productId            ║
 * ║                                                                              ║
 * ║  Cette base permet de:                                                        ║
 * ║  - Éviter le mode hybrid inutile quand on sait déjà quel protocole utiliser  ║
 * ║  - Accélérer l'initialisation des devices connus                             ║
 * ║  - Toujours vérifier après 15 min (constructeurs chinois = surprises)        ║
 * ║                                                                              ║
 * ║  Sources:                                                                     ║
 * ║  - Zigbee2MQTT tuya.ts                                                        ║
 * ║  - ZHA quirks database                                                        ║
 * ║  - Johan Bendz com.tuya.zigbee                                               ║
 * ║  - Expérience utilisateur Homey Community                                     ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// Protocol types
const PROTOCOL = {
  TUYA_DP: 'tuya_dp',           // Uses Tuya 0xEF00 cluster exclusively
  ZCL_STANDARD: 'zcl_standard', // Uses standard ZCL clusters exclusively
  HYBRID: 'hybrid',             // Uses both (listen to all)
  UNKNOWN: 'unknown',           // Unknown - use hybrid and detect
};

// Data reception methods
const DATA_METHOD = {
  TUYA_BOUND: 'tuya_bound',     // TuyaBoundCluster (dataReport)
  TUYA_CLUSTER: 'tuya_cluster', // TuyaSpecificCluster events
  ZCL_BOUND: 'zcl_bound',       // ZCL BoundCluster (e.g., IASZone)
  ZCL_ATTR: 'zcl_attr',         // ZCL attribute reports
  ZCL_POLL: 'zcl_poll',         // ZCL polling
};

/**
 * Known devices database
 * Key: manufacturerName or productId
 * Value: { protocol, dataMethod, notes }
 */
const KNOWN_DEVICES = {
  // ═══════════════════════════════════════════════════════════════════════════
  // TS0601 DEVICES - Always Tuya DP (cluster 0xEF00)
  // ═══════════════════════════════════════════════════════════════════════════

  // Soil Sensors
  '_TZE284_oitavov2': {
    protocol: PROTOCOL.TUYA_DP,
    dataMethod: DATA_METHOD.TUYA_BOUND,
    dpMapping: { 3: 'soil_moisture', 5: 'temperature', 14: 'battery_state', 15: 'battery' },
    notes: 'QT-07S Soil sensor, temp/10'
  },
  '_TZE284_aao3yzhs': {
    protocol: PROTOCOL.TUYA_DP,
    dataMethod: DATA_METHOD.TUYA_BOUND,
    dpMapping: { 3: 'soil_moisture', 5: 'temperature', 14: 'battery_state', 15: 'battery' },
    notes: 'Soil sensor variant'
  },
  '_TZE200_myd45weu': {
    protocol: PROTOCOL.TUYA_DP,
    dataMethod: DATA_METHOD.TUYA_BOUND,
    dpMapping: { 3: 'soil_moisture', 5: 'temperature', 15: 'battery' },
    notes: 'Soil sensor _TZE200 variant'
  },

  // Climate Sensors (Temperature + Humidity)
  '_TZE284_vvmbj46n': {
    protocol: PROTOCOL.TUYA_DP,
    dataMethod: DATA_METHOD.TUYA_BOUND,
    dpMapping: { 1: 'temperature', 2: 'humidity', 4: 'battery' },
    notes: 'TH05Z LCD Climate monitor, temp/10, battery*2'
  },
  '_TZE200_vvmbj46n': {
    protocol: PROTOCOL.TUYA_DP,
    dataMethod: DATA_METHOD.TUYA_BOUND,
    dpMapping: { 1: 'temperature', 2: 'humidity', 4: 'battery' },
    notes: 'ONENUO TH05Z'
  },
  '_TZE200_bjawzodf': {
    protocol: PROTOCOL.TUYA_DP,
    dataMethod: DATA_METHOD.TUYA_BOUND,
    dpMapping: { 1: 'temperature', 2: 'humidity', 4: 'battery' },
    notes: 'Climate sensor standard'
  },
  '_TZE200_a8sdabtg': {
    protocol: PROTOCOL.TUYA_DP,
    dataMethod: DATA_METHOD.TUYA_BOUND,
    dpMapping: { 1: 'temperature', 2: 'humidity', 4: 'battery' },
    notes: 'Climate sensor variant'
  },

  // Presence/Radar Sensors
  '_TZE200_rhgsbacq': {
    protocol: PROTOCOL.TUYA_DP,
    dataMethod: DATA_METHOD.TUYA_BOUND,
    dpMapping: { 1: 'presence', 9: 'distance', 101: 'sensitivity', 102: 'detection_delay' },
    notes: 'mmWave radar presence sensor'
  },
  '_TZE204_sxm7l9xa': {
    protocol: PROTOCOL.TUYA_DP,
    dataMethod: DATA_METHOD.TUYA_BOUND,
    notes: '24GHz radar with multi-target tracking'
  },

  // Thermostats
  '_TZE200_aoclfnxz': {
    protocol: PROTOCOL.TUYA_DP,
    dataMethod: DATA_METHOD.TUYA_BOUND,
    notes: 'TRV thermostat valve'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TS0215A - IAS Zone buttons (ZCL + sometimes Tuya DP for battery)
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_0dumfk2z': {
    protocol: PROTOCOL.HYBRID,
    dataMethod: [DATA_METHOD.ZCL_BOUND, DATA_METHOD.TUYA_BOUND],
    notes: 'SOS button - IAS Zone + Tuya DP101 battery',
    preferTuyaForBattery: true
  },
  '_TZ3000_fdr5rqsn': {
    protocol: PROTOCOL.HYBRID,
    dataMethod: [DATA_METHOD.ZCL_BOUND, DATA_METHOD.TUYA_BOUND],
    notes: 'SOS button variant'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TS0001-TS0004 - Standard ZCL switches (may have Tuya DP for settings)
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_h1ipgkwn': {
    protocol: PROTOCOL.ZCL_STANDARD,
    dataMethod: DATA_METHOD.ZCL_ATTR,
    notes: '2-gang switch, ZCL onOff'
  },
  '_TZ3000_jl7w3l3q': {
    protocol: PROTOCOL.ZCL_STANDARD,
    dataMethod: DATA_METHOD.ZCL_ATTR,
    notes: '2-gang switch, ZCL onOff'
  },
  '_TZ3000_pmz6mjyu': {
    protocol: PROTOCOL.ZCL_STANDARD,
    dataMethod: DATA_METHOD.ZCL_ATTR,
    notes: '2-gang switch'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TS0201 - Standard ZCL temp/humidity sensors
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_fllyghyj': {
    protocol: PROTOCOL.ZCL_STANDARD,
    dataMethod: DATA_METHOD.ZCL_ATTR,
    notes: 'ZCL temperatureMeasurement + relativeHumidity'
  },
  '_TZ3000_xr3htd96': {
    protocol: PROTOCOL.ZCL_STANDARD,
    dataMethod: DATA_METHOD.ZCL_ATTR,
    notes: 'ZCL climate sensor'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TS011F - USB outlets / plugs (usually ZCL with Tuya for power)
  // ═══════════════════════════════════════════════════════════════════════════
  'LELLKI': {
    protocol: PROTOCOL.HYBRID,
    dataMethod: [DATA_METHOD.ZCL_ATTR, DATA_METHOD.TUYA_BOUND],
    notes: 'USB outlet - ZCL onOff + Tuya power measurement'
  },
  '_TZ3000_typdpdpg': {
    protocol: PROTOCOL.ZCL_STANDARD,
    dataMethod: DATA_METHOD.ZCL_ATTR,
    notes: 'Smart plug ZCL'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TS0041/43/44 - Scene switches (ZCL commands to bound cluster)
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3400_keyjqthh': {
    protocol: PROTOCOL.ZCL_STANDARD,
    dataMethod: DATA_METHOD.ZCL_BOUND,
    notes: '1-button scene switch'
  },
  '_TZ3000_bi6lpsew': {
    protocol: PROTOCOL.ZCL_STANDARD,
    dataMethod: DATA_METHOD.ZCL_BOUND,
    notes: 'Scene switch'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Motion sensors - PIR (usually IAS Zone)
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_mcxw5ehu': {
    protocol: PROTOCOL.ZCL_STANDARD,
    dataMethod: DATA_METHOD.ZCL_BOUND,
    notes: 'PIR motion sensor IAS Zone'
  },
  '_TZ3000_kmh5qpmb': {
    protocol: PROTOCOL.ZCL_STANDARD,
    dataMethod: DATA_METHOD.ZCL_BOUND,
    notes: 'PIR motion sensor'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Contact sensors (IAS Zone)
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_26fmupbb': {
    protocol: PROTOCOL.ZCL_STANDARD,
    dataMethod: DATA_METHOD.ZCL_BOUND,
    notes: 'Door/window contact sensor IAS'
  },
};

/**
 * ProductId patterns that indicate protocol
 */
const PRODUCT_ID_PATTERNS = {
  // TS0601 = Always Tuya DP
  'TS0601': { protocol: PROTOCOL.TUYA_DP, notes: 'Tuya DP device (0xEF00)' },

  // TS0001-TS0004 = Usually ZCL switches
  'TS0001': { protocol: PROTOCOL.ZCL_STANDARD, notes: 'Single switch' },
  'TS0002': { protocol: PROTOCOL.ZCL_STANDARD, notes: '2-gang switch' },
  'TS0003': { protocol: PROTOCOL.ZCL_STANDARD, notes: '3-gang switch' },
  'TS0004': { protocol: PROTOCOL.ZCL_STANDARD, notes: '4-gang switch' },

  // TS0011-TS0014 = ZCL switches (no neutral)
  'TS0011': { protocol: PROTOCOL.ZCL_STANDARD, notes: '1-gang no neutral' },
  'TS0012': { protocol: PROTOCOL.ZCL_STANDARD, notes: '2-gang no neutral' },
  'TS0013': { protocol: PROTOCOL.ZCL_STANDARD, notes: '3-gang no neutral' },
  'TS0014': { protocol: PROTOCOL.ZCL_STANDARD, notes: '4-gang no neutral' },

  // TS011F = Smart plugs (ZCL + optional Tuya for power)
  'TS011F': { protocol: PROTOCOL.HYBRID, notes: 'Smart plug/outlet' },
  'TS0115': { protocol: PROTOCOL.HYBRID, notes: 'USB outlet' },

  // TS0041-TS0044 = Scene switches (ZCL)
  'TS0041': { protocol: PROTOCOL.ZCL_STANDARD, notes: '1-button scene' },
  'TS0042': { protocol: PROTOCOL.ZCL_STANDARD, notes: '2-button scene' },
  'TS0043': { protocol: PROTOCOL.ZCL_STANDARD, notes: '3-button scene' },
  'TS0044': { protocol: PROTOCOL.ZCL_STANDARD, notes: '4-button scene' },

  // TS0201 = ZCL climate sensors
  'TS0201': { protocol: PROTOCOL.ZCL_STANDARD, notes: 'ZCL temp/humidity' },

  // TS0202 = Motion sensors (IAS Zone)
  'TS0202': { protocol: PROTOCOL.ZCL_STANDARD, notes: 'Motion sensor IAS' },

  // TS0203 = Contact sensors (IAS Zone)
  'TS0203': { protocol: PROTOCOL.ZCL_STANDARD, notes: 'Contact sensor IAS' },

  // TS0207 = Water leak (IAS Zone)
  'TS0207': { protocol: PROTOCOL.ZCL_STANDARD, notes: 'Water leak IAS' },

  // TS0215A = SOS buttons (IAS Zone + Tuya for battery)
  'TS0215A': { protocol: PROTOCOL.HYBRID, notes: 'SOS/panic button' },

  // TS0501A/B = Dimmers
  'TS0501A': { protocol: PROTOCOL.ZCL_STANDARD, notes: 'Dimmer' },
  'TS0501B': { protocol: PROTOCOL.ZCL_STANDARD, notes: 'Dimmer' },
  'TS0502A': { protocol: PROTOCOL.ZCL_STANDARD, notes: 'Color temp light' },
  'TS0502B': { protocol: PROTOCOL.ZCL_STANDARD, notes: 'Color temp light' },
  'TS0503A': { protocol: PROTOCOL.ZCL_STANDARD, notes: 'RGB light' },
  'TS0503B': { protocol: PROTOCOL.ZCL_STANDARD, notes: 'RGB light' },
  'TS0504A': { protocol: PROTOCOL.ZCL_STANDARD, notes: 'RGBW light' },
  'TS0504B': { protocol: PROTOCOL.ZCL_STANDARD, notes: 'RGBW light' },
  'TS0505A': { protocol: PROTOCOL.ZCL_STANDARD, notes: 'RGBCW light' },
  'TS0505B': { protocol: PROTOCOL.ZCL_STANDARD, notes: 'RGBCW light' },
};

/**
 * Lookup protocol for a device
 * @param {string} manufacturerName - Device manufacturer name
 * @param {string} productId - Device product ID (model)
 * @returns {Object|null} Protocol info or null if unknown
 */
function lookupProtocol(manufacturerName, productId) {
  // First, check exact manufacturer match
  if (manufacturerName && KNOWN_DEVICES[manufacturerName]) {
    return {
      source: 'manufacturer',
      ...KNOWN_DEVICES[manufacturerName]
    };
  }

  // Then check productId pattern
  if (productId) {
    for (const [pattern, info] of Object.entries(PRODUCT_ID_PATTERNS)) {
      if (productId.toUpperCase().startsWith(pattern)) {
        return {
          source: 'productId',
          ...info
        };
      }
    }
  }

  // Unknown device
  return null;
}

/**
 * Check if a manufacturer is a Tuya _TZE* variant (always Tuya DP)
 */
function isTuyaDPManufacturer(manufacturerName) {
  if (!manufacturerName) return false;
  const mfrLower = (manufacturerName || '').toLowerCase();
  return mfrLower.startsWith('_tze200_') ||
    mfrLower.startsWith('_tze204_') ||
    mfrLower.startsWith('_tze284_');
}

/**
 * Check if productId indicates Tuya DP
 */
function isTuyaDPProductId(productId) {
  return productId && productId.toUpperCase() === 'TS0601';
}

module.exports = {
  PROTOCOL,
  DATA_METHOD,
  KNOWN_DEVICES,
  PRODUCT_ID_PATTERNS,
  lookupProtocol,
  isTuyaDPManufacturer,
  isTuyaDPProductId,
};
