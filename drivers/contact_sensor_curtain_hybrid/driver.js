'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaZigbeeDriver extends ZigBeeDriver {
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
    this.log('curtain_motor driver v5.5.571 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('contact_sensor_curtain_hybrid_button_pressed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('contact_sensor_curtain_hybrid_curtain_motor_windowcoverings_set_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('contact_sensor_curtain_hybrid_curtain_motor_dim_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('contact_sensor_curtain_hybrid_curtain_motor_battery_low'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('contact_sensor_curtain_hybrid_curtain_motor_physical_on'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('contact_sensor_curtain_hybrid_curtain_motor_physical_off'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('contact_sensor_curtain_hybrid_curtain_motor_physical_single'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('contact_sensor_curtain_hybrid_curtain_motor_lux_changed'); } catch (e) {}

    // ACTIONS
    try {
      const card = this._getFlowCard('contact_sensor_curtain_hybrid_curtain_motor_set_windowcoverings_set', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_set', args.position || args.value || 0).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action contact_sensor_curtain_hybrid_curtain_motor_set_windowcoverings_set: ${err.message}`); }

    try {
      const card = this._getFlowCard('contact_sensor_curtain_hybrid_curtain_motor_windowcoverings_open', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action contact_sensor_curtain_hybrid_curtain_motor_windowcoverings_open triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action contact_sensor_curtain_hybrid_curtain_motor_windowcoverings_open: ${err.message}`); }

    try {
      const card = this._getFlowCard('contact_sensor_curtain_hybrid_curtain_motor_windowcoverings_close', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action contact_sensor_curtain_hybrid_curtain_motor_windowcoverings_close triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action contact_sensor_curtain_hybrid_curtain_motor_windowcoverings_close: ${err.message}`); }

    try {
      const card = this._getFlowCard('contact_sensor_curtain_hybrid_curtain_motor_set_dim', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action contact_sensor_curtain_hybrid_curtain_motor_set_dim: ${err.message}`); }

    try {
      const card = this._getFlowCard('contact_sensor_curtain_hybrid_curtain_motor_stop', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action contact_sensor_curtain_hybrid_curtain_motor_stop triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action contact_sensor_curtain_hybrid_curtain_motor_stop: ${err.message}`); }

    try {
      const card = this._getFlowCard('contact_sensor_curtain_hybrid_curtain_motor_set_favorite', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action contact_sensor_curtain_hybrid_curtain_motor_set_favorite triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action contact_sensor_curtain_hybrid_curtain_motor_set_favorite: ${err.message}`); }

    try {
      const card = this._getFlowCard('contact_sensor_curtain_hybrid_curtain_motor_set_brightness', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action contact_sensor_curtain_hybrid_curtain_motor_set_brightness: ${err.message}`); }

    try {
      const card = this._getFlowCard('contact_sensor_curtain_hybrid_curtain_motor_set_position', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_set', args.position || args.value || 0).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action contact_sensor_curtain_hybrid_curtain_motor_set_position: ${err.message}`); }

    try {
      const card = this._getFlowCard('contact_sensor_curtain_hybrid_curtain_motor_open', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action contact_sensor_curtain_hybrid_curtain_motor_open triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action contact_sensor_curtain_hybrid_curtain_motor_open: ${err.message}`); }

    try {
      const card = this._getFlowCard('contact_sensor_curtain_hybrid_curtain_motor_close', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action contact_sensor_curtain_hybrid_curtain_motor_close triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action contact_sensor_curtain_hybrid_curtain_motor_close: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = TuyaZigbeeDriver;
