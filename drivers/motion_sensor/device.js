'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class MotionSensorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('motion_sensor device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('motion_sensor device deleted');
    }

}

module.exports = MotionSensorDevice;
