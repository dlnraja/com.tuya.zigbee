'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║            BATTERY PROFILE DATABASE - v5.5.42 LOCAL ONLY                     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Base de données LOCALE des profils de batteries par device                  ║
 * ║  PAS DE CONNEXION INTERNET - Tout est embarqué dans l'app                    ║
 * ║                                                                              ║
 * ║  Après 15 min d'apprentissage, l'app affine automatiquement:                 ║
 * ║  - L'algorithme de calcul du pourcentage                                     ║
 * ║  - Les seuils de tension (min/max)                                           ║
 * ║  - Le type de courbe de décharge                                             ║
 * ║  - La source de données batterie (Tuya DP vs ZCL)                            ║
 * ║                                                                              ║
 * ║  Sources:                                                                    ║
 * ║  - Zigbee2MQTT device definitions                                            ║
 * ║  - ZHA quirks database                                                        ║
 * ║  - Battery chemistry datasheets                                              ║
 * ║  - Community feedback                                                         ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// Battery chemistry types
const BATTERY_CHEMISTRY = {
  CR2032: 'cr2032',           // 3V coin cell, linear discharge
  CR2450: 'cr2450',           // 3V coin cell, higher capacity
  CR123A: 'cr123a',           // 3V lithium, flat discharge
  AAA_ALKALINE: 'aaa_alk',    // 1.5V alkaline, steep curve
  AAA_LITHIUM: 'aaa_lith',    // 1.5V lithium, flat curve
  AA_ALKALINE: 'aa_alk',      // 1.5V alkaline
  AA_LITHIUM: 'aa_lith',      // 1.5V lithium
  LIPO_3V7: 'lipo_3v7',       // 3.7V LiPo rechargeable
  USB_POWERED: 'usb',         // USB powered (fake battery)
  MAINS: 'mains',             // AC powered
  UNKNOWN: 'unknown',
};

// Battery data sources
const BATTERY_SOURCE = {
  TUYA_DP: 'tuya_dp',         // Tuya DP (e.g., DP4, DP15, DP101)
  ZCL_POWER_CFG: 'zcl_power', // ZCL powerConfiguration cluster
  ZCL_VOLTAGE: 'zcl_voltage', // ZCL voltage attribute
  TUYA_STATE: 'tuya_state',   // Tuya battery_state enum (low/medium/high)
  NONE: 'none',               // No battery or unknown
};

// Voltage calculation algorithms
const VOLTAGE_ALGO = {
  LINEAR: 'linear',           // Linear interpolation min-max
  CR2032_CURVE: 'cr2032',     // CR2032 specific curve
  ALKALINE_CURVE: 'alkaline', // Alkaline discharge curve
  LITHIUM_FLAT: 'lithium',    // Flat lithium curve
  DIRECT_PERCENT: 'direct',   // Value is already percentage
  MULTIPLY_2: 'mult2',        // Value * 2 = percentage
  DIVIDE_2: 'div2',           // Value / 2 = percentage
};

/**
 * Battery profiles by manufacturer/productId
 * All data is LOCAL - no internet required
 */
