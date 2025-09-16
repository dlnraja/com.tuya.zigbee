'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class GasDetectorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('gas_detector device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('gas_detector device deleted');
    }

}

module.exports = GasDetectorDevice;
