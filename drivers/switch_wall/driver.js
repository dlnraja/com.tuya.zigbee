'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaZigbeeWallSwitchDriver extends ZigBeeDriver {
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
    this.log('Tuya Zigbee 1-Gang Wall Switch Driver v7.5.8 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const safeGet = (type, id) => {
      try {
        return type === 'condition' 
          ? this.homey.flow.getConditionCard(id) 
          : this.homey.flow.getActionCard(id);
      } catch (e) { 
        this.log(`[FLOW] Card not found: ${id} - ${e.message}`);
        return null; 
      }
    };

    // CORRECTED PREFIX: switch_wall_hybrid_switch_1gang (not switch_wall_switch_1gang)
    const P = 'switch_wall_hybrid_switch_1gang';

    // CONDITIONS
    try {
      const card = safeGet('condition', `${P}_is_on`);
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
        this.log(`[FLOW] Registered: ${P}_is_on`);
      }
    } catch (err) { this.error(`Condition ${P}_is_on failed: ${err.message}`); }

    // ACTIONS: turn_on
    try {
      const card = safeGet('action', `${P}_turn_on`);
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true).catch(() => {});
          return true;
        });
        this.log(`[FLOW] Registered: ${P}_turn_on`);
      }
    } catch (err) { this.error(`Action ${P}_turn_on failed: ${err.message}`); }

    // ACTIONS: turn_off
    try {
      const card = safeGet('action', `${P}_turn_off`);
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false).catch(() => {});
          return true;
        });
        this.log(`[FLOW] Registered: ${P}_turn_off`);
      }
    } catch (err) { this.error(`Action ${P}_turn_off failed: ${err.message}`); }

    // ACTIONS: toggle
    try {
      const card = safeGet('action', `${P}_toggle`);
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current).catch(() => {});
          return true;
        });
        this.log(`[FLOW] Registered: ${P}_toggle`);
      }
    } catch (err) { this.error(`Action ${P}_toggle failed: ${err.message}`); }

    // SETTINGS ACTIONS
    const settingsActions = [
      { id: 'set_backlight', fn: 'setBacklightMode' },
      { id: 'set_backlight_color', fn: 'setBacklightColor' },
      { id: 'set_backlight_brightness', fn: 'setBacklightBrightness' },
      { id: 'set_countdown', fn: 'setCountdown' },
      { id: 'set_child_lock', fn: 'setChildLock' },
      { id: 'set_scene_mode', fn: 'setSceneMode' }
    ];

    settingsActions.forEach(act => {
      try {
        const card = safeGet('action', `${P}_${act.id}`);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return false;
            if (typeof args.device[act.fn] === 'function') {
              await args.device[act.fn](args.mode || args.value);
              return true;
            }
            this.log(`[FLOW] Device missing method: ${act.fn}`);
            return false;
          });
          this.log(`[FLOW] Registered: ${P}_${act.id}`);
        }
      } catch (err) { this.error(`Action ${P}_${act.id} failed: ${err.message}`); }
    });

    this.log('[FLOW] Wall switch flow cards registered');
  }
}

module.exports = TuyaZigbeeWallSwitchDriver;