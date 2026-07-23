'use strict';

/**
 * Util.js - Universal Permissive Utilities
 *
 * As of v10.0.0 (P82, 2026-07-23), this module is a BACKWARD-COMPAT
 * shim that delegates to lib/utils/TuyaNormalizer.js (the ULTIMATE
 * single source of truth). All existing imports keep working; new code
 * should use TuyaNormalizer directly.
 *
 * v5.5.700 was the legacy implementation. v10.0.0 = ULTIMATE.
 *
 * Chronology:
 *  - 2026-07-05: v1 simple toLowerCase + trim (v5.5.688)
 *  - 2026-07-05: v2 added normalized find/findBestDriver (v5.5.700)
 *  - 2026-07-23: v10.0.0 ULTIMATE - NFKD + accents + emojis + multi-PID
 *    + variants + scoring + gamification (P82)
 *
 * @version 10.0.0
 */

const fs = require('fs');
const path = require('path');
const TU = require('./utils/TuyaNormalizer'); // The ULTIMATE single source of truth

// ═══════════════════════════════════════════════════════════════════════════
// CORE NORMALIZATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalize any string for comparison (lowercase + trim)
 * @param {string} str - String to normalize
 * @returns {string} - Normalized string
 */
function normalize(str) {
  return TU.normalize(str);
}

/**
 * Normalize Tuya ID specifically (manufacturerName/productId)
 * Transforms _TZ3000_ABC to _tz3000_abc
 * @param {string} id - Tuya ID to normalize
 * @returns {string} - Normalized ID
 */
function normalizeTuyaID(id) {
  return TU.normalizeTuyaID(id);
}

/**
 * Compare two strings ignoring case and whitespace
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {boolean} - True if equal (case-insensitive)
 */
function equalsIgnoreCase(str1, str2) {
  if (str1 === null || str1 === undefined || str2 === null || str2 === undefined) {
    return false;
  }
  return normalize(str1) === normalize(str2);
}

/**
 * Check if string starts with prefix (case-insensitive)
 * @param {string} str - String to check
 * @param {string} prefix - Prefix to match
 * @returns {boolean}
 */
function startsWithIgnoreCase(str, prefix) {
  if (!str || !prefix) {return false;}
  return normalize(str).startsWith(normalize(prefix));
}

/**
 * Check if string ends with suffix (case-insensitive)
 * @param {string} str - String to check
 * @param {string} suffix - Suffix to match
 * @returns {boolean}
 */
function endsWithIgnoreCase(str, suffix) {
  if (!str || !suffix) {return false;}
  return normalize(str).endsWith(normalize(suffix));
}

/**
 * Check if string contains substring (case-insensitive)
 * @param {string} str - String to check
 * @param {string} substring - Substring to find
 * @returns {boolean}
 */
function containsIgnoreCase(str, substring) {
  if (!str || !substring) {return false;}
  return normalize(str).includes(normalize(substring));
}

// ═══════════════════════════════════════════════════════════════════════════
// OBJECT/ARRAY HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find a key in object ignoring case (e.g., finds "onoff" even if key is "onOff")
 * @param {Object} object - Object to search
 * @param {string} key - Key to find
 * @returns {*} - Value if found, null otherwise
 */
function getValueInsensitive(object, key) {
  if (!object || typeof object !== 'object' || !key) {return null;}
  const normalizedKey = normalize(key);
  const foundKey = Object.keys(object).find(k => normalize(k) === normalizedKey);
  return foundKey ? object[foundKey] : null;
}

/**
 * Check if array includes value (case-insensitive)
 * @param {Array<string>} array - Array to search
 * @param {string} value - Value to find
 * @returns {boolean}
 */
function includesIgnoreCase(array, value) {
  if (!Array.isArray(array) || !value) {return false;}
  const normalizedValue = normalize(value);
  return array.some(item => normalize(item) === normalizedValue);
}

/**
 * Find matching item in array (case-insensitive)
 * @param {Array<string>} array - Array to search
 * @param {string} value - Value to find
 * @returns {string|undefined} - The matching item or undefined
 */
