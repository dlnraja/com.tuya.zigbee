'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class osramMotion_12Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('osram-motion-12 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = osramMotion_12Driver;
