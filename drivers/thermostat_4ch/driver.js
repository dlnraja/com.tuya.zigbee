'use strict';
const { Driver } = require('homey');

class Thermostat4ChDriver extends Driver {
  async onInit() {
    await super.onInit();
    this.log('4-Channel Thermostat Driver initialized');

    const registerAction = (id, fn) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) card.registerRunListener(fn);
      } catch (e) {
        this.error(`Error registering action ${id}:`, e.message);
      }
    };

    registerAction('thermostat_4ch_set_mode', async (args) => {
      return args.device.setCapabilityValue('thermostat_mode', args.mode);
    });
  }
}

module.exports = Thermostat4ChDriver;
