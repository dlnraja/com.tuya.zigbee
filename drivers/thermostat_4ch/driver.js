'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Thermostat4chDriver extends ZigBeeDriver {

  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('Thermostat4chDriver initialized');

    const reg = (id, fn) => {
      try {
        this.homey.flow.getActionCard(id).registerRunListener(fn);
      } catch (e) {
        this.error(`Failed to register action card ${id}: ${e.message}`);
      }
    };

    reg('thermostat_4ch_turn_on', async ({ device }) => {
      await device.triggerCapabilityListener('onoff', true);
      return true;
    });

    reg('thermostat_4ch_turn_off', async ({ device }) => {
      await device.triggerCapabilityListener('onoff', false);
      return true;
    });

    reg('thermostat_4ch_toggle', async ({ device }) => {
      const v = device.getCapabilityValue('onoff');
      await device.triggerCapabilityListener('onoff', !v);
      return true;
    });

    reg('thermostat_4ch_set_temperature', async ({ device, temperature }) => {
      if (temperature !== undefined) {
        await device.setCapabilityValue('target_temperature', temperature);
        if (typeof device.sendTuyaDP === 'function') {
          await device.sendTuyaDP(2, Math.round(temperature), 'value');
        }
      }
      return true;
    });
  }
}

module.exports = Thermostat4chDriver;
