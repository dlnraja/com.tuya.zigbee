'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.571: CRITICAL FIX - Flow card run listeners were missing
 */
class TuyaZigbeeDriver extends ZigBeeDriver {

  async onInit() {
    this.log('curtain_motor driver v5.5.571 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // ACTION: Set position
    try {
      this.homey.flow.getActionCard('curtain_motor_set_windowcoverings_set')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('windowcoverings_set', args.position);
          return true;
        });
      this.log('[FLOW] ✅ curtain_motor_set_windowcoverings_set');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Open
    try {
      this.homey.flow.getActionCard('curtain_motor_windowcoverings_open')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('windowcoverings_set', 1);
          return true;
        });
      this.log('[FLOW] ✅ curtain_motor_windowcoverings_open');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Close
    try {
      this.homey.flow.getActionCard('curtain_motor_windowcoverings_close')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('windowcoverings_set', 0);
          return true;
        });
      this.log('[FLOW] ✅ curtain_motor_windowcoverings_close');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set brightness/dim
    try {
      this.homey.flow.getActionCard('curtain_motor_set_dim')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('dim', args.brightness);
          return true;
        });
      this.log('[FLOW] ✅ curtain_motor_set_dim');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 Curtain motor flow cards registered');
  }
}

module.exports = TuyaZigbeeDriver;
