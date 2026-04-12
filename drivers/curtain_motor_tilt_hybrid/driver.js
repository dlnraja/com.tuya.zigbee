'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.571: CRITICAL FIX - Flow card run listeners were missing
 */
class TuyaZigbeeDriver extends ZigBeeDriver {
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

    this.log('curtain_motor driver v5.5.571 initialized');
    this._registerFlowCards();
  
  
  
  
  }

  _registerFlowCards() {
    // ACTION: Set position
    try {
      this.homey.flow.getActionCard('curtain_motor_set_windowcoverings_set')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_set', args.position);
          return true;
        });
      this.log('[FLOW] ✅ Registered: curtain_motor_set_windowcoverings_set');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Open
    try {
      this.homey.flow.getConditionCard('curtain_motor_windowcoverings_open')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_set', 1);
          return true;
        });
      this.log('[FLOW] ✅ Registered: curtain_motor_windowcoverings_open');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Close
    try {
      this.homey.flow.getConditionCard('curtain_motor_windowcoverings_close')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_set', 0);
          return true;
        });
      this.log('[FLOW] ✅ Registered: curtain_motor_windowcoverings_close');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set brightness/dim
    try {
      this.homey.flow.getActionCard('curtain_motor_set_dim')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness);
          return true;
        });
      this.log('[FLOW] ✅ Registered: curtain_motor_set_dim');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  Curtain motor flow cards registered');
  }
}

module.exports = TuyaZigbeeDriver;
