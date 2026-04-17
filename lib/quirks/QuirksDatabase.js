'use strict';
const { safeDivide } = require('../utils/tuyaUtils.js');

const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


/**
 * QuirksDatabase - Device-Specific Fixes and Workarounds
 * 
 * Inspired by fairecasoimeme/zha-device-handlers
 * Contains device quirks, workarounds, and special handling
 * 
 * Quirk types:
 * - forceOnOff: Force OnOff cluster instead of LevelControl
 * - keepAlive: Enable keep-alive pings
 * - tuyaDP: Tuya DataPoint device
 * - xiaomiSpecial: Xiaomi special attributes
 * - fixEndpoint: Fix endpoint descriptor
 * - customInit: Custom initialization function
 */

class QuirksDatabase {
  
  static QUIRKS = [
    
    // ========================================================================
    // TUYA DEVICES
    // ========================================================================
    
    {
      manufacturer: '_TZ3000_*',
      model: 'TS0001',
      name: 'Tuya 1-Gang Switch - Force OnOff',
      quirks: {
        forceOnOff: true,
        disableLevelControl: true,
        clusters: [0, 3, 4, 5, 6, 0xE000, 0xE001]
      }
    },
    
    {
      manufacturer: '_TZ3000_*',
      model: 'TS0002',
      name: 'Tuya 2-Gang Switch - BSEED',
      quirks: {
        forceOnOff: true,
        multiEndpoint: true,
        endpoints: {
          1: [0, 3, 4, 5, 6, 0xE000, 0xE001],
          2: [4, 5, 6, 0xE001]
        },
        specialHandling: 'bseed'
      }
    },
    
    {
      manufacturer: '_TZE200_*',
      model: 'TS0601',
      name: 'Tuya DP Device (All)',
      quirks: {
        tuyaDP: true,
        clusters: [CLUSTERS.TUYA_EF00, 0xED00],
        dpMapping: 'auto_detect'
      }
    },
    
    // ========================================================================
    // XIAOMI/LUMI DEVICES
    // ========================================================================
    
    {
      manufacturer: 'LUMI',
      model: 'lumi.sensor_*',
      name: 'Xiaomi Sensor - Keep-Alive',
      quirks: {
        keepAlive: true,
        keepAliveInterval: 3600000, // 1 hour
        postRebootPing: true,
        xiaomiSpecial: true,
        manufacturerCode: 0x115F
      }
    },
    
    {
      manufacturer: 'LUMI',
      model: 'lumi.plug*',
      name: 'Xiaomi Smart Plug',
      quirks: {
        keepAlive: true,
        xiaomiSpecial: true,
        powerReporting: 'xiaomi'
      }
    },
    
    {
      manufacturer: 'LUMI',
      model: 'lumi.ctrl_*',
      name: 'Xiaomi Controller/Switch',
      quirks: {
        keepAlive: true,
        multiEndpoint: true,
        xiaomiSpecial: true
      }
    },
    
    // ========================================================================
    // IKEA DEVICES
    // ========================================================================
    
    {
      manufacturer: 'IKEA*',
      model: 'TRADFRI*',
      name: 'IKEA TRADFRI',
      quirks: {
        otaProvider: 'ikea',
        sceneControl: 'ikea_specific'
      }
    },
    
    // ========================================================================
    // PHILIPS HUE
    // ========================================================================
    
    {
      manufacturer: 'Philips',
      model: 'LW*',
      name: 'Philips Hue White',
      quirks: {
        colorMode: 'white_only',
        transitionTime: 'mandatory'
      }
    },
    
    {
      manufacturer: 'Philips',
      model: 'LLC*',
      name: 'Philips Hue Color',
      quirks: {
        colorMode: 'xy',
        enhancedHue: true
      }
    },
    
    // ========================================================================
    // AQARA DEVICES
    // ========================================================================
    
    {
      manufacturer: 'LUMI',
      model: 'lumi.weather',
      name: 'Aqara Temperature/Humidity/Pressure Sensor',
      quirks: {
        keepAlive: true,
        xiaomiSpecial: true,
        pressureSupport: true,
        attributes: {
          0xFF01: 'xiaomi_struct',
          0x0403: 'pressure'
        }
      }
    },
    
    {
      manufacturer: 'LUMI',
      model: 'lumi.vibration*',
      name: 'Aqara Vibration Sensor',
      quirks: {
        keepAlive: true,
        xiaomiSpecial: true,
        vibrationAlgorithm: 'aqara',
        attributes: {
          0xFF01: 'xiaomi_struct',
          0x0055: 'vibration'
        }
      }
    },
    { manufacturer: 'LUMI', model: 'lumi.motion*', name: 'Aqara Motion',
      quirks: { keepAlive: true, xiaomiSpecial: true, noStandardRejoin: true, occupancyTimeout: 90000 } },
    { manufacturer: 'LUMI', model: 'lumi.magnet*', name: 'Aqara Door/Window',
      quirks: { keepAlive: true, xiaomiSpecial: true, noStandardRejoin: true } },
    { manufacturer: 'LUMI', model: 'lumi.flood*', name: 'Aqara Water Leak',
      quirks: { keepAlive: true, xiaomiSpecial: true, noStandardRejoin: true } },
    { manufacturer: 'Aqara', model: 'lumi.motion.ac02', name: 'Aqara FP2',
      quirks: { occupancyTimeout: 600000, multiZone: true } },

    // === LEGRAND ===
    { manufacturer: 'Legrand', model: '*', name: 'Legrand Generic',
      quirks: { legrandFC01: true, reportingFix: true } },

    // === SCHNEIDER / WISER ===
    { manufacturer: 'Schneider*', model: '*', name: 'Schneider Generic',
      quirks: { meteringDivisorFix: true, reportingFix: true } },

    // === DANFOSS ===
    { manufacturer: 'Danfoss', model: '*', name: 'Danfoss TRV',
      quirks: { forceRouterBind: true, thermostatReporting: true } },
    { manufacturer: 'D5X84YU', model: '*', name: 'Danfoss D5X84YU',
      quirks: { forceRouterBind: true, thermostatReporting: true } },

    // === SONOFF / eWeLink ===
    { manufacturer: 'SONOFF', model: '*', name: 'Sonoff Generic',
      quirks: { reportingFix: true, standardZCL: true } },
    { manufacturer: 'eWeLink', model: '*', name: 'eWeLink Generic',
      quirks: { reportingFix: true, standardZCL: true } },

    // === BOSCH ===
    { manufacturer: 'BOSCH', model: '*', name: 'Bosch Generic',
      quirks: { reportingFix: true } },

    // === NIKO === (Z2M: "NIKO NV")
    { manufacturer: 'Niko*', model: '*', name: 'Niko Generic',
      quirks: { reportingFix: true } },
    { manufacturer: 'NIKO NV', model: '*', name: 'Niko NV',
      quirks: { reportingFix: true } },

    // === LIDL / SILVERCREST (Tuya rebadged) ===
    { manufacturer: '_TZ3000_*', model: 'TS011F', name: 'Lidl Silvercrest Plug',
      quirks: { forceOnOff: true, meteringSupport: true } }
  ];
  
