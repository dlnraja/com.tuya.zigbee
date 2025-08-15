#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AqaraOutlet-197Driver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 AqaraOutlet-197Driver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = AqaraOutlet-197Driver;