const BATTERY_PROFILES = {
  // ═══════════════════════════════════════════════════════════════════════════
  // SOIL SENSORS - Usually CR2032/CR2450, Tuya DP for battery
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZE284_oitavov2': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.TUYA_DP,
    dpId: 15,                  // DP15 = battery percentage
    dpIdState: 14,             // DP14 = battery_state enum
    algorithm: VOLTAGE_ALGO.DIRECT_PERCENT,
    voltageMin: 2.5,
    voltageMax: 3.0,
    notes: 'QT-07S Soil sensor'
  },
  '_TZE284_aao3yzhs': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.TUYA_DP,
    dpId: 15,
    dpIdState: 14,
    algorithm: VOLTAGE_ALGO.DIRECT_PERCENT,
    voltageMin: 2.5,
    voltageMax: 3.0,
    notes: 'Soil sensor variant'
  },
  '_TZE200_myd45weu': {
    chemistry: BATTERY_CHEMISTRY.CR2450,
    source: BATTERY_SOURCE.TUYA_DP,
    dpId: 15,
    algorithm: VOLTAGE_ALGO.DIRECT_PERCENT,
    voltageMin: 2.5,
    voltageMax: 3.0,
    notes: 'Soil sensor _TZE200'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIMATE SENSORS - Usually CR2032, Tuya DP with x2 multiplier
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZE284_vvmbj46n': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.TUYA_DP,
    dpId: 4,                   // DP4 = battery (needs *2)
    algorithm: VOLTAGE_ALGO.MULTIPLY_2,
    voltageMin: 2.5,
    voltageMax: 3.0,
    notes: 'TH05Z LCD Climate monitor, value*2=percent'
  },
  '_TZE200_vvmbj46n': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.TUYA_DP,
    dpId: 4,
    algorithm: VOLTAGE_ALGO.MULTIPLY_2,
    voltageMin: 2.5,
    voltageMax: 3.0,
    notes: 'ONENUO TH05Z'
  },
  '_TZE200_bjawzodf': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.TUYA_DP,
    dpId: 4,
    algorithm: VOLTAGE_ALGO.MULTIPLY_2,
    voltageMin: 2.5,
    voltageMax: 3.0,
    notes: 'Climate sensor standard'
  },
  '_TZE200_a8sdabtg': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.TUYA_DP,
    dpId: 4,
    algorithm: VOLTAGE_ALGO.DIRECT_PERCENT,
    voltageMin: 2.5,
    voltageMax: 3.0,
    notes: 'Climate sensor variant - direct percent'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOS / PANIC BUTTONS - CR2032, Tuya DP 101 or ZCL
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_0dumfk2z': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.TUYA_DP, // Prefer Tuya over ZCL (less timeouts)
    dpId: 101,
    algorithm: VOLTAGE_ALGO.DIRECT_PERCENT,
    voltageMin: 2.5,
    voltageMax: 3.0,
    skipZclPolling: true,      // ZCL powerConfiguration times out
    notes: 'SOS button - use Tuya DP101 only'
  },
  '_TZ3000_fdr5rqsn': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.TUYA_DP,
    dpId: 101,
    algorithm: VOLTAGE_ALGO.DIRECT_PERCENT,
    voltageMin: 2.5,
    voltageMax: 3.0,
    skipZclPolling: true,
    notes: 'SOS button variant'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MOTION / PIR SENSORS - Usually 2x AAA or CR123A
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_mcxw5ehu': {
    chemistry: BATTERY_CHEMISTRY.AAA_ALKALINE,
    source: BATTERY_SOURCE.ZCL_POWER_CFG,
    algorithm: VOLTAGE_ALGO.ALKALINE_CURVE,
    voltageMin: 2.0,           // 2x AAA min
    voltageMax: 3.0,           // 2x AAA max
    notes: 'PIR motion sensor 2xAAA'
  },
  '_TZ3000_kmh5qpmb': {
    chemistry: BATTERY_CHEMISTRY.CR123A,
    source: BATTERY_SOURCE.ZCL_POWER_CFG,
    algorithm: VOLTAGE_ALGO.LITHIUM_FLAT,
    voltageMin: 2.5,
    voltageMax: 3.0,
    notes: 'PIR sensor CR123A'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTACT SENSORS - Usually CR2032 or CR1632
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_26fmupbb': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.ZCL_POWER_CFG,
    algorithm: VOLTAGE_ALGO.CR2032_CURVE,
    voltageMin: 2.5,
    voltageMax: 3.0,
    notes: 'Door/window contact'
  },
  '_TZ3000_decxrtwa': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.ZCL_POWER_CFG,
    algorithm: VOLTAGE_ALGO.CR2032_CURVE,
    voltageMin: 2.5,
    voltageMax: 3.0,
    notes: 'Contact sensor'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WATER LEAK SENSORS
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_fxwsnmhb': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.ZCL_POWER_CFG,
    algorithm: VOLTAGE_ALGO.CR2032_CURVE,
    voltageMin: 2.5,
    voltageMax: 3.0,
    notes: 'Water leak sensor'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE SWITCHES / REMOTES - Usually CR2032
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3400_keyjqthh': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.ZCL_POWER_CFG,
    algorithm: VOLTAGE_ALGO.CR2032_CURVE,
    voltageMin: 2.5,
    voltageMax: 3.0,
    notes: '1-button scene switch'
  },
  '_TZ3000_bi6lpsew': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.ZCL_POWER_CFG,
    algorithm: VOLTAGE_ALGO.CR2032_CURVE,
    voltageMin: 2.5,
    voltageMax: 3.0,
    notes: 'Scene switch'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESENCE / RADAR SENSORS - Usually USB powered
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZE200_rhgsbacq': {
    chemistry: BATTERY_CHEMISTRY.USB_POWERED,
    source: BATTERY_SOURCE.NONE,
    algorithm: null,
    notes: 'mmWave radar - USB powered, no battery'
  },
  '_TZE204_sxm7l9xa': {
    chemistry: BATTERY_CHEMISTRY.USB_POWERED,
    source: BATTERY_SOURCE.NONE,
    algorithm: null,
    notes: '24GHz radar - USB/DC powered'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MAINS POWERED (switches, plugs, outlets)
  // ═══════════════════════════════════════════════════════════════════════════
  '_TZ3000_h1ipgkwn': {
    chemistry: BATTERY_CHEMISTRY.MAINS,
    source: BATTERY_SOURCE.NONE,
    algorithm: null,
    notes: '2-gang switch - mains powered'
  },
  'LELLKI': {
    chemistry: BATTERY_CHEMISTRY.MAINS,
    source: BATTERY_SOURCE.NONE,
    algorithm: null,
    notes: 'USB outlet - mains powered'
  },
};

