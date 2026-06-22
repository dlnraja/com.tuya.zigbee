'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class HybridLightSensorDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('HybridLightSensorDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    try {
      const card = this.homey.flow.getActionCard('hybrid_light_sensor_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action turn_on: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('hybrid_light_sensor_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action turn_off: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('hybrid_light_sensor_set_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const brightness = args.brightness / 100;
          await args.device.triggerCapabilityListener('dim', brightness).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action set_brightness: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = HybridLightSensorDriver;
