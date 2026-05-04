'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchTempSensorDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('Switch Temp Sensor driver v7.4.11 initialized');
    
    try {
      const card = this.homey.flow.getActionCard('switch_temp_sensor_set_temperature');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('target_temperature', args.temperature).catch(() => {});
          return true;
        });
      }
    } catch (err) {
      this.error(`Flow card error: ${err.message}`);
    }
  }

  async onPairListDevices() {
    return [];
  }
}

module.exports = SwitchTempSensorDriver;
