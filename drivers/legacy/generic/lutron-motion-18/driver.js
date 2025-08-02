'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class lutronMotion_18Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('lutron-motion-18 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = lutronMotion_18Driver;
