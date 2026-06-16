'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class HybridGarageDoorSensorDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('HybridGarageDoorSensorDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    try {
      const card = this.homey.flow.getActionCard('hybrid_garage_door_sensor_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('garagedoor_opener', 'open').catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action open: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('hybrid_garage_door_sensor_close');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('garagedoor_opener', 'close').catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action close: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('hybrid_garage_door_sensor_is_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_contact') === true;
        });
      }
    } catch (err) { this.error(`Condition is_open: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = HybridGarageDoorSensorDriver;
