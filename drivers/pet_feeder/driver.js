'use strict';

const { Driver } = require('homey');

class PetFeederDriver extends Driver {
  async onInit() {
    this.log('Pet Feeder driver initialized');
    this.fedTrigger = this.homey.flow.getDeviceTriggerCard('pet_feeder_fed');
    this.foodLowTrigger = this.homey.flow.getDeviceTriggerCard('pet_feeder_food_low');
    this.homey.flow.getDeviceConditionCard('pet_feeder_food_ok').registerRunListener(async (args) => {
      return !(args.device.getCapabilityValue('alarm_generic') || false);
    });
    this.homey.flow.getDeviceActionCard('pet_feeder_feed_now').registerRunListener(async (args) => {
      await args.device._triggerFeed();
    });
  }
}

module.exports = PetFeederDriver;
