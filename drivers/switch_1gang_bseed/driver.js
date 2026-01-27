'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * Bseed 1-Gang Switch Driver
 */
class BseedSwitch1GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Bseed 1-Gang Switch Driver initialized');
    this._registerFlowCards();
  }

  /**
   * Register flow cards for physical button triggers
   */
  _registerFlowCards() {
    this.log('Registering flow cards...');

    try {
      // Flow card: Turned on (physical button)
      this.homey.flow.getDeviceTriggerCard('switch_1gang_bseed_turned_on');
      this.log('✅ Flow card registered: switch_1gang_bseed_turned_on');
    } catch (err) {
      this.error('Failed to register turned_on flow card:', err.message);
    }

    try {
      // Flow card: Turned off (physical button)
      this.homey.flow.getDeviceTriggerCard('switch_1gang_bseed_turned_off');
      this.log('✅ Flow card registered: switch_1gang_bseed_turned_off');
    } catch (err) {
      this.error('Failed to register turned_off flow card:', err.message);
    }

    this.log('Flow cards registration complete');
  }

}

module.exports = BseedSwitch1GangDriver;
