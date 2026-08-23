'use strict';

/**
 * Cache Module - Centralized exports for caching infrastructure
 *
 * WHY: Pairing uses mfs_db + fingerprint-matcher; CI HTTP uses smart-fetch.
 * NetworkCache / FingerprintCache remain exported for legacy callers but are
 * deprecated — do not use for new Homey or CI paths (see config/architecture/intelligent-infra.json).
 */

module.exports = {
  SmartCache: require('./SmartCache'),
  /** @deprecated Prefer lib/scraper/smart-fetch.js */
  NetworkCache: require('./NetworkCache'),
  /** @deprecated Prefer mfs_db + lib/utils/fingerprint-matcher.js */
  FingerprintCache: require('./FingerprintCache'),
  canonicalCiHttp: 'lib/scraper/smart-fetch.js',
  deprecated: {
    NetworkCache: 'use smart-fetch',
    FingerprintCache: 'use mfs_db + fingerprint-matcher',
  },
};