function findIgnoreCase(array, value) {
  if (!Array.isArray(array) || !value) {return undefined;}
  const normalizedValue = normalize(value);
  return array.find(item => normalize(item) === normalizedValue);
}

/**
 * Filter array to items matching value (case-insensitive)
 * @param {Array<string>} array - Array to filter
 * @param {string} value - Value to match
 * @returns {Array<string>} - Matching items
 */
function filterIgnoreCase(array, value) {
  if (!Array.isArray(array) || !value) {return [];}
  const normalizedValue = normalize(value);
  return array.filter(item => normalize(item) === normalizedValue);
}

// ═══════════════════════════════════════════════════════════════════════════
// TUYA-SPECIFIC MATCHING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if manufacturerName matches any in list (case-insensitive)
 * @param {string} manufacturerName - Device manufacturerName
 * @param {Array<string>} list - List of manufacturerNames to match
 * @returns {boolean}
 */
function matchesManufacturer(manufacturerName, list) {
  return includesIgnoreCase(list, manufacturerName);
}

/**
 * Check if manufacturerName starts with any prefix (case-insensitive)
 * @param {string} manufacturerName - Device manufacturerName
 * @param {Array<string>} prefixes - List of prefixes to match
 * @returns {boolean}
 */
function matchesManufacturerPrefix(manufacturerName, prefixes) {
  if (!manufacturerName || !Array.isArray(prefixes)) {return false;}
  const normalizedMfr = normalize(manufacturerName);
  return prefixes.some(prefix => normalizedMfr.startsWith(normalize(prefix)));
}

/**
 * Check if productId matches any in list (case-insensitive)
 * @param {string} productId - Device productId
 * @param {Array<string>} list - List of productIds to match
 * @returns {boolean}
 */
function matchesProductId(productId, list) {
  return includesIgnoreCase(list, productId);
}

/**
 * Find matching manufacturerName in list (returns original case from list)
 * @param {string} manufacturerName - Device manufacturerName to match
 * @param {Array<string>} list - List of manufacturerNames
 * @returns {string|undefined} - Matching item from list or undefined
 */
function findMatchingManufacturer(manufacturerName, list) {
  return findIgnoreCase(list, manufacturerName);
}

// ═══════════════════════════════════════════════════════════════════════════
// FLOW CARD HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse boolean-like value from flow card argument (case-insensitive)
 * Accepts: "on", "ON", "true", "TRUE", "1", true, 1
 * @param {*} value - Value to parse
 * @returns {boolean|null} - Boolean or null if not parseable
 */
function parseFlowBoolean(value) {
  if (typeof value === 'boolean') {return value;}
  if (typeof value === 'number') {return value !== 0;}
  
  const normalized = normalize(value);
  if (['on', 'true', '1', 'yes', 'oui', 'aan', 'ein', 'ja'].includes(normalized)) {
    return true;
  }
  if (['off', 'false', '0', 'no', 'non', 'uit', 'aus', 'nein'].includes(normalized)) {
    return false;
  }
  return null;
}

/**
 * Normalize flow card action state (for on/off commands)
 * @param {*} value - Value from flow card
 * @returns {string} - 'on' or 'off' or original if not boolean
 */
function normalizeFlowState(value) {
  const boolValue = parseFlowBoolean(value);
  if (boolValue === true) {return 'on';}
  if (boolValue === false) {return 'off';}
  return normalize(value);
}

// ═══════════════════════════════════════════════════════════════════════════
// SAFE FILE LOADER (Case-Insensitive require)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Load a JS file from directory even if case doesn't match exactly
 * Linux filesystems are case-sensitive, so require('./MyFile') fails if file is 'myfile.js'
 * This function searches for the file case-insensitively
 * 
 * @param {string} dirPath - Directory path
 * @param {string} fileName - File name to load (with or without .js)
 * @returns {*} - Required module or null if not found
 */
