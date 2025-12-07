'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                    UNIVERSAL TUYA PARSER v5.5.84                                         ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                          ║
 * ║  Shared module for intelligent Tuya data parsing across ALL drivers                      ║
 * ║                                                                                          ║
 * ║  Features:                                                                               ║
 * ║  - Multi-format frame parsing (5 strategies)                                             ║
 * ║  - Auto-discovery of unknown DPs                                                         ║
 * ║  - Universal DP patterns from Z2M/ZHA/Community                                          ║
 * ║  - Universal ZCL cluster handlers                                                        ║
 * ║  - Value-based auto-detection                                                            ║
 * ║                                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════╝
 */

// Tuya DP data types
const TUYA_DP_TYPE = {
  RAW: 0x00,
  BOOL: 0x01,
  VALUE: 0x02,
  STRING: 0x03,
  ENUM: 0x04,
  BITMAP: 0x05,
};

/**
 * Universal DP patterns from community research (Z2M, ZHA, Tuya docs)
 */
const UNIVERSAL_DP_PATTERNS = {
  // Temperature (various DPs used by different devices)
  1: { capability: 'measure_temperature', transform: v => v / 10, pattern: 'temp-dp1' },
  5: { capability: 'measure_temperature', transform: v => v > 1000 ? v / 100 : v / 10, pattern: 'temp-dp5' },
  18: { capability: 'measure_temperature', transform: v => v / 10, pattern: 'temp-dp18' },
  24: { capability: 'measure_temperature', transform: v => v / 10, pattern: 'temp-dp24' },

  // Humidity
  2: { capability: 'measure_humidity', transform: v => v, pattern: 'humid-dp2' },
  3: { capability: 'measure_humidity', transform: v => v, pattern: 'humid-dp3' },
  19: { capability: 'measure_humidity', transform: v => v, pattern: 'humid-dp19' },

  // Battery
  14: { capability: 'measure_battery', transform: v => ({ 0: 10, 1: 50, 2: 100 }[v] ?? 50), pattern: 'batt-state' },
  15: { capability: 'measure_battery', transform: v => Math.min(100, Math.max(0, v)), pattern: 'batt-pct' },

  // On/Off
  6: { capability: 'onoff', transform: v => !!v, pattern: 'onoff-dp6' },

  // Illuminance
  7: { capability: 'measure_luminance', transform: v => v, pattern: 'lux-dp7' },
  12: { capability: 'measure_luminance', transform: v => v, pattern: 'lux-dp12' },

  // Motion
  101: { capability: 'alarm_motion', transform: v => !!v, pattern: 'motion' },

  // Contact
  102: { capability: 'alarm_contact', transform: v => !v, pattern: 'contact' },

  // Voltage (millivolts)
  21: { capability: 'measure_voltage', transform: v => v / 1000, pattern: 'voltage' },

  // Power
  104: { capability: 'measure_power', transform: v => v / 10, pattern: 'power' },

  // CO2
  22: { capability: 'measure_co2', transform: v => v, pattern: 'co2' },

  // PM2.5
  20: { capability: 'measure_pm25', transform: v => v, pattern: 'pm25' },

  // VOC
  23: { capability: 'measure_voc', transform: v => v, pattern: 'voc' },
};

/**
 * Universal ZCL cluster mappings
 */
const UNIVERSAL_ZCL_CLUSTERS = {
  temperatureMeasurement: {
    attribute: 'measuredValue',
    capability: 'measure_temperature',
    transform: v => v / 100
  },
  relativeHumidity: {
    attribute: 'measuredValue',
    capability: 'measure_humidity',
    transform: v => v / 100
  },
  illuminanceMeasurement: {
    attribute: 'measuredValue',
    capability: 'measure_luminance',
    transform: v => Math.round(Math.pow(10, (v - 1) / 10000))
  },
  powerConfiguration: {
    attribute: 'batteryPercentageRemaining',
    capability: 'measure_battery',
    transform: v => Math.min(100, Math.round(v / 2))
  },
  occupancySensing: {
    attribute: 'occupancy',
    capability: 'alarm_motion',
    transform: v => !!(v & 1)
  },
  iasZone: {
    attribute: 'zoneStatus',
    capability: 'alarm_contact',
    transform: v => !!(v & 1)
  },
  pressureMeasurement: {
    attribute: 'measuredValue',
    capability: 'measure_pressure',
    transform: v => v / 10
  },
  carbonDioxideMeasurement: {
    attribute: 'measuredValue',
    capability: 'measure_co2',
    transform: v => v
  },
  pm25Measurement: {
    attribute: 'measuredValue',
    capability: 'measure_pm25',
    transform: v => v
  },
  tvocMeasurement: {
    attribute: 'measuredValue',
    capability: 'measure_voc',
    transform: v => v
  },
  onOff: {
    attribute: 'onOff',
    capability: 'onoff',
    transform: v => !!v
  },
  levelControl: {
    attribute: 'currentLevel',
    capability: 'dim',
    transform: v => v / 254
  },
  colorControl: {
    attribute: 'colorTemperatureMireds',
    capability: 'light_temperature',
    transform: v => 1 - ((v - 153) / (500 - 153))  // Mireds to 0-1
  },
  electricalMeasurement: {
    attribute: 'activePower',
    capability: 'measure_power',
    transform: v => v / 10
  },
  meteringDevice: {
    attribute: 'currentSummationDelivered',
    capability: 'meter_power',
    transform: v => v / 1000
  },
};

