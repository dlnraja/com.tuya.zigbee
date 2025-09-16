'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class CoDetectorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('co_detector device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('co_detector device deleted');
    }

}

module.exports = CoDetectorDevice;
