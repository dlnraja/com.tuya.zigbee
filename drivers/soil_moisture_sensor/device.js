'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SoilMoistureSensorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('soil_moisture_sensor device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('soil_moisture_sensor device deleted');
    }

}

module.exports = SoilMoistureSensorDevice;
