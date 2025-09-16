'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class NoiseLevelSensorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('noise_level_sensor device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('noise_level_sensor device deleted');
    }

}

module.exports = NoiseLevelSensorDevice;
