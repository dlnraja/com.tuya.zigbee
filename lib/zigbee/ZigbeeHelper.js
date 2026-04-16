'use strict';

/**
 * Zigbee Helper Utilities
 * Fonctions utilitaires partagées pour tous les drivers Zigbee
 */

class ZigbeeHelper {
  
  /**
   * Parse battery percentage from Zigbee format
   */
  static parseBatteryPercentage(value) {
    if (value === null || value === undefined) return null;
    return Math.round(Math.max(0, Math.min(100, value / 2)));
  }
  
  /**
   * Parse temperature from Zigbee format (centidegrees)
   */
  static parseTemperature(value) {
    if (value === null || value === undefined) return null;
    return Math.round(value / 100 * 10) / 10;
  }
  
  /**
   * Parse humidity from Zigbee format
   */
  static parseHumidity(value) {
    if (value === null || value === undefined) return null;
    return Math.round(value / 100 * 10) / 10;
  }
  
  /**
   * Parse power from Zigbee format
   */
  static parsePower(value) {
    if (value === null || value === undefined) return null;
    return Math.round(value / 10 * 10) / 10;
  }
  
  /**
   * Parse voltage from Zigbee format
   */
  static parseVoltage(value) {
    if (value === null || value === undefined) return null;
    return Math.round(value / 10 * 10) / 10;
  }
  
  /**
   * Parse current from Zigbee format (milliamps)
   */
  static parseCurrent(value) {
    if (value === null || value === undefined) return null;
    return Math.round(value / 1000 * 1000) / 1000;
  }
  
  /**
   * Parse energy from Zigbee format
   */
  static parseEnergy(value) {
    if (value === null || value === undefined) return null;
    return Math.round(value / 1000 * 100) / 100;
  }
  
  /**
   * Parse illuminance from Zigbee format
   */
  static parseIlluminance(value) {
    if (value === null || value === undefined) return null;
    return Math.round(Math.pow(10, (value - 1) / 10000));
  }
  
  /**
   * Debounce function to prevent rapid updates
   */
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  /**
   * Throttle function to limit execution rate
   */
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  /**
   * Convert color temperature Kelvin to Mireds
   */
  static kelvinToMireds(kelvin) {
    return Math.round(1000000 / kelvin);
  }
  
  /**
   * Convert color temperature Mireds to Kelvin
   */
  static miredsToKelvin(mireds) {
    return Math.round(1000000 / mireds);
  }
}

module.exports = ZigbeeHelper;
