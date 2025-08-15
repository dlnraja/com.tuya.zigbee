#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class IkeaMotion-927PlugDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 IkeaMotion-927PlugDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = IkeaMotion-927PlugDriver;