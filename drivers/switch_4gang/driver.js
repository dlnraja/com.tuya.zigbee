'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Switch4GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('4-Gang Switch Driver has been initialized');
    super.onInit();

    // Register flow card triggers for each gang
    this.gang1OnTrigger = this.homey.flow.getDeviceTriggerCard('switch_4gang_gang1_turned_on');
    this.gang1OffTrigger = this.homey.flow.getDeviceTriggerCard('switch_4gang_gang1_turned_off');
    this.gang2OnTrigger = this.homey.flow.getDeviceTriggerCard('switch_4gang_gang2_turned_on');
    this.gang2OffTrigger = this.homey.flow.getDeviceTriggerCard('switch_4gang_gang2_turned_off');
    this.gang3OnTrigger = this.homey.flow.getDeviceTriggerCard('switch_4gang_gang3_turned_on');
    this.gang3OffTrigger = this.homey.flow.getDeviceTriggerCard('switch_4gang_gang3_turned_off');
    this.gang4OnTrigger = this.homey.flow.getDeviceTriggerCard('switch_4gang_gang4_turned_on');
    this.gang4OffTrigger = this.homey.flow.getDeviceTriggerCard('switch_4gang_gang4_turned_off');

    // Register flow card conditions
    this.gang1IsOnCondition = this.homey.flow.getConditionCard('switch_4gang_gang1_is_on');
    this.gang1IsOnCondition.registerRunListener(async (args) => {
      return args.device.getCapabilityValue('onoff') === true;
    });

    this.gang2IsOnCondition = this.homey.flow.getConditionCard('switch_4gang_gang2_is_on');
    this.gang2IsOnCondition.registerRunListener(async (args) => {
      return args.device.getCapabilityValue('onoff.gang2') === true;
    });

    this.gang3IsOnCondition = this.homey.flow.getConditionCard('switch_4gang_gang3_is_on');
    this.gang3IsOnCondition.registerRunListener(async (args) => {
      return args.device.getCapabilityValue('onoff.gang3') === true;
    });

    this.gang4IsOnCondition = this.homey.flow.getConditionCard('switch_4gang_gang4_is_on');
    this.gang4IsOnCondition.registerRunListener(async (args) => {
      return args.device.getCapabilityValue('onoff.gang4') === true;
    });

    // Register flow card actions
    this.gang1OnAction = this.homey.flow.getActionCard('switch_4gang_turn_on_gang1');
    this.gang1OnAction.registerRunListener(async (args) => {
      return args.device.setCapabilityValue('onoff', true);
    });

    this.gang1OffAction = this.homey.flow.getActionCard('switch_4gang_turn_off_gang1');
    this.gang1OffAction.registerRunListener(async (args) => {
      return args.device.setCapabilityValue('onoff', false);
    });

    this.gang2OnAction = this.homey.flow.getActionCard('switch_4gang_turn_on_gang2');
    this.gang2OnAction.registerRunListener(async (args) => {
      return args.device.setCapabilityValue('onoff.gang2', true);
    });

    this.gang2OffAction = this.homey.flow.getActionCard('switch_4gang_turn_off_gang2');
    this.gang2OffAction.registerRunListener(async (args) => {
      return args.device.setCapabilityValue('onoff.gang2', false);
    });

    this.gang3OnAction = this.homey.flow.getActionCard('switch_4gang_turn_on_gang3');
    this.gang3OnAction.registerRunListener(async (args) => {
      return args.device.setCapabilityValue('onoff.gang3', true);
    });

    this.gang3OffAction = this.homey.flow.getActionCard('switch_4gang_turn_off_gang3');
    this.gang3OffAction.registerRunListener(async (args) => {
      return args.device.setCapabilityValue('onoff.gang3', false);
    });

    this.gang4OnAction = this.homey.flow.getActionCard('switch_4gang_turn_on_gang4');
    this.gang4OnAction.registerRunListener(async (args) => {
      return args.device.setCapabilityValue('onoff.gang4', true);
    });

    this.gang4OffAction = this.homey.flow.getActionCard('switch_4gang_turn_off_gang4');
    this.gang4OffAction.registerRunListener(async (args) => {
      return args.device.setCapabilityValue('onoff.gang4', false);
    });
  }

}

module.exports = Switch4GangDriver;
