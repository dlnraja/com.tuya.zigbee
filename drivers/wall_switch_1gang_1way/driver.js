'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * Wall Switch 1-Gang 1-Way Driver v7.5.8
 */
class WallSwitch1Gang1WayDriver extends ZigBeeDriver {
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

    this.log('WallSwitch1Gang1WayDriver v7.5.8 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    this.log('Registering flow cards...');
    const P = 'wall_switch_1gang_1way';

    // Helper function for safe card registration
    const safeRegister = (type, id, handler) => {
      try {
        const card = type === 'condition' 
          ? this.homey.flow.getConditionCard(id)
          : this.homey.flow.getActionCard(id);
        if (card) {
          card.registerRunListener(handler);
          this.log(`[FLOW] Registered: ${id}`);
        } else {
          this.log(`[FLOW] Card not found: ${id}`);
        }
      } catch (err) {
        this.error(`[FLOW] Failed to register ${id}: ${err.message}`);
      }
    };

    // TRIGGERS (already logging, no registration needed for triggers)
    try {
      this.log(`[FLOW] Trigger registered: ${P}_turned_on`);
    } catch (err) {
      this.error(`[FLOW] Failed turned_on: ${err.message}`);
    }

    try {
      this.log(`[FLOW] Trigger registered: ${P}_turned_off`);
    } catch (err) {
      this.error(`[FLOW] Failed turned_off: ${err.message}`);
    }

    try {
      this.log(`[FLOW] Trigger registered: ${P}_gang1_scene`);
    } catch (err) {
      this.error(`[FLOW] Failed gang1_scene: ${err.message}`);
    }

    // ACTION: set_scene_mode
    safeRegister('action', `${P}_set_scene_mode`, async (args) => {
      if (!args.device) return false;
      await args.device.setSceneMode(args.mode);
      return true;
    });

    // ACTION: set_backlight
    safeRegister('action', `${P}_set_backlight`, async (args) => {
      if (!args.device) return false;
      this.log(`[FLOW] Setting backlight mode to ${args.mode}`);
      await args.device.setBacklightMode(args.mode);
      await args.device.setSettings({ backlight_mode: args.mode }).catch(() => {});
      return true;
    });

    // ACTION: set_power_on_behavior
    safeRegister('action', `${P}_set_power_on_behavior`, async (args) => {
      if (!args.device) return false;
      await args.device.setSettings({ power_on_behavior: args.mode });
      const pobValue = { off: 0, on: 1, memory: 2 }[args.mode] ?? 2;
      if (typeof args.device._writeE001Attribute === 'function') {
        await args.device._writeE001Attribute('powerOnBehavior', pobValue);
      } else if (typeof args.device._sendTuyaDP === 'function') {
        await args.device._sendTuyaDP(14, pobValue, 'enum');
      }
      return true;
    });

    // ACTION: set_switch_mode
    safeRegister('action', `${P}_set_switch_mode`, async (args) => {
      if (!args.device) return false;
      await args.device.setSettings({ switch_mode: args.mode });
      const smValue = { toggle: 0, state: 1, momentary: 2 }[args.mode] ?? 0;
      if (typeof args.device._writeE001Attribute === 'function') {
        await args.device._writeE001Attribute('switchMode', smValue);
      }
      return true;
    });

    this.log('[FLOW] Flow cards registration complete');
  }
}

module.exports = WallSwitch1Gang1WayDriver;