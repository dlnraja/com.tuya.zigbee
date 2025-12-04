'use strict';

/**
 * Dynamic Auto-Adaptive System - v5.3.57
 *
 * This module provides automatic capability and flow card
 * discovery and creation for Tuya devices.
 *
 * Components:
 * - DynamicCapabilityManager: Auto-discovers capabilities from DPs
 * - DynamicFlowCardManager: Auto-creates flow cards for capabilities
 * - AutoAdaptiveDevice: Base device class with auto-adaptation
 *
 * Usage:
 *
 * Option 1: Use AutoAdaptiveDevice as base class
 * ```
 * const { AutoAdaptiveDevice } = require('../../lib/dynamic');
 *
 * class MyDevice extends AutoAdaptiveDevice {
 *   async onNodeInit({ zclNode }) {
 *     await super.onNodeInit({ zclNode });
 *     // Device now auto-discovers and adapts!
 *   }
 * }
 * ```
 *
 * Option 2: Use managers separately
 * ```
 * const { DynamicCapabilityManager, DynamicFlowCardManager } = require('../../lib/dynamic');
 *
 * class MyDevice extends ZigBeeDevice {
 *   async onNodeInit({ zclNode }) {
 *     this.capManager = new DynamicCapabilityManager(this);
 *     this.flowManager = new DynamicFlowCardManager(this);
 *
 *     await this.capManager.initialize();
 *     await this.flowManager.initialize();
 *
 *     // Connect them
 *     this.capManager.on('capabilityDiscovered', (data) => {
 *       this.flowManager.onCapabilityDiscovered(data);
 *     });
 *   }
 * }
 * ```
 */

const DynamicCapabilityManager = require('./DynamicCapabilityManager');
const DynamicFlowCardManager = require('./DynamicFlowCardManager');
const AutoAdaptiveDevice = require('./AutoAdaptiveDevice');

module.exports = {
  DynamicCapabilityManager,
  DynamicFlowCardManager,
  AutoAdaptiveDevice
};
