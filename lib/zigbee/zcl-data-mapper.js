'use strict';

/**
 * ZCL Data Mapper - v1.0.0
 *
 * This utility provides standardized functions for converting raw ZCL attribute
 * values into Homey capability values. It handles common cases like temperature
 * and humidity scaling.
 */
const ZclDataMapper = {

  /**
   * Maps raw temperature from ZCL clusters (0x0402).
   * ZCL standard is centi-degrees (value * 100).
   *
   * @param {number} rawValue - The raw value from the cluster.
   * @returns {number|null} The temperature in Celsius, or null if invalid.
   */
  mapTemperatureFromZcl(rawValue) {
    if (typeof rawValue !== 'number') return null;

    // Standard conversion: value / 100
    const temperature = rawValue / 100;

    // Sanity check
    if (temperature < -50 || temperature > 150) {
      return null;
    }

    return Math.round(temperature * 10) / 10;
  },

  /**
   * Maps raw humidity from ZCL clusters (0x0405).
   * ZCL standard is centi-percent (value * 100).
   *
   * @param {number} rawValue - The raw value from the cluster.
   * @returns {number|null} The humidity in %, or null if invalid.
   */
  mapHumidityFromZcl(rawValue) {
    if (typeof rawValue !== 'number') return null;

    // Standard conversion: value / 100
    const humidity = rawValue / 100;

    // Sanity check
    if (humidity < 0 || humidity > 100) {
      return null;
    }

    return Math.round(humidity);
  },

  /**
   * Maps raw illuminance from ZCL clusters (0x0400).
   * ZCL standard is 10000 * log10(lux) + 1.
   *
   * @param {number} rawValue - The raw value from the cluster.
   * @returns {number|null} The illuminance in lux, or null if invalid.
   */
  mapLuminanceFromZcl(rawValue) {
    if (typeof rawValue !== 'number' || rawValue < 1) return null;

    const lux = Math.pow(10, (rawValue - 1) / 10000);
    return Math.round(lux);
  }
};

module.exports = ZclDataMapper;
