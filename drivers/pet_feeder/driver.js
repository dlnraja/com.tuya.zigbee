'use strict';
const { Driver } = require('homey');
class PetFeederDriver extends Driver {
  async onInit() {
    this.log('Pet Feeder driver initialized');
    try { this.fedTrigger = this.homey.flow.getDeviceTriggerCard('pet_feeder_fed'); } catch (e) { this.log('Flow card unavailable:', e.message); }
    try { this.foodLowTrigger = this.homey.flow.getDeviceTriggerCard('pet_feeder_food_low'); } catch (e) { this.log('Flow card unavailable:', e.message); }
    try { this.homey.flow.getConditionCard('pet_feeder_food_ok').registerRunListener(async (args) => { return !(args.device.getCapabilityValue('alarm_generic') || false); }); } catch (e) { this.log('Flow card unavailable:', e.message); }
    try { this.homey.flow.getActionCard('pet_feeder_feed_now').registerRunListener(async (args) => { await args.device._triggerFeed(); }); } catch (e) { this.log('Flow card unavailable:', e.message); }
  }
}
module.exports = PetFeederDriver;
