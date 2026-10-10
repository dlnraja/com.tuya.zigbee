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
    // forever in require cache). WHY(Athom #3469 AggregateError, 2026-10-10): no require of
    // package.json either. Read only the head of app.json and regex the version (no full load).
    const fs = require('fs');
    const path = require('path');
    let fd = null;
    let head = '';
    try {
      fd = fs.openSync(path.join(__dirname, '..', '..', 'app.json'), 'r');
      const buf = Buffer.alloc(4096);
      const n = fs.readSync(fd, buf, 0, buf.length, 0);
      head = buf.toString('utf8', 0, n);
    } finally {
      if (fd !== null) { try { fs.closeSync(fd); } catch (_) { /* ignore */ } }
    }
    const m = head.match(/"version"\s*:\s*"([^"]+)"/);
    cachedVersion = m ? m[1] : 'unknown';
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