/**
 * Default profiles by productId pattern
 */
const PRODUCT_ID_BATTERY_DEFAULTS = {
  'TS0601': {
    source: BATTERY_SOURCE.TUYA_DP,
    dpId: 4,                   // Most common battery DP
    algorithm: VOLTAGE_ALGO.DIRECT_PERCENT,
    notes: 'TS0601 default - check specific manufacturer'
  },
  'TS0001': { chemistry: BATTERY_CHEMISTRY.MAINS, source: BATTERY_SOURCE.NONE },
  'TS0002': { chemistry: BATTERY_CHEMISTRY.MAINS, source: BATTERY_SOURCE.NONE },
  'TS0003': { chemistry: BATTERY_CHEMISTRY.MAINS, source: BATTERY_SOURCE.NONE },
  'TS0004': { chemistry: BATTERY_CHEMISTRY.MAINS, source: BATTERY_SOURCE.NONE },
  'TS011F': { chemistry: BATTERY_CHEMISTRY.MAINS, source: BATTERY_SOURCE.NONE },
  'TS0115': { chemistry: BATTERY_CHEMISTRY.MAINS, source: BATTERY_SOURCE.NONE },
  'TS0201': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.ZCL_POWER_CFG,
    algorithm: VOLTAGE_ALGO.CR2032_CURVE,
  },
  'TS0202': {
    chemistry: BATTERY_CHEMISTRY.AAA_ALKALINE,
    source: BATTERY_SOURCE.ZCL_POWER_CFG,
    algorithm: VOLTAGE_ALGO.ALKALINE_CURVE,
  },
  'TS0203': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.ZCL_POWER_CFG,
    algorithm: VOLTAGE_ALGO.CR2032_CURVE,
  },
  'TS0207': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.ZCL_POWER_CFG,
    algorithm: VOLTAGE_ALGO.CR2032_CURVE,
  },
  'TS0215A': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.TUYA_DP,
    dpId: 101,
    algorithm: VOLTAGE_ALGO.DIRECT_PERCENT,
  },
  'TS0041': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.ZCL_POWER_CFG,
    algorithm: VOLTAGE_ALGO.CR2032_CURVE,
  },
  'TS0042': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.ZCL_POWER_CFG,
    algorithm: VOLTAGE_ALGO.CR2032_CURVE,
  },
  'TS0043': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.ZCL_POWER_CFG,
    algorithm: VOLTAGE_ALGO.CR2032_CURVE,
  },
  'TS0044': {
    chemistry: BATTERY_CHEMISTRY.CR2032,
    source: BATTERY_SOURCE.ZCL_POWER_CFG,
    algorithm: VOLTAGE_ALGO.CR2032_CURVE,
  },
};

/**
 * Voltage to percentage conversion curves
 * Based on battery chemistry datasheets
 */
