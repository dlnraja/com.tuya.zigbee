'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.570: CRITICAL FIX - Flow card run listeners were missing
 */
class LonsonhoContactSensorDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
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

    this.log('LonsonhoContactSensorDriver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Door/window is/is not open
    try {
      const card = (() => { try { return this.homey.flow.getConditionCard('contact_sensor_is_open'); } catch (e) { return null; } })();
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_contact') === true;
        });
        this.log('[FLOW] Registered: contact_sensor_is_open');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    // CONDITION: Battery above threshold
    try {
      const card = (() => { try { return this.homey.flow.getConditionCard('contact_sensor_battery_above'); } catch (e) { return null; } })();
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
        });
        this.log('[FLOW] Registered: contact_sensor_battery_above');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    this.log('[FLOW] Contact sensor flow cards registered');
  }
}

module.exports = LonsonhoContactSensorDriver;
