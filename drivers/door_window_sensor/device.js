'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class DoorWindowSensorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('door_window_sensor device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('door_window_sensor device deleted');
    }

}

module.exports = DoorWindowSensorDevice;
