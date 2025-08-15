#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts011fDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 Ts011fDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = Ts011fDriver;