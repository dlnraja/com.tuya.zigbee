'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZbbridgeDriver extends ZigBeeDriver {
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
    this.log('ZbbridgeDriver v5.5.582 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('gateway_zigbee_bridge_device_joined'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gateway_zigbee_bridge_device_left'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gateway_zigbee_bridge_connection_lost'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gateway_zigbee_bridge_connection_restored'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gateway_zigbee_bridge_turned_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gateway_zigbee_bridge_turned_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gateway_zigbee_bridge_battery_low'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('gateway_zigbee_bridge_is_connected');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition gateway_zigbee_bridge_is_connected: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('gateway_zigbee_bridge_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition gateway_zigbee_bridge_is_on: ${err.message}`); }

    // ACTIONS
    try {
      const card = const card = this.homey.flow.getActionCard('gateway_zigbee_bridge_permit_join');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action gateway_zigbee_bridge_permit_join triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action gateway_zigbee_bridge_permit_join: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('gateway_zigbee_bridge_disable_join');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action gateway_zigbee_bridge_disable_join triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action gateway_zigbee_bridge_disable_join: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('gateway_zigbee_bridge_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action gateway_zigbee_bridge_turn_on: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('gateway_zigbee_bridge_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action gateway_zigbee_bridge_turn_off: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('gateway_zigbee_bridge_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action gateway_zigbee_bridge_toggle: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = ZbbridgeDriver;
