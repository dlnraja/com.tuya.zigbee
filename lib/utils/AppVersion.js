'use strict';

/**
 * AppVersion - Dynamic Version Utility
 *
 * Utility to get the current app version from app.json
 * This ensures all version banners stay synchronized with the actual version.
 * NOTE: Version is read dynamically from app.json - DO NOT hardcode versions here!
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
    // WHY(OOM diag c05db40d, 9.0.1330): never require app.json (multi-MB manifest, kept
    // forever in require cache). package.json carries the same version (gate M08) and is tiny.
    const appJson = require('../../package.json');
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
