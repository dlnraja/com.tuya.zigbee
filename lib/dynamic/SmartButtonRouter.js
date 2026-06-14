'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🔘 SMART BUTTON & SCENE ROUTER (Enriched Edition)                           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Handles complex multi-gang scene switches (TS0041, TS0042, TS0043, TS0044). ║
 * ║  Dynamically routes 'single', 'double', and 'hold' events.                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

class SmartButtonRouter {
  
  constructor(device) {
    this.device = device;
    this.logger = this.device.log ? this.device : console;
    
    // Map Tuya DP values to standard Homey button events
    this.TUYA_ACTION_MAP = {
      0: 'single',
      1: 'double',
      2: 'hold',
      // Some manufacturers use different enums
      'single_click': 'single',
      'double_click': 'double',
      'long_press': 'hold'
    };
  }

  /**
   * Initializes Homey trigger cards for the buttons
   * Assumes triggers are named 'button_pressed_gangX' or a generic 'button_action'
   */
  async initializeTriggers(numGangs = 4) {
    this.logger.log(`[BUTTON_ROUTER] 🔘 Initializing triggers for ${numGangs} buttons`);
    this.triggers = {};
    
    try {
      // Global scene trigger (flow card with arguments: button_id, action)
      this.triggers.sceneTrigger = this.device.homey.flow.getDeviceTriggerCard('scene_button_pressed');
      
      // Individual triggers
      for (let i = 1; i <= numGangs; i++) {
        this.triggers[`gang${i}`] = {
          single: this.device.homey.flow.getDeviceTriggerCard(`button_${i}_single`),
          double: this.device.homey.flow.getDeviceTriggerCard(`button_${i}_double`),
          hold: this.device.homey.flow.getDeviceTriggerCard(`button_${i}_hold`)
        };
      }
    } catch (err) {
      this.logger.error(`[BUTTON_ROUTER] Failed to initialize flow triggers:`, err.message);
    }
  }

  /**
   * Route an incoming Tuya DP or Zigbee Cluster event
   * 
   * @param {number} buttonId - The gang or button index (1, 2, 3...)
   * @param {string|number} actionRaw - The raw action from the device
   */
  async routeEvent(buttonId, actionRaw) {
    const action = this.TUYA_ACTION_MAP[actionRaw] || actionRaw;
    this.logger.log(`[BUTTON_ROUTER] 📥 Routing event: Button ${buttonId} -> ${action} (raw: ${actionRaw})`);

    try {
      // 1. Trigger global scene card
      if (this.triggers && this.triggers.sceneTrigger) {
        await this.triggers.sceneTrigger.trigger(this.device, { 
          button: buttonId.toString(), 
          action: action 
        });
      }

      // 2. Trigger individual button card if exists
      if (this.triggers && this.triggers[`gang${buttonId}`] && this.triggers[`gang${buttonId}`][action]) {
        await this.triggers[`gang${buttonId}`][action].trigger(this.device);
      }

      // 3. Set last action capability if it exists on the device (e.g. 'button_last_action')
      if (this.device.hasCapability('button_last_action')) {
        await this.device.setCapabilityValue('button_last_action', `Button ${buttonId} - ${action}`);
      }
      
      this.logger.log(`[BUTTON_ROUTER] ✅ Event routed successfully`);
      return true;

    } catch (err) {
      this.logger.error(`[BUTTON_ROUTER] ❌ Error routing event:`, err.message);
      return false;
    }
  }
}

module.exports = SmartButtonRouter;
