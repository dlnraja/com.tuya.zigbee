'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class Co2SensorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('co2_sensor device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('co2_sensor device deleted');
    }

}

module.exports = Co2SensorDevice;
