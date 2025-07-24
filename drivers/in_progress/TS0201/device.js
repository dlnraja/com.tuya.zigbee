
'use strict';
const { ZigbeeDevice } = require('homey-zigbeedriver');

class TS0201 extends ZigbeeDevice {
  async onInit() {
    this.log('TS0201 sensor initialized');
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
    this.registerCapability('measure_humidity', 'msRelativeHumidity');
    this.registerCapability('alarm_battery', 'genPowerCfg');
    // Ajoutez ici d'autres capacités si besoin
  }
}

module.exports = TS0201;

