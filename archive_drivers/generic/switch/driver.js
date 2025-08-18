#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class GenericSwitchDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 GenericSwitchDriver initialisé (fallback intelligent)');
        
        // Configuration générique des capabilities
        this.registerCapability('onoff', 'genOnOff');
    }
}

module.exports = GenericSwitchDriver;