#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class IkeaCurtain-431Driver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 IkeaCurtain-431Driver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('windowcoverings_state', 'genWindowCovering');
        this.registerCapability('windowcoverings_set', 'genBasic');
        
        // Configuration des clusters
        this.registerClusterCapability('genWindowCovering', 'windowcoverings_state');
    }
}

module.exports = IkeaCurtain-431Driver;