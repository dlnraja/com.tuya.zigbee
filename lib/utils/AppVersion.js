'use strict';

/**
 * AppVersion - v5.5.76
 *
 * Utility to get the current app version from app.json
 * This ensures all version banners stay synchronized with the actual version.
 */

let cachedVersion = null;

/**
 * Get the current app version from app.json
 * @returns {string} Version string (e.g., "5.5.76")
 */
function getAppVersion() {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    // Try to load from app.json
    const appJson = require('../../app.json');
    cachedVersion = appJson.version || 'unknown';
    return cachedVersion;
  } catch (e) {
    // Fallback if app.json not found
    return 'unknown';
  }
}

/**
 * Get version with 'v' prefix
 * @returns {string} Version string with prefix (e.g., "v5.5.76")
 */
function getAppVersionPrefixed() {
  const version = getAppVersion();
  return version.startsWith('v') ? version : `v${version}`;
}

/**
 * Clear the cached version (useful for testing)
 */
function clearVersionCache() {
  cachedVersion = null;
}

module.exports = {
  getAppVersion,
  getAppVersionPrefixed,
  clearVersionCache,
};
