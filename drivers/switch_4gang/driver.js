'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.562: CRITICAL FIX - "Could not get device by id" error prevention
 * - Conditions now return false instead of throwing when device missing
 * - Actions now return silently instead of throwing when device missing
 * - Added try-catch wrappers to prevent error propagation to Homey
 *
 * v5.5.506: Fixed flow card registration with proper error handling
 */
class Switch4GangDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }


  /**
   * Safe wrapper for condition handlers - returns false if device invalid
   */
  _safeCondition(handler) {
    return async (args) => {
      try {
        if (!args?.device || typeof args.device.getCapabilityValue !== 'function') {
          this.log('[FLOW] Condition: Device not available (deleted/re-paired?)');
          return false;
        }
        return await handler(args);
      } catch (err) {
        this.error('[FLOW] Condition error:', err.message);
        return false;
      }
    };
  }

  /**
   * Safe wrapper for action handlers - returns silently if device invalid
   */
  _safeAction(handler) {
    return async (args) => {
      try {
        if (!args?.device || typeof args.device.triggerCapabilityListener !== 'function') {
          this.log('[FLOW] Action: Device not available (deleted/re-paired?)');
          return;
        }
        await handler(args);
      } catch (err) {
        this.error('[FLOW] Action error:', err.message);
      }
    };
  }

  async onInit() {
    this.log('4-Gang Switch Driver v5.5.562 initializing...');
    await super.onInit();

    try {
      // Register flow card triggers for each gang
      (() => { try { return this.homey.flow.getDeviceTriggerCard('switch_4gang_gang1_turned_on'); } catch(e) { return null; } })();
      (() => { try { return this.homey.flow.getDeviceTriggerCard('switch_4gang_gang1_turned_off'); } catch(e) { return null; } })();
      (() => { try { return this.homey.flow.getDeviceTriggerCard('switch_4gang_gang2_turned_on'); } catch(e) { return null; } })();
      (() => { try { return this.homey.flow.getDeviceTriggerCard('switch_4gang_gang2_turned_off'); } catch(e) { return null; } })();
      (() => { try { return this.homey.flow.getDeviceTriggerCard('switch_4gang_gang3_turned_on'); } catch(e) { return null; } })();
      (() => { try { return this.homey.flow.getDeviceTriggerCard('switch_4gang_gang3_turned_off'); } catch(e) { return null; } })();
      (() => { try { return this.homey.flow.getDeviceTriggerCard('switch_4gang_gang4_turned_on'); } catch(e) { return null; } })();
      (() => { try { return this.homey.flow.getDeviceTriggerCard('switch_4gang_gang4_turned_off'); } catch(e) { return null; } })();

      // Register flow card conditions - v5.5.562: using safe wrapper
      (() => { try { return this.homey.flow.getDeviceConditionCard('switch_4gang_gang1_is_on'); } catch(e) { return null; } })();
      this.gang1IsOnCondition.registerRunListener(this._safeCondition(async (args) => {
        return args.device.getCapabilityValue('onoff') === true;
      }));

      (() => { try { return this.homey.flow.getDeviceConditionCard('switch_4gang_gang2_is_on'); } catch(e) { return null; } })();
      this.gang2IsOnCondition.registerRunListener(this._safeCondition(async (args) => {
        return args.device.getCapabilityValue('onoff.gang2') === true;
      }));

      (() => { try { return this.homey.flow.getDeviceConditionCard('switch_4gang_gang3_is_on'); } catch(e) { return null; } })();
      this.gang3IsOnCondition.registerRunListener(this._safeCondition(async (args) => {
        return args.device.getCapabilityValue('onoff.gang3') === true;
      }));

      (() => { try { return this.homey.flow.getDeviceConditionCard('switch_4gang_gang4_is_on'); } catch(e) { return null; } })();
      this.gang4IsOnCondition.registerRunListener(this._safeCondition(async (args) => {
        return args.device.getCapabilityValue('onoff.gang4') === true;
      }));

      // Register flow card actions - v5.5.562: using safe wrapper
      (() => { try { return this.homey.flow.getDeviceActionCard('switch_4gang_turn_on_gang1'); } catch(e) { return null; } })();
      this.gang1OnAction.registerRunListener(this._safeAction(async (args) => {
        await args.device._setGangOnOff(1, true).catch(() => {});
        await args.device.setCapabilityValue('onoff', true).catch(() => {});
      }));

      (() => { try { return this.homey.flow.getDeviceActionCard('switch_4gang_turn_off_gang1'); } catch(e) { return null; } })();
      this.gang1OffAction.registerRunListener(this._safeAction(async (args) => {
        await args.device._setGangOnOff(1, false).catch(() => {});
        await args.device.setCapabilityValue('onoff', false).catch(() => {});
      }));

      (() => { try { return this.homey.flow.getDeviceActionCard('switch_4gang_turn_on_gang2'); } catch(e) { return null; } })();
      this.gang2OnAction.registerRunListener(this._safeAction(async (args) => {
        await args.device.triggerCapabilityListener('onoff.gang2', true);
      }));

      (() => { try { return this.homey.flow.getDeviceActionCard('switch_4gang_turn_off_gang2'); } catch(e) { return null; } })();
      this.gang2OffAction.registerRunListener(this._safeAction(async (args) => {
        await args.device.triggerCapabilityListener('onoff.gang2', false);
      }));

      (() => { try { return this.homey.flow.getDeviceActionCard('switch_4gang_turn_on_gang3'); } catch(e) { return null; } })();
      this.gang3OnAction.registerRunListener(this._safeAction(async (args) => {
        await args.device.triggerCapabilityListener('onoff.gang3', true);
      }));

      (() => { try { return this.homey.flow.getDeviceActionCard('switch_4gang_turn_off_gang3'); } catch(e) { return null; } })();
      this.gang3OffAction.registerRunListener(this._safeAction(async (args) => {
        await args.device.triggerCapabilityListener('onoff.gang3', false);
      }));

      (() => { try { return this.homey.flow.getDeviceActionCard('switch_4gang_turn_on_gang4'); } catch(e) { return null; } })();
      this.gang4OnAction.registerRunListener(this._safeAction(async (args) => {
        await args.device.triggerCapabilityListener('onoff.gang4', true);
      }));

      (() => { try { return this.homey.flow.getDeviceActionCard('switch_4gang_turn_off_gang4'); } catch(e) { return null; } })();
      this.gang4OffAction.registerRunListener(this._safeAction(async (args) => {
        await args.device.triggerCapabilityListener('onoff.gang4', false);
      }));

      // v5.5.930: LED backlight flow cards
      try {
        (() => { try { return this.homey.flow.getDeviceActionCard('switch_4gang_set_backlight'); } catch(e) { return null; } })()
          .registerRunListener(this._safeAction(async (args) => {
            await args.device.setBacklightMode(args.mode);
          }));
        this.log('[FLOW] ✅ switch_4gang_set_backlight');
      } catch (e) { this.log(`[FLOW] ⚠️ ${e.message}`); }

      try {
        (() => { try { return this.homey.flow.getDeviceActionCard('switch_4gang_set_backlight_color'); } catch(e) { return null; } })()
          .registerRunListener(this._safeAction(async (args) => {
            await args.device.setBacklightColor(args.state, args.color);
          }));
        this.log('[FLOW] ✅ switch_4gang_set_backlight_color');
      } catch (e) { this.log(`[FLOW] ⚠️ ${e.message}`); }

      try {
        (() => { try { return this.homey.flow.getDeviceActionCard('switch_4gang_set_backlight_brightness'); } catch(e) { return null; } })()
          .registerRunListener(this._safeAction(async (args) => {
            await args.device.setBacklightBrightness(args.brightness);
          }));
        this.log('[FLOW] ✅ switch_4gang_set_backlight_brightness');
      } catch (e) { this.log(`[FLOW] ⚠️ ${e.message}`); }

      // v5.12.0: Toggle per gang + all on/off
      const caps = ['onoff', 'onoff.gang2', 'onoff.gang3', 'onoff.gang4'];
      ['gang1', 'gang2', 'gang3', 'gang4'].forEach((gang, idx) => {
        try {
          (() => { try { return this.homey.flow.getDeviceActionCard(`switch_4gang_toggle_${gang}`); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })()
            .registerRunListener(this._safeAction(async (args) => {
              const cap = caps[idx];
              const v = args.device.getCapabilityValue(cap);
              await args.device._setGangOnOff(idx + 1, !v).catch(() => {});
              await args.device.setCapabilityValue(cap, !v).catch(() => {});
            }));
        } catch (e) { this.log(`[FLOW] ⚠️ ${e.message}`); }
      });

      try {
        (() => { try { return this.homey.flow.getDeviceActionCard('switch_4gang_turn_on_all'); } catch(e) { return null; } })()
          .registerRunListener(this._safeAction(async (args) => {
            for (const cap of caps) {
              if (args.device.hasCapability(cap)) await args.device._setGangOnOff(idx + 1, true).catch(() => {});
              await args.device.setCapabilityValue(cap, true).catch(() => {});
            }
          }));
      } catch (e) { this.log(`[FLOW] ⚠️ ${e.message}`); }

      try {
        (() => { try { return this.homey.flow.getDeviceActionCard('switch_4gang_turn_off_all'); } catch(e) { return null; } })()
          .registerRunListener(this._safeAction(async (args) => {
            for (const cap of caps) {
              if (args.device.hasCapability(cap)) await args.device._setGangOnOff(idx + 1, false).catch(() => {});
              await args.device.setCapabilityValue(cap, false).catch(() => {});
            }
          }));
      } catch (e) { this.log(`[FLOW] ⚠️ ${e.message}`); }

      // v5.12.5: Scene mode triggers + action (ported from wall_switch_4gang_1way)
      for (const g of [1, 2, 3, 4]) {
        try { (() => { try { return this.homey.flow.getDeviceTriggerCard(`switch_4gang_gang${g}_scene`); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })(); } catch (e) { this.log(`[FLOW] scene G${g}: ${e.message}`); }
      }

      try {
        (() => { try { return this.homey.flow.getDeviceActionCard('switch_4gang_set_scene_mode'); } catch(e) { return null; } })()
          .registerRunListener(this._safeAction(async (args) => {
            await args.device.setSceneMode(args.mode);
          }));
        this.log('[FLOW] ✅ switch_4gang_set_scene_mode');
      } catch (e) { this.log(`[FLOW] ⚠️ ${e.message}`); }

      this.log('4-Gang Switch Driver v5.12.5 ✅ Flow cards registered');
    } catch (err) {
      this.error('4-Gang Switch Driver flow card registration failed:', err.message);
    }
  }

}

module.exports = Switch4GangDriver;

