'use strict';

/**
 * Dynamic Auto-Adaptive System - v5.3.59
 *
 * FULL intelligent self-adapting system for Tuya devices.
 *
 * Components:
 * - DynamicCapabilityManager: Auto-discovers capabilities from DPs
 * - DynamicFlowCardManager: Auto-creates flow cards for capabilities
 * - DynamicEnergyManager: Smart energy monitoring (power, voltage, current)
 * - SmartFlowManager: Intelligent real-time flow triggering
 * - AutoAdaptiveDevice: Base device class with ALL features
 *
 * Features:
 * - Auto-discovery of capabilities from Tuya DPs
 * - Dynamic flow card creation
 * - Smart energy tracking with thresholds
 * - Real-time flow triggers (value change, thresholds, patterns)
 * - Historical data tracking
 * - Rate-of-change detection
 * - Persistent discoveries
 *
 * Usage:
 * ```
 * const { AutoAdaptiveDevice } = require('../../lib/dynamic');
 *
 * class MyDevice extends AutoAdaptiveDevice {
 *   async onNodeInit({ zclNode }) {
 *     await super.onNodeInit({ zclNode });
 *     // Device now has FULL auto-adaptive system!
 *     // - Capabilities auto-discovered
 *     // - Flow cards auto-created
 *     // - Energy monitored
 *     // - Smart triggers active
 *   }
 * }
 * ```
 */

const DynamicCapabilityManager = require('./DynamicCapabilityManager');
const DynamicFlowCardManager = require('./DynamicFlowCardManager');
const DynamicEnergyManager = require('./DynamicEnergyManager');
const SmartFlowManager = require('./SmartFlowManager');
const AutoAdaptiveDevice = require('./AutoAdaptiveDevice');

module.exports = {
  DynamicCapabilityManager,
  DynamicFlowCardManager,
  DynamicEnergyManager,
  SmartFlowManager,
  AutoAdaptiveDevice
};
