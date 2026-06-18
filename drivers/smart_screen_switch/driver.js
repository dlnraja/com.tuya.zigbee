'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartScreenSwitchDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('SmartScreenSwitchDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    try {
      const motionCard = this.homey.flow.getDeviceTriggerCard('smart_screen_switch_motion_detected');
      if (motionCard) {
        motionCard.registerRunListener(async (args, state) => {
          if (!args.device) return false;
          return true;
        });
      }
    } catch (e) {
      this.error(`Trigger smart_screen_switch_motion_detected error: ${e.message}`);
    }

    try {
      const motionCondition = this.homey.flow.getConditionCard('smart_screen_switch_motion_active');
      if (motionCondition) {
        motionCondition.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (e) {
      this.log(`[FLOW] smart_screen_switch_motion_active error: ${e.message}`);
    }

    this.log('[FLOW] Smart screen switch flow cards registered');
  }
}

module.exports = SmartScreenSwitchDriver;
