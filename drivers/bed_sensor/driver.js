'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');

class BedSensorDriver extends BaseZigBeeDriver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('BedSensorDriver v1.0 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    const triggers = [
      'bed_sensor_occupied',
      'bed_sensor_vacant',
    ];
    for (const id of triggers) {
      try {
        const card = this._getFlowCard(id, 'trigger');
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return;
            args.device.emit(`flow:${id}`, args);
          });
        }
      } catch (err) { this.error(`Trigger ${id}: ${err.message}`); }
    }

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
