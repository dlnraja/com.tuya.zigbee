'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class LuxSensorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('lux_sensor device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('lux_sensor device deleted');
    }

}

module.exports = LuxSensorDevice;
