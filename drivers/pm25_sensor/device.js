'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class Pm25SensorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('pm25_sensor device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('pm25_sensor device deleted');
    }

}

module.exports = Pm25SensorDevice;
