'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');

class DinRailMeterDriver extends BaseZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('Din Rail Meter driver initialized');
    
    // Register triggers from driver.flow.compose.json
    try {
      this._powerChangedTrigger = this._getFlowCard('din_rail_meter_power_changed', 'trigger');
      this._voltageChangedTrigger = this._getFlowCard('din_rail_meter_voltage_changed', 'trigger');
      this._currentChangedTrigger = this._getFlowCard('din_rail_meter_current_changed', 'trigger');
      this._energyChangedTrigger = this._getFlowCard('din_rail_meter_energy_changed', 'trigger');
      
      // Register condition
      this._powerAboveCondition = this._getFlowCard('din_rail_meter_power_above', 'condition');
      if (this._powerAboveCondition) {
        this._powerAboveCondition.registerRunListener(async (args, state) => {
          if (args.device && typeof args.device.getCapabilityValue === 'function') {
            const power = args.device.getCapabilityValue('measure_power') || 0;
            const isAbove = power > args.power;
            return args.is ? isAbove : !isAbove;
          }
          return false;
        });
      }
      
      // Register action (already present but keep for consistency)
      const actionCard = (() => { try { return this._getFlowCard('din_rail_meter_reset_meter', 'action'); } catch(e) { return null; } })();
      if (actionCard) {
        actionCard.registerRunListener(async (args, state) => {
          if (args.device && typeof args.device.resetMeter === 'function') {
            await args.device.resetMeter();
          }
          return true;
        });
      }
      
      this.log('Din Rail Meter flow cards registered successfully');
    } catch(e) {
      this.log('[Flow]', e.message);
    }
  }
}

module.exports = DinRailMeterDriver;
