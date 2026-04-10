'use strict';
const { Driver } = require('homey');
class PetFeederDriver extends Driver {
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

  async onInit() {
    this.log('Pet Feeder driver initialized');
    // v5.13.3: Flow card handlers
      this.homey.flow.getActionCard('pet_feeder_feed_now')
  }
}
module.exports = PetFeederDriver;
