// lib/drivers/DynamicDriverMatcher.js
const ManufacturerResolver = require('../utils/manufacturerResolver');

class DynamicDriverMatcher {
  constructor() {
    this.fingerprintIndex = new Map(); // Index O(1) pour le lookup rapide
    this.manufacturerMapping = this._loadManufacturerMapping();
  }

  /**
   * Trouve un driver correspondant à un device découvert
   * @param {Object} deviceInfo - Informations du device Zigbee
   * @returns {Driver|null} Driver correspondant ou null
   */
  findDriver(deviceInfo) {
    if (!deviceInfo) {return null;}
    
    // 1. Normaliser le manufacturerName (Rule 24)
    const rawManufacturer = deviceInfo.manufacturerName || '';
    const normalizedManufacturer = ManufacturerResolver.normalize(rawManufacturer);
    const canonicalManufacturer = ManufacturerResolver.resolve(
      rawManufacturer,
      this.manufacturerMapping
    );

    // 2. Normaliser le modelId
    const rawModelId = deviceInfo.modelId || '';
    const normalizedModelId = this._normalizeDeviceId(rawModelId);

    // 3. Recherche dans l'index avec combinaisons possibles
    const candidates = [
      `${canonicalManufacturer}:${normalizedModelId}`,
      `${normalizedManufacturer}:${normalizedModelId}`,
      `*:${normalizedModelId}`,  // Wildcard manufacturer
      `${canonicalManufacturer}:*`,  // Wildcard modelId
    ];

    for (const key of candidates) {
      const driver = this.fingerprintIndex.get(key);
      if (driver) {
        this.log('Driver matched', { 
          manufacturer: rawManufacturer, 
          modelId: rawModelId,
          matchedKey: key 
        });
        return driver;
      }
    }

    // 4. Fallback : recherche floue si aucun match exact
    return this._fuzzyMatch(deviceInfo);
  }

  /**
   * Normalise un device ID (insensible à la casse, formats multiples)
   * @private
   */
  _normalizeDeviceId(deviceId) {
    if (!deviceId) {return null;}
    return deviceId
      .trim()
      .toLowerCase()
      .replace(/[-_\s]+/g, '')  // Supprime séparateurs
      .replace(/^0x/i, '');     // Supprime préfixe hex
  }

  /**
   * Charge le mapping des fabricants depuis data/manufacturers.json
   * @private
   */
  _loadManufacturerMapping() {
    try {
      const manufacturersData = require('../../data/manufacturers.json');
      return ManufacturerResolver.buildMapping(manufacturersData.mapping_rules || []);
    } catch (error) {
      this.log('Failed to load manufacturer mapping', error.message);
      return {};
    }
  }

  /**
   * Construit l'index de fingerprints pour une recherche O(1)
   * @param {Array} drivers - Liste des drivers avec leurs fingerprints
   */
  buildIndex(drivers) {
    if (!drivers || !Array.isArray(drivers)) {return;}
    for (const driver of drivers) {
      // Index par combinaison manufacturer:modelId normalisés
      for (const fp of driver.fingerprints || []) {
        if (!fp || !fp.modelId) {continue;}
        const mfr = ManufacturerResolver.normalize(fp.manufacturer || '*');
        const model = this._normalizeDeviceId(fp.modelId);
        
        const key = `${mfr}:${model}`.toLowerCase();
        this.fingerprintIndex.set(key, driver);
        
        // Index alternatif avec wildcards pour matching flexible
        this.fingerprintIndex.set(`*:${model}`, driver);
        if (mfr !== '*') {
          this.fingerprintIndex.set(`${mfr}:*`, driver);
        }
      }
    }
  }

  /**
   * Recherche floue (fallback) si aucun match exact n'est trouvé
   * @private
   */
  _fuzzyMatch(deviceInfo) {
    this.log('_fuzzyMatch not implemented yet', deviceInfo);
    return null;
  }

  // Failsafe log helper
  log(...args) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[DynamicDriverMatcher]', ...args);
    }
  }
}

module.exports = DynamicDriverMatcher;
