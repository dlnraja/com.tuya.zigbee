'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class legrandMotion_17Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('legrand-motion-17 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = legrandMotion_17Driver;