/**
 * Parse Tuya raw frame with multiple strategies
 */
function parseTuyaFrame(buffer, logger = console.log) {
  if (!buffer || buffer.length < 4) return [];

  const hex = buffer.toString('hex');
  logger(`[TUYA-PARSE] 📦 Frame len=${buffer.length}, hex=${hex}`);

  // Try multiple parsing strategies
  const strategies = [
    { name: 'Format-A (header=5)', offset: 5 },
    { name: 'Format-B (header=4)', offset: 4 },
    { name: 'Format-C (header=3)', offset: 3 },
    { name: 'Format-D (header=2)', offset: 2 },
    { name: 'Format-E (header=0)', offset: 0 },
  ];

  for (const strategy of strategies) {
    if (buffer.length <= strategy.offset + 4) continue;

    const result = tryParseDPs(buffer, strategy.offset, logger);
    if (result.length > 0) {
      logger(`[TUYA-PARSE] ✅ ${strategy.name}: parsed ${result.length} DPs`);
      return result;
    }
  }

  // Last resort: scan for DP patterns
  logger('[TUYA-SCAN] 🔍 Scanning for DP patterns...');
  return scanForDPs(buffer, logger);
}

/**
 * Try to parse DPs from buffer at given offset
 */
function tryParseDPs(buffer, offset, logger) {
  const results = [];

  try {
    while (offset + 4 <= buffer.length) {
      const dpId = buffer.readUInt8(offset);
      const dpType = buffer.readUInt8(offset + 1);
      const length = buffer.readUInt16BE(offset + 2);

      // Validate DP structure
      if (dpId === 0 || dpId > 200) break;
      if (dpType > 5) break;
      if (length > 255 || (length === 0 && dpType !== TUYA_DP_TYPE.BOOL)) break;
      if (offset + 4 + length > buffer.length) break;

      const dataSlice = buffer.slice(offset + 4, offset + 4 + length);
      const value = parseDataSlice(dpType, dataSlice, length);

      if (value !== null) {
        logger(`[TUYA-DP] 📥 DP${dpId} type=${dpType} len=${length} → ${value}`);
        results.push({ dpId, dpType, value, raw: dataSlice });
      }

      offset += 4 + length;
    }
  } catch (e) {
    // Parse failed at this offset
  }

  return results;
}

/**
 * Parse data slice based on Tuya data type
 */
function parseDataSlice(dpType, dataSlice, length) {
  try {
    switch (dpType) {
      case TUYA_DP_TYPE.RAW:
        return dataSlice;

      case TUYA_DP_TYPE.BOOL:
        return length > 0 ? dataSlice.readUInt8(0) === 1 : false;

      case TUYA_DP_TYPE.VALUE:
        if (length === 4) return dataSlice.readInt32BE(0);
        if (length === 2) return dataSlice.readInt16BE(0);
        if (length === 1) return dataSlice.readInt8(0);
        return dataSlice.readIntBE(0, Math.min(length, 4));

      case TUYA_DP_TYPE.STRING:
        return dataSlice.toString('utf8').replace(/\0/g, '');

      case TUYA_DP_TYPE.ENUM:
        return dataSlice.readUInt8(0);

      case TUYA_DP_TYPE.BITMAP:
        if (length === 1) return dataSlice.readUInt8(0);
        if (length === 2) return dataSlice.readUInt16BE(0);
        if (length === 4) return dataSlice.readUInt32BE(0);
        return dataSlice;

      default:
        return dataSlice;
    }
  } catch (e) {
    return null;
  }
}

/**
 * Scan buffer for DP-like patterns (last resort)
 */
function scanForDPs(buffer, logger) {
  const results = [];

  for (let i = 0; i < buffer.length - 4; i++) {
    const dpId = buffer.readUInt8(i);
    const dpType = buffer.readUInt8(i + 1);
    const length = buffer.readUInt16BE(i + 2);

    if (dpId >= 1 && dpId <= 200 &&
      dpType >= 0 && dpType <= 5 &&
      length >= 0 && length <= 32 &&
      i + 4 + length <= buffer.length) {

      const dataSlice = buffer.slice(i + 4, i + 4 + length);
      const value = parseDataSlice(dpType, dataSlice, length);

      if (value !== null) {
        logger(`[TUYA-SCAN] 🎯 Found DP${dpId} at offset ${i}: ${value}`);
        results.push({ dpId, dpType, value, raw: dataSlice });
        i += 3 + length;
      }
    }
  }

  return results;
}

