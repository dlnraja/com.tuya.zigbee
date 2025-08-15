#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class IkeaPower-769Driver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 IkeaPower-769Driver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = IkeaPower-769Driver;