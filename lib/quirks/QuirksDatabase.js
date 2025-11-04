'use strict';

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
        clusters: [0xEF00, 0xED00],
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
    }
  ];
  
  // ========================================================================
  // QUIRK FINDING
  // ========================================================================
  
  /**
   * Find quirk for device
   */
  static findQuirk(manufacturerName, modelId) {
    if (!manufacturerName || !modelId) return null;
    
    return this.QUIRKS.find(q => {
      const manufacturerMatch = this.matchPattern(manufacturerName, q.manufacturer);
      const modelMatch = this.matchPattern(modelId, q.model);
      
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
