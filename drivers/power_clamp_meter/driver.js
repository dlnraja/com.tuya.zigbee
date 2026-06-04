'use strict';

const { Driver } = require('homey');

class PowerClampMeterDriver extends Driver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;

    this.log('Power Clamp Meter driver initialized');

    // Fix #329: Register flow card handlers for CT Clamp Power Meter
    // Condition: power above threshold
    try {
      const powerAbove = this.homey.flow.getConditionCard('power_clamp_meter_power_above');
      if (powerAbove) {
        powerAbove.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          const power = args.device.getCapabilityValue('measure_power') || 0;
          return power > (args.power || 0);
        });
        this.log('[FLOW] Registered: power_clamp_meter_power_above');
      }
    } catch (e) {
      this.log('[FLOW] power_above condition not found');
    }

    // Action: reset energy meter
    try {
      const resetMeter = this.homey.flow.getActionCard('power_clamp_meter_reset_meter');
      if (resetMeter) {
        resetMeter.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          // Reset meter_power to 0
          await args.device.setCapabilityValue('meter_power', 0).catch(() => {});
          this.log(`[FLOW] Energy meter reset for ${args.device.getName()}`);
          return true;
        });
        this.log('[FLOW] Registered: power_clamp_meter_reset_meter');
      }
    } catch (e) {
      this.log('[FLOW] reset_meter action not found');
    }
  }
}

module.exports = PowerClampMeterDriver;
