#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class IkeaHumidity-712PlugDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 IkeaHumidity-712PlugDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = IkeaHumidity-712PlugDriver;