'use strict';

/**
 * Battery Management Index — P54 cleaned
 *
 * Centralized exports for active battery-related utilities.
 *
 * P54 cleanup: removed re-exports of 14 dead files (0 importers).
 * See docs/BATTERY_AUDIT.md for the full P54 plan.
 */

module.exports = {
  // Core Battery System (active)
  BatteryManager: require('./BatteryManager'),
  BatteryHybridManager: require('./BatteryHybridManager'),
  UnifiedBatteryHandler: require('./UnifiedBatteryHandler'),

  // Utilities (active)
  BatteryCalculator: require('./BatteryCalculator'),
  // BatteryCurveFallback is at lib/utils/BatteryCurveFallback.js (re-exported here)
  BatteryCurveFallback: require('../utils/BatteryCurveFallback'),

  // P54: SDK3 compat engine
  BatteryMasterEngine: require('./BatteryMasterEngine'),
};
