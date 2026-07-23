'use strict';

/**
 * CaseInsensitiveMatcher v10.0.0 - BACKWARD-COMPAT SHIM
 *
 * As of v10.0.0 (P82, 2026-07-23), this module is a backward-compat
 * shim that delegates to lib/utils/TuyaNormalizer.js (the ULTIMATE
 * single source of truth).
 *
 * @version 10.0.0
 * @deprecated Import from 'lib/utils/TuyaNormalizer' directly
 */

const TU = require('./TuyaNormalizer');

module.exports = {
  VERSION: TU.VERSION,
  normalize: TU.normalize,
  includesCI: TU.includesCI,
  startsWithCI: TU.startsWithCI,
  endsWithCI: TU.endsWithCI,
  containsCI: TU.containsCI,
  equalsCI: TU.equalsIgnoreCase,
  findCI: TU.findCI,
  matchesManufacturer: TU.matchesManufacturer,
  matchesManufacturerPrefix: TU.matchesManufacturerPrefix,
  matchesProductId: TU.matchesProductId,
  normalizeArray: TU.normalizeArray
};
