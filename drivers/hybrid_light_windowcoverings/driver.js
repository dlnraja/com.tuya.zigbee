'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class HybridLightWindowCoveringsDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('HybridLightWindowCoveringsDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    try {
      const card = this.homey.flow.getActionCard('hybrid_light_windowcoverings_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('windowcoverings_set', 100).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action open: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('hybrid_light_windowcoverings_close');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('windowcoverings_set', 0).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action close: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('hybrid_light_windowcoverings_set_position');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('windowcoverings_set', args.position).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action set_position: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('hybrid_light_windowcoverings_light_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_on: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('hybrid_light_windowcoverings_light_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action light_off: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = HybridLightWindowCoveringsDriver;