const VOLTAGE_CURVES = {
  // CR2032: 3.0V fresh, 2.0V dead, relatively linear
  [VOLTAGE_ALGO.CR2032_CURVE]: {
    points: [
      { voltage: 3.0, percent: 100 },
      { voltage: 2.9, percent: 90 },
      { voltage: 2.8, percent: 70 },
      { voltage: 2.7, percent: 50 },
      { voltage: 2.6, percent: 30 },
      { voltage: 2.5, percent: 15 },
      { voltage: 2.4, percent: 5 },
      { voltage: 2.0, percent: 0 },
    ],
  },

  // Alkaline: steep discharge curve
  [VOLTAGE_ALGO.ALKALINE_CURVE]: {
    points: [
      { voltage: 3.2, percent: 100 }, // 2x fresh AAA
      { voltage: 3.0, percent: 80 },
      { voltage: 2.8, percent: 60 },
      { voltage: 2.6, percent: 40 },
      { voltage: 2.4, percent: 20 },
      { voltage: 2.2, percent: 10 },
      { voltage: 2.0, percent: 0 },
    ],
  },

  // Lithium: flat discharge curve
  [VOLTAGE_ALGO.LITHIUM_FLAT]: {
    points: [
      { voltage: 3.0, percent: 100 },
      { voltage: 2.95, percent: 90 },
      { voltage: 2.9, percent: 70 },
      { voltage: 2.85, percent: 50 },
      { voltage: 2.8, percent: 30 },
      { voltage: 2.7, percent: 10 },
      { voltage: 2.5, percent: 0 },
    ],
  },
};

/**
 * Lookup battery profile for a device
 * @param {string} manufacturerName - Device manufacturer
 * @param {string} productId - Device product ID
 * @returns {Object|null} Battery profile
 */
function lookupBatteryProfile(manufacturerName, productId) {
  // First check exact manufacturer match
  if (manufacturerName && BATTERY_PROFILES[manufacturerName]) {
    return {
      source: 'manufacturer',
      ...BATTERY_PROFILES[manufacturerName]
    };
  }

  // Then check productId pattern
  if (productId) {
    for (const [pattern, profile] of Object.entries(PRODUCT_ID_BATTERY_DEFAULTS)) {
      if (productId.toUpperCase().startsWith(pattern)) {
        return {
          source: 'productId',
          ...profile
        };
      }
    }
  }

  return null;
}

/**
 * Calculate battery percentage from voltage using curve
 * @param {number} voltage - Battery voltage
 * @param {string} algorithm - Voltage algorithm
 * @param {number} minVoltage - Minimum voltage (0%)
 * @param {number} maxVoltage - Maximum voltage (100%)
 * @returns {number} Battery percentage 0-100
 */
function calculateBatteryPercent(voltage, algorithm, minVoltage = 2.5, maxVoltage = 3.0) {
  if (!voltage || voltage <= 0) return null;

  // Direct algorithms
  if (algorithm === VOLTAGE_ALGO.DIRECT_PERCENT) {
    return Math.min(100, Math.max(0, Math.round(voltage)));
  }

  if (algorithm === VOLTAGE_ALGO.MULTIPLY_2) {
    return Math.min(100, Math.max(0, Math.round(voltage * 2)));
  }

  if (algorithm === VOLTAGE_ALGO.DIVIDE_2) {
    return Math.min(100, Math.max(0, Math.round(voltage / 2)));
  }

  // Linear interpolation
  if (algorithm === VOLTAGE_ALGO.LINEAR) {
    const percent = ((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100;
    return Math.min(100, Math.max(0, Math.round(percent)));
  }

  // Curve-based algorithms
  const curve = VOLTAGE_CURVES[algorithm];
  if (curve) {
    const points = curve.points;

    // Find the two points to interpolate between
    for (let i = 0; i < points.length - 1; i++) {
      if (voltage >= points[i + 1].voltage && voltage <= points[i].voltage) {
        const v1 = points[i].voltage;
        const v2 = points[i + 1].voltage;
        const p1 = points[i].percent;
        const p2 = points[i + 1].percent;

        // Linear interpolation between points
        const ratio = (voltage - v2) / (v1 - v2);
        const percent = p2 + ratio * (p1 - p2);
        return Math.round(percent);
      }
    }

    // Outside curve range
    if (voltage >= points[0].voltage) return 100;
    if (voltage <= points[points.length - 1].voltage) return 0;
  }

  // Fallback to linear
  const percent = ((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

/**
 * Convert battery state enum to percentage
 * @param {number} state - Battery state (0=low, 1=medium, 2=high)
 * @returns {number} Approximate percentage
 */
function batteryStateToPercent(state) {
  switch (state) {
  case 0: return 10;  // low
  case 1: return 50;  // medium
  case 2: return 100; // high
  default: return null;
  }
}

module.exports = {
  BATTERY_CHEMISTRY,
  BATTERY_SOURCE,
  VOLTAGE_ALGO,
  BATTERY_PROFILES,
  PRODUCT_ID_BATTERY_DEFAULTS,
  VOLTAGE_CURVES,
  lookupBatteryProfile,
  calculateBatteryPercent,
  batteryStateToPercent,
};
