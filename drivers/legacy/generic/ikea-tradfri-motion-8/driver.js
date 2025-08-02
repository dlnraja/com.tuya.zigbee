'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class ikeaTradfriMotion_8Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('ikea-tradfri-motion-8 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = ikeaTradfriMotion_8Driver;
