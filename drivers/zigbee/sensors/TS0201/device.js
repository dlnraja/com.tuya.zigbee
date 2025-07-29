
'use strict';
const { ZigbeeDevice } = require('homey-zigbeedriver');

class TS0201Device extends ZigbeeDevice {
    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }
        // Voltage Management
        async onVoltageChange(voltage) {
            await this.setCapabilityValue('measure_voltage', voltage);
            this.log('Voltage changed to: ' + voltage + 'V');
        }
        // Power Management
        async onPowerChange(power) {
            await this.setCapabilityValue('measure_power', power);
            this.log('Power changed to: ' + power + 'W');
        }
        // Current Management
        async onAmperageChange(amperage) {
            await this.setCapabilityValue('measure_current', amperage);
            this.log('Amperage changed to: ' + amperage + 'A');
        }
  async onInit() {
    this.log('TS0201 sensor initialized');
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
    this.registerCapability('measure_humidity', 'msRelativeHumidity');
    this.registerCapability('alarm_battery', 'genPowerCfg');
    // Ajoutez ici d'autres capacités si besoin
  }
}

module.exports = TS0201;



