function requirePermissive(dirPath, fileName) {
  try {
    // Normalize the filename (remove .js if present, we'll add it back)
    let searchName = fileName;
    if (searchName.endsWith('.js')) {
      searchName = searchName.slice(0, -3);
    }
    const searchNameLower = searchName.toLowerCase();

    // List all files in directory
    const files = fs.readdirSync(dirPath);
    
    // Find matching file (case-insensitive)
    const foundFile = files.find(file => {
      const fileNameOnly = file.endsWith('.js') ? file.slice(0, -3) : file;
      return fileNameOnly.toLowerCase() === searchNameLower;
    });

    if (foundFile) {
      const fullPath = path.join(dirPath, foundFile);
      return require(fullPath);
    } else {
// console.error(`[Util.requirePermissive] File not found: ${fileName} in ${dirPath}`);
      return null;
    }
  } catch (err) {
// console.error(`[Util.requirePermissive] Error loading ${fileName}:`, err.message);
    return null;
  }
}

/**
 * Check if a file exists in directory (case-insensitive)
 * @param {string} dirPath - Directory path
 * @param {string} fileName - File name to check
 * @returns {string|null} - Actual filename if found, null otherwise
 */
function findFilePermissive(dirPath, fileName) {
  try {
    const searchNameLower = fileName.toLowerCase();
    const files = fs.readdirSync(dirPath);
    return files.find(file => file.toLowerCase() === searchNameLower) || null;
  } catch (err) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAIRING HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a device matches driver's supported devices (case-insensitive)
 * @param {Object} device - Zigbee device with manufacturerName and productId
 * @param {Object} manifest - Driver manifest with zigbee config
 * @returns {boolean}
 */
function deviceMatchesDriver(device, manifest) {
  if (!device || !manifest) {return false;}
  
  const deviceMfr = normalizeTuyaID(device.manufacturerName);
  const deviceProduct = normalizeTuyaID(device.productId || device.modelId);
  
  // Check manufacturerName match
  const supportedMfrs = manifest.zigbee?.manufacturerName || [];
  const mfrMatch = supportedMfrs.some(mfr => normalizeTuyaID(mfr) === deviceMfr);
  
  // Check productId match (if specified in manifest)
  const supportedProducts = manifest.zigbee?.productId || [];
  const productMatch = supportedProducts.length === 0 || 
                       supportedProducts.some(pid => normalizeTuyaID(pid) === deviceProduct);
  
  return mfrMatch && productMatch;
}

/**
 * Find best matching driver for a device (case-insensitive)
 * @param {Object} device - Zigbee device
 * @param {Array<Object>} drivers - Array of driver manifests
 * @returns {Object|null} - Best matching driver or null
 */
function findBestDriver(device, drivers) {
  if (!device || !Array.isArray(drivers)) {return null;}
  
  const deviceMfr = normalizeTuyaID(device.manufacturerName);
  const deviceProduct = normalizeTuyaID(device.productId || device.modelId);
  
  // First try: exact manufacturerName + productId match
  for (const driver of drivers) {
    const supportedMfrs = driver.zigbee?.manufacturerName || [];
    const supportedProducts = driver.zigbee?.productId || [];
    
    const mfrMatch = supportedMfrs.some(mfr => normalizeTuyaID(mfr) === deviceMfr);
    const productMatch = supportedProducts.some(pid => normalizeTuyaID(pid) === deviceProduct);
    
    if (mfrMatch && productMatch) {
      return driver;
    }
  }
  
  // Second try: manufacturerName only match
  for (const driver of drivers) {
    const supportedMfrs = driver.zigbee?.manufacturerName || [];
    const mfrMatch = supportedMfrs.some(mfr => normalizeTuyaID(mfr) === deviceMfr);
    
    if (mfrMatch) {
      return driver;
    }
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // Core normalization
  normalize,
  normalizeTuyaID,
  
  // String comparison
  equalsIgnoreCase,
  startsWithIgnoreCase,
  endsWithIgnoreCase,
  containsIgnoreCase,
  
  // Object/Array helpers
  getValueInsensitive,
  includesIgnoreCase,
  findIgnoreCase,
  filterIgnoreCase,
  
  // Tuya-specific matching
  matchesManufacturer,
  matchesManufacturerPrefix,
  matchesProductId,
  findMatchingManufacturer,
  
  // Flow card helpers
  parseFlowBoolean,
  normalizeFlowState,
  
  // Safe file loading
  requirePermissive,
  findFilePermissive,
  
  // Pairing helpers
  deviceMatchesDriver,
  findBestDriver
};
