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
      this.gang1OnTrigger = this.homey.flow.getDeviceTriggerCard('switch_4gang_gang1_turned_on');
      this.gang1OffTrigger = this.homey.flow.getDeviceTriggerCard('switch_4gang_gang1_turned_off');
      this.gang2OnTrigger = this.homey.flow.getDeviceTriggerCard('switch_4gang_gang2_turned_on');
      this.gang2OffTrigger = this.homey.flow.getDeviceTriggerCard('switch_4gang_gang2_turned_off');
      this.gang3OnTrigger = this.homey.flow.getDeviceTriggerCard('switch_4gang_gang3_turned_on');
      this.gang3OffTrigger = this.homey.flow.getDeviceTriggerCard('switch_4gang_gang3_turned_off');
      this.gang4OnTrigger = this.homey.flow.getDeviceTriggerCard('switch_4gang_gang4_turned_on');
      this.gang4OffTrigger = this.homey.flow.getDeviceTriggerCard('switch_4gang_gang4_turned_off');

      // Register flow card conditions - v5.5.562: using safe wrapper
      this.gang1IsOnCondition = this.homey.flow.getConditionCard('switch_4gang_gang1_is_on');
      this.gang1IsOnCondition.registerRunListener(this._safeCondition(async (args) => {
        return args.device.getCapabilityValue('onoff') === true;
      }));

      this.gang2IsOnCondition = this.homey.flow.getConditionCard('switch_4gang_gang2_is_on');
      this.gang2IsOnCondition.registerRunListener(this._safeCondition(async (args) => {
        return args.device.getCapabilityValue('onoff.gang2') === true;
      }));

      this.gang3IsOnCondition = this.homey.flow.getConditionCard('switch_4gang_gang3_is_on');
      this.gang3IsOnCondition.registerRunListener(this._safeCondition(async (args) => {
        return args.device.getCapabilityValue('onoff.gang3') === true;
      }));

      this.gang4IsOnCondition = this.homey.flow.getConditionCard('switch_4gang_gang4_is_on');
      this.gang4IsOnCondition.registerRunListener(this._safeCondition(async (args) => {
        return args.device.getCapabilityValue('onoff.gang4') === true;
      }));

      // Register flow card actions - v5.5.562: using safe wrapper
      this.gang1OnAction = this.homey.flow.getActionCard('switch_4gang_turn_on_gang1');
      this.gang1OnAction.registerRunListener(this._safeAction(async (args) => {
        await args.device.triggerCapabilityListener('onoff', true);
      }));

      this.gang1OffAction = this.homey.flow.getActionCard('switch_4gang_turn_off_gang1');
      this.gang1OffAction.registerRunListener(this._safeAction(async (args) => {
        await args.device.triggerCapabilityListener('onoff', false);
      }));

      this.gang2OnAction = this.homey.flow.getActionCard('switch_4gang_turn_on_gang2');
      this.gang2OnAction.registerRunListener(this._safeAction(async (args) => {
        await args.device.triggerCapabilityListener('onoff.gang2', true);
      }));

      this.gang2OffAction = this.homey.flow.getActionCard('switch_4gang_turn_off_gang2');
      this.gang2OffAction.registerRunListener(this._safeAction(async (args) => {
        await args.device.triggerCapabilityListener('onoff.gang2', false);
      }));

      this.gang3OnAction = this.homey.flow.getActionCard('switch_4gang_turn_on_gang3');
      this.gang3OnAction.registerRunListener(this._safeAction(async (args) => {
        await args.device.triggerCapabilityListener('onoff.gang3', true);
      }));

      this.gang3OffAction = this.homey.flow.getActionCard('switch_4gang_turn_off_gang3');
      this.gang3OffAction.registerRunListener(this._safeAction(async (args) => {
        await args.device.triggerCapabilityListener('onoff.gang3', false);
      }));

      this.gang4OnAction = this.homey.flow.getActionCard('switch_4gang_turn_on_gang4');
      this.gang4OnAction.registerRunListener(this._safeAction(async (args) => {
        await args.device.triggerCapabilityListener('onoff.gang4', true);
      }));

      this.gang4OffAction = this.homey.flow.getActionCard('switch_4gang_turn_off_gang4');
      this.gang4OffAction.registerRunListener(this._safeAction(async (args) => {
        await args.device.triggerCapabilityListener('onoff.gang4', false);
      }));

      // v5.5.930: LED backlight flow cards
      try {
        this.homey.flow.getActionCard('switch_4gang_set_backlight')
          .registerRunListener(this._safeAction(async (args) => {
            await args.device.setBacklightMode(args.mode);
          }));
        this.log('[FLOW] ✅ switch_4gang_set_backlight');
      } catch (e) { this.log(`[FLOW] ⚠️ ${e.message}`); }

      try {
        this.homey.flow.getActionCard('switch_4gang_set_backlight_color')
          .registerRunListener(this._safeAction(async (args) => {
            await args.device.setBacklightColor(args.state, args.color);
          }));
        this.log('[FLOW] ✅ switch_4gang_set_backlight_color');
      } catch (e) { this.log(`[FLOW] ⚠️ ${e.message}`); }

      try {
        this.homey.flow.getActionCard('switch_4gang_set_backlight_brightness')
          .registerRunListener(this._safeAction(async (args) => {
            await args.device.setBacklightBrightness(args.brightness);
          }));
        this.log('[FLOW] ✅ switch_4gang_set_backlight_brightness');
      } catch (e) { this.log(`[FLOW] ⚠️ ${e.message}`); }

      this.log('4-Gang Switch Driver v5.5.930 ✅ Flow cards registered');
    } catch (err) {
      this.error('4-Gang Switch Driver flow card registration failed:', err.message);
    }
  }

}

module.exports = Switch4GangDriver;
