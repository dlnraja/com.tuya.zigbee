'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class MotionSensorRadarHybridDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('motion_sensor_radar_hybrid device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('motion_sensor_radar_hybrid device deleted');
    }

}

module.exports = MotionSensorRadarHybridDevice;
