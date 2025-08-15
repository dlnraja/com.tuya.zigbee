#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaAcIkeaAcPlugDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 TuyaAcIkeaAcPlugDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = TuyaAcIkeaAcPlugDriver;