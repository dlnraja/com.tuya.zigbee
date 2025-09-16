'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class MotionSensorMmwaveBatteryDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('motion_sensor_mmwave_battery device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('motion_sensor_mmwave_battery device deleted');
    }

}

module.exports = MotionSensorMmwaveBatteryDevice;