  // ========================================================================
  // QUIRK FINDING
  // ========================================================================
  
  /**
   * Find quirk for device
   */
  static findQuirk(manufacturerName, modelId) {
    if (!manufacturerName || !modelId) return null;
    // Z2M: some devices report names with leading spaces/null bytes (e.g. " Legrand\u0000")
    const mfr = manufacturerName.replace(/\safeDivide(0, g), '').trim();
    const mdl = modelId.replace(/\safeDivide(0, g), '').trim();
    
    return this.QUIRKS.find(q => {
      const manufacturerMatch = this.matchPattern(mfr, q.manufacturer);
      const modelMatch = this.matchPattern(mdl, q.model);
      
      return manufacturerMatch && modelMatch;
    });
  }
  
  /**
   * Match pattern with wildcards
   */
  static matchPattern(value, pattern) {
    if (!pattern) return false;
    
    // Exact match
    if (pattern === value) return true;
    
    // Wildcard at end
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return value.startsWith(prefix);
    }
    
    // Wildcard at start
    if (pattern.startsWith('*')) {
      const suffix = pattern.slice(1);
      return value.endsWith(suffix);
    }
    
    return false;
  }
  
  /**
   * Get all quirks for manufacturer
   */
  static getQuirksByManufacturer(manufacturerName) {
    return this.QUIRKS.filter(q => 
      this.matchPattern(manufacturerName, q.manufacturer)
    );
  }
  
  /**
   * Check if device has specific quirk
   */
  static hasQuirk(manufacturerName, modelId, quirkType) {
    const quirk = this.findQuirk(manufacturerName, modelId);
    return quirk && quirk.quirks[quirkType] === true;
  }
  
  /**
   * Get quirk value
   */
  static getQuirkValue(manufacturerName, modelId, quirkType) {
    const quirk = this.findQuirk(manufacturerName, modelId);
    return quirk ? quirk.quirks[quirkType] : null;
  }
}

module.exports = QuirksDatabase;
