'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class DimmerDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.enableDebug();
        this.printNode();

        // Register capabilities with numeric clusters
        if (this.hasCapability('onoff')) {
            this.registerCapability('onoff', 6);
        }
        if (this.hasCapability('dim')) {
            this.registerCapability('dim', 8);
        }
    }

    async onDeleted() {
        this.log('dimmer device deleted');
    }

}

module.exports = DimmerDevice;
