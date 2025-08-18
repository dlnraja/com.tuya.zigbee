#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AssetsDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 AssetsDriver initialisé (mode intelligent)');
        
        // Configuration intelligente des capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration des clusters
        this.registerClusterCapability('genOnOff', 'onoff');
    }
}

module.exports = AssetsDriver;