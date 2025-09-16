'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class FormaldehydeSensorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('formaldehyde_sensor device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('formaldehyde_sensor device deleted');
    }

}

module.exports = FormaldehydeSensorDevice;
