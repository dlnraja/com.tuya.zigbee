#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AqaraTemperature-666PlugDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 AqaraTemperature-666PlugDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = AqaraTemperature-666PlugDriver;