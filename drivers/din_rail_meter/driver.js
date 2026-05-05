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
    
    // Safe card getter helper
    const safeGet = (type, id) => {
      try {
        return type === 'condition'
          ? this.homey.flow.getConditionCard(id)
          : (type === 'action'
            ? this.homey.flow.getActionCard(id)
            : this.homey.flow.getTriggerCard(id));
      } catch (e) { return null; }
    };

    // Register triggers from driver.flow.compose.json
    try {
      this._powerChangedTrigger = safeGet('trigger', 'din_rail_meter_power_changed');
      this._voltageChangedTrigger = safeGet('trigger', 'din_rail_meter_voltage_changed');
      this._currentChangedTrigger = safeGet('trigger', 'din_rail_meter_current_changed');
      this._energyChangedTrigger = safeGet('trigger', 'din_rail_meter_energy_changed');

      // Register condition
      this._powerAboveCondition = safeGet('condition', 'din_rail_meter_power_above');
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
      const actionCard = safeGet('action', 'din_rail_meter_reset_meter');
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


