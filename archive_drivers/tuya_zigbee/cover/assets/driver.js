#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AssetsDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 AssetsDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('windowcoverings_state', 'genWindowCovering');
        this.registerCapability('windowcoverings_set', 'genBasic');
        
        // Configuration des clusters
        this.registerClusterCapability('genWindowCovering', 'windowcoverings_state');
    }
}

module.exports = AssetsDriver;