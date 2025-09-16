'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class WaterLeakSensorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('water_leak_sensor device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('water_leak_sensor device deleted');
    }

}

module.exports = WaterLeakSensorDevice;
