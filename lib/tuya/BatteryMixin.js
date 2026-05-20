'use strict';

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * UNIVERSAL BATTERY MIXIN (v5.11.206 Hardened)
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * Standardized battery orchestration using UnifiedBatteryHandler.
 * Resolves SDK3 capability conflicts and ensures fault-tolerant reporting.
 */

const UnifiedBatteryHandler = require('../battery/UnifiedBatteryHandler');

const BatteryMixin = (superclass) => class extends superclass {

  async onNodeInit({ zclNode }) {
    if (super.onNodeInit) {await super.onNodeInit({ zclNode });}

    if (!this.batteryHandler) {
      this.batteryHandler = new UnifiedBatteryHandler(this);
      
      // Initialize with _safeInvoke for maximum resilience
      if (this._safeInvoke) {
        await this._safeInvoke(async () => {
          await this.batteryHandler.initialize(zclNode);
        }, 'batteryHandlerInit');
      } else {
        await this.batteryHandler.initialize(zclNode).catch(err => {
          this.log(`[BatteryMixin] ⚠️ Initialization failed: ${err.message}`);
        });
      }
    }
  }

  /**
   * Helper to get current battery percentage
   */
  getBatteryPercentage() {
    return this.batteryHandler ? this.batteryHandler.getValue() : null;
  }

  /**
   * Helper to get current battery voltage
   */
  getBatteryVoltage() {
    return this.batteryHandler ? this.batteryHandler.getVoltage() : null;
  }
};

module.exports = BatteryMixin;
