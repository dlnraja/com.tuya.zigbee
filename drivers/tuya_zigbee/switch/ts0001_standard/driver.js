#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0001StandardDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 Ts0001StandardDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = Ts0001StandardDriver;