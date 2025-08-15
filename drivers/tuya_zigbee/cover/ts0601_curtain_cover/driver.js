#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0601CurtainCoverDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 Ts0601CurtainCoverDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('windowcoverings_state', 'genWindowCovering');
        this.registerCapability('windowcoverings_set', 'genBasic');
        
        // Configuration des clusters
        this.registerClusterCapability('genWindowCovering', 'windowcoverings_state');
    }
}

module.exports = Ts0601CurtainCoverDriver;