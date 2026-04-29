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
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}
    // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) {}

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('curtain_motor_wall_hybrid_curtain_motor_set_windowcoverings_set_curtain_motor_wall_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_set', args.position || args.value || 0).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action curtain_motor_wall_hybrid_curtain_motor_set_windowcoverings_set_curtain_motor_wall_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('curtain_motor_wall_hybrid_curtain_motor_windowcoverings_open_curtain_motor_wall_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action curtain_motor_wall_hybrid_curtain_motor_windowcoverings_open_curtain_motor_wall_hybrid triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action curtain_motor_wall_hybrid_curtain_motor_windowcoverings_open_curtain_motor_wall_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('curtain_motor_wall_hybrid_curtain_motor_windowcoverings_close_curtain_motor_wall_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action curtain_motor_wall_hybrid_curtain_motor_windowcoverings_close_curtain_motor_wall_hybrid triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action curtain_motor_wall_hybrid_curtain_motor_windowcoverings_close_curtain_motor_wall_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('curtain_motor_wall_hybrid_curtain_motor_set_dim_curtain_motor_wall_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action curtain_motor_wall_hybrid_curtain_motor_set_dim_curtain_motor_wall_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('curtain_motor_wall_hybrid_curtain_motor_stop_curtain_motor_wall_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action curtain_motor_wall_hybrid_curtain_motor_stop_curtain_motor_wall_hybrid triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action curtain_motor_wall_hybrid_curtain_motor_stop_curtain_motor_wall_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('curtain_motor_wall_hybrid_curtain_motor_set_favorite_curtain_motor_wall_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action curtain_motor_wall_hybrid_curtain_motor_set_favorite_curtain_motor_wall_hybrid triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action curtain_motor_wall_hybrid_curtain_motor_set_favorite_curtain_motor_wall_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('curtain_motor_wall_hybrid_curtain_motor_set_brightness_curtain_motor_wall_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action curtain_motor_wall_hybrid_curtain_motor_set_brightness_curtain_motor_wall_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('curtain_motor_wall_hybrid_curtain_motor_set_position_curtain_motor_wall_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('windowcoverings_set', args.position || args.value || 0).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action curtain_motor_wall_hybrid_curtain_motor_set_position_curtain_motor_wall_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('curtain_motor_wall_hybrid_curtain_motor_open_curtain_motor_wall_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action curtain_motor_wall_hybrid_curtain_motor_open_curtain_motor_wall_hybrid triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action curtain_motor_wall_hybrid_curtain_motor_open_curtain_motor_wall_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('curtain_motor_wall_hybrid_curtain_motor_close_curtain_motor_wall_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action curtain_motor_wall_hybrid_curtain_motor_close_curtain_motor_wall_hybrid triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action curtain_motor_wall_hybrid_curtain_motor_close_curtain_motor_wall_hybrid: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = TuyaZigbeeDriver;
