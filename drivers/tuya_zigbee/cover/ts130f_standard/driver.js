#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts130fStandardDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 Ts130fStandardDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('windowcoverings_state', 'genWindowCovering');
        this.registerCapability('windowcoverings_set', 'genBasic');
        
        // Configuration des clusters
        this.registerClusterCapability('genWindowCovering', 'windowcoverings_state');
    }
}

module.exports = Ts130fStandardDriver;