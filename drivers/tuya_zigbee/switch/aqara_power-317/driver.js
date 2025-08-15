#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AqaraPower-317Driver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 AqaraPower-317Driver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = AqaraPower-317Driver;