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
    this.log('curtain_motor driver v5.5.571 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // ACTION: Set position
    try {
      (() => { try { return this.homey.flow.getDeviceActionCard('curtain_motor_set_windowcoverings_set'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_set', args.position);
          return true;
        });
      this.log('[FLOW] ✅ curtain_motor_set_windowcoverings_set');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Open
    try {
      (() => { try { return this.homey.flow.getDeviceActionCard('curtain_motor_windowcoverings_open'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_set', 1);
          return true;
        });
      this.log('[FLOW] ✅ curtain_motor_windowcoverings_open');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Close
    try {
      (() => { try { return this.homey.flow.getDeviceActionCard('curtain_motor_windowcoverings_close'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_set', 0);
          return true;
        });
      this.log('[FLOW] ✅ curtain_motor_windowcoverings_close');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set brightness/dim
    try {
      (() => { try { return this.homey.flow.getDeviceActionCard('curtain_motor_set_dim'); } catch(e) { return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness);
          return true;
        });
      this.log('[FLOW] ✅ curtain_motor_set_dim');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  Curtain motor flow cards registered');
  }
}

module.exports = TuyaZigbeeDriver;
