'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class HybridSwitchSensorDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('HybridSwitchSensorDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('hybrid_switch_sensor_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action hybrid_switch_sensor_turn_on: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('hybrid_switch_sensor_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action hybrid_switch_sensor_turn_off: ${err.message}`); }

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('hybrid_switch_sensor_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition hybrid_switch_sensor_is_on: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = HybridSwitchSensorDriver;
