// lib/drivers/DynamicDriverMatcher.js
// Matching O(1) des drivers avec indexation et Rule 24
'use strict';

const ManufacturerResolver = require('../utils/manufacturerResolver');

/**
 * DynamicDriverMatcher - Performance Optimization (PF-04)
 * Remplace la recherche linéaire O(n) par un index O(1)
 */
class DynamicDriverMatcher {
  constructor() {
    this.fingerprintIndex = new Map();
    this.manufacturerMapping = this._loadManufacturerMapping();
  }

  /**
   * Trouve un driver correspondant à un device découvert
   * @param {Object} deviceInfo - Informations du device Zigbee
   * @returns {Driver|null} Driver correspondant ou null
   */
  findDriver(deviceInfo) {
    const rawManufacturer = deviceInfo.manufacturerName;
    const normalizedManufacturer = ManufacturerResolver.normalize(rawManufacturer);
    const canonicalManufacturer = ManufacturerResolver.resolve(
      rawManufacturer,
      this.manufacturerMapping
    );

    const rawModelId = deviceInfo.modelId;
    const normalizedModelId = this._normalizeDeviceId(rawModelId);

    const candidates = [
      `${canonicalManufacturer}:${normalizedModelId}`,
      `${normalizedManufacturer}:${normalizedModelId}`,
      `*:${normalizedModelId}`,
      `${canonicalManufacturer}:*`,
    ];

    for (const key of candidates) {
      const driver = this.fingerprintIndex.get(key);
      if (driver) {
        this.log('Driver matched', { manufacturer: rawManufacturer, modelId: rawModelId, matchedKey: key });
        return driver;
      }
    }

    return this._fuzzyMatch(deviceInfo);
  }

  _normalizeDeviceId(deviceId) {
    if (!deviceId) return null;
    return deviceId.trim().toLowerCase().replace(/[-_\s]+/g, '').replace(/^0x/i, '');
  }

  _loadManufacturerMapping() {
    try {
      const manufacturersData = require('../../data/manufacturers.json');
      return ManufacturerResolver.buildMapping(manufacturersData.mapping_rules || []);
    } catch (error) {
      this.log('Failed to load manufacturer mapping', error.message);
      return {};
    }
  }

  buildIndex(drivers) {
    for (const driver of drivers) {
      for (const fp of driver.fingerprints || []) {
        const key = `${fp.manufacturer}:${fp.modelId}`.toLowerCase();
        this.fingerprintIndex.set(key, driver);
        this.fingerprintIndex.set(`*:${fp.modelId}`, driver);
        this.fingerprintIndex.set(`${fp.manufacturer}:*`, driver);
      }
    }
  }

  _fuzzyMatch(deviceInfo) {
    this.log('Fuzzy match fallback for', deviceInfo);
    return null;
  }

  log(message, data) {
    console.log(`[DynamicDriverMatcher] ${message}`, data || '');
  }
}

module.exports = DynamicDriverMatcher;
