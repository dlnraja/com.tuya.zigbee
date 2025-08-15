#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0601ThermostatWallWkDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 Ts0601ThermostatWallWkDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = Ts0601ThermostatWallWkDriver;