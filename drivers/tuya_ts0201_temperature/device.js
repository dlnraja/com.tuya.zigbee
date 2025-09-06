'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaTemperatureHumiditySensor extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Tuya Temperature/Humidity Sensor (TS0201) device init');

    // Register capabilities
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
    this.registerCapability('measure_humidity', 'msRelativeHumidity');
    this.registerCapability('measure_battery', 'genPowerCfg');

    // Report listeners
    zclNode.endpoints[1].clusters.msTemperatureMeasurement.on('attr.measuredValue', this.onTemperatureReport.bind(this));
    zclNode.endpoints[1].clusters.msRelativeHumidity.on('attr.measuredValue', this.onHumidityReport.bind(this));
    zclNode.endpoints[1].clusters.genPowerCfg.on('attr.batteryPercentageRemaining', this.onBatteryReport.bind(this));
  }

  onTemperatureReport(value) {
    const temperature = value / 10.0;
    this.log(`Temperature updated: ${temperature}°C`);
    this.setCapabilityValue('measure_temperature', temperature).catch(this.error);
  }

  onHumidityReport(value) {
    const humidity = value / 100.0;
    this.log(`Humidity updated: ${humidity}%`);
    this.setCapabilityValue('measure_humidity', humidity).catch(this.error);
  }

  onBatteryReport(value) {
    const battery = value / 2;
    this.log(`Battery updated: ${battery}%`);
    this.setCapabilityValue('measure_battery', battery).catch(this.error);
  }

}

module.exports = TuyaTemperatureHumiditySensor;
