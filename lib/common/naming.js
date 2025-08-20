'use strict';

/**
 * Naming utilities for consistent naming conventions
 */

/**
 * Normalize a string to kebab-case
 */
function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '-').replace(/[\s_]+/g, '-').toLowerCase();
}

/**
 * Generate driver ID from device type
 */
function generateDriverId(type) {
  const typeMap = {
    'plug': 'plug-tuya-universal',
    'trv': 'climate-trv-tuya',
    'curtain': 'cover-curtain-tuya',
    'remote': 'remote-scene-tuya'
  };
  return typeMap[type] || `${type}-tuya-universal`;
}

/**
 * Validate driver naming convention
 */
function validateDriverNaming(driverId) {
  const validPattern = /^[a-z]+(-[a-z]+)*$/;
  const noTsPattern = /ts[0-9a-f]{4}/i;
  return validPattern.test(driverId) && !noTsPattern.test(driverId);
}

module.exports = { toKebabCase, generateDriverId, validateDriverNaming };
