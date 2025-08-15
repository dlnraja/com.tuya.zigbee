#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class IkeaCeiling940Driver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 IkeaCeiling940Driver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        this.registerCapability('dim', 'genLevelCtrl');
        this.registerCapability('light_temperature', 'lightingColorCtrl');
        this.registerCapability('light_mode', 'genBasic');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
        this.registerClusterCapability('genLevelCtrl', 'dim');
        this.registerClusterCapability('lightingColorCtrl', 'light_temperature');
    }
}

module.exports = IkeaCeiling940Driver;