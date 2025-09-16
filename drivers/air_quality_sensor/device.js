'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class AirQualitySensorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('air_quality_sensor device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('air_quality_sensor device deleted');
    }

}

module.exports = AirQualitySensorDevice;
