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
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;

    this.log('LonsonhoContactSensorDriver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Door/window is/is not open
    try {
      // P2839: compose ID (was hollow contact_sensor_is_open)
      const card = ( () => { try { return this.homey.flow.getConditionCard('sensor_contact_zigbee_contact_sensor_is_open'); } catch(e) { return null; } } )();
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('alarm_contact') === true;
        });
        this.log('[FLOW] Registered: sensor_contact_zigbee_contact_sensor_is_open');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    // CONDITION: Battery above threshold
    try {
      const card = ( () => { try { return this.homey.flow.getConditionCard('sensor_contact_zigbee_contact_sensor_battery_above'); } catch(e) { return null; } } )();
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
        });
        this.log('[FLOW] Registered: sensor_contact_zigbee_contact_sensor_battery_above');
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    // P2839: also wire remaining compose conditions (were declare-only / creux)
    try {
      const card = ( () => { try { return this.homey.flow.getConditionCard('sensor_contact_zigbee_contact_sensor_contact_open'); } catch(e) { return null; } } )();
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('alarm_contact') === true;
        });
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    try {
      const card = ( () => { try { return this.homey.flow.getConditionCard('sensor_contact_zigbee_contact_sensor_tamper_active'); } catch(e) { return null; } } )();
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('alarm_tamper') === true;
        });
      }
    } catch (err) { this.log(`[FLOW-ERROR] ${err.message}`); }

    this.log('[FLOW] Contact sensor flow cards registered');
  }
}

module.exports = LonsonhoContactSensorDriver;


