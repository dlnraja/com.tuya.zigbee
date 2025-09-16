'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TemperatureHumiditySensorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('temperature_humidity_sensor device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('temperature_humidity_sensor device deleted');
    }

}

module.exports = TemperatureHumiditySensorDevice;
