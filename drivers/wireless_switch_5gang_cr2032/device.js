'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class WirelessSwitch5gangCr2032 extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        await super.onNodeInit({ zclNode });
        
        this.printNode();
        
        // Register capabilities
        this.registerCapability('button.1', CLUSTER.ON_OFF);
        this.registerCapability('button.2', CLUSTER.ON_OFF);
        this.registerCapability('button.3', CLUSTER.ON_OFF);
        this.registerCapability('button.4', CLUSTER.ON_OFF);
        this.registerCapability('button.5', CLUSTER.ON_OFF);
    }
}

module.exports = WirelessSwitch5gangCr2032;