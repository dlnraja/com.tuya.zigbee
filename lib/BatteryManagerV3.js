'use strict';
/**
 * @deprecated P54 — This file has 0 importers and is scheduled for removal.
 * Its functionality has been consolidated into UnifiedBatteryHandler.js.
 * See docs/BATTERY_AUDIT.md for the full P54 plan.
 * Removal is safe: search the codebase for any imports of this file first.
 */

/**
 * BatteryManagerV3 shim
 *
 * Backward compatibility for drivers that still import:
 *   const BatteryManagerV3 = require('../../lib/BatteryManagerV3');
 *
 * Delegates all functionality to BatteryManagerV4.
 */

const BatteryManagerV4 = require('./BatteryManagerV4');

class BatteryManagerV3 extends BatteryManagerV4 {
  constructor(options) {
    super(options);
  }
}

module.exports = BatteryManagerV3;
