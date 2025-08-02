'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class innrMotion_14Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('innr-motion-14 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = innrMotion_14Driver;
