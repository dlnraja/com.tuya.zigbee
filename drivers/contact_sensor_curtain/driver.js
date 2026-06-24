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
    // Sleepy device: Use Passive Mode (SLEEPY_TUYA_56_YEARS_BUG.md)
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('curtain_motor driver v5.5.571 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    const _triggerIds = ["contact_sensor_curtain_button_pressed","contact_sensor_curtain_curtain_motor_windowcoverings_set_changed","contact_sensor_curtain_curtain_motor_dim_changed","contact_sensor_curtain_curtain_motor_battery_low","contact_sensor_curtain_curtain_motor_physical_on","contact_sensor_curtain_curtain_motor_physical_off","contact_sensor_curtain_curtain_motor_physical_single","contact_sensor_curtain_curtain_motor_lux_changed"];
    for (const _tid of _triggerIds) {
      try {
        const _card = this._getFlowCard(_tid, "trigger");
        if (_card) {
          _card.registerRunListener(async (args) => {
            if (!args.device) return;
            args.device.emit("flow:" + _tid, args);
          });
        }
      } catch (_err) { this.error("Trigger " + _tid + ": " + _err.message); }
    }
    // END TRIGGERS
    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('contact_sensor_curtain_curtain_motor_set_windowcoverings_set');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device['setCapabilityValue']('windowcoverings_set', args.position || args.value || 0).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action contact_sensor_curtain_curtain_motor_set_windowcoverings_set: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('contact_sensor_curtain_curtain_motor_windowcoverings_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action contact_sensor_curtain_curtain_motor_windowcoverings_open triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action contact_sensor_curtain_curtain_motor_windowcoverings_open: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('contact_sensor_curtain_curtain_motor_windowcoverings_close');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action contact_sensor_curtain_curtain_motor_windowcoverings_close triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action contact_sensor_curtain_curtain_motor_windowcoverings_close: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('contact_sensor_curtain_curtain_motor_set_dim');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device['setCapabilityValue']('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action contact_sensor_curtain_curtain_motor_set_dim: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('contact_sensor_curtain_curtain_motor_stop');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action contact_sensor_curtain_curtain_motor_stop triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action contact_sensor_curtain_curtain_motor_stop: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('contact_sensor_curtain_curtain_motor_set_favorite');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action contact_sensor_curtain_curtain_motor_set_favorite triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action contact_sensor_curtain_curtain_motor_set_favorite: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('contact_sensor_curtain_curtain_motor_set_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device['setCapabilityValue']('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action contact_sensor_curtain_curtain_motor_set_brightness: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('contact_sensor_curtain_curtain_motor_set_position');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device['setCapabilityValue']('windowcoverings_set', args.position || args.value || 0).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action contact_sensor_curtain_curtain_motor_set_position: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('contact_sensor_curtain_curtain_motor_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action contact_sensor_curtain_curtain_motor_open triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action contact_sensor_curtain_curtain_motor_open: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('contact_sensor_curtain_curtain_motor_close');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action contact_sensor_curtain_curtain_motor_close triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action contact_sensor_curtain_curtain_motor_close: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = TuyaZigbeeDriver;

