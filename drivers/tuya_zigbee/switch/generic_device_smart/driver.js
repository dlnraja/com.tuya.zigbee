#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class GenericDeviceSmartDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 GenericDeviceSmartDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = GenericDeviceSmartDriver;