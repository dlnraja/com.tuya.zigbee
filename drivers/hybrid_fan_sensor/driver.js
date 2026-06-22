'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class HybridFanSensorDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('HybridFanSensorDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    try {
      const card = this.homey.flow.getActionCard('hybrid_fan_sensor_set_speed');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('dim', args.speed / 100).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action set_speed: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('hybrid_fan_sensor_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition is_on: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = HybridFanSensorDriver;
