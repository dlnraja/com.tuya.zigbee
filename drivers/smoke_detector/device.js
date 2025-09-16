'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SmokeDetectorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('smoke_detector device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('smoke_detector device deleted');
    }

}

module.exports = SmokeDetectorDevice;
