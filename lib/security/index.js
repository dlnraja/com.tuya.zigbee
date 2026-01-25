'use strict';

/**
 * Security Module Index - v5.5.797
 * 
 * Re-exports security-related managers from their actual locations
 * Using lazy loading to avoid circular dependencies
 */

module.exports = {
  // Lazy load to avoid circular dependencies
  get IASZoneManager() { return require('../managers/IASZoneManager'); },
  get IASZoneEnhanced() { return require('../managers/IASZoneEnhanced'); },
  get IEEEAddressManager() { return require('../managers/IEEEAddressManager'); }
};
