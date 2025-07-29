const { ZigbeeDevice } = require('homey-zigbeedriver');

class TuyaHumiditySensorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        // Start polling
        this.startPolling();
    }

    async onHumidityChange(humidity) {
        await this.setCapabilityValue('measure_humidity', humidity);
        this.log('Humidity changed to: ' + humidity + '%');
    }

    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }
}

module.exports = TuyaHumiditySensorDevice;
