'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class MultisensorDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('multisensor device initialized');

        // Register capabilities
                // Register temperature measurement

        // Register motion alarm

        // Mark device as available
        await this.setAvailable();
    }

    

    async onDeleted() {
        this.log('multisensor device deleted');
    }

}

module.exports = MultisensorDevice;
