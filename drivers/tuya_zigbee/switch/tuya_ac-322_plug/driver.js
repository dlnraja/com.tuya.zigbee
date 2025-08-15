#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaAc-322PlugDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 TuyaAc-322PlugDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = TuyaAc-322PlugDriver;