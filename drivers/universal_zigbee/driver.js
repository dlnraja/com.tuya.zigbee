'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class UniversalZigbeeDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    try {
      const card = this.homey.flow.getConditionCard('universal_zigbee_thermostat_mode_is');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          const mode = args.mode ?? args.thermostat_mode ?? args.value;
          return args.device.getCapabilityValue('thermostat_mode') === mode;
        });
      }
    } catch (err) {
      this.log('[FLOW] universal_zigbee_thermostat_mode_is: ' + err.message);
    }
  }
}

module.exports = UniversalZigbeeDriver;
