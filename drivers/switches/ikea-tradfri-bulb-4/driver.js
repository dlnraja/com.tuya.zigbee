'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class ikeaTradfriBulb_4Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('ikea-tradfri-bulb-4 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = ikeaTradfriBulb_4Driver;
