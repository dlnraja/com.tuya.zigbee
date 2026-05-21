'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class BedSensorDriver extends ZigBeeDriver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('BedSensorDriver v1.0 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('bed_sensor_is_occupied');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('alarm_contact') === true;
        });
      }
    } catch (err) { this.error(`Condition bed_sensor_is_occupied: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = BedSensorDriver;
