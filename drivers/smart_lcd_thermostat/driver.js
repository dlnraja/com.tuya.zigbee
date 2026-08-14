'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartLcdThermostatDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    try {
      const card = this.homey.flow.getConditionCard('smart_lcd_thermostat_mode_is');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) { return false; }
          const mode = args.mode ?? args.thermostat_mode ?? args.value;
          return args.device.getCapabilityValue('thermostat_mode') === mode;
        });
      }
    } catch (err) {
      this.log('[FLOW] smart_lcd_thermostat_mode_is: ' + err.message);
    }
  }
}

module.exports = SmartLcdThermostatDriver;
