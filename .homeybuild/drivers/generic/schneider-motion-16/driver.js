'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class schneiderMotion_16Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('schneider-motion-16 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = schneiderMotion_16Driver;
