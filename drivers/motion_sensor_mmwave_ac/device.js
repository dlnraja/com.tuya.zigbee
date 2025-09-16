'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class MotionSensorMmwaveAcDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('motion_sensor_mmwave_ac device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('motion_sensor_mmwave_ac device deleted');
    }

}

module.exports = MotionSensorMmwaveAcDevice;
