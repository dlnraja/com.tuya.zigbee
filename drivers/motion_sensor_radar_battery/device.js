'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class MotionSensorRadarBatteryDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('motion_sensor_radar_battery device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('motion_sensor_radar_battery device deleted');
    }

}

module.exports = MotionSensorRadarBatteryDevice;