/**
 * Get universal DP mapping for auto-discovery
 */
function getUniversalDPMapping(dpId, value, hasCapability) {
  const pattern = UNIVERSAL_DP_PATTERNS[dpId];
  if (pattern && hasCapability(pattern.capability)) {
    return pattern;
  }

  // Value-based detection for unknown DPs
  if (typeof value === 'number') {
    if (value >= -400 && value <= 1000 && hasCapability('measure_temperature')) {
      return { capability: 'measure_temperature', transform: v => v / 10, pattern: 'auto-temp' };
    }
    if (value >= 0 && value <= 100 && hasCapability('measure_humidity')) {
      return { capability: 'measure_humidity', transform: v => v, pattern: 'auto-humid' };
    }
    if (value >= 0 && value <= 100 && hasCapability('measure_battery') && dpId >= 10) {
      return { capability: 'measure_battery', transform: v => v, pattern: 'auto-batt' };
    }
  }

  return null;
}

/**
 * Setup universal ZCL listeners on a device
 */
function setupUniversalZCLListeners(device, zclNode, customHandlers = {}) {
  device.log('[ZCL-UNIVERSAL] Setting up UNIVERSAL Zigbee cluster handlers...');

  for (const [epId, endpoint] of Object.entries(zclNode.endpoints || {})) {
    const availableClusters = Object.keys(endpoint.clusters || {});
    device.log(`[ZCL-UNIVERSAL] EP${epId} clusters: ${availableClusters.join(', ') || 'none'}`);

    for (const clusterName of availableClusters) {
      const cluster = endpoint.clusters[clusterName];
      if (!cluster || typeof cluster.on !== 'function') continue;

      const customHandler = customHandlers[clusterName];
      const universalHandler = UNIVERSAL_ZCL_CLUSTERS[clusterName];

      if (customHandler || universalHandler) {
        setupClusterListener(device, cluster, clusterName, epId, customHandler, universalHandler);
      } else {
        setupGenericClusterListener(device, cluster, clusterName, epId);
      }
    }
  }
}

/**
 * Setup listener for a specific cluster
 */
function setupClusterListener(device, cluster, clusterName, epId, customHandler, universalHandler) {
  try {
    cluster.on('attr', (attrName, value) => {
      device.log(`[ZCL] 📥 ${clusterName}.${attrName} = ${value}`);

      if (customHandler?.attributeReport) {
        customHandler.attributeReport.call(device, { [attrName]: value });
        return;
      }

      if (universalHandler && universalHandler.capability) {
        if (attrName === universalHandler.attribute || !universalHandler.attribute) {
          const finalValue = universalHandler.transform(value);
          device.log(`[ZCL-AUTO] 🔮 ${clusterName}.${attrName} → ${universalHandler.capability} = ${finalValue}`);

          if (device.hasCapability(universalHandler.capability)) {
            device.setCapabilityValue(universalHandler.capability, finalValue).catch(err => {
              device.error(`[ZCL] Failed to set ${universalHandler.capability}:`, err.message);
            });
          }
        }
      }
    });

    cluster.on('report', (data) => {
      device.log(`[ZCL] 📋 ${clusterName} report:`, JSON.stringify(data));
    });

    device.log(`[ZCL-UNIVERSAL] ✅ ${clusterName} listener on EP${epId}`);
  } catch (e) {
    device.log(`[ZCL-UNIVERSAL] ⚠️ ${clusterName} setup failed:`, e.message);
  }
}

/**
 * Generic listener for unknown clusters
 */
function setupGenericClusterListener(device, cluster, clusterName, epId) {
  try {
    cluster.on('attr', (attrName, value) => {
      device.log(`[ZCL-GENERIC] 📦 ${clusterName}.${attrName} = ${value}`);
    });
    device.log(`[ZCL-GENERIC] 👀 Watching ${clusterName} on EP${epId}`);
  } catch (e) {
    // Ignore errors
  }
}

module.exports = {
  TUYA_DP_TYPE,
  UNIVERSAL_DP_PATTERNS,
  UNIVERSAL_ZCL_CLUSTERS,
  parseTuyaFrame,
  tryParseDPs,
  parseDataSlice,
  scanForDPs,
  getUniversalDPMapping,
  setupUniversalZCLListeners,
  setupClusterListener,
  setupGenericClusterListener,
};
