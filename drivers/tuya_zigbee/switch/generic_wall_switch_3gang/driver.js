#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class GenericWallSwitch3gangDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 GenericWallSwitch3gangDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = GenericWallSwitch3gangDriver;