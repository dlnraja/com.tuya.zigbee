#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AqaraMotion-364PlugDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 AqaraMotion-364PlugDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = AqaraMotion-364PlugDriver;