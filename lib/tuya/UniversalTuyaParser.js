'use strict';

/**
 * QUARANTINED (P2269) — UniversalTuyaParser was dead (no live requires).
 * Canonical parsers: lib/utils/data/* + TuyaEF00Manager + SmartDivisorManager.
 * Legacy source moved to: lib/tuya/_quarantine/UniversalTuyaParser.legacy.js
 * TIP HUM: docs/architecture/PARSER_SSOT.md
 */

function dead() {
  throw new Error(
    'UniversalTuyaParser is quarantined (P2269). Use lib/utils/data/* or TuyaEF00Manager.',
  );
}

module.exports = new Proxy({}, {
  get() { return dead; },
  apply() { return dead(); },
});
