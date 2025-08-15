#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaFan-200PlugDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 TuyaFan-200PlugDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = TuyaFan-200PlugDriver;