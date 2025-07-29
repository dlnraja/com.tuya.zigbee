const { ZigbeeDevice } = require('homey-zigbeedriver');

class ZigbeeTemperatureSensorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        // Start polling
        this.startPolling();
    }

    async onTemperatureChange(temperature) {
        await this.setCapabilityValue('measure_temperature', temperature);
        this.log('Temperature changed to: ' + temperature + 'C');
    }

    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }
}

module.exports = ZigbeeTemperatureSensorDevice;
