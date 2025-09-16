'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TvocSensorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('tvoc_sensor device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('tvoc_sensor device deleted');
    }

}

module.exports = TvocSensorDevice;
