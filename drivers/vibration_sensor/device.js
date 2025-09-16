'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class VibrationSensorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('vibration_sensor device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('vibration_sensor device deleted');
    }

}

module.exports = VibrationSensorDevice;
