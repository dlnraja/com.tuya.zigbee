#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0002Driver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 Ts0002Driver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = Ts0002Driver;