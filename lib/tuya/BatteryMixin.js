'use strict';

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * UNIVERSAL BATTERY MIXIN (v5.11.206 Hardened)
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * Standardized battery orchestration using BatteryHybridManager.
 * Resolves SDK3 capability conflicts and ensures fault-tolerant reporting.
 */

const BatteryHybridManager = require('../battery/BatteryHybridManager');

const BatteryMixin = (superclass) => class extends superclass {

  async onNodeInit({ zclNode }) {
    if (super.onNodeInit) {await super.onNodeInit({ zclNode });}

    if (!this.batteryHandler) {
      this.log('[BATTERY] 🔋 Setting up BatteryHybridManager...');
      const settings = this.getSettings?.() || {};
      const store = this.getStore?.() || {};
      const manufacturerName = settings.zb_manufacturer_name || settings.zb_manufacturerName || store.manufacturerName || '';
      const productId = settings.zb_model_id || settings.zb_productId || store.productId || '';
      
      this.batteryHandler = new BatteryHybridManager(this);
      
      // Initialize with _safeInvoke for maximum resilience
      if (this._safeInvoke) {
        await this._safeInvoke(async () => {
          await this.batteryHandler.initialize(manufacturerName, productId);
        }, 'batteryHandlerInit');
      } else {
        await this.batteryHandler.initialize(manufacturerName, productId).catch(err => {
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
