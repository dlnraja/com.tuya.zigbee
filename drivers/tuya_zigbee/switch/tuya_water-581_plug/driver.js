#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaWater-581PlugDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 TuyaWater-581PlugDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = TuyaWater-581PlugDriver;