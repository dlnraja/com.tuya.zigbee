#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AqaraGarage-478CoverDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 AqaraGarage-478CoverDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('windowcoverings_state', 'genWindowCovering');
        this.registerCapability('windowcoverings_set', 'genBasic');
        
        // Configuration des clusters
        this.registerClusterCapability('genWindowCovering', 'windowcoverings_state');
    }
}

module.exports = AqaraGarage-478CoverDriver;