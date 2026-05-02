'use strict';
const { Driver } = require('homey');

class PetFeederDriver extends Driver {
  async onInit() {
    await super.onInit();
    this.log('Pet Feeder Driver initialized');
    
    // Register flow cards
    try {
      const card = this.homey.flow.getConditionCard('pet_feeder_food_ok');
      if (card) {
        card.registerRunListener(async (args) => {
          return args.device.getCapabilityValue('alarm_water') === false;
        });
      }
    } catch (e) {
      this.error('Error registering pet_feeder_food_ok:', e.message);
    }
  }
}

module.exports = PetFeederDriver;
