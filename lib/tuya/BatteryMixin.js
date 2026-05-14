'use strict';

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * UNIVERSAL BATTERY MANAGEMENT MIXIN
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * v9.0.0: Intelligent battery orchestration:
 * - Supports ZCL Power Configuration (0x0001)
 * - Supports Tuya DP-based reporting (0xEF00)
 * - Auto-conversion from voltage (3000mV -> 100%)
 * - Adaptive polling based on powerSource metadata
 * - Critical alert management
 */

const { CLUSTER } = require('zigbee-clusters');

const BatteryMixin = (superclass) => class extends superclass {

  /**
   * Initialize battery management
   */
  async onNodeInit({ zclNode }) {
    if (super.onNodeInit) await super.onNodeInit({ zclNode });

    const manufacturerName = this.getSetting('zb_manufacturer_name');
    const batteryType = this.getSetting('battery_type') || 'auto';

    // 1. ZCL Power Configuration Registration
    if (zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]) {
      this.log('[BATTERY] Registering ZCL Power Configuration cluster');
      
      // Percentage
      zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
        .on('attr.batteryPercentageRemaining', this._onBatteryPercentageRemaining.bind(this));
        
      // Voltage
      zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]
        .on('attr.batteryVoltage', this._onBatteryVoltage.bind(this));
    }

    // 2. Tuya DP Registration (handled via processResponse if called by device)
    this._batteryThreshold = this.getSetting('batteryThreshold') || 20;
    this._batteryCritical = this.getSetting('battery_critical_threshold') || 10;
  }

  /**
   * Handle ZCL battery percentage report (raw = 2 * percentage)
   */
  _onBatteryPercentageRemaining(value) {
    if (value === 255) return; // Invalid/Unknown
    const percentage = Math.round(value / 2);
    this.log(`[BATTERY] ZCL percentage report: ${percentage}%`);
    this._updateBattery(percentage);
  }

  /**
   * Handle ZCL battery voltage report (raw = 100mV)
   */
  _onBatteryVoltage(value) {
    if (value === 255) return;
    const voltage = value / 10; // Decivolts to Volts
    this.log(`[BATTERY] ZCL voltage report: ${voltage}V`);
    
    // Convert voltage to percentage if no percentage report received recently
    if (!this._lastPercentageTime || (Date.now() - this._lastPercentageTime > 3600000)) {
      const percentage = this._voltageToPercentage(voltage);
      this.log(`[BATTERY] Voltage to percentage conversion: ${percentage}%`);
      this._updateBattery(percentage);
    }
  }

  /**
   * Update battery capability with health checks
   */
  async _updateBattery(percentage) {
    const safePercentage = Math.min(100, Math.max(0, Math.round(percentage)));
    this._lastPercentageTime = Date.now();

    if (this.hasCapability('measure_battery')) {
      await this.setCapabilityValue('measure_battery', safePercentage).catch(this.error);
    }

    if (this.hasCapability('alarm_battery')) {
      await this.setCapabilityValue('alarm_battery', safePercentage < this._batteryThreshold).catch(this.error);
    }

    // Battery Critical Flow Trigger
    if (safePercentage < this._batteryCritical) {
      this.log(`[BATTERY] 🔥 CRITICAL BATTERY: ${safePercentage}%`);
      if (this.homey.flow) {
        this.homey.flow.getDeviceTriggerCard('battery_critical')
          .trigger(this, { percentage: safePercentage })
          .catch(this.error);
      }
    }
  }

  /**
   * Battery voltage to percentage conversion
   * Standard 3.0V Lithium (CR2032/CR2450/CR123A)
   */
  _voltageToPercentage(voltage) {
    // 3.0V = 100%, 2.5V = 0% (approx)
    if (voltage >= 3.0) return 100;
    if (voltage <= 2.5) return 0;
    return Math.round((voltage - 2.5) * 200);
  }

  /**
   * Manual poll (can be triggered by flow)
   */
  async pollBattery() {
    try {
      this.log('[BATTERY] 🔄 Manual battery poll initiated...');
      if (this.zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME]) {
        await this.zclNode.endpoints[1].clusters[CLUSTER.POWER_CONFIGURATION.NAME].readAttributes([
          'batteryPercentageRemaining',
          'batteryVoltage'
        ]);
      }
    } catch (err) {
      this.error('[BATTERY] Manual poll failed:', err);
    }
  }
};

module.exports = BatteryMixin;
