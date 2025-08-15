#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaAcIkeaAcPlugStandardDefaultDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 TuyaAcIkeaAcPlugStandardDefaultDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = TuyaAcIkeaAcPlugStandardDefaultDriver;