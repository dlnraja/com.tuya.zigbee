'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class MotionSensorPirAcDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('motion_sensor_pir_ac device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('motion_sensor_pir_ac device deleted');
    }

}

module.exports = MotionSensorPirAcDevice;
