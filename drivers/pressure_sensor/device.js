'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class PressureSensorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('pressure_sensor device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('pressure_sensor device deleted');
    }

}

module.exports = PressureSensorDevice;
