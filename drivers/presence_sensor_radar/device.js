'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class PresenceSensorRadarDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('presence_sensor_radar device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('presence_sensor_radar device deleted');
    }

}

module.exports = PresenceSensorRadarDevice;
