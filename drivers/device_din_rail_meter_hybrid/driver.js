'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');

/**
 * v5.5.576: CRITICAL FIX - Flow card run listeners were missing
 */
class HvacDehumidifierDriver extends BaseZigBeeDriver {
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

    this.log('HvacDehumidifierDriver v5.5.576 initialized');
    this._registerFlowCards();
  
  
  
  
  
  
  
  }

  _registerFlowCards() {
    // CONDITION: Is on
    const isOnCondition = const card = this.homey.flow.getConditionCard('hvac_dehumidifier_dehumidifier_hybrid_is_on');
    if (isOnCondition) {
      isOnCondition.registerRunListener(async (args) => {
        if (!args.device) return false;
        return args.device.getCapabilityValue('onoff') === true;
      });
      this.log('[FLOW]  Registered: hvac_dehumidifier_dehumidifier_hybrid_is_on');
    }

    // ACTION: Turn on
    const turnOnAction = const card = this.homey.flow.getActionCard('hvac_dehumidifier_dehumidifier_hybrid_turn_on');
    if (turnOnAction) {
      turnOnAction.registerRunListener(async (args) => {
        if (!args.device) return false;
        await args.device._setGangOnOff(1, true).catch(() => {});
        await args.device.setCapabilityValue('onoff', true).catch(() => {});
        return true;
      });
      this.log('[FLOW]  Registered: hvac_dehumidifier_dehumidifier_hybrid_turn_on');
    }

    // ACTION: Turn off
    const turnOffAction = const card = this.homey.flow.getActionCard('hvac_dehumidifier_dehumidifier_hybrid_turn_off');
    if (turnOffAction) {
      turnOffAction.registerRunListener(async (args) => {
        if (!args.device) return false;
        await args.device._setGangOnOff(1, false).catch(() => {});
        await args.device.setCapabilityValue('onoff', false).catch(() => {});
        return true;
      });
      this.log('[FLOW]  Registered: hvac_dehumidifier_dehumidifier_hybrid_turn_off');
    }

    // ACTION: Toggle
    const toggleAction = const card = this.homey.flow.getActionCard('hvac_dehumidifier_dehumidifier_hybrid_toggle');
    if (toggleAction) {
      toggleAction.registerRunListener(async (args) => {
        if (!args.device) return false;
        const current = args.device.getCapabilityValue('onoff');
        await args.device._setGangOnOff(1, !current).catch(() => {});
        await args.device.setCapabilityValue('onoff', !current).catch(() => {});
        return true;
      });
      this.log('[FLOW]  Registered: hvac_dehumidifier_dehumidifier_hybrid_toggle');
    }

    this.log('[FLOW]  HVAC dehumidifier flow cards registered');
  }
}

module.exports = HvacDehumidifierDriver;
