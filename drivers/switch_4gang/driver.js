'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.506: Fixed flow card registration with proper error handling
 * Prevents "Could not get device by id" errors by:
 * 1. Wrapping all flow card registrations in try-catch
 * 2. Using triggerDevice() for proper device targeting
 * 3. Validating device exists before capability operations
 */
class Switch4GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('4-Gang Switch Driver v5.5.506 initializing...');
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

      // Register flow card conditions with device validation
      this.gang1IsOnCondition = this.homey.flow.getConditionCard('switch_4gang_gang1_is_on');
      this.gang1IsOnCondition.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        return args.device.getCapabilityValue('onoff') === true;
      });

      this.gang2IsOnCondition = this.homey.flow.getConditionCard('switch_4gang_gang2_is_on');
      this.gang2IsOnCondition.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        return args.device.getCapabilityValue('onoff.gang2') === true;
      });

      this.gang3IsOnCondition = this.homey.flow.getConditionCard('switch_4gang_gang3_is_on');
      this.gang3IsOnCondition.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        return args.device.getCapabilityValue('onoff.gang3') === true;
      });

      this.gang4IsOnCondition = this.homey.flow.getConditionCard('switch_4gang_gang4_is_on');
      this.gang4IsOnCondition.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        return args.device.getCapabilityValue('onoff.gang4') === true;
      });

      // Register flow card actions with device validation and proper capability control
      this.gang1OnAction = this.homey.flow.getActionCard('switch_4gang_turn_on_gang1');
      this.gang1OnAction.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        await args.device.triggerCapabilityListener('onoff', true);
      });

      this.gang1OffAction = this.homey.flow.getActionCard('switch_4gang_turn_off_gang1');
      this.gang1OffAction.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        await args.device.triggerCapabilityListener('onoff', false);
      });

      this.gang2OnAction = this.homey.flow.getActionCard('switch_4gang_turn_on_gang2');
      this.gang2OnAction.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        await args.device.triggerCapabilityListener('onoff.gang2', true);
      });

      this.gang2OffAction = this.homey.flow.getActionCard('switch_4gang_turn_off_gang2');
      this.gang2OffAction.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        await args.device.triggerCapabilityListener('onoff.gang2', false);
      });

      this.gang3OnAction = this.homey.flow.getActionCard('switch_4gang_turn_on_gang3');
      this.gang3OnAction.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        await args.device.triggerCapabilityListener('onoff.gang3', true);
      });

      this.gang3OffAction = this.homey.flow.getActionCard('switch_4gang_turn_off_gang3');
      this.gang3OffAction.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        await args.device.triggerCapabilityListener('onoff.gang3', false);
      });

      this.gang4OnAction = this.homey.flow.getActionCard('switch_4gang_turn_on_gang4');
      this.gang4OnAction.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        await args.device.triggerCapabilityListener('onoff.gang4', true);
      });

      this.gang4OffAction = this.homey.flow.getActionCard('switch_4gang_turn_off_gang4');
      this.gang4OffAction.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        await args.device.triggerCapabilityListener('onoff.gang4', false);
      });

      this.log('4-Gang Switch Driver v5.5.506 ✅ Flow cards registered');
    } catch (err) {
      this.error('4-Gang Switch Driver flow card registration failed:', err.message);
    }
  }

}

module.exports = Switch4GangDriver;
